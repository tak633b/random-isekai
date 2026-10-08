// 死亡率。docs/DESIGN.md 2節の式。
// 基準は「その世界の平民の人間」の生命表 (research/03 の 6-1節、ゴンペルツ=メイカム型) で、
// 種族は人間換算の年齢 heq と老化の速さ k (research/04 の 8.3節)、外因の倍率 E で表す。
// その年のハザードを死因の分類 (Hazard) ごとに持ち、身分・職業・能力・特典・世界の状態の倍率を重ねる。
import type { Hazard, Hero, Race, RaceId, Stage, World } from './types';
import { raceOf } from './races';
import { statusExecution, statusMult, statusRank } from './status';
import { jobOf, jobsIn } from './jobs';
import { CHEATS } from './cheats';
import { traitAging, traitAttention, traitMult } from './traits';
import { hasTag } from './worlds';

export const HAZARDS: Hazard[] = ['infant', 'disease', 'monster', 'violence', 'war', 'accident', 'childbirth', 'magic', 'execution', 'famine', 'plague', 'age'];
export type Hazards = Record<Hazard, number>;
const zero = (): Hazards => ({ infant: 0, disease: 0, monster: 0, violence: 0, war: 0, accident: 0, childbirth: 0, magic: 0, execution: 0, famine: 0, plague: 0, age: 0 });

export const ADULT_HEQ = 16;
const hz = (q: number) => -Math.log(1 - q);

// ---- 年齢 -----------------------------------------------------------------

// 人間換算の年齢。成人前は成人の年齢を16歳に引き延ばし、成人後は k (と特典・修行の aging) の速さで年を取る
export function heq(age: number, race: Race, aging = 1): number {
  return age < race.adult ? (age * ADULT_HEQ) / race.adult : ADULT_HEQ + (age - race.adult) * race.k * aging;
}

// 仙侠の修行の段階 (noble-eastern.ts のしるし)。段階が上がるほど老いが遅くなる (research/03 の 7-7節: 段階ごとに a30 を 0.3〜0.1倍、上限を 150・300・500)。
// 上の段階から見て、最初に立っているものを使う
const CULTIVATION: [string, number][] = [['ne.ascend', 0.15], ['ne.nascent', 0.25], ['ne.core', 0.4], ['ne.foundation', 0.6]];

// 老化の速さにかける倍率: 特典 (不老・超再生など) × 職業 × 修行の段階。
// 人間換算の年齢は今の倍率で成人から数え直すので、段階を上がった年に見かけの年齢が若返る (修行者が若い姿に戻る、という物語の型)
export function agingOf(h: Hero): number {
  const c = h.cheat ? CHEATS[h.cheat].aging ?? 1 : 1;
  const j = jobOf(h.job)?.aging ?? 1;
  let k = 1;
  // 修行で寿命が延びるのは、魔法が世の理を左右する世界 (magic 3、仙侠) だけ。和風の世界にも同じしるしの出来事はあるが、そこでは物語の味付けにとどめる
  if (h.world.magic >= 3) for (const [flag, v] of CULTIVATION) if (h.flags[flag] !== undefined) { k = v; break; }
  return c * j * k * traitAging(h);
}

export const heqOf = (h: Hero) => heq(h.age, raceOf(h.race), agingOf(h));

// 人生の段階は人間換算の年齢で決める (エルフは何十年も子どもでいる)
export function stageAt(e: number): Stage {
  return e < 3 ? 'infant' : e < 10 ? 'child' : e < ADULT_HEQ ? 'teen' : e < 40 ? 'adult' : e < 60 ? 'middle' : 'elder';
}
export const stageOf = (h: Hero): Stage => stageAt(heqOf(h));

// ---- 世界の基準のハザード (平民・身分や職業の倍率の前) ------------------------

