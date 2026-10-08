// 職業。就ける世界 (tags・tech・magic)、身分の条件、死の危険の倍率、伸びる能力、暮らし向き。
// 危険の倍率は docs/research/07-life-events-and-deaths.md の 4節 (立場ごとの死因の偏り) と
// docs/research/05-classes-magic-guilds.md の 9.4節 (職業ごとの上乗せ) から。
// risk は世界の基準のハザードにかける倍率、add は基準に無い死因 (魔法・処刑) や職業そのものの危険に足す年あたりの値
import type { Hazard, Hero, JobId, StatKey, Status, Talent, World, WorldTag } from './types';
import { statusRank } from './status';
import { traitOf } from './traits';

type Mult = Partial<Record<Hazard, number>>;

export interface JobDef {
  id: JobId;
  ja: string; en: string;
  tags?: WorldTag[];          // 世界がこのどれかを持てば就ける (省略 = どこでも)
  not?: WorldTag[];
  tech?: [number, number];
  magic?: number;
  powers?: number;
  minStatus?: Status;         // この身分以上
  maxStatus?: Status;         // この身分以下
  risk: Mult;
  add?: Mult;
  war?: boolean;              // 戦争の年に従軍する
  aging?: number;             // 老化の速さ (仙侠の修行者)
  grow: Partial<Record<StatKey, number>>; // 就いている年ごとに伸びる能力
  wealth: number;             // 暮らし向きの目安 0–100
  w: number;                  // 自動で就くときの重み (research/05 の 9.2節の人口比のおおよそ)
  talent?: Talent;            // この才能があると就きやすい
  retire?: number;            // 人間換算でこの年齢を過ぎると隠居する (省略 = 60)
  special?: boolean;          // 選べない (勇者・聖女は節目の出来事でなる)
}

const FANTASY: WorldTag[] = ['fantasy', 'eastern'];
const PRE_MODERN: [number, number] = [0, 6];
const HIGH_TECH: [number, number] = [7, 10];

