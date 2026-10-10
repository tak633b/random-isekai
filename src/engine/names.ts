// 人・町・神・魔物・ギルド・領主の名。実在の作品の名は写さず、音の部品を組み合わせて作る。
// 部品は [英字, 日本語表記] の組。日本語はカタカナ、和風・中華風・現代は漢字。
// 引く乱数の回数は言語で変わらない (同じ seed なら日英で同じ人生になる)
import type { Hero, Sex, Status, World } from './types';
import { makeRng, pick, type Rng } from './rng';
import { statusRank } from './status';
import { isEn, L } from '../i18n';

type Part = [string, string];
type Style = 'west' | 'myth' | 'desert' | 'wa' | 'zh' | 'modern' | 'scifi' | 'ruin';

export function styleOf(w: World): Style {
  const t = (x: string) => w.tags.includes(x as never);
  if (t('scifi')) return 'scifi';
  if (t('modern')) return 'modern';
  if (t('ruin')) return 'ruin';
  if (w.id === 'wa') return 'wa';
  if (t('eastern')) return 'zh';
  if (t('desert')) return 'desert';
  if (t('myth')) return 'myth';
  return 'west';
}

// ---- 部品 -----------------------------------------------------------------

const WEST_START: Part[] = [['Al', 'アル'], ['Ber', 'ベル'], ['Cel', 'セル'], ['Da', 'ダ'], ['El', 'エル'], ['Fa', 'ファ'], ['Gal', 'ガル'], ['Hel', 'ヘル'],
  ['I', 'イ'], ['Ka', 'カ'], ['Li', 'リ'], ['Ma', 'マ'], ['No', 'ノ'], ['Ro', 'ロ'], ['Se', 'セ'], ['Ta', 'タ'], ['Vi', 'ヴィ'], ['Ze', 'ゼ'],
  ['Lu', 'ル'], ['Mi', 'ミ'], ['Fe', 'フェ'], ['Ri', 'リ'], ['Sa', 'サ'], ['Or', 'オル'], ['Ul', 'ウル'], ['Ed', 'エド']];
const WEST_MID: Part[] = [['ri', 'リ'], ['la', 'ラ'], ['ne', 'ネ'], ['ru', 'ル'], ['mi', 'ミ'], ['to', 'ト'], ['ve', 'ヴェ'], ['si', 'シ'], ['der', 'デル'], ['', ''], ['', ''], ['', '']];
const WEST_END: Record<Sex, Part[]> = {
  M: [['us', 'ウス'], ['an', 'アン'], ['ric', 'リック'], ['ld', 'ルド'], ['o', 'オ'], ['el', 'エル'], ['bert', 'ベルト'], ['in', 'イン'], ['ard', 'アード'], ['os', 'オス']],
  F: [['a', 'ア'], ['na', 'ナ'], ['ia', 'イア'], ['ella', 'エラ'], ['ine', 'イーネ'], ['ra', 'ラ'], ['lie', 'リー'], ['sa', 'サ'], ['ette', 'エット'], ['wen', 'ウェン']],
};
const WEST_FAMILY_END: Part[] = [['heart', 'ハート'], ['wood', 'ウッド'], ['stein', 'シュタイン'], ['ford', 'フォード'], ['mont', 'モン'], ['vale', 'ヴェイル'], ['crest', 'クレスト'], ['berg', 'ベルク']];

const MYTH_START: Part[] = [['Ar', 'アル'], ['Kal', 'カル'], ['Theo', 'テオ'], ['Ly', 'リュ'], ['Pha', 'ファ'], ['Dem', 'デム'], ['Ni', 'ニ'], ['Ere', 'エレ'], ['Hy', 'ヒュ'], ['Me', 'メ'], ['Ste', 'ステ'], ['Xa', 'クサ']];
const MYTH_MID: Part[] = [['si', 'シ'], ['ri', 'リ'], ['the', 'テ'], ['ko', 'コ'], ['lo', 'ロ'], ['', ''], ['', '']];
const MYTH_END: Record<Sex, Part[]> = {
  M: [['os', 'オス'], ['as', 'アス'], ['on', 'オン'], ['eus', 'エウス'], ['es', 'エス'], ['andros', 'アンドロス']],
  F: [['e', 'エ'], ['a', 'ア'], ['is', 'イス'], ['ope', 'オペ'], ['ia', 'イア'], ['ene', 'エネ']],
};

