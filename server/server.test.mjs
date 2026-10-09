// 追悼館のサーバ: 空いているポートと一時ディレクトリの db で起動し、検証・制限・二重投稿・ろうそく・一覧を確かめる。
// 後半はクライアント (src/net/memorial.ts) から実際の人生を送る
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENUMS, MAX_BODY, startServer } from './server.mjs';
import { HAZARDS, JOBS, RACE_IDS, STATUSES, WORLD_IDS, createHero, liveOut } from '../src/engine';
// src/ui/pixel.ts は読み込むときに window を触るので、置き換えを先に置いてから読む
globalThis.window ??= { addEventListener() {} };
const { getMemorial, lightCandle, listMemorial, memorialAvailable, postMemorial, toMemorialPost } = await import('../src/net/memorial');

const dir = mkdtempSync(join(tmpdir(), 'memorial-'));
const servers = [];
async function boot(name) {
  const s = await startServer({ port: 0, host: '127.0.0.1', dbPath: join(dir, `${name}.db`), distDir: join(dir, 'nodist') });
  servers.push(s);
  return `http://127.0.0.1:${s.port}`;
}
afterAll(async () => {
  vi.unstubAllGlobals();
  await Promise.all(servers.map((s) => s.close()));
  rmSync(dir, { recursive: true, force: true });
});

let seq = 1;
const entry = (over = {}) => ({
  seed: seq++, world: 'medieval', name: 'アルト', race: 'human', sex: 'M', status: 'commoner', age: 42, hazard: 'monster',
  causeLabel: '魔物に襲われた', causeText: '森で狼の群れに襲われた。', why: '冒険者だったから',
  highlights: [{ age: 15, text: 'ギルドに入った' }], lastWith: [{ name: 'リナ', role: 'spouse' }], note: '',
  scene: { seed: 1, world: 'medieval', place: 'grave', home: 'house', tod: 'dusk', season: 2, dead: true,
    figures: [{ seed: 2, race: 'human', sex: 'F', stage: 'adult', job: null, status: 'commoner' }] },
  lang: 'ja', ...over,
});
const post = (base, body) => fetch(`${base}/api/memorial`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
});

it('値の一覧が src/engine と同じ', () => {
  const same = (a, b) => expect([...a].sort()).toEqual([...b].sort());
  same(ENUMS.world, WORLD_IDS);
  same(ENUMS.race, RACE_IDS);
  same(ENUMS.status, STATUSES);
  same(ENUMS.hazard, HAZARDS);
  same(ENUMS.job, Object.keys(JOBS));
});

describe('検証', () => {
  let base;
  beforeAll(async () => { base = await boot('valid'); });

  it('health', async () => {
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ success: true, data: { ok: true } });
  });

  const bad = {
    名前が長すぎ: { name: 'あ'.repeat(61) },
    死因の文が長すぎ: { causeText: 'x'.repeat(401) },
    一言が長すぎ: { note: 'x'.repeat(141) },
    出来事が13件: { highlights: Array.from({ length: 13 }, (_, i) => ({ age: i, text: 'a' })) },
    出来事の文が長すぎ: { highlights: [{ age: 1, text: 'x'.repeat(201) }] },
    そばの人が4人: { lastWith: Array.from({ length: 4 }, () => ({ name: 'a', role: 'friend' })) },
    世界が一覧に無い: { world: 'narnia' },
    種族が一覧に無い: { race: 'hobbit' },
    死因の分類が一覧に無い: { hazard: 'boredom' },
    身分が一覧に無い: { status: 'emperor' },
    役が一覧に無い: { lastWith: [{ name: 'a', role: 'boss' }] },
    言語が一覧に無い: { lang: 'fr' },
    享年が小数: { age: 4.5 },
    名前が数: { name: 12 },
    名前が制御文字だけ: { name: '\u0000\u0007\n' },
    代が0: { gen: 0 },
    代が1000: { gen: 1000 },
    代が小数: { gen: 2.5 },
    代が文字: { gen: '2' },
    系譜が13人: { lineage: Array.from({ length: 13 }, (_, i) => `名${i}`) },
    系譜の名前が長すぎ: { lineage: ['あ'.repeat(61)] },
    系譜の名前が空: { lineage: [''] },
    系譜が配列でない: { lineage: 'アルト' },
  };
  for (const [what, over] of Object.entries(bad)) {
    it(`弾く: ${what}`, async () => { expect((await post(base, entry(over))).status).toBe(400); });
  }

  it('系譜: 代と前の代の名前を残して返す。無ければ初代', async () => {
    const r = await post(base, entry({ gen: 3, lineage: ['アルト', 'リナ\u0000'] }));
    expect(r.status).toBe(201);
    const got = (await (await fetch(`${base}/api/memorial/${(await r.json()).data.id}`)).json()).data;
    expect(got.gen).toBe(3);
    expect(got.lineage).toEqual(['アルト', 'リナ']);
    const r2 = await post(base, entry());
    const got2 = (await (await fetch(`${base}/api/memorial/${(await r2.json()).data.id}`)).json()).data;
    expect(got2.gen).toBe(1);
    expect(got2.lineage).toEqual([]);
  });

  it('弾く: 壊れた JSON', async () => { expect((await post(base, '{')).status).toBe(400); });

  it('弾く: 16KB を超える本文は 413', async () => {
    const r = await post(base, entry({ pad: 'x'.repeat(MAX_BODY) }));
    expect(r.status).toBe(413);
  });

  it('制御文字を取り除いて残す。形の違う場面は捨てる', async () => {
    const r = await post(base, entry({ name: 'ア\u0000ル‮ト\n', note: 'さよう\u0007なら', scene: { seed: 'x' } }));
    expect(r.status).toBe(201);
    const { data } = await r.json();
    const got = (await (await fetch(`${base}/api/memorial/${data.id}`)).json()).data;
    expect(got.name).toBe('アルト');
    expect(got.note).toBe('さようなら');
    expect(got.scene).toBeNull();
    expect(got).not.toHaveProperty('ip');
  });
});

