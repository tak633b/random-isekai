// 追悼館の API の Cloudflare 版 (Pages Functions + D1)。入口は functions/api/[[path]].js。
// 道と返す形は server/server.mjs と同じ。足したのは 報告 (N 件で非表示) と、管理者の非表示。
// 残すのはゲームの記録だけ。IP はそのまま残さず、ADMIN_TOKEN を鍵にした HMAC にして制限と報告の数えに使う。
import { ENUMS, Invalid, LIST_MAX, MAX_BODY, validEntry } from './validate.mjs';
import { accountRoute } from './account.mjs';

const LANGS = new Set(ENUMS.lang);
export const REPORT_HIDE = 3; // この人数が報告したら非表示 (env.REPORT_HIDE で変えられる)

// 制限: [回数, 窓の長さ]。固定の時間窓を D1 の1行で数える
export const LIMITS = {
  postMin: [3, 60_000],
  postDay: [50, 86_400_000],
  candleMin: [20, 60_000],
  reportHour: [10, 3_600_000],
  adminFail: [10, 600_000],
  loginMin: [10, 60_000],     // IP ごと
  progressMin: [30, 60_000],  // アカウントごと
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const ng = (status, error, extra) => json(status, { success: false, error, ...extra });

const COLS = `id, seed, world, name, race, sex, status, age, hazard, cause_label AS causeLabel, cause_text AS causeText, why,
  highlights, last_with AS lastWith, note, scene, lang, gen, lineage, candles, created_at AS createdAt`;
const rowOut = (r) => ({ ...r, highlights: JSON.parse(r.highlights), lastWith: JSON.parse(r.lastWith), lineage: JSON.parse(r.lineage ?? '[]'), scene: r.scene ? JSON.parse(r.scene) : null });

const enc = new TextEncoder();
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key || 'local-dev'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
  return btoa(String.fromCharCode(...sig.slice(0, 16))).replace(/=+$/, '');
}
// 長さ以外の情報を時間で漏らさない比べ方
function sameSecret(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ (y[i % (y.length || 1)] ?? 0);
  return d === 0;
}

/** 窓の中で limit 回までなら true */
export async function allow(db, kind, who, now = Date.now()) {
  const [limit, win] = LIMITS[kind];
  const w = Math.floor(now / win);
  const row = await db.prepare('INSERT INTO rate (k, n, exp) VALUES (?, 1, ?) ON CONFLICT (k) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(`${kind}:${who}:${w}`, (w + 1) * win).first();
  // 期限切れの行はときどきまとめて消す
  if (Math.random() < 0.02) await db.prepare('DELETE FROM rate WHERE exp < ?').bind(now).run();
  return row.n <= limit;
}

class TooLarge extends Error {}
async function readJson(request) {
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) throw new TooLarge();
  const t = await request.text();
  if (enc.encode(t).length > MAX_BODY) throw new TooLarge();
  return JSON.parse(t);
}

/** Request と env ({ DB, ADMIN_TOKEN?, REPORT_HIDE?, GOOGLE_CLIENT_ID? }) から Response を返す */
export async function handle(request, env, now = Date.now()) {
  try {
    return await route(request, env, now);
  } catch (err) {
    // 中身 (本文・キー・IP) は出さない
    console.error('[api]', err instanceof Error ? err.message : 'error');
    return ng(500, 'server error');
  }
}

