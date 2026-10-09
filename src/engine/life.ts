// 一つの人生を、1年ずつ進める (DESIGN 4節)。
// 1. ハザードで生死を引く → 2. 年を取る (輪の人も) → 3. 世界の状態を進める → 4. 節目 → 5. 出来事 → 6. 能力の自然な変化
import type { Decision, Hazard, Hero, JobId, LogEntry, Tie } from './types';
import { makeRng, pickWeighted } from './rng';
import { agePeople, byRole, bump, closest, log, mourn, shared } from './bonds';
import { traitFertility } from './traits';
import { attentionOf, deathChance, hazards, heq, HAZARDS, maternalRisk, mustDie, agingOf, heqOf, warStartP, WAR_MEAN_YEARS, plagueP, famineP, FAMINE_MEAN_YEARS, ADULT_HEQ } from './mortality';
import { raceOf } from './races';
import { CHEATS } from './cheats';
import { jobOf, jobsFor, jobWeight, JOBS, type JobDef } from './jobs';
import { statusRank } from './status';
import { demonKingWorld, hasTag } from './worlds';
import { deathRecord, foeFor, isClash, drawEvents, eventByRef, eventDecision, newTie, type Die } from './events';
import { deathWhy, reviveWhy } from './why';
import { styleOf, worldNames } from './names';
import { L, T } from '../i18n';

// ---- 死 -------------------------------------------------------------------

// 死の取り消し (死に戻り・不死の体) は回数が残る限り使う。老いは取り消せない。不死の体も封印 (処刑・魔法) には勝てない
const unrevivable = (h: Hero, hz: Hazard) => hz === 'age' || (h.cheat === 'immortal_body' && (hz === 'execution' || hz === 'magic'));

export const die: Die = (h, hz) => {
  if (!h.alive) return;
  if (h.revives > 0 && !unrevivable(h, hz)) {
    h.revives--;
    h.flags.revived = h.age;
    bump(h, { happy: h.cheat === 'return_by_death' ? -12 : -4 });
    log(h, h.cheat === 'return_by_death'
      ? L('死んだ——はずだった。気づくと、少し前の朝に戻っていた。', 'Died. Or should have. Then it was a morning a little while ago, again.')
      : L('致命の傷が、ゆっくりと塞がっていった。', 'The fatal wound slowly closed.'), 'power', true, undefined, reviveWhy(h));
    return;
  }
  h.alive = false;
  h.death = deathRecord(h, hz);
  const e = log(h, h.death.text, 'death', true, closest(h).map((t) => t.id), deathWhy(h, hz));
  e.hazard = hz;
  // 戦いで倒れたなら、その記録にも戦いを付ける (暴力は刃を交えた死だけ。毒や断罪は付けない)
  if (hz === 'monster' || hz === 'war' || (hz === 'violence' && isClash(h.death.text))) e.fight = { foe: foeFor(h, hz, h.death.text), result: 'lose' };
  h.kinds[h.age] = 'death';
  h.pending = [];
};

export function pickHazard(h: Hero): Hazard {
  if (mustDie(h)) return 'age';
  const z = hazards(h);
  return pickWeighted(h.rng, HAZARDS.filter((k) => z[k] > 0), (k) => z[k]);
}

// ---- 世界の状態 -----------------------------------------------------------

function stepWorld(h: Hero): void {
  const w = h.world, s = h.state;
  const wasWar = s.war > 0;
  if (s.war > 0) s.war--;
  else if (h.rng() < warStartP(w)) {
    s.war = 1 + Math.floor(h.rng() * (WAR_MEAN_YEARS * 2 - 1));
    log(h, L('戦争が始まった。', 'War broke out.'), 'hard', false);
    draft(h);
  }
  if (wasWar && s.war === 0) { delete h.flags.drafted; log(h, L('戦争が終わった。', 'The war ended.'), 'family'); }
  const doubled = s.war > 0 ? 2 : 1; // 戦争の年は疫病と飢饉が2倍起きやすい (research/03 の 7-1節)
  if (s.plague > 0) s.plague--;
  else if (h.rng() < plagueP(w) * doubled) { s.plague = 1; log(h, L('大疫病が町を襲った。', 'A great plague swept the land.'), 'ill', true); }
  if (s.famine > 0) s.famine--;
  else if (h.rng() < famineP(w) * doubled) {
    s.famine = h.rng() < FAMINE_MEAN_YEARS - 1 ? 2 : 1;
    log(h, L('飢饉の年になった。', 'Famine came.'), 'hard', false);
  }
  demonKing(h);
}

