// 端末とアカウントの記録の合わせ方 (meta/merge.ts)。順に依らず、何度合わせても同じで、進んだ方を落とさない
import { describe, expect, it } from 'vitest';
import { mergeProgress, newProgress, normalizeProgress } from './merge';
import { playLives } from './sim';
import type { Progress } from './types';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('記録の合わせ方', () => {
  const a = clone(playLives(11, 12, { spend: true }));
  const b = clone(playLives(29, 8, { heirEvery: 3 }));

  it('順に依らず (可換)、何度合わせても同じ (冪等)、3つでも括り方に依らない', () => {
    const ab = mergeProgress(a, b);
    expect(mergeProgress(b, a)).toEqual(ab);
    expect(mergeProgress(ab, ab)).toEqual(ab);
    expect(mergeProgress(ab, b)).toEqual(ab);
    const c = clone(playLives(47, 5));
    expect(mergeProgress(mergeProgress(a, b), c)).toEqual(mergeProgress(a, mergeProgress(b, c)));
    // JSON を通しても変わらない (サーバに置いて読み直す形)
    expect(clone(ab)).toEqual(ab);
  });

  it('進んだ方を落とさない: 解放・実績・図鑑は和、合計とチケットは大きい方', () => {
    const m = mergeProgress(a, b);
    for (const k of [...a.unlocked, ...b.unlocked]) expect(m.unlocked).toContain(k);
    for (const k of [...Object.keys(a.achievements), ...Object.keys(b.achievements)]) expect(m.achievements).toHaveProperty([k]);
    for (const k of [...Object.keys(a.bestiary), ...Object.keys(b.bestiary)]) {
      expect(m.bestiary[k].met).toBe(Math.max(a.bestiary[k]?.met ?? 0, b.bestiary[k]?.met ?? 0));
    }
    for (const k of Object.keys(m.totals) as (keyof Progress['totals'])[]) expect(m.totals[k]).toBe(Math.max(a.totals[k], b.totals[k]));
    expect(m.tickets).toBe(Math.max(a.tickets, b.tickets));
  });

  it('実績と初めての出会いは早い方の時刻を残す', () => {
    const x = { ...newProgress(), achievements: { 'a.one': { at: 200, name: 'X', world: 'medieval' as const } } };
    const y = { ...newProgress(), achievements: { 'a.one': { at: 100, name: 'Y', world: 'dark' as const } } };
    expect(mergeProgress(x, y).achievements['a.one']).toEqual({ at: 100, name: 'Y', world: 'dark' });
    expect(mergeProgress(y, x).achievements['a.one']).toEqual({ at: 100, name: 'Y', world: 'dark' });
  });

  it('形の違う入力 (サーバに来た改ざん) は捨てて読み、プロトタイプを汚さない', () => {
    const bad = normalizeProgress(JSON.parse('{"v":1,"tickets":"9","totals":{"lives":-4,"years":"x"},"bestiary":{"__proto__":{"met":5,"first":{"at":1}},"slime":{"met":"many","first":"no"}},"achievements":{"a":{"at":"soon"}},"unlocked":["world:dark",7],"worldsDone":{"dark":-3}}'))!;
    const m = mergeProgress(newProgress(), bad);
    expect(({} as Record<string, unknown>).met).toBeUndefined();
    expect(m.tickets).toBe(0);
    expect(m.totals.lives).toBe(0);
    expect(m.unlocked).toEqual(['world:dark']);
    expect(m.bestiary).not.toHaveProperty('slime'); // 初めての記録の無いものは捨てる
    expect(Object.hasOwn(m.bestiary, '__proto__')).toBe(true);
    expect(m.achievements.a.at).toBe(0);
    expect(m.worldsDone.dark).toBe(0);
  });
});
