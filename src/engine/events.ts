// 出来事のデータ (src/data/events/*.ts の EVENTS) と死因の文 (src/data/deaths.ts の DEATHS) を読み込み、
// 条件の判定・重み付きの抽選・置き換え ({name} など)・効果の適用・選択肢 (Decision) 化・その年の追加の危険を受け持つ。
// データが1件も無くても動く (他の担当がデータを書き終える前でも、テストと画面が壊れないように)
import type { DeathDef, DeathRecord, Decision, EventDef, Foe, Hazard, Hero, JobId, LogEntry, Option, Role, Stage, Tie } from './types';
import { makeRng, pickWeighted } from './rng';
import { addTie, byRole, bump, callName, log, shared } from './bonds';
import { beastName, personName, worldNames } from './names';
import { attentionOf, BLESSING, heqOf, riskScale, setEventRisk, stageOf } from './mortality';
import { traitMult, traitOf } from './traits';
import { jobOf } from './jobs';
import { raceOf } from './races';
import { CHEATS } from './cheats';
import { hazardName } from './why';
import { isEn, L, T } from '../i18n';

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
    && (!d.sex || d.sex === h.sex);
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

// その年に起きうるか (static の後に見る)。
// 文に出てくる輪の人と、tie で触れる人 (new でなければ) が、生きてそばにいるときだけ起きる (亡くなった母が病に伏せないように)
export function eventOk(h: Hero, d: EventDef, stage = stageOf(h), now = nowOf(h)): boolean {
  if (!d.stage.includes(stage)) return false;
  if (d.age && (h.age < d.age[0] || h.age > d.age[1])) return false;
  if (!d.repeat && now.used.has(d.id)) return false;
  // 何度も起きる出来事でも、同じものは5年あける (夏祭りの灯籠が毎年出ないように)
  if (d.repeat && h.recent?.[d.id] !== undefined && h.age - h.recent[d.id] < REPEAT_GAP) return false;
  if (d.alone && now.loggedThisYear) return false;
  if (d.jobs && !d.jobs.includes(h.job ?? 'none')) return false;
  if (d.memory !== undefined && d.memory !== h.memoryAwake) return false;
  if (d.flag && h.flags[d.flag] === undefined) return false;
  if (d.noFlag && h.flags[d.noFlag] !== undefined) return false;
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
  const age = role === 'child' || role === 'sibling' ? 0 : Math.max(0, h.age + lo + Math.floor(h.rng() * (hi - lo + 1)));
  const opposite = role === 'lover' || role === 'spouse' || role === 'fiance';
  const sex = opposite ? (h.rng() < 0.9 ? (h.sex === 'F' ? 'M' : 'F') : h.sex) : (h.rng() < 0.5 ? 'F' : 'M');
  const race = role === 'familiar' ? 'beast_wolf' : role === 'child' || role === 'sibling' ? h.race : pickWeighted(h.rng, h.world.races, ([, w]) => w)[0];
  // 主人公や輪の人と同じ名にしない (8回まで引き直す。「イオイスがイオイスに金を借りる」を避ける)
  const taken = new Set([h.given, ...h.people.map((t) => t.name)]);
  let name = personName(h.rng, h.world, sex, role === 'familiar' ? 'commoner' : h.status, null).given;
  for (let i = 0; i < 8 && taken.has(name); i++) name = personName(h.rng, h.world, sex, role === 'familiar' ? 'commoner' : h.status, null).given;
  return addTie(h, { name, role, race, sex, age });
}

const jobName = (h: Hero) => { const j = jobOf(h.job); return j ? L(j.ja, j.en) : L('無職', 'no trade'); };

// {name} {friend} … {town} {god} {beast} {job} {race} {guild} {lord} {age}。ties は今回の出来事で決まった人 (役ごと)
export function fill(text: string, h: Hero, ties: Partial<Record<Role, Tie>> = {}): string {
  const n = worldNames(h);
  return text.replace(/\{(\w+)\}/g, (all, key: string) => {
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
      default: {
        const t = ties[key as Role] ?? byRole(h, key as Role);
        // 親は名ではなく続柄で呼ぶ ({mother} → 母 / Mother)
        return t ? (t.role === 'mother' || t.role === 'father' ? callName(t) : t.name) : all;
      }
    }
  });
}

// ---- 効果 -----------------------------------------------------------------

export type Die = (h: Hero, hz: Hazard) => void;

// 職業の変化を伴うしるし。文が「勇者として名を呼ばれた」のに職業が農民のまま、にならないように (DESIGN 5節)
const FLAG_JOBS: Record<string, JobId> = { hero: 'hero', saint: 'saint', knighted: 'knight', lord: 'lord' };

// しるしを立て、職業を変える (出来事と選択肢の両方から)
function mark(h: Hero, set: string | undefined, job: JobId | undefined): void {
  if (set) h.flags[set] = h.age;
  const j = job ?? (set ? FLAG_JOBS[set] : undefined);
  if (j && h.job !== j) { h.job = j; h.jobYears = 0; delete h.flags.retired; }
}

