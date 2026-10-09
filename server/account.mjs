// アカウント: Google でログインして、遊びの積み重ね (Progress) を端末をまたいで残す。cf-api.mjs の route から呼ぶ。
// 残すのは Google の番号 (sub) だけ。メール・名前・写真は ID トークンに入っていても読まない。
// ログインの印は 32 バイトの乱数を Cookie (HttpOnly; Secure; SameSite=Lax; Path=/api) に置き、D1 には SHA-256 だけを残す。
// 状態を変える道 (POST/PUT/DELETE) は Content-Type が JSON で、Origin が同じ所からのものだけを受ける (CSRF)。
// Node 版 (server/server.mjs) には無い。ログインは wrangler pages dev で確かめる (docs/DEPLOY.md)
import { mergeProgress, newProgress, normalizeProgress } from '../src/meta/merge.ts';

export const COOKIE = 'ri_sid';
export const SESSION_MS = 180 * 86_400_000;
export const PROGRESS_MAX = 256 * 1024; // 記録の本文の上限 (バイト)
const GOOGLE_ISS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const SKEW_S = 60;

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---- Google の ID トークンを確かめる ---------------------------------------------
// 鍵は Google の JWKS をこの isolate の中で1時間覚える。知らない kid が来たら (鍵の入れ替え) 1分に1回まで取り直す
let jwks = { keys: [], at: 0 };
async function googleKeys(now, force) {
  if (!force && now - jwks.at < 3_600_000 && jwks.keys.length) return jwks.keys;
  if (force && now - jwks.at < 60_000) return jwks.keys;
  const r = await fetch(GOOGLE_CERTS);
  if (!r.ok) throw new Error(`jwks ${r.status}`);
  const j = await r.json();
  jwks = { keys: Array.isArray(j?.keys) ? j.keys : [], at: now };
  return jwks.keys;
}
// テスト用: 覚えた鍵を忘れる
export const forgetKeys = () => { jwks = { keys: [], at: 0 }; };

class BadToken extends Error {}

