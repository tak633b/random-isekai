// 記録 (Progress) の読み直しと、2つの記録の合わせ方。端末とアカウント (サーバ) の記録を合わせるのに使う。
// サーバ (server/account.mjs) もこのファイルをそのまま読み込むので、ほかのモジュールに頼らない (型だけ)。
// 合わせ方は「進んでいる方」を取るだけ: 集合は和、回数は大きい方、初めての時刻は早い方。
// 同じものを何度合わせても、どちらの順で合わせても同じ結果になる (merge.test.ts で確かめる)
import type { Progress } from './types';

export const GRANTED_MAX = 500;   // 出し終えた人生の id をいくつまで覚えるか
export const TICKET_LOG_MAX = 100;
const KEY_MAX = 100;              // サーバで受ける鍵・文字列の長さの上限 (それより長いものは捨てる)
const STR_MAX = 200;

export function newProgress(): Progress {
  return {
    v: 1, tickets: 0, ticketLog: [], granted: [], unlocked: [], seen: [],
    totals: { lives: 0, randomLives: 0, years: 0, foesDefeated: 0, ticketsEarned: 0, maxGen: 0, reincMet: 0 },
    distinct: {}, worldsDone: {}, bestiary: {}, encounters: {}, achievements: {}, distinctRandom: {}, worldBest: {},
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
const num = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const nn = (x: unknown): number => Math.max(0, num(x));
const str = (x: unknown): string => (typeof x === 'string' ? x.slice(0, STR_MAX) : '');

// 読んだ値を確かめて、足りないところを埋める。形が合わなければ null (捨てる)
export function normalizeProgress(raw: unknown): Progress | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const base = newProgress();
  const totals = isObj(raw.totals) ? raw.totals : {};
  return {
    ...base,
    tickets: Math.max(0, Math.floor(num(raw.tickets))),
    ticketLog: Array.isArray(raw.ticketLog) ? (raw.ticketLog as Progress['ticketLog']).filter(isObj).slice(-TICKET_LOG_MAX) : [],
    granted: strs(raw.granted).slice(-GRANTED_MAX),
    unlocked: strs(raw.unlocked) as Progress['unlocked'],
    seen: strs(raw.seen) as Progress['seen'],
    totals: Object.fromEntries(Object.entries(base.totals).map(([k, d]) => [k, num(totals[k], d)])) as unknown as Progress['totals'],
    distinct: isObj(raw.distinct) ? (raw.distinct as Progress['distinct']) : {},
    distinctRandom: isObj(raw.distinctRandom) ? (raw.distinctRandom as Progress['distinct']) : {},
    worldsDone: isObj(raw.worldsDone) ? (raw.worldsDone as Progress['worldsDone']) : {},
    worldBest: isObj(raw.worldBest) ? (raw.worldBest as Progress['worldBest']) : {},
    bestiary: isObj(raw.bestiary) ? (raw.bestiary as Progress['bestiary']) : {},
    encounters: isObj(raw.encounters) ? (raw.encounters as Progress['encounters']) : {},
    achievements: isObj(raw.achievements) ? (raw.achievements as Progress['achievements']) : {},
  };
}

// ---- 合わせ方 ----------------------------------------------------------------
// どちらを取るか決められないとき (同じ時刻など) は JSON の文字列の小さい方。順に依らないため
const cmp = (a: unknown, b: unknown): number => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; };
const set = (a: unknown, b: unknown): string[] => [...new Set([...strs(a), ...strs(b)].filter((s) => s.length <= STR_MAX))].sort();

// 2つの表を鍵ごとに合わせる。片方にしか無い鍵は f(x, undefined) で整える
function byKey<T>(a: unknown, b: unknown, f: (x: unknown, y: unknown) => T | null): Record<string, T> {
  const x = isObj(a) ? a : {}, y = isObj(b) ? b : {};
  const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => k.length <= KEY_MAX).sort();
  const out: [string, T][] = [];
  for (const k of keys) {
    const v = f(Object.hasOwn(x, k) ? x[k] : undefined, Object.hasOwn(y, k) ? y[k] : undefined);
    if (v !== null) out.push([k, v]);
  }
  return Object.fromEntries(out); // fromEntries は '__proto__' も普通の鍵として置く
}

