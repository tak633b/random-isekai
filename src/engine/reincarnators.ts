// ほかの転生者・召喚者・目覚めた者 (DESIGN 4-3節)。
// 名簿 (reincarnatorsOf) は主人公の seed と世界だけから決まる。保存しない (何度作っても同じ)。
// 約束: 主人公の乱数 (h.rng) は一度も引かない。引くのは名簿・人・年ごとに決まる横の乱数だけ。
// 年表の行は people.ts と同じく、その年のうちには足さず翌年に差し込む (その年の alone の判定を変えないため)。
// 例外は「会う」(輪に Tie を足す): 輪の人は毎年 h.rng で年取りの生死を引くので、会った年から後の人生は変わる。
// MEET_ON を false にすると会わなくなり、主人公の人生は (転生者の行を除いて) 完全に同じになる
import type { Arrival, Foe, Hero, LogEntry, ReincFight, ReincState, OtherLife, PastLife, Reincarnator, ReincarnatorFate, Role, Sex, Status, Tie, World, YearKind } from './types';
import { makeRng, pick, pickWeighted, poisson, type Rng } from './rng';
import { availableCheats, CHEATS, cheatWeight } from './cheats';
import { personName, plural, styleOf, beastName } from './names';
import { statusWeights } from './status';
import { raceOf } from './races';
import { demonKingWorld, hasTag, WORLDS } from './worlds';
import { heq, heqOf, isFantasy } from './mortality';
import { heqToAge } from './hero';
import { addTie, callName, mourn } from './bonds';
import { fightOf } from './fight';
import { lifeOfSpec, type LifeSpec } from './others';
import { L, T, cap, ordinal, pron } from '../i18n';

// テスト用のスイッチ。on = false で reincarnatorYear は何もしない。meet = false で噂と訃報だけ (輪に人を足さない)
export const REINC = { on: true, meet: true };

// ---- 横の乱数 ---------------------------------------------------------------

function mix(...n: number[]): number {
  let x = 0x811c9dc5;
  for (const v of n) { x = Math.imul(x ^ (v >>> 0), 0x01000193); x ^= x >>> 15; }
  return x >>> 0;
}
const K_ROSTER = 0x52454931, K_COURSE = 2, K_YEAR = 3;

// ---- 世界ごとの数と運命 -------------------------------------------------------

// 年あたりに来る (生まれる) 人数。勇者召喚が盛んな型は多く、現代・SF・文明の後は少ない
const RATE: Record<World['id'], number> = {
  game: 0.14, medieval: 0.1, academy: 0.1, xianxia: 0.08, dark: 0.07, wa: 0.07, myth: 0.06, ocean: 0.06, desert: 0.06, frontier: 0.06,
  beast: 0.05, steampunk: 0.04, modern: 0.03, cyberpunk: 0.025, space: 0.025, postapoc: 0.025,
};
const SUMMONING = new Set<World['id']>(['game', 'medieval', 'academy']);

function arrivals(w: World): [Arrival, number][] {
  if (SUMMONING.has(w.id)) return [['summoned', 40], ['reborn', 40], ['awaken', 20]];
  if (isFantasy(w)) return [['summoned', 20], ['reborn', 50], ['awaken', 30]];
  return [['summoned', 10], ['reborn', 60], ['awaken', 30]];
}

function fates(w: World): [ReincarnatorFate, number][] {
  const t = (x: Parameters<typeof hasTag>[1]) => hasTag(w, x);
  return [
    ['hero', (isFantasy(w) ? 3 : 1.5) * (t('gamey') ? 1.5 : 1)],
    ['demonlord', demonKingWorld(w) ? 0.6 : 0],
    ['ruler', 1.2 * (t('nobility') ? 2 : 1)],
    ['merchant', 2 * (t('industrial') ? 2 : 1)],
    ['retired', 2.5],
    ['early', 2 * (t('dark') ? 2 : 1)],
    ['wanderer', 2],
    ['villain', 1.2 * (t('dark') || t('nobility') ? 1.6 : 1)],
  ];
}

// 前世 (hero.ts の表から、転生者らしい組だけ)
const PAST_CAUSES: [PastLife['cause'], number][] = [['truck', 25], ['overwork', 20], ['illness', 15], ['stabbed', 10], ['accident', 12], ['disaster', 6], ['old', 5], ['unknown', 7]];
const PAST_AGE: Record<PastLife['cause'], [number, number]> = {
  truck: [15, 60], overwork: [22, 60], illness: [15, 80], stabbed: [15, 65], accident: [15, 75], disaster: [15, 85], old: [60, 95], unknown: [15, 70],
};
const PAST_JOBS: [string, string, number, number][] = [['会社員', 'office worker', 22, 65], ['高校生', 'high school student', 15, 18], ['大学生', 'college student', 18, 24],
  ['看護師', 'nurse', 22, 65], ['料理人', 'cook', 18, 70], ['プログラマー', 'programmer', 20, 65], ['教師', 'teacher', 23, 65], ['トラック運転手', 'truck driver', 20, 65],
  ['農家', 'farmer', 18, 95], ['研究者', 'researcher', 24, 75], ['店員', 'shop clerk', 16, 70], ['無職', 'job seeker', 15, 95], ['年金暮らし', 'retiree', 65, 95]];

