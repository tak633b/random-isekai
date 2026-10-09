import { describe, it, expect } from 'vitest';
import { createHero } from './hero';
import { fromSaved, highlights, liveOut, toSaved } from './life';
import { bornAtOf, lifeOfSpec, lifeOfTie, otherHero, tieSpec, worldTimeline } from './others';
import type { Hero, Tie } from './types';

const lives: Hero[] = Array.from({ length: 60 }, (_, i) => liveOut(createHero({ seed: (i + 1) * 7919, world: { preset: 'random' }, hero: {}, auto: true })));

describe('輪の人の一生は錨と矛盾しない', () => {
  it('亡くなった人はその年にその死因で、生きている人はそれより前に死なない', () => {
    let dead = 0, alive = 0;
    for (const h of lives) for (const t of h.people) {
      const spec = tieSpec(h, t);
      const o = lifeOfTie(h, t.id);
      if (!t.alive) {
        dead++;
        expect(o.ageAtDeath, `${h.seed} ${t.role}`).toBe(t.age);
        expect(o.death!.hazard).toBe(spec.anchors!.deathAt!.hazard);
        expect(o.diedAt).toBe(t.diedAt);
      } else {
        alive++;
        if (o.ageAtDeath !== undefined) expect(o.ageAtDeath).toBeGreaterThanOrEqual(t.age);
      }
    }
    expect(dead).toBeGreaterThan(100);
    expect(alive).toBeGreaterThan(100);
  });

  it('連れ合いの一生では主人公と一度だけ結婚し、その間にほかの連れ合いはいない。主人公との子は同じ名前・同じ生年', () => {
    let n = 0, kids = 0;
    for (const h of lives) for (const t of h.people.filter((x) => x.role === 'spouse')) {
      n++;
      const o = otherHero(h, tieSpec(h, t));
      const spouses = o.people.filter((x) => x.role === 'spouse');
      expect(spouses.map((x) => x.name)).toEqual([h.given]);
      for (const c of h.people.filter((x) => x.role === 'child')) {
        const b = bornAtOf(h, c);
        const mine = o.people.find((x) => x.role === 'child' && x.name === c.name);
        if (!mine) continue; // その連れ合いのいなかった間の子
        kids++;
        // その人の年表で生まれた年 (その人の年齢) = 主人公の年表で生まれた年 − その人の生年
        const born = o.log.find((e) => e.join?.includes(mine.id))!;
        expect(born.age + bornAtOf(h, t)).toBe(b);
      }
    }
    expect(n).toBeGreaterThan(10);
    expect(kids).toBeGreaterThan(5);
  });

  it('主人公と共有した出来事が、その人の年表のその人の年齢に入っている', () => {
    let n = 0;
    for (const h of lives) for (const t of h.people) {
      const o = lifeOfTie(h, t.id);
      const b = bornAtOf(h, t);
      for (const e of h.log) {
        if (!e.who?.includes(t.id) || e.kind === 'love' || e.kind === 'family' || (e.leave?.includes(t.id) && !t.alive)) continue;
        n++;
        expect(o.log.some((x) => x.age === e.age - b && x.text.includes(e.text)), `${t.role} ${e.text}`).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(200);
  });

  it('きょうだいの親は主人公と同じ親', () => {
    let n = 0;
    for (const h of lives) {
      const mom = h.people.find((x) => x.role === 'mother'), dad = h.people.find((x) => x.role === 'father');
      for (const t of h.people.filter((x) => x.role === 'sibling')) {
        const o = otherHero(h, tieSpec(h, t));
        if (mom) { n++; expect(o.people.find((x) => x.role === 'mother')?.name).toBe(mom.name); }
        if (dad) expect(o.people.find((x) => x.role === 'father')?.name).toBe(dad.name);
      }
    }
    expect(n).toBeGreaterThan(20);
  });
});

describe('同じ入力なら同じ一生、主人公は変わらない', () => {
  it('作り直しても同じで、主人公の乱数と年表は変わらない', () => {
    for (const h of lives.slice(0, 20)) {
      const before = JSON.stringify(toSaved(h));
      const a = h.people.map((t) => JSON.stringify(lifeOfTie(h, t.id)));
      const again = liveOut(createHero(h.setup));
      const b = again.people.map((t) => JSON.stringify(lifeOfTie(again, t.id)));
      expect(b).toEqual(a);
      expect(JSON.stringify(toSaved(h))).toBe(before);
    }
  });
});

// 実測 (2026-10-09, おまかせの人生40本の輪の人376人): 1人分の一生を作るのに平均 1.7ミリ秒
describe('世界の年ごとの様子', () => {
  it('主人公の記録と矛盾しない (戦争・大疫病・飢饉・魔王の始まりの年)', () => {
    let n = 0;
    for (const h of lives) {
      const tl = worldTimeline(h);
      const at = (x: number) => tl.find((y) => y.at === x)!;
      for (const e of h.log) {
        if (/^戦争が始まった/.test(e.text)) { n++; expect(at(e.age).war).toBe(true); }
        if (/^大疫病が/.test(e.text)) { n++; expect(at(e.age).plague).toBe(true); }
        if (/^飢饉の年になった/.test(e.text)) { n++; expect(at(e.age).famine).toBe(true); }
        if (/^(魔王が現れた|鬼の王が山から|魔尊が封印を)/.test(e.text)) { n++; expect(at(e.age).demonKing).toBe(true); }
      }
      // 生まれる前と亡くなった後も、隙間なく並ぶ
      for (let i = 1; i < tl.length; i++) expect(tl[i].at).toBe(tl[i - 1].at + 1);
      expect(tl[0].at).toBe((h.log[0]?.age ?? 0) - 60);
    }
    expect(n).toBeGreaterThan(50);
  });
  it('1人分の一生は数ミリ秒〜数十ミリ秒で作れる', () => {
    let n = 0;
    const t0 = performance.now();
    for (const h of lives.slice(0, 10)) for (const t of h.people) { otherHero(h, tieSpec(h, t)); n++; }
    expect((performance.now() - t0) / n).toBeLessThan(50);
  });
});

// 連れ合いと恋人・婚約者の期間 (主人公の年齢で [輪に入った年, 離れた年か亡くなった年か今)) が重ならない。主人公の一生と、輪の人の一生の両方で
describe('連れ合いと恋人', () => {
  const span = (h: Hero, t: Tie): [number, number] => [t.since, t.until ?? t.diedAt ?? h.age + 1];
  // 連れ合いの期間は結婚した年から (恋人・婚約者から連れ合いになった人は、それまで since が早い)
  const wed = (h: Hero, t: Tie) => h.log.find((e) => e.kind === 'love' && e.who?.includes(t.id) && /結婚|Married|married/.test(e.text))?.age ?? t.since;
  const check = (h: Hero) => {
    const sp = h.people.filter((t) => t.role === 'spouse').map((t) => [wed(h, t), span(h, t)[1]] as [number, number]);
    for (const t of h.people.filter((x) => x.role === 'lover' || x.role === 'fiance')) {
      const [a, b] = span(h, t);
      for (const [c, d] of sp) expect(a < d && c < b && !(a === c), `${t.name} ${a}-${b} / 連れ合い ${c}-${d}`).toBe(false);
    }
    return sp.length;
  };
  it('主人公の一生で重ならない', () => {
    let n = 0;
    for (const h of lives) n += check(h);
    expect(n).toBeGreaterThan(20);
  });
  it('輪の人の一生でも重ならない', () => {
    for (const h of lives.slice(0, 30)) for (const t of h.people) check(otherHero(h, tieSpec(h, t)));
  });
});

describe('主な出来事', () => {
  it('40歳以上まで生きた人生では、20歳未満の記録も入る (新しい順だけに偏らない)', () => {
    let n = 0;
    for (const h of lives.filter((x) => x.age >= 40 && (x.log[0]?.age ?? 0) < 20)) {
      n++;
      const hl = highlights(h);
      expect(hl.length).toBeGreaterThan(0);
      expect(hl.length).toBeLessThanOrEqual(10);
      expect(hl.some((e) => e.age < 20), `${h.world.id} ${h.age}`).toBe(true);
    }
    expect(n).toBeGreaterThan(10);
  });
});

describe('転生者の記録と召喚された人', () => {
  it('Hero.reinc は保存して戻しても残る', () => {
    const h = lives.find((x) => x.reinc && (x.reinc.heard.length || x.reinc.met.length))!;
    expect(h).toBeTruthy();
    expect(fromSaved(JSON.parse(JSON.stringify(toSaved(h)))).reinc).toEqual(h.reinc);
  });
  it('arriveAge を渡すと、その人の年表はその年齢から始まる', () => {
    const h = lives[0];
    const o = lifeOfSpec(h, { key: 'r:x', seed: 12345, race: 'human', sex: 'F', status: 'commoner', bornAt: -25, arriveAge: 25, arrival: 'summoned' });
    expect(o.log[0].age).toBe(25);
    expect(o.log.every((e) => e.age >= 25)).toBe(true);
  });
});

describe('共有の印', () => {
  it('輪の人の年表で、主人公と共有した行 (共有の出来事・主人公との結婚と子・主人公の死) に shared が付く', () => {
    let marked = 0, anchors = 0;
    for (const h of lives.slice(0, 30)) for (const t of h.people) {
      const spec = tieSpec(h, t);
      const o = lifeOfTie(h, t.id);
      const n = o.log.filter((e) => e.shared).length;
      const want = (spec.anchors?.shared?.length ?? 0) + (spec.anchors?.marry?.withHero ? 1 : 0) + (spec.anchors?.children ?? []).filter((c) => c.withHero).length;
      expect(n, `${t.role}`).toBeGreaterThanOrEqual(Math.min(want, 1));
      marked += n; anchors += spec.anchors?.shared?.length ?? 0;
    }
    expect(marked).toBeGreaterThanOrEqual(anchors * 0.9);
  });
});

describe('輪にいた間の職業と強さ', () => {
  it('主人公の死 (かその人の死・離れた時) の時点で、職業は Tie.job のまま、level は人物像の level を超えない', () => {
    let n = 0, held = 0;
    for (const h of lives) for (const t of h.people) {
      const spec = tieSpec(h, t);
      const end = spec.anchors!.holdUntil!;
      if (end < 0) continue;
      // その時点までだけ生きる (その後は職業もレベルも変わってよい)
      const o = otherHero(h, { ...spec, maxYears: end });
      n++;
      expect(o.job, `${t.role} ${t.name} ${end}`).toBe(t.job ?? null);
      if (t.profile) { held++; expect(o.level).toBeLessThanOrEqual(t.profile.level); }
    }
    expect(n).toBeGreaterThan(300);
    expect(held).toBeGreaterThan(300);
  });
});
