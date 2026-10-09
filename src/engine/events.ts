// 出来事のデータ (src/data/events/*.ts の EVENTS) と死因の文 (src/data/deaths.ts の DEATHS) を読み込み、
// 条件の判定・重み付きの抽選・置き換え ({name} など)・効果の適用・選択肢 (Decision) 化・その年の追加の危険を受け持つ。
// データが1件も無くても動く (他の担当がデータを書き終える前でも、テストと画面が壊れないように)
import type { DeathDef, DeathRecord, Decision, EventDef, Fight, Foe, Hazard, Hero, JobId, LogEntry, Option, Role, Stage, Tie, TraitDef, TraitKind, YearKind } from './types';
import { makeRng, pickWeighted } from './rng';
import { addTie, byRole, bump, callName, log, shared } from './bonds';
import { beastName, personName, plural, worldNames } from './names';
import { restEnd, ageOfHeq, attentionOf, BLESSING, heqOf, riskScale, setEventRisk, stageOf } from './mortality';
import { traitMult, traitOf } from './traits';
import { jobOf } from './jobs';
import { raceOf } from './races';
import { CHEATS } from './cheats';
import { standingOf } from './status';
import { tacticAdv, tacticFight } from './tactic';
import { hazardName } from './why';
import { canBear, eventBlocked, jobHeld } from './anchor';
import { fightHazard, fightOf, foeFor, FLEE, lastFight, settleFight } from './fight';
export { fightOf, foeFor, isClash } from './fight';
import { isEn, L, T, an, cap, pron, type Pronoun } from '../i18n';

// ---- データの読み込み -------------------------------------------------------

const eventMods = import.meta.glob<{ EVENTS?: EventDef[] }>('../data/events/*.ts', { eager: true });
const deathMods = import.meta.glob<{ DEATHS?: DeathDef[] }>('../data/deaths.ts', { eager: true });

let EVENTS: EventDef[] = Object.values(eventMods).flatMap((m) => m.EVENTS ?? []);
let DEATHS: DeathDef[] = Object.values(deathMods).flatMap((m) => m.DEATHS ?? []);
// 一生変わらない条件で絞った候補。何度も試す集計では同じ設定の人が続くので、条件の組を鍵にして使い回す
let staticCache = new Map<string, Map<Stage, EventDef[]>>();
let keyCache = new WeakMap<Hero, string>();

export const allEvents = () => EVENTS;
export const allDeaths = () => DEATHS;

// テスト用: データを差し替える (空にする・手書きの数件にする)
export function useData(d: { events?: EventDef[]; deaths?: DeathDef[] }): void {
  if (d.events) EVENTS = d.events;
  if (d.deaths) DEATHS = d.deaths;
  rolesCache.clear();
  giftCache.clear();
  staticCache = new Map();
  keyCache = new WeakMap();
  cumCache = new Map();
  expCache = new Map();
}

// ---- 条件 -----------------------------------------------------------------

const ROLE_KEYS: Role[] = ['mother', 'father', 'friend', 'companion', 'mentor', 'rival', 'nemesis', 'lover', 'spouse', 'child', 'familiar', 'master', 'disciple'];
const rolesCache = new Map<string, Role[]>();
// 文に出てくる輪の人の役 (その役の人がいるときだけ起きる)
function rolesIn(def: { id: string; ja: string; en: string }): Role[] {
  const hit = rolesCache.get(def.id);
  if (hit) return hit;
  const text = def.ja + def.en;
  const roles = ROLE_KEYS.filter((r) => text.includes(`{${r}}`));
  rolesCache.set(def.id, roles);
  return roles;
}

// 文に出てくる特典・trait の置き換え
const giftCache = new Map<string, { cheat: boolean; kinds: (TraitKind | undefined)[] }>();
function gifts(d: EventDef): { cheat: boolean; kinds: (TraitKind | undefined)[] } {
  let g = giftCache.get(d.id);
  if (!g) {
    const t = d.ja + d.en + (d.choice ? d.choice.options.map((o) => o.ja + o.en + (o.log ? o.log.ja + o.log.en : '')).join('') : '');
    const kinds: (TraitKind | undefined)[] = [];
    for (const k of ['skill', 'ability', 'blessing', 'constitution'] as const) if (t.includes(`{${k}}`)) kinds.push(k);
    if (t.includes('{trait}')) kinds.push(undefined);
    g = { cheat: t.includes('{cheat}'), kinds };
    giftCache.set(d.id, g);
  }
  return g;
}

