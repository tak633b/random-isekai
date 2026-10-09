// お金 (econ.ts): 世界ごとの書き方、暮らし向きとの対応、借金と取り立て、遺産、作戦での選び方
import { describe, expect, it } from 'vitest';
import { advanceYear, createHero } from '.';
import { addGold, COIN, econByRef, econYear, formatGold } from './econ';
import { bump } from './bonds';
import { standingOf } from './status';
import { MONEY } from '../data/money';
import { WORLD_IDS } from './worlds';

describe('お金', () => {
  it('世界ごとの書き方 (上の2つの単位まで、借金は「借金」)', () => {
    expect(formatGold('medieval', 12345)).toBe('1金貨23銀貨');
    expect(formatGold('game', 12345)).toBe('12,345G');
    expect(formatGold('wa', 12345)).toBe('12両1,380文');
    expect(formatGold('modern', 12345)).toBe('246万円');
    expect(formatGold('medieval', -500)).toBe('借金 5銀貨');
    for (const w of WORLD_IDS) expect(MONEY[w], w).toBeDefined(); // 16の世界すべてにお金がある
  });

  it('暮らし向きの増減はお金の増減で、暮らし向きはお金から決まる (0〜100)', () => {
    const h = createHero({ seed: 1, world: { preset: 'medieval' }, hero: { status: 'commoner' } });
    expect(h.gold).toBe(Math.round(h.stats.wealth * COIN));
    const g = h.gold!;
    bump(h, { wealth: 5 });
    expect(h.gold).toBe(g + 5 * COIN);
    addGold(h, -h.gold! - 1000);
    expect(h.gold).toBe(-1000);
    expect(h.stats.wealth).toBe(0);
  });

  it('深い借金は取り立てに: 平民は借金奴隷になり、身分の歩みに残る', () => {
    let slaved = 0;
    for (let s = 1; s <= 20; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: { status: 'commoner' }, auto: true });
      h.age = 30;
      addGold(h, -h.gold! - 80 * COIN);
      for (let y = 0; y < 10 && h.alive && standingOf(h) !== 'slave'; y++) econYear(h);
      if (standingOf(h) === 'slave') { slaved++; expect(h.flags.debtSlave).toBeDefined(); expect(h.gold).toBe(0); }
    }
    expect(slaved).toBeGreaterThan(0);
  });

  it('利息は1年に上限がある (働けない人の借金が際限なくふくらまない)', () => {
    const h = createHero({ seed: 2, world: { preset: 'medieval' }, hero: {}, auto: true });
    addGold(h, -h.gold! - 20 * COIN);
    const before = h.gold!;
    econYear(h);
    expect(before - h.gold!).toBeLessThanOrEqual(1.5 * COIN + 1e-9);
  });

  it('親が亡くなった年に遺産を受け継ぐ (二度は受け取らない)', () => {
    const h = createHero({ seed: 3, world: { preset: 'medieval' }, hero: { status: 'merchant' }, auto: true });
    const mom = h.people.find((t) => t.role === 'mother')!;
    h.age = 40; mom.age = 70; mom.alive = false; mom.diedAt = 40;
    const g = h.gold!;
    econYear(h);
    expect(h.gold!).toBeGreaterThan(g * 0.9);
    expect(h.flags[`inh.${mom.id}`]).toBe(40);
    expect(h.log.at(-1)!.text).toContain(mom.name);
  });

  it('病の治療: いのちだいじには良い治療、ガンガンいこうぜは寝て治す。保存から同じ選択肢で戻る', () => {
    const h = createHero({ seed: 4, world: { preset: 'xianxia' }, hero: {}, policy: 'careful' });
    const d = econByRef(h, 'sick:disease')!;
    expect(d.options[0].label).toContain('九転還魂丹');
    expect(d.auto(h)).toBe(0);
    expect(d.auto({ ...h, policy: 'bold' })).toBe(2);
    d.options[0].apply(h);
    expect(h.sick!.k).toBe(0.5);
  });

  it('同じ seed は同じお金の一生', () => {
    const run = () => { const h = createHero({ seed: 77, world: { preset: 'random' }, hero: {}, auto: true }); for (let y = 0; y < 80 && h.alive; y++) advanceYear(h); return [h.gold, h.gear, JSON.stringify(h.ledger)]; };
    expect(run()).toEqual(run());
  });
});
