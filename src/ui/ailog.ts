// AI が書き足した年表の文。Hero は書き換えず、人生ごとに横に持つ (続きからの保存にも残す)
import type { Hero } from '../engine/types';
import type { AiEntry } from '../ai/apply';
import { load, save } from './dom';

const KEY = 'current-ai';
const notes = new WeakMap<Hero, AiEntry[]>();

export const aiOf = (h: Hero): AiEntry[] => notes.get(h) ?? [];
export function addAi(h: Hero, e: AiEntry): void { notes.set(h, [...aiOf(h), e]); }
export const saveAi = (h: Hero | null): void => save(KEY, h ? aiOf(h) : null);
// 続きから: 保存してあった文を、読み直した Hero に付け直す
export function restoreAi(h: Hero): void {
  const list = load<AiEntry[] | null>(KEY, null);
  if (Array.isArray(list)) notes.set(h, list.filter((e) => e && typeof e.text === 'string' && typeof e.age === 'number').map((e) => ({ ...e, ai: true as const })));
}