// 戦争が始まると、兵の職業の人は従軍し、身分の低い成人男性の一部は徴兵される
function draft(h: Hero): void {
  const e = heqOf(h);
  const j = jobOf(h.job);
  if (e < ADULT_HEQ || h.flags.retired !== undefined) return;
  if (j?.war) { log(h, L(`${T({ ja: j.ja, en: j.en })}として戦に出た。`, `Went to war as a ${j.en.toLowerCase()}.`), 'battle', true).fight = { foe: foeFor(h, 'war', ''), result: 'win' }; return; }
  // 徴兵は前近代の軍で多く、近代以降 (tech 7 以上) は職業軍人が主になる
  if (h.sex === 'M' && e < 45 && statusRank(h.status) <= statusRank('commoner') && h.rng() < (h.world.tech >= 7 ? 0.05 : 0.25)) {
    h.flags.drafted = h.age;
    log(h, L('徴兵され、戦に出ることになった。', 'Was conscripted and sent to war.'), 'battle', true).fight = { foe: foeFor(h, 'war', ''), result: 'win' };
  }
}

// 魔王の呼び名は世界の系統で変える (和風は鬼の王、中華風は魔尊)。[現れた, 討つ者に選ばれた, 討ち果たした, どこかの誰かが討った]
function dkLines(h: Hero): [string, string][] {
  switch (styleOf(h.world)) {
    case 'wa': return [['鬼の王が山から下りてきた。', 'The King of Oni came down from the mountains.'], ['鬼の王を討つ者に選ばれ、旅に出た。', 'Was chosen to slay the King of Oni, and set out.'],
      ['鬼の王を討ち果たした。', 'Slew the King of Oni.'], ['どこかの武者が、鬼の王を討ったという。', 'Word came that some warrior had slain the King of Oni.']];
    case 'zh': return [['魔尊が封印を破った。', 'The Demon Sovereign broke its seal.'], ['魔尊を討つ者に選ばれ、山を下りた。', 'Was chosen to slay the Demon Sovereign, and came down the mountain.'],
      ['魔尊を討ち果たした。', 'Slew the Demon Sovereign.'], ['どこかの仙人が、魔尊を討ったという。', 'Word came that some immortal had slain the Demon Sovereign.']];
    default: return [['魔王が現れた。', 'A Demon King has risen.'], ['勇者に選ばれ、魔王を討つ旅に出た。', 'Was chosen as the Hero, and set out to slay the Demon King.'],
      ['魔王を討ち果たした。', 'Slew the Demon King.'], ['どこかの勇者が、魔王を討ったという。', 'Word came that some hero had slain the Demon King.']];
  }
}

// 魔王の出現と討伐、勇者と聖女 (research/06 の 1〜3節、16.3節)
function demonKing(h: Hero): void {
  const w = h.world, s = h.state;
  if (!demonKingWorld(w)) return;
  if (!s.demonKing) {
    if (h.rng() < 0.005) { s.demonKing = true; log(h, L(...dkLines(h)[0]), 'hard', true); }
    return;
  }
  const e = heqOf(h);
  const att = attentionOf(h);
  if (h.flags.hero === undefined && h.flags.saint === undefined && h.alive && e >= 14 && e <= 35) {
    const heroish = att >= 2 || h.cheat === 'sword_saint' || h.talent === 'might';
    const saintly = h.cheat === 'holy_power' || (h.sex === 'F' && h.talent === 'magic');
    if (saintly && h.rng() < 0.08) {
      h.flags.saint = h.age; h.job = 'saint'; h.jobYears = 0; bump(h, { fame: 30 });
      log(h, L(`${worldNames(h).god}の神託で、聖女に選ばれた。`, `The oracle of ${worldNames(h).god} named them the Saint.`), 'fame', true);
    } else if (heroish && h.rng() < 0.06) {
      h.flags.hero = h.age; h.job = 'hero'; h.jobYears = 0; bump(h, { fame: 30 });
      log(h, L(...dkLines(h)[1]), 'fame', true);
    }
  }
  if (h.flags.hero !== undefined && h.alive && h.rng() < 0.12) {
    s.demonKing = false; h.flags.demonKingSlain = h.age; bump(h, { fame: 40, happy: 15 });
    log(h, L(...dkLines(h)[2]), 'fame', true).fight = { foe: 'demon', result: 'win' };
  } else if (h.rng() < 0.05) {
    s.demonKing = false;
    log(h, L(...dkLines(h)[3]), 'family');
  }
}

