// スキル・能力・加護・体質・弱点の組み立て (設定の画面の一部) と、持っている trait の小さなタグ。
// 予算と枠の判定は engine の validateBuild に任せ、ここは見せ方だけ
import type { AllotKey, Hazard, JobId, RaceId, StatKey, TraitDef, TraitKind, World, YearKind } from '../engine/types';
import { ALLOT_KEYS, BLESSING, MAX_WEAKNESS, POINT_BUDGET, POINT_MAX, POINT_STEP, TRAIT_SLOTS, availableTraits, hazardName, makeRng, randomBuild, traitOf, validateBuild } from '../engine';
import { KIND_NAME, STAT_NAME, jobName } from './labels';
import { esc } from './dom';
import { L, T } from '../i18n';

export interface BuildState {
  mode: 'auto' | 'pick';
  traits: string[];
  points: Partial<Record<AllotKey, number>>;
  tab: TraitKind;
  query: string;
  more: boolean;
}
export const newBuild = (): BuildState => ({ mode: 'auto', traits: [], points: {}, tab: 'blessing', query: '', more: false });

const KINDS: TraitKind[] = ['skill', 'ability', 'blessing', 'constitution', 'weakness'];
export const TRAIT_KIND_NAME: Record<TraitKind, string> = {
  skill: L('スキル', 'Skills'), ability: L('能力', 'Abilities'), blessing: L('加護', 'Blessings'), constitution: L('体質', 'Constitution'), weakness: L('弱点', 'Weaknesses'),
};
const PAGE = 30;

const x = (v: number) => (Math.round(v * 100) / 100).toString();
// 効き目の要約: 「病の死 0.7倍」「強さ +10」のように
export function effectText(t: TraitDef): string {
  const out: string[] = [];
  for (const [hz, v] of Object.entries(t.mult ?? {})) out.push(L(`${hazardName(hz as Hazard)}の死 ${x(v!)}倍`, `${hazardName(hz as Hazard)} deaths ×${x(v!)}`));
  if (t.aging !== undefined) out.push(L(`老いの速さ ${x(t.aging)}倍`, `aging ×${x(t.aging)}`));
  for (const [k, v] of Object.entries(t.stats ?? {})) out.push(`${STAT_NAME[k as StatKey]} ${v! > 0 ? '+' : ''}${v}`);
  for (const [k, v] of Object.entries(t.events ?? {})) out.push(L(`${KIND_NAME[k as YearKind]}の出来事 ${x(v!)}倍`, `${KIND_NAME[k as YearKind]} events ×${x(v!)}`));
  for (const [k, v] of Object.entries(t.jobs ?? {})) out.push(L(`${jobName(k as JobId)}になりやすさ ${x(v!)}倍`, `${jobName(k as JobId)} ×${x(v!)}`));
  if (t.fertility !== undefined) out.push(L(`子の授かりやすさ ${x(t.fertility)}倍`, `fertility ×${x(t.fertility)}`));
  if (t.attention) out.push(L(`目立ちやすさ ${t.attention > 0 ? '+' : ''}${t.attention}`, `attention ${t.attention > 0 ? '+' : ''}${t.attention}`));
  return out.join(L('・', ', '));
}

// 持っている trait のタグ。押すと説明が開く (details なので JS は要らない)
export function traitTags(ids: string[], blessing = false): string {
  const tags = ids.map(traitOf).filter((t): t is TraitDef => !!t).map((t) =>
    `<details class="tag k-${t.kind}"><summary>${esc(T(t.name))}</summary><span>${esc(T(t.desc))}${effectText(t) ? `<small>${esc(effectText(t))}</small>` : ''}</span></details>`);
  if (blessing) tags.unshift(`<details class="tag k-blessing"><summary>${L('女神の加護', 'Goddess’s blessing')}</summary><span>${L(`成人するまで、病・魔物・事故の死が ${BLESSING}倍になる。`, `Until adulthood, deaths from illness, monsters and accidents are ×${BLESSING}.`)}</span></details>`);
  return tags.length ? `<div class="tags">${tags.join('')}</div>` : '';
}

