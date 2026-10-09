// 画面に出す呼び名。エンジンが名前を持っていないもの (才能・転生の型・記憶・性格・役・年の色) をここで訳す
import type { Arrival, GuildRank, MemoryLevel, PastLife, Policy, Role, Sex, StatKey, Talent, YearKind } from '../engine/types';
import { JOBS } from '../engine/jobs';
import type { JobId } from '../engine/types';
import { L } from '../i18n';

export const TALENT_NAME: Record<Talent, string> = {
  might: L('強さ', 'Might'), magic: L('魔力', 'Magic'), wits: L('知恵', 'Wits'), charm: L('人望', 'Charm'),
  luck: L('運', 'Luck'), craft: L('ものづくり', 'Craft'), none: L('なし', 'None'),
};

export const ARRIVAL_NAME: Record<Arrival, string> = {
  reborn: L('赤ちゃんから', 'Reborn as a baby'), awaken: L('途中で思い出す', 'Awakened later'),
  summoned: L('召喚', 'Summoned'), native: L('現地の生まれ', 'Native-born'),
};

export const MEMORY_NAME: Record<MemoryLevel, string> = { none: L('なし', 'None'), faint: L('ぼんやり', 'Faint'), full: L('はっきり', 'Clear') };

export const POLICY_NAME: Record<Policy, string> = { careful: L('慎重', 'Careful'), normal: L('ふつう', 'Normal'), bold: L('無謀', 'Reckless') };

export const SEX_NAME: Record<Sex, string> = { F: L('女', 'Female'), M: L('男', 'Male') };

export const STAT_NAME: Record<StatKey, string> = {
  hp: L('健康', 'Health'), power: L('強さ', 'Power'), mind: L('知恵と魔力', 'Mind'), charm: L('人望', 'Charm'),
  luck: L('運', 'Luck'), happy: L('幸せ', 'Happiness'), wealth: L('暮らし向き', 'Wealth'), fame: L('名声', 'Fame'),
};

export const ROLE_NAME: Record<Role, string> = {
  mother: L('母', 'Mother'), father: L('父', 'Father'), sibling: L('きょうだい', 'Sibling'), spouse: L('連れ合い', 'Spouse'),
  child: L('子', 'Child'), lover: L('恋人', 'Lover'), fiance: L('婚約者', 'Fiancé(e)'), friend: L('友', 'Friend'),
  companion: L('仲間', 'Companion'), mentor: L('師', 'Mentor'), rival: L('好敵手', 'Rival'), nemesis: L('宿敵', 'Nemesis'),
  familiar: L('従魔', 'Familiar'), master: L('主人', 'Master'), servant: L('従者', 'Servant'), disciple: L('弟子', 'Disciple'),
};

export const KIND_NAME: Record<YearKind, string> = {
  arrival: L('転生', 'Arrival'), child: L('幼い日々', 'Childhood'), school: L('学び', 'School'), adventure: L('冒険', 'Adventure'),
  battle: L('戦い', 'Battle'), work: L('仕事', 'Work'), love: L('恋と結婚', 'Love'), family: L('家族', 'Family'), loss: L('別れ', 'Loss'),
  ill: L('病', 'Illness'), power: L('力', 'Power'), fame: L('名声', 'Fame'), hard: L('苦しい年', 'Hard times'), old: L('老い', 'Old age'), death: L('死', 'Death'),
};

export const PAST_CAUSE_NAME: Record<PastLife['cause'], string> = {
  truck: L('トラックにはねられた', 'Hit by a truck'), overwork: L('働きすぎて倒れた', 'Collapsed from overwork'), illness: L('病で亡くなった', 'Died of an illness'),
  stabbed: L('通り魔に刺された', 'Stabbed by a stranger'), accident: L('事故で亡くなった', 'Died in an accident'), disaster: L('災害に巻き込まれた', 'Caught in a disaster'),
  old: L('老いて亡くなった', 'Died of old age'), unknown: L('気づいたら終わっていた', 'It ended without warning'),
};

export const RANKS: GuildRank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