// ---- 名簿 -------------------------------------------------------------------

const startOf = (h: Hero) => (h.log.length ? h.log[0].age : h.age);

// 名簿の基準: 系譜 (Hero.lineage) があれば最初の主人公 (同じ世界の同じ人たち)、無ければその主人公
interface Base { seed: number; world: World; given: string; race: Hero['race']; start: number; offset: number }
const baseOf = (h: Hero): Base => h.lineage
  ? { seed: h.lineage.rootSeed, world: h.world, given: h.lineage.root.given, race: h.lineage.root.race, start: h.lineage.root.start, offset: h.lineage.offset }
  : { seed: h.seed, world: h.world, given: h.given, race: h.race, start: startOf(h), offset: 0 };
// 名簿の範囲: 主人公の生まれる60年前から、主人公の種族の寿命 (長くて400年) の20年後まで
export const BEFORE = 60;
const windowOf = (b: Base): [number, number] => [-BEFORE, b.start + Math.min(raceOf(b.race).maxAge, 400) + 20];

const cache = new Map<string, Reincarnator[]>();

function makeRoster(h: Base): Reincarnator[] {
  const w = h.world;
  const [lo, hi] = windowOf(h);
  const r = makeRng(mix(h.seed, K_ROSTER, w.magic, w.powers));
  const n = Math.min(60, poisson(r, RATE[w.id] * (hi - lo)));
  const cheats = availableCheats(w).filter((c) => c.id !== 'immortal_body'); // 死なない体は一生の筋 (fate) と合わない
  const taken = new Set([h.given]);
  const usedCauses = new Set<PastLife['cause']>();
  const usedPast = new Set<string>();
  const out: Omit<Reincarnator, 'id'>[] = [];
  for (let i = 0; i < n; i++) {
    const seed = mix(h.seed, K_ROSTER, i + 1);
    const x = makeRng(seed);
    const arrival = pickWeighted(x, arrivals(w), ([, v]) => v)[0];
    const sex: Sex = x() < 0.5 ? 'F' : 'M';
    const race = arrival === 'summoned' ? 'human' : pickWeighted(x, w.races, ([, v]) => v)[0];
    const cheat = pickWeighted(x, cheats, (c) => cheatWeight(c.id)).id;
    const fate = pickWeighted(x, fates(w), ([, v]) => v)[0];
    // 召喚された人は前の世界 (地球) の名のまま: 多くは日本の姓名、ときどき日本以外の名。生まれ直した人はこの世界の名
    let name = '';
    for (let k = 0; k < 8 && (!name || taken.has(name)); k++) name = arrival === 'summoned' ? earthName(x, sex) : personName(x, w, sex, 'commoner').given;
    taken.add(name);
    // 前世の死に方は、名簿の中でまだ使っていないものから選ぶ (同じ死に方ばかりにならないように)
    const fresh = PAST_CAUSES.filter(([c]) => !usedCauses.has(c));
    const cause = pickWeighted(x, fresh.length ? fresh : PAST_CAUSES, ([, v]) => v)[0];
    if (arrival !== 'summoned') usedCauses.add(cause);
    const [a0, a1] = PAST_AGE[cause];
    const died = a0 + Math.floor(x() * (a1 - a0 + 1));
    const summonAge = 15 + Math.floor(x() * 21);
    const age = arrival === 'summoned' ? summonAge : died;
    const jobs = PAST_JOBS.filter(([, , j0, j1]) => age >= j0 && age <= j1);
    const j = pick(x, jobs.length ? jobs : PAST_JOBS);
    const past: PastLife = { age, cause: arrival === 'summoned' ? 'unknown' : cause, job: { ja: j[0], en: j[1] } };
    // 前世の一文 (年齢・仕事・死に方) が名簿の中で重ならないよう、重なれば年齢を1つずらす
    while (usedPast.has(`${past.age}|${past.job.ja}|${past.cause}`)) past.age++;
    usedPast.add(`${past.age}|${past.job.ja}|${past.cause}`);
    const bornAt = lo + Math.floor(x() * (hi - lo));
    out.push({ seed, name, race, sex, arrival, cheat, past, bornAt, fate });
  }
  return out.sort((a, b) => a.bornAt - b.bornAt || a.seed - b.seed).map((p, i) => ({ id: i + 1, ...p }));
}