// 一生変わらない条件 (世界・種族・性別・転生の型・特典・生まれの身分)。主人公ごとに一度だけ絞る
function staticOk(h: Hero, d: EventDef): boolean {
  const w = h.world;
  return (!d.tags || d.tags.some((t) => w.tags.includes(t)))
    && (!d.not || !d.not.some((t) => w.tags.includes(t)))
    && (d.magic === undefined || w.magic >= d.magic)
    && (d.powers === undefined || w.powers >= d.powers)
    && (!d.tech || (w.tech >= d.tech[0] && w.tech <= d.tech[1]))
    && (!d.status || d.status.includes(h.status))
    && (!d.races || d.races.includes(h.race))
    && (d.cheat === undefined || d.cheat === (h.cheat !== null))
    && (!d.cheats || (h.cheat !== null && d.cheats.includes(h.cheat)))
    && (!d.arrival || d.arrival.includes(h.arrival))
    && (!d.sex || d.sex === h.sex)
    // 英雄の筋の出来事 (heroic.ts 'he.' と arc. のしるしで連なるもの) は特典を持つ人だけ。普通の人生の手触りを残す。
    // 実測 (2026-10-09, tmpcheck の1000人): trait を名指しする出来事 (needs) を特典なしにも 0.25倍・0.1倍で残すと、
    // 特典なしの英雄の記録は 9.6・8.5件 (筋の前は 5.3件)。候補の少ない年に選ばれてしまうので、倍率ではなく条件で外す
    && (h.cheat !== null || !arcEvent(d));
}

// 段階ごとに分けて持つ (毎年すべての出来事を見なくて済むように)
function staticKey(h: Hero): string {
  let k = keyCache.get(h);
  if (!k) {
    const w = h.world;
    k = `${w.id}|${w.tags.join()}|${w.magic}|${w.powers}|${w.tech}|${h.status}|${h.race}|${h.cheat}|${h.arrival}|${h.sex}|${h.traits.join()}`;
    keyCache.set(h, k);
  }
  return k;
}

function staticEvents(h: Hero, st: Stage): EventDef[] {
  const key = staticKey(h);
  let m = staticCache.get(key);
  if (!m) {
    m = new Map();
    for (const d of EVENTS) if (staticOk(h, d)) for (const s of d.stage) { const a = m.get(s); if (a) a.push(d); else m.set(s, [d]); }
    if (staticCache.size > 500) staticCache.clear();
    staticCache.set(key, m);
  }
  return m.get(st) ?? [];
}

// その年の判定に使う、主人公の今の様子 (使った出来事・そばにいる人の役)。候補を見るたびに作り直さないよう、まとめて一度だけ作る
interface Now { used: Set<string>; roles: Set<Role>; loggedThisYear: boolean }
export function nowOf(h: Hero): Now {
  const roles = new Set<Role>();
  for (const t of h.people) if (t.alive && t.until === undefined) roles.add(t.role);
  return { used: new Set(h.used), roles, loggedThisYear: h.log.length > 0 && h.log[h.log.length - 1].age === h.age };
}
export const REPEAT_GAP = 5;
// 繰り返しの間隔は「同じ出来事の書き分け」をまとめて数える (he.work.fantasy.1 と .2 は同じ依頼の出来事)。末尾の .番号 を外したものが組
// 英雄の筋の繰り返しの出来事 (heroic.ts の依頼・名声・仲間との戦い・trait の見せ場) は、全部で1つの組として HERO_GAP 年あける。
// 実測 (2026-10-09, tmpcheck の1000人): 組ごとに5年あけるだけだと、特典ありの英雄の記録が 1人 38.5件 (ねらいは約20件)。
// 書き分けの組が8つほど並んで同時に回るため。1つの組にして3年あけると 33.6件、5年で 31.1件。
// さらに heroic.ts の ch-choice の重みを 1.5 → 0.1、work・renown を 2 → 0.5 にし、間隔を15年にして 22.1件 (ねらい 17〜23件)。
// 7年・10年・12年では 27.7・24.4・23.6件。段階の筋の記録 (気づく〜伝説) と昇格はそのまま
export const familyOf = (id: string) => (id.startsWith('he.') ? HERO_FAMILY : id.replace(/\.\d+$/, ''));
const HERO_FAMILY = 'he.*';
export const HERO_GAP = 15;
const gapOf = (family: string) => (family === HERO_FAMILY ? HERO_GAP : REPEAT_GAP);

