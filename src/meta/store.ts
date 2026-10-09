// 遊びの積み重ねの記録 (Progress) を、localStorage の1つの鍵に版つきで置く。
// 使えない (プライベートモード・容量切れ・テスト) ときはメモリの中だけで動く (何も残らない)。壊れた値・違う版は捨てて新しく始める
import type { Progress } from './types';

export const PROGRESS_KEY = 'ri.progress.v1';
export const GRANTED_MAX = 500;   // 出し終えた人生の id をいくつまで覚えるか
export const TICKET_LOG_MAX = 100;

// localStorage と同じ形 (テストで差し替える)
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void }

export function newProgress(): Progress {
  return {
    v: 1, tickets: 0, ticketLog: [], granted: [], unlocked: [], seen: [],
    totals: { lives: 0, randomLives: 0, years: 0, foesDefeated: 0, ticketsEarned: 0, maxGen: 0, reincMet: 0 },
    distinct: {}, worldsDone: {}, bestiary: {}, encounters: {}, achievements: {}, distinctRandom: {}, worldBest: {},
  };
}

let storage: KV | null | undefined; // undefined = まだ決めていない (初めて使うときに localStorage を見る)
let cur: Progress | null = null;

function store(): KV | null {
  if (storage === undefined) {
    try { storage = typeof localStorage === 'undefined' ? null : localStorage; } catch { storage = null; }
  }
  return storage;
}

// テスト用: 置き場所を差し替える (null = メモリだけ)。読み直す
export function setStorage(s: KV | null): void {
  storage = s;
  cur = null;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);

// 読んだ値を確かめて、足りないところを埋める。形が合わなければ null (捨てる)
function normalize(raw: unknown): Progress | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const base = newProgress();
  const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
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

// 今の記録 (読み取り専用として扱う。変えるときは saveProgress に新しい値を渡す)
export function loadProgress(): Progress {
  if (cur) return cur;
  let p: Progress | null = null;
  try {
    const s = store()?.getItem(PROGRESS_KEY);
    if (s) p = normalize(JSON.parse(s));
  } catch { p = null; }
  cur = p ?? newProgress();
  return cur;
}

export function saveProgress(p: Progress): void {
  cur = { ...p, granted: p.granted.slice(-GRANTED_MAX), ticketLog: p.ticketLog.slice(-TICKET_LOG_MAX) };
  try { store()?.setItem(PROGRESS_KEY, JSON.stringify(cur)); } catch { /* 残せなくても遊べる */ }
}

// 記録を消す (設定の画面の「最初から」とテスト用)
export function resetProgress(): void {
  cur = newProgress();
  try { store()?.removeItem?.(PROGRESS_KEY); } catch { /* 同上 */ }
}

// 開発・e2e 用: チケットを足す。本番の画面からは呼ばない
export function devGrant(n: number): number {
  const p = loadProgress();
  saveProgress({ ...p, tickets: Math.max(0, p.tickets + Math.floor(n)) });
  return loadProgress().tickets;
}

// 開発ビルドでだけ window.__ri に出す (main.ts から呼ぶ)。e2e は window.__ri.grant(10) のように使う
export function exposeDev(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const w = window as unknown as { __ri?: Record<string, unknown> };
  w.__ri = { ...w.__ri, grant: devGrant, progress: loadProgress, resetProgress };
}