async function route(request, env, now) {
  const db = env.DB;
  const url = new URL(request.url);
  const p = url.pathname;
  const m = request.method;
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const who = () => hmac(env.ADMIN_TOKEN, ip);

  if (m === 'GET' && p === '/api/health') return json(200, { success: true, data: { ok: true } });

  if (m === 'GET' && p === '/api/memorial') {
    const offset = Math.min(Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0), 1e9);
    const limit = Math.min(Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '20', 10) || 20), LIST_MAX);
    const lang = url.searchParams.get('lang');
    const byLang = lang !== null && LANGS.has(lang);
    const where = byLang ? 'WHERE hidden = 0 AND lang = ?' : 'WHERE hidden = 0';
    const args = byLang ? [lang] : [];
    const [rows, total] = await db.batch([
      db.prepare(`SELECT ${COLS} FROM memorial ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...args, limit, offset),
      // 全件を数えると D1 の「読んだ行」が記録の数だけ掛かる。画面は「もっと見る」を出すかにしか使わないので、次のページの1件まで数えて止める
      db.prepare(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM memorial ${where} LIMIT ?)`).bind(...args, offset + limit + 1),
    ]);
    return json(200, { success: true, data: rows.results.map(rowOut), meta: { total: total.results[0].n, offset, limit } });
  }

  const one = p.match(/^\/api\/memorial\/(\d{1,15})$/);
  if (m === 'GET' && one) {
    const row = await db.prepare(`SELECT ${COLS} FROM memorial WHERE id = ? AND hidden = 0`).bind(Number(one[1])).first();
    return row ? json(200, { success: true, data: rowOut(row) }) : ng(404, 'not found');
  }

  if (m === 'POST' && p === '/api/memorial') {
    let e;
    try {
      e = validEntry(await readJson(request));
    } catch (err) {
      if (err instanceof TooLarge) return ng(413, 'too large');
      if (err instanceof Invalid) return ng(400, `invalid: ${err.message}`);
      if (err instanceof SyntaxError) return ng(400, 'bad json');
      throw err;
    }
    // 二重投稿は制限を使わずに返す (送り直しで制限に掛からないように)
    const dup = await db.prepare('SELECT id FROM memorial WHERE seed = ? AND world = ?').bind(e.seed, e.world).first();
    if (dup) return ng(409, 'duplicate', { data: { id: dup.id } });
    const w = await who();
    if (!(await allow(db, 'postMin', w, now)) || !(await allow(db, 'postDay', w, now))) return ng(429, 'too many requests');
    const r = await db.prepare(`INSERT INTO memorial (seed, world, name, race, sex, status, age, hazard, cause_label, cause_text, why, highlights, last_with, note, scene, lang, gen, lineage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (seed, world) DO NOTHING`)
      .bind(e.seed, e.world, e.name, e.race, e.sex, e.status, e.age, e.hazard, e.causeLabel, e.causeText, e.why,
        JSON.stringify(e.highlights), JSON.stringify(e.lastWith), e.note, e.scene ? JSON.stringify(e.scene) : null, e.lang, e.gen, JSON.stringify(e.lineage))
      .run();
    if (!r.meta.changes) {
      const again = await db.prepare('SELECT id FROM memorial WHERE seed = ? AND world = ?').bind(e.seed, e.world).first();
      return ng(409, 'duplicate', { data: { id: again?.id } });
    }
    return json(201, { success: true, data: { id: Number(r.meta.last_row_id) } });
  }

  const c = p.match(/^\/api\/memorial\/(\d{1,15})\/candle$/);
  if (m === 'POST' && c) {
    if (!(await allow(db, 'candleMin', await who(), now))) return ng(429, 'too many requests');
    const row = await db.prepare('UPDATE memorial SET candles = candles + 1 WHERE id = ? AND hidden = 0 RETURNING candles').bind(Number(c[1])).first();
    return row ? json(200, { success: true, data: { candles: row.candles } }) : ng(404, 'not found');
  }

  // 報告: 同じ人は1件に1回。REPORT_HIDE 人に達したら非表示 (管理者が戻せる)
  const rp = p.match(/^\/api\/memorial\/(\d{1,15})\/report$/);
  if (m === 'POST' && rp) {
    const id = Number(rp[1]);
    const w = await who();
    if (!(await allow(db, 'reportHour', w, now))) return ng(429, 'too many requests');
    const hide = Math.max(1, Number.parseInt(env.REPORT_HIDE ?? '', 10) || REPORT_HIDE);
    const exists = await db.prepare('SELECT id FROM memorial WHERE id = ? AND hidden = 0').bind(id).first();
    if (!exists) return ng(404, 'not found');
    const ins = await db.prepare('INSERT INTO report (memorial_id, who) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(id, w).run();
    if (ins.meta.changes) {
      await db.prepare('UPDATE memorial SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= ? THEN 1 ELSE hidden END WHERE id = ?').bind(hide, id).run();
    }
    return json(200, { success: true, data: { reported: true } });
  }

  const a = await accountRoute(request, env, now, { json, ng, allow, who });
  if (a) return a;

  if (p.startsWith('/api/admin/')) return admin(request, env, db, url, m, now, who);
  return ng(404, 'not found');
}

// 管理者: Authorization: Bearer <ADMIN_TOKEN>。ADMIN_TOKEN が無ければ管理の道は無いものとする
async function admin(request, env, db, url, m, now, who) {
  const token = env.ADMIN_TOKEN;
  if (!token || token.length < 16) return ng(404, 'not found');
  const got = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(got, token)) {
    if (!(await allow(db, 'adminFail', await who(), now))) return ng(429, 'too many requests');
    return ng(401, 'unauthorized');
  }
  // 報告のあったもの (非表示のものも) を新しい順に
  if (m === 'GET' && url.pathname === '/api/admin/reported') {
    const r = await db.prepare(`SELECT ${COLS}, reports, hidden FROM memorial WHERE reports > 0 OR hidden = 1 ORDER BY id DESC LIMIT 100`).all();
    return json(200, { success: true, data: r.results.map(rowOut) });
  }
  // 非表示にする / 戻す: 本文 {"hidden": true|false}
  const h = url.pathname.match(/^\/api\/admin\/memorial\/(\d{1,15})\/hide$/);
  if (m === 'POST' && h) {
    let b;
    try { b = await readJson(request); } catch { return ng(400, 'bad json'); }
    if (typeof b?.hidden !== 'boolean') return ng(400, 'invalid: hidden');
    const id = Number(h[1]);
    // 戻すときは報告も数え直す (残っていると次の1件でまた隠れるので)
    if (!b.hidden) await db.prepare('DELETE FROM report WHERE memorial_id = ?').bind(id).run();
    const row = await db.prepare(`UPDATE memorial SET hidden = ?${b.hidden ? '' : ', reports = 0'} WHERE id = ? RETURNING id, hidden`).bind(b.hidden ? 1 : 0, id).first();
    return row ? json(200, { success: true, data: { id: row.id, hidden: row.hidden === 1 } }) : ng(404, 'not found');
  }
  return ng(404, 'not found');
}
