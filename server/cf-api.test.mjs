// Cloudflare 版の追悼館 API (server/cf-api.mjs) を、node:sqlite で作った D1 の代わりの上で確かめる。
// 言葉の網 (server/moderation.mjs) と、ゲームが作る文がその網に掛からないことも
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { handle, LIMITS } from './cf-api.mjs';
import { blocked } from './moderation.mjs';
import { validEntry } from './validate.mjs';
import { WORLD_IDS, createHero, liveOut } from '../src/engine';
globalThis.window ??= { addEventListener() {} };
const { toMemorialPost } = await import('../src/net/memorial');

const ROOT = join(import.meta.dirname, '..');

// D1 の使っている所だけを node:sqlite で
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(ROOT, 'migrations', '0001_memorial.sql'), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: (ss) => Promise.all(ss.map((s) => s.all())) };
}

const ADMIN = 'test-admin-token-0123456789';
function api() {
  const env = { DB: fakeD1(), ADMIN_TOKEN: ADMIN };
  const call = async (method, path, { body, ip = '203.0.113.1', auth, now } = {}) => {
    const headers = { 'CF-Connecting-IP': ip };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) headers.Authorization = `Bearer ${auth}`;
    const r = await handle(new Request(`https://x.test${path}`, { method, headers, body: typeof body === 'string' ? body : body && JSON.stringify(body) }), env, now);
    return { status: r.status, j: await r.json() };
  };
  return { env, call };
}

let seq = 1;
const entry = (over = {}) => ({
  seed: seq++, world: 'medieval', name: 'アルト', race: 'human', sex: 'M', status: 'commoner', age: 42, hazard: 'monster',
  causeLabel: '魔物に襲われた', causeText: '森で狼の群れに襲われた。', why: '冒険者だったから',
  highlights: [{ age: 15, text: 'ギルドに入った' }], lastWith: [{ name: 'リナ', role: 'spouse' }], note: '',
  scene: null, lang: 'ja', ...over,
});

describe('言葉の網', () => {
  it('英語の悪い言葉は単語ごとに掛かり、ほかの語の一部には掛からない', () => {
    expect(blocked('you are a Bitch')).toBe(true);
    expect(blocked('F U C K')).toBe(false); // ponytail: 1文字ずつ離したものは報告で拾う
    expect(blocked('fucking hero')).toBe(true);
    expect(blocked('The assassin passed the class')).toBe(false);
    expect(blocked('Scunthorpe')).toBe(false);
    expect(blocked('a cocktail at dusk')).toBe(false);
  });
  it('日本語はカタカナ・全角・間の空白をならしてから見る', () => {
    expect(blocked('死ね')).toBe(true);
    expect(blocked('チ ン コ')).toBe(true);
    expect(blocked('ｾｯｸｽ')).toBe(true);
    expect(blocked('死ねない体になった')).toBe(true); // 「死ね」は部分一致で掛かる。ゲームの文に無いことは下で確かめる
    expect(blocked('安らかに眠れ')).toBe(false);
  });
  it('URL や連絡先の誘導は掛かる', () => {
    for (const s of ['見て https://spam.example', 'www.example', 'DM @spammer_01', 'discord.gg/abc']) expect(blocked(s)).toBe(true);
    expect(blocked('すてきな人生でした。')).toBe(false);
  });
  it('ゲームのデータの文は1行も掛からない', () => {
    const files = [];
    const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) files.push(p); } };
    walk(join(ROOT, 'src', 'data'));
    walk(join(ROOT, 'src', 'engine'));
    const hits = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
        const s = m[1] ?? m[2];
        if (blocked(s)) hits.push(`${f.slice(ROOT.length)}: ${s.slice(0, 60)}`);
      }
    }
    expect(hits).toEqual([]);
  });
  it('実際に生きた人生は検証を通る (網に掛からない)', () => {
    for (let i = 0; i < 64; i++) {
      const h = liveOut(createHero({ seed: 9000 + i, world: { preset: WORLD_IDS[i % WORLD_IDS.length] }, hero: {}, auto: true }));
      expect(() => validEntry(toMemorialPost(h))).not.toThrow();
    }
  });
  it('どの文の欄も網を通る (一言だけではない)', () => {
    expect(() => validEntry(entry({ note: 'fuck' }))).toThrow(/note not allowed/);
    expect(() => validEntry(entry({ name: 'www.spam' }))).toThrow(/name not allowed/);
    expect(() => validEntry(entry({ highlights: [{ age: 1, text: '死ね' }] }))).toThrow(/highlight not allowed/);
  });
});

