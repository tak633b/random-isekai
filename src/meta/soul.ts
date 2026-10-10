// 魂に刻まれたもの: 人生が終わったとき、まれに持っていた技を次の転生へ持っていく。
// 引くのは lifeId から作った乱数 (人生の乱数は使わない。終わった人生は変わらない)。作戦は関係しない。
// 1割で技1つ、2%で技2つ、0.5%で特典そのもの (と技1つ)。技は、その人生で身につけたもの (鍛えた・盗んだ) を先に、無ければ弱点以外の生まれ持ったもの。
// 次の転生 (おまかせ・設定した転生・同じ設定でもう一度) の始まりに一度だけ使う (main.ts の nav.start)。
// 何回も試す (trials) と系譜を続ける (この人で続ける) は使わない: 試行は同じ人生の運だけを変えるもの、系譜は輪の人として続くもの
import type { Hero, SoulCarry } from '../engine/types';
import { makeRng } from '../engine/rng';
import { traitOf } from '../engine/traits';
import { CHEATS } from '../engine/cheats';
import { L, T } from '../i18n';
import { loadProgress, saveProgress } from './store';
import type { Progress } from './types';

export const SOUL_P = { cheat: 0.005, two: 0.02, one: 0.1 } as const;

const fnv = (s: string): number => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193);
  return x >>> 0;
};

/** 終わった人生から、魂に刻まれるもの (無ければ null)。同じ lifeId なら同じ結果 */
export function rollSoul(h: Hero, lifeId: string): SoulCarry | null {
  const rng = makeRng(fnv(`soul|${lifeId}`));
  const u = rng();
  if (u >= SOUL_P.cheat + SOUL_P.two + SOUL_P.one) return null;
  const learned = (h.learned ?? []).filter((id) => h.traits.includes(id));
  const rest = h.traits.filter((id) => !learned.includes(id) && traitOf(id) && traitOf(id)!.kind !== 'weakness');
  const n = u < SOUL_P.cheat ? 1 : u < SOUL_P.cheat + SOUL_P.two ? 2 : 1;
  const traits: string[] = [];
  // 身につけたものから先に、その中では乱数で
  for (const group of [learned, rest]) {
    const g = [...group];
    while (traits.length < n && g.length) traits.push(g.splice(Math.floor(rng() * g.length), 1)[0]);
  }
  const cheat = u < SOUL_P.cheat && h.cheat ? h.cheat : undefined;
  if (!traits.length && !cheat) return null;
  // 続けて引き継いだ回数: この人生が前世から受けた技をまた持っていくなら +1
  const chain = Object.fromEntries(traits.map((id) => [id, (h.soul?.traits.includes(id) ? h.soul.chain?.[id] ?? 1 : 0) + 1]));
  return { traits, ...(cheat ? { cheat } : {}), from: h.name, chain };
}

/** 次の転生を待っているもの (まだ使っていない) */
export function pendingSoul(p: Progress = loadProgress()): SoulCarry | null {
  return p.soul && !p.soul.used ? p.soul.carry : null;
}

/** 次の転生の始まりに一度だけ受け取る (使ったしるしを残す: 同期で戻ってこないように) */
export function takeSoul(): SoulCarry | null {
  const p = loadProgress();
  const c = pendingSoul(p);
  if (c) saveProgress({ ...p, soul: { ...p.soul!, used: true } });
  return c;
}

/** 引き継ぐものの名前を並べた文 (〈剣術〉〈料理〉 / "Swordplay", "Cooking") */
export function soulNames(c: SoulCarry): string {
  const names = [...c.traits.flatMap((id) => { const t = traitOf(id); return t ? [T(t.name)] : []; }), ...(c.cheat ? [T(CHEATS[c.cheat].name)] : [])];
  return L(names.map((n) => `〈${n}〉`).join(''), names.map((n) => `"${n}"`).join(', '));
}
