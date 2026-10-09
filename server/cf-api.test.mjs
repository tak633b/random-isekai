// Cloudflare 版の追悼館 API (server/cf-api.mjs) を、node:sqlite で作った D1 の代わりの上で確かめる。
// 言葉の網 (server/moderation.mjs) と、ゲームが作る文がその網に掛からないことも
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { handle, LIMITS } from './cf-api.mjs';
import { COOKIE, forgetKeys, verifyGoogleIdToken } from './account.mjs';
import { blocked } from './moderation.mjs';
import { validEntry } from './validate.mjs';
import { WORLD_IDS, createHero, liveOut } from '../src/engine';
globalThis.window ??= { addEventListener() {} };
const { toMemorialPost } = await import('../src/net/memorial');

const ROOT = join(import.meta.dirname, '..');

// D1 の使っている所だけを node:sqlite で
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  for (const f of readdirSync(join(ROOT, 'migrations')).sort()) db.exec(readFileSync(join(ROOT, 'migrations', f), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (ss) => { const out = []; for (const s of ss) out.push(await s.all()); return out; } };
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

// ---- アカウント (server/account.mjs) -------------------------------------------
// Google の代わりに手元で RSA の鍵を作り、JWKS の取得 (fetch) をそれに差し替える
const CLIENT = 'test-client.apps.googleusercontent.com';
const ORIGIN = 'https://x.test';
const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', use: 'sig', alg: 'RS256' };
const b64u = (x) => Buffer.from(typeof x === 'string' ? x : new Uint8Array(x)).toString('base64url');
async function idToken(claims = {}, { kid = 'k1', key = privateKey } = {}) {
  const t = Math.floor(Date.now() / 1000);
  const body = `${b64u(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))}.${b64u(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', iat: t, exp: t + 3600, email: 'x@example.com', ...claims }))}`;
  return `${body}.${b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body)))}`;
}
const stubCerts = () => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [JWK] }))));

