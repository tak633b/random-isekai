// 人の輪の人物像 (DESIGN 4-2節)。輪の人 (Tie) それぞれに、種族・職業・強さ・技・性格・出会い・その人の出来事・その後を持たせる。
// 約束: 主人公の乱数 (h.rng) は一度も引かない。引くのは人と年ごとに決まる横の乱数 (sideRng) だけなので、
// 同じ seed の人生の生死・出来事はそのままで、人物像だけが足される。
// 例外は旅立ち (until を付ける): そばにいる人の顔ぶれが変わるので、その年から後の出来事の候補が変わりうる
import type { GuildRank, Hero, JobId, LogEntry, Personality, PersonEvent, Profile, Role, Tie } from './types';
import { makeRng, pick, pickWeighted, type Rng } from './rng';
import { JOBS, jobsIn, type JobDef } from './jobs';
import { availableTraits, traitOf } from './traits';
import { heq } from './mortality';
import { raceOf } from './races';
import { beastName, styleOf, worldNames } from './names';
import { callName } from './bonds';
import { L, T } from '../i18n';

export const STORY_MAX = 12;
// false にすると peopleYear は何もしない (人物像を入れない人生と比べるテスト用)
export const PEOPLE = { on: true };
// 旅立ちの年あたりの確率。0 にすると、人物像を足しても主人公の人生は完全に同じになる
export const LEAVE_P: Partial<Record<Role, number>> = { friend: 0.012, companion: 0.015, disciple: 0.02, lover: 0.03, mentor: 0.015 };

// ---- 横の乱数 ---------------------------------------------------------------

function mix(...n: number[]): number {
  let x = 0x811c9dc5;
  for (const v of n) { x = Math.imul(x ^ (v >>> 0), 0x01000193); x ^= x >>> 15; }
  return x >>> 0;
}
const K_PROFILE = 1, K_YEAR = 2, K_FATE = 3;
const sideRng = (h: Hero, t: Tie, age: number, k: number): Rng => makeRng(mix(h.seed, t.id, age, k));

// ---- 小さな道具 -------------------------------------------------------------

const PERSONALITIES: Personality[] = ['kind', 'stern', 'cheerful', 'quiet', 'proud', 'timid', 'brave', 'cunning', 'gentle', 'fiery'];
const PERSONALITY_WORD: Record<Personality, [string, string]> = {
  kind: ['優しい', 'Kind'], stern: ['厳しい', 'Stern'], cheerful: ['明るい', 'Cheerful'], quiet: ['物静か', 'Quiet'], proud: ['誇り高い', 'Proud'],
  timid: ['臆病', 'Timid'], brave: ['勇敢', 'Brave'], cunning: ['抜け目ない', 'Shrewd'], gentle: ['穏やか', 'Gentle'], fiery: ['激しやすい', 'Hot-tempered'],
};
const FIGHT_JOBS = new Set<JobId>(['adventurer', 'hero', 'knight', 'soldier', 'mercenary', 'explorer', 'cultivator', 'samurai', 'ninja', 'raider',
  'hunter', 'mage', 'onmyoji', 'assassin', 'police', 'scavenger', 'tamer', 'necromancer']);
const FIGHT_ROLES = new Set<Role>(['companion', 'mentor', 'familiar', 'rival', 'nemesis', 'disciple']);
const FAMILY = new Set<Role>(['mother', 'father', 'sibling', 'child']);
const RANKS: GuildRank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

const heqT = (t: Tie) => heq(t.age, raceOf(t.race));
const fighter = (t: Tie) => FIGHT_ROLES.has(t.role) || (!!t.job && FIGHT_JOBS.has(t.job));
const jobWord = (id: JobId | null | undefined) => (id ? L(JOBS[id].ja, JOBS[id].en.toLowerCase()) : '');
const gamey = (h: Hero) => h.world.tags.includes('gamey');
const startAge = (h: Hero) => (h.log.length ? h.log[0].age : h.age);

