import { describe, it, expect, afterAll } from 'vitest';
import { allTraits, availableTraits, POINT_BUDGET, randomBuild, TRAIT_AGING_RANGE, TRAIT_SLOTS, useTraits, validateBuild } from './traits';
import { agingOf } from './mortality';
import { createHero, heqToAge } from './hero';
import { liveOut } from './life';
import { makeRng } from './rng';
import { TABLE_E0, WORLD_IDS, WORLDS } from './worlds';
import { RACE_IDS, RACES } from './races';
import type { HeroChoice, TraitDef } from './types';

const ORIGINAL = allTraits();
afterAll(() => useTraits(ORIGINAL));

const tr = (id: string, over: Partial<TraitDef>): TraitDef => ({ id, kind: 'skill', name: { ja: id, en: id }, desc: { ja: '', en: '' }, cost: 2, ...over });
// テスト用の小さな一覧 (データ担当の src/data/traits/ を待たずに確かめるため)
const POOL: TraitDef[] = [
  tr('t.sturdy', { kind: 'constitution', name: { ja: '頑健な体', en: 'Sturdy' }, cost: 4, mult: { disease: 0.5, plague: 0.5 } }),
  tr('t.frail', { kind: 'weakness', name: { ja: '病弱', en: 'Frail' }, cost: -3, mult: { disease: 2 }, excl: ['t.sturdy'] }),
  tr('t.ageless', { kind: 'blessing', cost: 6, aging: 0.5 }),
  tr('t.sword', { cost: 3, stats: { power: 10 } }),
  tr('t.mana', { kind: 'ability', cost: 5, magic: 2 }),
  tr('t.hacker', { cost: 3, tech: [7, 10] }),
  tr('t.elfsong', { cost: 2, races: ['elf'] }),
  tr('t.coward', { kind: 'weakness', cost: -2, mult: { monster: 0.8, war: 1.3 } }),
  tr('t.clumsy', { kind: 'weakness', cost: -2, mult: { accident: 1.5 } }),
  tr('t.unlucky', { kind: 'weakness', cost: -1, stats: { luck: -15 } }),
  tr('t.cheap1', { cost: 1 }), tr('t.cheap2', { cost: 1 }), tr('t.cheap3', { cost: 1 }), tr('t.cheap4', { cost: 1 }),
  tr('t.big', { kind: 'ability', cost: 12 }),
];

const base: HeroChoice = { race: 'human', status: 'commoner', cheat: 'none', arrival: 'reborn', points: {} };

describe('選べる trait と組み立ての確かめ', () => {
  it('世界と種族で絞る', () => {
    const ids = (w: keyof typeof WORLDS, r: keyof typeof RACES) => availableTraits(WORLDS[w], r, POOL).map((t) => t.id);
    expect(ids('medieval', 'human')).toContain('t.mana');
    expect(ids('medieval', 'human')).not.toContain('t.hacker'); // tech 7〜10 の trait (中世は tech 4)
    expect(ids('space', 'human')).not.toContain('t.mana');      // magic 2 以上の trait (宇宙は magic 0)
    expect(ids('medieval', 'elf')).toContain('t.elfsong');
    expect(ids('medieval', 'human')).not.toContain('t.elfsong'); // races: ['elf'] の trait
  });

  it('予算超過・同時に持てない組み合わせ・枠・弱点の数・選べないものを弾く', () => {
    const w = WORLDS.medieval;
    expect(validateBuild(w, 'human', { traits: ['t.sturdy', 't.sword'], points: { hp: 4, power: 4 } }, POOL)).toEqual([]);
    expect(validateBuild(w, 'human', { traits: ['t.big', 't.ageless', 't.sturdy'], points: {} }, POOL).join()).toMatch(/ポイントが2足りない/);
    expect(validateBuild(w, 'human', { traits: ['t.sturdy', 't.frail'] }, POOL).join()).toMatch(/同時に持てない/);
    expect(validateBuild(w, 'human', { traits: ['t.cheap1', 't.cheap2', 't.cheap3', 't.cheap4', 't.sword', 't.sturdy', 't.ageless'] }, POOL).join()).toMatch(/枠は6つまで/);
    expect(validateBuild(w, 'human', { traits: ['t.frail', 't.coward', 't.clumsy', 't.unlucky'] }, POOL).join()).toMatch(/弱点は3つまで/);
    expect(validateBuild(w, 'human', { traits: ['t.hacker'] }, POOL).join()).toMatch(/選べない/);
    expect(validateBuild(w, 'human', { points: { hp: 5 } }, POOL).join()).toMatch(/0〜4ポイント/);
  });

  it('おまかせの組み立ては、1000回とも予算と枠の中で、世界で選べないものが入らない', () => {
    const rng = makeRng(1);
    for (const [w, r] of [['medieval', 'human'], ['space', 'human'], ['medieval', 'elf']] as const) {
      const ok = new Set(availableTraits(WORLDS[w], r, POOL).map((t) => t.id));
      for (let i = 0; i < 1000; i++) {
        const b = randomBuild(rng, WORLDS[w], r, {}, POOL);
        expect(validateBuild(WORLDS[w], r, b, POOL)).toEqual([]);
        for (const id of b.traits) expect(ok.has(id)).toBe(true);
        expect(b.traits.filter((id) => POOL.find((t) => t.id === id)!.kind !== 'weakness').length).toBeLessThanOrEqual(TRAIT_SLOTS);
      }
    }
    expect(POINT_BUDGET).toBe(20);
  });
});