function accountApi() {
  const env = { DB: fakeD1(), ADMIN_TOKEN: ADMIN, GOOGLE_CLIENT_ID: CLIENT };
  let cookie = '';
  const call = async (method, path, { body, origin = ORIGIN, ct = 'application/json', ip = '203.0.113.9', jar = true } = {}) => {
    const headers = { 'CF-Connecting-IP': ip };
    if (ct) headers['Content-Type'] = ct;
    if (origin) headers.Origin = origin;
    if (cookie && jar) headers.Cookie = `${COOKIE}=${cookie}`;
    const r = await handle(new Request(`${ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const sc = r.headers.get('Set-Cookie');
    if (sc && jar) cookie = sc.split(';')[0].slice(COOKIE.length + 1);
    return { status: r.status, j: await r.json(), setCookie: sc };
  };
  const login = async (claims) => call('POST', '/api/auth/google', { body: { credential: await idToken(claims) } });
  return { env, call, login, cookie: () => cookie, setCookie: (c) => { cookie = c; } };
}

describe('アカウント: Google の ID トークン', () => {
  afterEach(() => { vi.unstubAllGlobals(); forgetKeys(); });

  it('正しいものは sub だけを返す。aud・期限・署名・iss・alg が違えば断る', async () => {
    stubCerts();
    expect(await verifyGoogleIdToken(await idToken(), CLIENT)).toEqual({ sub: '1234567890' });
    expect(await verifyGoogleIdToken(await idToken({ iss: 'accounts.google.com' }), CLIENT)).toEqual({ sub: '1234567890' });
    const t = Math.floor(Date.now() / 1000);
    const other = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign'])).privateKey;
    const bad = {
      aud: await idToken({ aud: 'someone-else' }),
      exp: await idToken({ iat: t - 7200, exp: t - 3600 }),
      iat: await idToken({ iat: t + 3600 }),
      iss: await idToken({ iss: 'https://evil.example' }),
      sig: await idToken({}, { key: other }),
      kid: await idToken({}, { kid: 'nope' }),
      sub: await idToken({ sub: '' }),
    };
    for (const [why, tok] of Object.entries(bad)) await expect(verifyGoogleIdToken(tok, CLIENT), why).rejects.toThrow(why);
    // 中身を書き換えると署名が合わない
    const [h, , s] = (await idToken()).split('.');
    await expect(verifyGoogleIdToken(`${h}.${b64u(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub: '999', iat: t, exp: t + 60 }))}.${s}`, CLIENT)).rejects.toThrow('sig');
    await expect(verifyGoogleIdToken(`${b64u('{"alg":"none","kid":"k1"}')}.${b64u('{}')}.`, CLIENT)).rejects.toThrow('alg');
    await expect(verifyGoogleIdToken('garbage', CLIENT)).rejects.toThrow('shape');
  });
});

describe('アカウント: ログイン・記録の同期・削除', () => {
  afterEach(() => { vi.unstubAllGlobals(); forgetKeys(); });

  it('GOOGLE_CLIENT_ID が無ければ道ごと無い', async () => {
    const { env, call } = accountApi();
    delete env.GOOGLE_CLIENT_ID;
    expect((await call('GET', '/api/auth/me')).status).toBe(404);
  });

  it('ログイン → me → ログアウト。Cookie は HttpOnly・Secure・SameSite=Lax・Path=/api、D1 には sub とハッシュだけ', async () => {
    stubCerts();
    const { env, call, login, cookie } = accountApi();
    expect((await call('GET', '/api/auth/me')).j.data).toEqual({ signedIn: false });
    expect((await call('POST', '/api/auth/google', { body: { credential: 'x.y.z' } })).status).toBe(401);
    const r = await login();
    expect(r.j).toEqual({ success: true, data: { signedIn: true, provider: 'google' } });
    for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api']) expect(r.setCookie).toContain(part);
    expect((await call('GET', '/api/auth/me')).j.data).toEqual({ signedIn: true, provider: 'google' });
    const dump = JSON.stringify([env.DB.raw.prepare('SELECT * FROM account').all(), env.DB.raw.prepare('SELECT * FROM session').all()]);
    expect(dump).toContain('1234567890');
    expect(dump).not.toContain(cookie()); // Cookie の値そのものは残さない
    expect(dump).not.toContain('example.com'); // メールはトークンにあっても残さない
    // 同じ人がもう一度ログインしてもアカウントは1つ
    await login();
    expect(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM account').get().n).toBe(1);
    expect((await call('POST', '/api/auth/logout')).setCookie).toContain('Max-Age=0');
    expect((await call('GET', '/api/auth/me')).j.data).toEqual({ signedIn: false });
  });

  it('CSRF: 状態を変える道は、よその Origin・Origin 無し・JSON でない本文を 403 で断る', async () => {
    stubCerts();
    const { call, login } = accountApi();
    const cred = { credential: await idToken() };
    expect((await call('POST', '/api/auth/google', { body: cred, origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('POST', '/api/auth/google', { body: cred, origin: null })).status).toBe(403);
    expect((await call('POST', '/api/auth/google', { body: cred, ct: 'text/plain' })).status).toBe(403);
    await login();
    expect((await call('DELETE', '/api/account', { origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('PUT', '/api/progress', { body: { data: { v: 1 }, baseRev: 0 }, ct: 'application/x-www-form-urlencoded' })).status).toBe(403);
    expect((await call('GET', '/api/auth/me')).j.data.signedIn).toBe(true); // 断った呼び出しは何も変えていない
  });

  it('記録: ログインしないと 401。PUT は合わせて rev を進め、古い rev からの書き込みは合わせ直す', async () => {
    stubCerts();
    const { call, login } = accountApi();
    expect((await call('GET', '/api/progress')).status).toBe(401);
    await login();
    expect((await call('GET', '/api/progress')).j.data).toEqual({ data: null, rev: 0 });
    const ach = (id, at) => ({ [id]: { at, name: 'A', world: 'medieval' } });
    // 端末 A: 10 枚と実績 x
    const a1 = await call('PUT', '/api/progress', { body: { data: { v: 1, tickets: 10, unlocked: ['world:dark'], achievements: ach('x', 5) }, baseRev: 0 } });
    expect(a1.j.data.rev).toBe(1);
    // 端末 A が rev 1 から 3 枚使った: 送った枚数がそのまま残る (max で戻さない)
    const a2 = await call('PUT', '/api/progress', { body: { data: { ...a1.j.data.data, tickets: 7 }, baseRev: 1 } });
    expect(a2.j.data).toMatchObject({ rev: 2, data: { tickets: 7 } });
    // 端末 B は rev 0 のまま (知らない): 合わせる。チケットは大きい方、実績と解放は両方
    const b = await call('PUT', '/api/progress', { body: { data: { v: 1, tickets: 4, unlocked: ['race:elf'], achievements: ach('y', 9) }, baseRev: 0 } });
    expect(b.j.data.rev).toBe(3);
    expect(b.j.data.data.tickets).toBe(7);
    expect(b.j.data.data.unlocked).toEqual(['race:elf', 'world:dark']);
    expect(Object.keys(b.j.data.data.achievements)).toEqual(['x', 'y']);
    expect((await call('GET', '/api/progress')).j.data).toEqual(b.j.data);
    // reset: true は合わせずに置き換える (古い rev からでも)
    const z = await call('PUT', '/api/progress', { body: { data: { v: 1 }, baseRev: 0, reset: true } });
    expect(z.j.data).toMatchObject({ rev: 4, data: { tickets: 0, unlocked: [], achievements: {} } });
    // 形の違うもの・大きすぎるものは断る
    expect((await call('PUT', '/api/progress', { body: { data: { v: 2 }, baseRev: 4 } })).status).toBe(400);
    expect((await call('PUT', '/api/progress', { body: { data: { v: 1 }, baseRev: 'x' } })).status).toBe(400);
    expect((await call('PUT', '/api/progress', { body: { data: { v: 1, granted: ['x'.repeat(300 * 1024)] }, baseRev: 3 } })).status).toBe(413);
  });

  it('アカウントの削除: アカウント・ログイン・記録の行がすべて消え、ほかの人のものは残る', async () => {
    stubCerts();
    const { env, call, login } = accountApi();
    const other = accountApi();
    other.env.DB = env.DB;
    await other.login({ sub: 'other-person' });
    await other.call('PUT', '/api/progress', { body: { data: { v: 1, tickets: 1 }, baseRev: 0 } });
    await login();
    await call('PUT', '/api/progress', { body: { data: { v: 1, tickets: 3 }, baseRev: 0 } });
    expect((await call('DELETE', '/api/account')).j.data).toEqual({ deleted: true });
    const n = (t) => env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    expect([n('account'), n('session'), n('progress')]).toEqual([1, 1, 1]);
    expect(JSON.stringify(env.DB.raw.prepare('SELECT sub FROM account').all())).not.toContain('1234567890');
    expect((await call('GET', '/api/progress')).status).toBe(401);
    expect((await other.call('GET', '/api/progress')).j.data.data.tickets).toBe(1);
  });

  it('ログインと記録の書き込みは制限に掛かる', async () => {
    stubCerts();
    const { login } = accountApi();
    let last;
    for (let i = 0; i <= LIMITS.loginMin[0]; i++) last = await login();
    expect(last.status).toBe(429);
    const { call: c2, login: l2 } = accountApi();
    await l2();
    for (let i = 0; i <= LIMITS.progressMin[0]; i++) last = await c2('PUT', '/api/progress', { body: { data: { v: 1 }, baseRev: 0 } });
    expect(last.status).toBe(429);
  });
});

describe('アカウント: クライアント (src/net/account.ts) から', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); forgetKeys(); });

  it('ログインで端末とサーバの記録を合わせ、以後は書くたびに送る。使ったチケットは戻らない', async () => {
    const store = await import('../src/meta/store');
    const acct = await import('../src/net/account');
    const { env, call, login, cookie } = accountApi();
    // サーバには別の端末の記録 (実績 x・8 枚) がある
    stubCerts();
    await login();
    await call('PUT', '/api/progress', { body: { data: { v: 1, tickets: 8, achievements: { x: { at: 1, name: 'A', world: 'medieval' } } }, baseRev: 0 } });
    // この端末のクライアントの fetch を、同じ Cookie をつけて handle に回す
    const sid = cookie();
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      if (String(url).startsWith('https://www.googleapis.com/')) return new Response(JSON.stringify({ keys: [JWK] }));
      return handle(new Request(`${ORIGIN}${url}`, { ...init, headers: { ...init.headers, Origin: ORIGIN, Cookie: `${COOKIE}=${sid}` } }), env);
    }));
    store.setStorage(null);
    store.resetProgress();
    store.saveProgress({ ...store.newProgress(), tickets: 3, unlocked: ['world:dark'] });
    vi.useFakeTimers();
    expect(await acct.signIn(await idToken())).toBe(true);
    await vi.advanceTimersByTimeAsync(10);
    await vi.waitFor(() => expect(acct.accountState().syncing).toBe(false));
    expect(store.loadProgress()).toMatchObject({ tickets: 8, unlocked: ['world:dark'], achievements: { x: { at: 1 } } });
    // 5 枚使う → 少し待って送られる。サーバも 3 枚 (max で 8 に戻らない)
    store.saveProgress({ ...store.loadProgress(), tickets: 3 });
    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(async () => expect((await call('GET', '/api/progress')).j.data.data.tickets).toBe(3));
    expect(store.loadProgress().tickets).toBe(3);
    // ログイン中に「最初から」: アカウントの記録も空になり、次の同期でも戻らない
    store.resetProgress();
    await vi.advanceTimersByTimeAsync(10);
    await vi.waitFor(async () => expect((await call('GET', '/api/progress')).j.data.data).toMatchObject({ tickets: 0, unlocked: [], achievements: {} }));
    store.saveProgress({ ...store.loadProgress(), unlocked: ['race:elf'] });
    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(async () => expect((await call('GET', '/api/progress')).j.data.data.unlocked).toEqual(['race:elf']));
    expect(store.loadProgress()).toMatchObject({ tickets: 0, unlocked: ['race:elf'], achievements: {} });
    store.saveProgress({ ...store.loadProgress(), unlocked: ['world:dark'] });
    await acct.signOut();
    expect(acct.accountState().signedIn).toBe(false);
    expect(store.loadProgress().unlocked).toEqual(['race:elf', 'world:dark']); // ログアウトしても端末の記録は残る
  });
});
