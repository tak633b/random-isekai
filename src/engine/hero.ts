// 主人公を作る。選ばなかった項目は rng で埋め、埋めた後の値を hero.setup に入れる (同じ設定で何度も試すため)。
// どの項目も、選んであっても一度は乱数を引く。選んだかどうかで後の乱数の並びが変わると、
// 「おまかせで生まれた人生」と「その設定を固定して同じ seed で生き直した人生」がずれてしまう
import type { Arrival, CheatId, Hero, HeroChoice, MemoryLevel, PastLife, Race, RaceId, Setup, Sex, StartAge, Stats, Status, Talent, World } from './types';
import { clamp, makeRng, normal, pick, pickWeighted, poisson, type Rng } from './rng';
import { resolveWorld, demonKingWorld } from './worlds';
import { raceOf } from './races';
import { STATUS_WEALTH, statusName, statusRank, statusWeights } from './status';
import { availableCheats, CHEATS, cheatWeight } from './cheats';
import { personName, styleOf, withFamily, worldNames } from './names';
import { heq } from './mortality';
import { ALLOT_KEYS, POINT_STEP, randomBuild, traitOf } from './traits';
import { addTie, log } from './bonds';
import { L, T } from '../i18n';

export const TALENTS: Talent[] = ['might', 'magic', 'wits', 'charm', 'luck', 'craft', 'none'];
const ARRIVALS: [Arrival, number][] = [['reborn', 45], ['awaken', 25], ['summoned', 20], ['native', 10]];
const MEMORIES: [MemoryLevel, number][] = [['full', 50], ['faint', 30], ['none', 20]];
const PAST_CAUSES: [PastLife['cause'], number][] = [['truck', 25], ['overwork', 20], ['illness', 15], ['stabbed', 10], ['accident', 12], ['disaster', 6], ['old', 5], ['unknown', 7]];
// 前世の死に方ごとの、もっともらしい年齢の幅 (老衰は60歳から、過労は働く年齢のうち)
const PAST_AGE: Record<PastLife['cause'], [number, number]> = {
  truck: [15, 60], overwork: [22, 60], illness: [15, 80], stabbed: [15, 65], accident: [15, 75], disaster: [15, 85], old: [60, 95], unknown: [15, 70],
};
// 前世の仕事と、その仕事でありうる年齢
const PAST_JOBS: [string, string, number, number][] = [['会社員', 'office worker', 22, 65], ['高校生', 'high school student', 15, 18], ['大学生', 'college student', 18, 24],
  ['看護師', 'nurse', 22, 65], ['料理人', 'cook', 18, 70], ['プログラマー', 'programmer', 20, 65], ['教師', 'teacher', 23, 65], ['トラック運転手', 'truck driver', 20, 65],
  ['農家', 'farmer', 18, 95], ['研究者', 'researcher', 24, 75], ['店員', 'shop clerk', 16, 70], ['無職', 'between jobs', 15, 95], ['年金暮らし', 'retiree', 65, 95]];

// 才能が伸ばす能力
const TALENT_STAT: Record<Talent, Partial<Stats>> = {
  might: { power: 18, hp: 5 }, magic: { mind: 18 }, wits: { mind: 14, luck: 3 }, charm: { charm: 18 }, luck: { luck: 20 }, craft: { mind: 8, wealth: 8 }, none: {},
};

// 特典を引く: 1割強は「なし」(素の異世界の厳しさが見えるように。research/02 の 10.2節は5%)
function drawCheat(rng: Rng, w: World): CheatId | null {
  const none = rng() < 0.12;
  const c = pickWeighted(rng, availableCheats(w), (x) => cheatWeight(x.id)).id;
  return none ? null : c;
}

