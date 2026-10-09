import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allEvents, allDeaths, createHero, liveOut, WORLDS, WORLD_IDS } from '../engine';
import { continueAs, heirsOf } from '../engine/lineage';
import { reincarnatorsOf } from '../engine/reincarnators';
import type { Hero, HeroChoice, Policy, WorldId } from '../engine/types';
import { allAchievements, checkAchievements, evalCond, useAchievements } from './achievements';
import { factsOf } from './facts';
import { ACH_TICKETS_MAX_PER_LIFE, grantLife } from './tickets';
import { newProgress, setStorage } from './store';
import { playLives } from './sim';
import { BESTIARY } from './bestiary';
import type { AchievementDef, Cond, LifeFacts } from './types';

const REAL = allAchievements();
afterAll(() => useAchievements(REAL));

const facts = (over: Partial<LifeFacts> = {}): LifeFacts => ({
  lifeId: '1', ended: true, random: true, tactic: 'normal', standing: 'commoner', rose: 0, fell: false, name: 'A', world: 'medieval', race: 'human', sex: 'F', status: 'commoner', cheat: null,
  traits: [], arrival: 'reborn', blessing: false, age: 50, heq: 50, hazard: 'age', deathId: 'd.age', job: null, rank: null, level: 3,
  flags: ['famous'], marriages: 1, children: 2, foesMet: 3, foesWon: 2, foesLost: 0, foeKinds: ['slime'], foeKindsWon: ['slime'],
  encounters: [], reincMet: 0, reincFought: 0, gen: 1, maxBond: 80, outlivedAll: false, lifespanRatio: 0.8, firstYearAdventure: false,
  eventIds: [], ...over,
});
const def = (id: string, cond: Cond, extra: Partial<AchievementDef> = {}): AchievementDef =>
  ({ id, category: 'feat', name: { ja: id, en: id }, desc: { ja: id, en: id }, cond, ...extra });

describe('評価器 (見本の実績で)', () => {
  it('条件の形をひと通り', () => {
    const f = facts(), p = newProgress();
    p.totals.lives = 5;
    p.distinct = { worlds: ['medieval', 'dark'] };
    expect(evalCond({ total: 'lives', gte: 5 }, f, p)).toBe(true);
    expect(evalCond({ total: 'lives', gte: 6 }, f, p)).toBe(false);
    expect(evalCond({ fact: 'age', gte: 50, lte: 50 }, f, p)).toBe(true);
    expect(evalCond({ fact: 'world', eq: 'dark' }, f, p)).toBe(false);
    expect(evalCond({ fact: 'blessing', eq: false }, f, p)).toBe(true);
    expect(evalCond({ fact: 'outlivedAll' }, f, p)).toBe(false);
    expect(evalCond({ fact: 'flags', gte: 1 }, f, p)).toBe(true); // 配列は長さ
    expect(evalCond({ has: 'flags', id: 'famous' }, f, p)).toBe(true);
    expect(evalCond({ has: 'foeKinds', id: 'dragon' }, f, p)).toBe(false);
    expect(evalCond({ distinct: 'worlds', gte: 2 }, f, p)).toBe(true);
    expect(evalCond({ distinct: 'worlds', gte: 2, random: true }, f, p)).toBe(false);
    expect(evalCond({ all: [{ fact: 'age', gte: 10 }, { not: { fact: 'world', eq: 'dark' } }] }, f, p)).toBe(true);
    expect(evalCond({ any: [{ fact: 'age', gte: 99 }, { fact: 'children', gte: 2 }] }, f, p)).toBe(true);
    expect(evalCond({ collection: 'bestiary', pct: 1 }, f, p)).toBe(false);
    p.bestiary = Object.fromEntries(BESTIARY.map((b) => [b.id, { met: 1, won: 0, first: { name: 'A', world: 'medieval', at: 0 } }]));
    expect(evalCond({ collection: 'bestiary', pct: 100 }, f, p)).toBe(true);
    expect(evalCond({ collection: 'bestiaryWon', pct: 1 }, f, p)).toBe(false);
  });

  it('全世界で: 世界ごとの最大で見る', () => {
    const p = newProgress();
    p.worldsDone = Object.fromEntries(WORLD_IDS.map((w) => [w, 1]));
    p.worldBest = Object.fromEntries(WORLD_IDS.map((w) => [w, { age: w === 'dark' ? 30 : 70 }]));
    expect(evalCond({ everyWorld: true }, facts(), p)).toBe(true);
    expect(evalCond({ everyWorld: true, fact: 'age', gte: 60 }, facts(), p)).toBe(false);
    expect(evalCond({ everyWorld: true, fact: 'age', gte: 30 }, facts(), p)).toBe(true);
  });

  it('解放済みは返さない、year は年ごとのものだけ', () => {
    useAchievements([def('a', { fact: 'age', gte: 1 }), def('b', { fact: 'age', gte: 1 }, { when: 'year' })]);
    const p = newProgress();
    expect(checkAchievements(facts(), p).map((a) => a.id)).toEqual(['a', 'b']);
    expect(checkAchievements(facts(), p, 'year').map((a) => a.id)).toEqual(['b']);
    p.achievements.a = { at: 0, name: 'A', world: 'medieval' };
    expect(checkAchievements(facts(), p).map((a) => a.id)).toEqual(['b']);
    useAchievements(REAL);
  });

  it('精算で解放し、実績のチケットを足し、二度は出さない。集めた割合の実績も同じ精算で続けて開く', () => {
    useAchievements([def('one', { total: 'lives', gte: 1 }, { tickets: 2 }), def('all', { collection: 'achievements', pct: 50 })]);
    setStorage(null);
    const h = liveOut(createHero({ seed: 9, world: { preset: 'random' }, hero: {}, auto: true }));
    const r = grantLife(h, false);
    expect(r.tickets.gain).toBe(0);
    expect(r.achievements.map((a) => a.id)).toEqual(['one', 'all']);
    expect(r.achTickets).toBe(Math.min(2, ACH_TICKETS_MAX_PER_LIFE)); // 実績のチケットは1つの人生で上限まで
    expect(r.ticketsNow).toBe(r.achTickets);
    useAchievements(REAL);
  });
});

