// 作戦 (tactic.ts): バランスは今までと同じ人生、ガンガンいこうぜは冒険と戦いが増えて短く、いのちだいじには逆に寄る
import { describe, expect, it } from 'vitest';
import { createHero, fromSaved, liveOut, setTactic, toSaved } from '.';
import { HAZARDS } from './mortality';
import { tacticAdv, tacticFight } from './tactic';
import { factsOf } from '../meta/facts';
import type { Policy } from './types';

describe('作戦', () => {
  it('バランスよくは、どの倍率も 1 (乱数の並びも結果も今までと同じ)', () => {
    // 測定 2026-10-09: 300人の toSaved の SHA-256 が、作戦を入れる前 (07f1589) と同じだった
    for (const hz of HAZARDS) expect(tacticFight({ policy: 'normal' }, hz)).toBe(1);
    expect(tacticAdv({ policy: 'normal' })).toBe(1);
  });

  it('300人で: ガンガンいこうぜは いのちだいじに より戦いと冒険が多く、寿命の中央値が短い', () => {
    const run = (policy: Policy) => {
      const ages: number[] = [];
      let fights = 0, adv = 0;
      for (let i = 0; i < 300; i++) {
        const h = liveOut(createHero({ seed: 9100 + i, world: { preset: 'random' }, hero: {}, auto: true, policy }));
        ages.push(h.age);
        fights += h.log.filter((e) => e.fight).length;
        adv += h.log.filter((e) => e.kind === 'adventure').length;
      }
      ages.sort((a, b) => a - b);
      return { median: ages[150], fights, adv };
    };
    // 測った値: ガンガン 中央値35・戦い1368・冒険1606 / バランス 40・1237・1359 / いのちだいじに 38・1143・1184
    const bold = run('bold'), safe = run('careful');
    expect(bold.fights).toBeGreaterThan(safe.fights);
    expect(bold.adv).toBeGreaterThan(safe.adv);
    expect(bold.median).toBeLessThan(safe.median);
  });

  it('途中で変えると年表に1行残り、通した作戦は mixed になる。保存しても残る', () => {
    const h = createHero({ seed: 42, world: { preset: 'medieval' }, hero: {}, auto: true });
    expect(h.policy).toBe('normal');
    const n = h.log.length;
    setTactic(h, 'normal');
    expect(h.log.length).toBe(n); // 同じなら何もしない
    setTactic(h, 'careful');
    expect(h.policy).toBe('careful');
    expect(h.log.at(-1)!.text).toContain('いのちだいじに');
    expect(fromSaved(toSaved(h)).policy).toBe('careful');
    expect(factsOf(liveOut(h), true).tactic).toBe('mixed');
    expect(factsOf(liveOut(createHero({ seed: 42, world: { preset: 'medieval' }, hero: {}, auto: true, policy: 'careful' })), true).tactic).toBe('careful');
  });
});