// ランクの言い方は世界で変える
export function rankWord(h: Hero, r: GuildRank): string {
  switch (styleOf(h.world)) {
    case 'wa': case 'zh': case 'ruin': return L(`${r}級`, `grade ${r}`);
    case 'modern': return L(`${r}級探索者`, `${r}-class explorer`);
    case 'scifi': return L(`等級${r}`, `tier ${r}`);
    default: return L(`ランク${r}`, `rank ${r}`);
  }
}

// ---- 職業 -------------------------------------------------------------------

// 輪の人の職業: 家族は主人公の家の身分で、ほかは平民 (主人は騎士の家) で就けるものから。仲間・好敵手・宿敵は戦う職に寄せる
function drawJob(h: Hero, t: Tie, r: Rng): JobId | null {
  if (t.role === 'familiar' || heqT(t) < 16) return null;
  const status = FAMILY.has(t.role) || t.role === 'spouse' ? h.status : t.role === 'master' ? 'gentry' : 'commoner';
  const all = jobsIn(h.world, status);
  if (!all.length) return null;
  if ((t.role === 'mentor' || t.role === 'disciple') && h.job && all.some((j) => j.id === h.job)) return h.job;
  const fights = all.filter((j) => FIGHT_JOBS.has(j.id));
  const pool: JobDef[] = FIGHT_ROLES.has(t.role) && fights.length ? fights : all;
  return pickWeighted(r, pool, (j) => Math.max(0.05, j.w)).id;
}

const rankJob = (id: JobId | null | undefined) => id === 'adventurer' || id === 'explorer';

// ---- 出会い -----------------------------------------------------------------

function metLine(h: Hero, t: Tie): string {
  const town = worldNames(h).town;
  const a = t.since;
  if ((t.role === 'child' || t.role === 'sibling') && a > startAge(h)) return L(`${a}歳の年に生まれた。`, `Born the year you were ${a}.`);
  if (FAMILY.has(t.role)) return a === 0 ? L('生まれた時から。', 'Since the day you were born.') : L('この体で目を覚ました時から家族だった。', 'Family since you woke in this body.');
  const familiar: [string, string] = styleOf(h.world) === 'wa' || styleOf(h.world) === 'zh' ? ['契りを結んだ', 'bound by a pact'] : ['従えた', 'tamed'];
  const by: Record<Exclude<Role, 'mother' | 'father' | 'sibling' | 'child'>, [string, string]> = {
    spouse: [`${town}で結ばれた`, `wed in ${town}`], lover: [`${town}で恋仲になった`, `fell in love in ${town}`], fiance: ['婚約した', 'engaged'],
    friend: [`${town}で知り合った`, `met in ${town}`], companion: [`${town}で組んだ`, `teamed up in ${town}`], mentor: ['弟子入りした', 'took you as a student'],
    rival: ['張り合うようになった', 'became your rival'], nemesis: ['敵になった', 'became your enemy'], familiar,
    master: ['仕えることになった', 'you entered their service'], servant: ['仕えるようになった', 'entered your service'], disciple: ['弟子にとった', 'became your student'],
  };
  const [ja, en] = by[t.role as keyof typeof by];
  return L(`${a}歳のとき、${ja}。`, `At ${a}: ${en}.`);
}

// ---- 人物像 -----------------------------------------------------------------

// 人物像が無ければ作る (古いセーブ・新しく輪に入った人・生まれた時の家族)。人と輪に入った年で決まるので、何度呼んでも同じ
// 世界と種族ごとの、人物像に付けられる技の一覧。輪の人ごとに数百の trait を絞り直すと、何千回もの試行で重い。
// 世界は人生ごとに作り直されるので、絞り込みに効く値を鍵にする
const skillCache = new Map<string, ReturnType<typeof availableTraits>>();
function skillsFor(world: Hero['world'], race: Tie['race']) {
  const key = `${world.tags.join(',')}|${world.magic}|${world.powers}|${world.tech}|${race}`;
  let list = skillCache.get(key);
  if (!list) skillCache.set(key, (list = availableTraits(world, race).filter((x) => x.kind === 'skill' || x.kind === 'ability')));
  return list;
}

