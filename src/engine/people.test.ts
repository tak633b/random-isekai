import { describe, it, expect } from 'vitest';
import { createHero } from './hero';
import { advanceYear, fromSaved, toSaved } from './life';
import { addTie } from './bonds';
import { alliesFor, ensureProfile, fateLine, isPeopleEntry, peopleYear, LEAVE_P, PEOPLE } from './people';
import type { Hero, Setup, WorldId } from './types';

// 年表を比べるとき、人物像の行と、戦いに加わった人を除く。一緒に戦う人 (alliesFor) は強さの順で並ぶので、
// 人物像を入れると allies の並びと「〜と並んで戦に出た」の名が変わる。戦いの行は文も外し、相手と結果だけを比べる
const core = (h: Hero) => JSON.stringify(h.log.filter((e) => !isPeopleEntry(e))
  .map((e) => (e.fight ? { ...e, text: '', fight: { ...e.fight, allies: undefined } } : e)));

const setup = (seed: number, preset: WorldId | 'random' = 'random'): Setup => ({ seed, world: { preset }, hero: {}, auto: true });

// life.ts の advanceYear が毎年 peopleYear を呼ぶ。people = false なら止めて生きる (人物像を入れない人生)
function live(h: Hero, people = true, max = 4000): Hero {
  PEOPLE.on = people;
  try { for (let i = 0; i < max && h.alive; i++) advanceYear(h); } finally { PEOPLE.on = true; }
  return h;
}

describe('ensureProfile', () => {
  it('生まれた時の家族にも新しく入った人にも付き、何度呼んでも変わらない', () => {
    for (let s = 1; s <= 200; s++) {
      const h = live(createHero(setup(s)), true, 60);
      for (const t of h.people) {
        expect(t.profile).toBeTruthy();
        const before = JSON.stringify(t.profile);
        ensureProfile(h, t);
        expect(JSON.stringify(t.profile)).toBe(before);
      }
    }
  });

  it('古いセーブ (profile が無い) でも、作り直すと同じ人物像になる', () => {
    const h = createHero(setup(42));
    for (const t of h.people) {
      const p = JSON.stringify(t.profile);
      delete t.profile;
      ensureProfile(h, t);
      expect(JSON.stringify(t.profile)).toBe(p);
    }
  });
});

describe('同じ seed', () => {
  it('人物像も同じになる', () => {
    for (let s = 1; s <= 30; s++) {
      const a = live(createHero(setup(s)));
      const b = live(createHero(setup(s)));
      expect(JSON.stringify(a.people)).toBe(JSON.stringify(b.people));
    }
  });
});

describe('主人公の乱数の並びを変えない', () => {
  it('peopleYear・alliesFor・fateLine は h.rng を引かない', () => {
    for (let s = 1; s <= 100; s++) {
      const h = createHero(setup(s));
      for (let i = 0; i < 120 && h.alive; i++) {
        advanceYear(h);
        const st = h.rng.state;
        // 何度呼んでも乱数は変わらない (呼ぶと1年ぶん余計に進むが、ここでは乱数だけを見る)
        peopleYear(h);
        alliesFor(h);
        for (const t of h.people) fateLine(h, t);
        expect(h.rng.state).toBe(st);
      }
    }
  });

  // 旅立ち (until) はそばにいる顔ぶれを変えるので、その年から後の出来事の候補が変わりうる。
  // そこで、最初の旅立ちの年までは乱数の並びと年表 (人物像の行を除く) が年ごとに同じことを確かめる
  it('最初の旅立ちまでは、入れない人生と年ごとに同じ', () => {
    for (let s = 1; s <= 300; s++) {
      const a = createHero(setup(s));
      const b = createHero(setup(s));
      for (let i = 0; i < 400 && a.alive; i++) {
        PEOPLE.on = false; advanceYear(a); PEOPLE.on = true;
        advanceYear(b);
        if (b.people.some((t) => t.until !== undefined)) break;
        expect(b.rng.state).toBe(a.rng.state);
        expect(b.alive).toBe(a.alive);
        expect(core(b)).toBe(core(a));
      }
    }
  });

  it('旅立ちを止めると、一生を通して同じ', () => {
    const saved = { ...LEAVE_P };
    for (const k of Object.keys(LEAVE_P)) delete LEAVE_P[k as keyof typeof LEAVE_P];
    try {
      for (let s = 1; s <= 300; s++) {
        const a = live(createHero(setup(s)), false);
        const b = live(createHero(setup(s)));
        expect(b.rng.state).toBe(a.rng.state);
        expect(b.age).toBe(a.age);
        expect(core(b)).toBe(core(a));
      }
    } finally { Object.assign(LEAVE_P, saved); }
  });

  // 旅立ちを入れたままだと、一生のうちにどこかで出来事の並びが変わる人生がある。
  // 旅立ちは同じ役のもっと近い人がそばに残るときだけにしてある (byRole と、そばにいる役の顔ぶれが変わらない)。
  // 実測 (2026-10-09, seed 1〜1000, 世界おまかせ): 享年か死因が変わったのは 14人。この制限が無いと 146人だった
  it('旅立ちで享年・死因が変わる人生は少ない', () => {
    let changed = 0;
    for (let s = 1; s <= 1000; s++) {
      const a = live(createHero(setup(s)), false);
      const b = live(createHero(setup(s)));
      if (a.age !== b.age || a.death?.id !== b.death?.id) changed++;
    }
    console.log(`享年か死因が変わった人生: ${changed}/1000`);
    expect(changed).toBeLessThan(40);
  });
});

