// 共有の追悼館の API と、本番用に dist/ を配る小さなサーバ。依存なし (node:sqlite、Node 22.5+)。
// 残すのはゲームの記録だけ。遊んだ人の名前・連絡先・IP は残さない (IP は送信量の制限のためにメモリの中だけで使う)。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 値の一覧 (src/engine/types.ts と同じ。ずれは server.test.mjs が見つける) ----
export const ENUMS = {
  world: ['medieval', 'dark', 'game', 'academy', 'wa', 'xianxia', 'steampunk', 'cyberpunk', 'space', 'modern', 'postapoc', 'ocean', 'desert', 'beast', 'myth', 'frontier'],
  race: ['human', 'elf', 'half_elf', 'dark_elf', 'dwarf', 'halfling', 'beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf',
    'dragonkin', 'demon', 'vampire', 'oni', 'goblin', 'orc', 'lizardfolk', 'merfolk', 'winged', 'fairy', 'slime', 'homunculus', 'android', 'cyborg', 'mutant', 'alien'],
  sex: ['F', 'M'],
  status: ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'],
  hazard: ['infant', 'disease', 'monster', 'violence', 'war', 'accident', 'childbirth', 'magic', 'execution', 'famine', 'plague', 'age'],
  role: ['mother', 'father', 'sibling', 'spouse', 'child', 'lover', 'fiance', 'friend', 'companion', 'mentor', 'rival', 'nemesis', 'familiar', 'master', 'servant', 'disciple'],
  job: ['farmer', 'merchant', 'smith', 'alchemist', 'herbalist', 'priest', 'knight', 'soldier', 'mercenary', 'adventurer', 'mage', 'scholar', 'bard', 'thief', 'tamer', 'cook',
    'lord', 'servant', 'hunter', 'sailor', 'miner', 'assassin', 'necromancer', 'hero', 'saint', 'samurai', 'onmyoji', 'cultivator', 'ninja', 'engineer', 'factory', 'airship',
    'corp', 'hacker', 'pilot', 'medic', 'researcher', 'office', 'explorer', 'police', 'scavenger', 'raider'],
  stage: ['infant', 'child', 'teen', 'adult', 'middle', 'elder'],
  place: ['home', 'field', 'town', 'guild', 'dungeon', 'battle', 'academy', 'temple', 'shop', 'forge', 'lab', 'castle', 'ship', 'wild', 'city', 'grave'],
  home: ['hovel', 'house', 'manor', 'castle'],
  tod: ['morning', 'day', 'dusk', 'night'],
  lang: ['ja', 'en'],
};
const SETS = Object.fromEntries(Object.entries(ENUMS).map(([k, v]) => [k, new Set(v)]));

export const MAX_BODY = 16 * 1024;
const LIST_MAX = 50;