// 地球の名 (召喚・転移で来た人)。8割は日本の姓名 (現代の世界の名づけ)、2割は日本以外の名
const EARTH_GIVEN: Record<Sex, [string, string][]> = {
  F: [['エマ', 'Emma'], ['ソフィア', 'Sofia'], ['マリア', 'Maria'], ['リリー', 'Lily'], ['アナ', 'Ana'], ['クロエ', 'Chloe'], ['ミン', 'Min'], ['アイシャ', 'Aisha']],
  M: [['ルーカス', 'Lucas'], ['ダニエル', 'Daniel'], ['マテオ', 'Mateo'], ['オリバー', 'Oliver'], ['イワン', 'Ivan'], ['ラジ', 'Raj'], ['ジュン', 'Jun'], ['カルロス', 'Carlos']],
};
const EARTH_FAMILY: [string, string][] = [['クラーク', 'Clark'], ['ガルシア', 'Garcia'], ['ミュラー', 'Müller'], ['ロッシ', 'Rossi'], ['キム', 'Kim'], ['チェン', 'Chen'], ['シン', 'Singh'], ['ノヴァク', 'Novak']];
function earthName(x: Rng, sex: Sex): string {
  if (x() < 0.8) return personName(x, WORLDS.modern, sex, 'commoner').full;
  const g = pick(x, EARTH_GIVEN[sex]), f = pick(x, EARTH_FAMILY);
  return L(`${g[0]}・${f[0]}`, `${g[1]} ${f[1]}`);
}

// その世界にいるほかの転生者の名簿 (生まれた/来た順)。会った人には tieId が付く
export function reincarnatorsOf(h: Hero): Reincarnator[] {
  const b = baseOf(h);
  const w = h.world;
  const key = `${b.seed}|${w.id}|${w.magic}|${w.powers}|${w.tech}|${b.race}|${b.start}|${b.given}`;
  let roster = cache.get(key);
  if (!roster) {
    roster = makeRoster(b);
    if (cache.size > 500) cache.clear();
    cache.set(key, roster);
  }
  // 名簿の年 (bornAt) は基準の主人公の年齢。今の主人公の年齢に直す (系譜の2代目以降は生まれた年ぶんずれる)
  const met = new Map(stateOf(h).met);
  return roster.map((p) => ({ ...p, bornAt: p.bornAt - b.offset, ...(met.has(p.id) ? { tieId: met.get(p.id) } : {}) }));
}

// ---- 一生の筋 -----------------------------------------------------------------

// 人間換算の年齢から実年齢 (老いない種族・成人の年齢が0の種族は人間と同じに数える)
function realAge(e: number, race: Reincarnator['race']): number {
  const r = raceOf(race);
  const a = r.k <= 0 || r.adult <= 0 ? Math.round(e) : heqToAge(e, r);
  return Math.min(a, r.maxAge - 1);
}

export interface Course {
  status: Status;
  arriveAge: number;     // 来た (生まれた) 時のその人の年齢 (召喚なら前世の年齢、ほかは 0)
  deedAt?: number;       // 名高い手柄の年 (主人公の年齢)。勇者の手柄・即位・商会・お尋ね者
  riseAt?: number;       // 魔王を名乗った年
  diedAt: number;        // 亡くなる年 (主人公の年齢)
  ageAtDeath: number;
}

// fate に沿った一生の筋。人間換算の年齢で決め、種族の年齢に直す
const SPAN: Record<ReincarnatorFate, { deed?: [number, number]; death: [number, number] }> = {
  hero: { deed: [20, 35], death: [50, 80] },
  demonlord: { deed: [25, 40], death: [0, 0] },
  ruler: { deed: [28, 45], death: [55, 85] },
  merchant: { deed: [25, 40], death: [55, 85] },
  retired: { deed: [30, 55], death: [60, 90] },
  early: { death: [14, 30] },
  wanderer: { deed: [25, 45], death: [40, 80] },
  villain: { deed: [22, 38], death: [0, 0] },
};

export function courseOf(h: Hero, p: Reincarnator): Course {
  const x = makeRng(mix(p.seed, K_COURSE));
  const span = (a: number, b: number) => a + x() * (b - a);
  const arriveAge = p.arrival === 'summoned' ? p.past.age : 0;
  const arriveHeq = heq(arriveAge, raceOf(p.race));
  const s = SPAN[p.fate];
  const deedHeq = s.deed ? Math.max(arriveHeq + 1, span(...s.deed)) : undefined;
  let deathHeq = s.death[1] ? span(...s.death) : (deedHeq ?? 30) + 1 + x() * 12; // 魔王とお尋ね者は名乗って (罪を重ねて) から 1〜13年で討たれる
  if (p.fate === 'early') deathHeq = Math.max(arriveHeq + 1 + x() * 5, deathHeq);
  deathHeq = Math.max(deathHeq, (deedHeq ?? arriveHeq) + 1);
  const at = (e: number) => p.bornAt + realAge(e, p.race) - arriveAge;
  const ageAtDeath = Math.max(arriveAge + 1, realAge(deathHeq, p.race));
  const status: Status = p.arrival === 'summoned' ? 'commoner' : pickWeighted(x, statusWeights(h.world), ([, v]) => v)[0];
  const c: Course = { status, arriveAge, diedAt: p.bornAt + ageAtDeath - arriveAge, ageAtDeath };
  if (deedHeq !== undefined) {
    const d = Math.min(at(deedHeq), c.diedAt - 1);
    if (p.fate === 'demonlord') c.riseAt = d; else c.deedAt = d;
  }
  return c;
}

