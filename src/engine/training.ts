// 鍛える: 数年ごとに「この数年、何を鍛える？」を選ぶ。道 (剣の稽古・火の魔法・料理修業 …) を選ぶと、毎年少しずつ能力が伸び、
// ときどき trait を身につける (「〈剣術〉を身につけた！」)。狙ったスキルを決めて、近づき方 (弟子入り・独学・魔導書・ダンジョン・ズル)
// を選ぶこともできる。月謝やけがの危険、笑える失敗もある。
// データは src/data/training/*.ts の PATHS と METHODS (書き手が足せる)。乱数は主人公の rng (同じ seed は同じ人生)
import type { ClimbRoute, Decision, Status, Hazard, Hero, Option, StatKey, TrainMethod, TrainPath, TraitDef } from './types';
import { pickWeighted } from './rng';
import { bump, log } from './bonds';
import { ADULT_HEQ, heqOf } from './mortality';
import { availableTraits, traitOf } from './traits';
import { anchorsOf } from './anchor';
import { fill, forgetHeroKey, scaledRisk } from './events';
import { fits } from './cond';
import { routeOf, routesFor, setStanding } from './climb';
import { standingOf, statusName } from './status';
import { cap, isEn, L, T } from '../i18n';

const mods = import.meta.glob<{ PATHS?: TrainPath[]; METHODS?: TrainMethod[] }>('../data/training/*.ts', { eager: true });
let PATHS: TrainPath[] = Object.values(mods).flatMap((m) => m.PATHS ?? []);
let METHODS: TrainMethod[] = Object.values(mods).flatMap((m) => m.METHODS ?? []);
export const allPaths = (): TrainPath[] => PATHS;
export const allMethods = (): TrainMethod[] => METHODS;
// テスト用: データを差し替える
export function useTraining(d: { paths?: TrainPath[]; methods?: TrainMethod[] }): void {
  candCache.clear();
  if (d.paths) PATHS = d.paths;
  if (d.methods) METHODS = d.methods;
}

// 見直す年 (人間換算)。子ども・少年少女・大人の入り口・その後は7〜9年ごと。狙いを果たした翌年にも見直す
export const STEPS = [7, 12, 17, 24, 31, 39, 48, 58];
export const LEARN_MAX = 3;       // 一生に身につける trait の数の上限 (生まれつきと合わせて強くなりすぎないように)
const TRAIT_MAX = 10;
const FAIL_P = 0.12;              // 道の年のうち、笑える失敗の年の割合
const LINE_P = 0.2;               // ふつうの年に一文を残す割合

// その世界・種族で身につけられる trait (世界と種族の組ごとに覚える)
const availCache = new Map<string, Set<string>>();
function availIds(h: Hero): Set<string> {
  const k = `${h.world.id}|${h.world.magic}|${h.world.powers}|${h.world.tech}|${h.race}`;
  let s = availCache.get(k);
  if (!s) { s = new Set(availableTraits(h.world, h.race).map((t) => t.id)); availCache.set(k, s); }
  return s;
}
const learnedCount = (h: Hero) => h.learned?.length ?? 0;
// まだ持っていない、持っているものと両立する、その世界で身につけられるもの
function learnable(h: Hero, ids: string[]): TraitDef[] {
  if (learnedCount(h) >= LEARN_MAX || h.traits.length >= TRAIT_MAX) return [];
  const ok = availIds(h);
  const own = new Set(h.traits);
  const blocked = new Set(h.traits.flatMap((x) => traitOf(x)?.excl ?? []));
  const out: TraitDef[] = [];
  for (const id of ids) {
    if (own.has(id) || blocked.has(id) || !ok.has(id)) continue;
    const t = traitOf(id);
    if (t && t.kind !== 'weakness' && !t.excl?.some((x) => own.has(x))) out.push(t);
  }
  return out;
}
const pathOf = (id: string) => PATHS.find((p) => p.id === id);
const methodOf = (id: string) => METHODS.find((m) => m.id === id);
// 世界・身分・種族・職業・特典・来かたが同じなら、合う道と狙えるスキルの候補は同じ (何回も試す集計で毎回作らないように覚える)
const candCache = new Map<string, { paths: TrainPath[]; targets: string[] }>();
function candidates(h: Hero): { paths: TrainPath[]; targets: string[] } {
  const w = h.world;
  const k = `${w.id}|${w.magic}|${w.powers}|${w.tech}|${standingOf(h)}|${h.race}|${h.job}|${h.cheat}|${h.arrival}`;
  let c = candCache.get(k);
  if (!c) {
    const paths = PATHS.filter((p) => fits(h, p));
    const ok = availIds(h);
    const targets = [...new Set(paths.flatMap((p) => p.traits))].filter((id) => ok.has(id) && (traitOf(id)?.kind === 'skill' || traitOf(id)?.kind === 'ability'));
    c = { paths, targets };
    if (candCache.size > 2000) candCache.clear();
    candCache.set(k, c);
  }
  return c;
}