// ---- 節目 -----------------------------------------------------------------

// その年に人間換算で x 歳を越えたか
const crossed = (h: Hero, x: number) => {
  const r = raceOf(h.race), ag = agingOf(h);
  return heq(h.age, r, ag) >= x && heq(h.age - 1, r, ag) < x;
};

// 洗礼と魔力測定の言い方は世界の系統で変える (和風の社・中華風の廟・現代の適性検査・文明の後の古老)
function measured(h: Hero): [string, string] {
  const g = worldNames(h).god;
  switch (styleOf(h.world)) {
    case 'wa': return [`${g}を祀る社で七つの祝いを受け、神主に霊力を見てもらった。`, `At the shrine of ${g}, a priest read the child's spirit at the age-seven blessing.`];
    case 'zh': return [`${g}の廟で、道士に気の巡りを見てもらった。`, `At the shrine of ${g}, a Taoist priest read the flow of the child's qi.`];
    case 'modern': return ['小学校の適性検査で、異能の有無を調べられた。', 'An aptitude screening at school checked for abilities.'];
    case 'scifi': return ['定期の神経スキャンで、能力の有無を調べられた。', 'A routine neural scan checked for latent abilities.'];
    case 'ruin': return ['集落の古老に、手のひらの力を見てもらった。', "The settlement's elder read the power in the child's palms."];
    default: return [`${g}の神殿で魔力を測られた。`, `Mana was measured at the temple of ${g}.`];
  }
}
// 学院の呼び名
const SCHOOL: Record<ReturnType<typeof styleOf>, [string, string]> = {
  west: ['学院', 'academy'], myth: ['学び舎', 'school of sages'], desert: ['学び舎', 'school of sages'], wa: ['藩校', 'domain school'],
  zh: ['書院', 'academy'], modern: ['名門校', 'elite school'], scifi: ['士官学校', 'academy'], ruin: ['学び舎', 'schoolhouse'],
};

function milestones(h: Hero, out: Decision[]): void {
  const w = h.world;
  const e = heqOf(h);
  // 洗礼と魔力測定 (7歳ごろ): スキルが分かる。目立つ特典は知られてしまうことがある
  if (h.flags.baptized === undefined && e >= 7 && (w.magic >= 1 || hasTag(w, 'gamey'))) {
    h.flags.baptized = h.age;
    const c = h.cheat ? CHEATS[h.cheat] : null;
    const [ja, en] = h.arrival === 'summoned'
      ? [`召喚した者たちに、この世界での力を調べられた。`, `The summoners tested what power had come with the summoned.`] as [string, string]
      : measured(h);
    const txt = c
      ? (h.cheat === 'trash_skill' ? L(`${ja}授かったのは役に立たないと笑われる力だった。`, `${en} The gift was laughed off as useless.`)
        : L(`${ja}授かったのは「${T(c.name)}」。`, `${en} The gift: ${T(c.name)}.`))
      : L(`${ja}人並みだった。`, `${en} Ordinary.`);
    log(h, txt, 'power', !!c);
    if (c && c.attention >= 2 && h.rng() < 0.3) { h.flags.outed = h.age; log(h, L('その力は噂になった。', 'Word of the power spread.'), 'fame'); }
  }
  // 途中で前世を思い出す (人間換算 5〜12歳。乱数の並びを変えないよう seed から決める)
  if (h.arrival === 'awaken' && !h.memoryAwake && h.memory !== 'none' && e >= 5 + (h.seed % 8)) {
    h.memoryAwake = true;
    bump(h, { mind: h.memory === 'full' ? 12 : 5 });
    log(h, L('熱にうなされた夜、前世を思い出した。', 'One feverish night, the memories of a past life came back.'), 'arrival', true);
  }
  // 外れスキルが化ける (12〜25歳)
  if (h.cheat === 'trash_skill' && h.flags.awakened === undefined && h.age >= 12 + (h.seed % 14)) {
    h.flags.awakened = h.age; bump(h, { power: 15, level: 5 });
    log(h, L('外れと笑われたスキルが、ある日とつぜん化けた。', 'The "useless" skill suddenly revealed what it truly was.'), 'power', true);
  }
  // 学院 (人間換算12歳)。貴族社会の世界か、騎士の家以上か、魔力の高い子
  if (h.flags.academy === undefined && crossed(h, 12)) {
    const gifted = h.stats.mind >= 60 && w.magic >= 2;
    if (hasTag(w, 'nobility') || (statusRank(h.status) >= statusRank('gentry') && !hasTag(w, 'ruin')) || (gifted && h.rng() < 0.4)) {
      h.flags.academy = h.age; bump(h, { mind: 8 });
      const [ja, en] = SCHOOL[styleOf(w)];
      log(h, L(`${worldNames(h).town}の${ja}に入った。`, `Entered the ${en} in ${worldNames(h).town}.`), 'school', true);
    }
  }
  // 成人と職業選び
  if (h.flags.adult === undefined && e >= ADULT_HEQ) {
    h.flags.adult = h.age;
    if (!h.job) { const d = jobDecision(h, jobOptions(h)); if (d) out.push(d); }
  }
  if (h.flags.adult !== undefined) adultLife(h, e);
}