// 0歳は q0、1〜4歳は 0〜4歳を通して q5 になる年あたりの値 (実年齢で数える。成体で作られる種族には無い)。
// 5歳から成人までは ch を 病・事故・魔物に 6:2:2。成人後は c を 病 (11 − medicine)・魔物 danger・暴力 (10 − law)・事故 2 の重みで分け、
// 老いは k × a30 × exp(b × (heq − 30))。種族の E は病以外の外因と ch にかける
export function baseHazards(w: World, r: Race, age: number, aging = 1): Hazards {
  const z = zero();
  if (age < 5 && age < r.adult) {
    z.infant = age === 0 ? hz(w.q0) : hz(1 - ((1 - w.q5) / (1 - w.q0)) ** 0.25);
    return z;
  }
  const e = heq(age, r, aging);
  if (e < ADULT_HEQ) {
    const h = hz(w.ch) * r.E;
    z.disease = h * 0.6; z.accident = h * 0.2; z.monster = h * 0.2;
    return z;
  }
  const wd = 11 - w.medicine, wm = w.danger, wv = 10 - w.law, wa = 2;
  const sum = wd + wm + wv + wa;
  z.disease = (w.c * wd) / sum;
  z.monster = (w.c * wm * r.E) / sum;
  z.violence = (w.c * wv * r.E) / sum;
  z.accident = (w.c * wa * r.E) / sum;
  z.age = r.k * aging * w.a30 * Math.exp(w.b * (e - 30));
  return z;
}

// ---- 世界の状態 (戦争・疫病・飢饉) の確率と重さ ------------------------------

// 戦争の始まる確率 war × 0.012 / 年 (research/03 の 7-1節)。続くのは1〜4年 (平均2.5年)
export const warStartP = (w: World) => w.war * 0.012;
export const WAR_MEAN_YEARS = 2.5;
const warShare = (w: World) => (warStartP(w) * WAR_MEAN_YEARS) / (1 + warStartP(w) * WAR_MEAN_YEARS);
// 従軍した者の1年の戦死: 前近代の戦役で 5〜15% (7-1節)。世界の war が激しいほど上
export const warServeH = (w: World) => 0.04 + 0.008 * w.war;
// 戦時の民間人: 略奪と行軍路で暴力が増える (7-1節は c に 0.005〜0.02)
// 治安 (law) が高い世界ほど、戦の害は民間に及びにくい
export const warCivilH = (w: World) => 0.0008 * w.war * (10 - w.law) / 10;
// 大疫病: 年 0.02〜0.03 の確率 (30〜50年に一度)、起きた年は 0.10〜0.40 の追加 (7-2節)。
// tech 7 以上ではほぼ起きず、medicine が高いほど起きにくく軽い。戦争の年は2倍起きやすい
export const plagueP = (w: World) => 0.025 * (w.tech >= 7 ? 0.05 : w.tech === 6 ? 0.5 : 1) * (1 - w.medicine / 20);
export const plagueH = (w: World) => hz(0.15 * (1 - w.medicine / 15));
// 飢饉: tech 5 以下で年 0.04、6 で 0.01、7 以上でほぼ 0。起きた年は 0.03〜0.10 の追加、子どもと高齢者は2倍 (7-3節)
export const famineP = (w: World) => (w.tech <= 5 ? 0.04 : w.tech === 6 ? 0.01 : 0.001);
export const famineH = () => hz(0.04);
export const FAMINE_MEAN_YEARS = 1.5;

// 異能の暴走: 異能が一定数いる世界 (powers 2 以上) の大人に
export const powersH = (w: World) => (w.powers >= 2 ? 0.0002 * w.powers : 0);

// 出産1回の母の死: medicine で 0.015〜0.00007 (7-5節)
export function maternalRisk(w: World): number {
  const m = w.medicine;
  return m <= 3 ? 0.015 : m <= 5 ? 0.009 : m <= 6 ? 0.005 : m <= 7 ? 0.001 : m <= 8 ? 0.0003 : 0.00007;
}

// 年齢による重み: 疫病は幼子と高齢者に 1.5倍、飢饉は 2倍
const plagueAgeK = (age: number, e: number) => (age < 5 || e >= 60 ? 1.5 : 1);
const famineAgeK = (age: number, e: number) => (age < 5 || e >= 60 ? 2 : 1);