const DESERT_START: Part[] = [['Ka', 'カ'], ['Ra', 'ラ'], ['Sha', 'シャ'], ['Za', 'ザ'], ['Ha', 'ハ'], ['Ji', 'ジ'], ['Fa', 'ファ'], ['Na', 'ナ'], ['Ta', 'タ'], ['Ma', 'マ'], ['Yu', 'ユ'], ['Ba', 'バ']];
const DESERT_MID: Part[] = [['hir', 'ヒル'], ['li', 'リ'], ['mir', 'ミル'], ['sim', 'シム'], ['dar', 'ダル'], ['ri', 'リ'], ['', ''], ['', '']];
const DESERT_END: Record<Sex, Part[]> = {
  M: [['ad', 'アド'], ['im', 'イム'], ['an', 'アン'], ['ul', 'ウル'], ['ir', 'イル'], ['ek', 'エク']],
  F: [['a', 'ア'], ['ira', 'イラ'], ['ina', 'イナ'], ['ya', 'ヤ'], ['el', 'エル'], ['iye', 'イエ']],
};

const SCIFI_START: Part[] = [['Kai', 'カイ'], ['Zed', 'ゼド'], ['Nyx', 'ニクス'], ['Rho', 'ロー'], ['Vex', 'ヴェクス'], ['Ash', 'アッシュ'], ['Ju', 'ジュ'], ['Ori', 'オリ'],
  ['Tess', 'テス'], ['Rin', 'リン'], ['Dex', 'デクス'], ['Mira', 'ミラ'], ['Sol', 'ソル'], ['Io', 'イオ'], ['Lux', 'ルクス'], ['Pax', 'パクス']];
const SCIFI_END: Record<Sex, Part[]> = {
  M: [['', ''], ['an', 'アン'], ['or', 'オル'], ['o', 'オ'], ['us', 'ウス'], ['', '']],
  F: [['a', 'ア'], ['ine', 'イン'], ['ra', 'ラ'], ['', ''], ['ette', 'エット'], ['is', 'イス']],
};
const SCIFI_FAMILY: [Part[], Part[]] = [
  [['Kur', 'クル'], ['Vel', 'ヴェル'], ['Ostr', 'オストル'], ['Hal', 'ハル'], ['Mor', 'モル'], ['Tan', 'タン'], ['Ish', 'イシュ'], ['Dra', 'ドラ'], ['Okon', 'オコン'], ['Sar', 'サル']],
  [['ova', 'オヴァ'], ['en', 'エン'], ['ik', 'イク'], ['ade', 'エイド'], ['os', 'オス'], ['ui', 'ウイ'], ['ani', 'アニ'], ['ström', 'ストローム']],
];

const RUIN_NAMES: Part[] = [['Rook', 'ルーク'], ['Dust', 'ダスト'], ['Ash', 'アッシュ'], ['Flint', 'フリント'], ['Wren', 'レン'], ['Moss', 'モス'], ['Rust', 'ラスト'], ['Sky', 'スカイ'],
  ['Jet', 'ジェット'], ['Bolt', 'ボルト'], ['Echo', 'エコー'], ['Lark', 'ラーク'], ['Briar', 'ブライア'], ['Ember', 'エンバー'], ['Fern', 'ファーン'], ['Pike', 'パイク'],
  ['Cinder', 'シンダー'], ['Tally', 'タリー'], ['Gauge', 'ゲイジ'], ['Juniper', 'ジュニパー']];

