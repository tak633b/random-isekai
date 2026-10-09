// 16の世界の型。値は docs/research/03-world-types.md の 5-2節 (つまみ) と 5-3節 (生命表の材料) をそのまま写す。
// 生命表の材料は「その世界の平民の人間」のもの。身分・種族・職業はこの上に倍率で重ねる (mortality.ts)
import type { Level4, RaceId, World, WorldChoice, WorldId, WorldTag } from './types';
import { clamp, pick, type Rng } from './rng';

type Row = [
  name: [string, string], tags: WorldTag[],
  tech: number, magic: Level4, powers: Level4, danger: number, war: number, medicine: number, law: number,
  q0: number, q5: number, ch: number, c: number, a30: number, b: number, max: number,
  races: [RaceId, number][],
];

// 生まれる種族の重みは research/04 の 8.1節の表 (剣と魔法の中世・近未来・ポストアポカリプス・スペースオペラ) を元に、
// 表にない型は research/03 の各型の「種族」の行から置いた
const FANTASY_RACES: [RaceId, number][] = [
  ['human', 60], ['beast_dog', 4], ['beast_cat', 4], ['beast_wolf', 2], ['beast_rabbit', 1], ['beast_fox', 1],
  ['elf', 6], ['dwarf', 6], ['halfling', 4], ['half_elf', 4], ['dragonkin', 2], ['demon', 2],
  ['dark_elf', 1], ['lizardfolk', 1], ['winged', 1], ['goblin', 0.5], ['orc', 0.5],
];

const ROWS: Record<WorldId, Row> = {
  medieval: [['剣と魔法の中世', 'Sword-and-Sorcery Kingdom'], ['fantasy'],
    4, 2, 1, 5, 4, 3, 4, 0.22, 0.38, 0.008, 0.010, 0.0035, 0.075, 100, FANTASY_RACES],
  dark: [['ダークファンタジー', 'Dark Fantasy'], ['fantasy', 'dark'],
    3, 3, 1, 9, 8, 1, 1, 0.30, 0.48, 0.015, 0.022, 0.0050, 0.075, 100,
    [['human', 80], ['dark_elf', 3], ['demon', 3], ['goblin', 3], ['orc', 3], ['vampire', 2], ['half_elf', 2], ['beast_wolf', 2], ['homunculus', 2]]],
  game: [['ステータスの見える世界', 'Stat-Screen World'], ['fantasy', 'gamey'],
    4, 3, 3, 6, 4, 5, 4, 0.15, 0.25, 0.006, 0.012, 0.0025, 0.080, 110,
    [...FANTASY_RACES, ['slime', 1]]],
  academy: [['貴族社会と学園', 'Noble Academy'], ['fantasy', 'nobility'],
    5, 2, 1, 2, 2, 5, 7, 0.15, 0.24, 0.005, 0.006, 0.0025, 0.080, 105,
    [['human', 90], ['elf', 3], ['half_elf', 3], ['fairy', 2], ['beast_cat', 2]]],
  wa: [['和の国', 'Land of the Rising Sun'], ['eastern', 'japan'],
    5, 2, 2, 4, 3, 4, 7, 0.19, 0.33, 0.007, 0.008, 0.0035, 0.075, 100,
    [['human', 85], ['beast_fox', 6], ['oni', 5], ['beast_wolf', 2], ['winged', 2]]],
  xianxia: [['仙侠の大陸', 'Cultivation Realm'], ['eastern', 'cultivation', 'myth'],
    3, 3, 3, 6, 5, 3, 3, 0.22, 0.38, 0.008, 0.012, 0.0030, 0.060, 150,
    [['human', 85], ['beast_fox', 5], ['demon', 4], ['dragonkin', 3], ['beast_wolf', 3]]],
  steampunk: [['蒸気と魔導の都', 'Steam and Arcana'], ['industrial'],
    6, 1, 1, 3, 5, 4, 5, 0.15, 0.25, 0.006, 0.007, 0.0030, 0.080, 100,
    [['human', 80], ['dwarf', 7], ['beast_dog', 4], ['beast_cat', 4], ['homunculus', 3], ['halfling', 2]]],
  cyberpunk: [['ネオンの巨大都市', 'Neon Megacity'], ['scifi', 'dark'],
    8, 0, 2, 6, 4, 7, 2, 0.012, 0.016, 0.0004, 0.0025, 0.0008, 0.090, 115,
    [['human', 60], ['cyborg', 20], ['android', 15], ['mutant', 5]]],
  space: [['星々の帝国', 'Galactic Empire'], ['scifi'],
    10, 0, 2, 3, 7, 9, 6, 0.004, 0.005, 0.0002, 0.0015, 0.0003, 0.085, 130,
    [['human', 40], ['alien', 40], ['android', 15], ['cyborg', 5]]],
  modern: [['ダンジョンのある現代', 'Modern Day with Dungeons'], ['modern'],
    7, 1, 2, 3, 1, 9, 8, 0.002, 0.003, 0.0002, 0.0012, 0.0003, 0.100, 110,
    [['human', 100]]],
  postapoc: [['文明の後', 'After the Fall'], ['ruin', 'dark'],
    3, 1, 2, 9, 7, 2, 1, 0.20, 0.35, 0.012, 0.020, 0.0045, 0.080, 95,
    [['human', 50], ['mutant', 35], ['android', 10], ['cyborg', 5]]],
  ocean: [['海と群島', 'Archipelago'], ['fantasy', 'sea'],
    4, 2, 1, 5, 4, 3, 4, 0.20, 0.34, 0.008, 0.012, 0.0035, 0.075, 100,
    [['human', 70], ['merfolk', 15], ['lizardfolk', 5], ['beast_cat', 5], ['winged', 5]]],
  desert: [['砂漠の遊牧の地', 'Desert of Nomads'], ['fantasy', 'desert'],
    3, 2, 1, 6, 6, 2, 3, 0.22, 0.37, 0.009, 0.012, 0.0035, 0.075, 100,
    [['human', 70], ['lizardfolk', 10], ['beast_fox', 8], ['beast_dog', 7], ['dragonkin', 5]]],
  beast: [['獣人の森', 'Beastfolk Wilds'], ['fantasy', 'rural'],
    3, 1, 2, 6, 5, 2, 4, 0.18, 0.32, 0.008, 0.012, 0.0045, 0.090, 90,
    [['beast_dog', 20], ['beast_cat', 20], ['beast_rabbit', 20], ['beast_wolf', 15], ['beast_fox', 10], ['human', 10], ['lizardfolk', 5]]],
  myth: [['神話の時代', 'Age of Myth'], ['fantasy', 'myth'],
    1, 3, 3, 8, 7, 1, 2, 0.28, 0.45, 0.012, 0.016, 0.0040, 0.070, 120,
    [['human', 60], ['winged', 10], ['fairy', 10], ['demon', 5], ['dragonkin', 5], ['merfolk', 5], ['oni', 5]]],
  frontier: [['辺境の開拓村', 'Frontier Village'], ['fantasy', 'rural'],
    4, 2, 1, 4, 1, 3, 6, 0.18, 0.30, 0.007, 0.010, 0.0030, 0.075, 100,
    [['human', 60], ['dwarf', 10], ['elf', 8], ['beast_dog', 6], ['beast_cat', 6], ['halfling', 6], ['half_elf', 2], ['slime', 2]]],
};