function initialStats(rng: Rng, status: Status, talent: Talent, memory: MemoryLevel): Stats {
  const s: Stats = {
    hp: clamp(normal(rng, 70, 10), 25, 95), power: clamp(normal(rng, 30, 8), 5, 60), mind: clamp(normal(rng, 35, 10), 5, 70),
    charm: clamp(normal(rng, 40, 10), 5, 80), luck: clamp(normal(rng, 50, 12), 5, 95), happy: 60, wealth: STATUS_WEALTH[status],
    fame: statusRank(status) >= statusRank('noble') ? 20 : 2,
  };
  for (const [k, v] of Object.entries(TALENT_STAT[talent])) s[k as keyof Stats] = clamp(s[k as keyof Stats] + v, 0, 100);
  if (memory === 'full') s.mind = clamp(s.mind + 15, 0, 100);
  if (memory === 'faint') s.mind = clamp(s.mind + 6, 0, 100);
  for (const k of Object.keys(s) as (keyof Stats)[]) s[k] = Math.round(s[k]);
  return s;
}

// 始まる年齢 (人間換算)。child 5〜8 / teen 13〜16 / adult 17〜30 (召喚・転移はこれが既定)
const START_HEQ: Record<StartAge, [number, number]> = { birth: [0, 0], child: [5, 8], teen: [13, 16], adult: [17, 30] };

// 人間換算の年齢から実年齢へ (mortality.ts の heq の逆。老化しない種族は成人の年齢で止める)
export function heqToAge(e: number, r: Race): number {
  if (e < 16) return Math.round((e * r.adult) / 16);
  return Math.round(r.adult + (r.k > 0 ? (e - 16) / r.k : 0));
}

// 召喚された人の前世の仕事は、召喚された年齢でありうるものに選び直す (追加の乱数は引かない: 決まった並びから選ぶ)
function summonedJob(age: number, job: PastLife['job']): PastLife['job'] {
  const ok = PAST_JOBS.filter(([, , a, b]) => age >= a && age <= b);
  if (ok.some(([ja]) => ja === job.ja)) return job;
  const j = ok[(age * 7) % ok.length] ?? PAST_JOBS[11];
  return { ja: j[0], en: j[1] };
}

