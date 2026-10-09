// 英雄の筋 (機能A): 特典を持つ人は、力に気づく → 初めて使う → ギルドに登録して昇格 → 大きな手柄 → 町を救う → 名声 → 伝説、と進む。
// 段階はしるしで持つ (DESIGN 5節): arc.notice / arc.first / guild / arc.deed / arc.saved / famous / arc.legend。
// データ (src/data/events/heroic.ts) が flag/noFlag でこの順の出来事を書き、エンジンは
//   1. 特典を持つ人の、次の段階の出来事と英雄の種類の出来事の重みを上げる (events.ts の weight)
//   2. データの出来事が来なくても筋が止まらないよう、段階ごとの節目 (遅くともこの年齢までに) をここで起こす
// 特典を持たない人には何もしない (普通の人生の手触りを残す。対比が大事)
import type { Foe, GuildRank, Hero, JobId, LogEntry } from './types';
import { FIGHT_JOBS, JOBS, jobsFor } from './jobs';
import { jobHeld } from './anchor';
import { bump, log } from './bonds';
import { CHEATS } from './cheats';
import { heqOf } from './mortality';
import { styleOf, worldNames } from './names';
import { fightOf, foeFor, heroActive, onArc, type Die } from './events';
import { rankWord } from './people';
import { L, T } from '../i18n';

export const ARC_FLAGS = ['arc.notice', 'arc.first', 'guild', 'arc.deed', 'arc.saved', 'famous', 'arc.legend'] as const;
const RANKS: GuildRank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];


// 筋のうち、今いちばん先にある段階の番号 (-1 = まだ何も)
export function arcStep(h: Hero): number {
  let s = -1;
  ARC_FLAGS.forEach((f, i) => { if (h.flags[f] !== undefined) s = i; });
  return s;
}


const gift = (h: Hero) => (h.cheat ? T(CHEATS[h.cheat].name) : '');

// 世界の系統ごとの「ギルド」の言い方 (worldNames の guild は既に 組・宗・探索者協会・傭兵組合・団 に変わっている)
function joinLine(h: Hero): [string, string] {
  const g = worldNames(h).guild;
  switch (styleOf(h.world)) {
    case 'zh': return [`${g}の門を叩き、外門弟子として名を記された。位は末席の「F」から。`, `Knocked at the gate of ${g} and was entered as an outer disciple. Rank F, the lowest seat.`];
    case 'wa': return [`${g}に名を連ね、請け負い仕事を始めた。格付けは「F」から。`, `Joined ${g} and began taking contracts. Rank F to start.`];
    case 'modern': return [`${g}の探索者資格を取った。等級はF。`, `Earned an explorer's license from ${g}. Grade F.`];
    case 'scifi': return [`${g}に登録した。等級はF。`, `Signed on with ${g}. Grade F.`];
    case 'ruin': return [`${g}に拾われ、見張りと狩りの番に加わった。序列は一番下の「F」。`, `Was taken in by ${g} for watch and hunting duty. Rank F, bottom of the pecking order.`];
    default: return [`${g}に冒険者として登録した。ランクはF。`, `Registered with ${g} as an adventurer. Rank F.`];
  }
}

// 大きな手柄と、町を救う出来事の言い方 (データの出来事が来なかった年の節目の文)
function deedLine(h: Hero, beast: string): [string, string] {
  switch (styleOf(h.world)) {
    case 'scifi': return [`〈${gift(h)}〉で、誰も戻らなかった廃棄区画の奥から暴走機を止めて帰ってきた。`, `With "${gift(h)}", ${h.given} went into the derelict sector no one had come back from and shut down the rogue machine.`];
    case 'modern': return [`〈${gift(h)}〉を頼りに、ダンジョンの最深部で${beast}を倒した。`, `Relying on "${gift(h)}", ${h.given} brought down a ${beast} in the dungeon's deepest floor.`];
    case 'zh': return [`〈${gift(h)}〉で、谷を荒らしていた${beast}を一人で討った。`, `With "${gift(h)}", ${h.given} slew the ${beast} that had ravaged the valley, alone.`];
    default: return [`〈${gift(h)}〉を使って、${beast}の巣になっていた古い迷宮を踏破した。`, `Using "${gift(h)}", ${h.given} cleared the old labyrinth where a ${beast} had made its den.`];
  }
}

function fightLog(h: Hero, text: string, kind: LogEntry['kind'], foe: Foe | undefined): LogEntry {
  const e = log(h, text, kind, true);
  if (foe) e.fight = fightOf(h, foe);
  return e;
}

