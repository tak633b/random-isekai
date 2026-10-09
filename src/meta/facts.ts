// 終わった (または途中の) 主人公から、実績とチケットが見る事実 (LifeFacts) を読む。Hero を変えない
import type { Hero, RaceId, World } from '../engine/types';
import { heqOf, lifeTableFor } from '../engine/mortality';
import { foeKindOf } from './bestiary';
import { encountersOf, metFates } from './encounters';
import type { LifeFacts, LifeId } from './types';

// 人生の id: 最初の主人公の seed と、続けた代の鍵の並び ('123' / '123/t:4/r:2')
export function lifeIdOf(h: Hero): LifeId {
  const l = h.lineage;
  if (!l) return String(h.seed);
  return [l.rootSeed, ...l.ancestors.slice(1).map((a) => a.key), l.key].join('/');
}

// 寿命の目安: その世界・種族の平民の表で、生まれた人の4人に1人だけが届く年齢
const GUIDE_REACH = 0.25;
const guides = new Map<string, number>();
export function lifespanGuide(w: World, race: RaceId): number {
  const key = `${w.id}|${w.q0}|${w.c}|${w.a30}|${w.max}|${w.danger}|${w.medicine}|${w.law}|${race}`;
  let g = guides.get(key);
  if (g === undefined) {
    const l = lifeTableFor(w, race).l;
    const i = l.findIndex((v) => v <= GUIDE_REACH);
    g = Math.max(1, i < 0 ? l.length - 1 : i);
    guides.set(key, g);
  }
  return g;
}

// 続けた主人公 (系譜) の年表・輪・しるしには、続ける前の過去 (錨の付いた一生) も入っている。
// この人生として数えるのは、続けてから (年齢が lineage.startAge より後) のぶんだけ。最初の主人公は全部
export const playedFrom = (h: Hero): number => (h.lineage ? h.lineage.startAge : -Infinity);

export function factsOf(h: Hero, random: boolean): LifeFacts {
  const from = playedFrom(h);
  // 戦いで亡くなった年は、出来事の行と死亡の記録 (kind 'death') の両方に fight が付く。死亡の記録は数えない
  const fights = h.log.filter((e) => e.fight && e.kind !== 'death' && e.age > from);
  const kinds = new Set<string>(), won = new Set<string>();
  let foesWon = 0, foesLost = 0;
  for (const e of fights) {
    const k = foeKindOf(h, e)!;
    kinds.add(k);
    const r = e.fight!.result;
    if (r === 'win' || r === 'hurt') { foesWon++; won.add(k); }
    if (r === 'lose') foesLost++;
  }
  const flags = Object.keys(h.flags).filter((f) => h.flags[f] > from);
  // 一度きりの出来事の id。ponytail: 続けた主人公では、続ける前の出来事の id も混じる (エンジンが区切りを持っていない)
  const eventIds = [...h.used];
  const firstAdv = h.log.find((e) => e.kind === 'adventure' && e.age > from);
  const others = h.people;
  const mine = others.filter((t) => t.since > from); // 続けてから輪に入った人 (最初の主人公なら全員)
  return {
    lifeId: lifeIdOf(h),
    ended: !h.alive,
    random,
    name: h.name,
    world: h.world.id,
    race: h.race,
    sex: h.sex,
    status: h.status,
    cheat: h.cheat,
    traits: [...h.traits],
    arrival: h.arrival,
    // 続けた主人公の setup は 'birth' になるので、始まる年齢は最初の主人公だけ
    ...(!h.lineage && h.setup.hero.startAge ? { startAge: h.setup.hero.startAge } : {}),
    blessing: h.blessing,
    age: h.age,
    heq: Math.floor(heqOf(h)),
    hazard: h.death?.hazard ?? null,
    deathId: h.death?.id ?? null,
    job: h.job,
    rank: h.rank ?? null,
    level: h.level,
    flags,
    marriages: mine.filter((t) => t.role === 'spouse').length,
    children: mine.filter((t) => t.role === 'child').length,
    foesMet: fights.length,
    foesWon,
    foesLost,
    foeKinds: [...kinds],
    foeKindsWon: [...won],
    encounters: encountersOf(new Set(flags), eventIds, metFates(h)),
    reincMet: h.reinc?.met.length ?? 0,     // 転生者との関わりは代ごとに数え直している
    reincFought: h.reinc?.fights.length ?? 0,
    gen: h.lineage?.gen ?? 1,
    maxBond: others.reduce((m, t) => Math.max(m, t.bond), 0),
    outlivedAll: !h.alive && others.length >= 3 && others.every((t) => !t.alive),
    lifespanRatio: h.age / lifespanGuide(h.world, h.race),
    firstYearAdventure: !h.alive && !!firstAdv && firstAdv.age === h.age,
    eventIds,
  };
}