// 実測 (2026-10-09, 中世欧州風・人間・平民・転生・3000人): 成人した人の死因のうち病 (病・疫病) の割合
//   trait なし 0.204 / 頑健な体 (病 0.5倍) 0.115 / 病弱 (病 2倍) 0.271。平均享年: なし 31.9 / 長寿 (aging 0.5) 43.6
// 重ねがけの上限 (老い 0.7倍まで) と、輪の人の年齢を人間換算で合わせた後の実測 (1500人): なし 32.5 / 長寿 37.4 (+5.0)。幅は +3年
describe('trait の効き目', () => {
  const run = (traits: string[]) => {
    useTraits(POOL);
    let dis = 0, adults = 0, sum = 0;
    for (let s = 1; s <= 1500; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'medieval' }, hero: { ...base, traits }, auto: true }));
      sum += h.age;
      if (h.age < 16) continue;
      adults++;
      if (h.death!.hazard === 'disease' || h.death!.hazard === 'plague') dis++;
    }
    return { dis: dis / adults, mean: sum / 1500 };
  };
  const none = run([]);
  it('病の倍率を持つ trait で病の死の割合が下がり、弱点で上がる', () => {
    expect(run(['t.sturdy']).dis).toBeLessThan(none.dis * 0.75);
    expect(run(['t.frail']).dis).toBeGreaterThan(none.dis * 1.15);
  }, 30_000);
  it('老いの遅くなる trait で平均享年が伸びる', () => {
    expect(run(['t.ageless']).mean).toBeGreaterThan(none.mean + 3);
  }, 30_000);
  it('始まりの能力に trait の stats とポイントが乗る', () => {
    useTraits(POOL);
    const a = createHero({ seed: 3, world: { preset: 'medieval' }, hero: { ...base, traits: [] }, auto: true });
    const b = createHero({ seed: 3, world: { preset: 'medieval' }, hero: { ...base, traits: ['t.sword'], points: { power: 2 } }, auto: true });
    expect(b.stats.power - a.stats.power).toBe(Math.min(100, a.stats.power + 20) - a.stats.power);
  });
});

// 実測 (2026-10-09, 中世欧州風・人間・平民・転生・3000人): 5歳までに亡くなる割合 加護なし 0.363 / あり 0.127 (0.35倍)、
// 16歳まで 0.426 / 0.185。平均享年 31.9 / 44.7
describe('女神の加護', () => {
  it('中世で5歳までの死亡が半分より下がる', () => {
    const u5 = (blessing: boolean) => {
      let n = 0;
      for (let s = 1; s <= 1500; s++) if (liveOut(createHero({ seed: s * 7919, world: { preset: 'medieval' }, hero: { ...base, traits: [], blessing }, auto: true })).age < 5) n++;
      return n / 1500;
    };
    expect(u5(true)).toBeLessThan(u5(false) * 0.5);
  }, 30_000);
});

describe('始まる年齢', () => {
  it('子どもの体で目を覚ます: 年齢が範囲内で、家族もそのぶん年上、最初の記録に書く', () => {
    for (let s = 1; s <= 50; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: { race: 'human', arrival: 'reborn', startAge: 'child', status: 'commoner' }, auto: true });
      expect(h.age).toBeGreaterThanOrEqual(5);
      expect(h.age).toBeLessThanOrEqual(8);
      expect(h.log[0].text).toMatch(new RegExp(`${h.age}歳の子どもの体で目を覚ました`));
      const mother = h.people.find((t) => t.role === 'mother')!;
      expect(mother.age - h.age).toBeGreaterThanOrEqual(16);
    }
  });
  it('エルフの十代は人間換算で13〜16歳 (実年齢 81〜100)', () => {
    const h = createHero({ seed: 2, world: { preset: 'medieval' }, hero: { race: 'elf', arrival: 'reborn', startAge: 'teen' }, auto: true });
    expect(h.age).toBeGreaterThanOrEqual(heqToAge(13, RACES.elf));
    expect(h.age).toBeLessThanOrEqual(heqToAge(16, RACES.elf));
  });
  it('召喚は大人 (17〜30歳) が既定、転生は生まれた時から', () => {
    for (let s = 1; s <= 50; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: { arrival: 'summoned' }, auto: true });
      expect(h.age).toBeGreaterThanOrEqual(17);
      expect(h.age).toBeLessThanOrEqual(30);
      expect(h.past!.age).toBe(h.age);
      expect(createHero({ seed: s, world: { preset: 'medieval' }, hero: { arrival: 'reborn' }, auto: true }).age).toBe(0);
    }
  });
});