// その年の筋の節目。データの出来事で段階が進んでいれば、ここでは重ねない (同じ年に2回は進めない)
// ---- 筋に乗った人の職業 -------------------------------------------------------
// 登録した (guild) のに職業が農民のまま、だと手柄の記録と合わない。登録した大人は、その世界で戦う職に就き直す。
// 世界の系統ごとの第一候補 (就けなければ、就ける戦う職のうち最初のもの)
const PREFERRED: Record<ReturnType<typeof styleOf>, JobId[]> = {
  west: ['adventurer'], myth: ['adventurer'], desert: ['adventurer'], wa: ['samurai', 'ninja'], zh: ['cultivator'],
  modern: ['explorer'], scifi: ['mercenary', 'pilot'], ruin: ['scavenger'],
};
// 筋に乗った人がそのままでよい職 (戦う職と、勇者・聖女・領主のように筋の先にある職)
export const KEEP: JobId[] = [...FIGHT_JOBS, 'hero', 'saint', 'lord', 'necromancer', 'assassin'];

export function fightJobFor(h: Hero): JobId | null {
  const can = jobsFor(h).map((j) => j.id);
  return PREFERRED[styleOf(h.world)].find((j) => can.includes(j)) ?? FIGHT_JOBS.find((j) => can.includes(j)) ?? null;
}

// 前の職業の道具 (転職の一文に使う)
const TOOL: Partial<Record<JobId, [string, string]>> = {
  farmer: ['鍬', 'hoe'], smith: ['槌', 'hammer'], merchant: ['帳簿', 'ledger'], cook: ['包丁', 'kitchen knife'], servant: ['前掛け', 'apron'],
  miner: ['つるはし', 'pick'], factory: ['工具', 'tools'], office: ['名刺', 'business cards'], corp: ['社員証', 'company badge'],
  scholar: ['筆', 'brush'], herbalist: ['薬研', 'mortar'], sailor: ['櫂', 'oar'], bard: ['竪琴', 'lute'], engineer: ['工具', 'tools'],
};

// 登録した大人が戦う職に就いていなければ就き直し、年表に転職の一文を入れる。乱数は引かない
export function ensureFightJob(h: Hero): void {
  if (!onArc(h) || !h.alive || h.flags.guild === undefined || h.flags.retired !== undefined || heqOf(h) < 16 || jobHeld(h)) return;
  if (h.job && KEEP.includes(h.job)) return;
  if (h.pending.some((d) => d.ref?.startsWith('job:'))) return; // 画面で職業を選んでいる途中なら、選んだ後に
  const to = fightJobFor(h);
  if (!to) return;
  const from = h.job;
  h.job = to; h.jobYears = 0;
  const nj = JOBS[to];
  if (from) {
    const [tja, ten] = TOOL[from] ?? ['仕事道具', 'tools'];
    log(h, L(`${JOBS[from].ja}の${tja}を置いて、${nj.ja}になった。`, `Set down the ${ten} of a ${JOBS[from].en.toLowerCase()} and became a ${nj.en.toLowerCase()}.`), 'work', true);
  } else {
    log(h, L(`${nj.ja}になった。`, `Became a ${nj.en.toLowerCase()}.`), 'work', true);
  }
}