// ---- 見直しの選択 ----------------------------------------------------------------

/** 今年が見直しの年か (ほかの人の一生では鍛えない) */
function due(h: Hero): number | null {
  if (anchorsOf(h) || !PATHS.length) return null;
  const e = heqOf(h);
  const t = h.train;
  if (t?.done && h.age > t.since) return t.step;
  // 初めての見直しは、今の年齢に合う一番後ろの段から (大人で転移して来た人に、子どもの段を順に出さない)
  const next = t ? t.step + 1 : STEPS.filter((x) => e >= x).length - 1;
  return next >= 0 && next < STEPS.length && e >= STEPS[next] ? next : null;
}

type Opt = { kind: 'path'; path: TrainPath } | { kind: 'goal'; trait: TraitDef; method: TrainMethod } | { kind: 'climb'; route: ClimbRoute } | { kind: 'rest' };

const riskOf = (o: Opt): number => (o.kind === 'path' ? o.path.risk?.p ?? 0 : o.kind === 'goal' ? o.method.risk?.p ?? 0 : o.kind === 'climb' ? o.route.risk?.p ?? 0 : 0);
const gainOf = (o: Opt): number => (o.kind === 'path' ? Object.values(o.path.stats).reduce((s, v) => s + (v ?? 0), 0) * 3 + o.path.traits.length : o.kind === 'goal' ? o.trait.cost * 3 + o.method.speed / 10 : o.kind === 'climb' ? 8 : 0);

// 候補を引く: 道を2〜3つ (才能・職業・今の trait に合うものほど出やすい)、大人なら狙うスキルを1つ、それと「のんびり」
function drawOptions(h: Hero): Opt[] {
  const e = heqOf(h);
  const { paths: fit, targets: base } = candidates(h);
  const paths = fit.filter((p) => e >= (p.heq?.[0] ?? 7) && e <= (p.heq?.[1] ?? 70)); // 身につくものが尽きた道でも、能力は伸びるので候補に残す
  const wOf = (p: TrainPath) => (p.w ?? 1) * (p.talents?.includes(h.talent) ? 2 : 1) * (p.jobs ? 2 : 1) * (p.traits.some((id) => h.traits.includes(id)) ? 1.5 : 1);
  const out: Opt[] = [];
  const goalOk = e >= ADULT_HEQ - 4 && learnedCount(h) < LEARN_MAX;
  // 成り上がり: 今の身分から上へ行ける道があれば1つ (低い身分ほど、道の候補を一つ譲る)
  const climbs = routesFor(h);
  const offer = climbs.length > 0 && h.rng() < climbOffer(standingOf(h));
  const nPaths = (goalOk ? 2 : 3) - (offer ? 1 : 0);
  const pool = [...paths];
  for (let i = 0; i < nPaths && pool.length; i++) {
    const p = pickWeighted(h.rng, pool, wOf);
    out.push({ kind: 'path', path: p });
    pool.splice(pool.indexOf(p), 1);
  }
  if (goalOk) {
    const targets = learnable(h, base); // 世界・身分・職に合う道のどれかで身につくもの (年齢の幅は問わない)
    const methods = METHODS.filter((m) => fits(h, m) && e >= (m.minHeq ?? 0));
    if (targets.length && methods.length) {
      const trait = pickWeighted(h.rng, targets, (t) => 1 / Math.max(1, t.cost));
      const method = pickWeighted(h.rng, methods, () => 1);
      out.push({ kind: 'goal', trait, method });
    }
  }
  if (offer) out.push({ kind: 'climb', route: pickWeighted(h.rng, climbs, () => 1) });
  out.push({ kind: 'rest' });
  return out;
}