describe('Cloudflare 版の API', () => {
  it('残す → 一覧 → 1件 → ろうそく、道と形は Node 版と同じ', async () => {
    const { call } = api();
    expect((await call('GET', '/api/health')).j).toEqual({ success: true, data: { ok: true } });
    const p = await call('POST', '/api/memorial', { body: entry({ note: '安らかに' }) });
    expect(p.status).toBe(201);
    const id = p.j.data.id;
    const l = await call('GET', '/api/memorial?lang=ja');
    expect(l.j.meta).toEqual({ total: 1, offset: 0, limit: 20 });
    expect(l.j.data[0]).toMatchObject({ id, note: '安らかに', lastWith: [{ name: 'リナ', role: 'spouse' }], gen: 1, lineage: [], candles: 0 });
    expect(l.j.data[0]).not.toHaveProperty('hidden');
    expect((await call('GET', '/api/memorial?lang=en')).j.meta.total).toBe(0);
    // total は次のページがあるか分かるところまでしか数えない (D1 の読む行を抑える)
    for (let i = 0; i < 4; i++) await call('POST', '/api/memorial', { body: entry(), ip: `10.1.0.${i}` });
    expect((await call('GET', '/api/memorial?limit=2')).j.meta.total).toBe(3);
    expect((await call('GET', '/api/memorial?limit=2&offset=2')).j.meta.total).toBe(5);
    expect((await call('GET', `/api/memorial/${id}`)).status).toBe(200);
    expect((await call('POST', `/api/memorial/${id}/candle`)).j.data.candles).toBe(1);
    expect((await call('GET', '/api/memorial/999')).status).toBe(404);
    // 系譜 (gen・lineage) も D1 の版で往復する
    const g = (await call('POST', '/api/memorial', { body: entry({ gen: 3, lineage: ['初代', '二代目'] }) })).j.data.id;
    expect((await call('GET', `/api/memorial/${g}`)).j.data).toMatchObject({ gen: 3, lineage: ['初代', '二代目'] });
    expect((await call('GET', '/api/nope')).status).toBe(404);
  });

  it('検証: 悪い形・言葉・大きすぎる本文・壊れた JSON は 4xx で、中身は残らない', async () => {
    const { call, env } = api();
    expect((await call('POST', '/api/memorial', { body: entry({ world: 'mars' }) })).j.error).toBe('invalid: world');
    expect((await call('POST', '/api/memorial', { body: entry({ note: 'x'.repeat(141) }) })).j.error).toBe('invalid: note too long');
    expect((await call('POST', '/api/memorial', { body: entry({ note: 'クソ野郎 死ね' }) })).j.error).toBe('invalid: note not allowed');
    expect((await call('POST', '/api/memorial', { body: '{bad' })).j.error).toBe('bad json');
    expect((await call('POST', '/api/memorial', { body: entry({ note: 'a'.repeat(20000) }) })).status).toBe(413);
    expect(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM memorial').get().n).toBe(0);
  });

  it('二重投稿は 409 と元の id、制限を使わない', async () => {
    const { call } = api();
    const e = entry();
    const id = (await call('POST', '/api/memorial', { body: e })).j.data.id;
    for (let i = 0; i < 5; i++) {
      const d = await call('POST', '/api/memorial', { body: e });
      expect(d.status).toBe(409);
      expect(d.j.data.id).toBe(id);
    }
    expect((await call('POST', '/api/memorial', { body: entry() })).status).toBe(201);
  });

  it('送信量の制限: 1分に3件、IP ごと、窓が変われば戻る。IP はそのまま残らない', async () => {
    const { call, env } = api();
    const now = 1_800_000_000_000;
    for (let i = 0; i < LIMITS.postMin[0]; i++) expect((await call('POST', '/api/memorial', { body: entry(), now })).status).toBe(201);
    expect((await call('POST', '/api/memorial', { body: entry(), now })).status).toBe(429);
    expect((await call('POST', '/api/memorial', { body: entry(), now, ip: '198.51.100.7' })).status).toBe(201);
    expect((await call('POST', '/api/memorial', { body: entry(), now: now + 60_000 })).status).toBe(201);
    const keys = env.DB.raw.prepare('SELECT k FROM rate').all().map((r) => r.k).join(' ');
    expect(keys).not.toContain('203.0.113.1'); // 残すのは HMAC だけ (プライバシーポリシーの約束)
  });

  it('報告: 同じ人は1回だけ数え、3人で非表示。一覧・1件・ろうそくから消える', async () => {
    const { call } = api();
    const id = (await call('POST', '/api/memorial', { body: entry() })).j.data.id;
    for (let i = 0; i < 4; i++) expect((await call('POST', `/api/memorial/${id}/report`)).status).toBe(200);
    expect((await call('GET', `/api/memorial/${id}`)).status).toBe(200);
    await call('POST', `/api/memorial/${id}/report`, { ip: '10.0.0.2' });
    await call('POST', `/api/memorial/${id}/report`, { ip: '10.0.0.3' });
    expect((await call('GET', `/api/memorial/${id}`)).status).toBe(404);
    expect((await call('GET', '/api/memorial')).j.meta.total).toBe(0);
    expect((await call('POST', `/api/memorial/${id}/candle`)).status).toBe(404);
    expect((await call('POST', `/api/memorial/${id}/report`, { ip: '10.0.0.4' })).status).toBe(404);
  });

  it('管理者: 秘密が無いと 401 (道が無ければ 404)、あれば隠す・戻す・報告の一覧', async () => {
    const { call, env } = api();
    const id = (await call('POST', '/api/memorial', { body: entry() })).j.data.id;
    expect((await call('POST', `/api/admin/memorial/${id}/hide`, { body: { hidden: true } })).status).toBe(401);
    expect((await call('POST', `/api/admin/memorial/${id}/hide`, { body: { hidden: true }, auth: 'wrong' })).status).toBe(401);
    expect((await call('POST', `/api/admin/memorial/${id}/hide`, { body: { hidden: 'yes' }, auth: ADMIN })).status).toBe(400);
    expect((await call('POST', `/api/admin/memorial/${id}/hide`, { body: { hidden: true }, auth: ADMIN })).j.data).toEqual({ id, hidden: true });
    expect((await call('GET', `/api/memorial/${id}`)).status).toBe(404);
    expect((await call('GET', '/api/admin/reported', { auth: ADMIN })).j.data.map((e) => e.id)).toEqual([id]);
    expect((await call('POST', `/api/admin/memorial/${id}/hide`, { body: { hidden: false }, auth: ADMIN })).j.data.hidden).toBe(false);
    expect((await call('GET', `/api/memorial/${id}`)).status).toBe(200);
    // 秘密が設定されていなければ、管理の道そのものが無い
    delete env.ADMIN_TOKEN;
    expect((await call('GET', '/api/admin/reported', { auth: ADMIN })).status).toBe(404);
  });

  it('管理者の合言葉の総当たりは制限に掛かる', async () => {
    const { call } = api();
    const now = 1_800_000_000_000;
    let last;
    for (let i = 0; i <= LIMITS.adminFail[0]; i++) last = await call('GET', '/api/admin/reported', { auth: `guess-${i}`, now });
    expect(last.status).toBe(429);
  });
});
