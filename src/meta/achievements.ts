// 実績の条件 (Cond) の評価。その人生の事実 (LifeFacts) と、それを数え入れた後の記録 (Progress) を見る。
// データは src/data/achievements.ts の ACHIEVEMENTS (無くても動く)
import type { WorldId } from '../engine/types';
import { WORLD_IDS } from '../engine/worlds';
import { BESTIARY } from './bestiary';
import { ENCOUNTERS } from './encounters';
import { unlockProgress } from './unlocks';
import type { AchievementDef, Cond, LifeFacts, Progress } from './types';

const mods = import.meta.glob<{ ACHIEVEMENTS?: AchievementDef[] }>('../data/achievements.ts', { eager: true });
let LIST: AchievementDef[] = Object.values(mods).flatMap((m) => m.ACHIEVEMENTS ?? []);
let byId = new Map(LIST.map((a) => [a.id, a]));

export const allAchievements = (): AchievementDef[] => LIST;
export const achievementOf = (id: string): AchievementDef | undefined => byId.get(id);
// テスト用: 一覧を差し替える
export function useAchievements(list: AchievementDef[]): void {
  LIST = list;
  byId = new Map(list.map((a) => [a.id, a]));
}

// 集めたものの割合 (0〜100)
export function collectionPct(kind: Extract<Cond, { collection: unknown }>['collection'], p: Progress): number {
  const ratio = (got: number, total: number) => (total ? (got / total) * 100 : 0);
  switch (kind) {
    case 'bestiary': return ratio(BESTIARY.filter((b) => p.bestiary[b.id]).length, BESTIARY.length);
    case 'bestiaryWon': return ratio(BESTIARY.filter((b) => (p.bestiary[b.id]?.won ?? 0) > 0).length, BESTIARY.length);
    case 'encounters': return ratio(ENCOUNTERS.filter((e) => p.encounters[e.id]).length, ENCOUNTERS.length);
    case 'unlocks': { const u = unlockProgress(p); return ratio(u.got, u.total); }
    case 'achievements': return ratio(LIST.filter((a) => p.achievements[a.id]).length, LIST.length);
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : Array.isArray(v) ? v.length : null);

// 条件を満たすか。pct は 0〜100。fact の gte/lte は数 (真偽は 1/0、配列は長さ) に、eq はそのままの値に比べる
export function evalCond(c: Cond, f: LifeFacts, p: Progress): boolean {
  if ('all' in c) return c.all.every((x) => evalCond(x, f, p));
  if ('any' in c) return c.any.some((x) => evalCond(x, f, p));
  if ('not' in c) return !evalCond(c.not, f, p);
  if ('total' in c) return p.totals[c.total] >= c.gte;
  if ('everyWorld' in c) {
    return WORLD_IDS.every((w: WorldId) => {
      if (!c.fact) return (p.worldsDone[w] ?? 0) > 0;
      const v = p.worldBest?.[w]?.[c.fact];
      return v !== undefined && v >= (c.gte ?? 1);
    });
  }
  if ('fact' in c) {
    const v = f[c.fact];
    if (c.eq !== undefined && v !== c.eq) return false;
    const n = num(v);
    if (c.gte !== undefined && (n === null || n < c.gte)) return false;
    if (c.lte !== undefined && (n === null || n > c.lte)) return false;
    return c.eq !== undefined || c.gte !== undefined || c.lte !== undefined || (Array.isArray(v) ? v.length > 0 : !!v);
  }
  if ('has' in c) return f[c.has].includes(c.id);
  if ('distinct' in c) return ((c.random ? p.distinctRandom : p.distinct)?.[c.distinct]?.length ?? 0) >= c.gte;
  return collectionPct(c.collection, p) >= c.pct;
}

// まだ解放していない実績のうち、今満たしたもの。when='year' は年ごとの判定の実績だけ、'end' はすべて (年ごとのものの取りこぼしも拾う)
export function checkAchievements(f: LifeFacts, p: Progress, when: 'end' | 'year' = 'end'): AchievementDef[] {
  return LIST.filter((a) => !p.achievements[a.id] && (when === 'end' || a.when === 'year') && evalCond(a.cond, f, p));
}
