// ステータス画面の値 (meta/sheet.ts): 主人公から読むだけで、人生を変えない
import { describe, expect, it } from 'vitest';
import { createHero, liveOut, toSaved, WORLDS, WORLD_IDS } from '../engine';
import { hpOf, killsOf, mpOf, sheetOf } from './sheet';

const life = (seed: number, hero = {}, world: (typeof WORLD_IDS)[number] | 'random' = 'random') => liveOut(createHero({ seed, world: { preset: world }, hero, auto: true }));

describe('ステータス画面', () => {
  it('読んでも人生は変わらない (乱数も引かない)', () => {
    for (let s = 1; s <= 20; s++) {
      const h = life(s);
      const before = JSON.stringify(toSaved(h));
      sheetOf(h);
      expect(JSON.stringify(toSaved(h))).toBe(before);
    }
  });

  it('HP: 今は最大以下、亡くなった人は 0。超再生は同じ能力でも最大が大きい', () => {
    const h = createHero({ seed: 4, world: { preset: 'medieval' }, hero: { cheat: 'none' } });
    const r = createHero({ seed: 4, world: { preset: 'medieval' }, hero: { cheat: 'regeneration' } });
    r.stats = { ...h.stats }; r.level = h.level;
    expect(hpOf(h).now).toBeLessThanOrEqual(hpOf(h).max);
    expect(hpOf(r).max).toBeGreaterThan(hpOf(h).max);
    expect(hpOf(life(4)).now).toBe(0);
  });

  it('MP: 魔法の無い世界には無く、無限の魔力は尽きない', () => {
    const none = WORLD_IDS.find((w) => WORLDS[w].magic === 0)!;
    expect(mpOf(createHero({ seed: 1, world: { preset: none }, hero: {} }))).toBeNull();
    expect(mpOf(createHero({ seed: 1, world: { preset: 'medieval' }, hero: { cheat: 'infinite_mana' } }))).toEqual({ max: null });
    expect(mpOf(createHero({ seed: 1, world: { preset: 'medieval' }, hero: { cheat: 'none' } }))!.max).toBeGreaterThan(0);
  });

  it('倒した相手は戦いの記録と数が合い、いちばんの強敵はその中で最も危険なもの', () => {
    let checked = 0;
    for (let s = 1; s <= 200 && checked < 20; s++) {
      const h = life(s, { cheat: 'sword_saint' }, 'medieval');
      const fights = h.log.filter((e) => e.fight);
      if (!fights.length) continue;
      checked++;
      const { kills, battles } = killsOf(h);
      expect(battles.won + battles.hurt + battles.lost).toBe(fights.length);
      expect(kills.reduce((n, k) => n + k.n, 0)).toBe(battles.won + battles.hurt);
      const sh = sheetOf(h);
      if (kills.length) expect(sh.strongest!.danger).toBe(Math.max(...kills.map((k) => k.danger)));
    }
    expect(checked).toBeGreaterThan(5);
  });
});