export function ensureProfile(h: Hero, t: Tie): void {
  if (t.profile) return;
  const r = sideRng(h, t, t.since, K_PROFILE);
  const personality = pick(r, PERSONALITIES);
  const job = drawJob(h, t, r);
  if (t.job === undefined) t.job = job;
  const e = heqT(t);
  // 強さは主人公と同じ尺度。師匠と宿敵は格上、弟子は格下から
  const base = t.role === 'mentor' || t.role === 'nemesis' ? h.level + 5 + r() * 10 : t.role === 'disciple' ? h.level - 3 - r() * 5 : h.level - 3 + r() * 6;
  const level = fighter(t) && e >= 14 ? Math.max(1, Math.round(base)) : 1 + Math.floor(r() * 3);
  const p: Profile = { level, personality, met: metLine(h, t), story: [] };
  if (rankJob(t.job)) p.rank = RANKS[Math.min(5, Math.floor(level / 6))];
  const skills = skillsFor(h.world, t.race);
  const roll = r();
  if (skills.length && e >= 12 && (fighter(t) || roll < 0.5)) {
    p.skill = pickWeighted(r, skills, (x) => (t.job ? x.jobs?.[t.job] ?? 1 : 1)).id;
  }
  t.profile = p;
}

const lineMarks = new WeakSet<LogEntry>();
// 人物像が主人公の年表に足した行か (テスト用。保存と再開をまたぐと分からなくなる)
export const isPeopleEntry = (e: LogEntry) => lineMarks.has(e);

function tell(t: Tie, age: number, text: string, kind: PersonEvent['kind']): void {
  t.profile!.story = [...t.profile!.story, { age, text, kind }].slice(-STORY_MAX);
}

// 年表に載せるのは近い人のことだけ (宿敵・好敵手と、近さ40未満の人は人物像の中だけに残す)
const near = (t: Tie) => t.bond >= 40 && t.role !== 'nemesis' && t.role !== 'rival';

// 年表の行は翌年の peopleYear まで待たせてから、その年の行の後ろに差し込む。
// その年のうちに足すと「その年にほかの記録が無いときだけ起きる」出来事 (alone) の判定が変わり、主人公の乱数の並びがずれるため。
// 待たせた行と足した件数は h.peopleLog に持つ (保存と再開で年表がずれないように)。主人公が亡くなった年の行は落ちる (人物像の story には残る)
// 1人の人生で年表に足すのはここまで (長命の種族は輪の人が多く、何十件にもなるため)。旅立ちは数えるが止めない (leave を年表に残すため)
export const LOG_MAX = 15;

function toLog(h: Hero, t: Tie, text: string, kind: LogEntry['kind'], always = false): LogEntry | undefined {
  const pl = h.peopleLog ?? { n: 0, wait: [] };
  if (pl.n >= LOG_MAX && !always) return undefined;
  const e: LogEntry = { age: h.age, text, kind, who: [t.id] };
  lineMarks.add(e);
  h.peopleLog = { n: pl.n + 1, wait: [...pl.wait, e] };
  return e;
}

function flush(h: Hero): void {
  const lines = h.peopleLog?.wait;
  if (!lines?.length) return;
  h.peopleLog = { n: h.peopleLog!.n, wait: [] };
  for (const e of lines) {
    lineMarks.add(e); // 保存から戻した行も、人物像の行として分かるように
    let i = h.log.length;
    while (i > 0 && h.log[i - 1].age > e.age) i--;
    h.log.splice(i, 0, e);
  }
}

// 性格で言い回しを少し変える
const MARRY_TONE: Record<Personality, [string, string]> = {
  cheerful: ['にぎやかな式を挙げて', 'With a loud, happy wedding, '], fiery: ['にぎやかな式を挙げて', 'With a loud, happy wedding, '],
  quiet: ['ささやかに', 'Quietly, '], timid: ['ささやかに', 'Quietly, '], gentle: ['ささやかに', 'Quietly, '],
  proud: ['堂々とした式で', 'In a proper ceremony, '], stern: ['堂々とした式で', 'In a proper ceremony, '],
  kind: ['', ''], brave: ['', ''], cunning: ['', ''],
};
const LEAVE_TONE: Record<Personality, [string, string]> = {
  brave: ['もっと強い相手を求めて旅立った', 'left to look for stronger foes'], fiery: ['もっと強い相手を求めて旅立った', 'left to look for stronger foes'],
  cheerful: ['笑って手を振り、旅立った', 'waved and set off'], quiet: ['書き置きを残して旅立った', 'left a note and was gone'],
  timid: ['書き置きを残して旅立った', 'left a note and was gone'], proud: ['自分の道を行くと言って去った', 'said they had their own road, and left'],
  stern: ['自分の道を行くと言って去った', 'said they had their own road, and left'], kind: ['名残を惜しみながら旅立った', 'left, reluctant to go'],
  gentle: ['名残を惜しみながら旅立った', 'left, reluctant to go'], cunning: ['ある朝、いつのまにかいなくなっていた', 'was simply gone one morning'],
};

