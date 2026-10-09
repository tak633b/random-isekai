// 鍛える (training.ts): 数年ごとの「何を鍛える？」、身につけた trait、狙ったスキル、保存と再開
import { afterEach, describe, expect, it } from 'vitest';
import { advanceYear, choose, createHero, fromSaved, liveOut, toSaved } from '.';
import { allMethods, allPaths, LEARN_MAX, STEPS, useTraining } from './training';
import { allTraits, availableTraits } from './traits';
import type { Hero } from './types';

const PATHS = allPaths(), METHODS = allMethods();
afterEach(() => useTraining({ paths: PATHS, methods: METHODS }));

// 選択を数えながら、作戦どおりに自動で選んで最後まで生きる
function play(seed: number): { h: Hero; refs: string[] } {
  const h = createHero({ seed, world: { preset: 'random' }, hero: {} });
  const refs: string[] = [];
  for (let y = 0; y < 4000 && h.alive; y++) {
    advanceYear(h);
    // お金の選択 (病・市の日、econ.ts) は鍛えるとは別に数える
    while (h.pending.length && h.alive) { const r = h.pending[0].ref ?? ''; if (!/^(sick|shop|mev):/.test(r)) refs.push(r); choose(h, h.pending[0].auto(h)); }
  }
  return { h, refs };
}

describe('鍛える', () => {
  it('データ: 道と近づき方の id が重ならず、身につく trait は実在する', () => {
    expect(new Set(PATHS.map((p) => p.id)).size).toBe(PATHS.length);
    expect(new Set(METHODS.map((m) => m.id)).size).toBe(METHODS.length);
    const all = new Set(allTraits().map((t) => t.id));
    for (const p of PATHS) for (const id of p.traits) expect(all.has(id), `${p.id} ${id}`).toBe(true);
    for (const p of PATHS) expect(p.fails.length, p.id).toBeGreaterThan(0);
  });

  it('300人で: 選ぶ回数はおよそ2倍 (鍛える無しと同じ seed で比べる)。身につけるのは上限まで、その世界で選べるものだけ', () => {
    let withT = 0, train = 0, learned = 0, maxLearned = 0;
    for (let i = 0; i < 300; i++) {
      const { h, refs } = play(7000 + i);
      withT += refs.length; train += refs.filter((r) => r.startsWith('train:')).length;
      const got = h.learned ?? [];
      learned += got.length; maxLearned = Math.max(maxLearned, got.length);
      const ok = new Set(availableTraits(h.world, h.race).map((t) => t.id));
      for (const id of got) { expect(h.traits).toContain(id); expect(ok.has(id), `${h.world.id} ${id}`).toBe(true); }
    }
    useTraining({ paths: [] });
    let without = 0;
    for (let i = 0; i < 300; i++) without += play(7000 + i).refs.length;
    // 測った値 (2026-10-09): 鍛える無し 1887回 (1人 6.3) → 有り 3681回 (12.3)、うち鍛える 1530回。身につけたのは 1人 1.7。
    // 平均の寿命は 2400人で 48.6 → 49.8歳 (鍛えて身につけた trait のぶん少し延びる)
    expect(withT / without).toBeGreaterThan(1.5);
    expect(withT / without).toBeLessThan(2.6);
    expect(train).toBeGreaterThan(0);
    expect(learned).toBeGreaterThan(0);
    expect(maxLearned).toBeLessThanOrEqual(LEARN_MAX);
  });

  it('同じ seed は同じ人生 (鍛え方も身につけたものも)', () => {
    const a = liveOut(createHero({ seed: 31337, world: { preset: 'random' }, hero: {}, auto: true }));
    const b = liveOut(createHero({ seed: 31337, world: { preset: 'random' }, hero: {}, auto: true }));
    expect(JSON.stringify(toSaved(a))).toBe(JSON.stringify(toSaved(b)));
  });

  it('作戦: いのちだいじには危険の無い選択肢を選ぶ', () => {
    for (let s = 1; s <= 60; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: {}, policy: 'careful' });
      for (let y = 0; y < 60 && h.alive; y++) {
        advanceYear(h);
        while (h.pending.length && h.alive) {
          const d = h.pending[0];
          const i = d.auto(h);
          if (d.ref?.startsWith('train:')) expect(d.options[i].hint ?? '', d.ref).not.toMatch(/危険|risk/);
          choose(h, i);
        }
      }
    }
  });

  it('待っている「何を鍛える？」は保存から同じ選択肢で戻る', () => {
    const h = createHero({ seed: 99, world: { preset: 'medieval' }, hero: {} });
    for (let y = 0; y < 40 && h.alive && !h.pending.some((d) => d.ref?.startsWith('train:')); y++) {
      advanceYear(h);
      while (h.pending.length && !h.pending[0].ref?.startsWith('train:')) choose(h, 0);
    }
    const d = h.pending.find((x) => x.ref?.startsWith('train:'))!;
    expect(d).toBeDefined();
    const back = fromSaved(toSaved(h)).pending.find((x) => x.ref === d.ref)!;
    expect(back.options.map((o) => [o.label, o.hint])).toEqual(d.options.map((o) => [o.label, o.hint]));
  });

  it('狙ったスキルは、進みが100に届くと身につく (途中の一文つき)', () => {
    const h = createHero({ seed: 5, world: { preset: 'medieval' }, hero: { race: 'human' }, auto: true });
    h.age = 20;
    h.stats.wealth = 100;
    h.gold = 100 * 100; // 師匠への謝礼が尽きないように (暮らし向きはお金から決まる)
    h.train = { kind: 'goal', id: 'sk.cook', method: 'm.master', since: 19, step: 3, prog: 0 };
    const n = h.log.length;
    for (let y = 0; y < 30 && h.alive && !h.traits.includes('sk.cook'); y++) advanceYear(h);
    if (!h.alive) return; // まれに途中で亡くなる seed なら確かめられない
    expect(h.traits).toContain('sk.cook');
    expect(h.learned).toContain('sk.cook');
    expect(h.log.slice(n).some((e) => e.text.includes('料理'))).toBe(true);
    expect(STEPS[0]).toBeGreaterThan(0);
  });
});
