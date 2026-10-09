import { describe, it, expect } from 'vitest';
import { createHero } from './hero';
import { liveOut } from './life';
import { chronicleOf } from './chronicle';
import { reincarnatorsOf } from './reincarnators';
import { WORLD_IDS } from './worlds';
import type { Setup, WorldId } from './types';

const setup = (seed: number, preset: WorldId | 'random' = 'random'): Setup => ({ seed, world: { preset }, hero: {}, auto: true });

describe('年代記', () => {
  it('同じ seed なら同じ。年の順に並ぶ', () => {
    for (let s = 1; s <= 40; s++) {
      const a = chronicleOf(liveOut(createHero(setup(s))));
      const b = chronicleOf(liveOut(createHero(setup(s))));
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      for (let i = 1; i < a.length; i++) expect(a[i].at).toBeGreaterThanOrEqual(a[i - 1].at);
    }
  });

  it('主人公が生きた年の戦争の始まりは、主人公の年表の「戦争が始まった」と一致する', () => {
    let wars = 0;
    for (let s = 1; s <= 200; s++) {
      const h = liveOut(createHero(setup(s)));
      const start = h.log[0].age;
      const fromLog = h.log.filter((e) => e.text === '戦争が始まった。' && e.age > start).map((e) => e.age);
      const fromChron = chronicleOf(h).filter((e) => e.kind === 'war' && e.lived && e.at > start && /始まった/.test(e.text)).map((e) => e.at);
      expect(fromChron, `seed ${s}`).toEqual(fromLog);
      wars += fromLog.length;
    }
    expect(wars).toBeGreaterThan(20);
  });

  it('生きた年にだけ lived が付き、生まれる前の数十年も入る', () => {
    let before = 0;
    for (let s = 1; s <= 100; s++) {
      const h = liveOut(createHero(setup(s)));
      const start = h.log[0].age;
      for (const e of chronicleOf(h)) {
        expect(!!e.lived).toBe(e.at >= start && e.at <= h.age);
        if (e.at < start - 20) before++;
      }
    }
    expect(before).toBeGreaterThan(100);
  });

  it('人は r:<id> / t:<id> で、名簿と輪に実在する', () => {
    for (let s = 1; s <= 100; s++) {
      const h = liveOut(createHero(setup(s, 'game')));
      const ids = new Set(reincarnatorsOf(h).map((p) => `r:${p.id}`));
      for (const e of chronicleOf(h)) {
        for (const w of e.who ?? []) {
          if (w.startsWith('r:')) expect(ids.has(w)).toBe(true);
          else expect(h.people.some((t) => `t:${t.id}` === w)).toBe(true);
        }
      }
    }
  });

  it('魔王を討った主人公の手柄が入る', () => {
    let n = 0;
    for (let s = 1; s <= 400; s++) {
      const h = liveOut(createHero({ ...setup(s, 'game'), hero: { cheat: 'sword_saint', talent: 'might' } }));
      if (h.flags.demonKingSlain === undefined) continue;
      expect(chronicleOf(h).some((e) => e.kind === 'hero' && e.at === h.flags.demonKingSlain && e.text.includes('討ち果たした'))).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThan(0);
  });

  // 実測 (2026-10-09, 世界ごと seed 1〜60): 1人の人生あたりの年代記の件数の平均は 16 (modern) 〜 68 (game)。
  // 主人公の前後60年を含むので、短い一生でも数十件になる
  it('1人の人生で十数件〜百件ほど', () => {
    for (const id of WORLD_IDS) {
      let n = 0;
      for (let s = 1; s <= 20; s++) n += chronicleOf(liveOut(createHero(setup(s * 7919, id)))).length;
      expect(n / 20, id).toBeGreaterThan(5);
      expect(n / 20, id).toBeLessThan(150);
    }
  }, 60_000);
});

describe('同じ文を繰り返さない', () => {
  it('1つの年代記の中で、同じ文が2度出ない (16の世界・各20本)', () => {
    let n = 0;
    for (const w of WORLD_IDS) for (let s = 1; s <= 20; s++) {
      const texts = chronicleOf(liveOut(createHero(setup(s * 31, w)))).map((e) => e.text);
      n += texts.length;
      const dup = texts.filter((t, i) => texts.indexOf(t) !== i);
      expect(dup, `${w} ${s}`).toEqual([]);
    }
    expect(n).toBeGreaterThan(1000);
  });
});
