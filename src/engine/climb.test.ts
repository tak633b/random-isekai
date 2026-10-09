// 成り上がりと没落 (climb.ts と training.ts の climb)。身分は生まれ (status) のまま、今の身分 (standing) が変わる
import { describe, expect, it } from 'vitest';
import { advanceYear, createHero, liveOut } from '.';
import { allRoutes, fortuneYear, routesFor, setStanding } from './climb';
import { standingOf, statusRank } from './status';
import { factsOf } from '../meta/facts';

describe('成り上がり', () => {
  it('身分が変わると、生まれはそのままで、歩みと年表の一文が残る', () => {
    const h = createHero({ seed: 1, world: { preset: 'medieval' }, hero: { status: 'slave' }, auto: true });
    setStanding(h, 'poor', 'テスト。');
    setStanding(h, 'commoner', 'テスト。');
    expect(h.status).toBe('slave');
    expect(standingOf(h)).toBe('commoner');
    expect(h.climb!.map((c) => [c.from, c.to])).toEqual([['slave', 'poor'], ['poor', 'commoner']]);
    expect(h.log.at(-1)!.text).toMatch(/→/);
    const f = factsOf(h, true);
    expect([f.standing, f.rose, f.fell]).toEqual(['commoner', 2, false]);
  });

  it('騎士のしるしはその年だけ身分を上げる。暮らしが尽きると落ち、昔のしるしでは戻らない', () => {
    const h = createHero({ seed: 2, world: { preset: 'medieval' }, hero: { status: 'commoner' }, auto: true });
    h.age = 25;
    h.flags.knighted = 25;
    fortuneYear(h);
    expect(standingOf(h)).toBe('gentry');
    h.age = 30;
    h.stats.wealth = 3;
    fortuneYear(h);
    expect(standingOf(h)).toBe('poor');
    expect(h.flags.fallen).toBe(30);
    h.age = 31;
    h.stats.wealth = 50;
    fortuneYear(h);
    expect(standingOf(h)).toBe('poor'); // knighted は25歳のしるし
    expect(routesFor(h).some((r) => r.id === 'c.restore')).toBe(true); // 再興の道が開く
  });

  it('自分を買い戻す道を選ぶと、数年で奴隷から自由になる', () => {
    const h = createHero({ seed: 3, world: { preset: 'medieval' }, hero: { status: 'slave' }, auto: true });
    h.age = 20; h.stats.wealth = 60;
    h.train = { kind: 'climb', id: 'c.buy-freedom', since: 19, step: 3, prog: 0 };
    for (let y = 0; y < 30 && h.alive && standingOf(h) === 'slave'; y++) advanceYear(h);
    if (!h.alive) return;
    expect(standingOf(h)).not.toBe('slave');
  });

  it('道のデータ: id が重ならず、どれも上の身分へ行く', () => {
    const rs = allRoutes();
    expect(new Set(rs.map((r) => r.id)).size).toBe(rs.length);
    for (const r of rs) for (const f of r.from) expect(statusRank(r.to), r.id).toBeGreaterThan(statusRank(f));
  });

  it('3000人のおまかせで: 身分が上がる人は1〜3割、没落する人もいる。同じ seed は同じ歩み', () => {
    let rose = 0, fell = 0;
    for (let s = 1; s <= 3000; s++) {
      const h = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      const c = h.climb ?? [];
      if (c.some((x) => statusRank(x.to) > statusRank(x.from))) rose++;
      if (c.some((x) => statusRank(x.to) < statusRank(x.from))) fell++;
    }
    // 測った値 (2026-10-09): 上がった 474人 (16%)、落ちた 13人
    expect(rose / 3000).toBeGreaterThan(0.08);
    expect(rose / 3000).toBeLessThan(0.3);
    expect(fell).toBeGreaterThan(0);
    const a = liveOut(createHero({ seed: 80, world: { preset: 'random' }, hero: {}, auto: true }));
    const b = liveOut(createHero({ seed: 80, world: { preset: 'random' }, hero: {}, auto: true }));
    expect(JSON.stringify(a.climb)).toBe(JSON.stringify(b.climb));
  });
});