// その年だけの追加の危険: その場で引く。重さは世界の死亡率に合わせて軽くし (mortality.ts の riskScale)、
// 転生特典の倍率もかける (超再生なら同じ決闘でも助かりやすい)
// (trait の倍率と女神の加護も同じように効かせる)
const scaled = (h: Hero, p: number, hz?: Hazard) => {
  let k = riskScale(h.world, h.age, heqOf(h));
  if (hz) {
    if (h.cheat) k *= CHEATS[h.cheat].mult[hz] ?? 1;
    k *= traitMult(h, hz);
    if (h.blessing && heqOf(h) < 16 && (hz === 'infant' || hz === 'disease' || hz === 'monster' || hz === 'accident')) k *= BLESSING;
  }
  return p * k;
};
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
    label: isEn ? o.en : o.ja,
    ...(o.risk ? { hint: L(`命の危険 ${pctOf(scaled(h, o.risk.p, o.risk.hazard))}%`, `${pctOf(scaled(h, o.risk.p, o.risk.hazard))}% risk of death`) } : {}),
    apply: (x: Hero) => {
      if (o.eff) bump(x, o.eff);
      mark(x, o.set, o.job);
      if (o.log) log(x, fill(T(o.log), x), def.kind, false);
      roll(x, o.risk, die);
      // 戦いの出来事なら、選んだ道で結果が変わる (逃げた・傷ついた・倒れた)
      const f = lastFight(x);
      if (f?.fight && f.fight.result !== 'lose') {
        if (FLEE.test(o.ja + o.en)) f.fight.result = 'flee';
        settleFight(x, f, o.risk?.hazard, (o.eff?.hp ?? 0) < 0);
      }
    },
  }));
  return { title: fill(isEn ? c.en : c.ja, h), text: fill(isEn ? def.en : def.ja, h), options, auto: (x) => autoPick(x, def), ref: `ev:${def.id}` };
}

// ---- 戦いの演出 (LogEntry.fight) -------------------------------------------------
// 相手と結果は、文とエンジンが決めた結果から読むだけで、乱数は引かない (同じ seed の人生を変えないため)

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
function fightHazard(def: EventDef, text: string): Hazard | undefined | false {
  if (def.foe || def.kind === 'battle') return def.risk?.hazard;
  const hzs = [def.risk?.hazard, ...(def.choice?.options.map((o) => o.risk?.hazard) ?? [])].filter((x): x is Hazard => !!x && FIGHT_HZ.includes(x));
  const hz = hzs[0];
  if (!hz) return false;
  if (hz === 'violence' && def.kind !== 'adventure' && !isClash(text + (def.choice ? def.choice.ja + def.choice.en : ''))) return false;
  return hz;
}

const FLEE = /逃げ|退く|退いた|引き返|身を隠|隠れ|見送る|やり過ご|走って|flee|run|retreat|hide|back off|slip away/i;

// その年の、いちばん新しい戦いの記録
function lastFight(h: Hero): LogEntry | undefined {
  for (let i = h.log.length - 1; i >= 0 && h.log[i].age === h.age; i--) if (h.log[i].fight) return h.log[i];
  return undefined;
}

// 出来事の後で結果を付ける。死んだ (lose) > 取り消された死・傷 (hurt) > 勝った (win)
function settleFight(h: Hero, e: LogEntry, hz: Hazard | undefined, hpLoss: boolean): void {
  if (!e.fight) return;
  if (!h.alive && (!hz || h.death?.hazard === hz)) e.fight.result = 'lose';
  else if (h.flags.revived === h.age || hpLoss) e.fight.result = 'hurt';
}

// 出来事を1件起こす。選択肢があれば Decision を返す (呼ぶ側が pending に積むか、自動で選ぶ)
export function applyEvent(h: Hero, def: EventDef, die: Die): Decision | null {
  const ties: Partial<Record<Role, Tie>> = {};
  if (def.tie) {
    const t = def.tie.new ? newTie(h, def.tie.role) : byRole(h, def.tie.role);
    if (t) ties[def.tie.role] = t;
  }
  const text = fill(isEn ? def.en : def.ja, h, ties);
  if (!def.repeat) h.used.push(def.id);
  else h.recent = { ...h.recent, [def.id]: h.age };
  if (def.eff) bump(h, def.eff);
  mark(h, def.set, def.job);
  const who = Object.values(ties);
  const e = who.length ? shared(h, who, text, def.kind, def.tie?.d ?? 0, !!def.big) : log(h, text, def.kind, !!def.big);
  if (def.why) e.why = fill(T(def.why), h, ties);
  if (def.tie?.new && ties[def.tie.role]) e.join = [ties[def.tie.role]!.id];
  // tie.dies: この出来事で、その人が亡くなる (伴侶を看取る・親の葬儀)。悲しみの大きさは eff に書く
  const gone = def.tie?.dies ? ties[def.tie.role] : undefined;
  if (gone) {
    gone.alive = false;
    gone.diedAt = h.age;
    e.leave = [gone.id];
    if (gone.role === 'spouse') { delete h.flags.married; h.flags.widowed ??= h.age; }
  }
  const fh = fightHazard(def, text);
  if (fh !== false) e.fight = { foe: def.foe ?? foeFor(h, fh, text), result: 'win' };
  roll(h, def.risk, die);
  settleFight(h, e, def.risk?.hazard, (def.eff?.hp ?? 0) < 0);
  return def.choice && h.alive ? eventDecision(h, def, die) : null;
}

// 目立つ特典を持つ人は、暗殺・断罪の絡む出来事を引きやすい (research/02 の 10.3節)
// trait の events は、その種類 (YearKind) の出来事の起きやすさに掛ける
function weight(h: Hero, d: EventDef): number {
  const att = attentionOf(h);
  const targeted = d.risk && (d.risk.hazard === 'violence' || d.risk.hazard === 'execution');
  let w = d.w * (targeted && att > 0 ? 1 + 0.3 * att : 1);
  for (const id of h.traits) { const m = traitOf(id)?.events?.[d.kind]; if (m !== undefined) w *= m; }
  return w;
}

// 段階の候補の重みの累積 (一生変わらない条件の組ごとに一度だけ作る)
let cumCache = new Map<string, number[]>();
function cumulative(h: Hero, st: Stage, list: EventDef[]): number[] {
  const key = `${staticKey(h)}|${st}`;
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