// ---- 本物のデータ (src/data/traits/) の検査 ------------------------------------
describe('trait のデータ', () => {
  const all = ORIGINAL;
  const ids = new Map(all.map((t) => [t.id, t]));
  it('件数があり、id が重ならない', () => {
    expect(all.length).toBeGreaterThan(300); // 2026-10-09 時点 409件 (skills 194・gifts 215)
    expect(ids.size).toBe(all.length);
  });
  it('excl の相手が実在し、相互に書いてある', () => {
    const bad: string[] = [];
    for (const t of all) for (const e of t.excl ?? []) if (!ids.get(e)?.excl?.includes(t.id)) bad.push(`${t.id} → ${e}`);
    expect(bad).toEqual([]);
  });
  it('倍率・老い・コストの範囲 (死因 0.5〜2.0、老い 0.8〜1.3、弱点は負・ほかは1〜6)', () => {
    const bad: string[] = [];
    for (const t of all) {
      for (const [k, v] of Object.entries(t.mult ?? {})) if (v! < 0.5 || v! > 2) bad.push(`${t.id}.${k}=${v}`);
      if (t.aging !== undefined && (t.aging < 0.8 || t.aging > 1.3)) bad.push(`${t.id}.aging=${t.aging}`);
      if (t.kind === 'weakness' ? !(t.cost <= -1 && t.cost >= -4) : !(t.cost >= 1 && t.cost <= 6)) bad.push(`${t.id}.cost=${t.cost}`);
    }
    expect(bad).toEqual([]);
  });
  // 実測 (2026-10-09): 人間で選べる数は 227 (cyberpunk・space) 〜 295 (wa)。どの種族でも人間と同じ数 (種族限定の trait は人間以外に足される側)
  it('どの世界でも人間なら100件以上選べ、全 trait がどこかの世界・種族で選べる', () => {
    const reach = new Set<string>();
    for (const w of WORLD_IDS) {
      expect(availableTraits(WORLDS[w], 'human', all).length, w).toBeGreaterThanOrEqual(100);
      for (const r of RACE_IDS) for (const t of availableTraits(WORLDS[w], r, all)) reach.add(t.id);
    }
    expect(all.filter((t) => !reach.has(t.id)).map((t) => t.id)).toEqual([]);
  });
});

// おまかせの組み立て (traits と points を省略) で生きた人生の平均享年と、表の e0。
// 実測 (2026-10-09, 本物のデータ 409件, 現地の生まれ・人間・平民, 2000人): 表との差は -1.3 (academy) 〜 +2.8 (xianxia)。
// このうち組み立てで増えたぶんは -0.2 (frontier) 〜 +1.5年 (steampunk・desert) (何も持たない人生との差。xianxia は持たなくても +2.0)。±3年に収まるので重みは変えていない
describe('おまかせの組み立てでも、平均享年は表の e0 から大きく外れない', () => {
  for (const w of WORLD_IDS) {
    it(w, () => {
      useTraits(ORIGINAL);
      const N = 1500;
      const ages: number[] = [];
      for (let s = 1; s <= N; s++) ages.push(liveOut(createHero({ seed: s * 7919, world: { preset: w }, hero: { race: 'human', status: 'commoner', cheat: 'none', arrival: 'native' }, auto: true })).age + 0.5);
      const mean = ages.reduce((a, b) => a + b, 0) / N;
      const sd = Math.sqrt(ages.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
      // 許容幅 = 3 (DESIGN 2節のねらい) + 2 × 標本誤差
      expect(Math.abs(mean - TABLE_E0[w]), `平均 ${mean.toFixed(1)}`).toBeLessThan(3 + 2 * sd / Math.sqrt(N));
    }, 30_000);
  }
});

// 予算いっぱいに老いを遅らせる trait を重ねた組み立て (中世・人間・転生)。
// 実測 (2026-10-09): 重ねがけの上限なしでは老いの積 0.495・最長171歳・成人の平均享年 68.3。
// 上限 (老い 0.7倍まで) を入れて 最長132歳・成人の平均 59.2 (何も持たない人生は 最長99・成人の平均 53.0)。
// 病・魔物・暴力を下げる構成 (sk.palate ほか6つ) は病の積 0.38・疫病 0.26 で、平均享年 35.7・最長102
describe('強い組み立てでも極端にならない', () => {
  const LONG = ['gf.unlucky', 'gf.late-bloom', 'gf.elf-blood', 'gf.long-line', 'gf.strong-heart', 'gf.demigod-blood', 'gf.forest-spirit'];
  it('老いの重ねがけは 0.7倍で止まり、人間は150歳に届かない', () => {
    useTraits(ORIGINAL);
    expect(validateBuild(WORLDS.medieval, 'human', { traits: LONG, points: {} })).toEqual([]);
    let max = 0;
    for (let s = 1; s <= 1000; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'medieval' }, hero: { ...base, traits: LONG }, auto: true }));
      expect(agingOf(h)).toBeCloseTo(TRAIT_AGING_RANGE[0], 9);
      max = Math.max(max, h.age);
    }
    expect(max).toBeLessThan(150);
  }, 30_000);
});