// その年に起きうるか (static の後に見る)。
// 文に出てくる輪の人と、tie で触れる人 (new でなければ) が、生きてそばにいるときだけ起きる (亡くなった母が病に伏せないように)
export function eventOk(h: Hero, d: EventDef, stage = stageOf(h), now = nowOf(h)): boolean {
  if (!d.stage.includes(stage)) return false;
  if (d.age && (h.age < d.age[0] || h.age > d.age[1])) return false;
  if (!d.repeat && now.used.has(d.id)) return false;
  // 何度も起きる出来事でも、同じものは5年あける (夏祭りの灯籠が毎年出ないように)
  if (d.repeat) { const k = familyOf(d.id); if (h.recent?.[k] !== undefined && h.age - h.recent[k] < gapOf(k)) return false; }
  if (d.alone && now.loggedThisYear) return false;
  if (d.jobs && !d.jobs.includes(h.job ?? 'none')) return false;
  if (d.memory !== undefined && d.memory !== h.memoryAwake) return false;
  if (d.pastCause && (!h.past || h.transfer || !d.pastCause.includes(h.past.cause))) return false;
  if (d.standing && !d.standing.includes(standingOf(h))) return false;
  if (d.flag && h.flags[d.flag] === undefined) return false;
  if (d.noFlag && h.flags[d.noFlag] !== undefined) return false;
  if (d.birth && !canBear(h)) return false;  // 子が生まれる出来事は、産む側が子を持てる年齢のときだけ
  // 連れ合いがいるあいだは、新しい恋人・婚約者はできない (浮気の出来事 'affair' を id に持つものは別)
  if (d.tie?.new && (d.tie.role === 'lover' || d.tie.role === 'fiance') && !d.id.includes('affair') && (now.roles.has('spouse') || now.roles.has('fiance'))) return false; // 婚約者がいる間も
  if (eventBlocked(h, d)) return false;      // ほかの人の一生: 結婚と子は錨のとおりだけ
  if (d.needs && !d.needs.every((k) => h.traits.some((id) => traitOf(id)?.kind === k))) return false;
  // 文に {cheat} {skill} などがあるのに、埋める特典・trait を持っていなければ起きない (「{cheat}」のまま出ないように)
  const ph = gifts(d);
  if (ph.cheat && !h.cheat) return false;
  for (const k of ph.kinds) if (!traitFor(h, k, d.id)) return false;
  for (const r of rolesIn(d)) if (!(d.tie?.new && d.tie.role === r) && !now.roles.has(r)) return false;
  if (d.tie && !d.tie.new && !now.roles.has(d.tie.role)) return false;
  return true;
}

export const candidates = (h: Hero): EventDef[] => {
  const st = stageOf(h);
  const now = nowOf(h);
  return staticEvents(h, st).filter((d) => eventOk(h, d, st, now));
};

// ---- 置き換え -------------------------------------------------------------