const count = (t: Tie, kind: PersonEvent['kind']) => t.profile!.story.filter((s) => s.kind === kind).length;
const married = (t: Tie) => t.role === 'spouse' || t.role === 'mother' || t.role === 'father' || count(t, 'marry') > 0;

// ---- 1年 --------------------------------------------------------------------

// 輪の人それぞれの1年 (主人公の advanceYear から毎年1回)。大きな出来事 (結婚・旅立ち・大きな昇進) だけを主人公の年表にも足す
export function peopleYear(h: Hero): void {
  if (!PEOPLE.on) return;
  flush(h);
  const allies = new Set(alliesFor(h));
  for (const t of [...h.people]) {
    ensureProfile(h, t);
    if (!t.alive) { if (!t.profile!.fate) { t.profile!.fate = fateLine(h, t); tell(t, t.diedAt ?? h.age, t.profile!.fate, 'death'); } continue; }
    if (t.until !== undefined) continue;
    oneYear(h, t, sideRng(h, t, h.age, K_YEAR), allies.has(t));
  }
}

function oneYear(h: Hero, t: Tie, r: Rng, ally: boolean): void {
  const p = t.profile!;
  const e = heqT(t);
  const name = callName(t);
  if (t.role === 'familiar') { if (ally && r() < 0.6) p.level++; return; }
  // 大人になったら職に就く
  if (!t.job && e >= 16) {
    t.job = drawJob(h, t, r);
    if (t.job) tell(t, h.age, L(`${jobWord(t.job)}になった。`, `Became a ${jobWord(t.job)}.`), 'other');
    if (rankJob(t.job)) p.rank = 'F';
  }
  if (e < 16) return;
  // 強さ: 一緒に戦う人はよく伸びる
  if (fighter(t) && e < 60 && r() < (ally ? 0.7 : 0.3)) {
    p.level++;
    if (p.level % 10 === 0) tell(t, h.age, gamey(h) ? L(`腕を上げ、レベル${p.level}に達した。`, `Grew stronger, reaching level ${p.level}.`) : L('腕を上げた。', 'Grew stronger.'), 'level');
  }
  // ランク: 主人公の昇格と同じ見込み (F→C に5〜10年、B 以上はまれ)
  if (p.rank && p.rank !== 'S') {
    const i = RANKS.indexOf(p.rank);
    if (r() < 0.18 * (ally ? 1.5 : 1) * (i >= 3 ? 0.35 : 1) * (i >= 5 ? 0.3 : 1)) {
      p.rank = RANKS[i + 1];
      const txt = L(`${rankWord(h, p.rank)}に上がった。`, `Rose to ${rankWord(h, p.rank)}.`);
      tell(t, h.age, txt, 'rank');
      if (i + 1 >= 5 && near(t)) toLog(h, t, L(`${name}が${rankWord(h, p.rank)}に上がった。`, `${name} rose to ${rankWord(h, p.rank)}.`), 'fame');
    }
  } else if (t.job && !FIGHT_JOBS.has(t.job) && e < 60 && r() < 0.03) {
    const n = count(t, 'promote');
    if (n === 0) tell(t, h.age, L(`${jobWord(t.job)}として一人前と認められた。`, `Was recognized as a full ${jobWord(t.job)}.`), 'promote');
    else if (n === 1) {
      tell(t, h.age, L(`${jobWord(t.job)}たちの頭になった。`, `Rose to lead the other ${jobWord(t.job)}s.`), 'promote');
      if (near(t)) toLog(h, t, L(`${name}が${jobWord(t.job)}たちの頭になった。`, `${name} rose to lead the other ${jobWord(t.job)}s.`), 'fame');
    }
  }
  // 結婚と子
  if (!married(t) && t.role !== 'lover' && t.role !== 'fiance' && e >= 18 && e < 45 && r() < 0.06) {
    const [tja, ten] = MARRY_TONE[p.personality];
    tell(t, h.age, L(`${tja}結婚した。`, ten ? `${ten}got married.` : 'Got married.'), 'marry');
    if (near(t)) toLog(h, t, L(`${name}が結婚した。`, `${name} got married.`), 'love');
  } else if (married(t) && t.role !== 'mother' && t.role !== 'father' && t.role !== 'spouse' && e < 45 && r() < 0.08) {
    const n = count(t, 'child') + 1;
    tell(t, h.age, n === 1 ? L('子が生まれた。', 'Had a child.') : L(`${n}人目の子が生まれた。`, `Had child number ${n}.`), 'child');
  }
  // けが
  if (r() < (fighter(t) ? 0.04 : 0.01)) {
    tell(t, h.age, fighter(t) ? L(`${beastName(r, h.world)}との戦いで深手を負った。`, `Badly wounded fighting a ${beastName(r, h.world)}.`)
      : L('怪我をして、しばらく働けなかった。', 'Was hurt and could not work for a while.'), 'injury');
  }
  // 旅立ち
  const lp = LEAVE_P[t.role] ?? 0;
  if (lp && h.age - t.since >= 3 && r() < lp && h.people.some((o) => o !== t && o.role === t.role && o.alive && o.until === undefined && o.bond > t.bond)) {
    const [lja, len] = t.role === 'disciple' ? ['独り立ちした', 'went off on their own'] : t.role === 'lover' ? ['別れて去っていった', 'parted ways'] : LEAVE_TONE[p.personality];
    t.until = h.age;
    tell(t, h.age, L(`${lja}。`, `${len[0].toUpperCase()}${len.slice(1)}.`), 'leave');
    toLog(h, t, L(`${name}が${lja}。`, `${name} ${len}.`), 'loss', true)!.leave = [t.id];
  }
}