// 生命表 (5-3節) は戦争・疫病・飢饉・出産の死を含んだ「平均の年」の値なので、それらを別に引くぶんを基準から割り戻す。
// 割り戻す量は、その年齢で毎年見込まれる追加ハザード (起きる割合 × 重さ)。基準の 3割より下には下げない
// 出来事の危険の見込み (events.ts が登録する。mortality.ts から events.ts を読むと輪になるので、向きを逆にしている)
let eventRisk: (h: Hero) => number = () => 0;
export const setEventRisk = (f: (h: Hero) => number) => { eventRisk = f; };

// 出来事と選択肢の危険 (EventDef.risk の p) は「剣と魔法の中世」の重さで書かれている。
// 医療と治安の届く世界では同じ目に遭っても助かりやすいので、その世界の基準の死亡率との比で軽くする (重くはしない)。
// 乳幼児は q0、子どもは ch、大人は c を、中世欧州風の値 (0.22 / 0.008 / 0.010) と比べる
export function riskScale(w: World, age: number, e: number): number {
  return Math.min(1, age < 5 && e < ADULT_HEQ ? w.q0 / 0.22 : e < ADULT_HEQ ? w.ch / 0.008 : w.c / 0.010);
}

export function deflate(w: World, r: Race, age: number, sex: 'F' | 'M', aging = 1, events = 0, base = baseHazards(w, r, age, aging)): number {
  const e = heq(age, r, aging);
  const ws = warShare(w);
  const plague = plagueP(w) * (1 + ws) * plagueH(w) * plagueAgeK(age, e);
  const pf = famineP(w) * (1 + ws);
  const famine = ((pf * FAMINE_MEAN_YEARS) / (1 + pf * FAMINE_MEAN_YEARS)) * famineH() * famineAgeK(age, e);
  const civil = e >= ADULT_HEQ ? ws * warCivilH(w) + powersH(w) + jobExtra(w) : 0;
  // 出産: 結婚していて子を授かりうる割合の見込み (MARRIED_FERTILE) × 種族の授かりやすさ × 1回の危険
  const birth = sex === 'F' && e >= ADULT_HEQ && e < 45 ? MARRIED_FERTILE * r.fertility * maternalRisk(w) : 0;
  let total = 0;
  for (const k of HAZARDS) total += base[k];
  return Math.max(0.3, 1 - (plague + famine + civil + birth + events) / total);
}
// 平民が自動で就く職業の重みで平均した、職業の上乗せの見込み (倍率で増えるぶん + 足すぶん + 従軍)。
// 倍率は成人の c の分け方 (年齢によらない部分) に当てて見積もる。世界ごとに一度だけ計算する
const jobCache = new WeakMap<World, number>();
function jobExtra(w: World): number {
  const hit = jobCache.get(w);
  if (hit !== undefined) return hit;
  const sum = (11 - w.medicine) + w.danger + (10 - w.law) + 2;
  const part: Partial<Hazards> = { disease: (w.c * (11 - w.medicine)) / sum, monster: (w.c * w.danger) / sum, violence: (w.c * (10 - w.law)) / sum, accident: (w.c * 2) / sum };
  let wsum = 0, ex = 0;
  for (const j of jobsIn(w, 'commoner')) {
    let x = 0;
    for (const k in j.risk) x += (part[k as Hazard] ?? 0) * (j.risk[k as Hazard]! - 1);
    for (const k in j.add ?? {}) x += j.add![k as Hazard]!;
    if (j.war) x += warShare(w) * warServeH(w);
    wsum += j.w; ex += j.w * x;
  }
  const v = wsum ? Math.max(0, ex / wsum) : 0;
  jobCache.set(w, v);
  return v;
}

// 16〜45歳の女性のうち、その年に結婚していて子を授かりうる割合の見込み。
// life.ts の結婚は年 1割 (16歳から) なので、16〜45歳の既婚の割合はおよそ 6〜7割になる (死別を引いて 0.6 と置いた)
const MARRIED_FERTILE = 0.6;

// ---- 一人の、その年のハザード ---------------------------------------------

// 冒険者のランクごとの年あたりの上乗せ (research/02 の 10.6節: F 3% / E 4% / D 5% / C 4% / B 3% / A 2% / S 1%)。世界の danger 5 を基準に伸び縮み
const RANK_ADD: Record<string, number> = { F: 0.03, E: 0.04, D: 0.05, C: 0.04, B: 0.03, A: 0.02, S: 0.01 };