// 輪の人を新しく作る (出来事の tie.new)。年は役で変える
const AGE_GAP: Partial<Record<Role, [number, number]>> = {
  mentor: [15, 30], master: [10, 25], disciple: [-20, -8], nemesis: [-5, 8], rival: [-2, 2], lover: [-4, 4], spouse: [-4, 6],
};
export function newTie(h: Hero, role: Role): Tie {
  const [lo, hi] = AGE_GAP[role] ?? [-3, 3];
  const gap = role === 'child' || role === 'sibling' ? 0 : lo + Math.floor(h.rng() * (hi - lo + 1));
  const opposite = role === 'lover' || role === 'spouse' || role === 'fiance';
  const sex = opposite ? (h.rng() < 0.9 ? (h.sex === 'F' ? 'M' : 'F') : h.sex) : (h.rng() < 0.5 ? 'F' : 'M');
  const race = role === 'familiar' ? 'beast_wolf' : role === 'child' || role === 'sibling' ? h.race : pickWeighted(h.rng, h.world.races, ([, w]) => w)[0];
  // 年は人間換算で主人公に合わせる (200歳の修行者の連れ合いが200歳の人間、エルフの幼なじみが10歳、にならないように)
  const age = role === 'child' || role === 'sibling' ? 0 : Math.max(0, ageOfHeq(heqOf(h) + gap, raceOf(race)));
  // 主人公や輪の人と同じ名にしない (8回まで引き直す。「イオイスがイオイスに金を借りる」を避ける)
  const taken = new Set([h.given, ...h.people.map((t) => t.name)]);
  let name = personName(h.rng, h.world, sex, role === 'familiar' ? 'commoner' : h.status, null).given;
  for (let i = 0; i < 8 && taken.has(name); i++) name = personName(h.rng, h.world, sex, role === 'familiar' ? 'commoner' : h.status, null).given;
  return addTie(h, { name, role, race, sex, age });
}

const jobName = (h: Hero) => { const j = jobOf(h.job); return j ? L(j.ja, j.en) : L('無職', 'no trade'); };

// その人の trait のうち、その種類 (省略 = どれでも) の1つを、出来事ごとに決まった形で選ぶ (乱数は引かない。同じ出来事の中では同じ名前)
export function traitFor(h: Hero, kind: TraitKind | undefined, key: string): TraitDef | undefined {
  const pool = h.traits.map((id) => traitOf(id)).filter((t): t is TraitDef => !!t && t.kind !== 'weakness' && (!kind || t.kind === kind));
  if (!pool.length) return undefined;
  let x = h.seed >>> 0;
  for (let i = 0; i < key.length; i++) x = (Math.imul(x ^ key.charCodeAt(i), 2654435761) >>> 0);
  return pool[x % pool.length];
}

// {name} {friend} … {town} {god} {beast} {job} {race} {guild} {lord} {age}
// 英語だけ: {he} {him} {his} {himself} {He} {His} 主人公の代名詞 / {his:mentor} など輪の人の代名詞 / {beasts} 魔物の複数形
// {cheat} 持っている特典 / {skill} {ability} {blessing} {constitution} {trait} 持っている trait (出来事の id ごとに決まった1つ)。ties は今回の出来事で決まった人 (役ごと)
export function fill(text: string, h: Hero, ties: Partial<Record<Role, Tie>> = {}, evKey = ''): string {
  const n = worldNames(h);
  const out = text.replace(/\{(\w+)(?::(\w+))?\}/g, (all, key: string, of?: string) => {
    // 輪の人の代名詞 (英語だけ): {he:mentor} {his:friend} {He:rival}。その役の人の性別で。いなければ they
    if (of) {
      const t = ties[of as Role] ?? byRole(h, of as Role);
      const p = pron(t?.sex, key.toLowerCase() as Pronoun);
      return key[0] === key[0].toUpperCase() ? cap(p) : p;
    }
    switch (key) {
      case 'name': return h.given;
      case 'town': return n.town;
      case 'god': return n.god;
      case 'guild': return n.guild;
      case 'lord': return n.lord;
      case 'beast': return beastName(makeRng((h.seed * 31 + h.age * 7919) >>> 0), h.world); // その年の魔物 (乱数の並びを変えない)
      case 'job': return jobName(h);
      case 'race': return T(raceOf(h.race).name);
      case 'age': return String(h.age);
      // 英語の代名詞 (主人公の性別で)。{He} {His} は文の頭に。{beasts} は魔物の複数形 (a horde of {beasts})
      case 'he': case 'him': case 'his': case 'himself': return pron(h.sex, key);
      case 'He': case 'His': return cap(pron(h.sex, key.toLowerCase() as Pronoun));
      case 'beasts': return plural(beastName(makeRng((h.seed * 31 + h.age * 7919) >>> 0), h.world));
      case 'cheat': return h.cheat ? T(CHEATS[h.cheat].name) : all;
      case 'skill': case 'ability': case 'blessing': case 'constitution': case 'trait': {
        const t = traitFor(h, key === 'trait' ? undefined : (key as TraitKind), evKey);
        return t ? T(t.name) : all;
      }
      default: {
        const t = ties[key as Role] ?? byRole(h, key as Role);
        // 親は名ではなく続柄で呼ぶ ({mother} → 母 / Mother)
        return t ? (t.role === 'mother' || t.role === 'father' ? callName(t) : t.name) : all;
      }
    }
  });
  return isEn ? an(out) : out; // 差し込んだ語で a / an が変わる
}