// その人の、主人公の年齢 a の年の年齢
export const ageOfAt = (p: Reincarnator, c: Course, a: number) => a - p.bornAt + c.arriveAge;

// 亡くなった年: 会って輪に入った人は、輪で亡くなった年を優先する
export function diedAtOf(h: Hero, p: Reincarnator, c = courseOf(h, p)): number {
  const t = p.tieId !== undefined ? h.people.find((x) => x.id === p.tieId) : undefined;
  return t && !t.alive && t.diedAt !== undefined ? Math.min(t.diedAt, c.diedAt) : c.diedAt;
}

// ---- 主人公の1年 --------------------------------------------------------------

// Hero.reinc (types.ts)。保存 (toSaved の structuredClone) と再開にそのまま乗る
type FightRec = ReincFight;
const EMPTY: ReincState = { wait: [], heard: [], met: [], allied: [], foes: [], fights: [], n: 0 };
const stateOf = (h: Hero): ReincState => h.reinc ?? EMPTY;
const setState = (h: Hero, s: Partial<ReincState>) => { h.reinc = { ...stateOf(h), ...s }; };

const lineMarks = new WeakSet<LogEntry>();
// 転生者の出来事として主人公の年表に足した行か (テスト用。保存と再開をまたぐと分からなくなる)
export const isReincEntry = (e: LogEntry) => lineMarks.has(e);
// 戦いの記録 (reincarnatorLife がその人の年表に入れる)
export const fightsWith = (h: Hero, id: number) => stateOf(h).fights.filter((f) => f.id === id);

// 1人の人生で年表に足す行の上限 (会う・戦うなど会った人のことは数えるが止めない)
export const LOG_MAX = 6;
const MAX_MET = 2;
const MAX_FIGHTS = 1; // 1つの人生で (英雄の記録を増やしすぎないため)

function queue(h: Hero, text: string, kind: YearKind, extra: Partial<LogEntry> = {}, always = false): LogEntry | undefined {
  const s = stateOf(h);
  if (s.n >= LOG_MAX && !always) return undefined;
  const e: LogEntry = { age: h.age, text, kind, ...extra };
  lineMarks.add(e);
  setState(h, { wait: [...s.wait, e], n: s.n + 1 });
  return e;
}

function flush(h: Hero): void {
  const lines = stateOf(h).wait;
  if (!lines.length) return;
  setState(h, { wait: [] });
  for (const e of lines) {
    lineMarks.add(e);
    let i = h.log.length;
    while (i > 0 && h.log[i - 1].age > e.age) i--;
    h.log.splice(i, 0, e);
  }
}

const gift = (p: Reincarnator) => T(CHEATS[p.cheat].name);
const heroWord = (w: World): [string, string] => (isFantasy(w) ? ['勇者', 'the Hero'] : ['英雄', 'the hero']);
const DEMON: Record<ReturnType<typeof styleOf>, [string, string]> = {
  west: ['魔王', 'Demon Lord'], myth: ['魔王', 'Demon Lord'], desert: ['魔王', 'Demon Lord'], wa: ['鬼の王', 'King of the Oni'], zh: ['魔尊', 'Demon Sovereign'],
  modern: ['魔王', 'Demon Lord'], scifi: ['魔王', 'Demon Lord'], ruin: ['魔王', 'Demon Lord'],
};
export const demonWord = (w: World) => DEMON[styleOf(w)];
const RULER: Record<ReturnType<typeof styleOf>, [string, string]> = {
  west: ['王位に就いた', 'took the throne'], myth: ['王位に就いた', 'took the throne'], desert: ['部族を束ねる王になった', 'became king over the tribes'],
  wa: ['一国の主になった', 'became lord of a province'], zh: ['一国の主になった', 'became ruler of a kingdom'], modern: ['国の要職に就いた', 'rose to high office'],
  scifi: ['星系の総督になった', 'became governor of a star system'], ruin: ['集落を束ねる長になった', 'became chief over the settlements'],
};
export const rulerWord = (w: World) => RULER[styleOf(w)];