const refOf = (step: number, os: Opt[]) => `train:${step}:${os.map((o) => (o.kind === 'path' ? `p=${o.path.id}` : o.kind === 'goal' ? `g=${o.trait.id}=${o.method.id}` : o.kind === 'climb' ? `c=${o.route.id}` : 'rest')).join('|')}`;
function optsOf(ref: string): { step: number; opts: Opt[] } | null {
  const [, step, list] = ref.split(':');
  const opts: Opt[] = [];
  for (const x of (list ?? '').split('|')) {
    const [k, a, b] = x.split('=');
    if (k === 'p' && pathOf(a)) opts.push({ kind: 'path', path: pathOf(a)! });
    else if (k === 'g' && traitOf(a) && methodOf(b)) opts.push({ kind: 'goal', trait: traitOf(a)!, method: methodOf(b)! });
    else if (k === 'c' && routeOf(a)) opts.push({ kind: 'climb', route: routeOf(a)! });
    else if (k === 'rest') opts.push({ kind: 'rest' });
  }
  return opts.length ? { step: Number(step), opts } : null;
}

const yen = (n: number) => L(`お金 -${n}/年`, `money -${n}/yr`);
const riskHint = (h: Hero, r?: { hazard: Hazard; p: number }) => (r ? L(`けがの危険 ${(scaledRisk(h, r.p, r.hazard) * 100).toFixed(1)}%/年`, `${(scaledRisk(h, r.p, r.hazard) * 100).toFixed(1)}%/yr risk`) : '');
const skillName = (t: TraitDef) => T(t.name);

function option(h: Hero, o: Opt, step: number): Option {
  if (o.kind === 'path') {
    const p = o.path;
    // 自動で選ぶ人生 (何回も試す集計など) では画面に出ないので、添え書きを作らない (危険の見積もりが重いため)
    const hint = h.auto ? '' : [p.where ? fill(T(p.where), h) : '', p.cost ? yen(p.cost) : '', riskHint(h, p.risk)].filter(Boolean).join(L('・', ' · '));
    return { label: T(p.name), ...(hint ? { hint: cap(hint) } : {}), apply: (x) => start(x, { kind: 'path', id: p.id, since: x.age, step, prog: 0 }, fill(T(p.start), x), 'school') };
  }
  if (o.kind === 'goal') {
    const { trait, method } = o;
    const hint = h.auto ? '' : [T(method.name), method.cost ? yen(method.cost) : '', riskHint(h, method.risk)].filter(Boolean).join(L('・', ' · '));
    return {
      label: L(`〈${skillName(trait)}〉を目指す`, `Aim for "${skillName(trait)}"`), ...(hint ? { hint: cap(hint) } : {}),
      apply: (x) => start(x, { kind: 'goal', id: trait.id, method: method.id, since: x.age, step, prog: 0 }, fill(T(method.start).replace('{target}', skillName(trait)), x), 'school'),
    };
  }
  if (o.kind === 'climb') {
    const r = o.route;
    const to = statusName(r.to, h.world);
    const hint = h.auto ? '' : [L(`${statusName(standingOf(h), h.world)} → ${to}`, `${statusName(standingOf(h), h.world)} → ${to}`), r.cost ? yen(r.cost) : '', riskHint(h, r.risk)].filter(Boolean).join(L('・', ' · '));
    return { label: L(`成り上がる: ${T(r.name)}`, `Rise up: ${T(r.name)}`), ...(hint ? { hint: cap(hint) } : {}),
      apply: (x) => start(x, { kind: 'climb', id: r.id, since: x.age, step, prog: 0 }, fill(T(r.start), x), 'school') };
  }
  return { label: L('とくに何も。好きに過ごす', 'Nothing in particular. Live as you like'), apply: (x) => start(x, { kind: 'rest', id: 'rest', since: x.age, step, prog: 0 }, '', 'child') };
}