function adultLife(h: Hero, e: number): void {
  const j = jobOf(h.job);
  // ギルド登録と昇格 (research/02 の 10.6節: F→C に5〜10年、多くは C で引退、B 以上は1割)
  if (h.job === 'adventurer' && h.flags.retired === undefined) {
    if (h.flags.guild === undefined) {
      h.flags.guild = h.age; h.rank = 'F';
      log(h, L(`${worldNames(h).guild}に冒険者として登録した。ランクはF。`, `Registered with ${worldNames(h).guild} as an adventurer. Rank F.`), 'adventure', true);
    } else if (h.rank && h.rank !== 'S') {
      const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
      const i = ranks.indexOf(h.rank);
      const boost = h.cheat === 'exp_boost' || h.cheat === 'growth' ? 2 : 1;
      const p = Math.max(0.02, (0.18 + (h.stats.power - 40) / 250) * boost * (i >= 3 ? 0.35 : 1) * (i >= 5 ? 0.3 : 1));
      if (h.rng() < p) {
        h.rank = ranks[i + 1]; bump(h, { fame: 4 + i * 3, wealth: 3 });
        log(h, L(`ランク${h.rank}に上がった。`, `Promoted to rank ${h.rank}.`), 'fame', i >= 3);
      }
    }
  }
  // 隠居
  if (j && h.flags.retired === undefined && e >= (j.retire ?? 60)) {
    h.flags.retired = h.age;
    log(h, L(`${T({ ja: j.ja, en: j.en })}の仕事から退いた。`, `Retired from life as a ${j.en.toLowerCase()}.`), 'old');
  }
  // 結婚 (人間換算 16〜50歳)。恋人がいればその人と
  const spouse = byRole(h, 'spouse');
  if (!spouse && e < 50 && h.flags.married === undefined && h.rng() < (statusRank(h.status) >= statusRank('gentry') ? 0.16 : 0.1)) {
    const lover = byRole(h, 'lover') ?? byRole(h, 'fiance');
    const t = lover ?? newTie(h, 'spouse');
    t.role = 'spouse';
    h.flags.married = h.age; delete h.flags.engaged; delete h.flags.widowed; bump(h, { happy: 10 });
    const e = shared(h, [t], L(`${t.name}と結婚した。`, `Married ${t.name}.`), 'love', 8, true);
    if (!lover) e.join = [t.id];
  }
  // 子 (結婚していて、人間換算 16〜45歳)。女性の主人公は翌年に産む (その年の出産の危険を受ける)
  const sp = byRole(h, 'spouse');
  const fertileHeq = h.sex === 'F' ? e : sp ? heq(sp.age, raceOf(sp.race)) : 99;
  if (sp && h.flags.pregnant === undefined && fertileHeq < 45 && h.rng() < raceOf(h.race).fertility * 0.7 * traitFertility(h)) {
    if (h.sex === 'F') h.flags.pregnant = h.age;
    else born(h, sp);
  }
}

