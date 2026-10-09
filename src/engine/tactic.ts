// 作戦 (Hero.policy)。いつでも変えられ、出来事・戦い・冒険の起きやすさをゆるく寄せる (決めつけはしない)。
// ふつう (バランスよく) はすべて 1 倍: 掛け算と閾値だけを変え、乱数を引く回数と順は今までと同じ (同じ seed の人生が変わらない)
import type { Hazard, Hero, Policy } from './types';
import { L } from '../i18n';

export const TACTIC_NAME: Record<Policy, string> = {
  bold: L('ガンガンいこうぜ', 'Go all out'), normal: L('バランスよく', 'Balanced'), careful: L('いのちだいじに', 'Play it safe'),
};
export const TACTICS: Policy[] = ['bold', 'normal', 'careful'];

// fight: 魔物・暴力・戦の死の危険 (自分から挑むか、退くか)。adv: 冒険と戦いの出来事の重み、ギルドに入る・大きな手柄を立てる確率
const T: Record<Policy, { fight: number; adv: number }> = {
  bold: { fight: 1.25, adv: 1.6 },
  normal: { fight: 1, adv: 1 },
  careful: { fight: 0.8, adv: 0.6 },
};
const FIGHT_HZ = new Set<Hazard>(['monster', 'violence', 'war']);

const of = (h: Pick<Hero, 'policy'>) => T[h.policy] ?? T.normal;
export const tacticFight = (h: Pick<Hero, 'policy'>, hz: Hazard): number => (FIGHT_HZ.has(hz) ? of(h).fight : 1);
export const tacticAdv = (h: Pick<Hero, 'policy'>): number => of(h).adv;