// その年齢のふつうの健康。45歳を過ぎると下がる (life.ts の drift と同じ線)
export const usualHp = (e: number) => (e < 40 ? 70 : Math.max(5, 70 - 0.7 * (e - 40)));

const mul = (z: Hazards, m: Partial<Hazards>) => { for (const k in m) z[k as Hazard] *= m[k as Hazard]!; };
const add = (z: Hazards, m: Partial<Hazards>) => { for (const k in m) z[k as Hazard] += m[k as Hazard]!; };

// 従軍している: 職業が兵の系統 (隠居していない) か、徴兵された
export const serving = (h: Hero) => h.state.war > 0 && ((!!jobOf(h.job)?.war && !h.flags.retired) || h.flags.drafted !== undefined);

export function hazards(h: Hero): Hazards {
  const w = h.world, r = raceOf(h.race), ag = agingOf(h);
  const e = heq(h.age, r, ag);
  const adult = e >= ADULT_HEQ;
  const z = baseHazards(w, r, h.age, ag);
  const s = deflate(w, r, h.age, h.sex, ag, eventRisk(h), z);
  for (const k of HAZARDS) z[k] *= s;

  // 世界の状態とその人の状況で起きる死
  if (h.state.plague > 0) z.plague += plagueH(w) * plagueAgeK(h.age, e);
  if (h.state.famine > 0) z.famine += famineH() * famineAgeK(h.age, e);
  if (h.flags.pregnant !== undefined) z.childbirth += hz(maternalRisk(w)) * (statusRank(h.status) >= statusRank('noble') || h.job === 'saint' ? 0.4 : 1);
  if (adult) {
    z.execution += statusExecution(h.status);
    if (w.magic >= 2 && h.talent === 'magic') z.magic += 0.0005;
    z.magic += powersH(w);
    // 目立つ特典を持つ人は暗殺と断罪が増える。ばれていれば (outed) 2倍
    const att = attentionOf(h);
    const k = h.flags.outed !== undefined ? 2 : 1;
    z.violence += 0.0006 * att * k;
    z.execution += 0.0003 * att * k;
    if (h.state.war > 0 && !serving(h)) z.violence += warCivilH(w);
    if (h.state.demonKing) z.monster *= 1.5; // 魔王の侵攻中は辺境の魔物が増える (research/07 の 4節は 2倍)
  }

  mul(z, statusMult(h.status));
  const j = adult && !h.flags.retired ? jobOf(h.job) : null;
  if (j) {
    mul(z, j.risk);
    if (j.add) add(z, j.add);
    if (h.job === 'adventurer' && h.rank) z.monster += RANK_ADD[h.rank] * (w.danger / 5);
  }
  if (adult && serving(h)) z.war += warServeH(w) * (h.flags.drafted !== undefined && !j?.war ? 0.7 : 1);
  if (h.flags.hero !== undefined && h.state.demonKing) z.war += 0.03; // 勇者は魔王軍との戦いに出る

  // 能力: 健康がその年齢のふつうより低いと病が、強いほど魔物・暴力・戦が、運がよいほど事故が下がる
  const st = h.stats;
  z.disease *= 1.3 ** ((usualHp(e) - st.hp) / 20);
  const pk = 0.85 ** ((st.power - 30) / 20) * Math.max(0.4, 1 - 0.01 * h.level);
  z.monster *= pk; z.violence *= pk; z.war *= pk;
  z.accident *= 0.9 ** ((st.luck - 50) / 20);
  // 前世をはっきり覚えている赤ん坊は、乳幼児期の事故が少し減る (DESIGN 3節)
  if (h.memory === 'full' && h.memoryAwake) z.infant *= 0.9;

  if (h.cheat) {
    mul(z, CHEATS[h.cheat].mult);
    if (h.cheat === 'trash_skill') {
      const t = h.flags.awakened !== undefined ? 0.6 : 1.3; // 外れスキル: 覚醒までは不利、覚醒後は強い (research/02 の 10.5節)
      z.monster *= t; z.violence *= t; z.war *= t;
    }
  }
  // スキル・体質・弱点の倍率。割り戻し (deflate) より後に掛けるので打ち消されない (trait を選んだ人生は表から外れてよい)
  if (h.traits.length) for (const k of HAZARDS) z[k] *= traitMult(h, k);
  // 女神の加護: 主人公だけ、成人前の死を減らす
  if (h.blessing && e < ADULT_HEQ) { z.infant *= BLESSING; z.disease *= BLESSING; z.monster *= BLESSING; z.accident *= BLESSING; }
  return z;
}