// ---- 一緒に戦う人 -----------------------------------------------------------

const ALLY_ROLES = new Set<Role>(['companion', 'mentor', 'familiar', 'disciple']);

// その年に主人公と一緒に戦う人。生きていて離れていない仲間・師匠・従魔・弟子・戦う職の連れ合い。多くて3人、近さと強さの高い順
export function alliesFor(h: Hero): Tie[] {
  return h.people.filter((t) => t.alive && t.until === undefined
    && (ALLY_ROLES.has(t.role) || (t.role === 'spouse' && !!t.job && FIGHT_JOBS.has(t.job)))
    && (t.role === 'familiar' || heqT(t) >= 14))
    .sort((a, b) => b.bond - a.bond || (b.profile?.level ?? 0) - (a.profile?.level ?? 0) || a.id - b.id)
    .slice(0, 3);
}

// ---- その後 -----------------------------------------------------------------

// 亡くなった理由: 記録の文 (出産・戦い・疫病・飢饉の年) に合わせ、無ければ年齢と仕事から
function causeOf(h: Hero, t: Tie): [string, string] {
  const at = t.diedAt ?? h.age;
  const rec = h.log.find((x) => x.age === at && x.leave?.includes(t.id));
  if (rec && /出産|childbirth/.test(rec.text)) return ['出産で亡くなった', 'died in childbirth'];
  if (rec?.fight) return ['戦いで倒れた', 'fell in battle'];
  const year = h.log.filter((x) => x.age === at);
  if (year.some((x) => /大疫病|great plague/.test(x.text))) return ['疫病で亡くなった', 'died of the plague'];
  if (year.some((x) => /飢饉|Famine/.test(x.text))) return ['飢えて亡くなった', 'died in the famine'];
  const e = heqT(t);
  if (e >= 60) return ['老いて、静かに息を引き取った', 'passed away of old age'];
  if (e < 10) return ['幼くして病で亡くなった', 'died young of an illness'];
  const r = sideRng(h, t, at, K_FATE);
  const where: Record<ReturnType<typeof styleOf>, [string, string]> = {
    west: ['魔物に襲われて亡くなった', 'was killed by a monster'], myth: ['魔物に襲われて亡くなった', 'was killed by a monster'],
    desert: ['魔物に襲われて亡くなった', 'was killed by a monster'], wa: ['妖に襲われて亡くなった', 'was killed by a yokai'],
    zh: ['妖魔に襲われて亡くなった', 'was killed by a demon beast'], modern: ['ダンジョンで亡くなった', 'died in a dungeon'],
    scifi: ['任務の途中で亡くなった', 'died on a mission'], ruin: ['廃墟で命を落とした', 'died out in the ruins'],
  };
  const opts: [[string, string], number][] = [[['病で亡くなった', 'died of an illness'], 3], [['事故で亡くなった', 'died in an accident'], 2]];
  if (fighter(t)) opts.push([where[styleOf(h.world)], 4]);
  return pickWeighted(r, opts, ([, w]) => w)[0];
}

