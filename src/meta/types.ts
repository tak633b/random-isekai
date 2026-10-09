// 遊びの積み重ね (チケット・解放・図鑑・実績) の形。
// 記録はこのブラウザの localStorage にだけ置く (meta/store.ts)。使えなくても遊べる (何も残らないだけ)。
// 1つの人生は lifeId で数え、同じ人生で二度チケットや実績を出さない。
import type { CheatId, Foe, Hazard, Policy, RaceId, StartAge, Text, WorldId } from '../engine/types';

// 人生の id。最初の主人公の seed と、代を重ねたなら系譜の鍵の並びから決まる (meta/facts.ts の lifeIdOf)
export type LifeId = string;

// 解放できるもの。trait は TraitDef.id、cheat は CheatId など、種類と id の組で持つ
export type UnlockKind = 'custom' | 'world' | 'race' | 'cheat' | 'blessing' | 'startAge' | 'trait' | 'status';
export type UnlockKey = `${UnlockKind}:${string}`; // 例 'world:dark' 'trait:sk.swordplay' 'custom:setup'

// 1つの人生から読み取った事実。実績の条件とチケットの加算はこれだけを見る (Hero を直接見ない)
export interface LifeFacts {
  lifeId: LifeId;
  ended: boolean;           // 最後まで生きた (亡くなって終わった)。中断・生きている途中は false
  random: boolean;          // おまかせ転生 (と、その代を継いだ人生)
  name: string;
  world: WorldId;
  race: RaceId;
  sex: 'F' | 'M';
  status: string;
  cheat: CheatId | null;
  traits: string[];
  arrival: string;
  startAge?: StartAge;
  blessing: boolean;
  age: number;              // 享年 (実年齢)
  heq: number;              // 人間換算の享年
  hazard: Hazard | null;    // 死因の分類
  deathId: string | null;   // DeathDef.id
  job: string | null;
  rank: string | null;
  level: number;
  flags: string[];          // 立ったしるし (arc.legend, famous, hero, demonKingSlain, exiled ...)
  marriages: number;
  children: number;
  foesMet: number;
  foesWon: number;
  foesLost: number;
  foeKinds: string[];       // 図鑑の id (meta/bestiary.ts)
  foeKindsWon: string[];
  encounters: string[];     // 出会い図鑑の id
  reincMet: number;
  reincFought: number;
  gen: number;              // 何代目か (1 から)
  maxBond: number;
  outlivedAll: boolean;     // 輪の全員より長く生きた
  lifespanRatio: number;    // 享年 ÷ その世界・種族の寿命の目安
  firstYearAdventure: boolean; // 冒険に出たその年に亡くなった
  eventIds: string[];       // 起きた出来事の id (秘密の実績の条件に)
  tactic: Policy | 'mixed'; // 一生を通した作戦 (途中で変えたら mixed)
}

// 一生を通した合計 (このブラウザでの)
export interface Totals {
  lives: number;
  randomLives: number;
  years: number;
  foesDefeated: number;
  ticketsEarned: number;
  maxGen: number;
  reincMet: number;
}

// 実績の条件。データ (src/data/achievements.ts) に宣言で書き、meta/achievements.ts が評価する
export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { total: keyof Totals; gte: number }                     // 合計
  | { fact: keyof LifeFacts; gte?: number; lte?: number; eq?: string | number | boolean } // その人生の事実
  | { has: 'flags' | 'traits' | 'foeKinds' | 'foeKindsWon' | 'encounters' | 'eventIds'; id: string } // その人生に含む
  | { distinct: 'worlds' | 'races' | 'cheats' | 'deaths' | 'foeKinds' | 'encounters'; gte: number; random?: boolean } // これまでに数えた種類の数
  | { everyWorld: true; fact?: keyof LifeFacts; gte?: number }  // 全世界で (条件を満たした人生が各世界に1つ以上)
  | { collection: 'bestiary' | 'bestiaryWon' | 'encounters' | 'unlocks' | 'achievements'; pct: number };

export type AchievementCategory =
  | 'total' | 'feat' | 'world' | 'race' | 'cheat' | 'death' | 'social' | 'generation' | 'collection' | 'secret';

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  name: Text;
  desc: Text;             // 条件を言葉で (秘密のものは解放まで伏せる)
  cond: Cond;
  hidden?: boolean;
  tickets?: number;       // 解放したときにもらえるチケット (小さく)
  when?: 'end' | 'year';  // 判定するとき (省略は人生の終わり)
}

// 図鑑の1件 (魔物・敵)
export interface BestiaryEntry {
  id: string;             // enemy.ts の姿の id (enemyKind)
  name: Text;
  worlds: WorldId[];
  foe: Foe;
  danger: number;         // 1–5
  flavor: Text;
}

// 出会い図鑑の1件 (まれな人や存在)
export interface EncounterDef {
  id: string;
  name: Text;
  flavor: Text;
  rarity: number;         // 1–5
  // その人生で出会ったかの判定: しるし、出来事の id、転生者の筋 のどれか
  flag?: string;
  eventIds?: string[];
  reincFate?: string;
}

// このブラウザに残す記録 (版つき)
export interface Progress {
  v: 1;
  tickets: number;                 // 今持っている枚数
  ticketLog: { at: number; lifeId: LifeId; name: string; world: WorldId; gain: number; parts: { label: string; n: number }[] }[];
  granted: LifeId[];               // チケットと実績を出し終えた人生 (上限つき)
  unlocked: UnlockKey[];
  seen: UnlockKey[];               // おまかせの人生で見たもの (値引きと「見た」の印)
  totals: Totals;
  distinct: Partial<Record<'worlds' | 'races' | 'cheats' | 'deaths' | 'foeKinds' | 'encounters', string[]>>;
  worldsDone: Partial<Record<WorldId, number>>; // その世界で一生を終えた回数
  bestiary: Record<string, { met: number; won: number; first: { name: string; world: WorldId; at: number } }>;
  encounters: Record<string, { n: number; first: { name: string; world: WorldId; at: number } }>;
  achievements: Record<string, { at: number; name: string; world: WorldId }>;
  // ここから下は後から足したもの (古い記録には無い)
  distinctRandom?: Progress['distinct'];   // おまかせの人生だけで数えた種類 (Cond の distinct の random: true)
  worldBest?: Partial<Record<WorldId, Partial<Record<keyof LifeFacts, number>>>>; // 世界ごとの、数の事実の最大 (真偽は 1/0)。Cond の everyWorld に
}
