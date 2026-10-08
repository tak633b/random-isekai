// 種族。値は docs/research/04-races-and-lifespans.md の 8.2節の表から。
// adult 成人する実年齢 / k 成人後の老化の速さ (人間 = 1) / E 暮らしの外因死の倍率 / fertility 年あたり子を授かる確率 / maxAge 実年齢の上限
import type { Race, RaceId } from './types';

type Row = [ja: string, en: string, adult: number, k: number, E: number, fertility: number, maxAge: number];

const ROWS: Record<RaceId, Row> = {
  human: ['人間', 'Human', 16, 1.0, 1.0, 0.30, 110],
  elf: ['エルフ', 'Elf', 100, 0.1, 0.4, 0.01, 1000],
  half_elf: ['ハーフエルフ', 'Half-elf', 20, 0.4, 1.3, 0.10, 250],
  dark_elf: ['ダークエルフ', 'Dark elf', 80, 0.12, 1.5, 0.02, 800],
  dwarf: ['ドワーフ', 'Dwarf', 45, 0.22, 1.2, 0.03, 450],
  halfling: ['ハーフリング', 'Halfling', 20, 0.55, 0.7, 0.25, 180],
  // 獣人は 8.2節の「獣人(一般)」を犬・猫・狼に、兎人と狐人は表のそれぞれの行
  beast_dog: ['犬の獣人', 'Dogfolk', 14, 1.1, 1.4, 0.32, 85],
  beast_cat: ['猫の獣人', 'Catfolk', 14, 1.1, 1.4, 0.32, 85],
  beast_wolf: ['狼の獣人', 'Wolffolk', 14, 1.1, 1.4, 0.32, 85],
  beast_rabbit: ['兎の獣人', 'Rabbitfolk', 12, 1.2, 1.8, 0.40, 75],
  beast_fox: ['狐の獣人', 'Foxfolk', 15, 0.7, 1.0, 0.15, 300],
  // 竜人は長命型の行 (異世界ものでは長く生きる側で描かれることが多い)
  dragonkin: ['竜人', 'Dragonkin', 40, 0.15, 1.0, 0.025, 600],
  demon: ['魔族', 'Demonkin', 20, 0.12, 2.0, 0.03, 1000],
  // 吸血鬼は老いない (k = 0)。上限は表に無いので、物語の「数千年」から置いた
  vampire: ['吸血鬼', 'Vampire', 18, 0, 2.0, 0, 3000],
  oni: ['鬼', 'Oni', 18, 0.2, 1.5, 0.05, 500],
  goblin: ['ゴブリン', 'Goblin', 5, 3.0, 5.0, 0.9, 45],
  orc: ['オーク', 'Orc', 13, 1.3, 2.0, 0.40, 70],
  lizardfolk: ['リザードマン', 'Lizardfolk', 12, 1.0, 1.3, 0.25, 100],
  merfolk: ['人魚', 'Merfolk', 20, 0.25, 0.8, 0.04, 400],
  winged: ['有翼人', 'Winged folk', 16, 0.8, 1.2, 0.20, 130],
  // 妖精の上限は表の「不老型あり」を外した短命型。60 は平均寿命30の倍
  fairy: ['妖精', 'Fairy', 3, 2.0, 2.0, 0.05, 60],
  // スライムの k は表の「0〜5」の中ほど。上限は不老型を外して置いた
  slime: ['スライム', 'Slime', 1, 3.0, 4.0, 0.2, 60],
  // ホムンクルスとアンドロイドは成体で作られる (adult 0: 乳幼児期と子ども期が無い)
  homunculus: ['ホムンクルス', 'Homunculus', 0, 4.0, 1.5, 0, 40],
  // ponytail: アンドロイドの「摩耗と型落ちの廃棄」は老化 k = 1 で代用。廃棄の出来事は data 側に任せる
  android: ['アンドロイド', 'Android', 0, 1.0, 1.0, 0, 100],
  cyborg: ['サイボーグ', 'Cyborg', 16, 0.8, 1.5, 0.15, 130],
  mutant: ['ミュータント', 'Mutant', 14, 1.5, 2.0, 0.35, 90],
  alien: ['異星人', 'Alien', 40, 0.25, 0.5, 0.02, 400],
};

// 生まれる系統の決まった種族 (World.races の重みが無い世界には出ない。tags はその目印)
const ONLY: Partial<Record<RaceId, Race['tags']>> = {
  android: ['scifi', 'ruin'], cyborg: ['scifi', 'ruin'], mutant: ['scifi', 'ruin'], alien: ['scifi'],
};

export const RACE_IDS = Object.keys(ROWS) as RaceId[];

export const RACES: Record<RaceId, Race> = Object.fromEntries(RACE_IDS.map((id) => {
  const [ja, en, adult, k, E, fertility, maxAge] = ROWS[id];
  const tags = ONLY[id];
  return [id, { id, name: { ja, en }, adult, k, E, fertility, maxAge, ...(tags ? { tags } : {}) }];
})) as Record<RaceId, Race>;

export const raceOf = (id: RaceId): Race => RACES[id];
