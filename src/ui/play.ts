// 自動再生の速さ。1年に何秒かけるかを、種族の寿命と、その年に何が起きたかで決める。
import type { Hero } from '../engine/types';
import { lifeTableFor, raceOf } from '../engine';
import { load, save } from './dom';

// 人間の寿命の種族で 1年 = 4秒 (1×)。年表の1〜2行を読める長さ。Unchosen の26秒は1年に読む量が多い作りのため短くした
export const BASE_SEC = 4;
// 長命の種族は、寿命の目安が 100年を超えるぶんだけ縮める (エルフの数百年を同じくらいの時間で見終えるため)
export const SPAN_REF = 100;
// どんなに長命でも 1年はこれより短くしない (場面と年表が追える下限)
export const MIN_SEC = 0.3;
// 何も起きなかった年は 4分の1 で流す (読むものが無い)
export const QUIET_FACTOR = 0.25;
// 不死の体などで 200年を超えたら、さらに半分 (老いで終わらない人生を見終えられるように)
export const LONG_AGE = 200;
export const LONG_FACTOR = 0.5;
export const SPEEDS = [1, 2, 4, 8, 16] as const;
// 「次の選択まで」は 1×の何倍で流すか
export const FF_SPEED = 200;

// 寿命の目安: 成人まで生きた人の平均享年 (その世界・種族の生命表から)。出せなければ種族の上限
export function lifeSpan(h: Hero): number {
  const r = raceOf(h.race);
  const l = lifeTableFor(h.world, h.race).l;
  const a = Math.min(r.adult, l.length - 2);
  if (a < 0 || !(l[a] > 0)) return r.maxAge;
  let e = 0;
  for (let x = a; x < l.length - 1; x++) e += (l[x] + l[x + 1]) / 2;
  return Math.max(1, Math.min(r.maxAge, a + e / l[a]));
}

// その年が「何も起きなかった年」か: 選択も big も無く、記録が穴埋めの1行以下
export function quietYear(h: Hero): boolean {
  const es = h.log.filter((e) => e.age === h.age);
  return !h.pending.length && es.length <= 1 && !es.some((e) => e.big || e.who?.length);
}

// 1×での、その年の秒数
export function yearSec(h: Hero, span: number, quiet: boolean): number {
  let s = Math.max(MIN_SEC, BASE_SEC * Math.min(1, SPAN_REF / span));
  if (quiet) s *= QUIET_FACTOR;
  if (h.age > LONG_AGE) s *= LONG_FACTOR;
  return s;
}

// 再生の状態 (中断→続きからで戻す)。自動で決めるかは Hero.auto が持つ
export interface PlayState { speed: number; paused: boolean }
const KEY = 'play';
export function loadPlay(): PlayState {
  const p = load<Partial<PlayState>>(KEY, {});
  return { speed: SPEEDS.includes(p.speed as 1) ? p.speed! : 1, paused: p.paused === true };
}
export const savePlay = (p: PlayState): void => save(KEY, p);
