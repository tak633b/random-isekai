// 遊びの積み重ねの記録 (Progress) を、localStorage の1つの鍵に版つきで置く。
// 使えない (プライベートモード・容量切れ・テスト) ときはメモリの中だけで動く (何も残らない)。壊れた値・違う版は捨てて新しく始める
import type { Progress } from './types';
import { GRANTED_MAX, newProgress, normalizeProgress, TICKET_LOG_MAX } from './merge';

export { GRANTED_MAX, newProgress, TICKET_LOG_MAX };

export const PROGRESS_KEY = 'ri.progress.v1';

// localStorage と同じ形 (テストで差し替える)
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void }

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

// 今の記録 (読み取り専用として扱う。変えるときは saveProgress に新しい値を渡す)
export function loadProgress(): Progress {
  if (cur) return cur;
  let p: Progress | null = null;
  try {
    const s = store()?.getItem(PROGRESS_KEY);
    if (s) p = normalizeProgress(JSON.parse(s));
  } catch { p = null; }
  cur = p ?? newProgress();
  return cur;
}

export function saveProgress(p: Progress): void {
  cur = { ...p, granted: p.granted.slice(-GRANTED_MAX), ticketLog: p.ticketLog.slice(-TICKET_LOG_MAX) };
  try { store()?.setItem(PROGRESS_KEY, JSON.stringify(cur)); } catch { /* 残せなくても遊べる */ }
  if (!quiet) saved?.();
}

// 書くたびに呼ぶもの (ログイン中のアカウントへの同期。net/account.ts)。1つだけ
let saved: (() => void) | null = null;
let quiet = false;
export function onProgressSaved(f: (() => void) | null): void { saved = f; }
// 同期で受け取った記録を書く (書いたことを同期に知らせない。送り返さないため)
export function saveProgressQuietly(p: Progress): void {
  quiet = true;
  try { saveProgress(p); } finally { quiet = false; }
}

// 記録を消す (設定の画面の「最初から」とテスト用)
export function resetProgress(): void {
  cur = newProgress();
  try { store()?.removeItem?.(PROGRESS_KEY); } catch { /* 同上 */ }
  wiped?.();
}

// 消したときに呼ぶもの (ログイン中ならアカウントの記録も消す。net/account.ts)
let wiped: (() => void) | null = null;
export function onProgressReset(f: (() => void) | null): void { wiped = f; }

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