export function createHero(setup: Setup): Hero {
  const rng = makeRng(setup.seed);
  const world = resolveWorld(setup.world, rng);
  const c: HeroChoice = setup.hero;

  const arrival = pickWeighted(rng, ARRIVALS, ([, w]) => w)[0];
  const arr: Arrival = c.arrival ?? arrival;
  const race0 = pickWeighted(rng, world.races, ([, w]) => w)[0];
  const race: RaceId = c.race ?? (arr === 'summoned' ? 'human' : race0); // 召喚は人間だけ
  const sex0: Sex = rng() < 0.5 ? 'F' : 'M';
  const sex = c.sex ?? sex0;
  const status0 = pickWeighted(rng, statusWeights(world), ([, w]) => w)[0];
  const status: Status = c.status ?? (arr === 'summoned' ? 'commoner' : status0);
  const talent0 = pick(rng, TALENTS);
  const talent = c.talent ?? talent0;
  const cheat0 = drawCheat(rng, world);
  const cheat: CheatId | null = c.cheat === 'none' ? null : c.cheat ?? (arr === 'native' ? null : cheat0);
  const memory0 = pickWeighted(rng, MEMORIES, ([, w]) => w)[0];
  const memory: MemoryLevel = c.memory ?? (arr === 'native' ? 'none' : arr === 'summoned' ? 'full' : memory0);

  // 死に方を先に決め、その死に方でありうる年齢と、その年齢でありうる仕事を引く。召喚された人は死んでいないので、前世の年齢は今の年齢
  const pastCause = pickWeighted(rng, PAST_CAUSES, ([, w]) => w)[0];
  const [lo, hi] = PAST_AGE[pastCause];
  const diedAt = lo + Math.floor(rng() * (hi - lo + 1));
  const summonAge = 15 + Math.floor(rng() * 21);
  void summonAge; // 以前の召喚の年齢 (15〜35)。乱数の並びを保つために引くだけで、今は始まる年齢 (startAge) で決める
  const pastAge = diedAt;
  const pastJob = pick(rng, PAST_JOBS.filter(([, , a, b]) => pastAge >= a && pastAge <= b));
  const past: PastLife | undefined = arr === 'native' ? undefined : { age: pastAge, cause: pastCause, job: { ja: pastJob[0], en: pastJob[1] } };

  const nm = personName(rng, world, sex, status);
  const given = c.name ?? nm.given;
  const r = raceOf(race);
  const stats = initialStats(rng, status, talent, memory);
  if (arr === 'summoned') stats.power = clamp(stats.power + 10, 0, 100);
  const demonKing = rng() < 0.3 && demonKingWorld(world);

  // ここから下 (始まる年齢・能力の組み立て) は別の乱数で引く。今までの乱数の並びを変えないため (同じ seed の人生の前半がそのまま残る)
  const side = makeRng((setup.seed ^ 0x9e3779b9) >>> 0);
  const startAge: StartAge = c.startAge ?? (arr === 'summoned' ? 'adult' : 'birth');
  const [s0, s1] = START_HEQ[startAge];
  const startHeq = s0 + Math.floor(side() * (s1 - s0 + 1));
  const start = startAge === 'birth' ? 0 : heqToAge(startHeq, r);
  const build = randomBuild(side, world, race, { traits: c.traits, points: c.points });
  for (const k of ALLOT_KEYS) stats[k] = clamp(stats[k] + (build.points[k] ?? 0) * POINT_STEP, 0, 100);
  for (const id of build.traits) for (const [k, v] of Object.entries(traitOf(id)?.stats ?? {})) stats[k as keyof Stats] = clamp(stats[k as keyof Stats] + (v ?? 0), 0, 100);
  const blessing = c.blessing ?? false;

  const filled: Setup = {
    ...setup,
    world: { ...setup.world, preset: world.id },
    hero: { race, sex, status, talent, cheat: cheat ?? 'none', arrival: arr, memory, name: given, blessing, startAge, traits: build.traits, points: build.points },
  };
  const h: Hero = {
    seed: setup.seed, rng, setup: filled, world,
    // 名を選んだとき (埋めた後の設定で生き直すときも) は、引いた家名をその名に付ける
    name: c.name ? withFamily(world, c.name, nm.family) : nm.full, given, sex, race, status, talent, cheat, traits: build.traits, blessing, arrival: arr, memory,
    // 途中の年齢の体で目を覚ますときは、思い出すのはその時 (awaken でも最初から記憶がある)
    memoryAwake: (arr !== 'awaken' || start > 0) && memory !== 'none',
    age: start, alive: true, stats, level: 1, job: null, jobYears: 0,
    flags: {}, revives: cheat ? CHEATS[cheat].revive ?? 0 : 0, people: [], nextId: 1, log: [], pending: [], kinds: [],
    state: { war: 0, plague: 0, famine: 0, demonKing }, auto: setup.auto ?? false, policy: setup.policy ?? 'normal', used: [],
  };
  if (past) h.past = arr === 'summoned' ? { ...past, age: start, job: summonedJob(start, past.job) } : past;

  // 家族: 両親ときょうだい。召喚された人はこの世界に家族がいない。孤児は親を知らない
  const parentAge = () => Math.round(r.adult + clamp(normal(rng, 8, 5), 0, 25) / Math.max(0.05, r.k));
  // 途中の年齢で始まるときは、家族もそのぶん年を取っている
  const mAge = parentAge() + start;
  const fAge = parentAge() + start;
  const older = poisson(rng, 1.2);
  const sibAges = Array.from({ length: older }, (_, i) => 2 + i * 2 + Math.floor(rng() * 2) + start);
  const sibSex = sibAges.map(() => (rng() < 0.5 ? 'F' : 'M') as Sex);
  const kin = nm.family ?? null;
  const parentNames = [personName(rng, world, 'F', status, kin).given, personName(rng, world, 'M', status, kin).given];
  const sibNames = sibSex.map((s) => personName(rng, world, s, status, kin).given);
  if (arr !== 'summoned') {
    if (status !== 'orphan') {
      addTie(h, { name: parentNames[0], role: 'mother', race, sex: 'F', age: mAge });
      addTie(h, { name: parentNames[1], role: 'father', race, sex: 'M', age: fAge });
    }
    sibAges.forEach((a, i) => addTie(h, { name: sibNames[i], role: 'sibling', race, sex: sibSex[i], age: a }));
  }
  const first = log(h, birthStory(h), 'arrival', true, h.people.filter((t) => t.role === 'mother' || t.role === 'father').map((t) => t.id));
  if (h.people.length) first.join = h.people.map((t) => t.id); // 最初の家族
  return h;
}