const LIST: JobDef[] = [
  { id: 'farmer', ja: '農民', en: 'Farmer', tech: PRE_MODERN, risk: { famine: 1.3, monster: 1.2 }, grow: { power: 0.3, hp: 0.1 }, wealth: 25, w: 60, maxStatus: 'merchant' },
  { id: 'merchant', ja: '商人', en: 'Merchant', risk: { violence: 1.2, monster: 0.6, famine: 0.6 }, grow: { charm: 0.5, mind: 0.3 }, wealth: 60, w: 6, talent: 'charm', minStatus: 'poor' },
  { id: 'smith', ja: '鍛冶師', en: 'Smith', tech: PRE_MODERN, risk: { accident: 1.3, monster: 0.5 }, grow: { power: 0.5 }, wealth: 45, w: 4, talent: 'craft', retire: 58 },
  { id: 'alchemist', ja: '錬金術師', en: 'Alchemist', tech: [2, 7], magic: 1, risk: { accident: 1.5 }, add: { magic: 0.003 }, grow: { mind: 0.6 }, wealth: 55, w: 0.6, talent: 'craft' },
  { id: 'herbalist', ja: '薬師', en: 'Herbalist', tech: PRE_MODERN, risk: { disease: 1.1, plague: 1.5 }, grow: { mind: 0.4 }, wealth: 40, w: 1.5, talent: 'wits' },
  { id: 'priest', ja: '聖職者', en: 'Priest', tags: ['fantasy', 'eastern', 'industrial', 'myth'], risk: { disease: 1.5, plague: 1.5, monster: 0.5, violence: 0.5 }, grow: { mind: 0.3, charm: 0.3 }, wealth: 45, w: 1.5, retire: 75 },
  { id: 'knight', ja: '騎士', en: 'Knight', tags: ['fantasy'], minStatus: 'gentry', risk: { violence: 2, monster: 1.5 }, war: true, grow: { power: 0.8 }, wealth: 65, w: 3, talent: 'might', retire: 48 },
  { id: 'soldier', ja: '兵士', en: 'Soldier', not: ['modern'], risk: { violence: 1.5, monster: 1.5, disease: 1.2 }, war: true, grow: { power: 0.7 }, wealth: 30, w: 3, talent: 'might', retire: 40 },
  { id: 'mercenary', ja: '傭兵', en: 'Mercenary', not: ['modern'], risk: { violence: 2.5, monster: 2 }, add: { violence: 0.01 }, war: true, grow: { power: 1 }, wealth: 35, w: 0.8, talent: 'might', retire: 42 },
  { id: 'adventurer', ja: '冒険者', en: 'Adventurer', tags: ['fantasy'], risk: { monster: 4, violence: 2, accident: 1.5, disease: 0.8 }, grow: { power: 1, luck: 0.2 }, wealth: 40, w: 2, talent: 'might', retire: 42 },
  { id: 'mage', ja: '魔法使い', en: 'Mage', magic: 2, risk: { monster: 1.5, accident: 1.5 }, add: { magic: 0.004 }, grow: { mind: 1 }, wealth: 55, w: 0.5, talent: 'magic', retire: 90 },
  { id: 'scholar', ja: '学者', en: 'Scholar', risk: { violence: 0.8, monster: 0.5 }, add: { execution: 0.0005 }, grow: { mind: 0.8 }, wealth: 50, w: 0.5, talent: 'wits', minStatus: 'commoner', retire: 80 },
  { id: 'bard', ja: '吟遊詩人', en: 'Bard', tech: PRE_MODERN, risk: { violence: 1.5, monster: 1.2 }, grow: { charm: 0.8 }, wealth: 30, w: 0.5, talent: 'charm' },
  { id: 'thief', ja: '盗賊', en: 'Thief', not: ['scifi'], risk: { violence: 3 }, add: { execution: 0.006 }, grow: { luck: 0.5, power: 0.3 }, wealth: 30, w: 0.5, maxStatus: 'commoner', retire: 40 },
  { id: 'tamer', ja: 'テイマー', en: 'Tamer', tags: ['fantasy', 'eastern'], risk: { monster: 2 }, grow: { charm: 0.4, power: 0.3 }, wealth: 40, w: 0.3 },
  { id: 'cook', ja: '料理人', en: 'Cook', risk: { accident: 1.1, monster: 0.5 }, grow: { charm: 0.3 }, wealth: 40, w: 3, talent: 'craft' },
  { id: 'lord', ja: '領主', en: 'Lord', tags: FANTASY, minStatus: 'noble', risk: { violence: 2, war: 0.5, monster: 0.3, disease: 0.8 }, add: { execution: 0.002 }, war: true, grow: { charm: 0.4, mind: 0.4 }, wealth: 90, w: 10, retire: 65 },
  { id: 'servant', ja: '使用人', en: 'Servant', maxStatus: 'commoner', risk: { accident: 1.2, monster: 0.5 }, grow: { charm: 0.2 }, wealth: 20, w: 6 },
  { id: 'hunter', ja: '狩人', en: 'Hunter', tech: PRE_MODERN, not: ['industrial'], risk: { monster: 2, accident: 1.3 }, grow: { power: 0.6, luck: 0.2 }, wealth: 30, w: 3, talent: 'might' },
  { id: 'sailor', ja: '船乗り', en: 'Sailor', tags: ['sea', 'fantasy', 'industrial', 'eastern'], tech: [2, 7], risk: { accident: 3, disease: 1.2 }, grow: { power: 0.5 }, wealth: 35, w: 2 },
  { id: 'miner', ja: '鉱夫', en: 'Miner', not: ['modern'], risk: { accident: 2.5, monster: 1.2, disease: 1.2 }, grow: { power: 0.6 }, wealth: 25, w: 2, maxStatus: 'commoner', retire: 50 },
  { id: 'assassin', ja: '暗殺者', en: 'Assassin', not: ['modern'], risk: { violence: 6 }, add: { execution: 0.01 }, grow: { power: 0.6, luck: 0.3 }, wealth: 50, w: 0.1, retire: 40 },
  { id: 'necromancer', ja: '死霊術師', en: 'Necromancer', magic: 2, risk: { monster: 1.5 }, add: { magic: 0.01, execution: 0.01 }, grow: { mind: 1 }, wealth: 40, w: 0.05, talent: 'magic', retire: 90 },
  { id: 'hero', ja: '勇者', en: 'Hero', tags: FANTASY, risk: { monster: 3, violence: 2, disease: 0.5 }, add: { war: 0.02 }, war: true, grow: { power: 2, fame: 2 }, wealth: 70, w: 0, special: true, retire: 50 },
  { id: 'saint', ja: '聖女', en: 'Saint', tags: FANTASY, risk: { disease: 1.5, violence: 2, monster: 0.5 }, add: { magic: 0.002, execution: 0.002 }, grow: { mind: 0.8, fame: 1.5, charm: 0.5 }, wealth: 70, w: 0, special: true, retire: 70 },
  // 東洋
  { id: 'samurai', ja: '侍', en: 'Samurai', tags: ['japan'], minStatus: 'gentry', risk: { violence: 2, monster: 1.3 }, war: true, grow: { power: 0.8 }, wealth: 60, w: 4, talent: 'might', retire: 55 },
  { id: 'onmyoji', ja: '陰陽師', en: 'Onmyoji', tags: ['japan'], magic: 2, risk: { monster: 1.5 }, add: { magic: 0.004 }, grow: { mind: 1 }, wealth: 55, w: 0.6, talent: 'magic', retire: 80 },
  // 仙侠の修行者: 研究 03 の 7-7節 (修行の失敗と門派抗争を足す)。老いの遅れは職業ではなく修行の段階のしるしで決める (mortality.ts の agingOf)
  { id: 'cultivator', ja: '修行者', en: 'Cultivator', tags: ['cultivation'], magic: 3, risk: { violence: 2, monster: 1.5 }, add: { magic: 0.01 }, grow: { power: 0.8, mind: 0.8 }, wealth: 40, w: 1.5, talent: 'magic', retire: 400 },
  { id: 'ninja', ja: '忍', en: 'Ninja', tags: ['japan'], risk: { violence: 4 }, add: { execution: 0.003 }, grow: { power: 0.6, luck: 0.4 }, wealth: 40, w: 0.4, retire: 45 },
  // 産業
  { id: 'engineer', ja: '技師', en: 'Engineer', tech: [6, 10], risk: { accident: 1.3, monster: 0.5 }, grow: { mind: 0.6 }, wealth: 60, w: 4, talent: 'craft', minStatus: 'poor' },
  { id: 'factory', ja: '工員', en: 'Factory worker', tech: [6, 7], risk: { accident: 2.5, disease: 1.3 }, grow: { power: 0.2 }, wealth: 25, w: 35, maxStatus: 'merchant' },
  { id: 'airship', ja: '飛行船乗り', en: 'Airship crew', tags: ['industrial'], risk: { accident: 3 }, grow: { power: 0.3, luck: 0.3 }, wealth: 40, w: 2 },
  // 近未来・宇宙
  { id: 'corp', ja: '企業勤め', en: 'Corporate worker', tech: [8, 10], risk: { violence: 0.8, monster: 0.5 }, grow: { mind: 0.3 }, wealth: 55, w: 35 },
  { id: 'hacker', ja: 'ハッカー', en: 'Hacker', tech: [8, 10], risk: { violence: 2 }, add: { execution: 0.001 }, grow: { mind: 0.8 }, wealth: 45, w: 1.5, talent: 'wits' },
  { id: 'pilot', ja: 'パイロット', en: 'Pilot', tech: [8, 10], risk: { accident: 2 }, war: true, grow: { power: 0.3, luck: 0.3 }, wealth: 55, w: 2 },
  { id: 'medic', ja: '医師', en: 'Medic', tech: HIGH_TECH, risk: { disease: 1.1, violence: 0.8 }, grow: { mind: 0.6 }, wealth: 70, w: 2, talent: 'wits', minStatus: 'commoner' },
  { id: 'researcher', ja: '研究者', en: 'Researcher', tech: HIGH_TECH, risk: { accident: 1.1 }, grow: { mind: 0.8 }, wealth: 60, w: 2, talent: 'wits', minStatus: 'commoner', retire: 75 },
  // 現代
  { id: 'office', ja: '会社員', en: 'Office worker', tech: [7, 8], tags: ['modern', 'scifi'], risk: { violence: 0.8 }, grow: { mind: 0.2 }, wealth: 55, w: 45 },
  // 現代ダンジョンの探索者は一般人の表に年 0.01〜0.03 の職業死を足す (research/03 の 7-4節)
  { id: 'explorer', ja: '探索者', en: 'Dungeon explorer', tags: ['modern'], risk: { monster: 4, accident: 1.5 }, add: { monster: 0.015 }, grow: { power: 1, luck: 0.2 }, wealth: 50, w: 2, talent: 'might', retire: 45 },
  { id: 'police', ja: '警官', en: 'Police officer', tech: [6, 10], risk: { violence: 2.5 }, grow: { power: 0.4 }, wealth: 45, w: 2, retire: 60 },
  // 文明の後: 廃墟漁りは最も危ない仕事 (research/05 の 9.4節で年 +5%)
  { id: 'scavenger', ja: '廃墟漁り', en: 'Scavenger', tags: ['ruin'], risk: { monster: 3, accident: 2 }, add: { accident: 0.02 }, grow: { power: 0.5, luck: 0.3 }, wealth: 25, w: 25 },
  { id: 'raider', ja: '略奪者', en: 'Raider', tags: ['ruin'], risk: { violence: 4, monster: 1.5 }, add: { execution: 0.004 }, war: true, grow: { power: 0.8 }, wealth: 35, w: 4, retire: 40 },
];

