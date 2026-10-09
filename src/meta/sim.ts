// テストと測定の手伝い: おまかせの人生を続けるプレイヤーを走らせる (画面は使わない)
import { createHero, liveOut } from '../engine';
import { continueAs, heirsOf } from '../engine/lineage';
import type { Hero } from '../engine/types';
import { grantLife, type GrantResult } from './tickets';
import { loadProgress, resetProgress, setStorage } from './store';
import { ALL_UNLOCKS, canUnlock, CUSTOM, priceOf, unlock } from './unlocks';
import type { Progress } from './types';

export const randomLife = (seed: number): Hero => liveOut(createHero({ seed, world: { preset: 'random' }, hero: {}, auto: true }));

// チケットを使い切る: まず「設定して転生」、後は安いものから
export function spendAll(): void {
  if (!unlock(CUSTOM) && !loadProgress().unlocked.includes(CUSTOM)) return;
  for (;;) {
    const p = loadProgress();
    let best: string | null = null, bp = Infinity;
    for (const k of ALL_UNLOCKS) if (canUnlock(k, p) && priceOf(k, p)! < bp) { best = k; bp = priceOf(k, p)!; }
    if (!best || !unlock(best as typeof CUSTOM)) return;
  }
}

// n 人の人生を生きるプレイヤー。heirEvery 人に1人は、亡くなった人の輪から1人選んで続ける (系譜)。spend: 毎回チケットを使い切る
export function playLives(base: number, n: number, opts: { heirEvery?: number; spend?: boolean; onLife?: (r: GrantResult, h: Hero, i: number) => void } = {}): Progress {
  setStorage(null);
  resetProgress();
  let prev: Hero | null = null;
  for (let i = 0; i < n; i++) {
    const heirs: string[] = prev && opts.heirEvery && i % opts.heirEvery === 0 ? heirsOf(prev) : [];
    const h: Hero = heirs.length ? liveOut(continueAs(prev!, heirs[0])) : randomLife(base * 100003 + i + 1);
    const r = grantLife(h, true, i);
    opts.onLife?.(r, h, i);
    if (opts.spend) spendAll();
    prev = h;
  }
  return loadProgress();
}