describe('alliesFor', () => {
  it('生きていて離れていない人だけ、多くて3人', () => {
    let seen = 0;
    for (let s = 1; s <= 300; s++) {
      const h = createHero(setup(s));
      for (let i = 0; i < 200 && h.alive; i++) {
        advanceYear(h);
        const a = alliesFor(h);
        expect(a.length).toBeLessThanOrEqual(3);
        for (const t of a) { expect(t.alive).toBe(true); expect(t.until).toBeUndefined(); }
        seen += a.length;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('亡くなった人・離れた人は入らない', () => {
    const h = createHero(setup(3));
    h.age = 20;
    const a = addTie(h, { name: 'A', role: 'companion', race: 'human', sex: 'F', age: 20 });
    const b = addTie(h, { name: 'B', role: 'companion', race: 'human', sex: 'M', age: 20 });
    const c = addTie(h, { name: 'C', role: 'mentor', race: 'human', sex: 'M', age: 45 });
    addTie(h, { name: 'D', role: 'disciple', race: 'human', sex: 'F', age: 18 });
    addTie(h, { name: 'E', role: 'familiar', race: 'beast_wolf', sex: 'F', age: 3 });
    expect(alliesFor(h).length).toBe(3);
    a.alive = false; b.until = 20; c.alive = false;
    expect(alliesFor(h).map((t) => t.name).sort()).toEqual(['D', 'E']);
  });
});

describe('仲間の level', () => {
  it('一緒に過ごすと上がる', () => {
    const h = createHero(setup(11));
    h.age = 20;
    const t = addTie(h, { name: 'A', role: 'companion', race: 'human', sex: 'F', age: 20, bond: 90 });
    const lv0 = t.profile!.level;
    for (let i = 0; i < 10; i++) { h.age++; t.age++; peopleYear(h); }
    // 実測 (seed 11): 10年で lv0 → lv0 + 7 前後 (年 0.7)。旅立てば止まるので、上がったことだけを見る
    expect(t.profile!.level).toBeGreaterThan(lv0);
  });
});

describe('fateLine', () => {
  it('亡くなった人には死因と年が入る', () => {
    let n = 0;
    for (let s = 1; s <= 200; s++) {
      const h = live(createHero(setup(s)), true, 80);
      for (const t of h.people.filter((x) => !x.alive)) {
        const f = fateLine(h, t);
        expect(f).toMatch(/亡くなった|息を引き取った|倒れた|命を落とした/);
        expect(f).toContain(`${t.age}歳`);
        n++;
      }
    }
    expect(n).toBeGreaterThan(0);
  });

  it('出産で亡くなった連れ合いは、その死因になる', () => {
    const h = createHero(setup(5));
    h.age = 25;
    const t = addTie(h, { name: 'S', role: 'spouse', race: 'human', sex: 'F', age: 25 });
    t.alive = false; t.diedAt = 25;
    h.log.push({ age: 25, text: 'Sは出産で亡くなった。', kind: 'loss', who: [t.id], leave: [t.id] });
    expect(fateLine(h, t)).toContain('出産で亡くなった');
  });
});

describe('主人公の年表に足される行', () => {
  // 実測 (2026-10-09, seed 1〜1000, 世界おまかせ, 成人まで生きた 731人): 平均 4.59件、中央 3、9割が 12件以下、最多 16件 (LOG_MAX 15 + 旅立ち)。
  // 旅立ちは成人1人の人生あたり 0.14人
  it('1人の人生で数件〜十数件', () => {
    const N = 1000;
    let total = 0, max = 0, adults = 0;
    for (let s = 1; s <= N; s++) {
      const h = live(createHero(setup(s)));
      const n = h.log.filter(isPeopleEntry).length;
      if (h.age >= 16) { total += n; adults++; max = Math.max(max, n); }
    }
    const mean = total / adults;
    console.log(`成人まで生きた ${adults}人: 平均 ${mean.toFixed(2)}件、最多 ${max}件`);
    expect(mean).toBeGreaterThan(2);
    expect(mean).toBeLessThan(8);
    expect(max).toBeLessThanOrEqual(20);
  });
});

describe('保存と再開', () => {
  it('何歳で保存しても、そのあとの年表と人物像が一致する', () => {
    let checked = 0;
    for (let s = 1; s <= 120; s++) {
      for (const at of [3, 18, 30, 52, 66, 90]) {
        const a = createHero(setup(s));
        for (let i = 0; i < 4000 && a.alive && a.age < at; i++) advanceYear(a);
        if (!a.alive) break;
        const b = fromSaved(JSON.parse(JSON.stringify(toSaved(a))));
        live(a); live(b);
        expect(b.rng.state).toBe(a.rng.state);
        expect(JSON.stringify(b.log)).toBe(JSON.stringify(a.log));
        expect(JSON.stringify(b.people)).toBe(JSON.stringify(a.people));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
});
