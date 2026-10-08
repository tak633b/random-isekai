// スキル・能力・加護・体質・弱点 (traits) と、能力へのポイント配分。
// データは src/data/traits/*.ts の `export const TRAITS: TraitDef[]` を全部集める (0件でも動く)。
// 予算はポイント POINT_BUDGET と枠 TRAIT_SLOTS。弱点は枠を使わず (最大 MAX_WEAKNESS)、選ぶとポイントが戻る (cost が負)
import type { AllotKey, Hazard, Hero, HeroChoice, RaceId, TraitDef, World } from './types';
import { pickWeighted, type Rng } from './rng';
import { L, T } from '../i18n';

const mods = import.meta.glob<{ TRAITS?: TraitDef[] }>('../data/traits/*.ts', { eager: true });
let TRAITS: TraitDef[] = Object.values(mods).flatMap((m) => m.TRAITS ?? []);
let byId = new Map(TRAITS.map((t) => [t.id, t]));

export const POINT_BUDGET = 20;
export const TRAIT_SLOTS = 6;
export const MAX_WEAKNESS = 3;
export const POINT_STEP = 5;   // 1ポイントで能力 +5
export const POINT_MAX = 4;    // 1項目に振れるのは4ポイントまで
export const ALLOT_KEYS: AllotKey[] = ['hp', 'power', 'mind', 'charm', 'luck'];

export const allTraits = (): TraitDef[] => TRAITS;
export const traitOf = (id: string): TraitDef | undefined => byId.get(id);

// テスト用: 一覧を差し替える
export function useTraits(list: TraitDef[]): void {
  TRAITS = list;
  byId = new Map(list.map((t) => [t.id, t]));
}

// その世界・種族で選べるもの
export function availableTraits(world: World, race: RaceId, pool: TraitDef[] = TRAITS): TraitDef[] {
  return pool.filter((t) =>
    (!t.tags || t.tags.some((x) => world.tags.includes(x)))
    && (!t.not || !t.not.some((x) => world.tags.includes(x)))
    && (t.magic === undefined || world.magic >= t.magic)
    && (t.powers === undefined || world.powers >= t.powers)
    && (!t.tech || (world.tech >= t.tech[0] && world.tech <= t.tech[1]))
    && (!t.races || t.races.includes(race)));
}

export type Build = Pick<HeroChoice, 'traits' | 'points'>;

const pointsSpent = (p: Build['points']) => ALLOT_KEYS.reduce((s, k) => s + (p?.[k] ?? 0), 0);
const clash = (a: TraitDef, b: TraitDef) => !!(a.excl?.includes(b.id) || b.excl?.includes(a.id));

// 組み立てを確かめる。問題があれば、今の言語の文で返す (空 = 大丈夫)
export function validateBuild(world: World, race: RaceId, choice: Build, pool: TraitDef[] = TRAITS): string[] {
  const errs: string[] = [];
  const ids = choice.traits ?? [];
  const ok = new Set(availableTraits(world, race, pool).map((t) => t.id));
  const defs: TraitDef[] = [];
  for (const id of ids) {
    const t = pool.find((x) => x.id === id);
    if (!t) errs.push(L(`「${id}」という能力は無い`, `There is no trait "${id}"`));
    else if (!ok.has(id)) errs.push(L(`「${T(t.name)}」はこの世界・種族では選べない`, `"${T(t.name)}" is not available for this world or race`));
    else if (defs.includes(t)) errs.push(L(`「${T(t.name)}」を二つは持てない`, `"${T(t.name)}" can only be taken once`));
    else defs.push(t);
  }
  for (let i = 0; i < defs.length; i++) for (let j = i + 1; j < defs.length; j++) {
    if (clash(defs[i], defs[j])) errs.push(L(`「${T(defs[i].name)}」と「${T(defs[j].name)}」は同時に持てない`, `"${T(defs[i].name)}" and "${T(defs[j].name)}" cannot be taken together`));
  }
  const slots = defs.filter((t) => t.kind !== 'weakness').length;
  const weak = defs.length - slots;
  if (slots > TRAIT_SLOTS) errs.push(L(`枠は${TRAIT_SLOTS}つまで (今は${slots}つ)`, `Only ${TRAIT_SLOTS} slots (you have ${slots})`));
  if (weak > MAX_WEAKNESS) errs.push(L(`弱点は${MAX_WEAKNESS}つまで (今は${weak}つ)`, `At most ${MAX_WEAKNESS} weaknesses (you have ${weak})`));
  for (const k of ALLOT_KEYS) {
    const v = choice.points?.[k] ?? 0;
    if (!Number.isInteger(v) || v < 0 || v > POINT_MAX) errs.push(L(`${k} に振れるのは0〜${POINT_MAX}ポイント`, `${k} takes 0–${POINT_MAX} points`));
  }
  const used = defs.reduce((s, t) => s + t.cost, 0) + pointsSpent(choice.points);
  if (used > POINT_BUDGET) errs.push(L(`ポイントが${used - POINT_BUDGET}足りない (使うのは${used}、持ち分は${POINT_BUDGET})`, `${used - POINT_BUDGET} points over budget (${used} of ${POINT_BUDGET})`));
  return errs;
}

