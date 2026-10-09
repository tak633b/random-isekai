// 人生の終わりの精算: チケット、見たもの、合計、種類、図鑑、実績をまとめて記録に入れる。同じ人生 (lifeId) は二度精算しない
import type { Hero } from '../engine/types';
import { L } from '../i18n';
import { factsOf } from './facts';
import { checkAchievements } from './achievements';
import { loadProgress, saveProgress } from './store';
import { BLESSING_KEY } from './unlocks';
import type { AchievementDef, LifeFacts, Progress, UnlockKey } from './types';

export const TICKETS_MAX_PER_LIFE = 4;
// 1つの人生 (1回の精算) で実績からもらえるチケットの上限
export const ACH_TICKETS_MAX_PER_LIFE = 1;
export interface TicketPart { label: string; n: number }

// その人生でもらえるチケット。おまかせで最後まで生きた人生だけ (設定した人生・中断は 0)
export function ticketsFor(f: LifeFacts, p: Progress): { gain: number; parts: TicketPart[] } {
  if (!f.random || !f.ended) return { gain: 0, parts: [] };
  const parts: TicketPart[] = [{ label: L('最後まで生きた', 'Lived to the end'), n: 1 }];
  const add = (ok: boolean, ja: string, en: string) => { if (ok) parts.push({ label: L(ja, en), n: 1 }); };
  add(f.lifespanRatio >= 1, '寿命の目安を超えて生きた', 'Outlived the usual span');
  add(f.flags.includes('arc.legend') || f.rank === 'S', '伝説になった', 'Became a legend');
  add(f.flags.includes('famous'), '名が知られた', 'Made a name');
  add(f.reincMet > 0, 'ほかの転生者に会った', 'Met another reincarnator');
  let left = TICKETS_MAX_PER_LIFE;
  const capped = parts.map((x) => { const n = Math.min(x.n, left); left -= n; return { ...x, n }; }).filter((x) => x.n > 0);
  return { gain: capped.reduce((s, x) => s + x.n, 0), parts: capped };
}

// おまかせの人生で見たもの (解放の値引きと「見た」の印)
export function seenKeys(h: Hero): UnlockKey[] {
  const keys: string[] = [`world:${h.world.id}`, `race:${h.race}`, `status:${h.status}`, ...h.traits.filter((t) => !h.learned?.includes(t)).map((t) => `trait:${t}`)]; // 鍛えて身につけたものは「見た」に数えない (値引きを増やさない)
  if (h.cheat) keys.push(`cheat:${h.cheat}`);
  if (h.setup.hero.startAge) keys.push(`startAge:${h.setup.hero.startAge}`);
  if (h.blessing) keys.push(BLESSING_KEY);
  if (h.arrival === 'summoned') keys.push('arrival:summoned');
  return keys as UnlockKey[];
}

const union = (a: string[] | undefined, b: (string | null | undefined)[]) => [...new Set([...(a ?? []), ...b.filter((x): x is string => !!x)])];

// 事実を記録に数え入れる (チケットと実績の前)。新しい記録を返す
export function tally(p: Progress, f: LifeFacts, h: Hero, at: number): Progress {
  const first = { name: f.name, world: f.world, at };
  const bestiary = { ...p.bestiary };
  for (const k of f.foeKinds) {
    const prev = bestiary[k];
    const won = f.foeKindsWon.includes(k) ? 1 : 0;
    bestiary[k] = prev ? { ...prev, met: prev.met + 1, won: prev.won + won } : { met: 1, won, first };
  }
  const encounters = { ...p.encounters };
  for (const id of f.encounters) encounters[id] = encounters[id] ? { ...encounters[id], n: encounters[id].n + 1 } : { n: 1, first };
  const dist = (d: Progress['distinct'] = {}): Progress['distinct'] => ({
    worlds: union(d.worlds, [f.world]), races: union(d.races, [f.race]), cheats: union(d.cheats, [f.cheat]),
    deaths: union(d.deaths, [f.deathId]), foeKinds: union(d.foeKinds, f.foeKinds), encounters: union(d.encounters, f.encounters),
  });
  const best = { ...(p.worldBest?.[f.world] ?? {}) };
  for (const [k, v] of Object.entries(f)) {
    const n = typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null;
    if (n !== null && n > (best[k as keyof LifeFacts] ?? -Infinity)) best[k as keyof LifeFacts] = n;
  }
  const t = p.totals;
  return {
    ...p,
    seen: f.random ? union(p.seen, seenKeys(h)) as UnlockKey[] : p.seen,
    totals: {
      ...t, lives: t.lives + 1, randomLives: t.randomLives + (f.random ? 1 : 0), years: t.years + f.age,
      foesDefeated: t.foesDefeated + f.foesWon, maxGen: Math.max(t.maxGen, f.gen), reincMet: t.reincMet + f.reincMet,
    },
    distinct: dist(p.distinct),
    distinctRandom: f.random ? dist(p.distinctRandom) : p.distinctRandom,
    worldsDone: { ...p.worldsDone, [f.world]: (p.worldsDone[f.world] ?? 0) + 1 },
    worldBest: { ...p.worldBest, [f.world]: best },
    bestiary, encounters,
  };
}

