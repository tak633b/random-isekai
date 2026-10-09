// 鍛える道・成り上がりの道の条件 (出来事と同じ形の、世界・身分・種族・職業・特典・来かた)
import type { Hero, TrainPath } from './types';
import { standingOf } from './status';

type Cond = Pick<TrainPath, 'tags' | 'not' | 'magic' | 'powers' | 'tech' | 'races' | 'status' | 'jobs' | 'cheat' | 'cheats' | 'arrival'>;
export function fits(h: Hero, d: Cond): boolean {
  const w = h.world;
  return (!d.tags || d.tags.some((t) => w.tags.includes(t)))
    && (!d.not || !d.not.some((t) => w.tags.includes(t)))
    && (d.magic === undefined || w.magic >= d.magic)
    && (d.powers === undefined || w.powers >= d.powers)
    && (!d.tech || (w.tech >= d.tech[0] && w.tech <= d.tech[1]))
    && (!d.status || d.status.includes(standingOf(h)))
    && (!d.races || d.races.includes(h.race))
    && (!d.jobs || d.jobs.includes(h.job ?? 'none'))
    && (d.cheat === undefined || d.cheat === (h.cheat !== null))
    && (!d.cheats || (h.cheat !== null && d.cheats.includes(h.cheat)))
    && (!d.arrival || d.arrival.includes(h.arrival));
}