// ---- 効果 -----------------------------------------------------------------

export type Die = (h: Hero, hz: Hazard) => void;

// 職業の変化を伴うしるし。文が「勇者として名を呼ばれた」のに職業が農民のまま、にならないように (DESIGN 5節)
const FLAG_JOBS: Record<string, JobId> = { hero: 'hero', saint: 'saint', knighted: 'knight', lord: 'lord' };

// 結婚したら、ほかの恋人・婚約者との仲は終わる (連れ合いと恋人が同時にいない)。連れ合いになった人は除く
export function endLovers(h: Hero, spouse?: Tie): void {
  for (const t of h.people) {
    if (t === spouse || !t.alive || t.until !== undefined || (t.role !== 'lover' && t.role !== 'fiance')) continue;
    t.until = h.age;
    log(h, L(`結婚を機に、${t.name}との仲は終わった。`, `With the marriage, things ended with ${t.name}.`), 'loss', false, [t.id]).leave = [t.id];
  }
}

// しるしを立て、職業を変える (出来事と選択肢の両方から)
function mark(h: Hero, set: string | undefined, job: JobId | undefined): void {
  if (set) h.flags[set] = h.age;
  if (set === 'married') endLovers(h, byRole(h, 'spouse'));
  if (set === 'guild' && !h.rank) h.rank = 'F'; // どの経路で登録しても、ランクは F から (自動の昇格が止まらないように)
  let j = job ?? (set ? FLAG_JOBS[set] : undefined);
  if (j === 'saint' && h.sex === 'M') j = 'priest'; // 聖女の職は女性の呼び名なので、男性は神官として扱う (しるしの saint は残る)
  if (j && h.job !== j && !jobHeld(h)) { h.job = j; h.jobYears = 0; delete h.flags.retired; } // 錨の人は輪にいる間は職業を変えない
}

// その年だけの追加の危険: その場で引く。重さは世界の死亡率に合わせて軽くし (mortality.ts の riskScale)、
// 転生特典の倍率もかける (超再生なら同じ決闘でも助かりやすい)
// (trait の倍率と女神の加護も同じように効かせる)
const scaled = (h: Hero, p: number, hz?: Hazard) => {
  let k = riskScale(h.world, h.age, heqOf(h));
  if (hz) {
    if (h.cheat) k *= CHEATS[h.cheat].mult[hz] ?? 1;
    k *= traitMult(h, hz) * tacticFight(h, hz);
    if (h.blessing && heqOf(h) < 16 && (hz === 'infant' || hz === 'disease' || hz === 'monster' || hz === 'accident')) k *= BLESSING;
  }
  return p * k;
};
export const scaledRisk = scaled;
// 主人公の trait が変わったとき (鍛えて身につけた) に、条件の鍵を作り直す
export const forgetHeroKey = (h: Hero): void => { keyCache.delete(h); };

function roll(h: Hero, risk: { hazard: Hazard; p: number } | undefined, die: Die): void {
  if (risk && h.alive && h.rng() < scaled(h, risk.p, risk.hazard)) die(h, risk.hazard);
}