// その人のその後の一行 (今の言語)。亡くなっていれば死因と年、離れていればその後、生きていれば今の様子
export function fateLine(h: Hero, t: Tie): string {
  ensureProfile(h, t);
  const p = t.profile!;
  if (!t.alive) {
    if (p.fate) return p.fate;
    const [ja, en] = causeOf(h, t);
    const at = t.diedAt ?? h.age;
    return L(`${t.age}歳で${ja}(${h.given}が${at}歳の年)。`, `${en[0].toUpperCase()}${en.slice(1)} at ${t.age}, the year ${h.given} was ${at}.`);
  }
  if (t.until !== undefined) {
    const last = [...p.story].reverse().find((s) => s.kind === 'leave');
    return L(`${t.until}歳の年に別れ、それきり。${last ? last.text : ''}`, `Parted ways when ${h.given} was ${t.until}. ${last ? last.text : ''}`).trim();
  }
  const kids = count(t, 'child');
  const job = t.job ? jobWord(t.job) : '';
  const rank = p.rank ? L(`、${rankWord(h, p.rank)}`, `, ${rankWord(h, p.rank)}`) : '';
  const fam = kids ? L(`。子が${kids}人いる`, `, with ${kids} child${kids > 1 ? 'ren' : ''}`) : married(t) && !FAMILY.has(t.role) && t.role !== 'spouse' ? L('。結婚している', ', married') : '';
  return job ? L(`${t.age}歳。${job}として暮らしている${rank}${fam}。`, `${t.age}, living as ${/^[aeiou]/i.test(job) ? 'an' : 'a'} ${job}${rank}${fam}.`)
    : L(`${t.age}歳。元気にしている${fam}。`, `${t.age}, doing well${fam}.`);
}

// 画面の人物の欄に並べる行
export function profileLines(h: Hero, t: Tie): { label: string; value: string }[] {
  ensureProfile(h, t);
  const p = t.profile!;
  const out = [
    { label: L('種族', 'Race'), value: T(raceOf(t.race).name) },
    { label: L('年齢', 'Age'), value: L(`${t.age}歳`, `${t.age}`) },
  ];
  if (t.job) out.push({ label: L('職業', 'Job'), value: L(JOBS[t.job].ja, JOBS[t.job].en) });
  if (fighter(t) && gamey(h)) out.push({ label: L('レベル', 'Level'), value: String(p.level) });
  if (p.rank) out.push({ label: L('ランク', 'Rank'), value: rankWord(h, p.rank) });
  const sk = p.skill ? traitOf(p.skill) : undefined;
  if (sk) out.push({ label: L('技', 'Skill'), value: T(sk.name) });
  out.push({ label: L('性格', 'Personality'), value: L(...PERSONALITY_WORD[p.personality]) });
  out.push({ label: L('出会い', 'Met'), value: p.met });
  out.push({ label: L('その後', 'Now'), value: fateLine(h, t) });
  return out;
}
