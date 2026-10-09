// 異世界転移 (arrival 'summoned'): 元の世界の名前・年齢・仕事・持ち物を持ったまま、突然ちがう世界へ。
// 来かた・年齢・仕事・名前・持ち物は seed から作る別の乱数で引く (主人公の乱数の並びを変えない)。材料は src/data/transfer.ts
import type { CheatId, Sex, Text, TransferHow, World } from './types';
import { makeRng, pickWeighted } from './rng';
import { availableCheats, cheatWeight } from './cheats';
import { EARTH_JOBS, FAMILY, GIVEN, HOWS, ITEMS } from '../data/transfer';
import { isEn, L } from '../i18n';

export interface TransferRoll {
  how: TransferHow;
  age: number;          // 15〜45
  job: Text;
  code: string;         // 元の仕事の符号 (flags 'earth.<符号>')
  given: string;
  family: string;
  items: string[];
  cheat: CheatId;       // 特典を引かなかった人に授ける力 (転移した人は必ず何か持っている)
}

export function rollTransfer(seed: number, sex: Sex, world: World): TransferRoll {
  const r = makeRng((seed ^ 0x2545f491) >>> 0);
  // 魔法の無い世界には、召喚の陣も見習い魔術師もいない。角を曲がるか、教室ごと
  const hows = (Object.keys(HOWS) as TransferHow[]).filter((k) => world.magic >= 1 || k === 'vanish' || k === 'class');
  const how = pickWeighted(r, hows, (k) => HOWS[k][0]);
  const age = how === 'class' ? 15 + Math.floor(r() * 4) : 15 + Math.floor(r() * 31);
  const jobs = how === 'class' ? EARTH_JOBS.filter(([ja]) => ja === '高校生') : EARTH_JOBS.filter(([, , a, b]) => age >= a && age <= b);
  const j = jobs[Math.floor(r() * jobs.length)];
  const f = FAMILY[Math.floor(r() * FAMILY.length)];
  const g = GIVEN[sex][Math.floor(r() * GIVEN[sex].length)];
  const n = 1 + Math.floor(r() * 3);
  const items: string[] = [];
  for (let i = 0; i < 10 && items.length < n; i++) {
    const it = pickWeighted(r, ITEMS, (x) => x[3])[0];
    if (!items.includes(it)) items.push(it);
  }
  const cheat = pickWeighted(r, availableCheats(world), (c) => cheatWeight(c.id)).id;
  const job = j[0] === '主婦' && sex === 'M' ? ['主夫', 'homemaker'] : j;
  return { how, age, code: j[4], job: { ja: job[0], en: job[1] }, given: L(g[0], g[1]), family: L(f[0], f[1]), items, cheat };
}

/** 元の世界の名前の書き方 (日本語は 姓 名、英語は 名 姓) */
export const earthName = (given: string, family: string): string => (isEn ? `${given} ${family}` : `${family} ${given}`);

export const itemName = (id: string): string => { const x = ITEMS.find(([i]) => i === id); return x ? L(x[1], x[2]) : id; };

/** 来かたの一文 */
export function howText(how: TransferHow): string {
  const [, ja, en] = HOWS[how];
  return L(ja, en);
}
