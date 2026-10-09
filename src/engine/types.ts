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
  blessing?: boolean;          // 女神の加護。幼いうちの死を減らす (省略 = なし。史実どおりの厳しさ)
  startAge?: StartAge;         // この世界で人生が始まる年齢 (省略 = 転生の型どおり)
  traits?: string[];           // 選んだスキル・能力・加護・体質・弱点の id (省略 = おまかせ。[] = 何も持たない)
  points?: Partial<Record<AllotKey, number>>; // 能力へのポイント配分 (省略 = おまかせ)
}

// 人生が始まる年齢。child/teen は「その年齢の子の体で目を覚ます」、adult は成人として召喚・転移される
export type StartAge = 'birth' | 'child' | 'teen' | 'adult';

// ポイントを振れる能力。1ポイントで +5
export type AllotKey = 'hp' | 'power' | 'mind' | 'charm' | 'luck';

// スキル・能力・加護・体質・弱点 (src/data/traits/)。ポイントと枠の中で選ぶ
export type TraitKind = 'skill' | 'ability' | 'blessing' | 'constitution' | 'weakness';
export interface TraitDef {
  id: string;                 // 一意。ファイルの頭文字を付ける
  kind: TraitKind;
  name: Text;
  desc: Text;                 // 一行の説明。効き目が分かるように (例: 毒による死が半分になる)
  cost: number;               // ポイント。弱点は負 (選ぶとポイントが戻る)
  tags?: WorldTag[];          // この系統の世界でだけ選べる (省略 = どこでも)
  not?: WorldTag[];
  magic?: number;             // 世界の magic がこれ以上
  powers?: number;
  tech?: [number, number];
  races?: RaceId[];           // この種族だけ
  excl?: string[];            // 同時に持てない trait の id
  mult?: Partial<Record<Hazard, number>>;              // 死因ごとのハザードの倍率
  aging?: number;             // 老化の速さの倍率
  stats?: Partial<Record<StatKey, number>>;            // 始まりの能力の増減
  events?: Partial<Record<YearKind, number>>;          // その種類の出来事の起きやすさの倍率
  jobs?: Partial<Record<JobId, number>>;               // その職業に就きやすくなる倍率
  attention?: number;         // 目立ちやすさの足し算 (0–3)
  fertility?: number;         // 子を授かる確率の倍率
}

// 自動で選ぶときの性格。慎重=死ににくい方を、無謀=得の大きい方を選ぶ
export type Policy = 'careful' | 'normal' | 'bold';

export interface Setup {
  seed: number;
  world: WorldChoice;
  hero: HeroChoice;
  policy?: Policy;
  auto?: boolean; // 選択も自動で決める (集計と「最後まで」用)
  anchors?: Anchors; // ほかの人の一生を作るときに、必ず合わせる点 (engine/others.ts)。主人公には付けない
}

// ほかの人の一生 (engine/others.ts) で、エンジンに必ず合わせさせる点。age はすべてその人の年齢
export interface Anchors {
  bornAt: number;                 // 生まれた時の主人公の年齢 (worldYears を引くため)
  worldYears?: WorldYear[];       // 世界の様子 (at は主人公の年齢)。あればそれに従い、自分では戦争や疫病を引かない
  deathAt?: { age: number; hazard: Hazard; label?: string; text?: string }; // この年にこの死因で亡くなる (それより前には死なない)
  noDeathBefore?: number;         // この年齢より前には死なない
  marry?: { age: number; name: string; sex: Sex; race: RaceId; until?: number; end?: 'death' | 'leave'; withHero?: boolean }; // 連れ合いの期間。ほかの人とは結婚しない。withHero: 相手が主人公
  children?: { age: number; name: string; sex: Sex; withHero?: boolean }[]; // この年齢でこの子が生まれる (ほかに子は生まれない)。withHero: 主人公との子
  parents?: { mother?: { name: string; age: number; diesAt?: number }; father?: { name: string; age: number; diesAt?: number } }; // 生まれた時の親 (きょうだいは同じ親)。diesAt はその人の年齢
  shared?: { age: number; text: string; kind: YearKind; who?: string }[]; // 主人公と共有した出来事 (その人の年表に入れる)
  job?: JobId;                    // 大人になって就く職業
  noFamily?: boolean;             // 生まれた時の家族を作らない (主人公の親など、その親が分からない人)
  arriveAge?: number;             // この年齢から始める (召喚・転移で来た年齢。年表はこの年齢から)
  holdUntil?: number;             // この年齢までは、職業を job のまま変えない (しるし・英雄の筋・出来事でも)。主人公と輪でつながっていた間
  level?: number;                 // holdUntil までの level の上限 (その年にはちょうどこの値にする)
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
  | 'age'         // 老い
  | 'return';     // 元の世界へ帰った (異世界転移した人の終わり方。死ではない。毎年の確率には入らない)

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
  profile?: Profile;    // その人自身のこと (engine/people.ts。古いセーブには無い)
}

