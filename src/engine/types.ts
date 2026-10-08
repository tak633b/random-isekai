// 世界・主人公・人生・出来事のデータ・絵の材料の形。
// エンジン、出来事の文のデータ、ピクセル画、画面の4つが同じ形を見るための約束なので、ここを変えるときは全部を確かめる。
// 値の根拠は docs/research/ と docs/DESIGN.md。
import type { Text } from '../i18n';
import type { Rng } from './rng';

export type { Text };
export type Sex = 'F' | 'M';

// ---- 世界 -----------------------------------------------------------------

// 世界の型。docs/research/03-world-types.md の16種
export type WorldId =
  | 'medieval' | 'dark' | 'game' | 'academy' | 'wa' | 'xianxia' | 'steampunk' | 'cyberpunk'
  | 'space' | 'modern' | 'postapoc' | 'ocean' | 'desert' | 'beast' | 'myth' | 'frontier';

// 出来事・職業・死因を絞り込むための大まかな系統。1つの世界がいくつも持つ
export type WorldTag =
  | 'fantasy'    // 剣と魔法 (中世欧州風・ダーク・ゲーム的・開拓・神話・海・砂漠・獣人)
  | 'gamey'      // ステータスやレベルが見える
  | 'nobility'   // 貴族社会・学園・婚約破棄
  | 'eastern'    // 和風・中華風 (両方に共通の出来事)
  | 'japan'      // 和風だけ (侍・元服・寺子屋・陰陽師・妖怪・忍び・鳥居)
  | 'cultivation' // 仙侠だけ (宗門・霊根・修行の段階・丹薬・天劫・後宮・科挙)
  | 'industrial' // 蒸気と工場
  | 'scifi'      // 近未来・宇宙
  | 'modern'     // 現代 (ダンジョンが出た現代・現代異能)
  | 'ruin'       // 文明の後 (ポストアポカリプス)
  | 'sea' | 'desert' | 'myth' | 'rural' | 'dark';

export type Level4 = 0 | 1 | 2 | 3;

export interface World {
  id: WorldId;          // 元にした型
  name: Text;
  tags: WorldTag[];
  tech: number;         // 0 石器 … 4 中世後期 … 7 現代 … 10 星間成熟
  magic: Level4;        // 0 なし / 1 弱 / 2 職業として成立 / 3 戦争や医療を左右する
  powers: Level4;       // 異能。0 なし / 1 まれ / 2 一定数 / 3 社会の前提
  danger: number;       // 0–10 魔物と日常の暴力
  war: number;          // 0–10 戦争の頻度と激しさ
  medicine: number;     // 0–10 平民に届く医療 (魔法医療を含む)
  law: number;          // 0–10 治安 (高いほど安全)
  // 平民の人間の生命表の材料 (03 の 5-3節)。q0 乳児死亡率 / q5 5歳未満死亡率 / ch 5–14歳の年死亡率 /
  // c 成人の年齢に関係ない死 / a30 30歳の老化ハザード / b ゴンペルツの傾き / max 人間換算で必ず亡くなる年齢
  q0: number; q5: number; ch: number; c: number; a30: number; b: number; max: number;
  races: [RaceId, number][]; // 生まれる種族の重み
}

// 画面で選ぶ世界。preset 以外は省略でその型の値のまま
export interface WorldChoice {
  preset: WorldId | 'random';
  magic?: Level4;
  powers?: Level4;
  danger?: number;
  war?: number;
}

// ---- 主人公 ---------------------------------------------------------------

export type RaceId =
  | 'human' | 'elf' | 'half_elf' | 'dark_elf' | 'dwarf' | 'halfling'
  | 'beast_dog' | 'beast_cat' | 'beast_rabbit' | 'beast_fox' | 'beast_wolf'
  | 'dragonkin' | 'demon' | 'vampire' | 'oni' | 'goblin' | 'orc' | 'lizardfolk' | 'merfolk'
  | 'winged' | 'fairy' | 'slime' | 'homunculus' | 'android' | 'cyborg' | 'mutant' | 'alien';

export interface Race {
  id: RaceId;
  name: Text;
  adult: number;       // 成人する実年齢
  k: number;           // 成人後の老化の速さ (人間 = 1)
  E: number;           // 暮らしの外因死の倍率 (人間 = 1)。差別・駆除されやすさも含む
  fertility: number;   // 年あたりの子を授かる確率 (既婚・成人)
  maxAge: number;      // 実年齢の上限
  tags?: WorldTag[];   // この系統の世界にしか生まれない (省略 = どこでも、ただし World.races の重みに従う)
}

// 生まれの身分。世界によって呼び名が変わる (スラム/企業の家 など)。並びは低い方から
export type Status = 'slave' | 'orphan' | 'poor' | 'commoner' | 'merchant' | 'gentry' | 'noble' | 'royal';