// ---- 本物の実績の一覧 (src/data/achievements.ts) ------------------------------------

const live = (seed: number, world: WorldId | 'random', hero: HeroChoice = {}, policy?: Policy): Hero => liveOut(createHero({ seed, world: { preset: world }, hero, auto: true, ...(policy ? { policy } : {}) }));

// 1つの人生だけで決まる条件か (合計・種類・集めた割合を含まない)
const perLife = (c: Cond): boolean =>
  'all' in c ? c.all.every(perLife) : 'any' in c ? c.any.every(perLife) : 'not' in c ? perLife(c.not) : 'fact' in c || 'has' in c;

// 条件から、探すときの設定を読む: 世界・種族・特典・身分・始まり方、死因の文の世界、図鑑の姿の世界
function hintsOf(c: Cond): { worlds: WorldId[]; hero: HeroChoice; policy?: Policy; wide: boolean } {
  const worlds = new Set<WorldId>(), hero: HeroChoice = {};
  let policy: Policy | undefined;
  let wide = false; // 特定の死因の文・しるしは、1人あたりの起きやすさが低いので広く探す
  const walk = (x: Cond): void => {
    if ('all' in x) return x.all.forEach(walk);
    if ('any' in x) return walk(x.any[0]);
    if ('fact' in x && !('everyWorld' in x) && x.eq !== undefined) {
      const v = x.eq as never;
      if (x.fact === 'world') worlds.add(v);
      if (x.fact === 'race') hero.race = v;
      if (x.fact === 'cheat') hero.cheat = v;
      if (x.fact === 'status') hero.status = v;
      if (x.fact === 'arrival') hero.arrival = v;
      if (x.fact === 'tactic' && x.eq !== 'mixed') policy = v; // 作戦を通した実績は、その作戦で生きる
      if (x.fact === 'deathId') {
        const d = allDeaths().find((y) => y.id === x.eq);
        if (d) {
          wide = true;
          for (const w of WORLD_IDS) if ((!d.tags || d.tags.some((t) => WORLDS[w].tags.includes(t))) && !d.not?.some((t) => WORLDS[w].tags.includes(t)) && (d.magic === undefined || WORLDS[w].magic >= d.magic) && (!d.tech || (WORLDS[w].tech >= d.tech[0] && WORLDS[w].tech <= d.tech[1]))) worlds.add(w);
          if (d.races?.length === 1) hero.race = d.races[0];
          if (d.status?.length === 1) hero.status = d.status[0];
        }
      }
    }
    if ('has' in x && (x.has === 'foeKinds' || x.has === 'foeKindsWon')) BESTIARY.find((b) => b.id === x.id)?.worlds.forEach((w) => worlds.add(w));
    // しるしの実績: そのしるしを立てる出来事の条件から、世界・身分・特典・種族・来かたを読む (乱数の並びが変わっても、起きうる人生を探せるように)
    if ('has' in x && x.has === 'flags') {
      const e = allEvents().find((d) => d.set === x.id || d.choice?.options.some((o) => o.set === x.id));
      if (e) {
        wide = true;
        for (const w of WORLD_IDS) {
          const W = WORLDS[w];
          if ((!e.tags || e.tags.some((t) => W.tags.includes(t))) && !e.not?.some((t) => W.tags.includes(t)) && (e.magic === undefined || W.magic >= e.magic) && (!e.tech || (W.tech >= e.tech[0] && W.tech <= e.tech[1]))) worlds.add(w);
        }
        if (e.status?.length) hero.status ??= e.status[0];
        if (e.cheats?.length) hero.cheat ??= e.cheats[0];
        if (e.races?.length === 1) hero.race ??= e.races[0];
        if (e.arrival?.length === 1) hero.arrival ??= e.arrival[0];
        if (e.jobs?.some((j) => j === 'mage' || j === 'priest')) hero.talent ??= 'magic';
      }
    }
  };
  walk(c);
  return { worlds: worlds.size ? [...worlds] : WORLD_IDS, hero, policy, wide };
}