// 和風: 漢字の名。[漢字, 読み] で、英語は読みのローマ字
const WA_GIVEN: Record<Sex, [Part[], Part[]]> = {
  M: [[['Ta', '太'], ['Ken', '健'], ['Kiyo', '清'], ['Masa', '正'], ['Mitsu', '光'], ['Mune', '宗'], ['Yoshi', '義'], ['Nobu', '信'], ['Katsu', '勝'], ['Shige', '重'], ['Hide', '秀'], ['Tora', '虎']],
    [['rō', '郎'], ['kichi', '吉'], ['suke', '助'], ['emon', '衛門'], ['zō', '蔵'], ['hei', '平'], ['ji', '次'], ['nojō', '之丞']]],
  F: [[['Chi', '千'], ['Hana', '花'], ['Kiku', '菊'], ['Haru', '春'], ['Yuki', '雪'], ['Matsu', '松'], ['Ume', '梅'], ['Ko', '小'], ['Tomi', '富'], ['Aya', '綾'], ['Sayo', '小夜'], ['Kaede', '楓']],
    [['yo', '代'], ['', ''], ['no', '乃'], ['e', '江'], ['ne', '音'], ['ko', '子']]],
};
const WA_FAMILY: [Part[], Part[]] = [
  [['Ō', '大'], ['Ko', '小'], ['Taka', '高'], ['Matsu', '松'], ['Fuji', '藤'], ['Miya', '宮'], ['Sakura', '桜'], ['Ishi', '石'], ['Kawa', '川'], ['Mori', '森'], ['Kiri', '霧'], ['Shira', '白']],
  [['da', '田'], ['hara', '原'], ['i', '井'], ['no', '野'], ['yama', '山'], ['moto', '本'], ['kawa', '川'], ['shima', '島'], ['saka', '坂'], ['sawa', '沢']],
];
// 現代: 今の日本の名づけの音
const MODERN_GIVEN: Record<Sex, [Part[], Part[]]> = {
  M: [[['Yū', '悠'], ['Ren', '蓮'], ['Shō', '翔'], ['Haru', '陽'], ['Dai', '大'], ['Sō', '蒼'], ['Kai', '海'], ['Ri', '理'], ['Tai', '泰'], ['Kō', '光']],
    [['ma', '真'], ['to', '斗'], ['ta', '太'], ['', ''], ['ki', '輝'], ['ga', '雅'], ['', '']]],
  F: [[['Yui', '結'], ['Mi', '美'], ['Hina', '陽'], ['Aoi', '葵'], ['Koko', '心'], ['Saki', '咲'], ['Rin', '凛'], ['Mei', '芽'], ['Sara', '紗'], ['Nana', '七']],
    [['', ''], ['ko', '子'], ['na', '菜'], ['ka', '花'], ['ri', '莉'], ['', '']]],
};
// 中華風: 名は二字、姓は一字
const ZH_GIVEN: Part[] = [['Yun', '雲'], ['Long', '龍'], ['Feng', '風'], ['Yu', '玉'], ['Ming', '明'], ['Hua', '華'], ['Tian', '天'], ['Jing', '静'], ['Fei', '飛'],
  ['Lan', '蘭'], ['Qing', '清'], ['Yue', '月'], ['Shuang', '霜'], ['Jian', '剣'], ['Xing', '星'], ['Ye', '夜'], ['Han', '寒'], ['Ling', '鈴']];
const ZH_FAMILY: Part[] = [['Li', '李'], ['Wang', '王'], ['Zhang', '張'], ['Chen', '陳'], ['Lin', '林'], ['Xiao', '蕭'], ['Shen', '沈'], ['Ye', '葉'], ['Han', '韓'], ['Su', '蘇'], ['Mo', '莫'], ['Bai', '白']];

// ---- 組み立て ---------------------------------------------------------------

const join = (...ps: Part[]): Part => [ps.map((p) => p[0]).join(''), ps.map((p) => p[1]).join('')];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const show = ([en, ja]: Part) => L(ja, cap(en));

// 漢字の名が1文字 (「大」「小」) にならないよう、後ろの部品が空なら、前の部品で決まる空でない部品を足す (乱数は余分に引かない)
function twoChars(a: Part, b: Part, [firsts, seconds]: [Part[], Part[]]): Part {
  if ((a[1] + b[1]).length >= 2) return join(a, b);
  const filled = seconds.filter((x) => x[1]);
  return join(a, filled[firsts.indexOf(a) % filled.length]);
}

function givenPart(rng: Rng, style: Style, sex: Sex): Part {
  switch (style) {
    case 'west': return join(pick(rng, WEST_START), pick(rng, WEST_MID), pick(rng, WEST_END[sex]));
    case 'myth': return join(pick(rng, MYTH_START), pick(rng, MYTH_MID), pick(rng, MYTH_END[sex]));
    case 'desert': return join(pick(rng, DESERT_START), pick(rng, DESERT_MID), pick(rng, DESERT_END[sex]));
    case 'scifi': return join(pick(rng, SCIFI_START), pick(rng, SCIFI_END[sex]));
    case 'ruin': return pick(rng, RUIN_NAMES);
    case 'wa': return twoChars(pick(rng, WA_GIVEN[sex][0]), pick(rng, WA_GIVEN[sex][1]), WA_GIVEN[sex]);
    case 'modern': return twoChars(pick(rng, MODERN_GIVEN[sex][0]), pick(rng, MODERN_GIVEN[sex][1]), MODERN_GIVEN[sex]);
    case 'zh': { const a = pick(rng, ZH_GIVEN); const b = pick(rng, ZH_GIVEN); return [a[0] + b[0].toLowerCase(), a[1] + b[1]]; }
  }
}

