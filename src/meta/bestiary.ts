// 魔物図鑑。項目は ui/enemy.ts の姿 (enemyKinds) ごと。出る世界と大分類は enemy.ts の引き方をそのまま数えて決める (書き写さない)
import type { Foe, Hero, LogEntry, WorldId } from '../engine/types';
import { WORLD_IDS } from '../engine/worlds';
import { enemyFor, enemyKind, enemyKinds } from '../ui/enemy';
import { hash } from '../ui/raster';
import { BESTIARY_TEXT } from '../data/bestiary';
import type { BestiaryEntry, Progress } from './types';

const FOES: Foe[] = ['monster', 'beast', 'bandit', 'soldier', 'undead', 'dragon', 'demon', 'machine'];
const SWEEP = 64; // 姿は1つの世界・大分類で多くて4つ。64個の seed で全部に当たる

// 戦いの場面に出た姿。ui/stage.ts の Stage.show と同じ式 (その年の主人公の年齢で決まる)
export const foeKindOf = (h: Pick<Hero, 'seed' | 'world'>, e: LogEntry): string | null =>
  e.fight ? enemyKind(enemyFor(h.world.id, e.fight.foe, hash(h.seed, e.age, 0xf0e))) : null;

function build(): BestiaryEntry[] {
  const seen = new Map<string, { worlds: Set<WorldId>; foe: Foe }>();
  for (const w of WORLD_IDS) for (const foe of FOES) for (let s = 0; s < SWEEP; s++) {
    const id = enemyKind(enemyFor(w, foe, s));
    const e = seen.get(id) ?? { worlds: new Set<WorldId>(), foe };
    e.worlds.add(w);
    seen.set(id, e);
  }
  return enemyKinds().map((id) => {
    const row = BESTIARY_TEXT[id];
    const s = seen.get(id);
    const [ja, en, danger, fja, fen] = row ?? [id, id, 1, '', ''];
    return { id, name: { ja, en }, worlds: s ? WORLD_IDS.filter((w) => s.worlds.has(w)) : [], foe: s?.foe ?? 'monster', danger, flavor: { ja: fja, en: fen } };
  });
}

export const BESTIARY: BestiaryEntry[] = build();
const byId = new Map(BESTIARY.map((b) => [b.id, b]));
export const bestiaryEntry = (id: string): BestiaryEntry | undefined => byId.get(id);

// 世界ごとの項目の数 (その世界に出うる姿)
export function bestiaryByWorld(): Record<WorldId, number> {
  return Object.fromEntries(WORLD_IDS.map((w) => [w, BESTIARY.filter((b) => b.worlds.includes(w)).length])) as Record<WorldId, number>;
}

// 図鑑の埋まり具合 (画面用)。met は出会った項目の数、won は勝った項目の数
export function bestiaryProgress(p: Progress, world?: WorldId): { total: number; met: number; won: number } {
  const list = world ? BESTIARY.filter((b) => b.worlds.includes(world)) : BESTIARY;
  return { total: list.length, met: list.filter((b) => p.bestiary[b.id]).length, won: list.filter((b) => (p.bestiary[b.id]?.won ?? 0) > 0).length };
}