type First = { name: string; world: string; at: number };
const first = (x: unknown): First | null => (isObj(x) ? { name: str(x.name), world: str(x.world), at: nn(x.at) } : null);
// 早い方 (同じ時刻なら決まった方)
function earlier<T extends { at: number }>(a: T | null, b: T | null): T | null {
  if (!a || !b) return a ?? b;
  return a.at !== b.at ? (a.at < b.at ? a : b) : cmp(a, b) <= 0 ? a : b;
}

type Log = Progress['ticketLog'][number];
function logEntry(x: unknown): Log | null {
  if (!isObj(x)) return null;
  const parts = Array.isArray(x.parts) ? x.parts.filter(isObj).slice(0, 20).map((p) => ({ label: str(p.label), n: num(p.n) })) : [];
  return { at: nn(x.at), lifeId: str(x.lifeId), name: str(x.name), world: str(x.world) as Log['world'], gain: num(x.gain), parts };
}

/**
 * 2つの記録を合わせる。入力はどちらも信じない (形の違う所は捨てて読む)。
 * チケットは大きい方。ponytail: チケットは使うと減るので、2つの端末で別々に使うと max で片方の支払いが戻る
 * (1人遊びなので受け入れる。直すならチケットの増減を記録して足し直す)。
 * 同じ端末で使った分が戻らないよう、サーバは自分の版から進めただけの書き込みでは送られたチケットをそのまま取る (account.mjs)
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const logs = new Map<string, Log>();
  for (const e of [...(a.ticketLog ?? []), ...(b.ticketLog ?? [])].map(logEntry)) {
    if (!e) continue;
    const k = `${e.at}|${e.lifeId}`, o = logs.get(k);
    if (!o || cmp(e, o) < 0) logs.set(k, e);
  }
  const ticketLog = [...logs.values()].sort((x, y) => x.at - y.at || cmp(x, y)).slice(-TICKET_LOG_MAX);
  const base = newProgress();
  const ta: Record<string, unknown> = isObj(a.totals) ? a.totals : {}, tb: Record<string, unknown> = isObj(b.totals) ? b.totals : {};
  const distinct = (x: unknown, y: unknown) => byKey(x, y, (p, q) => set(p, q)) as Progress['distinct'];
  return {
    v: 1,
    tickets: Math.max(Math.floor(nn(a.tickets)), Math.floor(nn(b.tickets))),
    ticketLog,
    // ponytail: 並べ直すので、上限 (500) を超えたときに捨てるのは古い順ではなく辞書順の小さい方。超えるのは何百も遊んだ人だけ
    granted: set(a.granted, b.granted).slice(-GRANTED_MAX),
    unlocked: set(a.unlocked, b.unlocked) as Progress['unlocked'],
    seen: set(a.seen, b.seen) as Progress['seen'],
    totals: Object.fromEntries(Object.keys(base.totals).map((k) => [k, Math.max(nn(ta[k]), nn(tb[k]))])) as unknown as Progress['totals'],
    distinct: distinct(a.distinct, b.distinct),
    distinctRandom: distinct(a.distinctRandom, b.distinctRandom),
    worldsDone: byKey(a.worldsDone, b.worldsDone, (x, y) => Math.max(nn(x), nn(y))),
    worldBest: byKey(a.worldBest, b.worldBest, (x, y) => byKey(x, y, (p, q) => Math.max(num(p, -Infinity), num(q, -Infinity), 0))),
    bestiary: byKey(a.bestiary, b.bestiary, (x, y) => {
      const p = isObj(x) ? x : {}, q = isObj(y) ? y : {};
      const f = earlier(first(p.first), first(q.first));
      return f ? { met: Math.max(nn(p.met), nn(q.met)), won: Math.max(nn(p.won), nn(q.won)), first: f as Progress['bestiary'][string]['first'] } : null;
    }),
    encounters: byKey(a.encounters, b.encounters, (x, y) => {
      const p = isObj(x) ? x : {}, q = isObj(y) ? y : {};
      const f = earlier(first(p.first), first(q.first));
      return f ? { n: Math.max(nn(p.n), nn(q.n)), first: f as Progress['encounters'][string]['first'] } : null;
    }),
    achievements: byKey(a.achievements, b.achievements, (x, y) => earlier(first(x), first(y)) as Progress['achievements'][string] | null),
  };
}
