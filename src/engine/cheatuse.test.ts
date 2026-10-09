// 特典の使われ方・暮らしの経験・年齢の上限 (cheatuse.ts、life.ts の drift)
import { describe, expect, it } from 'vitest';
import { advanceYear, createHero, liveOut, CHEATS, CHEAT_IDS } from '.';
import { levelOf } from './bonds';
import { ageCap, AGE_CAPPED, heqOf } from './mortality';
import { CHEAT_USE } from '../data/cheatuse';

describe('特典を使う', () => {
  it('どの特典にも使った年の一文がある', () => {
    for (const c of CHEAT_IDS) expect(CHEAT_USE[c]?.length, c).toBeGreaterThan(0);
  });

  it('スキル強奪は、勝った相手から本当に技を奪う。テイムは勝った魔物を従魔にする', () => {
    let stolen = 0, familiars = 0;
    for (let s = 1; s <= 60; s++) {
      const a = liveOut(createHero({ seed: s, world: { preset: 'medieval' }, hero: { cheat: 'skill_steal' }, auto: true }));
      stolen += a.log.filter((e) => e.text.includes('〈スキル強奪〉で〈')).length;
      const b = liveOut(createHero({ seed: s, world: { preset: 'medieval' }, hero: { cheat: 'tamer' }, auto: true }));
      familiars += b.log.filter((e) => e.text.includes('〈テイム〉で従魔')).length;
    }
    expect(stolen).toBeGreaterThan(0);
    expect(familiars).toBeGreaterThan(0);
  });

  it('大人の10年に1回以上、特典の名が年表に出る (中世、各40人)', () => {
    for (const c of ['skill_steal', 'appraisal', 'gacha', 'poison_immunity'] as const) {
      if (!CHEATS[c]) continue;
      let lines = 0, decades = 0;
      for (let s = 1; s <= 40; s++) {
        const h = liveOut(createHero({ seed: s * 13, world: { preset: 'medieval' }, hero: { cheat: c, arrival: 'reborn' }, auto: true }));
        lines += h.log.filter((e) => e.age >= 16 && e.text.includes(CHEATS[c].name.ja)).length;
        decades += Math.max(0, h.age - 16) / 10;
      }
      expect(lines / decades, c).toBeGreaterThan(0.9);
    }
  });
});

describe('暮らしの経験と、年齢の上限', () => {
  it('戦わない職の人も、60歳ごろには表示のレベルが上がっている', () => {
    let n = 0, sum = 0;
    for (let s = 1; s <= 200 && n < 20; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: { race: 'human', cheat: 'none' }, auto: true });
      while (h.alive && h.age < 60) advanceYear(h);
      if (!h.alive || !h.job || ['adventurer', 'soldier', 'knight', 'mercenary'].includes(h.job)) continue;
      n++; sum += levelOf(h);
    }
    expect(n).toBeGreaterThan(5);
    expect(sum / n).toBeGreaterThan(8);
  });

  it('子どもの強さ・知恵と魔力・人望は、その年齢の上限を越えない', () => {
    for (let s = 1; s <= 200; s++) {
      const h = createHero({ seed: s, world: { preset: 'random' }, hero: { arrival: 'reborn', cheat: 'skill_steal', talent: 'magic' }, auto: true });
      while (h.alive && h.age < 8) advanceYear(h);
      if (!h.alive) continue;
      for (const k of AGE_CAPPED) expect(h.stats[k], `${s} ${k}`).toBeLessThanOrEqual(ageCap(heqOf(h)) + 1e-9);
    }
  });
});
