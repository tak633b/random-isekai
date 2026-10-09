// 九死に一生: 毎年の死の引き (life.ts の advanceYear) が、死ぬ線のすぐ上 (CLOSE_BAND 倍まで) に落ちた年。
// 引いた数を読むだけで、乱数は引かない。一生に CLOSE_MAX 回まで。年表に一文 (LogEntry.close) と、しるし closeCall を残す。
// 一文はその年の前の年 (死の引きは年を取る前) に置く: その年の出来事の「ほかに記録が無い年」の判定を変えないため
import type { Hero } from './types';
import { hazards, HAZARDS } from './mortality';
import { anchorsOf } from './anchor';
import { log } from './bonds';
import { fill } from './events';
import { CLOSE, CLOSE_MAGIC } from '../data/closecalls';
import { L } from '../i18n';

export const CLOSE_BAND = 1.6;
export const CLOSE_MAX = 3;
// テスト用: 切ると九死に一生を書かない (書いても人生が変わらないことを確かめるため)
export const CLOSE_SW = { on: true };

export const closeCount = (h: Hero): number => h.log.filter((e) => e.close).length;

/** 死の引き r が、死の確率 q のすぐ上なら九死に一生にする */
export function maybeClose(h: Hero, r: number, q: number): void {
  if (!CLOSE_SW.on || !h.alive || q >= 1 || r < q || r >= q * CLOSE_BAND || anchorsOf(h) || closeCount(h) >= CLOSE_MAX) return;
  const z = hazards(h);
  // いちばん危なかった死因 (老いは、ほかが無いときだけ)
  const hz = HAZARDS.filter((k) => k !== 'age' && z[k] > 0).sort((a, b) => z[b] - z[a])[0] ?? 'age';
  // 走馬灯と女神の声は魔法のある世界で、仲間の回復魔法はそばに仲間がいるときだけ
  const mates = h.people.some((t) => t.alive && t.until === undefined && (t.role === 'companion' || t.role === 'familiar' || t.role === 'master'));
  const extra = h.world.magic >= 2 && hz !== 'infant' ? CLOSE_MAGIC.filter((_, i) => i === 0 || mates) : [];
  const pool = [...(CLOSE[hz] ?? CLOSE.accident!), ...extra];
  const [ja, en] = pool[(h.seed + h.age * 7) % pool.length];
  h.flags.closeCall = h.age;
  const e = log(h, fill(L(ja, en), h), 'hard', true);
  e.close = hz;
}