// 生まれ持った才能 (一番伸びやすい能力)
export type Talent = 'might' | 'magic' | 'wits' | 'charm' | 'luck' | 'craft' | 'none';

// 転生特典。docs/research/02-cheats-and-skills.md から選んだもの
export type CheatId =
  | 'appraisal' | 'item_box' | 'exp_boost' | 'all_magic' | 'infinite_mana' | 'regeneration' | 'immortal_body'
  | 'return_by_death' | 'creation' | 'tamer' | 'growth' | 'hide_status' | 'skill_steal' | 'gacha'
  | 'online_shop' | 'modern_medicine' | 'agri_knowledge' | 'foresight' | 'max_luck' | 'trash_skill'
  | 'sword_saint' | 'holy_power' | 'charm_eyes' | 'language' | 'map' | 'poison_immunity' | 'cooking'
  | 'hacking' | 'psychic' | 'stealth';

export interface Cheat {
  id: CheatId;
  name: Text;
  desc: Text;          // 一行の説明
  magic?: number;      // 世界の magic がこれ以上でないと選べない
  tech?: [number, number];
  powers?: number;
  mult: Partial<Record<Hazard, number>>; // その死因のハザードにかける倍率
  aging?: number;      // 老化の速さにかける倍率 (不老系は小さく)
  attention: number;   // 0–3 目立ちやすさ。国・教会・魔王・暗殺者に目を付けられる出来事の起きやすさ
  revive?: number;     // 死を取り消せる回数 (死に戻りなど)
}

// 転生の型
export type Arrival =
  | 'reborn'    // 赤ちゃんから生まれ直す
  | 'awaken'    // 現地の子として育ち、途中で前世を思い出す
  | 'summoned'  // 召喚・転移。今の体のまま (人間・15–35歳) で来る
  | 'native';   // 前世を持たない、その世界の生まれ (比較用)

export type MemoryLevel = 'none' | 'faint' | 'full';

// 前世 (この世界に来る前)。物語の味付けで、骨格には少しだけ効く (memory と合わせて mind に)
export interface PastLife {
  age: number;
  cause: 'truck' | 'overwork' | 'illness' | 'stabbed' | 'accident' | 'disaster' | 'old' | 'unknown';
  job: Text;
}

// 画面で選ぶ主人公。省略はおまかせ (ランダム)
export interface HeroChoice {
  race?: RaceId;
  sex?: Sex;
  status?: Status;
  talent?: Talent;
  cheat?: CheatId | 'none';
  arrival?: Arrival;
  memory?: MemoryLevel;
  name?: string;
}

// 自動で選ぶときの性格。慎重=死ににくい方を、無謀=得の大きい方を選ぶ
export type Policy = 'careful' | 'normal' | 'bold';

export interface Setup {
  seed: number;
  world: WorldChoice;
  hero: HeroChoice;
  policy?: Policy;
  auto?: boolean; // 選択も自動で決める (集計と「最後まで」用)
}

// ---- 人生 -----------------------------------------------------------------

// 死因の大分類。ハザードを分けて持ち、亡くなったときはその年の大きさの比で分類を引く
export type Hazard =
  | 'infant'      // 乳幼児期の病と栄養
  | 'disease'     // 感染症・病
  | 'monster'     // 魔物・獣・ダンジョン
  | 'violence'    // 盗賊・暗殺・決闘・私刑
  | 'war'         // 戦争・紛争
  | 'accident'    // 事故・災害・労働
  | 'childbirth'  // 出産
  | 'magic'       // 魔力暴走・呪い・禁術・異能の暴走
  | 'execution'   // 処刑・断罪
  | 'famine'      // 飢饉
  | 'plague'      // 大疫病
  | 'age';        // 老い

// 人生の段階。種族で成長の速さが違うので、人間換算の年齢 (stageOf) で決める
export type Stage = 'infant' | 'child' | 'teen' | 'adult' | 'middle' | 'elder';

export type YearKind =
  | 'arrival' | 'child' | 'school' | 'adventure' | 'battle' | 'work' | 'love' | 'family'
  | 'loss' | 'ill' | 'power' | 'fame' | 'hard' | 'old' | 'death';

export type StatKey = 'hp' | 'power' | 'mind' | 'charm' | 'luck' | 'happy' | 'wealth' | 'fame';
// hp 健康 / power 強さ / mind 知恵と魔力 / charm 人望 / luck 運 / happy 幸せ / wealth 暮らし向き / fame 名声。どれも 0–100
export type Stats = Record<StatKey, number>;

export type GuildRank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