// 輪の人の性格。文の言い回しと、その人の出来事の起きやすさに使う
export type Personality = 'kind' | 'stern' | 'cheerful' | 'quiet' | 'proud' | 'timid' | 'brave' | 'cunning' | 'gentle' | 'fiery';

// 輪の人自身に起きた出来事 (主人公と関係なく)。age は主人公の年齢
export interface PersonEvent {
  age: number;
  text: string;         // 今の言語の文
  kind: 'marry' | 'child' | 'promote' | 'rank' | 'level' | 'injury' | 'leave' | 'death' | 'other';
}

export interface Profile {
  level: number;        // 仲間として戦うときの強さ (主人公と同じ尺度)
  rank?: GuildRank;     // 冒険者ギルドに入っていれば
  skill?: string;       // 目立つ技 (TraitDef の id)
  personality: Personality;
  met: string;          // どう出会ったかの一文 (今の言語)
  story: PersonEvent[]; // その人の出来事 (新しいものほど後ろ、上限あり)
  fate?: string;        // その人のその後の一行 (亡くなった・離れた・主人公が亡くなった時点で書く)
}

export interface LogEntry {
  age: number;
  text: string;
  kind: YearKind;
  big?: boolean;        // 年表で目立たせる
  why?: string;         // なぜそうなったかの一行
  who?: number[];       // 関わった人 (Tie.id)
  hazard?: Hazard;      // 死亡の記録なら死因の分類
  fight?: Fight;        // 戦いの出来事なら、相手と結果 (場面の演出用。結果はエンジンが決めたもの)
  close?: Hazard;       // 九死に一生の一文なら、いちばん危なかった死因 (engine/closecall.ts)
  join?: number[];      // この出来事で輪に加わった人 (Tie.id)
  leave?: number[];     // この出来事で離れた・亡くなった人 (Tie.id)
  shared?: boolean;     // ほかの人の一生の年表で、主人公と共有した行 (共有の出来事・主人公との結婚と子・主人公の死を知る行・出会いや戦い)
}

// 戦いの相手の大分類。絵は世界ごとに描き分ける (ui/enemy.ts)
export type Foe = 'monster' | 'beast' | 'bandit' | 'soldier' | 'undead' | 'dragon' | 'demon' | 'machine';
export interface Fight { foe: Foe; result: 'win' | 'hurt' | 'flee' | 'lose'; allies?: number[] } // lose はその戦いで亡くなった。allies は一緒に戦った輪の人 (Tie.id)

