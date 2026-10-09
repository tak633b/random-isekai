// 出会い図鑑: その人生で出会った まれな人や存在。しるし ('enc.<id>')、出来事の id、会った転生者の筋 のどれかで決まる
import type { Hero } from '../engine/types';
import { reincarnatorsOf } from '../engine/reincarnators';
import { ENCOUNTERS } from '../data/encounters';
import type { EncounterDef, Progress } from './types';

export { ENCOUNTERS };
export const encounterOf = (id: string): EncounterDef | undefined => ENCOUNTERS.find((e) => e.id === id);

// 会った転生者の筋
export function metFates(h: Hero): string[] {
  const met = new Set((h.reinc?.met ?? []).map(([id]) => id));
  if (!met.size) return [];
  return [...new Set(reincarnatorsOf(h).filter((p) => met.has(p.id)).map((p) => p.fate))];
}

// flags: その人生のしるし (続けた主人公なら続けてからのもの)
export function encountersOf(flags: Set<string>, eventIds: string[], fates: string[]): string[] {
  const ev = new Set(eventIds);
  return ENCOUNTERS.filter((d) =>
    (d.flag !== undefined && flags.has(d.flag))
    || (d.eventIds?.some((id) => ev.has(id)) ?? false)
    || (d.reincFate !== undefined && fates.includes(d.reincFate))).map((d) => d.id);
}

export function encounterProgress(p: Progress): { total: number; met: number } {
  return { total: ENCOUNTERS.length, met: ENCOUNTERS.filter((d) => p.encounters[d.id]).length };
}
