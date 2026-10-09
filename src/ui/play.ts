// 自動再生の速さ。1年に何秒かけるかを、種族の寿命と、その年に何が起きたかで決める。
import type { Hero } from '../engine/types';
import { lifeTableFor, raceOf } from '../engine';
import { load, save } from './dom';

// 人間の寿命の種族で 1年 = 10秒 (1×)。4秒では「1×でも早い」と感じられたため2.5倍に。年表の数行と動く場面を眺められる長さ
export const BASE_SEC = 10;
// 長命の種族は、寿命の目安が 100年を超えるぶんだけ縮める (エルフの数百年を同じくらいの時間で見終えるため)
export const SPAN_REF = 100;
// どんなに長命でも、1×の1年はこれより短くしない (場面と年表が追える下限)
export const MIN_SEC = 1;
// 何も起きなかった年は半分で流す (読むものが少ない。0.25 では飛ばしすぎて年の区切りが見えなかった)
export const QUIET_FACTOR = 0.5;
// 記録が3行以上の年は1行ごとに 1.15 倍 (上限 1.6 倍)。読む量に合わせる
export const LINES_FROM = 3, LINE_FACTOR = 1.15, LINES_MAX = 1.6;
// 目立つ出来事 (big) のある年は 1.2 倍
export const BIG_FACTOR = 1.2;
// 戦いのある年は「戦いの演出の全長 + 4秒 (年表を読む分)」より短くしない
export const FIGHT_READ_SEC = 4;
// 選択を選んだ後は、その年の残りを最低 3秒 (1×) 流す (選んだ結果を読む間)
export const AFTER_CHOICE_SEC = 3;
// 不死の体などで 200年を超えたら半分 (老いで終わらない人生を見終えられるように)。下限 MIN_SEC は守る
export const LONG_AGE = 200;
export const LONG_FACTOR = 0.5;
// 2×〜16×で割った後の1年の下限 (秒)。「次の選択まで」はこれを使わない
export const MIN_SCALED_SEC = 0.1;
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

// 1×での、その年の秒数。fightSec は戦いの演出の全長 (stage.ts の FIGHT_MS / 1000)
export function yearSec(h: Hero, span: number, fightSec: number): number {
  const es = h.log.filter((e) => e.age === h.age);
  let s = BASE_SEC * Math.min(1, SPAN_REF / span);
  if (quietYear(h)) s *= QUIET_FACTOR;
  if (es.length >= LINES_FROM) s *= Math.min(LINES_MAX, LINE_FACTOR ** (es.length - LINES_FROM + 1));
  if (es.some((e) => e.big)) s *= BIG_FACTOR;
  if (h.age > LONG_AGE) s *= LONG_FACTOR;
  s = Math.max(MIN_SEC, s);
  if (es.some((e) => e.fight)) s = Math.max(s, fightSec + FIGHT_READ_SEC);
  return s;
}

// 速さで割った後の、1年にかける時間 (ミリ秒)
export const scaledMs = (yearMs: number, speed: number, ff: boolean): number => (ff ? yearMs / FF_SPEED : Math.max(MIN_SCALED_SEC * 1000, yearMs / speed));
// 再生の状態 (中断→続きからで戻す)。自動で決めるかは Hero.auto が持つ
export interface PlayState { speed: number; paused: boolean }
const KEY = 'play';
export function loadPlay(): PlayState {
  const p = load<Partial<PlayState>>(KEY, {});
  return { speed: SPEEDS.includes(p.speed as 1) ? p.speed! : 1, paused: p.paused === true };
}
export const savePlay = (p: PlayState): void => save(KEY, p);