// 職業。世界の系統で就けるものが変わる (engine/jobs.ts)。null は無職・子ども
export type JobId =
  // 剣と魔法
  | 'farmer' | 'merchant' | 'smith' | 'alchemist' | 'herbalist' | 'priest' | 'knight' | 'soldier'
  | 'mercenary' | 'adventurer' | 'mage' | 'scholar' | 'bard' | 'thief' | 'tamer' | 'cook'
  | 'lord' | 'servant' | 'hunter' | 'sailor' | 'miner' | 'assassin' | 'necromancer'
  | 'hero' | 'saint'
  // 東洋
  | 'samurai' | 'onmyoji' | 'cultivator' | 'ninja'
  // 産業
  | 'engineer' | 'factory' | 'airship'
  // 近未来・宇宙
  | 'corp' | 'hacker' | 'pilot' | 'medic' | 'researcher'
  // 現代
  | 'office' | 'explorer' | 'police'
  // 文明の後
  | 'scavenger' | 'raider';

// 主人公から見た関係
export type Role =
  | 'mother' | 'father' | 'sibling' | 'spouse' | 'child' | 'lover' | 'fiance'
  | 'friend' | 'companion' | 'mentor' | 'rival' | 'nemesis' | 'familiar' | 'master' | 'servant' | 'disciple';

export interface Memory { age: number; text: string; d: number }

export interface Tie {
  id: number;           // この人生の中で一意
  name: string;
  role: Role;
  race: RaceId;
  sex: Sex;
  age: number;          // 今の年齢
  alive: boolean;
  bond: number;         // 主人公との近さ 0–100
  since: number;        // 輪に入った時の主人公の年齢
  until?: number;       // 離れた時の主人公の年齢 (別れ・追放)
  diedAt?: number;      // 亡くなった時の主人公の年齢
  mem: Memory[];        // 共有の記憶 (新しいものほど後ろ、上限あり)
  job?: JobId | null;
}

export interface LogEntry {
  age: number;
  text: string;
  kind: YearKind;
  big?: boolean;        // 年表で目立たせる
  why?: string;         // なぜそうなったかの一行
  who?: number[];       // 関わった人 (Tie.id)
  hazard?: Hazard;      // 死亡の記録なら死因の分類
}

export interface Option {
  label: string;
  hint?: string;
  apply: (h: Hero) => void;
}
export interface Decision {
  title: string;
  text: string;
  options: Option[];
  auto: (h: Hero) => number; // 自動で選ぶときの番号 (policy を見る)
  ref?: string;               // 保存から作り直すための名札 ('ev:<EventDef.id>' / 'job:<JobId>,<JobId>…')。engine が付ける
}

export interface DeathRecord {
  hazard: Hazard;
  id: string;           // DeathDef.id
  label: string;        // 集計で並べる短い名前 (今の言語)
  text: string;         // 死亡の記録の文 (今の言語)
}

export interface Hero {
  seed: number;
  rng: Rng;
  setup: Setup;         // 選ばなかった項目を埋めた後の設定 (同じ設定で何度も試すため)
  world: World;
  name: string;         // 表示の名前
  given: string;
  sex: Sex;
  race: RaceId;
  status: Status;
  talent: Talent;
  cheat: CheatId | null;
  arrival: Arrival;
  memory: MemoryLevel;
  memoryAwake: boolean; // 前世の記憶が今あるか (awaken は途中で true になる)
  past?: PastLife;
  age: number;          // 実年齢
  alive: boolean;
  death?: DeathRecord;
  stats: Stats;
  level: number;        // gamey の世界でだけ表に出す。どの世界でも内部では持つ
  rank?: GuildRank;     // 冒険者ギルドに入っていれば
  job: JobId | null;
  jobYears: number;
  flags: Record<string, number>; // 出来事が立てるしるし (値は立った年齢)
  revives: number;      // 残っている死の取り消し
  people: Tie[];
  nextId: number;
  log: LogEntry[];
  pending: Decision[];  // 画面で選ぶのを待っている選択
  kinds: YearKind[];    // 年ごとの色分け (年表用)
  state: WorldState;    // その年の世界 (戦争・疫病・飢饉・魔王)
  auto: boolean;
  policy: Policy;
  used: string[];       // 一生に一度の出来事の id
  recent?: Record<string, number>; // 何度も起きる出来事が最後に起きた年齢 (id → 年齢。続けて起きないように)
}

// その年の世界の様子 (戦争・疫病・飢饉・魔王)
export interface WorldState {
  war: number;          // 戦争が続いている残りの年数 (0 = 平時)
  plague: number;       // 大疫病の残り年数
  famine: number;       // 飢饉の残り年数
  demonKing: boolean;   // 魔王が健在 (fantasy で magic>=2 の世界)
}

// ---- 出来事と死因の文のデータ (src/data/) ---------------------------------