// 名高い手柄の噂の一文 (fate ごと)
function deedRumor(h: Hero, p: Reincarnator): [string, string] {
  const n = p.name, g = gift(p);
  switch (p.fate) {
    case 'hero': { const [hj, he] = heroWord(h.world); return [`異世界から来た${hj}、${n}の噂を聞いた。〈${g}〉の使い手だという。`, `Heard tales of ${n}, ${he} from another world, who wielded "${g}".`]; }
    case 'ruler': { const [rj, re] = rulerWord(h.world); return [`${n}という転生者が${rj}と聞いた。`, `Heard that a reincarnator named ${n} ${re}.`]; }
    case 'merchant': return [`${n}の商会の品が、町にも届くようになった。異世界の知恵で作ったものだという。`, `Goods from ${n}'s trading house reached town. Made with otherworldly know-how, people said.`];
    case 'villain': return [`${n}という転生者が、罪を重ねてお尋ね者になったと聞いた。`, `Heard that a reincarnator named ${n} had turned to crime and was now a wanted outlaw.`];
    default: return [`この世界にもほかに転生者がいるという噂を聞いた。${n}という名だった。`, `Heard a rumor that another reincarnator lived in this world, one named ${n}.`];
  }
}

const memoryLine = (h: Hero, first: boolean, sex: Sex): [string, string] => (!h.past || !h.memoryAwake
  ? ['別の世界から来たのだと、打ち明けられた。', `${cap(pron(sex, 'he'))} confided that ${pron(sex, 'he')} had come from another world.`]
  : first ? ['前の世界の話が通じる、はじめての相手だった。', 'The first person who understood talk of the old world.']
    : ['前の世界の話が、ここでも通じた。', 'Talk of the old world, understood once again.']);

function roleFor(x: Rng, p: Reincarnator): Role {
  const pool: [Role, number][] = p.fate === 'villain' || p.fate === 'demonlord' ? [['nemesis', 7], ['rival', 3]]
    : p.fate === 'hero' ? [['companion', 4], ['rival', 3], ['friend', 3]] : [['friend', 6], ['companion', 4]];
  return pickWeighted(x, pool, ([, v]) => v)[0];
}

// 会う確率 (その年、その1人と)。噂を聞いた人は探して会いに行ける
export const MEET_P = 0.004;
// 特典の無い主人公は会いにくい (噂は届く)。普通の人生の手触りを残すため
export const MEET_PLAIN = 0.3;

// 主人公の1年で、ほかの転生者と関わる出来事 (advanceYear が peopleYear の後に毎年1回)
export function reincarnatorYear(h: Hero): void {
  if (!REINC.on || h.setup.anchors) return; // ほかの人の一生 (others.ts) を作っているときは何もしない
  flush(h);
  if (!h.alive) return;
  const a = h.age;
  const me = heqOf(h);
  if (me < 8) return;
  for (const p of reincarnatorsOf(h)) {
    if (p.bornAt > a) break;
    if (p.id === h.lineage?.self) continue; // 続けて遊んでいる主人公自身が転生者なら、自分には会わない
    const c = courseOf(h, p);
    const x = makeRng(mix(h.seed, K_YEAR, a, p.id));
    const s = stateOf(h);
    const heard = s.heard.includes(p.id);
    const tie = p.tieId !== undefined ? h.people.find((t) => t.id === p.tieId) : undefined;
    if (diedAtOf(h, p, c) < a) continue;
    // 相手の死を知る (噂を聞いたか会った人)
    if (c.diedAt === a) {
      if (tie?.alive) {
        mourn(h, tie, tie.until === undefined ? -10 : -2);
        queue(h, L(`${callName(tie)}が亡くなった。${tie.age}歳だった。`, `${callName(tie)} died at ${tie.age}.`), 'loss', { who: [tie.id], leave: [tie.id] }, true);
      } else if (heard) {
        const slain = p.fate === 'demonlord' || p.fate === 'villain';
        queue(h, slain ? L(`${p.name}が討たれたと聞いた。`, `Heard that ${p.name} had been struck down.`) : L(`${p.name}が亡くなったと聞いた。`, `Heard that ${p.name} had died.`), 'loss');
      }
      continue;
    }
    // 噂を聞く (名高い人は手柄の年に、ほかはまれに)
    if (!heard && !tie && me >= 10 && s.heard.length < 3) {
      if (c.riseAt !== undefined && a === c.riseAt) {
        const [dj, de] = demonWord(h.world);
        if (queue(h, L(`異世界から来た${p.name}という者が、${dj}を名乗ったという。`, `Word came that ${p.name}, a reincarnator from another world, had declared ${pron(p.sex, 'himself')} ${de}.`), 'family')) setState(h, { heard: [...s.heard, p.id] });
        continue;
      }
      const pr = c.deedAt !== undefined && a >= c.deedAt ? (a === c.deedAt ? 0.35 : 0.03) : 0.004;
      if (x() < pr) {
        if (queue(h, L(...deedRumor(h, p)), 'family')) setState(h, { heard: [...s.heard, p.id] });
        continue;
      }
    }
    if (tie) { afterMeeting(h, p, c, tie, x); continue; }
    // 会う
    const them = heq(ageOfAt(p, c, a), raceOf(p.race));
    if (!REINC.meet || me < 14 || them < 14 || s.met.length >= MAX_MET) continue;
    if (x() < MEET_P * (heard ? 4 : 1) * (h.cheat ? 1 : MEET_PLAIN)) meet(h, p, c, x);
  }
}