it('系譜の欄の無い古い db を開くと欄を足し、古い記録は初代として返す', async () => {
  const path = join(dir, 'old.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE memorial (id INTEGER PRIMARY KEY AUTOINCREMENT, seed INTEGER NOT NULL, world TEXT NOT NULL, name TEXT NOT NULL, race TEXT NOT NULL,
    sex TEXT NOT NULL, status TEXT NOT NULL, age INTEGER NOT NULL, hazard TEXT NOT NULL, cause_label TEXT NOT NULL, cause_text TEXT NOT NULL,
    why TEXT NOT NULL DEFAULT '', highlights TEXT NOT NULL DEFAULT '[]', last_with TEXT NOT NULL DEFAULT '[]', note TEXT NOT NULL DEFAULT '', scene TEXT,
    lang TEXT NOT NULL DEFAULT 'ja', candles INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), UNIQUE (seed, world))`);
  old.prepare(`INSERT INTO memorial (seed, world, name, race, sex, status, age, hazard, cause_label, cause_text) VALUES (1, 'medieval', '古い人', 'human', 'F', 'commoner', 30, 'age', '老衰', '眠るように。')`).run();
  old.close();
  const s = await startServer({ port: 0, host: '127.0.0.1', dbPath: path, distDir: join(dir, 'nodist') });
  servers.push(s);
  const got = (await (await fetch(`http://127.0.0.1:${s.port}/api/memorial/1`)).json()).data;
  expect(got.name).toBe('古い人');
  expect(got.gen).toBe(1);
  expect(got.lineage).toEqual([]);
});

describe('制限・二重投稿・ろうそく・一覧', () => {
  let base;
  const ids = [];
  beforeAll(async () => { base = await boot('limits'); });

  it('記録は1分に3件まで (4件目は 429)', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await post(base, entry());
      expect(r.status).toBe(201);
      ids.push((await r.json()).data.id);
    }
    expect((await post(base, entry())).status).toBe(429);
  });

  it('同じ人生 (seed と世界) の二重投稿は 409 で、元の id を返す', async () => {
    const first = (await (await fetch(`${base}/api/memorial/${ids[0]}`)).json()).data;
    const r = await post(base, entry({ seed: first.seed, world: first.world, name: '別の名' }));
    expect(r.status).toBe(409);
    expect((await r.json()).data.id).toBe(ids[0]);
  });

  it('ろうそくは +1 ずつ、無い記録は 404、1分に20回まで', async () => {
    const light = (id) => fetch(`${base}/api/memorial/${id}/candle`, { method: 'POST' });
    expect((await (await light(ids[1])).json()).data.candles).toBe(1);
    expect((await (await light(ids[1])).json()).data.candles).toBe(2);
    expect((await light(999999)).status).toBe(404);
    const rest = [];
    for (let i = 0; i < 17; i++) rest.push((await light(ids[1])).status);
    expect(rest.every((s) => s === 200)).toBe(true);
    expect((await light(ids[1])).status).toBe(429);
  });

  it('一覧は新しい順、limit と offset が効き、limit は 50 まで', async () => {
    const all = await (await fetch(`${base}/api/memorial`)).json();
    expect(all.data.map((e) => e.id)).toEqual([...ids].reverse());
    expect(all.meta.total).toBe(3);
    const page = await (await fetch(`${base}/api/memorial?offset=1&limit=1`)).json();
    expect(page.data.map((e) => e.id)).toEqual([ids[1]]);
    const big = await (await fetch(`${base}/api/memorial?limit=1000`)).json();
    expect(big.meta.limit).toBe(50);
  });

  it('無い id は 404', async () => {
    expect((await fetch(`${base}/api/memorial/424242`)).status).toBe(404);
  });
});

describe('クライアントから実際の人生を送る', () => {
  let base;
  beforeAll(async () => {
    base = await boot('client');
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', (u, init) => real(typeof u === 'string' && u.startsWith('/') ? base + u : u, init));
  });

  it('送って、一覧と1件で読み、ろうそくを灯す', async () => {
    expect(await memorialAvailable()).toBe(true);
    const h = liveOut(createHero({ seed: 20261009, world: { preset: 'medieval' }, hero: {}, auto: true }));
    expect(h.alive).toBe(false);
    const body = toMemorialPost(h, 'ありがとう');
    expect(body.highlights.length).toBeLessThanOrEqual(12);

    const r = await postMemorial(h, 'ありがとう');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const again = await postMemorial(h);
    expect(again).toMatchObject({ ok: false, status: 409, id: r.data.id });

    const one = await getMemorial(r.data.id);
    expect(one.ok && one.data).toMatchObject({ name: body.name, world: 'medieval', note: 'ありがとう', hazard: body.hazard });
    expect(one.ok && one.data.scene).toEqual(body.scene);

    const page = await listMemorial(0);
    expect(page.ok && page.data.items[0].id).toBe(r.data.id);
    const c = await lightCandle(r.data.id);
    expect(c).toEqual({ ok: true, data: { candles: 1 } });
  });

  it('サーバが無ければ memorialAvailable は false', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
    expect(await memorialAvailable()).toBe(false);
  });
});