export const WORLD_IDS = Object.keys(ROWS) as WorldId[];

export const WORLDS: Record<WorldId, World> = Object.fromEntries(WORLD_IDS.map((id) => {
  const [[ja, en], tags, tech, magic, powers, danger, war, medicine, law, q0, q5, ch, c, a30, b, max, races] = ROWS[id];
  return [id, { id, name: { ja, en }, tags, tech, magic, powers, danger, war, medicine, law, q0, q5, ch, c, a30, b, max, races }];
})) as Record<WorldId, World>;

// 英語の文の中での世界の呼び方 (「Born in Ulruwick, in the Cultivation Realm」)。世界の名はジャンルの名なので、場所として読める形にする。
// 日本語は世界の名そのまま
const PLACE_EN: Record<WorldId, string> = {
  medieval: 'the Sword-and-Sorcery Kingdom', dark: 'a grim, dark-fantasy realm', game: 'a world of Status screens', academy: 'a kingdom of nobles and academies',
  wa: 'the Land of the Rising Sun', xianxia: 'the Cultivation Realm', steampunk: 'a city of steam and arcana', cyberpunk: 'a neon megacity',
  space: 'the Galactic Empire', modern: 'a modern Japan with dungeons', postapoc: 'a world after the fall', ocean: 'the Archipelago',
  desert: 'the Desert of Nomads', beast: 'the Beastfolk Wilds', myth: 'the Age of Myth', frontier: 'the frontier',
};
export const worldPlace = (w: World): { ja: string; en: string } => ({ ja: w.name.ja, en: PLACE_EN[w.id] ?? w.name.en });

// research/03 の 5-3節に載っている、表の値で計算した平均寿命 (e0)。テストで比べる相手
export const TABLE_E0: Record<WorldId, number> = {
  medieval: 31.6, dark: 20.4, game: 38.3, academy: 43.6, wa: 35.5, xianxia: 32.7, steampunk: 40.8, cyberpunk: 70.6,
  space: 85.4, modern: 79.7, postapoc: 26.5, ocean: 32.4, desert: 30.8, beast: 31.1, myth: 24.7, frontier: 36.5,
};

// 画面で選んだ世界を、値の入った World にする。random は16型から1つ引く。
// magic を上書きしたら、治癒魔法が平民に届くぶんとして medicine に (新しい magic − 元の magic) × 0.5 を足す (DESIGN 1節)
export function resolveWorld(choice: WorldChoice, rng: Rng): World {
  // 選んであっても1回引く (選んだかどうかで後の乱数の並びが変わらないように)
  const drawn = pick(rng, WORLD_IDS);
  const id = choice.preset === 'random' ? drawn : choice.preset;
  const base = WORLDS[id];
  const w: World = { ...base, tags: [...base.tags], races: base.races.map(([r, n]) => [r, n]) };
  if (choice.magic !== undefined) {
    w.medicine = clamp(w.medicine + (choice.magic - base.magic) * 0.5, 0, 10);
    w.magic = choice.magic;
  }
  if (choice.powers !== undefined) w.powers = choice.powers;
  if (choice.danger !== undefined) w.danger = clamp(choice.danger, 0, 10);
  if (choice.war !== undefined) w.war = clamp(choice.war, 0, 10);
  return w;
}

export const hasTag = (w: World, t: WorldTag) => w.tags.includes(t);
// 魔王がいる世界になりうるか (DESIGN 1節: magic 2 以上。剣と魔法の系統に限る)
export const demonKingWorld = (w: World) => w.magic >= 2 && (hasTag(w, 'fantasy') || hasTag(w, 'eastern'));