const PAST_CAUSE_TEXT: Record<PastLife['cause'], [string, string]> = {
  truck: ['トラックにはねられて', 'hit by a truck'], overwork: ['働きすぎて倒れて', 'collapsed from overwork'], illness: ['病で', 'of an illness'],
  stabbed: ['通り魔に刺されて', 'stabbed by a stranger'], accident: ['事故で', 'in an accident'], disaster: ['災害に巻き込まれて', 'in a disaster'],
  old: ['老いて', 'of old age'], unknown: ['気づいたら', 'without knowing how'],
};

// 召喚されて目を覚ました場所
const WOKE: Record<ReturnType<typeof styleOf>, [string, string]> = {
  west: ['神殿', 'a temple'], myth: ['神殿', 'a temple'], desert: ['神殿', 'a temple'], wa: ['社の拝殿', 'a shrine hall'], zh: ['宗門の祭壇', "a sect's altar"],
  modern: ['路地裏', 'a back alley'], scifi: ['医療ポッドの中', 'a medical pod'], ruin: ['廃墟の地下室', 'a ruined cellar'],
};

export const sexWord = (s: Sex) => (s === 'F' ? L('女の子', 'girl') : L('男の子', 'boy'));

export function birthStory(h: Hero): string {
  const n = worldNames(h);
  const race = T(raceOf(h.race).name);
  const st = statusName(h.status, h.world);
  const w = T(h.world.name);
  const p = h.past;
  const pastLine = p ? L(`前世では${p.age}歳の${T(p.job)}で、${PAST_CAUSE_TEXT[p.cause][0]}亡くなった。`, `In a past life, a ${p.age}-year-old ${T(p.job)}, died ${PAST_CAUSE_TEXT[p.cause][1]}.`) : '';
  // 途中の年齢の体で始まる (startAge が child / teen / adult)。召喚は下の召喚の文で書く
  if (h.age > 0 && h.arrival !== 'summoned') {
    const e = heq(h.age, raceOf(h.race));
    const [bja, ben] = e < 13 ? ['子ども', 'child'] : e < 17 ? (h.sex === 'F' ? ['少女', 'girl'] : ['少年', 'boy']) : ['大人', 'adult'];
    if (h.arrival === 'native') {
      return L(`${w}の${n.town}で、${st}の${race}の${h.age}歳の${bja}として暮らしていた。`, `A ${h.age}-year-old ${race} ${ben} of a ${st.toLowerCase()} family, living in ${n.town}, ${w}.`);
    }
    return `${pastLine}${L(`${w}の${n.town}で、${st}の${race}の、${h.age}歳の${bja}の体で目を覚ました。${h.memory === 'none' ? '' : '前世の記憶を持ったまま。'}`,
      ` Woke in ${n.town}, ${w}, in the body of a ${h.age}-year-old ${race} ${ben} of a ${st.toLowerCase()} family.${h.memory === 'none' ? '' : ' With memories of the past life intact.'}`)}`;
  }
  switch (h.arrival) {
    case 'summoned':
      return L(`${p?.age ?? h.age}歳の${p ? T(p.job) : ''}だった${h.given}は、光に包まれて${w}に召喚された。${n.town}の${WOKE[styleOf(h.world)][0]}で目を覚ました。`,
        `${h.given}, a ${p?.age ?? h.age}-year-old ${p ? T(p.job) : ''}, was swallowed by light and summoned to the ${w}. They woke in ${WOKE[styleOf(h.world)][1]} in ${n.town}.`);
    case 'reborn':
      return `${pastLine}${L(`${w}の${n.town}で、${st}の${race}の${sexWord(h.sex)}として生まれ直した。${h.memory === 'none' ? '' : '前世の記憶を持ったまま。'}`,
        ` Reborn in ${n.town}, ${w}, as a ${race} ${sexWord(h.sex)} of a ${st.toLowerCase()} family.${h.memory === 'none' ? '' : ' With memories of the past life intact.'}`)}`;
    default:
      return L(`${w}の${n.town}で、${st}の${race}の${sexWord(h.sex)}として生まれた。`, `Born in ${n.town}, ${w}, a ${race} ${sexWord(h.sex)} of a ${st.toLowerCase()} family.`);
  }
}