// 子が生まれる。男性の主人公なら、母 (連れ合い) が出産の危険を受ける
function born(h: Hero, mother?: Tie): void {
  const c = newTie(h, 'child');
  const sp = byRole(h, 'spouse');
  shared(h, sp && sp !== c ? [c, sp] : [c], L(`子の${c.name}が生まれた。`, `A child, ${c.name}, was born.`), 'family', 0, true).join = [c.id];
  bump(h, { happy: 8 });
  if (mother && h.rng() < maternalRisk(h.world)) {
    mourn(h, mother, -25);
    delete h.flags.married; h.flags.widowed = h.age;
    log(h, L(`${mother.name}は出産で亡くなった。`, `${mother.name} died in childbirth.`), 'loss', true, [mother.id]).leave = [mother.id];
  }
}

// 職業の候補: 就ける職業から重みで3つ (自動の「ふつう」は1つめを選ぶので、人口の比率どおりになる)
function jobOptions(h: Hero): JobId[] {
  let pool: JobDef[] = jobsFor(h);
  const ids: JobId[] = [];
  while (ids.length < 3 && pool.length) {
    const j = pickWeighted(h.rng, pool, (x) => jobWeight(h, x));
    ids.push(j.id);
    pool = pool.filter((x) => x !== j);
  }
  return ids;
}

// 職業の危険のおおよその大きさ (慎重と無謀の選び分け用)
const jobRisk = (j: JobDef) => Object.values(j.risk).reduce((s, v) => s + (v ?? 1) - 1, 0) + Object.values(j.add ?? {}).reduce((s, v) => s + (v ?? 0) * 100, 0) + (j.war ? 1 : 0);

export function jobDecision(h: Hero, ids: JobId[]): Decision | null {
  if (!ids.length) return null;
  return {
    title: L('何を生業にする？', 'What will you do for a living?'),
    text: L('大人になった。', 'Came of age.'),
    ref: `job:${ids.join(',')}`,
    options: ids.map((id) => ({
      label: L(JOBS[id].ja, JOBS[id].en),
      apply: (x: Hero) => {
        x.job = id; x.jobYears = 0;
        log(x, L(`${JOBS[id].ja}になった。`, `Became a ${JOBS[id].en.toLowerCase()}.`), 'work', true);
      },
    })),
    auto: (x) => (x.policy === 'normal' ? 0 : ids.reduce((bi, id, i) => {
      const better = x.policy === 'careful' ? jobRisk(JOBS[id]) < jobRisk(JOBS[ids[bi]]) : jobRisk(JOBS[id]) > jobRisk(JOBS[ids[bi]]);
      return better ? i : bi;
    }, 0)),
  };
}

// ---- 能力の自然な変化 -------------------------------------------------------

const FIGHTERS: JobId[] = ['adventurer', 'hero', 'knight', 'soldier', 'mercenary', 'explorer', 'cultivator', 'samurai', 'ninja', 'raider'];

function drift(h: Hero): void {
  const e = heqOf(h);
  const r = raceOf(h.race);
  const s = h.stats;
  // 健康: 人間換算40歳を過ぎると年 0.7 ずつ下がる (mortality.ts の usualHp と同じ線)
  if (e >= 40) s.hp = Math.max(0, s.hp - 0.7 * r.k * agingOf(h));
  const j = jobOf(h.job);
  if (j && h.flags.retired === undefined) {
    h.jobYears++;
    for (const [k, v] of Object.entries(j.grow)) s[k as keyof typeof s] = Math.min(100, s[k as keyof typeof s] + (v ?? 0));
    s.wealth += (j.wealth - s.wealth) * 0.1;
    if (FIGHTERS.includes(h.job!)) h.level += h.cheat === 'exp_boost' ? 2 : h.cheat === 'growth' ? 1.5 : 1;
  }
  s.happy += (55 - s.happy) * 0.05;
  for (const k of Object.keys(s) as (keyof typeof s)[]) s[k] = Math.round(Math.min(100, Math.max(0, s[k])) * 10) / 10;
  h.level = Math.round(h.level * 10) / 10;
}

function baseKind(h: Hero): Hero['kinds'][number] {
  const e = heqOf(h);
  if (e < 10) return 'child';
  if (h.flags.academy !== undefined && e < ADULT_HEQ) return 'school';
  if (h.flags.retired !== undefined) return 'old';
  if (h.job === 'adventurer' || h.job === 'explorer' || h.job === 'hero') return 'adventure';
  if (h.job) return 'work';
  return 'family';
}

