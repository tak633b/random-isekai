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
  reborn: L('赤ちゃんから', 'Reborn as a baby'), awaken: L('途中で思い出す', 'Remembers later'),
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
