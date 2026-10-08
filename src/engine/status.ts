// 生まれの身分。呼び名は世界の系統で変える (宇宙の「企業の家」、和風の「武家」など)。
// 比率は docs/research/06-society-and-powers.md の 16.2節 (農民50・町人20・商人8・下級貴族7・上級貴族と王族2・孤児6・奴隷4) を元に、
// 世界ごとに奴隷の有無と貴族の厚みを変えた。倍率は research/03 の 7-6節と research/07 の 4節
import type { Hazard, Status, World } from './types';
import { L } from '../i18n';

export const STATUSES: Status[] = ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'];
export const statusRank = (s: Status) => STATUSES.indexOf(s);

type Family = 'fantasy' | 'eastern' | 'industrial' | 'scifi' | 'modern' | 'ruin';
const familyOf = (w: World): Family =>
  w.tags.includes('scifi') ? 'scifi' : w.tags.includes('modern') ? 'modern' : w.tags.includes('ruin') ? 'ruin'
    : w.tags.includes('industrial') ? 'industrial' : w.tags.includes('eastern') ? 'eastern' : 'fantasy';

// [日本語, 英語] を STATUSES の順に
const NAMES: Record<Family, [string, string][]> = {
  fantasy: [['奴隷', 'Slave'], ['孤児', 'Orphan'], ['貧民', 'Pauper'], ['平民', 'Commoner'], ['商家', 'Merchant house'], ['騎士の家', 'Knightly house'], ['貴族', 'Noble'], ['王族', 'Royal']],
  eastern: [['奴婢', 'Bondservant'], ['捨て子', 'Foundling'], ['貧農', 'Poor peasant'], ['庶民', 'Commoner'], ['商家', 'Merchant house'], ['武家', 'Warrior house'], ['名家', 'Great house'], ['皇族', 'Imperial family']],
  industrial: [['年季奉公人', 'Indentured'], ['孤児院の子', 'Workhouse orphan'], ['貧民街', 'Slum'], ['労働者の家', 'Working family'], ['商家', 'Merchant house'], ['郷紳', 'Gentry'], ['貴族', 'Noble'], ['王族', 'Royal']],
  scifi: [['契約労働者', 'Contract labor'], ['施設育ち', 'Ward of the state'], ['スラム', 'Slum'], ['市民', 'Citizen'], ['富裕層', 'Affluent family'], ['重役の家', 'Executive family'], ['企業の家', 'Corporate dynasty'], ['財閥の当主家', 'Conglomerate heirs']],
  modern: [['借金漬け', 'Debt-bound'], ['施設育ち', 'Raised in care'], ['貧しい家', 'Poor family'], ['ふつうの家', 'Ordinary family'], ['自営業の家', 'Business family'], ['裕福な家', 'Wealthy family'], ['名家', 'Old-money family'], ['旧家の当主筋', 'Heirs of an old house']],
  ruin: [['奴隷', 'Slave'], ['拾われ子', 'Stray'], ['流れ者', 'Drifter'], ['集落の民', 'Settler'], ['交易商', 'Trader'], ['戦士の家', 'Warrior clan'], ['首長の一族', 'Chief\'s kin'], ['王を名乗る一族', 'Self-made royalty']],
};

export function statusName(s: Status, w: World): string {
  const [ja, en] = NAMES[familyOf(w)][statusRank(s)];
  return L(ja, en);
}

// 生まれの身分の重み (STATUSES の順)。農民と町人は commoner、亜人の集落は人の数に入れた
const RATIO: Record<Family, number[]> = {
  fantasy: [4, 6, 14, 56, 8, 7, 4, 1],
  eastern: [3, 4, 18, 56, 9, 7, 2.5, 0.5],
  industrial: [1, 6, 22, 50, 12, 6, 2.5, 0.5],
  scifi: [3, 4, 30, 44, 12, 5, 1.6, 0.4],
  modern: [0.5, 2, 15, 60, 14, 6, 2, 0.5],
  ruin: [8, 10, 25, 45, 6, 4, 1.6, 0.4],
};
// 貴族社会と学園の世界は物語の舞台が上流なので、上の身分を厚くする
const ACADEMY = [1, 3, 10, 40, 14, 17, 12, 3];

export function statusWeights(w: World): [Status, number][] {
  const r = w.tags.includes('nobility') ? ACADEMY : RATIO[familyOf(w)];
  return STATUSES.map((s, i) => [s, r[i]]);
}

// 身分の倍率。貴族・王族は乳幼児と病が下がり (栄養・住居・医療)、暴力と処刑が増える。奴隷・孤児・貧民は 1.3〜1.5 倍
const MULT: Record<Status, Partial<Record<Hazard, number>>> = {
  slave: { infant: 1.5, disease: 1.5, famine: 1.5, accident: 2, violence: 1.5, plague: 1.3 },
  orphan: { infant: 1.5, disease: 1.4, famine: 1.5, violence: 1.3, plague: 1.2 },
  poor: { infant: 1.3, disease: 1.3, famine: 1.4, violence: 1.2, plague: 1.2 },
  commoner: {},
  merchant: { infant: 0.8, disease: 0.8, famine: 0.6, violence: 1.1, plague: 0.9 },
  gentry: { infant: 0.8, disease: 0.8, famine: 0.5, violence: 1.3, war: 1.3, plague: 0.9 },
  noble: { infant: 0.7, disease: 0.7, famine: 0.3, violence: 1.6, war: 1.3, monster: 0.5, plague: 0.8 },
  royal: { infant: 0.6, disease: 0.6, famine: 0.2, violence: 2, war: 1.3, monster: 0.3, plague: 0.7 },
};
// 処刑・断罪の年あたりの値 (大人だけ)。上級貴族・王族の陰謀 (research/07 の 4節で処刑 3倍)、奴隷の私刑
const EXECUTION: Record<Status, number> = {
  slave: 0.0008, orphan: 0.0002, poor: 0.0002, commoner: 0.0001, merchant: 0.0002, gentry: 0.0004, noble: 0.0012, royal: 0.0025,
};

export const statusMult = (s: Status) => MULT[s];
export const statusExecution = (s: Status) => EXECUTION[s];
// 家の暮らし向きの出発点 (wealth 0–100)
export const STATUS_WEALTH: Record<Status, number> = { slave: 3, orphan: 8, poor: 18, commoner: 35, merchant: 60, gentry: 70, noble: 85, royal: 97 };
