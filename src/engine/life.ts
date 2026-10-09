// 一つの人生を、1年ずつ進める (DESIGN 4節)。
// 1. ハザードで生死を引く → 2. 年を取る (輪の人も) → 3. 世界の状態を進める → 4. 節目 → 5. 出来事 → 6. 能力の自然な変化
import type { Decision, Hazard, Hero, JobId, LogEntry, Tie } from './types';
import { makeRng, pickWeighted } from './rng';
import { agePeople, byRole, bump, closest, log, mourn, shared } from './bonds';
import { traitFertility } from './traits';
import { attentionOf, deathChance, hazards, heq, HAZARDS, maternalRisk, mustDie, agingOf, heqOf, warStartP, WAR_MEAN_YEARS, plagueP, famineP, FAMINE_MEAN_YEARS, ADULT_HEQ } from './mortality';
import { raceOf } from './races';
import { CHEATS } from './cheats';
import { FIGHT_JOBS, jobOf, jobsFor, jobWeight, JOBS, type JobDef } from './jobs';
import { statusRank } from './status';
import { demonKingWorld, hasTag } from './worlds';
import { reincarnatorYear } from './reincarnators';
import { capLevel, jobHeld, LIVE, anchoredDeath, anchoredWorld, anchorsOf, anchorYear, canBear, deathBlocked, dressDeath, familyFixed } from './anchor';
import { arcYear, ensureFightJob, fightJobFor, promote } from './arc';
import { alliesFor, peopleYear } from './people';
import { onArc } from './events';
import { endLovers } from './events';
import { deathRecord, fightOf, fill, foeFor, isClash, drawEvents, eventByRef, eventDecision, newTie, type Die } from './events';
import { deathWhy, reviveWhy } from './why';
import { styleOf, worldNames } from './names';
import { L, T } from '../i18n';

// ---- 死 -------------------------------------------------------------------

// 死の取り消し (死に戻り・不死の体) は回数が残る限り使う。老いは取り消せない。不死の体も封印 (処刑・魔法) には勝てない
const unrevivable = (h: Hero, hz: Hazard) => hz === 'age' || (h.cheat === 'immortal_body' && (hz === 'execution' || hz === 'magic'));

let forcing = false; // 錨の死 (anchor.ts) を起こしている間
export const die: Die = (h, hz) => {
  if (!h.alive) return;
  if (!forcing && deathBlocked(h)) return; // ほかの人の一生: 錨の死の年より前には死なない
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
  // 最期のそばにいた人: 連れ合いがいれば先に (近さの順だと、恋人や友が連れ合いより前に来ることがある)
  const sp = byRole(h, 'spouse');
  const by = sp ? [sp, ...closest(h, 4).filter((t) => t !== sp)].slice(0, 3) : closest(h);
  const e = log(h, h.death.text, 'death', true, by.map((t) => t.id), deathWhy(h, hz));
  e.hazard = hz;
  // 戦いで倒れたなら、その記録にも戦いを付ける (暴力は刃を交えた死だけ。毒や断罪は付けない)
  if (hz === 'monster' || hz === 'war' || (hz === 'violence' && isClash(h.death.text))) e.fight = fightOf(h, foeFor(h, hz, h.death.text), 'lose');
  h.kinds[h.age] = 'death';
  h.pending = [];
};

export function pickHazard(h: Hero): Hazard {
  if (mustDie(h)) return 'age';
  const z = hazards(h);
  return pickWeighted(h.rng, HAZARDS.filter((k) => z[k] > 0), (k) => z[k]);
}

// ---- 世界の状態 -----------------------------------------------------------

