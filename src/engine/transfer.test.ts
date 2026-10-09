// 異世界転移 (transfer.ts と hero.ts の summoned): 元の世界の名前・年齢・仕事・持ち物、来かた、帰るという終わり方
import { describe, expect, it } from 'vitest';
import { advanceYear, createHero, liveOut, toSaved, WORLDS, WORLD_IDS } from '.';

const transfers = (n: number, world: 'random' | (typeof WORLD_IDS)[number] = 'random') => {
  const out = [];
  for (let s = 1; out.length < n && s < 20000; s++) {
    const h = createHero({ seed: s, world: { preset: world }, hero: {} });
    if (h.arrival === 'summoned') out.push(h);
  }
  return out;
};

describe('異世界転移', () => {
  it('元の世界の名前・年齢 (15〜45)・仕事・持ち物で来て、来かたと持ち物と仕事がしるしになる', () => {
    for (const h of transfers(200)) {
      const t = h.transfer!;
      expect(h.name).toMatch(/^\S+ \S+$/); // 姓 名 (英語は 名 姓)
      expect(h.age).toBeGreaterThanOrEqual(15);
      expect(h.age).toBeLessThanOrEqual(45);
      expect(h.race).toBe('human');
      expect(h.cheat).not.toBeNull();
      expect(t.items.length).toBeGreaterThan(0);
      expect(h.flags[`tr.${t.how}`]).toBe(h.age);
      for (const it of t.items) expect(h.flags[`item.${it}`]).toBe(h.age);
      expect(Object.keys(h.flags).some((k) => k.startsWith('earth.'))).toBe(true);
      expect(h.log[0].text).toContain(h.given);
      expect(h.people.some((p) => p.role === 'mother' || p.role === 'father')).toBe(false);
      // 魔法の無い世界には召喚の陣が無い: 角を曲がるか、教室ごと
      if (h.world.magic === 0) expect(['vanish', 'class']).toContain(t.how);
    }
  });

  it('埋めた後の設定で生き直しても、同じ人が来る (何回も試す・同じ設定でもう一度)', () => {
    for (const h of transfers(30)) {
      const again = createHero(h.setup);
      expect([again.name, again.age, JSON.stringify(again.transfer)]).toEqual([h.name, h.age, JSON.stringify(h.transfer)]);
      const a = liveOut(createHero(h.setup)), b = liveOut(createHero(h.setup));
      expect(JSON.stringify(toSaved(a))).toBe(JSON.stringify(toSaved(b)));
    }
  });

  it('「帰る」を選んだ年に一生が終わる。死ではなく return で、死の取り消しも効かない', () => {
    const h = createHero({ seed: 3, world: { preset: 'medieval' }, hero: { arrival: 'summoned', cheat: 'return_by_death' }, auto: true });
    expect(h.revives).toBeGreaterThan(0);
    h.flags.goHome = h.age;
    advanceYear(h);
    expect(h.alive).toBe(false);
    expect(h.death!.hazard).toBe('return');
    expect(h.death!.text.length).toBeGreaterThan(10);
  });

  it('3000人のおまかせで: 転移はおよそ2割、帰るのは転移した人の数%', () => {
    let n = 0, home = 0;
    for (let s = 1; s <= 3000; s++) {
      const h = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      if (h.arrival !== 'summoned') continue;
      n++;
      if (h.death?.hazard === 'return') home++;
    }
    // 測った値 (2026-10-09): 転移 617人、うち帰った 23人 (3.7%)
    expect(n / 3000).toBeGreaterThan(0.15);
    expect(n / 3000).toBeLessThan(0.25);
    expect(home).toBeGreaterThan(0);
    expect(home / n).toBeLessThan(0.08);
  });

  it('魔法の無い世界がデータにある (上の確かめが空振りしないように)', () => {
    expect(WORLD_IDS.some((w) => WORLDS[w].magic === 0)).toBe(true);
  });
});