// 1年に出来事から受ける危険の見込み。生命表はこの死も含んでいるので、基準のハザードから割り戻す (mortality.ts の deflate)。
// 1年に引く件数の平均 0.85 × 段階の候補の重み付き平均の p (選択肢は平均)。しるしや職業の条件は見ない (一生変わらない条件だけ)
const AVG_EVENTS = 0.45 + 2 * 0.2;
let expCache = new Map<string, number>();
function expectedRisk(h: Hero): number {
  if (!EVENTS.length) return 0;
  const st = stageOf(h);
  const key = `${staticKey(h)}|${st}`;
  let v = expCache.get(key);
  if (v === undefined) {
    let w = 0, wp = 0;
    for (const d of staticEvents(h, st)) {
      const opts = d.choice?.options ?? [];
      const op = opts.length ? opts.reduce((s, o) => s + (o.risk?.p ?? 0), 0) / opts.length : 0;
      w += d.w; wp += d.w * ((d.risk?.p ?? 0) + op);
    }
    v = w ? (AVG_EVENTS * wp) / w : 0;
    if (expCache.size > 3000) expCache.clear();
    expCache.set(key, v);
  }
  return v * riskScale(h.world, h.age, heqOf(h));
}
setEventRisk(expectedRisk);

// 選択肢を自動で選ぶ: 慎重は危険の小さい方、無謀は危険と得の大きい方、ふつうは乱数で
function autoPick(h: Hero, def: EventDef): number {
  const opts = def.choice!.options;
  const gain = (o: (typeof opts)[number]) => Object.values(o.eff ?? {}).reduce((s, v) => s + (v ?? 0), 0);
  const best = (score: (o: (typeof opts)[number]) => number) => opts.reduce((bi, o, i) => (score(o) > score(opts[bi]) ? i : bi), 0);
  if (h.policy === 'careful') return best((o) => -(o.risk?.p ?? 0));
  if (h.policy === 'bold') return best((o) => (o.risk?.p ?? 0) * 100 + gain(o));
  return Math.floor(h.rng() * opts.length);
}

const pctOf = (p: number) => (p >= 0.01 ? Math.round(p * 100).toString() : (p * 100).toFixed(2));

export function eventDecision(h: Hero, def: EventDef, die: Die): Decision {
  const c = def.choice!;
  const options: Option[] = c.options.map((o) => ({
    label: fill(isEn ? o.en : o.ja, h, {}, def.id),
    ...(o.risk ? { hint: L(`命の危険 ${pctOf(scaled(h, o.risk.p, o.risk.hazard))}%`, `${pctOf(scaled(h, o.risk.p, o.risk.hazard))}% risk of death`) } : {}),
    apply: (x: Hero) => {
      if (o.eff) bump(x, o.eff);
      mark(x, o.set, o.job);
      if (o.log) log(x, fill(T(o.log), x, {}, def.id), def.kind, false);
      roll(x, o.risk, die);
      // 戦いの出来事なら、選んだ道で結果が変わる (逃げた・傷ついた・倒れた)
      const f = lastFight(x);
      if (f?.fight && f.fight.result !== 'lose') {
        if (FLEE.test(o.ja + o.en)) f.fight.result = 'flee';
        settleFight(x, f, o.risk?.hazard, (o.eff?.hp ?? 0) < 0);
      }
    },
  }));
  return { title: fill(isEn ? c.en : c.ja, h, {}, def.id), text: fill(isEn ? def.en : def.ja, h, {}, def.id), options, auto: (x) => autoPick(x, def), ref: `ev:${def.id}` };
}