// ---- 1年 ------------------------------------------------------------------

// 選択肢を選ぶ (画面から)。選び終えたら次の年に進める
export function choose(h: Hero, option: number): void {
  const d = h.pending.shift();
  if (!d) return;
  (d.options[option] ?? d.options[0]).apply(h);
}

function settlePending(h: Hero, decs: Decision[]): void {
  h.pending.push(...decs);
  if (!h.auto) return;
  while (h.pending.length && h.alive) choose(h, h.pending[0].auto(h));
}

export function advanceYear(h: Hero): void {
  if (!h.alive) return;
  if (h.pending.length) { if (!h.auto) return; settlePending(h, []); if (!h.alive) return; }
  // 1. 生死
  if (h.rng() < deathChance(h)) { die(h, pickHazard(h)); if (!h.alive) return; }
  // 2. 年を取る
  h.age++;
  agePeople(h); // 先に輪の人が年を取る (生まれたばかりの子が、その年のうちに1歳の死亡率を受けないように)
  if (h.flags.pregnant !== undefined) { delete h.flags.pregnant; born(h); }
  siblings(h);
  // 3. 世界
  stepWorld(h);
  // 4. 節目 と 5. 出来事
  const decs: Decision[] = [];
  milestones(h, decs);
  if (h.alive) decs.push(...drawEvents(h, die));
  settlePending(h, decs);
  if (!h.alive) return;
  // 6. 能力
  drift(h);
  if (!h.kinds[h.age]) h.kinds[h.age] = baseKind(h);
}

// 下のきょうだいが生まれる (主人公が子どものうち、母が人間換算42歳まで)
function siblings(h: Hero): void {
  const m = byRole(h, 'mother');
  if (!m || heqOf(h) >= 14 || heq(m.age, raceOf(m.race)) >= 42) return;
  if (h.rng() < Math.min(0.25, raceOf(m.race).fertility * 0.5)) {
    const s = newTie(h, 'sibling');
    shared(h, [s], L(`下のきょうだいの${s.name}が生まれた。`, `A younger sibling, ${s.name}, was born.`), 'family').join = [s.id];
  }
}

// 自動で最後まで (テストと集計と「最後まで」用)
export function liveOut(h: Hero, maxYears = 4000): Hero {
  const auto = h.auto;
  h.auto = true;
  for (let i = 0; i < maxYears && h.alive; i++) advanceYear(h);
  h.auto = auto;
  return h;
}

// ---- 保存と再開 -----------------------------------------------------------

export type SavedHero = Omit<Hero, 'rng' | 'pending'> & { rngState: number; pendingRefs: string[] };

export function toSaved(h: Hero): SavedHero {
  const { rng, pending, ...rest } = h;
  return { ...structuredClone(rest), rngState: rng.state, pendingRefs: pending.map((d) => d.ref ?? '') };
}

export function fromSaved(s: SavedHero): Hero {
  const { rngState, pendingRefs, ...rest } = s;
  const h: Hero = { ...structuredClone(rest), rng: makeRng(s.seed, rngState), pending: [] };
  for (const ref of pendingRefs) {
    const ev = eventByRef(ref);
    if (ev?.choice) h.pending.push(eventDecision(h, ev, die));
    else if (ref.startsWith('job:')) { const d = jobDecision(h, ref.slice(4).split(',') as JobId[]); if (d) h.pending.push(d); }
  }
  return h;
}

// ---- まとめ ---------------------------------------------------------------

export interface Summary {
  age: number;
  alive: boolean;
  hazard?: Hazard;
  cause?: string;      // 死因の短い名
  text?: string;       // 死亡の記録の文
  why?: string;
  lastWith: Tie[];     // 最後にそばにいた人
  highlights: LogEntry[];
}

export function summary(h: Hero): Summary {
  const last = h.log[h.log.length - 1];
  const death = last?.kind === 'death' ? last : undefined;
  return {
    age: h.age, alive: h.alive,
    ...(h.death ? { hazard: h.death.hazard, cause: h.death.label, text: h.death.text } : {}),
    ...(death?.why ? { why: death.why } : {}),
    lastWith: h.alive ? closest(h) : (death?.who ?? []).map((id) => h.people.find((t) => t.id === id)!).filter(Boolean),
    highlights: h.log.filter((e) => e.big && e.kind !== 'death').slice(-10),
  };
}