// 見つけにくいものの手がかり (測って見つけた seed と設定)。seed は近道にすぎない: 出来事が増えて乱数の並びが変わり seed が外れても、
// 同じ設定で広く (HINT_BUDGET 人まで) 探し直す。設定は「その実績が起きうる人生」になるものを書く (seed を貼り直すのではなく)
interface Hint { world: WorldId; hero: HeroChoice; seed: number; policy?: Policy }
const HINTS: Record<string, Hint> = {
  'a.feat.age1000': { world: 'medieval', hero: { race: 'elf', cheat: 'immortal_body' }, seed: 119 },
  'a.feat.guildmaster': { world: 'medieval', hero: { cheat: 'sword_saint' }, seed: 1465 }, // 鍛える選択を入れた後に測り直した (前は 631)
  'a.death.alien': { world: 'space', hero: {}, seed: 194 },
  'a.feat.freed': { world: 'medieval', hero: { status: 'slave' }, seed: 8 },
  'a.feat.slaveToNoble': { world: 'medieval', hero: { status: 'slave' }, seed: 448, policy: 'bold' },
  'a.feat.orphanRise': { world: 'medieval', hero: { status: 'orphan' }, seed: 60, policy: 'bold' },
  'a.feat.restored': { world: 'medieval', hero: { status: 'noble' }, seed: 26 },
  'a.feat.courtmage': { world: 'medieval', hero: { talent: 'magic' }, seed: 119 },
  'a.feat.streamer': { world: 'modern', hero: {}, seed: 194 },
  'a.death.radiation': { world: 'postapoc', hero: {}, seed: 69 },
  'a.feat.wentHome': { world: 'medieval', hero: { arrival: 'summoned' }, seed: 29 },
  'a.feat.stayed': { world: 'medieval', hero: { arrival: 'summoned' }, seed: 13 },
  'a.death.scurvy': { world: 'ocean', hero: {}, seed: 326 },
  'a.death.sandstorm': { world: 'desert', hero: {}, seed: 283 },
  'a.death.seppuku': { world: 'wa', hero: { status: 'gentry' }, seed: 258 },
  'a.death.heroSilenced': { world: 'medieval', hero: { cheat: 'holy_power' }, seed: 29 },
};

const HINT_BUDGET = 4000;

// 1つの人生で決まる実績を、設定を変えて探す (見つかった seed を返す)
function search(a: AchievementDef, tries: number): number | null {
  const p = newProgress();
  const ok = (h: Hero) => evalCond(a.cond, factsOf(h, true), p);
  const hint = HINTS[a.id];
  if (hint && ok(live(hint.seed, hint.world, hint.hero, hint.policy))) return hint.seed;
  const { worlds, hero, policy, wide } = hint ? { worlds: [hint.world], hero: hint.hero, policy: hint.policy, wide: true } : hintsOf(a.cond);
  const n = wide ? HINT_BUDGET : tries;
  for (let i = 0; i < n; i++) if (ok(live(i + 1, worlds[i % worlds.length], hero, policy))) return i + 1;
  return null;
}