function meet(h: Hero, p: Reincarnator, c: Course, x: Rng): void {
  const s = stateOf(h);
  const role = roleFor(x, p);
  const t = addTie(h, { name: p.name, role, race: p.race, sex: p.sex, age: ageOfAt(p, c, h.age) });
  setState(h, { met: [...s.met, [p.id, t.id]], heard: s.heard.includes(p.id) ? s.heard : [...s.heard, p.id] });
  const [mj, me] = memoryLine(h, s.met.length === 0, p.sex);
  const how: [string, string] = role === 'nemesis' ? [`〈${gift(p)}〉を振るう${p.name}と、敵として出会った。`, `Met ${p.name}, wielder of "${gift(p)}", as an enemy.`]
    : role === 'rival' ? [`〈${gift(p)}〉を持つ${p.name}と出会い、張り合うようになった。`, `Met ${p.name}, who held "${gift(p)}", and a rivalry began.`]
      : [`〈${gift(p)}〉を持つ${p.name}と出会った。`, `Met ${p.name}, who held "${gift(p)}".`];
  queue(h, L(`${how[0]}${mj}`, `${how[1]} ${me}`), 'arrival', { big: true, who: [t.id], join: [t.id] }, true);
}

const foeOf = (p: Reincarnator): Foe => (p.fate === 'demonlord' ? 'demon' : p.fate === 'villain' ? 'bandit' : 'soldier');

function afterMeeting(h: Hero, p: Reincarnator, c: Course, t: Tie, x: Rng): void {
  if (!t.alive || t.until !== undefined) return;
  const s = stateOf(h);
  if ((t.role === 'friend' || t.role === 'companion') && !s.allied.includes(p.id) && x() < 0.06) {
    setState(h, { allied: [...s.allied, p.id] });
    queue(h, L(`${p.name}と手を組んだ。同じように別の世界から来た者どうしだった。`, `Joined forces with ${p.name}. Both of them had come from another world.`), 'family', { who: [t.id] }, true);
    return;
  }
  if (t.role === 'rival' && !s.foes.includes(p.id) && x() < 0.04) {
    t.role = 'nemesis';
    setState(h, { foes: [...s.foes, p.id] });
    queue(h, L(`${p.name}と敵対するようになった。同じ世界から来た者どうしでも、道は分かれた。`, `${p.name} became an enemy. Even people from the same world could go separate ways.`), 'hard', { who: [t.id] }, true);
    return;
  }
  if (t.role === 'nemesis' && s.fights.length < MAX_FIGHTS && heqOf(h) < 60 && x() < 0.08) {
    // 結果は横の乱数で。主人公の生死はエンジンが決めるので、ここでは負け (lose) にしない
    const result = pickWeighted(x, [['win', 5], ['flee', 3], ['hurt', 2]] as const, ([, v]) => v)[0];
    setState(h, { fights: [...s.fights, { id: p.id, at: h.age, result }] });
    const demon = c.riseAt !== undefined && h.age >= c.riseAt ? L(`${demonWord(h.world)[0]}となった`, `${demonWord(h.world)[1]} `) : '';
    const txt: Record<typeof result, [string, string]> = {
      win: [`${demon}${p.name}と戦い、退けた。`, `Fought ${demon}${p.name}, and drove them off.`],
      flee: [`${demon}${p.name}と刃を交えたが、決着はつかなかった。`, `Crossed blades with ${demon}${p.name}. Neither side won.`],
      hurt: [`${demon}${p.name}と戦い、深手を負った。`, `Fought ${demon}${p.name}, and was badly wounded.`],
    };
    queue(h, L(...txt[result]), 'battle', { big: true, who: [t.id], fight: fightOf(h, foeOf(p), result) }, true);
  }
}

// ---- その人の一生 -------------------------------------------------------------

// その人の一生 (others.ts の lifeOfSpec)。fate に沿うよう、死ぬ年と手柄を錨で合わせる。会った・戦った年はその人の年表にも入れる
export function reincarnatorLife(h: Hero, id: number): OtherLife {
  return lifeOfSpec(h, reincarnatorSpec(h, id));
}

