// ひと息 (「80억 분의 1」の、人生の節目で立ち止まる問いを異世界に)。人間換算 5・15・30・50・70歳を越えた年に、
// この主人公の一生を遊んでいる人の一生につなぐ問いを1つ出す。答え (一行のメモ) は Hero.notes に残り、死亡記録に載る。
// 人生の乱数には触らない (問いは seed と節目から決まる)。画面の側 (ui/pause.ts) が出し、待たせすぎないようにする
import type { Hero } from './types';
import { REFLECT } from '../data/reflect';
import { heq } from './mortality';
import { raceOf } from './races';
import { agingOf } from './mortality';
import { byRole } from './bonds';
import { worldNames } from './names';
import { isEn } from '../i18n';

export const PAUSE_HEQ = [5, 15, 30, 50, 70] as const;
export const NOTE_MAX = 80;

/** prevAge の年から今の年までに越えた節目 (いちばん新しい1つ)。もう聞いた節目と、ほかの人の一生では null */
export function pauseDue(h: Hero, prevAge: number): number | null {
  if (!h.alive || h.setup.anchors || prevAge >= h.age) return null;
  const r = raceOf(h.race), ag = agingOf(h);
  const now = heq(h.age, r, ag), before = heq(prevAge, r, ag);
  let hit: number | null = null;
  for (const m of PAUSE_HEQ) if (now >= m && before < m && !h.notes?.some((n) => n.at === m)) hit = m;
  return hit;
}

function mix(a: number, b: number): number {
  let x = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ b;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/** その節目の問い (今の言語)。合う問いから seed で1つ */
export function pauseQuestion(h: Hero, at: number): string {
  const pool = REFLECT.filter((q) => q.at === at && (!q.when || q.when(h)));
  const q = pool[mix(h.seed, at) % pool.length];
  const n = worldNames(h);
  const sp = byRole(h, 'spouse');
  return (isEn ? q.en : q.ja).replace(/\{name\}/g, h.given).replace(/\{town\}/g, n.town).replace(/\{spouse\}/g, sp?.name ?? '');
}

/** 答えを残す (空なら「何も書かなかった」として、同じ節目をもう聞かない) */
export function keepNote(h: Hero, at: number, q: string, text: string): void {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
  h.notes = [...(h.notes ?? []).filter((n) => n.at !== at), { at, age: h.age, q, text: t }];
}