// おまかせの組み立て。弱点を確率で0〜3つ、その後に枠と予算の中で能力を重みつきで足し、残りのポイントを能力値に振る。
// 決めてある方 (fixed.traits / fixed.points) はそのまま使い、もう一方だけを埋める
export function randomBuild(rng: Rng, world: World, race: RaceId, fixed: Build = {}, pool: TraitDef[] = TRAITS): Required<Build> {
  const avail = availableTraits(world, race, pool);
  let traits: string[];
  if (fixed.traits) traits = [...fixed.traits];
  else {
    const picked: TraitDef[] = [];
    const fits = (t: TraitDef) => !picked.includes(t) && !picked.some((p) => clash(p, t));
    const r = rng();
    const nWeak = r < 0.55 ? 0 : r < 0.85 ? 1 : r < 0.97 ? 2 : 3;
    for (let i = 0; i < nWeak; i++) {
      const c = avail.filter((t) => t.kind === 'weakness' && fits(t));
      if (!c.length) break;
      picked.push(c[Math.floor(rng() * c.length)]);
    }
    // 能力の重み: 安いものほど出やすい (高い能力ばかりで能力値が空にならないように)
    let budget = POINT_BUDGET - picked.reduce((s, t) => s + t.cost, 0);
    for (let slot = 0; slot < TRAIT_SLOTS && rng() < 0.7; slot++) {
      const c = avail.filter((t) => t.kind !== 'weakness' && fits(t) && t.cost <= budget);
      if (!c.length) break;
      const t = pickWeighted(rng, c, (x) => 1 / (1 + Math.max(0, x.cost)));
      picked.push(t);
      budget -= t.cost;
    }
    traits = picked.map((t) => t.id);
  }
  let points: Partial<Record<AllotKey, number>>;
  if (fixed.points) points = { ...fixed.points };
  else {
    const cost = traits.reduce((s, id) => s + (pool.find((t) => t.id === id)?.cost ?? 0), 0);
    let left = Math.max(0, POINT_BUDGET - cost);
    const p: Record<AllotKey, number> = { hp: 0, power: 0, mind: 0, charm: 0, luck: 0 };
    while (left > 0) {
      const open = ALLOT_KEYS.filter((k) => p[k] < POINT_MAX);
      if (!open.length) break;
      p[open[Math.floor(rng() * open.length)]]++;
      left--;
    }
    points = p;
  }
  return { traits, points };
}

// ---- 効き目 -----------------------------------------------------------------

export const heroTraits = (h: Hero): TraitDef[] => {
  const out: TraitDef[] = [];
  for (const id of h.traits) { const t = byId.get(id); if (t) out.push(t); }
  return out;
};

// trait が掛ける倍率の積 (その死因)
export function traitMult(h: Hero, hz: Hazard): number {
  let m = 1;
  for (const id of h.traits) { const v = byId.get(id)?.mult?.[hz]; if (v !== undefined) m *= v; }
  return m;
}

export function traitAging(h: Hero): number {
  let m = 1;
  for (const id of h.traits) { const v = byId.get(id)?.aging; if (v !== undefined) m *= v; }
  return m;
}

export function traitAttention(h: Hero): number {
  let a = 0;
  for (const id of h.traits) a += byId.get(id)?.attention ?? 0;
  return a;
}

export function traitFertility(h: Hero): number {
  let m = 1;
  for (const id of h.traits) { const v = byId.get(id)?.fertility; if (v !== undefined) m *= v; }
  return m;
}

// その死因に効いている trait の一行 (「頑健な体: 病の死 0.7倍」)。why と危険の内訳に添える
export function traitNotes(h: Hero, hz: Hazard, hazardLabel: string): string[] {
  const out: string[] = [];
  for (const t of heroTraits(h)) {
    const v = t.mult?.[hz];
    if (v !== undefined && v !== 1) out.push(L(`${T(t.name)}: ${hazardLabel}の死 ${v}倍`, `${T(t.name)}: ${hazardLabel.toLowerCase()} deaths ×${v}`));
  }
  return out;
}