function familyPart(rng: Rng, style: Style): Part | null {
  switch (style) {
    case 'west': return join(pick(rng, WEST_START), pick(rng, WEST_FAMILY_END));
    case 'scifi': return join(pick(rng, SCIFI_FAMILY[0]), pick(rng, SCIFI_FAMILY[1]));
    case 'wa': case 'modern': return join(pick(rng, WA_FAMILY[0]), pick(rng, WA_FAMILY[1]));
    case 'zh': return pick(rng, ZH_FAMILY);
    default: return null;
  }
}

export interface PersonName { given: string; full: string; family?: Part }

// 名字を持つのは: 和風の武家以上・中華風と現代と宇宙の全員・剣と魔法の騎士の家以上。家族は family を引き継ぐ
export function personName(rng: Rng, w: World, sex: Sex, status: Status, family?: Part | null): PersonName {
  const style = styleOf(w);
  const g = givenPart(rng, style, sex);
  const needs = style === 'zh' || style === 'modern' || style === 'scifi' || (statusRank(status) >= statusRank('gentry') && style !== 'ruin');
  const f = family === undefined ? (needs ? familyPart(rng, style) : null) : family;
  const given = show(g);
  if (!f) return { given, full: given };
  return { given, full: withFamily(w, given, f), family: f };
}

// 表示の名に家名を付ける。和風・中華風・現代は姓が先 (日本語は「姓名」、英語も姓・名の順)、西洋は「名・姓」
export function withFamily(w: World, given: string, f: Part | null | undefined): string {
  if (!f) return given;
  const style = styleOf(w);
  const eastOrder = style === 'wa' || style === 'zh' || style === 'modern';
  return isEn
    ? (eastOrder ? `${cap(f[0])} ${given}` : `${given} ${cap(f[0])}`)
    : (eastOrder ? `${f[1]}${given}` : `${given}・${f[1]}`);
}

// ---- 世界の固有名 ---------------------------------------------------------

const TOWN_END: Record<Style, Part[]> = {
  west: [['burg', 'ブルク'], ['ford', 'フォード'], ['heim', 'ハイム'], ['ton', 'トン'], ['dale', 'デイル'], ['mar', 'マール'], ['ia', 'イア'], ['wick', 'ウィック']],
  myth: [['polis', 'ポリス'], ['os', 'オス'], ['ia', 'イア'], ['thos', 'トス']],
  desert: [['bad', 'バード'], ['ra', 'ラ'], ['san', 'サン'], ['kar', 'カル'], ['ehr', 'エフル']],
  scifi: [[' Prime', '・プライム'], [' Station', '・ステーション'], ['polis', 'ポリス'], [' Ring', '・リング'], [' Arcology', '・アーコロジー']],
  ruin: [['town', 'タウン'], [' Hollow', '・ホロウ'], [' Gate', '・ゲート'], [' Camp', '・キャンプ']],
  wa: [['gahara', 'ヶ原'], ['yama', '山'], ['mura', '村'], ['-no-sato', 'の里'], ['juku', '宿']],
  modern: [['-shi', '市'], ['-machi', '町'], ['-ku', '区']],
  zh: [['cheng', '城'], ['zhou', '州'], ['shan', '山'], ['zhen', '鎮']],
};
const RUIN_TOWN: Part[] = [['Haven', 'ヘイヴン'], ['Scrap', 'スクラップ'], ['Rust', 'ラスト'], ['Dust', 'ダスト'], ['Iron', 'アイアン'], ['Bone', 'ボーン']];
const ZH_PLACE: Part[] = [['Qing', '青'], ['Bai', '白'], ['Yun', '雲'], ['Jin', '金'], ['Xuan', '玄'], ['Hong', '紅']];

function startOf(rng: Rng, style: Style): Part {
  switch (style) {
    case 'myth': return pick(rng, MYTH_START);
    case 'desert': return pick(rng, DESERT_START);
    case 'scifi': return pick(rng, SCIFI_START);
    case 'ruin': return pick(rng, RUIN_TOWN);
    case 'wa': case 'modern': return pick(rng, WA_FAMILY[0]);
    case 'zh': return pick(rng, ZH_PLACE);
    default: return join(pick(rng, WEST_START), pick(rng, WEST_MID));
  }
}