// 系譜を続けた人生。gen 代目まで続けられたら、その代の主人公
function chain(seed: number, gen: number): Hero | null {
  let h = live(seed, 'random');
  for (let g = 1; g < gen; g++) {
    const keys = heirsOf(h);
    if (!keys.length) return null;
    // 会った転生者がいればその人を選ぶ (特典を持っているので、英雄の筋が続く)
    const reinc = new Set(reincarnatorsOf(h).flatMap((q) => (q.tieId === undefined ? [] : [`t:${q.tieId}`])));
    h = liveOut(continueAs(h, keys.find((k) => reinc.has(k)) ?? keys[0]));
  }
  return h;
}

// 探しても見つからない実績と、その理由。ここに無いもので見つからないものがあればテストが落ちる
// (測定 2026-10-09。上の探し方と、おまかせ3000人・設定した1500人の実測で)
const REASONS: Record<string, string> = {
  'a.race.distinctAll': '27種族すべてを見るにはおまかせで2000人を超える (3000人で全種族を実測)。長く遊べば届く',
  'a.collection.encounters100': '出会い図鑑の全部が要る。past_friend の出来事がまだ無い',
  'a.collection.bestiary100': '全81種にはおまかせ3000人で出会える (落ち武者と虚無の悪魔は3000人に1人)。2000人の通しでは揃わない。長く遊べば届く',
  'a.collection.won100': '同上 (3000人で全81種に勝った)',
  'a.feat.gekokujo': '王族への下剋上は、中世の貴族を作戦ガンガンいこうぜで生きても4000人に1人ほど (2026-10-09 に seed 3818 で実測)。長く遊べば届く',
  'a.collection.achievements100': '上の届かない実績と秘密の実績を含む',
};

describe('実績の一覧', () => {
  beforeAll(() => useAchievements(REAL)); // 上の見本のテストが途中で落ちても、本物の一覧で測る
  it.skipIf(!REAL.length)('id が重ならず、300件以上ある', () => {
    expect(new Set(REAL.map((a) => a.id)).size).toBe(REAL.length);
    expect(REAL.length).toBeGreaterThanOrEqual(300);
  });

  it.skipIf(!REAL.length)('1・10・50人のおまかせの人生で解放する数 (5人の平均)', () => {
    const at: Record<number, number[]> = { 1: [], 10: [], 50: [] };
    for (let b = 1; b <= 5; b++) {
      let n = 0;
      playLives(100 + b, 50, { heirEvery: 4, spend: true, onLife: (r, _h, i) => { n += r.achievements.length; at[i + 1]?.push(n); } });
    }
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    // 測った値 (2026-10-09, 439件): 1人 9.2 / 10人 60.4 / 50人 155.4。少なすぎ・多すぎだけを見る
    expect(avg(at[1])).toBeGreaterThan(0);
    expect(avg(at[50])).toBeGreaterThan(avg(at[10]));
    expect(avg(at[50])).toBeLessThan(REAL.length * 0.6);
  });

  const reached = new Set<string>();
  const LONG = 2000;
  let long = newProgress();
  it.skipIf(!REAL.length)('長く遊んだプレイヤー (2000人、系譜とチケットを使う) が解放するもの', () => {
    long = playLives(7, LONG, { heirEvery: 2, spend: true, onLife: (r) => r.achievements.forEach((a) => reached.add(a.id)) });
    expect(reached.size).toBeGreaterThan(REAL.length / 2);
  });

  it.skipIf(!REAL.length)('秘密でない実績は、解放できる seed があるか理由が書いてある', () => {
    const missing: string[] = [];
    for (const a of REAL) {
      if (a.hidden || reached.has(a.id) || REASONS[a.id]) continue;
      const gen = JSON.stringify(a.cond).match(/"fact":"gen","gte":(\d+)/);
      let ok = false;
      // 合計だけの条件は増える一方なので、2000人の伸びから届く人数を見積もる (2万人以内なら届くとみなす)
      if ('total' in a.cond) { const rate = long.totals[a.cond.total] / LONG; ok = rate > 0 && a.cond.gte / rate <= 20000; }
      else if (gen) for (let s = 1; s <= 40 && !ok; s++) { const h = chain(s, Number(gen[1])); ok = !!h && evalCond(a.cond, factsOf(h, true), newProgress()); }
      else if (perLife(a.cond)) ok = search(a, 600) !== null;
      if (!ok) missing.push(`${a.id} ${JSON.stringify(a.cond)}`);
    }
    expect(missing).toEqual([]);
    for (const id of Object.keys(REASONS)) expect(REAL.some((a) => a.id === id), `理由の表に無い実績 ${id}`).toBe(true);
  });
});