function start(h: Hero, t: NonNullable<Hero['train']>, text: string, kind: Parameters<typeof log>[2]): void {
  h.train = t;
  if (text) log(h, text, kind);
}

function decisionOf(h: Hero, step: number, opts: Opt[], ref: string): Decision {
  return {
    title: L('この数年、何を鍛える？', 'What will you work on for the next few years?'),
    text: !h.train && h.transfer ? L('知らない世界で、何から身につけよう。', 'A whole new world. Where to even start?')
      : step === 0 ? L('物心がついてきた。', 'Old enough to choose what to get good at.') : L('暮らしがひと区切りした。', 'Life has reached a turning point.'),
    ref,
    options: opts.map((o) => option(h, o, step)),
    // 作戦: いのちだいじには危険の小さい道、ガンガンいこうぜは危険と伸びの大きい道、バランスはくじ
    auto: (x) => {
      if (x.policy === 'careful') return opts.reduce((bi, o, i) => (riskOf(o) < riskOf(opts[bi]) || (riskOf(o) === riskOf(opts[bi]) && o.kind !== 'rest' && opts[bi].kind === 'rest') ? i : bi), 0);
      if (x.policy === 'bold') return opts.reduce((bi, o, i) => (riskOf(o) * 100 + gainOf(o) > riskOf(opts[bi]) * 100 + gainOf(opts[bi]) ? i : bi), 0);
      return Math.floor(x.rng() * opts.length);
    },
  };
}

/** 見直しの年なら「何を鍛える？」の選択を返す */
export function trainingDecision(h: Hero): Decision | null {
  const step = due(h);
  if (step === null) return null;
  const opts = drawOptions(h);
  if (opts.length < 2) return null;
  return decisionOf(h, step, opts, refOf(step, opts));
}

/** 保存から戻すとき */
export function trainingByRef(h: Hero, ref: string): Decision | null {
  const r = optsOf(ref);
  return r ? decisionOf(h, r.step, r.opts, ref) : null;
}

// ---- 1年ごとの進み ----------------------------------------------------------------

// 成り上がりの道が候補に出る割合。低い身分ほど出やすい (不遇から這い上がるのが筋)。上の段ほどまれ
const climbOffer = (s: Status): number => (s === 'slave' || s === 'orphan' || s === 'poor' ? 0.8 : s === 'commoner' ? 0.3 : s === 'merchant' || s === 'gentry' ? 0.2 : 0.08);

const pickLine = (h: Hero, xs: { ja: string; en: string }[]) => fill(T(xs[Math.floor(h.rng() * xs.length)]), h);

function learn(h: Hero, t: TraitDef, text: string): void {
  h.traits = [...h.traits, t.id];
  h.learned = [...(h.learned ?? []), t.id];
  if (t.stats) bump(h, t.stats as Partial<Record<StatKey, number>>);
  forgetHeroKey(h); // 持っている trait で起きる出来事が変わる
  log(h, text, 'school', true);
}

function pay(h: Hero, cost: number | undefined): boolean {
  if (!cost) return true;
  if (h.stats.wealth < cost + 5) {
    log(h, L('月謝が払えなくなり、通うのをやめた。', 'Could no longer pay for lessons, and stopped going.'), 'hard');
    h.train = { ...h.train!, done: true };
    return false;
  }
  bump(h, { wealth: -cost });
  return true;
}