export const jobName = (id: JobId | null | undefined): string => (id ? L(JOBS[id].ja, JOBS[id].en) : L('なし', 'None'));

// 年齢の書き方
export const ageText = (a: number): string => L(`${a}歳`, `age ${a}`);
export const yearsText = (a: number): string => L(`${a}年`, `${a} ${a === 1 ? 'year' : 'years'}`);

// 前世の終わりの一文。召喚・転移された人は死なずに来たので (エンジンは死に方を unknown にする)、来た時の様子を書く。
// 文は人ごと (seed) に選び、avoid に入っている番号は避ける (同じ一覧で同じ文が並ばないように)。選んだ番号を返す
const SUMMON_LINES: [string, string][] = [
  ['死なずに、そのまま召喚された', 'Was summoned alive, just as they were'],
  ['仕事の帰り道で光に包まれ、こちらへ来た', 'Was swallowed by light on the way home from work'],
  ['眠りについた夜、目を開けると見知らぬ神殿にいた', 'Fell asleep one night and woke in a strange temple'],
  ['駅のホームで足もとが光り、気づくとこの世界にいた', 'The platform floor lit up, and then this world'],
  ['買い物の途中で名を呼ばれ、振り返ったらこちらだった', 'Heard their name called while shopping, turned, and was here'],
  ['命は落とさず、ある日まるごと連れて来られた', 'Lost nothing, not even their life; was simply taken one day'],
  ['授業中、教室ごと光に飲まれた', 'Was swallowed by light in the middle of a class'],
  ['雨の交差点で白い光に呼ばれ、こちらへ渡った', 'A white light called from a rainy crosswalk, and they crossed over'],
  ['夜勤明けのコンビニを出たところで、景色が入れ替わった', 'Stepped out of a convenience store after a night shift into another world'],
  ['エレベーターの扉が開くと、石造りの広間だった', 'The elevator doors opened onto a stone hall'],
  ['釣りの最中、水面に映った魔法陣に引き込まれた', 'Was pulled in by a magic circle reflected on the water while fishing'],
  ['卒業式の朝、校門をくぐったところで呼ばれた', 'Was called away just as they walked through the school gate on graduation day'],
  ['病院の待合室で名前を呼ばれ、立ち上がったらここにいた', 'Stood up when their name was called in a hospital waiting room, and was here'],
  ['自転車で坂を下りきると、知らない草原だった', 'Coasted to the bottom of a hill on a bicycle and found an unknown meadow'],
  ['古本屋で開いた本の頁が光り、そのまま連れて来られた', 'Opened a book in a secondhand shop; the page lit up and took them'],
  ['家族旅行の車中でうたた寝し、起きたら召喚の祭壇だった', 'Dozed off on a family drive and woke on a summoning altar'],
  ['残業中のオフィスの床に魔法陣が浮かんだ', 'A magic circle appeared on the office floor during overtime'],
  ['神社の鈴を鳴らした瞬間、音ごとこちらへ運ばれた', 'Rang a shrine bell and was carried here along with the sound'],
];
export function pastEnd(cause: PastLife['cause'], summoned: boolean, seed: number, avoid: Set<number> = new Set()): { text: string; i: number } {
  // 英語は文として句点を付ける (日本語は「。」を付けない並べ方)
  if (!summoned && cause !== 'unknown') return { text: L(PAST_CAUSE_NAME[cause], `${PAST_CAUSE_NAME[cause]}.`), i: -1 };
  let i = (seed >>> 0) % SUMMON_LINES.length;
  for (let k = 0; k < SUMMON_LINES.length && avoid.has(i); k++) i = (i + 1) % SUMMON_LINES.length;
  return { text: L(SUMMON_LINES[i][0], `${SUMMON_LINES[i][1]}.`), i };
}

// 鍵のしるし (まだ解放していないもの)
export const lockIcon = (): string => '<svg class="lock" viewBox="0 0 7 8" aria-hidden="true"><path d="M2 3V2a1.5 1.5 0 0 1 3 0v1h1v5H1V3zm1 0h1V2a.5.5 0 0 0-1 0z"/></svg>';
