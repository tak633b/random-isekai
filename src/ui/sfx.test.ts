import { describe, expect, it } from 'vitest';
import { advanceYear, createHero } from '../engine';
import { ROUTINE_GAP_MS, SOUNDS, allowed, fightSfx, pickSfx, snap, type FightPhase } from './sfx';

const hero = (seed = 8) => createHero({ seed, world: { preset: 'medieval' }, hero: { cheat: 'none' }, auto: true });

describe('効果音', () => {
  it('どの音も部品があり、長さと大きさが正の値', () => {
    for (const [name, notes] of Object.entries(SOUNDS)) {
      expect(notes.length, name).toBeGreaterThan(0);
      for (const [at, len, , , v] of notes) { expect(at).toBeGreaterThanOrEqual(0); expect(len).toBeGreaterThan(0); expect(v).toBeGreaterThan(0); }
    }
  });
  it('前の年からの変化で1つ選ぶ (身分 > 戦い > レベル > スキル > 能力 > お金)', () => {
    const h = hero();
    const a = snap(h);
    h.level += 5;
    h.gold = (h.gold ?? 0) + 1000;
    expect(pickSfx(a, snap(h))).toEqual({ seq: ['levelup'], big: false });
    h.log.push({ age: h.age, text: '', kind: 'battle', fight: { foe: 'monster', result: 'win' } });
    expect(pickSfx(a, snap(h))).toEqual({ seq: [], big: false }); // 戦いの音は場面 (stage.ts) が鳴らす。この年はほかの音を止める
    h.standing = 'royal';
    expect(pickSfx(a, snap(h))).toEqual({ seq: ['climb'], big: true });
  });
  it('お金は少し増えたくらいでは鳴らさない', () => {
    const h = hero();
    h.gold = 1000;
    const a = snap(h);
    h.gold = 1100;
    expect(pickSfx(a, snap(h))).toBeNull();
    h.gold = 1300;
    expect(pickSfx(a, snap(h))?.seq).toEqual(['coin']);
  });
  it('別の人生に替わったら鳴らさない', () => {
    const a = snap(hero());
    const b = hero();
    b.level += 5;
    expect(pickSfx(a, snap(b))).toBeNull();
  });
  it('ふだんの音は続けて鳴らさず、8倍速以上では鳴らさない。大きな場面はいつも', () => {
    const routine = { seq: ['statup' as const], big: false };
    const big = { seq: ['climb' as const], big: true };
    expect(allowed(routine, false, 10_000, 10_000 - ROUTINE_GAP_MS)).toBe(true);
    expect(allowed(routine, false, 10_000, 10_000 - ROUTINE_GAP_MS + 1)).toBe(false);
    expect(allowed(routine, true, 10_000, -Infinity)).toBe(false);
    expect(allowed(big, true, 10_000, 9_999)).toBe(true);
  });
  it('ふつうに一生を進めると、何かしらの音が選ばれる年がある', () => {
    // 40歳まで生きる人生を探す (シードを決め打ちしない。エンジンが変わっても通るように)
    let n = 0, lived = 0;
    for (let seed = 1; seed <= 200 && lived < 40; seed++) {
      const h = hero(seed);
      n = 0;
      for (let i = 0; i < 60 && h.alive; i++) {
        const a = snap(h);
        advanceYear(h);
        if (h.alive && pickSfx(a, snap(h))) n++;
      }
      lived = h.age;
    }
    expect(lived).toBeGreaterThanOrEqual(40);
    expect(n).toBeGreaterThan(0);
  });
  it('戦いの場面: 区切りごとに1つずつ、打ち合いは4回で止まる', () => {
    const run = (result: 'win' | 'hurt' | 'flee' | 'lose', magic = false) => {
      const out: string[] = [];
      let at: FightPhase = -2;
      for (const ph of [-1, -1, 0, 0, 1, 2, 3, 3, 4, 4, 4] as FightPhase[]) { out.push(...fightSfx(at, ph, result, magic)); at = ph > at ? ph : at; }
      return out;
    };
    expect(run('win')).toEqual(['encounter', 'slash', 'strike', 'slash', 'strike', 'defeat', 'victory']);
    expect(run('hurt', true)).toEqual(['encounter', 'magic', 'strike', 'magic', 'hurt', 'defeat', 'victory']);
    expect(run('flee').at(-1)).toBe('flee');
    expect(run('lose')).toEqual(['encounter', 'slash', 'strike', 'slash', 'hurt']); // 倒れたあとは死にかけの演出が鳴らす
    expect(fightSfx(-1, 4, 'win', false)).toEqual(['defeat', 'victory']); // 飛び越えたら最後の区切りだけ
  });
});