// その年の世界の様子を1文字に (Hero.worldHist。others.ts の worldTimeline が読む)
export const worldChar = (h: Hero) => ((h.state.war > 0 ? 1 : 0) | (h.state.plague > 0 ? 2 : 0) | (h.state.famine > 0 ? 4 : 0) | (h.state.demonKing ? 8 : 0)).toString(16);

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
  // 一緒に戦う仲間がいれば、その人と並んで出る
  const ally = alliesFor(h)[0];
  const [wja, wen] = ally ? [`${ally.name}と並んで`, ` alongside ${ally.name}`] : ['', ''];
  if (j?.war) { log(h, L(`${T({ ja: j.ja, en: j.en })}として、${wja}戦に出た。`, `Went to war as a ${j.en.toLowerCase()}${wen}.`), 'battle', true).fight = fightOf(h, foeFor(h, 'war', '')); return; }
  // 徴兵は前近代の軍で多く、近代以降 (tech 7 以上) は職業軍人が主になる
  if (h.sex === 'M' && e < 45 && statusRank(h.status) <= statusRank('commoner') && h.rng() < (h.world.tech >= 7 ? 0.05 : 0.25)) {
    h.flags.drafted = h.age;
    log(h, L(`徴兵され、${wja}戦に出ることになった。`, `Was conscripted and sent to war${wen}.`), 'battle', true).fight = fightOf(h, foeFor(h, 'war', ''));
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
      // 男性は神官として (聖女は女性の呼び名)
      h.flags.saint = h.age; h.job = h.sex === 'M' ? 'priest' : 'saint'; h.jobYears = 0; bump(h, { fame: 30 });
      log(h, L(`${worldNames(h).god}の神託で、${h.sex === 'M' ? '聖者' : '聖女'}に選ばれた。`, `The oracle of ${worldNames(h).god} named them the Saint.`), 'fame', true);
    } else if (heroish && h.rng() < 0.06) {
      h.flags.hero = h.age; h.job = 'hero'; h.jobYears = 0; bump(h, { fame: 30 });
      log(h, L(...dkLines(h)[1]), 'fame', true);
    }
  }
  if (h.flags.hero !== undefined && h.alive && h.rng() < 0.12) {
    s.demonKing = false; h.flags.demonKingSlain = h.age; bump(h, { fame: 40, happy: 15 });
    log(h, L(...dkLines(h)[2]), 'fame', true).fight = fightOf(h, 'demon');
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
    const aj = anchorsOf(h)?.job;
    if (aj) { h.job = aj; h.jobYears = 0; }
    else if (!h.job && !jobHeld(h)) { const d = jobDecision(h, jobOptions(h)); if (d) out.push(d); }
  }
  if (h.flags.adult !== undefined) adultLife(h, e);
}