export const JOBS: Record<JobId, JobDef> = Object.fromEntries(LIST.map((j) => [j.id, j])) as Record<JobId, JobDef>;
export const jobOf = (id: JobId | null): JobDef | null => (id ? JOBS[id] : null);

// その世界で、その身分の主人公が就ける職業 (勇者・聖女は除く)
export function jobsIn(world: World, status: Status): JobDef[] {
  const rank = statusRank(status);
  return LIST.filter((j) => !j.special
    && (!j.tags || j.tags.some((t) => world.tags.includes(t)))
    && (!j.not || !j.not.some((t) => world.tags.includes(t)))
    && (!j.tech || (world.tech >= j.tech[0] && world.tech <= j.tech[1]))
    && (j.magic === undefined || world.magic >= j.magic)
    && (j.powers === undefined || world.powers >= j.powers)
    && (!j.minStatus || rank >= statusRank(j.minStatus))
    && (!j.maxStatus || rank <= statusRank(j.maxStatus)));
}

export const jobsFor = (h: Hero): JobDef[] => jobsIn(h.world, h.status);

// 自動で就くときの重み。才能が合えば3倍、身分の高い家は家の仕事 (領主・騎士・侍・商人) に寄る
export function jobWeight(h: Hero, j: JobDef): number {
  let w = j.w * (j.talent && j.talent === h.talent ? 3 : 1);
  if (h.status === 'merchant' && j.id === 'merchant') w *= 8;
  for (const id of h.traits) w *= traitOf(id)?.jobs?.[j.id] ?? 1; // trait の jobs: その職業に就きやすくなる
  return w;
}