// その人の一生を作る仕様と錨 (continueAs がその人として続けるときにも使う)
export function reincarnatorSpec(h: Hero, id: number): LifeSpec {
  const p = reincarnatorsOf(h).find((x) => x.id === id);
  if (!p) throw new Error(`reincarnator ${id} not found`);
  const c = courseOf(h, p);
  const at = (a: number) => ageOfAt(p, c, a);
  const died = diedAtOf(h, p, c);
  const shared: { age: number; text: string; kind: YearKind; who?: string }[] = [];
  const g = gift(p);
  if (c.deedAt !== undefined && c.deedAt < died) shared.push({ age: at(c.deedAt), text: deedLine(h, p), kind: p.fate === 'villain' ? 'hard' : 'fame' });
  if (c.riseAt !== undefined) {
    const [dj, de] = demonWord(h.world);
    shared.push({ age: at(c.riseAt), text: L(`〈${g}〉の力で魔物を従え、${dj}を名乗った。`, `Bent the monsters to "${g}" and declared ${pron(p.sex, 'himself')} ${de}.`), kind: 'hard' });
  }
  const tie = p.tieId !== undefined ? h.people.find((t) => t.id === p.tieId) : undefined;
  if (tie) {
    shared.push({ age: at(tie.since), text: L(`${h.given}と出会った。同じく別の世界から来た者だった。`, `Met ${h.given}, who had also come from another world.`), kind: 'arrival', who: 'me' });
    for (const f of fightsWith(h, id)) {
      const r: Record<FightRec['result'], [string, string]> = {
        win: [`${h.given}と戦い、退けられた。`, `Fought ${h.given}, and was driven off.`],
        flee: [`${h.given}と刃を交えたが、決着はつかなかった。`, `Crossed blades with ${h.given}. Neither side won.`],
        hurt: [`${h.given}と戦い、深手を負わせた。`, `Fought ${h.given}, and dealt a grievous wound.`],
      };
      shared.push({ age: at(f.at), text: L(...r[f.result]), kind: 'battle', who: 'me' });
    }
  }
  const slain = p.fate === 'demonlord' || p.fate === 'villain';
  const ageAtDeath = at(died);
  const deathAt = died === c.diedAt
    ? { age: ageAtDeath, hazard: slain ? (p.fate === 'villain' ? 'execution' as const : 'war' as const) : p.fate === 'early' ? 'monster' as const : 'age' as const,
      ...(slain ? { label: L('討たれた', 'Struck down'), text: p.fate === 'villain'
        ? L(`捕らえられ、${ageAtDeath}歳で処刑された。`, `Was captured and executed at ${ageAtDeath}.`)
        : L(`${heroWord(h.world)[0]}に討たれた。${ageAtDeath}歳だった。`, `Was slain by ${heroWord(h.world)[1]}, at ${ageAtDeath}.`) } : {}) }
    : { age: ageAtDeath, hazard: 'disease' as const }; // 輪の中で亡くなった人 (agePeople が決めた年)
  // early は若いうちの死を、ほかは老いの年まで生きることを錨で保証する (老いの錨は「その年より前に死なない」だけにして、死因はエンジンに任せる)
  const anchors = deathAt.hazard === 'age' ? { noDeathBefore: ageAtDeath, shared } : { deathAt, shared };
  const job = p.fate === 'hero' && isFantasy(h.world) ? 'hero' as const : p.fate === 'merchant' ? 'merchant' as const : p.fate === 'ruler' && isFantasy(h.world) ? 'lord' as const : undefined;
  // 召喚された人は、来た時の年齢 (arriveAge) から年表を始める。生まれたのは来た時の年齢ぶん前 (年齢の数え方は 0歳から生きた人と同じ)
  return { key: `r:${id}`, seed: p.seed, name: p.name, race: p.race, sex: p.sex, status: c.status, bornAt: p.bornAt - c.arriveAge, ...(c.arriveAge ? { arriveAge: c.arriveAge } : {}), cheat: p.cheat, arrival: p.arrival, past: p.past,
    anchors: job ? { ...anchors, job } : anchors };
}

