// 戦いの演出 (LogEntry.fight)。相手と結果は、文とエンジンが決めた結果から読むだけで、乱数は引かない (同じ seed の人生を変えないため)
import type { EventDef, Fight, Foe, Hazard, Hero, LogEntry } from './types';
import { alliesFor } from './people';

const FIGHT_HZ: Hazard[] = ['monster', 'war', 'violence'];
// 文に出てくる言葉から相手を決める (上から順に見る)
const FOE_WORDS: [RegExp, Foe][] = [
  [/竜|ドラゴン|ワイバーン|蛟|dragon|wyvern|drake/i, 'dragon'],
  [/魔王|魔族|魔尊|悪魔|鬼の王|demon/i, 'demon'],
  [/屍|骸骨|亡者|アンデッド|死霊|僵屍|ゾンビ|undead|skeleton|ghoul|zombie|jiangshi|husk/i, 'undead'],
  [/ドローン|機械|ロボ|アンドロイド|戦車|砲台|drone|robot|android|mech|turret/i, 'machine'],
  [/盗賊|山賊|野盗|強盗|追い剥ぎ|ギャング|海賊|略奪|bandit|robber|thug|gang|pirate|raider/i, 'bandit'],
  [/兵|軍|合戦|戦場|侍|騎士|soldier|army|troops|knight|samurai/i, 'soldier'],
  [/狼|熊|猪|獣|大蛇|蟒|虎|鮫|蠍|beast|wolf|bear|boar|serpent|tiger|shark|scorpion/i, 'beast'],
];

// 戦いの記録。その年に一緒に戦う輪の人 (people.ts の alliesFor。多くて3人) を allies に入れる
export function fightOf(h: Hero, foe: Foe, result: Fight['result'] = 'win'): Fight {
  const allies = alliesFor(h).map((t) => t.id);
  return allies.length ? { foe, result, allies } : { foe, result };
}

export function foeFor(h: Hero, hz: Hazard | undefined, text: string): Foe {
  for (const [re, f] of FOE_WORDS) if (re.test(text)) return f;
  const t = h.world.tags;
  if (hz === 'war') return t.includes('scifi') ? 'machine' : 'soldier';
  if (hz === 'violence') return 'bandit';
  if (t.includes('scifi')) return 'machine';
  if (t.includes('ruin')) return 'beast';
  // ダークファンタジーは屍が多い。半々にするのに乱数は使わず、seed と年齢で決める
  if (t.includes('dark') && ((h.seed + h.age) & 1) === 1) return 'undead';
  return 'monster';
}

// 暴力の危険でも、毒・陰謀・断罪・口論は戦いではない。刃や拳を交える文 (か、種類が battle / adventure) だけを戦いにする
const CLASH = /刺|斬|殴|襲|斬り|剣|刃|槍|弓|矢|拳|決闘|果たし|待ち伏せ|奇襲|乱闘|喧嘩|撃|銃|stab|slash|strike|attack|ambush|duel|sword|blade|spear|arrow|fist|brawl|fight|shoot|gun/i;
export const isClash = (text: string) => CLASH.test(text) || FOE_WORDS.some(([re, f]) => (f === 'bandit' || f === 'soldier') && re.test(text));

// 戦いの出来事か: その年の危険が魔物・戦 (暴力は刃を交えるものだけ)、種類が battle、データに foe がある
export function fightHazard(def: EventDef, text: string): Hazard | undefined | false {
  if (def.foe || def.kind === 'battle') return def.risk?.hazard;
  const hzs = [def.risk?.hazard, ...(def.choice?.options.map((o) => o.risk?.hazard) ?? [])].filter((x): x is Hazard => !!x && FIGHT_HZ.includes(x));
  const hz = hzs[0];
  if (!hz) return false;
  if (hz === 'violence' && def.kind !== 'adventure' && !isClash(text + (def.choice ? def.choice.ja + def.choice.en : ''))) return false;
  return hz;
}

export const FLEE = /逃げ|退く|退いた|引き返|身を隠|隠れ|見送る|やり過ご|走って|flee|run|retreat|hide|back off|slip away/i;

// その年の、いちばん新しい戦いの記録
export function lastFight(h: Hero): LogEntry | undefined {
  for (let i = h.log.length - 1; i >= 0 && h.log[i].age === h.age; i--) if (h.log[i].fight) return h.log[i];
  return undefined;
}

// 出来事の後で結果を付ける。死んだ (lose) > 取り消された死・傷 (hurt) > 勝った (win)
export function settleFight(h: Hero, e: LogEntry, hz: Hazard | undefined, hpLoss: boolean): void {
  if (!e.fight) return;
  if (!h.alive && (!hz || h.death?.hazard === hz)) e.fight.result = 'lose';
  else if (h.flags.revived === h.age || hpLoss) e.fight.result = 'hurt';
}