export function arcYear(h: Hero, die: Die, beast: string): void {
  if (!onArc(h) || !h.alive) return;
  const e = heqOf(h);
  const f = h.flags;
  const now = h.age;
  const movedThisYear = ARC_FLAGS.some((k) => f[k] === now);
  if (movedThisYear) return;
  // 力に気づく: 前世の記憶が戻っていれば人間換算3歳から、そうでなければ5歳から。遅くとも12歳
  if (f['arc.notice'] === undefined) {
    if (e >= (h.memoryAwake ? 3 : 5) && (e >= 12 || h.rng() < 0.3)) {
      f['arc.notice'] = now;
      log(h, L(`自分の中に〈${gift(h)}〉という力があると気づいた。`, `${h.given} realized there was a power inside: "${gift(h)}".`), 'power', true);
    }
    return;
  }
  // 初めて使う: 気づいた翌年以降、人間換算6歳から。遅くとも15歳
  if (f['arc.first'] === undefined) {
    if (e >= 6 && (e >= 15 || h.rng() < 0.3)) {
      f['arc.first'] = now;
      bump(h, { power: 3, mind: 3 });
      log(h, L(`初めて〈${gift(h)}〉を人前で使った。見ていた者は、しばらく口がきけなかった。`, `${h.given} used "${gift(h)}" in front of others for the first time. No one spoke for a while.`), 'power', true);
    }
    return;
  }
  // ギルド (宗門・探索者の資格・傭兵の登録) に入る: 人間換算15歳から。遅くとも18歳
  if (f.guild === undefined) {
    if (e >= 15 && (e >= 18 || h.rng() < 0.4) && f.retired === undefined) {
      f.guild = now; h.rank = 'F';
      log(h, L(...joinLine(h)), 'adventure', true);
    }
    return;
  }
  if (!heroActive(h)) return;
  // 大きな手柄: ランク C 以上で年 2割。遅くとも ランク B か 人間換算30歳
  const ri = h.rank ? RANKS.indexOf(h.rank) : 0;
  if (f['arc.deed'] === undefined) {
    if (ri >= 3 && (ri >= 4 || e >= 30 || h.rng() < 0.2)) {
      f['arc.deed'] = now;
      bump(h, { fame: 10, wealth: 8, level: 3 });
      fightLog(h, L(...deedLine(h, beast)), 'adventure', foeFor(h, 'monster', beast));
      if (h.rng() < riskOf(h, 0.03)) die(h, 'monster'); // 大物との戦いには命の危険がある (特典の倍率で軽くなる)
    }
    return;
  }
  // 町や人々を救う: 手柄の後、年 2割。遅くとも 人間換算35歳
  if (f['arc.saved'] === undefined) {
    if (e >= 35 || h.rng() < 0.2) {
      f['arc.saved'] = now;
      bump(h, { fame: 12, happy: 6 });
      fightLog(h, L(`${worldNames(h).town}に${beast}の群れが押し寄せた夜、〈${gift(h)}〉で門を守り抜いた。朝、町の人々が{name}の名を呼んだ。`.replace('{name}', h.given),
        `The night a horde of ${beast} fell upon ${worldNames(h).town}, ${h.given} held the gate with "${gift(h)}". At dawn, the townsfolk were calling ${h.given}'s name.`), 'battle', foeFor(h, 'monster', beast));
      if (h.rng() < riskOf(h, 0.03)) die(h, 'monster');
    }
    return;
  }
  // 名声: 救った後か ランク A 以上で
  if (f.famous === undefined) {
    if (ri >= 5 || h.rng() < 0.3) {
      f.famous = now;
      bump(h, { fame: 15 });
      log(h, L(`{name}の名は、遠い町の酒場でも語られるようになった。`.replace('{name}', h.given), `${h.given}'s name was now told in taverns of faraway towns.`), 'fame', true);
    }
    return;
  }
  // 伝説: ランク S か 魔王を討った人が、人間換算35歳から年 1割
  if (f['arc.legend'] === undefined && (ri >= 6 || f.demonKingSlain !== undefined) && e >= 35 && h.rng() < 0.1) {
    f['arc.legend'] = now;
    bump(h, { fame: 20 });
    log(h, L(`吟遊詩人が{name}の歌を作った。本人の知らない手柄まで入っていた。`.replace('{name}', h.given), `A bard wrote a song about ${h.given}. It included deeds ${h.given} had never done.`), 'fame', true);
  }
}

// 特典の倍率で軽くした、節目の戦いの死の確率 (魔物)
function riskOf(h: Hero, p: number): number {
  return p * (h.cheat ? CHEATS[h.cheat].mult.monster ?? 1 : 1);
}

// ギルドの昇格 (research/02 の 10.6節: F→C に5〜10年、多くは C で引退、B 以上は1割)。
// 冒険者の職の人と、筋に乗った人 (特典を持つ人は昇格が早い)。ここは乱数の並びを今までと変えないよう、職が冒険者の人は前と同じ式
export function promote(h: Hero): void {
  if (h.flags.guild === undefined || !h.rank || h.rank === 'S' || h.flags.retired !== undefined) return;
  if (h.job !== 'adventurer' && !heroActive(h)) return;
  const i = RANKS.indexOf(h.rank);
  const boost = (h.cheat === 'exp_boost' || h.cheat === 'growth' ? 2 : 1) * (onArc(h) ? 1.8 : 1);
  const p = Math.max(0.02, (0.18 + (h.stats.power - 40) / 250) * boost * (i >= 3 ? 0.35 : 1) * (i >= 5 ? 0.3 : 1));
  if (h.rng() < p) {
    h.rank = RANKS[i + 1]; bump(h, { fame: 4 + i * 3, wealth: 3 });
    log(h, L(`${rankWord(h, h.rank)}に上がった。`, `Promoted to ${rankWord(h, h.rank)}.`), 'fame', i >= 3); // 呼び名は世界の系統で (宗門の位・探索者の等級など)
  }
}