// ---- 入力の検証 -------------------------------------------------------------
// 制御文字 (改行も) と、文字の向きを入れ替える書式文字を取り除く
const CTRL = /[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g;

class Invalid extends Error {}
const fail = (what) => { throw new Invalid(what); };
const oneOf = (v, set, what) => (SETS[set].has(v) ? v : fail(what));
const int = (v, min, max, what) => (Number.isInteger(v) && v >= min && v <= max ? v : fail(what));
// 文字数はコードポイントで数える。長すぎるものは切らずに弾く
function text(v, max, what, { optional = false } = {}) {
  if (v === undefined || v === null) return optional ? '' : fail(what);
  if (typeof v !== 'string') fail(what);
  const s = v.replace(CTRL, '').trim();
  if ([...s].length > max) fail(`${what} too long`);
  if (!s && !optional) fail(what);
  return s;
}
const list = (v, max, what) => (Array.isArray(v) && v.length <= max ? v : fail(what));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// 場面の材料。形が違えば捨てる (記録そのものは受け取る)
function scene(v) {
  try {
    if (!isObj(v)) return null;
    const figures = list(v.figures, 5, 'figures').map((f) => {
      if (!isObj(f)) fail('figure');
      return {
        seed: int(f.seed, 0, 0xffffffff, 'seed'), race: oneOf(f.race, 'race', 'race'), sex: oneOf(f.sex, 'sex', 'sex'),
        stage: oneOf(f.stage, 'stage', 'stage'), job: f.job === null ? null : oneOf(f.job, 'job', 'job'), status: oneOf(f.status, 'status', 'status'),
        ...(typeof f.me === 'boolean' ? { me: f.me } : {}), ...(typeof f.dead === 'boolean' ? { dead: f.dead } : {}),
      };
    });
    return {
      seed: int(v.seed, 0, 0xffffffff, 'seed'), world: oneOf(v.world, 'world', 'world'), place: oneOf(v.place, 'place', 'place'),
      home: oneOf(v.home, 'home', 'home'), tod: oneOf(v.tod, 'tod', 'tod'), season: int(v.season, 0, 3, 'season'), figures,
      ...(typeof v.dead === 'boolean' ? { dead: v.dead } : {}),
    };
  } catch (e) {
    if (e instanceof Invalid) return null;
    throw e;
  }
}

// 送られた記録を、保存する形に作り直す。だめなら Invalid を投げる
export function validEntry(b) {
  if (!isObj(b)) fail('body');
  return {
    seed: int(b.seed, 0, Number.MAX_SAFE_INTEGER, 'seed'),
    world: oneOf(b.world, 'world', 'world'),
    name: text(b.name, 60, 'name'),
    race: oneOf(b.race, 'race', 'race'),
    sex: oneOf(b.sex, 'sex', 'sex'),
    status: oneOf(b.status, 'status', 'status'),
    age: int(b.age, 0, 100000, 'age'),
    hazard: oneOf(b.hazard, 'hazard', 'hazard'),
    causeLabel: text(b.causeLabel, 60, 'causeLabel'),
    causeText: text(b.causeText, 400, 'causeText'),
    why: text(b.why, 200, 'why', { optional: true }),
    highlights: list(b.highlights ?? [], 12, 'highlights').map((e) => {
      if (!isObj(e)) fail('highlight');
      return { age: int(e.age, 0, 100000, 'highlight age'), text: text(e.text, 200, 'highlight') };
    }),
    lastWith: list(b.lastWith ?? [], 3, 'lastWith').map((t) => {
      if (!isObj(t)) fail('lastWith');
      return { name: text(t.name, 60, 'lastWith name'), role: oneOf(t.role, 'role', 'role') };
    }),
    note: text(b.note, 140, 'note', { optional: true }),
    scene: scene(b.scene),
    lang: oneOf(b.lang ?? 'ja', 'lang', 'lang'),
  };
}

// ---- 送信量の制限 (メモリ内のトークンバケット。IP は保存もログ出力もしない) ----
// ponytail: 1プロセスのメモリだけ。複数台で動かすなら共有の置き場へ
function bucket(capacity, perMs) {
  const m = new Map();
  return {
    take(key, now = Date.now()) {
      const b = m.get(key) ?? { t: capacity, at: now };
      b.t = Math.min(capacity, b.t + ((now - b.at) * capacity) / perMs);
      b.at = now;
      if (b.t < 1) { m.set(key, b); return false; }
      b.t -= 1;
      m.set(key, b);
      return true;
    },
    // 満タンに戻ったものは忘れる
    sweep(now = Date.now()) {
      for (const [k, b] of m) if (b.t + ((now - b.at) * capacity) / perMs >= capacity) m.delete(k);
    },
  };
}

// ---- サーバ -----------------------------------------------------------------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

class TooLarge extends Error {}
async function readJson(req) {
  if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) throw new TooLarge();
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new TooLarge();
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const COLS = `id, seed, world, name, race, sex, status, age, hazard, cause_label AS causeLabel, cause_text AS causeText, why,
  highlights, last_with AS lastWith, note, scene, lang, candles, created_at AS createdAt`;
const rowOut = (r) => ({ ...r, highlights: JSON.parse(r.highlights), lastWith: JSON.parse(r.lastWith), scene: r.scene ? JSON.parse(r.scene) : null });

/** サーバを起動する。port 0 なら空いているポート。戻り値の close() で止まる */
export function startServer({ port = Number(process.env.PORT ?? 8790), dbPath = join(ROOT, 'data', 'memorial.db'), distDir = join(ROOT, 'dist'), host } = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS memorial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seed INTEGER NOT NULL,
    world TEXT NOT NULL,
    name TEXT NOT NULL,
    race TEXT NOT NULL,
    sex TEXT NOT NULL,
    status TEXT NOT NULL,
    age INTEGER NOT NULL,
    hazard TEXT NOT NULL,
    cause_label TEXT NOT NULL,
    cause_text TEXT NOT NULL,
    why TEXT NOT NULL DEFAULT '',
    highlights TEXT NOT NULL DEFAULT '[]',
    last_with TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    scene TEXT,
    lang TEXT NOT NULL DEFAULT 'ja',
    candles INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (seed, world)
  )`);
  const q = {
    insert: db.prepare(`INSERT INTO memorial (seed, world, name, race, sex, status, age, hazard, cause_label, cause_text, why, highlights, last_with, note, scene, lang)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (seed, world) DO NOTHING`),
    dup: db.prepare('SELECT id FROM memorial WHERE seed = ? AND world = ?'),
    list: db.prepare(`SELECT ${COLS} FROM memorial ORDER BY id DESC LIMIT ? OFFSET ?`),
    listLang: db.prepare(`SELECT ${COLS} FROM memorial WHERE lang = ? ORDER BY id DESC LIMIT ? OFFSET ?`),
    count: db.prepare('SELECT COUNT(*) AS n FROM memorial'),
    countLang: db.prepare('SELECT COUNT(*) AS n FROM memorial WHERE lang = ?'),
    get: db.prepare(`SELECT ${COLS} FROM memorial WHERE id = ?`),
    candle: db.prepare('UPDATE memorial SET candles = candles + 1 WHERE id = ? RETURNING candles'),
  };

  const postMin = bucket(3, 60_000);
  const postDay = bucket(50, 86_400_000);
  const candleMin = bucket(20, 60_000);
  const sweeper = setInterval(() => { postMin.sweep(); postDay.sweep(); candleMin.sweep(); }, 10 * 60_000);
  sweeper.unref();

  async function api(req, res, url) {
    const ip = req.socket.remoteAddress ?? '';
    const p = url.pathname;
    if (req.method === 'GET' && p === '/api/health') return send(res, 200, { success: true, data: { ok: true } });

    if (req.method === 'GET' && p === '/api/memorial') {
      const offset = Math.min(Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0), 1e9);
      const limit = Math.min(Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '20', 10) || 20), LIST_MAX);
      const lang = url.searchParams.get('lang');
      const byLang = lang !== null && SETS.lang.has(lang);
      const rows = byLang ? q.listLang.all(lang, limit, offset) : q.list.all(limit, offset);
      const total = (byLang ? q.countLang.get(lang) : q.count.get()).n;
      return send(res, 200, { success: true, data: rows.map(rowOut), meta: { total, offset, limit } });
    }

    const one = p.match(/^\/api\/memorial\/(\d{1,15})$/);
    if (req.method === 'GET' && one) {
      const row = q.get.get(Number(one[1]));
      return row ? send(res, 200, { success: true, data: rowOut(row) }) : send(res, 404, { success: false, error: 'not found' });
    }

    if (req.method === 'POST' && p === '/api/memorial') {
      let e;
      try {
        e = validEntry(await readJson(req));
      } catch (err) {
        if (err instanceof TooLarge) return send(res, 413, { success: false, error: 'too large' });
        if (err instanceof Invalid) return send(res, 400, { success: false, error: `invalid: ${err.message}` });
        if (err instanceof SyntaxError) return send(res, 400, { success: false, error: 'bad json' });
        throw err;
      }
      // 二重投稿は制限を使わずに返す (送り直しで制限に掛からないように)
      const dup = q.dup.get(e.seed, e.world);
      if (dup) return send(res, 409, { success: false, error: 'duplicate', data: { id: dup.id } });
      if (!postMin.take(ip) || !postDay.take(ip)) return send(res, 429, { success: false, error: 'too many requests' });
      const r = q.insert.run(e.seed, e.world, e.name, e.race, e.sex, e.status, e.age, e.hazard, e.causeLabel, e.causeText, e.why,
        JSON.stringify(e.highlights), JSON.stringify(e.lastWith), e.note, e.scene ? JSON.stringify(e.scene) : null, e.lang);
      if (!r.changes) return send(res, 409, { success: false, error: 'duplicate', data: { id: q.dup.get(e.seed, e.world)?.id } });
      return send(res, 201, { success: true, data: { id: Number(r.lastInsertRowid) } });
    }

    const c = p.match(/^\/api\/memorial\/(\d{1,15})\/candle$/);
    if (req.method === 'POST' && c) {
      if (!candleMin.take(ip)) return send(res, 429, { success: false, error: 'too many requests' });
      const row = q.candle.get(Number(c[1]));
      return row ? send(res, 200, { success: true, data: { candles: row.candles } }) : send(res, 404, { success: false, error: 'not found' });
    }
    return send(res, 404, { success: false, error: 'not found' });
  }

  async function staticFile(res, pathname) {
    const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(distDir, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(distDir)) return send(res, 403, { success: false, error: 'forbidden' });
    try {
      const data = await readFile(file);
      const cache = rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': cache });
      return res.end(data);
    } catch {
      try {
        res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
        return res.end(await readFile(join(distDir, 'index.html')));
      } catch {
        return send(res, 404, { success: false, error: 'build first: npm run build' });
      }
    }
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { success: false, error: 'method not allowed' });
      return await staticFile(res, url.pathname);
    } catch (err) {
      console.error('[server]', err instanceof Error ? err.message : err);
      if (!res.headersSent) send(res, 500, { success: false, error: 'server error' });
    }
  });

  return new Promise((ok) => {
    server.listen(port, host, () => ok({
      port: server.address().port,
      close: () => new Promise((done) => { clearInterval(sweeper); server.closeAllConnections(); server.close(() => { db.close(); done(); }); }),
    }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const s = await startServer();
  console.log(`http://localhost:${s.port}`);
}