export const townName = (rng: Rng, w: World): string => {
  const s = styleOf(w);
  return show(join(startOf(rng, s), pick(rng, TOWN_END[s])));
};

const GOD_END: Record<Style, Part[]> = {
  west: [['ria', 'リア'], ['tes', 'テス'], ['dros', 'ドロス'], ['ine', 'イーネ'], ['oth', 'オス']],
  myth: [['ion', 'イオン'], ['ea', 'エア'], ['aros', 'アロス']],
  desert: [['ah', 'アー'], ['im', 'イム'], ['ura', 'ウラ']],
  scifi: [[' Prime Mind', '・プライムマインド'], [' Core', '・コア'], ['-Omega', '・オメガ']],
  ruin: [[' of the Old Sun', 'の古い太陽'], [' the Last Signal', 'の最後の電波']],
  wa: [['-no-Mikami', 'の御神'], ['-Ōkami', '大神'], ['-hime', '媛']],
  modern: [['-no-Mikami', 'の御神'], ['-Ōkami', '大神']],
  zh: [[' Tianzun', '天尊'], [' Zhenjun', '真君'], [' Niangniang', '娘娘']],
};
export const godName = (rng: Rng, w: World): string => {
  const s = styleOf(w);
  return show(join(startOf(rng, s), pick(rng, GOD_END[s])));
};

// 魔物: その世界の系統の魔物に、ときどき形容をつける
const BEASTS: Record<Style, Part[]> = {
  west: [['slime', 'スライム'], ['goblin', 'ゴブリン'], ['dire wolf', '大狼'], ['wyvern', 'ワイバーン'], ['giant spider', '大蜘蛛'], ['ghoul', '屍喰い'], ['troll', 'トロール'], ['basilisk', 'バジリスク']],
  myth: [['hydra', '多頭の蛇'], ['giant', '巨人'], ['great harpy', '怪鳥'], ['bull-headed beast', '牛頭の怪物'], ['gorgon', '石化の魔女']],
  desert: [['sandworm', '砂虫'], ['giant scorpion', '大蠍'], ['sand drake', '砂竜'], ['ghul', '砂の屍鬼'], ['fire djinn', '火の魔神']],
  scifi: [['rogue drone', '暴走ドローン'], ['mutant beast', '変異獣'], ['mech spider', '機械蜘蛛'], ['void worm', '宇宙虫'], ['combat android', '戦闘用アンドロイド']],
  ruin: [['rad rat', '放射能ネズミ'], ['mutant hound', '変異犬'], ['husk swarm', '屍の群れ'], ['iron beast', '鉄の獣'], ['glass wolf', '硝子の狼']],
  wa: [['great centipede', '大百足'], ['earth spider', '土蜘蛛'], ['great serpent', '大蛇'], ['bake-danuki', '化け狸'], ['nue', '鵺']],
  modern: [['dungeon slime', 'ダンジョンのスライム'], ['goblin', 'ゴブリン'], ['minotaur', 'ミノタウロス'], ['hellhound', '地獄の猟犬'], ['golem', 'ゴーレム']],
  zh: [['fox spirit', '妖狐'], ['jiangshi', '僵屍'], ['great python', '大蟒'], ['demon tiger', '妖虎'], ['flood dragon', '蛟']],
};
const SEA_BEASTS: Part[] = [['sea serpent', '大海蛇'], ['kraken', 'クラーケン'], ['sharkfolk raider', '鮫人の海賊'], ['siren', '歌う海魔']];
const BEAST_WILDS: Part[] = [['great bear', '大熊'], ['tusked boar', '牙猪'], ['mad wolf', '狂い狼'], ['owlbear', '梟熊']];
const ADJ: Part[] = [['', ''], ['', ''], ['', ''], ['black ', '黒い'], ['two-headed ', '双頭の'], ['red-eyed ', '赤目の'], ['giant ', '巨大な']];

export function beastName(rng: Rng, w: World): string {
  const s = styleOf(w);
  const pool = w.tags.includes('sea') ? [...BEASTS[s], ...SEA_BEASTS] : w.id === 'beast' ? [...BEASTS[s], ...BEAST_WILDS] : BEASTS[s];
  const adj = pick(rng, ADJ), b = pick(rng, pool);
  // 「giant giant spider」にならないよう、魔物の名に入っている形容は重ねない (乱数は同じだけ引く)
  const ja = adj[1] + b[1];
  return L(ja, adj[0] && b[0].split(' ').includes(adj[0].trim()) ? b[0] : adj[0] + b[0]);
}