// 出来事を1件起こす。選択肢があれば Decision を返す (呼ぶ側が pending に積むか、自動で選ぶ)
export function applyEvent(h: Hero, def: EventDef, die: Die): Decision | null {
  const ties: Partial<Record<Role, Tie>> = {};
  if (def.tie) {
    const t = def.tie.new ? newTie(h, def.tie.role) : byRole(h, def.tie.role);
    if (t) ties[def.tie.role] = t;
  }
  const text = fill(isEn ? def.en : def.ja, h, ties, def.id);
  if (!def.repeat) h.used.push(def.id);
  else h.recent = { ...h.recent, [familyOf(def.id)]: h.age };
  if (def.eff) bump(h, def.eff);
  mark(h, def.set, def.job);
  const who = Object.values(ties);
  const e = who.length ? shared(h, who, text, def.kind, def.tie?.d ?? 0, !!def.big) : log(h, text, def.kind, !!def.big);
  if (def.why) e.why = fill(T(def.why), h, ties, def.id);
  if (def.tie?.new && ties[def.tie.role]) e.join = [ties[def.tie.role]!.id];
  if (def.tie?.new && def.tie.role === 'spouse') endLovers(h, ties.spouse);
  // tie.dies: この出来事で、その人が亡くなる (伴侶を看取る・親の葬儀)。悲しみの大きさは eff に書く
  const gone = def.tie?.dies ? ties[def.tie.role] : undefined;
  if (gone) {
    gone.alive = false;
    gone.diedAt = h.age;
    e.leave = [gone.id];
    if (gone.role === 'spouse') { delete h.flags.married; h.flags.widowed ??= h.age; }
  }
  const fh = fightHazard(def, text);
  if (fh !== false) e.fight = fightOf(h, def.foe ?? foeFor(h, fh, text));
  roll(h, def.risk, die);
  settleFight(h, e, def.risk?.hazard, (def.eff?.hp ?? 0) < 0);
  return def.choice && h.alive ? eventDecision(h, def, die) : null;
}

// 目立つ特典を持つ人は、暗殺・断罪の絡む出来事を引きやすい (research/02 の 10.3節)
// ---- 英雄の筋 (arc.ts) と共有するもの ---------------------------------------
// 筋に乗る人: 特典を持つ人。特典の無い人生は今までどおり (普通の人生の手触りを残す)
export const onArc = (h: Hero) => h.cheat !== null;
// 活躍の年か: 力を使い始めていて、隠居しておらず、人間換算 12〜55歳
export const heroActive = (h: Hero) => onArc(h) && h.flags['arc.first'] !== undefined && h.flags.retired === undefined && heqOf(h) >= 12 && heqOf(h) < 55;
// 筋の出来事か (英雄の筋のデータ 'he.' か、筋のしるしで連なる出来事)
const arcEvent = (d: EventDef) => d.id.startsWith('he.') || !!d.flag?.startsWith('arc.') || !!d.noFlag?.startsWith('arc.') || d.set?.startsWith('arc.');
// 特典を持つ人の、筋の出来事の重み。
// 実測 (2026-10-09, tmpcheck/measure.test.ts の1000人, heroic.ts 入り): 英雄の種類を 1.5倍・筋を 1.5倍・活躍の年にもう1件 (15%) だと
// 特典ありの英雄の記録が 1人 28.0件 (ねらいは約20件)。種類の倍率と追加の1件をやめ、筋の出来事だけ 1.5倍にして 25.1件。
// 残りの多くは heroic.ts の繰り返しの依頼・名声の出来事と、仲間の昇進の記録 (people.ts)
const ARC_EVENT_W = 1.5;

// trait の events は、その種類 (YearKind) の出来事の起きやすさに掛ける
// 定番ネタの重みの倍率。実測 (2026-10-09, おまかせ300人): 1 倍だと定番ネタが1人 7.9件 (ねらいは2〜3件) で、ほかの出来事が2割減った。0.2 倍で 2.7件
export const TROPE_W = 0.2;
function weight(h: Hero, d: EventDef): number {
  const att = attentionOf(h);
  const targeted = d.risk && (d.risk.hazard === 'violence' || d.risk.hazard === 'execution');
  let w = d.w * (targeted && att > 0 ? 1 + 0.3 * att : 1);
  for (const id of h.traits) { const m = traitOf(id)?.events?.[d.kind]; if (m !== undefined) w *= m; }
  if (arcEvent(d)) w *= ARC_EVENT_W; // 筋の出来事は特典を持つ人にしか起きない (staticOk)
  if (d.kind === 'adventure' || d.kind === 'battle') w *= tacticAdv(h); // 作戦で冒険と戦いの出来事を寄せる
  if (d.id.startsWith('tp')) w *= TROPE_W; // 定番ネタ (data/events/tropes*.ts) は味付け。普通の暮らしの出来事を押しのけないように
  return w;
}