/** 正しければ { sub }。だめなら BadToken を投げる (理由は message に。外には出さない) */
export async function verifyGoogleIdToken(token, clientId, now = Date.now()) {
  if (!clientId) throw new BadToken('no client id');
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3 || token.length > 4096) throw new BadToken('shape');
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(unb64url(parts[1])));
  } catch { throw new BadToken('decode'); }
  if (header?.alg !== 'RS256' || typeof header.kid !== 'string') throw new BadToken('alg');
  let jwk = (await googleKeys(now, false)).find((k) => k.kid === header.kid);
  jwk ??= (await googleKeys(now, true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new BadToken('kid');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new BadToken('sig');
  const t = Math.floor(now / 1000);
  if (!GOOGLE_ISS.has(claims?.iss)) throw new BadToken('iss');
  if (claims.aud !== clientId) throw new BadToken('aud');
  if (typeof claims.exp !== 'number' || claims.exp + SKEW_S < t) throw new BadToken('exp');
  if (typeof claims.iat !== 'number' || claims.iat - SKEW_S > t) throw new BadToken('iat');
  if (typeof claims.sub !== 'string' || !/^[\w-]{1,255}$/.test(claims.sub)) throw new BadToken('sub');
  return { sub: claims.sub };
}

// ---- 道 ---------------------------------------------------------------------
const cookieOf = (request) => (request.headers.get('Cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
const setCookie = (value, maxAgeS) => `${COOKIE}=${value}; Max-Age=${maxAgeS}; Path=/api; HttpOnly; Secure; SameSite=Lax`;
const withCookie = (res, c) => { res.headers.append('Set-Cookie', c); return res; };

// 同じ所から JSON で来たものだけ (よそのページのフォームや fetch で状態を変えさせない)
function sameOrigin(request) {
  const ct = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  return ct === 'application/json' && request.headers.get('Origin') === new URL(request.url).origin;
}

async function body(request, max) {
  if (Number(request.headers.get('Content-Length') ?? 0) > max) return { tooLarge: true };
  const t = await request.text();
  if (enc.encode(t).length > max) return { tooLarge: true };
  try { return { v: JSON.parse(t) }; } catch { return { bad: true }; }
}

async function sessionAccount(db, request, now) {
  const tok = cookieOf(request);
  if (!/^[\w-]{43}$/.test(tok)) return null;
  const row = await db.prepare('SELECT s.account_id AS id, a.provider FROM session s JOIN account a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256(tok), now).first();
  return row ?? null;
}

/** /api/auth/* と /api/account と /api/progress。ほかの道なら null。h = cf-api の { json, ng, allow, who } */
export async function accountRoute(request, env, now, h) {
  const { pathname: p } = new URL(request.url);
  if (!(p.startsWith('/api/auth/') || p === '/api/account' || p === '/api/progress')) return null;
  const { json, ng, allow, who } = h;
  const db = env.DB;
  const m = request.method;
  // GOOGLE_CLIENT_ID が無ければ、アカウントの道は無いものとする (画面もログインを出さない)
  if (!env.GOOGLE_CLIENT_ID) return ng(404, 'not found');
  if (m !== 'GET' && !sameOrigin(request)) return ng(403, 'forbidden');

  if (m === 'POST' && p === '/api/auth/google') {
    if (!(await allow(db, 'loginMin', await who(), now))) return ng(429, 'too many requests');
    const b = await body(request, 8192);
    if (!b.v || typeof b.v.credential !== 'string') return ng(400, 'invalid: credential');
    let sub;
    try { ({ sub } = await verifyGoogleIdToken(b.v.credential, env.GOOGLE_CLIENT_ID, now)); } catch (err) {
      if (err instanceof BadToken) return ng(401, 'unauthorized');
      throw err;
    }
    const acc = await db.prepare('INSERT INTO account (provider, sub) VALUES (?, ?) ON CONFLICT (provider, sub) DO UPDATE SET sub = sub RETURNING id')
      .bind('google', sub).first();
    const tok = b64url(crypto.getRandomValues(new Uint8Array(32)));
    await db.batch([
      db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
      db.prepare('INSERT INTO session (token_hash, account_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(tok), acc.id, now + SESSION_MS),
    ]);
    return withCookie(json(200, { success: true, data: { signedIn: true, provider: 'google' } }), setCookie(tok, SESSION_MS / 1000));
  }

  const acc = await sessionAccount(db, request, now);

  if (m === 'GET' && p === '/api/auth/me') {
    return json(200, { success: true, data: acc ? { signedIn: true, provider: acc.provider } : { signedIn: false } });
  }

  if (m === 'POST' && p === '/api/auth/logout') {
    const tok = cookieOf(request);
    if (tok) await db.prepare('DELETE FROM session WHERE token_hash = ?').bind(await sha256(tok)).run();
    return withCookie(json(200, { success: true, data: { signedIn: false } }), setCookie('', 0));
  }

  if (!acc) return ng(401, 'unauthorized');

  if (m === 'DELETE' && p === '/api/account') {
    await db.batch([
      db.prepare('DELETE FROM progress WHERE account_id = ?').bind(acc.id),
      db.prepare('DELETE FROM session WHERE account_id = ?').bind(acc.id),
      db.prepare('DELETE FROM account WHERE id = ?').bind(acc.id),
    ]);
    return withCookie(json(200, { success: true, data: { deleted: true } }), setCookie('', 0));
  }

  if (m === 'GET' && p === '/api/progress') {
    const row = await db.prepare('SELECT data, rev FROM progress WHERE account_id = ?').bind(acc.id).first();
    return json(200, { success: true, data: row ? { data: JSON.parse(row.data), rev: row.rev } : { data: null, rev: 0 } });
  }

  if (m === 'PUT' && p === '/api/progress') {
    if (!(await allow(db, 'progressMin', String(acc.id), now))) return ng(429, 'too many requests');
    const b = await body(request, PROGRESS_MAX);
    if (b.tooLarge) return ng(413, 'too large');
    const sent = normalizeProgress(b.v?.data);
    const baseRev = b.v?.baseRev;
    const reset = b.v?.reset === true;
    if (!sent || !Number.isSafeInteger(baseRev) || baseRev < 0) return ng(400, 'invalid: progress');
    // 書く間に別の端末が書いたら、読み直して合わせ直す (rev で確かめる)
    for (let i = 0; i < 3; i++) {
      const row = await db.prepare('SELECT data, rev FROM progress WHERE account_id = ?').bind(acc.id).first();
      // reset: true は「最初から」。サーバの記録と合わせず、送られたものに置き換える
      const both = mergeProgress(row && !reset ? JSON.parse(row.data) : newProgress(), sent);
      // この端末がサーバの今の版から進めただけなら、チケットは送られた枚数 (使って減った分を max で戻さない)
      const merged = !row || reset || row.rev === baseRev ? { ...both, tickets: sent.tickets } : both;
      const data = JSON.stringify(merged);
      const rev = (row?.rev ?? 0) + 1;
      const w = row
        ? await db.prepare('UPDATE progress SET data = ?, rev = ?, updated_at = ? WHERE account_id = ? AND rev = ?').bind(data, rev, now, acc.id, row.rev).run()
        : await db.prepare('INSERT INTO progress (account_id, data, rev, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (account_id) DO NOTHING').bind(acc.id, data, rev, now).run();
      if (w.meta.changes) return json(200, { success: true, data: { data: merged, rev } });
    }
    return ng(409, 'conflict');
  }

  return ng(404, 'not found');
}
