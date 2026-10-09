import { describe, it, expect } from 'vitest';
import { WORLDS, WORLD_IDS, TABLE_E0 } from './worlds';
import { RACES } from './races';
import { AGELESS_MAX, agingOf, baseHazards, deathChance, hazards, heq, lifeTableFor, stageAt, total } from './mortality';
import { createHero } from './hero';
import type { Hero, Setup } from './types';

const hero = (over: Partial<Setup['hero']> = {}, preset: Setup['world']['preset'] = 'medieval'): Hero =>
  createHero({ seed: 1, world: { preset }, hero: { race: 'human', status: 'commoner', cheat: 'none', arrival: 'native', ...over }, auto: true });

// 生命表の式 (research/03 の 6-1節) を自分で組み直したものが、5-3節の表の e0 を再現するか。
// 実測 (2026-10-09): 16の世界すべてで差は 0〜+0.2年 (dark 20.5 / postapoc 26.7 / xianxia 32.8 が +0.1〜0.2)。
// 違いは表が 15歳からゴンペルツ型に入るのに対し、こちらは成人 (16歳) まで ch を使うことによる
describe('世界の生命表が research/03 5-3節の e0 を再現する', () => {
  for (const id of WORLD_IDS) {
    it(id, () => {
      expect(Math.abs(lifeTableFor(WORLDS[id], 'human').e0 - TABLE_E0[id])).toBeLessThan(0.3);
    });
  }
});

describe('人間換算の年齢と段階', () => {
  it('人間は実年齢のまま、エルフは成人 (100歳) で16、その後は10年で1つ', () => {
    expect(heq(30, RACES.human)).toBe(30);
    expect(heq(50, RACES.elf)).toBe(8);
    expect(heq(100, RACES.elf)).toBe(16);
    expect(heq(200, RACES.elf)).toBe(26);
  });
  it('老いない特典 (aging 0) なら成人の年齢のまま', () => {
    expect(heq(500, RACES.human, 0)).toBe(16);
  });
  it('段階の境目', () => {
    expect([0, 3, 10, 16, 40, 60].map(stageAt)).toEqual(['infant', 'child', 'teen', 'adult', 'middle', 'elder']);
  });
});

describe('仙侠の修行の段階で老いが遅くなる', () => {
  it('築基 0.6 / 結丹 0.4 / 元嬰 0.25 / 天劫 0.15 (上の段階が勝つ)', () => {
    const h = hero({}, 'xianxia');
    h.age = 80;
    const at = () => heq(h.age, RACES.human, agingOf(h));
    expect(at()).toBe(80);
    const got: number[] = [];
    for (const f of ['ne.foundation', 'ne.core', 'ne.nascent', 'ne.ascend']) { h.flags[f] = 50; got.push(agingOf(h)); }
    expect(got).toEqual([0.6, 0.4, 0.25, 0.15]);
    expect(at()).toBeCloseTo(16 + 64 * 0.15, 10);
  });
});

describe('ハザードの形', () => {
  it('0〜4歳は乳幼児の分類だけ、成人後は老いが入る', () => {
    const w = WORLDS.medieval;
    const z0 = baseHazards(w, RACES.human, 0);
    expect(z0.infant).toBeCloseTo(-Math.log(1 - w.q0), 10);
    expect(total(z0)).toBeCloseTo(z0.infant, 10);
    expect(baseHazards(w, RACES.human, 40).age).toBeGreaterThan(0);
  });

  it('世界の max に達したら必ず亡くなる', () => {
    const h = hero();
    h.age = WORLDS.medieval.max;
    expect(deathChance(h)).toBe(1);
  });

  it('貴族の赤ん坊は平民より乳幼児の死が少ない (身分の倍率 0.7)', () => {
    expect(hazards(hero({ status: 'noble' })).infant / hazards(hero()).infant).toBeCloseTo(0.7, 5);
  });

  // 老化を遅らせる特典 (超再生・医療の知識) は人間換算の年齢が変わり、基準の値そのものが動くので、ここでは老化に触れない特典で比べる
  it('特典の倍率がそのままハザードにかかる (剣聖は魔物 0.7倍、状態異常無効は病 0.7倍)', () => {
    const plain = hero();
    const sword = hero({ cheat: 'sword_saint' });
    const immune = hero({ cheat: 'poison_immunity' });
    for (const h of [plain, sword, immune]) { h.age = 30; h.flags.adult = 30; }
    // 特典は目立つぶん (attention) 暴力が少し足されるので、魔物と病で比べる
    expect(hazards(sword).monster / hazards(plain).monster).toBeCloseTo(0.7, 5);
    expect(hazards(immune).disease / hazards(plain).disease).toBeCloseTo(0.7, 5);
  });

  it('冒険者は魔物のハザードが農民の4倍より大きい (倍率4 + ランクの上乗せ)', () => {
    const farmer = hero(), adv = hero();
    for (const h of [farmer, adv]) { h.age = 25; h.flags.adult = 16; }
    farmer.job = 'farmer'; adv.job = 'adventurer'; adv.rank = 'F';
    expect(hazards(adv).monster / hazards(farmer).monster).toBeGreaterThan(4);
  });
});

describe('不死の体でも種族の上限で亡くなる', () => {
  it('エルフも人間も1000歳を越えない (medieval seed 119 のエルフは以前 1793歳まで生きた)', async () => {
    const { liveOut } = await import('./life');
    const elf = liveOut(createHero({ seed: 119, world: { preset: 'medieval' }, hero: { race: 'elf', cheat: 'immortal_body', arrival: 'reborn' }, auto: true }));
    expect(elf.alive).toBe(false);
    expect(elf.age).toBeLessThanOrEqual(RACES.elf.maxAge);
    // 千年に届いて亡くなった人は、老衰ではなく自分で選んだ終わり (d.age-rest)
    if (elf.death!.hazard === 'age') expect(elf.death!.id).toBe('d.age-rest');
    let rest = 0;
    for (let s = 1; s <= 40; s++) {
      const h = liveOut(createHero({ seed: s, world: { preset: 'medieval' }, hero: { race: 'human', cheat: 'immortal_body', arrival: 'reborn' }, auto: true }));
      expect(h.age).toBeLessThanOrEqual(AGELESS_MAX);
      if (h.age >= AGELESS_MAX) { rest++; expect(h.death!.id).toBe('d.age-rest'); }
    }
    // 実測 (2026-10-09、鍛える選択を入れた後): 不死の人間200人のうち千年に届くのは10人。40人までなら seed 32 の1人
    expect(rest).toBeGreaterThan(0);
  });
});