// 1年に起きうる出来事。条件はすべて「かつ」。省略した条件は問わない
export interface EventDef {
  id: string;                 // 一意。ファイルの頭文字を付ける (例 'fy.first-slime')
  stage: Stage[];
  age?: [number, number];     // 実年齢がこの範囲 (誕生そのものは [0, 0])。stage は人間換算なので、長命種では生まれの出来事が十数年後に出てしまう
  tags?: WorldTag[];          // 世界がこのうち1つでも持てば起きる
  not?: WorldTag[];           // 世界がこのうち1つでも持てば起きない
  magic?: number;             // 世界の magic がこれ以上
  powers?: number;            // 世界の powers がこれ以上
  tech?: [number, number];    // 世界の tech がこの範囲
  status?: Status[];          // 生まれの身分がこのどれか
  jobs?: (JobId | 'none')[];  // 今の職業がこのどれか ('none' は無職・子ども)
  races?: RaceId[];
  cheat?: boolean;            // true: 何か転生特典を持つ / false: 持たない
  cheats?: CheatId[];         // この特典のどれかを持つ
  memory?: boolean;           // true: 前世の記憶が今ある / false: ない
  arrival?: Arrival[];
  sex?: Sex;
  flag?: string;              // このしるしが立っている
  noFlag?: string;            // このしるしが立っていない
  w: number;                  // 起きやすさ (1 = ふつう、3 = よくある、0.3 = まれ)
  repeat?: boolean;           // 一生に何度も起きてよい (省略 = 一度きり)。同じ出来事は5年あけてから
  alone?: boolean;            // その年にほかの記録が何も無いときだけ起きる (「穏やかな一年だった」のような穴埋め)
  kind: YearKind;
  big?: boolean;
  // 文。置き換え: {name} 主人公の名 / {friend} {companion} {mentor} {rival} {nemesis} {lover} {spouse} {child} {familiar} {master} {disciple} 輪の人の名 /
  // {mother} {father} 親 (名ではなく「母」「父」と続柄で出る) /
  // 輪の人の置き換えを使う出来事と、tie で触れる出来事 (new でなければ) は、その人が生きてそばにいるときだけ起きる /
  // {town} 町の名 / {god} 神の名 / {beast} その世界の魔物 / {job} 職業名 / {race} 種族名 / {guild} ギルドの名 / {lord} 領主の名
  ja: string;
  en: string;
  eff?: Partial<Record<StatKey | 'level', number>>; // 能力の増減
  set?: string;               // 立てるしるし
  tie?: { role: Role; new?: boolean; d?: number; dies?: boolean }; // 輪の人と共有する (new: その役の人を新しく作る。d: 近さの変化。dies: この出来事でその人が亡くなる)
  risk?: { hazard: Hazard; p: number };              // この出来事でその年に亡くなりうる追加の確率
  why?: Text;                 // なぜの一行 (省略可)
  choice?: {                  // 選択肢のある出来事 (選ぶまで次の年に進まない)
    ja: string; en: string;   // 問い
    options: {
      ja: string; en: string; // 選択肢のラベル
      eff?: Partial<Record<StatKey | 'level', number>>;
      set?: string;
      risk?: { hazard: Hazard; p: number };
      log?: Text;             // 選んだ後の一文
    }[];
  };
}

// 死因の文。亡くなった年に、引いた分類 (hazard) と条件に合うものから重みで選ぶ
export interface DeathDef {
  id: string;
  hazard: Hazard;
  stage?: Stage[];
  tags?: WorldTag[];
  not?: WorldTag[];
  magic?: number;
  tech?: [number, number];
  status?: Status[];
  jobs?: (JobId | 'none')[];
  races?: RaceId[];
  sex?: Sex;
  w: number;
  label: Text;                // 集計の短い名前 (例: 魔物に襲われた)
  ja: string;                 // 死亡の記録の文 (置き換えは EventDef と同じ。{age} も使える)
  en: string;
}

// ---- 絵の材料 (src/ui/) ---------------------------------------------------

export type Place =
  | 'home' | 'field' | 'town' | 'guild' | 'dungeon' | 'battle' | 'academy' | 'temple' | 'shop'
  | 'forge' | 'lab' | 'castle' | 'ship' | 'wild' | 'city' | 'grave';
export type Home = 'hovel' | 'house' | 'manor' | 'castle';
export type Tod = 'morning' | 'day' | 'dusk' | 'night';

// 描く1人。見た目 (色・髪型) は seed から決まるので、同じ人は場面でも顔でも同じ色になる
export interface Figure {
  seed: number;
  race: RaceId;
  sex: Sex;
  stage: Stage;
  job: JobId | null;
  status: Status;
  me?: boolean;
  dead?: boolean;
}

export interface SceneSpec {
  seed: number;
  world: WorldId;
  place: Place;
  home: Home;
  tod: Tod;
  season: 0 | 1 | 2 | 3;
  figures: Figure[];   // 左から並べる。多くて5人
  dead?: boolean;      // 墓の場面
}