// 名高い手柄の一文 (その人の年表と年代記で使う。主語なし)
// 名高い手柄の一文 (主語なし)。fate ごとに数種類あり、1つの名簿の中では同じ文を2度使わない:
// 同じ fate の人を名簿の順に数え、その順番で言い回しを割り当てる (並びは主人公の seed で決まる)。使い切ったら「この時代◯人目の…」を添える
type Deed = (g: string, beast: string, w: World) => [string, string];
const DEEDS: Partial<Record<ReincarnatorFate, { noun: [string, string]; lines: Deed[] }>> = {
  hero: { noun: ['勇者', 'hero'], lines: [
    (g, b, w) => [`〈${g}〉で${b}を討ち、${heroWord(w)[0]}と呼ばれるようになった。`, `Slew a ${b} with "${g}" and came to be called ${heroWord(w)[1]}.`],
    (g, b) => [`都に押し寄せた${b}の群れを〈${g}〉で退け、救国の英雄と呼ばれた。`, `Drove a horde of ${plural(b)} back from the capital with "${g}", and was hailed as the realm's savior.`],
    (g, b) => [`古い遺跡の底に眠る${b}を〈${g}〉で封じた。`, `Sealed away the ${b} sleeping beneath the old ruins with "${g}".`],
    (g) => [`国境の砦の包囲を〈${g}〉で破り、名を上げた。`, `Broke the siege of the border fort with "${g}" and made a name.`],
    (g, b) => [`誰も戻らなかった迷宮を踏破し、最奥の${b}を倒した。`, `Cleared the labyrinth no one had returned from, and felled the ${b} at its heart.`],
    (g) => [`仲間と旅を続け、行く先々で〈${g}〉の伝説を残した。`, `Traveled on with companions, leaving legends of "${g}" wherever they went.`],
  ] },
  ruler: { noun: ['為政者', 'ruler'], lines: [
    (g, b, w) => [`${rulerWord(w)[0]}。`, `${rulerWord(w)[1][0].toUpperCase()}${rulerWord(w)[1].slice(1)}.`],
    () => ['前の世界の学び舎を真似た学校を開き、読み書きを国じゅうに広めた改革者になった。', 'Founded schools modeled on those of the old world, and became the reformer who taught the land to read.'],
    () => ['荒れ地に用水路を引き、新しい町を拓いた。', 'Dug canals across the wasteland and founded a new town.'],
    () => ['重い年貢を改め、民に慕われる宰相になった。', 'Reformed the crushing taxes and became a chancellor the people loved.'],
    () => ['争う諸侯を説き伏せ、長い和議を結ばせた。', 'Talked the feuding lords into a long-lasting peace.'],
  ] },
  merchant: { noun: ['商人', 'merchant'], lines: [
    () => ['前の世界の知恵で興した商会が、この地でいちばんの商会になった。', 'Built a trading house on old-world know-how, and it grew into the greatest in the land.'],
    (g) => [`前の世界の道具を〈${g}〉で作り、発明家として名を残した。`, `Recreated old-world devices with "${g}" and was remembered as an inventor.`],
    () => ['街道を整え、隊商の道を大陸の端までつないだ。', 'Built roads and linked the caravan routes to the far end of the continent.'],
    () => ['両替と貸し付けの店を開き、王家にまで金を貸すようになった。', 'Opened a house of exchange and lending, and came to lend even to the crown.'],
    () => ['前の世界の料理で店を開き、行列の絶えない名店にした。', 'Opened a shop serving old-world cooking, and the line out the door never ended.'],
  ] },
  villain: { noun: ['お尋ね者', 'outlaw'], lines: [
    () => ['罪を重ね、お尋ね者になった。', 'Turned to crime, and became a wanted outlaw.'],
    (g) => [`〈${g}〉で盗賊団を率い、街道を荒らした。`, `Led a bandit gang with "${g}" and terrorized the roads.`],
    () => ['偽の聖者を名乗って人を集め、財を奪って消えた。', 'Posed as a holy prophet, gathered followers, took their wealth and vanished.'],
    (g) => [`〈${g}〉で人の心を操り、ある町を裏から支配した。`, `Used "${g}" to bend minds and ruled a town from the shadows.`],
  ] },
  retired: { noun: ['隠者', 'hermit'], lines: [
    () => ['山奥に庵を結び、訪ねてくる者に知恵を授ける隠者になった。', 'Built a hermitage deep in the mountains and became a sage to those who came seeking.'],
    () => ['疫病の村に一人残って病人を看取り、聖人と呼ばれた。', 'Stayed alone in a plague village tending the sick, and was called a saint.'],
    (g) => [`〈${g}〉を封じ、名もない農夫として畑を耕して暮らした。`, `Sealed away "${g}" and lived quietly as a nameless farmer.`],
    () => ['孤児を引き取って育て、小さな家は子どもでいっぱいになった。', 'Took in orphans until the little house overflowed with children.'],
  ] },
  wanderer: { noun: ['旅人', 'wanderer'], lines: [
    () => ['大陸の端から端まで歩き、誰も見たことのない地図を描いた。', 'Walked the continent end to end and drew a map no one had ever seen.'],
    (g) => [`〈${g}〉を売り物にしようとして失敗し、借金を抱えて町を出た。`, `Tried to make a business of "${g}", failed, and left town in debt.`],
    () => ['各地の歌と昔話を集め、一冊の本にまとめた。', 'Gathered songs and old tales from every land into a single book.'],
    () => ['前の世界に帰る道を探して旅を続けたが、見つからなかった。', 'Traveled on, searching for a way back to the old world. It was never found.'],
  ] },
};

export function deedLine(h: Hero, p: Reincarnator): string {
  const d = DEEDS[p.fate];
  if (!d) return '';
  const roster = reincarnatorsOf(h);
  const rank = roster.filter((q) => q.fate === p.fate && q.id < p.id).length;
  const n = d.lines.length;
  const start = mix(h.seed, p.fate.length, 0x44454544) % n;
  const beast = beastName(makeRng(mix(p.seed, 7)), h.world);
  const [ja, en] = d.lines[(start + rank) % n](gift(p), beast, h.world);
  if (rank < n) return L(ja, en);
  // 言い回しを使い切ったら、何人目かを添えて別の文にする
  return L(`${ja}この時代${rank + 1}人目の${d.noun[0]}だった。`, `${en} The ${ordinal(rank + 1)} ${d.noun[1]} of the age.`);
}

