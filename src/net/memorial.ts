// 共有の追悼館のクライアント。サーバは server/server.mjs。
// GitHub Pages のようにサーバが無い所では memorialAvailable() が false になるので、画面は館を出さない
import type { Hazard, Hero, RaceId, Role, SceneSpec, Sex, Status, WorldId } from '../engine/types';
import { summary } from '../engine';
import { sceneOf } from '../ui/pixel';
import { lang, type Lang } from '../i18n';

export interface MemorialEntry {
  id: number;
  seed: number;
  world: WorldId;
  name: string;
  race: RaceId;
  sex: Sex;
  status: Status;
  age: number;
  hazard: Hazard;
  causeLabel: string;
  causeText: string;
  why: string;
  highlights: { age: number; text: string }[];
  lastWith: { name: string; role: Role }[];
  note: string;
  scene: SceneSpec | null;
  lang: Lang;
  gen?: number;           // 何代目か (1 = 初代。古い記録には無い)
  lineage?: string[];     // 前の代の主人公の名前 (古い順)
  candles: number;
  createdAt: string;
}

export type MemorialPost = Omit<MemorialEntry, 'id' | 'candles' | 'createdAt'>;

// status: HTTP の状態 (0 = 届かなかった)。409 は同じ人生がもう館にある (id にその記録)
export type MemorialResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; id?: number };

export interface MemorialPage { items: MemorialEntry[]; total: number; offset: number; limit: number }

const API = '/api';
const clip = (s: string, n: number): string => [...s].slice(0, n).join('');

async function call<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<MemorialResult<T> & { meta?: unknown }> {
  try {
    const r = await fetch(`${API}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => null) as { success?: boolean; data?: T & { id?: number }; error?: string; meta?: unknown } | null;
    if (r.ok && j?.success) return { ok: true, data: j.data as T, meta: j.meta };
    return { ok: false, status: r.status, error: j?.error ?? `HTTP ${r.status}`, ...(typeof j?.data?.id === 'number' ? { id: j.data.id } : {}) };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 館のサーバがあるか。無い所 (静的な置き場) では false */
export async function memorialAvailable(timeoutMs = 1500): Promise<boolean> {
  const r = await call<{ ok: boolean }>('/health', undefined, timeoutMs);
  return r.ok && r.data?.ok === true;
}

/** 亡くなった主人公から、館に送る形を作る (サーバと同じ上限で切る) */
export function toMemorialPost(h: Hero, note = ''): MemorialPost {
  const s = summary(h);
  return {
    seed: h.seed, world: h.world.id, name: clip(h.name, 60), race: h.race, sex: h.sex, status: h.status, age: h.age,
    hazard: s.hazard ?? h.death?.hazard ?? 'age' /* 生きている主人公は postMemorial が送らない */, causeLabel: clip(s.cause ?? '', 60), causeText: clip(s.text ?? '', 400), why: clip(s.why ?? '', 200),
    highlights: s.highlights.slice(-12).map((e) => ({ age: e.age, text: clip(e.text, 200) })),
    lastWith: s.lastWith.slice(0, 3).map((t) => ({ name: clip(t.name, 60), role: t.role })),
    note: clip(note.trim(), 140), scene: sceneOf(h, s.lastWith), lang,
    ...lineagePost(h),
  };
}

// 系譜 (続けた主人公なら)。サーバと同じ上限 (12人・各60字) で切る
function lineagePost(h: Hero): { gen?: number; lineage?: string[] } {
  const l = h.lineage;
  return l && l.gen > 1 ? { gen: Math.min(999, l.gen), lineage: l.ancestors.slice(-12).map((a) => clip(a.name, 60)) } : {};
}

/** 館に残す。成功なら新しい id。409 なら同じ人生がもう残っている */
export async function postMemorial(h: Hero, note?: string): Promise<MemorialResult<{ id: number }>> {
  if (h.alive || !h.death) return { ok: false, status: 0, error: 'still alive' };
  return call('/memorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toMemorialPost(h, note)) });
}

/** 新しい順に1ページ */
// lang を渡すと、その言語で残された人生だけ (英語の画面に日本語の記録を並べないため)
export async function listMemorial(offset = 0, limit = 20, lang?: 'ja' | 'en'): Promise<MemorialResult<MemorialPage>> {
  const r = await call<MemorialEntry[]>(`/memorial?offset=${Math.max(0, Math.floor(offset))}&limit=${limit}${lang ? `&lang=${lang}` : ''}`);
  if (!r.ok) return r;
  const m = r.meta as { total: number; offset: number; limit: number };
  return { ok: true, data: { items: r.data, ...m } };
}

export const getMemorial = (id: number): Promise<MemorialResult<MemorialEntry>> => call(`/memorial/${id}`);

export const lightCandle = (id: number): Promise<MemorialResult<{ candles: number }>> => call(`/memorial/${id}/candle`, { method: 'POST' });

/** 載せるべきでない記録を知らせる。同じ人は1件に1回、何人かが知らせると非表示になる (Cloudflare 版のサーバ) */
export const reportMemorial = (id: number): Promise<MemorialResult<{ reported: boolean }>> => call(`/memorial/${id}/report`, { method: 'POST' });