// 実績を解放済みにする。実績が実績を呼ぶ (集めた割合) ので、新しいものが無くなるまで繰り返す
function award(p: Progress, f: LifeFacts, when: 'end' | 'year', at: number): { p: Progress; got: AchievementDef[]; bonus: number } {
  const got: AchievementDef[] = [];
  let paid = 0;
  for (let i = 0; i < 5; i++) {
    const now = checkAchievements(f, p, when);
    if (!now.length) break;
    const achievements = { ...p.achievements };
    for (const a of now) achievements[a.id] = { at, name: f.name, world: f.world };
    const bonus = Math.min(ACH_TICKETS_MAX_PER_LIFE - paid, now.reduce((s, a) => s + (a.tickets ?? 0), 0));
    paid += bonus;
    p = { ...p, achievements, tickets: p.tickets + bonus, totals: { ...p.totals, ticketsEarned: p.totals.ticketsEarned + bonus } };
    got.push(...now);
  }
  return { p, got, bonus: paid };
}

export interface GrantResult {
  already: boolean;                 // この人生はもう精算してあった (何も変えていない)
  facts: LifeFacts;
  tickets: { gain: number; parts: TicketPart[] }; // 人生のぶん (実績のぶんは achievements の tickets)
  achievements: AchievementDef[];  // 新しく解放した実績
  achTickets: number;              // 実績からもらったチケット (上限 ACH_TICKETS_MAX_PER_LIFE)
  bestiary: string[];              // 図鑑に新しく載った姿
  encounters: string[];            // 出会い図鑑に新しく載った id
  ticketsNow: number;           // 精算の後に持っている枚数
}

// 亡くなった主人公の精算。random: おまかせ転生 (と、その代を継いだ人生)。試行の人生には呼ばない
export function grantLife(h: Hero, random: boolean, now = Date.now()): GrantResult {
  const before = loadProgress();
  const facts = factsOf(h, random);
  const empty = { gain: 0, parts: [] as TicketPart[] };
  if (!facts.ended || before.granted.includes(facts.lifeId)) {
    return { already: before.granted.includes(facts.lifeId), facts, tickets: empty, achievements: [], achTickets: 0, bestiary: [], encounters: [], ticketsNow: before.tickets };
  }
  const tickets = ticketsFor(facts, before);
  let p = tally(before, facts, h, now);
  p = {
    ...p,
    tickets: p.tickets + tickets.gain,
    totals: { ...p.totals, ticketsEarned: p.totals.ticketsEarned + tickets.gain },
    granted: [...p.granted, facts.lifeId],
    ticketLog: tickets.gain ? [...p.ticketLog, { at: now, lifeId: facts.lifeId, name: facts.name, world: facts.world, gain: tickets.gain, parts: tickets.parts }] : p.ticketLog,
  };
  const { p: done, got, bonus } = award(p, facts, 'end', now);
  saveProgress(done);
  return {
    already: false, facts, tickets, achievements: got, achTickets: bonus,
    bestiary: facts.foeKinds.filter((k) => !before.bestiary[k]),
    encounters: facts.encounters.filter((id) => !before.encounters[id]),
    ticketsNow: done.tickets,
  };
}

// 生きている途中の年ごとの判定 (when: 'year' の実績だけ)。解放したものを返す
export function checkYear(h: Hero, random: boolean, now = Date.now()): AchievementDef[] {
  const p0 = loadProgress();
  const { p, got } = award(p0, factsOf(h, random), 'year', now);
  if (got.length) saveProgress(p);
  return got;
}