function adultLife(h: Hero, e: number): void {
  const j = jobOf(h.job);
  // ギルド登録と昇格。冒険者の職に就いた人は登録し、昇格は職の冒険者と英雄の筋に乗った人 (arc.ts の promote)
  if (h.job === 'adventurer' && h.flags.retired === undefined && h.flags.guild === undefined) {
    h.flags.guild = h.age; h.rank = 'F';
    log(h, L(`${worldNames(h).guild}に冒険者として登録した。ランクはF。`, `Registered with ${worldNames(h).guild} as an adventurer. Rank F.`), 'adventure', true);
  } else promote(h);
  // 隠居
  if (j && h.flags.retired === undefined && e >= (j.retire ?? 60)) {
    h.flags.retired = h.age;
    log(h, L(`${T({ ja: j.ja, en: j.en })}の仕事から退いた。`, `Retired from life as a ${j.en.toLowerCase()}.`), 'old');
  }
  // 結婚 (人間換算 16〜50歳)。恋人がいればその人と
  const spouse = byRole(h, 'spouse');
  if (!familyFixed(h) && !spouse && e < 50 && h.flags.married === undefined && h.rng() < (statusRank(h.status) >= statusRank('gentry') ? 0.16 : 0.1)) {
    const lover = byRole(h, 'lover') ?? byRole(h, 'fiance');
    const t = lover ?? newTie(h, 'spouse');
    t.role = 'spouse';
    h.flags.married = h.age; delete h.flags.engaged; delete h.flags.widowed; bump(h, { happy: 10 });
    const e = shared(h, [t], L(`${t.name}と結婚した。`, `Married ${t.name}.`), 'love', 8, true);
    if (!lover) e.join = [t.id];
    endLovers(h, t); // ほかの恋人との仲は終わる
  }
  // 子 (結婚していて、人間換算 16〜45歳)。女性の主人公は翌年に産む (その年の出産の危険を受ける)
  // 子: 産む側 (主人公か連れ合いの女性) が人間換算45歳まで (anchor.ts の canBear)
  const sp = byRole(h, 'spouse');
  if (sp && !familyFixed(h) && h.flags.pregnant === undefined && canBear(h) && h.rng() < raceOf(h.race).fertility * 0.7 * traitFertility(h)) {
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
  // 成人前に英雄の筋で登録した人は、その世界の戦う職を必ず1つめの候補にする (自動の「ふつう」はこれを選ぶ)
  const fj = onArc(h) && h.flags.guild !== undefined ? fightJobFor(h) : null;
  if (fj) { ids.push(fj); pool = pool.filter((x) => x.id !== fj); }
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
    auto: (x) => {
      if (x.policy === 'normal') return 0;
      // 慎重な人でも、特典を持っていれば3割で戦う職を選ぶ (力を使う道に少しは寄せる)
      const fight = ids.findIndex((id) => FIGHT_JOBS.includes(id));
      if (x.policy === 'careful' && x.cheat && fight >= 0 && x.rng() < 0.3) return fight;
      return ids.reduce((bi, id, i) => {
      const better = x.policy === 'careful' ? jobRisk(JOBS[id]) < jobRisk(JOBS[ids[bi]]) : jobRisk(JOBS[id]) > jobRisk(JOBS[ids[bi]]);
      return better ? i : bi;
    }, 0);
    },
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
  // 1. 生死 (ほかの人の一生では、錨の死の年にその死因で亡くなる)
  const fixed = anchoredDeath(h);
  if (fixed) { forcing = true; die(h, fixed); forcing = false; dressDeath(h); return; }
  if (h.rng() < deathChance(h)) { die(h, pickHazard(h)); if (!h.alive) return; }
  // 2. 年を取る (先に輪の人が年を取る。生まれたばかりの子が、その年のうちに1歳の死亡率を受けないように)
  h.age++;
  agePeople(h);
  peopleYear(h); // 輪の人それぞれの1年 (結婚・昇進・負傷・旅立ち。people.ts、横の乱数)
  if (!anchorsOf(h)) reincarnatorYear(h); // ほかの転生者との出会い・噂 (reincarnators.ts、横の乱数)。ほかの人の一生では起こさない
  anchorYear(h); // ほかの人の一生: その年の錨 (結婚・子・共有の出来事)
  if (h.flags.pregnant !== undefined) { delete h.flags.pregnant; born(h); }
  if (!familyFixed(h)) siblings(h);
  // 3. 世界
  const wy = anchoredWorld(h);
  if (wy) Object.assign(h.state, { war: wy.war ? 1 : 0, plague: wy.plague ? 1 : 0, famine: wy.famine ? 1 : 0, demonKing: wy.demonKing });
  else stepWorld(h);
  h.worldHist = (h.worldHist ?? '') + worldChar(h);
  // 4. 節目 と 5. 出来事
  const decs: Decision[] = [];
  milestones(h, decs);
  if (h.alive) arcYear(h, die, fill('{beast}', h));
  if (h.alive) decs.push(...drawEvents(h, die));
  settlePending(h, decs);
  if (!h.alive) return;
  ensureFightJob(h); // 英雄の筋で登録した大人は、その年のうちに戦う職へ (登録が出来事でも節目でも)
  // 6. 能力
  drift(h);
  capLevel(h); // ほかの人の一生: 主人公の輪にいた間の level を人物像に合わせる
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
LIVE.out = liveOut;

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

// 主な出来事: 一生全体から、子ども時代から晩年まで偏らずに選ぶ。
// 一生を年代で5つに分け、各枠に2件まで大事さの順で入れ、余った枠は一生全体の大事さの順で埋める (並びは年の順)
const HIGHLIGHT_MAX = 10;
const IMPORTANT = /生まれ|洗礼|魔力を測|霊力|気の巡り|適性|力があると気づ|初めて〈|登録|門を叩|名を連ね|資格を取|踏破|討った|守り抜|酒場でも語|吟遊詩人|結婚|亡くなった|魔王|鬼の王|魔尊|勇者|聖女|追放|置いて、|になった|ランク[A-S]|born|baptism|Married|died|Demon|Hero|Saint|exiled|became|rank [A-S]/i;
function importance(e: LogEntry): number {
  let s = e.big ? 3 : 0;
  if (e.kind === 'arrival') s += 10; // 誕生・転生・召喚
  if (e.kind === 'fame' || e.kind === 'power' || e.kind === 'love') s += 2;
  if (e.kind === 'family' || e.kind === 'loss' || e.kind === 'adventure' || e.kind === 'battle') s += 1.5;
  if (e.join?.length || e.leave?.length) s += 1;
  if (e.fight?.result === 'win') s += 0.5;
  if (IMPORTANT.test(e.text)) s += 2;
  return s;
}
export function highlights(h: Hero): LogEntry[] {
  const pool = h.log.filter((e) => e.kind !== 'death' && (e.big || importance(e) >= 3));
  if (!pool.length) return [];
  const start = h.log[0]?.age ?? 0, end = h.age + 1;
  const width = Math.max(1, (end - start) / 5);
  const byScore = (a: LogEntry, b: LogEntry) => importance(b) - importance(a) || a.age - b.age;
  const chosen = new Set<LogEntry>();
  for (let k = 0; k < 5; k++) {
    const lo = start + k * width, hi = start + (k + 1) * width;
    pool.filter((e) => e.age >= lo && e.age < hi).sort(byScore).slice(0, 2).forEach((e) => chosen.add(e));
  }
  for (const e of [...pool].sort(byScore)) { if (chosen.size >= HIGHLIGHT_MAX) break; chosen.add(e); }
  return h.log.filter((e) => chosen.has(e));
}

export function summary(h: Hero): Summary {
  const last = h.log[h.log.length - 1];
  const death = last?.kind === 'death' ? last : undefined;
  return {
    age: h.age, alive: h.alive,
    ...(h.death ? { hazard: h.death.hazard, cause: h.death.label, text: h.death.text } : {}),
    ...(death?.why ? { why: death.why } : {}),
    lastWith: h.alive ? closest(h) : (death?.who ?? []).map((id) => h.people.find((t) => t.id === id)!).filter(Boolean),
    highlights: highlights(h),
  };
}