// 世界と種族が変わって選べなくなったものを外す。外したものの名前を返す
export function prune(b: BuildState, world: World | null, race: RaceId | undefined): string[] {
  if (!world || !race) return [];
  const ok = new Set(availableTraits(world, race).map((t) => t.id));
  const gone = b.traits.filter((id) => !ok.has(id));
  b.traits = b.traits.filter((id) => ok.has(id));
  return gone.map((id) => T(traitOf(id)?.name ?? { ja: id, en: id }));
}

export function randomize(b: BuildState, world: World, race: RaceId): void {
  const r = randomBuild(makeRng((Math.random() * 2 ** 32) >>> 0), world, race);
  b.traits = r.traits;
  b.points = r.points;
}

export const buildErrors = (b: BuildState, world: World | null, race: RaceId | undefined): string[] =>
  b.mode === 'pick' && world && race ? validateBuild(world, race, { traits: b.traits, points: b.points }) : [];

export function buildHTML(b: BuildState, world: World | null, race: RaceId | undefined, removed: string[]): string {
  const can = !!world && !!race;
  const head = `<div class="opts"><button type="button" data-b="mode" data-v="auto" class="${b.mode === 'auto' ? 'on' : ''}" aria-pressed="${b.mode === 'auto'}">${L('おまかせ', 'Random')}</button>
    <button type="button" data-b="mode" data-v="pick" class="${b.mode === 'pick' ? 'on' : ''}" aria-pressed="${b.mode === 'pick'}" ${can ? '' : 'disabled'}>${L('自分で組む', 'Build my own')}</button>
    <button type="button" data-b="random" ${can ? '' : 'disabled'}>${L('ランダムに組む', 'Random build')}</button></div>
    ${removed.length ? `<p class="warn" role="status">${L(`世界か種族が変わって選べなくなったので外した: ${esc(removed.join('、'))}`, `Removed because they no longer fit this world or race: ${esc(removed.join(', '))}`)}</p>` : ''}`;
  if (!can) return `${head}<p class="note">${L('自分で組むには、世界と種族を決める。おまかせなら、生まれるときにポイントの中で組まれる。', 'To build your own, choose a world and a race first. On Random, a build is drawn within the points at birth.')}</p>`;
  if (b.mode === 'auto') return `${head}<p class="note">${L(`生まれるときに、${POINT_BUDGET}ポイントと${TRAIT_SLOTS}つの枠の中でおまかせで組まれる。`, `At birth, a build is drawn within ${POINT_BUDGET} points and ${TRAIT_SLOTS} slots.`)}</p>`;
  const defs = b.traits.map(traitOf).filter((t): t is TraitDef => !!t);
  const used = defs.reduce((s, t) => s + t.cost, 0) + ALLOT_KEYS.reduce((s, k) => s + (b.points[k] ?? 0), 0);
  const slots = defs.filter((t) => t.kind !== 'weakness').length, weak = defs.length - slots;
  const errs = validateBuild(world!, race!, { traits: b.traits, points: b.points });
  return `${head}
    <div class="budget${used > POINT_BUDGET ? ' over' : ''}" aria-live="polite">
      <span>${L('残りポイント', 'Points left')} <b>${POINT_BUDGET - used}</b> / ${POINT_BUDGET}</span>
      <span>${L('枠', 'Slots')} <b>${slots}</b> / ${TRAIT_SLOTS}</span>
      <span>${L('弱点', 'Weaknesses')} <b>${weak}</b> / ${MAX_WEAKNESS}</span>
    </div>
    ${errs.length ? `<ul class="errs" role="alert">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
    <h3>${L(`能力へのポイント (1ポイントで +${POINT_STEP})`, `Stat points (+${POINT_STEP} each)`)}</h3>
    <ul class="allot">${ALLOT_KEYS.map((k) => { const v = b.points[k] ?? 0; return `<li><span>${STAT_NAME[k]}</span>
      <button type="button" data-b="pt" data-k="${k}" data-v="-1" aria-label="${STAT_NAME[k]} −1" ${v <= 0 ? 'disabled' : ''}>−</button><b>${v}</b>
      <button type="button" data-b="pt" data-k="${k}" data-v="1" aria-label="${STAT_NAME[k]} +1" ${v >= POINT_MAX ? 'disabled' : ''}>+</button></li>`; }).join('')}</ul>
    <h3>${L('選んだもの', 'Chosen')}</h3>
    ${defs.length ? `<ul class="chosen">${defs.map((t) => `<li><button type="button" data-b="del" data-v="${esc(t.id)}" aria-label="${L(`${esc(T(t.name))}を外す`, `Remove ${esc(T(t.name))}`)}">${esc(T(t.name))} <small>${t.cost}</small> ×</button></li>`).join('')}</ul>`
      : `<p class="note">${L('まだ何も選んでいない。', 'Nothing chosen yet.')}</p>`}
    <div class="traitpick">${listHTML(b, world!, race!)}</div>`;
}

// 候補の一覧 (タブ・検索・候補)。検索の入力中はここだけ描き直す
export function listHTML(b: BuildState, world: World, race: RaceId): string {
  const avail = availableTraits(world, race);
  const q = b.query.trim().toLowerCase();
  const hit = avail.filter((t) => t.kind === b.tab && (!q || (T(t.name) + T(t.desc)).toLowerCase().includes(q)));
  const shown = b.more ? hit : hit.slice(0, PAGE);
  return `<div class="tabs" role="tablist">${KINDS.map((k) => `<button type="button" role="tab" data-b="tab" data-v="${k}" class="${b.tab === k ? 'on' : ''}" aria-selected="${b.tab === k}">${TRAIT_KIND_NAME[k]} <small>${avail.filter((t) => t.kind === k).length}</small></button>`).join('')}</div>
    <label class="search"><span class="vh">${L('名前で絞り込む', 'Filter by name')}</span><input id="tq" type="search" value="${esc(b.query)}" placeholder="${L('名前や説明で絞り込む', 'Filter by name or description')}" autocomplete="off"></label>
    <ul class="cands" id="cands">${shown.map((t) => { const on = b.traits.includes(t.id); return `<li><button type="button" data-b="add" data-v="${esc(t.id)}" class="${on ? 'on' : ''}" aria-pressed="${on}">
      <span class="cost${t.cost < 0 ? ' neg' : ''}">${t.cost > 0 ? '+' : ''}${t.cost}</span><b>${esc(T(t.name))}</b><span class="desc">${esc(T(t.desc))}</span>${effectText(t) ? `<small>${esc(effectText(t))}</small>` : ''}</button></li>`; }).join('')
      || `<li class="note">${L('当てはまるものがない。', 'Nothing matches.')}</li>`}</ul>
    ${!b.more && hit.length > PAGE ? `<button type="button" data-b="more">${L(`残り${hit.length - PAGE}件も見る`, `Show ${hit.length - PAGE} more`)}</button>` : ''}
    <p class="note">${L('数字はポイント。弱点はポイントが戻り、枠を使わない。', 'Numbers are point costs. Weaknesses give points back and use no slot.')}</p>`;
}

// クリックを state に反映する。描き直しが要るなら 'all'、一覧だけなら 'list'
export function onBuildClick(t: HTMLElement, b: BuildState, world: World | null, race: RaceId | undefined): 'all' | 'list' | null {
  const btn = t.closest<HTMLElement>('[data-b]');
  if (!btn) return null;
  const v = btn.dataset.v ?? '';
  switch (btn.dataset.b) {
    case 'mode': b.mode = v as BuildState['mode']; return 'all';
    case 'random': if (world && race) { randomize(b, world, race); b.mode = 'pick'; } return 'all';
    case 'pt': { const k = btn.dataset.k as AllotKey; b.points = { ...b.points, [k]: Math.max(0, Math.min(POINT_MAX, (b.points[k] ?? 0) + Number(v))) }; return 'all'; }
    case 'add': b.traits = b.traits.includes(v) ? b.traits.filter((id) => id !== v) : [...b.traits, v]; return 'all';
    case 'del': b.traits = b.traits.filter((id) => id !== v); return 'all';
    case 'tab': b.tab = v as TraitKind; b.more = false; return 'list';
    case 'more': b.more = true; return 'list';
  }
  return null;
}