// 立ち絵の姿勢 (ui/sprite.ts)。コマ数は sprite.ts の POSE_FRAMES
export type Pose = 'idle' | 'walk' | 'attack' | 'hurt' | 'down' | 'cheer'

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
  traits: string[];     // 持っているスキル・能力・加護・体質・弱点
  blessing: boolean;
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
  reinc?: ReincState;
  lineage?: Lineage;    // 続けて遊んだ主人公 (engine/lineage.ts の continueAs)。最初の主人公には無い   // ほかの転生者との関わり (engine/reincarnators.ts)。古いセーブには無い
  worldHist?: string;   // 各年の世界の様子 (年齢ごとに1文字。16進で 1 戦争 / 2 大疫病 / 4 飢饉 / 8 魔王)。古いセーブには無い
  recent?: Record<string, number>; // 何度も起きる出来事が最後に起きた年齢 (id → 年齢。続けて起きないように)
  peopleLog?: { n: number; wait: LogEntry[] }; // 人物像が年表に足した件数と、翌年に差し込む行 (engine/people.ts。保存に残す)
  train?: TrainState;   // 今の鍛え方 (engine/training.ts)。古いセーブには無い
  learned?: string[];   // 生きている間に身につけた trait (traits にも入る。解放の「見た」には数えない)
  transfer?: TransferState; // 異世界転移で来た人の、元の世界の持ち物と来かた (arrival が summoned のとき)
  standing?: Status;    // 今の身分 (成り上がり・没落で変わる。無ければ生まれの身分 status のまま。engine/climb.ts)
  climb?: { age: number; from: Status; to: Status }[]; // 身分が変わった記録
}

// ---- 鍛える (engine/training.ts、データは src/data/training/*.ts) ----------------

type Cond = Pick<EventDef, 'tags' | 'not' | 'magic' | 'powers' | 'tech' | 'races' | 'status' | 'jobs' | 'cheat' | 'cheats' | 'arrival'>;

// 鍛え方の1つ (剣の稽古・火の魔法の手ほどき・料理修業 …)。この数年に選べる道の候補
export interface TrainPath extends Cond {
  id: string;                 // 'tr.<名>'
  name: Text;                 // 選択肢に出る名 (例 剣の稽古)
  where?: Text;               // どこで・誰に (例 町の剣術道場)。選択肢の添え書きに出る
  heq?: [number, number];     // 人間換算の年齢がこの範囲 (省略 7〜70)
  talents?: Talent[];         // 才能が合えば選ばれやすく、身につきやすい
  stats: Partial<Record<StatKey | 'level', number>>; // 1年ごとに伸びる能力
  traits: string[];           // 身につきうる trait の id (その世界・種族で選べるものだけ)
  cost?: number;              // 1年ごとの暮らし向きの減り (月謝・材料費)
  risk?: { hazard: Hazard; p: number }; // 1年ごとの命の危険
  w?: number;                 // 候補に出やすさ (省略 1)
  start: Text;                // 選んだ年の一文
  lines?: Text[];             // ふつうの年の一文 (たまに出る)
  fails: Text[];              // うまくいかなかった年の一文 (笑える失敗)
  got?: Text;                 // 身につけたときの一文 ({target} が身につけた trait の名)。省略なら決まった言い方
}

// 狙ったスキルへの近づき方 (弟子入り・独学・魔導書・ダンジョン・ズル …)
export interface TrainMethod extends Cond {
  id: string;
  name: Text;
  speed: number;              // 1年ごとの進み (100 で身につく)
  cost?: number;
  risk?: { hazard: Hazard; p: number };
  failP: number;              // 1年ごとに失敗する確率
  minHeq?: number;
  start: Text;                // {target} が狙うスキル名 (steps・fails・done でも)
  steps: [Text, Text];        // 3割・7割に来たときの一文
  fails: Text[];
  done: Text;                 // 身につけたときの一文
}

export interface TrainState {
  kind: 'path' | 'goal' | 'climb' | 'rest';
  id: string;                 // TrainPath.id / 狙う trait の id / ClimbRoute.id / 'rest'
  method?: string;            // goal のとき TrainMethod.id
  since: number;              // 始めた年齢
  step: number;               // 何回目の見直しか (engine/training.ts の STEPS の番号)
  prog: number;               // goal の進み (0〜100)
  done?: boolean;             // goal を果たした / やめた (次の年に見直す)
}