// 女神の加護の倍率。research/07 の 6.2節「転生者には乳幼児期の死亡率を 0.2〜0.3倍にする『女神の加護』」の中ほど。
// 同じ節の 6.4節で、加護ありの転生主人公が子ども時代に死ぬ割合の目安は 5〜10%。乳幼児だけでなく成人前の病・魔物・事故にも掛けて、そこに寄せる
export const BLESSING = 0.25;

// 目立ちやすさ: 特典の attention + trait の attention (0 より下にはしない)
export function attentionOf(h: Hero): number {
  return Math.max(0, (h.cheat ? CHEATS[h.cheat].attention : 0) + traitAttention(h));
}

export const total = (z: Hazards) => HAZARDS.reduce((s, k) => s + z[k], 0);

// 生命表の終わり: 人間換算で世界の max に達するか、実年齢が種族の上限 (老化の遅い特典ならそのぶん延びる) に達したら必ず亡くなる
export function mustDie(h: Hero): boolean {
  const ag = agingOf(h);
  const r = raceOf(h.race);
  return heq(h.age, r, ag) >= h.world.max || (ag > 0 && h.age >= r.maxAge / ag);
}

export function deathChance(h: Hero): number {
  return mustDie(h) ? 1 : 1 - Math.exp(-total(hazards(h)));
}

// ---- 生命表 ---------------------------------------------------------------

export interface LifeTable {
  q: number[];  // q[x] = x歳の人が x+1歳になる前に亡くなる確率
  l: number[];  // l[x] = 生まれた人のうち x歳まで生きる割合
  e0: number;
}

const tables = new Map<string, LifeTable>();
const byWorld = new WeakMap<World, Map<RaceId, LifeTable>>(); // 毎年・輪の人ごとに引くので、文字列の鍵を作る前に同じ World の表を探す

// 種族と世界の生命表 (特典なし・平民・倍率なし)。出来事の「なぜ」と、輪の人の年取りに使う
export function lifeTableFor(w: World, race: RaceId): LifeTable {
  let m = byWorld.get(w);
  if (!m) { m = new Map(); byWorld.set(w, m); }
  const fast = m.get(race);
  if (fast) return fast;
  const key = `${race}|${w.id}|${w.q0}|${w.q5}|${w.ch}|${w.c}|${w.a30}|${w.b}|${w.max}|${w.medicine}|${w.danger}|${w.law}`;
  const hit = tables.get(key);
  if (hit) { m.set(race, hit); return hit; }
  const r = raceOf(race);
  const q: number[] = [];
  for (let x = 0; ; x++) {
    if (heq(x, r) >= w.max || x >= r.maxAge) { q.push(1); break; }
    q.push(1 - Math.exp(-total(baseHazards(w, r, x))));
  }
  const l = [1];
  for (let x = 0; x < q.length; x++) l.push(l[x] * (1 - q[x]));
  let e0 = 0;
  for (let x = 0; x < q.length; x++) e0 += (l[x] + l[x + 1]) / 2;
  const t = { q, l, e0 };
  tables.set(key, t);
  m.set(race, t);
  return t;
}

export const qAt = (t: LifeTable, age: number) => t.q[Math.min(age, t.q.length - 1)];
export const lAt = (t: LifeTable, age: number) => t.l[Math.min(age, t.l.length - 1)];

// 種族・世界から見た「この人が x歳まで生きる」割合 (平民の表)
export const reachOf = (w: World, race: RaceId, age: number) => lAt(lifeTableFor(w, race), age);

export const isFantasy = (w: World) => hasTag(w, 'fantasy') || hasTag(w, 'eastern');