// 魔物の名の複数形 (a horde of {beasts})。最後の語だけを変える。数えない名 (kraken, jiangshi …) はそのまま
const SAME_PLURAL = /(?:kraken|jiangshi|nue|danuki|djinn|folk)$/;
export function plural(s: string): string {
  if (!isEn || SAME_PLURAL.test(s)) return s;
  if (/wolf$/.test(s)) return s.replace(/f$/, 'ves');
  if (/[^aeiou]y$/.test(s)) return s.replace(/y$/, 'ies');
  if (/(?:s|x|z|ch|sh)$/.test(s)) return `${s}es`;
  return `${s}s`;
}

const GUILD_A: Part[] = [['Silver', '銀'], ['Iron', '鉄'], ['Azure', '蒼'], ['Crimson', '紅'], ['Golden', '金'], ['Black', '黒']];
const GUILD_B: Part[] = [['Hawk', '鷹'], ['Shield', '盾'], ['Fang', '牙'], ['Lantern', '灯'], ['Oak', '樫'], ['Wolf', '狼']];
export function guildName(rng: Rng, w: World): string {
  const s = styleOf(w);
  const a = pick(rng, GUILD_A);
  const b = pick(rng, GUILD_B);
  switch (s) {
    case 'wa': return L(`${a[1]}${b[1]}組`, `the ${a[0]} ${b[0]} Company`);
    case 'zh': return L(`${a[1]}${b[1]}宗`, `the ${a[0]} ${b[0]} Sect`);
    case 'scifi': return L(`${a[1]}${b[1]}傭兵組合`, `the ${a[0]} ${b[0]} Contractors`);
    case 'modern': return L(`${a[1]}${b[1]}探索者協会`, `the ${a[0]} ${b[0]} Explorers' Association`);
    case 'ruin': return L(`${a[1]}${b[1]}団`, `the ${a[0]} ${b[0]} Crew`);
    default: return L(`${a[1]}の${b[1]}ギルド`, `the ${a[0]} ${b[0]} Guild`);
  }
}

const LORD_TITLE: Record<Style, [string, string]> = {
  west: ['伯', 'Count '], myth: ['王', 'King '], desert: ['族長', 'Chief '], scifi: ['総裁', 'Director '],
  ruin: ['首領', 'Boss '], wa: ['様', 'Lord '], modern: ['市長', 'Mayor '], zh: ['将軍', 'General '],
};
export function lordName(rng: Rng, w: World): string {
  const s = styleOf(w);
  const n = personName(rng, w, rng() < 0.75 ? 'M' : 'F', 'noble');
  const [ja, en] = LORD_TITLE[s];
  // 西洋の領主は家名で呼ぶ (「ヘルハート伯」)
  const ref = n.family && (s === 'west' || s === 'wa') ? show(n.family) : n.given;
  return L(`${ref}${ja}`, `${en}${ref}`);
}

// その人生で使う固有名。seed から別の乱数で作るので、人生の乱数の並びを変えずに、何度呼んでも同じ名になる
export interface WorldNames { town: string; god: string; guild: string; lord: string }
const cache = new Map<string, WorldNames>();
const byHero = new WeakMap<Hero, { seed: number; w: string; n: WorldNames }>(); // 毎年何度も呼ぶので、文字列の鍵を作る前に主人公ごとに
export function worldNames(h: Hero): WorldNames {
  const seed = h.lineage?.rootSeed ?? h.seed; // 続けた主人公も、最初の主人公と同じ町・神・ギルド・領主
  const fast = byHero.get(h);
  if (fast && fast.seed === seed && fast.w === h.world.id) return fast.n;
  const n = worldNamesOf(h, seed);
  byHero.set(h, { seed, w: h.world.id, n });
  return n;
}
function worldNamesOf(h: Hero, seed: number): WorldNames {
  const key = `${seed}|${h.world.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rng = makeRng((seed ^ 0x5eed1234) >>> 0);
  const n = { town: townName(rng, h.world), god: godName(rng, h.world), guild: guildName(rng, h.world), lord: lordName(rng, h.world) };
  if (cache.size > 2000) cache.clear(); // 何千回も試す集計で膨らまないように
  cache.set(key, n);
  return n;
}