// 段階の候補の重みの累積 (一生変わらない条件の組ごとに一度だけ作る)
let cumCache = new Map<string, number[]>();
function cumulative(h: Hero, st: Stage, list: EventDef[]): number[] {
  const key = `${staticKey(h)}|${st}|${h.policy}`; // 作戦で重みが変わる
  let c = cumCache.get(key);
  if (!c) {
    let sum = 0;
    c = list.map((d) => (sum += weight(h, d)));
    if (cumCache.size > 3000) cumCache.clear();
    cumCache.set(key, c);
  }
  return c;
}

// 条件に合う出来事を重みで1つ。段階の候補全体から重みで引いて、合わなければ引き直す (棄却法)。
// 合うものの中から重みで引くのと同じ分布になり、毎年すべての候補の条件を見なくて済む。40回外れたら全部見て決める
function sampleOne(h: Hero, st: Stage, taken: Set<EventDef>): EventDef | undefined {
  const list = staticEvents(h, st);
  if (!list.length) return undefined;
  const cum = cumulative(h, st, list);
  const totalW = cum[cum.length - 1];
  if (!(totalW > 0)) return undefined;
  const now = nowOf(h);
  const ok = (d: EventDef) => !taken.has(d) && eventOk(h, d, st, now);
  for (let i = 0; i < 40; i++) {
    const r = h.rng() * totalW;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > r) hi = mid; else lo = mid + 1; }
    if (ok(list[lo])) return list[lo];
  }
  const pool = list.filter(ok);
  return pool.length ? pickWeighted(h.rng, pool, (x) => weight(h, x)) : undefined;
}

// その年の出来事を 0〜2件引く (0件 35%・1件 45%・2件 20%)。2件目は1件目を起こした後の様子で選ぶ
export function drawEvents(h: Hero, die: Die): Decision[] {
  const r = h.rng();
  const k = r < 0.35 ? 0 : r < 0.8 ? 1 : 2;
  const out: Decision[] = [];
  const taken = new Set<EventDef>();
  for (let i = 0; i < k && h.alive; i++) {
    const d = sampleOne(h, stageOf(h), taken);
    if (!d) break;
    taken.add(d);
    const dec = applyEvent(h, d, die);
    if (dec) out.push(dec);
    if (d.alone) break; // 穴埋めの一文の後に、別の出来事を重ねない
  }
  return out;
}

// 保存から戻すときに、待っている選択を作り直す
export function eventByRef(ref: string): EventDef | undefined {
  return ref.startsWith('ev:') ? EVENTS.find((e) => e.id === ref.slice(3)) : undefined;
}

// ---- 死因の文 -------------------------------------------------------------

function deathOk(h: Hero, d: DeathDef, hz: Hazard): boolean {
  const w = h.world;
  return d.hazard === hz
    && !!d.rest === (hz === 'age' && restEnd(h)) // 老いない人の千年の終わりは、その専用の文だけ
    && (!d.stage || d.stage.includes(stageOf(h)))
    && (!d.tags || d.tags.some((t) => w.tags.includes(t)))
    && (!d.not || !d.not.some((t) => w.tags.includes(t)))
    && (d.magic === undefined || w.magic >= d.magic)
    && (!d.tech || (w.tech >= d.tech[0] && w.tech <= d.tech[1]))
    && (!d.status || d.status.includes(h.status))
    && (!d.jobs || d.jobs.includes(h.job ?? 'none'))
    && (!d.races || d.races.includes(h.race))
    && (!d.sex || d.sex === h.sex);
}

// 死因の分類から、条件に合う文を重みで選ぶ。合う文が無ければ分類名だけの文にする
export function deathRecord(h: Hero, hz: Hazard): DeathRecord {
  const pool = DEATHS.filter((d) => deathOk(h, d, hz));
  if (!pool.length) {
    const label = hazardName(hz);
    return { hazard: hz, id: hz, label, text: L(`${h.age}歳で亡くなった。死因: ${label}。`, `Died at ${h.age}. Cause of death: ${label.toLowerCase()}.`) };
  }
  const d = pickWeighted(h.rng, pool, (x) => x.w);
  return { hazard: hz, id: d.id, label: T(d.label), text: fill(isEn ? d.en : d.ja, h) };
}