/** 毎年: 今の鍛え方を1年ぶん進める。die は命の危険 (けが) で亡くなるとき */
export function trainYear(h: Hero, die: (h: Hero, hz: Hazard) => void): void {
  const t = h.train;
  if (!t || t.done || t.kind === 'rest' || h.age <= t.since || anchorsOf(h)) return;
  if (t.kind === 'path') {
    const p = pathOf(t.id);
    if (!p || !pay(h, p.cost)) return;
    if (p.risk && h.rng() < scaledRisk(h, p.risk.p, p.risk.hazard)) { die(h, p.risk.hazard); if (!h.alive) return; }
    if (h.rng() < FAIL_P) { log(h, pickLine(h, p.fails), 'school'); return; }
    bump(h, p.stats);
    const pool = learnable(h, p.traits);
    const chance = 0.07 + (p.talents?.includes(h.talent) ? 0.05 : 0) + (h.stats.mind - 40) / 800;
    if (pool.length && h.rng() < chance) {
      const got = pickWeighted(h.rng, pool, (x) => 1 / Math.max(1, x.cost));
      return learn(h, got, p.got ? fill(T(p.got), h).replaceAll('{target}', T(got.name))
        : L(`${T(p.name)}の成果で〈${T(got.name)}〉を身につけた！`, `Training paid off: learned "${T(got.name)}"!`));
    }
    if (p.lines?.length && h.rng() < LINE_P) log(h, pickLine(h, p.lines), 'school');
    return;
  }
  if (t.kind === 'climb') return climbYear(h, t, die);
  // 狙ったスキル
  const m = methodOf(t.method ?? '');
  const target = traitOf(t.id);
  if (!m || !target || h.traits.includes(target.id)) { h.train = { ...t, done: true }; return; }
  if (!pay(h, m.cost)) return;
  if (m.risk && h.rng() < scaledRisk(h, m.risk.p, m.risk.hazard)) { die(h, m.risk.hazard); if (!h.alive) return; }
  const name = T(target.name);
  if (h.rng() < m.failP) { log(h, pickLine(h, m.fails).replaceAll('{target}', name), 'hard'); return; }
  const before = t.prog;
  const prog = Math.min(100, before + m.speed * (0.6 + h.rng() * 0.8) * (h.talent !== 'none' ? 1.1 : 1));
  h.train = { ...t, prog };
  if (prog >= 100) {
    if (!learnable(h, [target.id]).length) { h.train = { ...h.train, done: true }; return; }
    h.train = { ...h.train, done: true };
    return learn(h, target, `${fill(T(m.done), h).replaceAll('{target}', name)}${isEn ? ` Learned "${name}"!` : `〈${name}〉を身につけた！`}`);
  }
  for (const [at, line] of [[34, m.steps[0]], [67, m.steps[1]]] as const) {
    if (before < at && prog >= at) log(h, fill(T(line), h).replaceAll('{target}', name), 'school');
  }
}

// 成り上がりの1年: 狙いと同じく進み、100で身分が上がる (道の set のしるしも立てる)
function climbYear(h: Hero, t: NonNullable<Hero['train']>, die: (h: Hero, hz: Hazard) => void): void {
  const r = routeOf(t.id);
  if (!r || !r.from.includes(standingOf(h))) { h.train = { ...t, done: true }; return; }
  if (!pay(h, r.cost)) return;
  if (r.risk && h.rng() < scaledRisk(h, r.risk.p, r.risk.hazard)) { die(h, r.risk.hazard); if (!h.alive) return; }
  if (h.rng() < r.failP) { log(h, pickLine(h, r.fails), 'hard'); return; }
  const before = t.prog;
  const prog = Math.min(100, before + r.speed * (0.6 + h.rng() * 0.8));
  h.train = { ...t, prog };
  if (prog >= 100) {
    h.train = { ...h.train, done: true };
    if (r.set) h.flags[r.set] = h.age;
    return setStanding(h, r.to, fill(T(r.done), h));
  }
  for (const [at, line] of [[34, r.steps[0]], [67, r.steps[1]]] as const) if (before < at && prog >= at) log(h, fill(T(line), h), 'school');
}