// 成り上がり: 今の身分から一つ上へ、数年かけて近づく道 (engine/climb.ts、データは src/data/climb.ts)
export interface ClimbRoute extends Cond {
  id: string;                 // 'c.<名>'
  from: Status[];             // 今の身分がこのどれか
  to: Status;                 // 果たしたらこの身分に
  name: Text;
  speed: number;              // 1年の進み (100 で果たす)
  failP: number;
  cost?: number;
  risk?: { hazard: Hazard; p: number };
  heq?: [number, number];
  need?: { stat?: [StatKey, number]; flag?: string; noFlag?: string; job?: boolean }; // 能力がこれ以上 / しるし / 職に就いている
  set?: string;               // 果たしたら立てるしるし (knighted / lord …)
  start: Text;
  steps: [Text, Text];
  fails: Text[];
  done: Text;
}

// 異世界転移: 元の世界 (地球) の名前・仕事・持ち物を持ったまま来る
export type TransferHow = 'hero' | 'caught' | 'vanish' | 'class' | 'accident';
export interface TransferState {
  how: TransferHow;
  job: Text;                  // 元の世界の仕事 (高校生・会社員 …)
  items: string[];            // 持ってきた物の id (src/data/transfer.ts)
  battery?: number;           // スマホの電池が切れた年齢
  returned?: boolean;         // 元の世界に帰った (一生の終わり方)
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
  needs?: ('skill' | 'ability' | 'blessing' | 'constitution')[]; // その種類の trait を1つ以上持つ (文の {skill} {ability} {blessing} {trait} が埋まる)
  memory?: boolean;           // true: 前世の記憶が今ある / false: ない
  arrival?: Arrival[];
  pastCause?: PastLife['cause'][]; // 前世の死に方がこのどれか (トラック・過労 …)
  standing?: Status[];        // 今の身分がこのどれか (成り上がり・没落の後の身分。status は生まれの身分)
  sex?: Sex;
  flag?: string;              // このしるしが立っている
  noFlag?: string;            // このしるしが立っていない
  w: number;                  // 起きやすさ (1 = ふつう、3 = よくある、0.3 = まれ)
  birth?: boolean;            // 子が生まれる出来事 (産む側が子を持てる年齢のときだけ起きる)
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
  set?: string;               // 立てるしるし (hero / saint / knighted / lord は職業も 勇者 / 聖女 / 騎士 / 領主 に変わる)
  job?: JobId;                // この出来事で就く職業 (弟子入り・入門・任官など、文が職業の変化を語るとき)
  foe?: Foe;                  // 戦いの相手 (省略なら文と世界から決める。risk が魔物・戦・暴力か kind が battle の出来事が戦いになる)
  tie?: { role: Role; new?: boolean; d?: number; dies?: boolean }; // 輪の人と共有する (new: その役の人を新しく作る。d: 近さの変化。dies: この出来事でその人が亡くなる)
  risk?: { hazard: Hazard; p: number };              // この出来事でその年に亡くなりうる追加の確率
  why?: Text;                 // なぜの一行 (省略可)
  choice?: {                  // 選択肢のある出来事 (選ぶまで次の年に進まない)
    ja: string; en: string;   // 問い
    options: {
      ja: string; en: string; // 選択肢のラベル
      eff?: Partial<Record<StatKey | 'level', number>>;
      set?: string;
      job?: JobId;            // この選択肢で就く職業
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
  rest?: boolean;             // true: 老いない人が千年の上限に届いたときだけ (自分で選んだ終わり)。省略: その死では選ばない
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
  earth?: boolean;      // 異世界転移で来た人 (元の世界の髪と目の色のまま)
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

// ---- ほかの人の一生・ほかの転生者・年代記 (engine/others.ts, reincarnators.ts, chronicle.ts) ----
// at はどれも「主人公の年齢」で数えた時点 (主人公が生まれる前は負)。主人公の一生の年表と横に並べるため

// 世界のその年の様子 (主人公の一生を同じ seed で辿り直して得る。前後は横の乱数で延ばす)
export interface WorldYear { at: number; war: boolean; plague: boolean; famine: boolean; demonKing: boolean }

// 主人公以外の一生。log の age はその人の年齢
export interface OtherLife {
  key: string;            // 't:<Tie.id>' か 'r:<転生者の番号>'
  name: string;
  race: RaceId;
  sex: Sex;
  status: Status;
  bornAt: number;         // 生まれた時の主人公の年齢 (負なら主人公より年上)
  diedAt?: number;        // 亡くなった時の主人公の年齢 (主人公の一生より後なら、その後の年齢)
  ageAtDeath?: number;
  death?: DeathRecord;
  job: JobId | null;
  level: number;
  rank?: GuildRank;
  cheat?: CheatId;
  past?: PastLife;
  log: LogEntry[];
}

// ほかの転生者・召喚者・目覚めた者
// 系譜: 死亡記録から輪の人を選んで続けた主人公 (engine/lineage.ts)。時間は最初の主人公の年齢で数える (root time)
export interface Ancestor {
  name: string; given: string; race: RaceId; sex: Sex;
  key: string;            // その人を選んだ鍵 ('root' / 't:<id>' / 'r:<id>')
  bornAt: number;         // 生まれた年 (最初の主人公の年齢)
  diedAt: number;         // 亡くなった年 (最初の主人公の年齢)
  ageAtDeath: number;
  cause?: string;         // 死因の短い名 (今の言語)
  job?: JobId | null;
  deeds?: { at: number; text: string }[]; // その代の手柄 (年代記に載せる。at は最初の主人公の年齢)
}
export interface Lineage {
  gen: number;            // 何代目か (最初の主人公 = 1、続けた人 = 2, 3, …)
  rootSeed: number;       // 最初の主人公の seed (世界の固有名・転生者の名簿の基準)
  root: { given: string; race: RaceId; start: number }; // 名簿を作り直すための、最初の主人公の手がかり
  key: string;            // この主人公を選んだ鍵 ('t:<id>' / 'r:<id>')
  self?: number;          // この主人公自身が転生者の名簿の誰かなら、その番号 (自分には会わない)
  offset: number;         // この主人公が生まれた年 (最初の主人公の年齢)。この主人公の年齢 + offset = 最初の主人公の年齢
  startAge: number;       // 続けて遊び始めた時のこの主人公の年齢 (それより前の年表は、錨の付いた一生から写した過去)
  histStart: number;      // hist の最初の年 (最初の主人公の年齢)
  hist: string;           // 前の代までの世界の様子 (Hero.worldHist と同じ1年1文字。histStart から前の主人公の死の年まで)
  ancestors: Ancestor[];  // 前の代の人たち (古い順)
}

// 主人公とほかの転生者の関わり (Hero.reinc)。保存と再開にそのまま乗る
export interface ReincFight { id: number; at: number; result: 'win' | 'hurt' | 'flee' } // id は Reincarnator.id、at は主人公の年齢
export interface ReincState {
  wait: LogEntry[];       // 年表に足すのを待っている行
  heard: number[];        // 噂を聞いた転生者の id
  met: [number, number][]; // 会った転生者の id と、輪に入れた Tie.id
  allied: number[];
  foes: number[];
  fights: ReincFight[];
  n: number;              // 年表に足した行の数
}

export type ReincarnatorFate = 'hero' | 'demonlord' | 'ruler' | 'merchant' | 'retired' | 'early' | 'wanderer' | 'villain';
export interface Reincarnator {
  id: number;             // この人生の中で一意 (1から)
  seed: number;
  name: string;
  race: RaceId;
  sex: Sex;
  arrival: Arrival;
  cheat: CheatId;
  past: PastLife;
  bornAt: number;         // この世界に生まれた (召喚なら来た) 時の主人公の年齢
  fate: ReincarnatorFate; // 一生の大筋 (その一生を最後まで辿ると、これに沿う)
  tieId?: number;         // 主人公が会って輪に入れたなら、その Tie.id
}

export type ChronicleKind = 'war' | 'plague' | 'famine' | 'demon' | 'reincarnator' | 'hero' | 'realm';
export interface ChronicleEntry {
  at: number;             // 主人公の年齢 (負は生まれる前)
  text: string;           // 今の言語
  kind: ChronicleKind;
  who?: string[];         // 関わった人 (OtherLife.key と同じ形。't:3' 'r:2')
  lived?: boolean;        // 主人公が生きて経験した年 (年表のその年へ飛べる)
}
