// 図鑑 (チケットの残りと履歴・解放の割合・魔物図鑑・出会い図鑑) と、実績の画面
import type { WorldId } from '../engine/types';
import { WORLDS, WORLD_IDS } from '../engine';
import { loadProgress } from '../meta/store';
import { ALL_UNLOCKS, PRICES } from '../meta/unlocks';
import { BESTIARY, bestiaryProgress } from '../meta/bestiary';
import { ENCOUNTERS, encounterProgress } from '../meta/encounters';
import { allAchievements } from '../meta/achievements';
import type { AchievementCategory, BestiaryEntry, Cond, Progress } from '../meta/types';
import { enemyFor, enemyKind, paintEnemy, type EnemySpec } from './enemy';
import { adHTML } from './ads';
import { esc } from './dom';
import { screen, type Nav } from './nav';
import { isEn, L, T } from '../i18n';

const day = (at: number) => new Date(at).toLocaleDateString(isEn ? 'en-US' : 'ja-JP');
const worldName = (w: WorldId) => (WORLDS[w] ? T(WORLDS[w].name) : w);
const bar = (got: number, total: number) => `<i class="meter" aria-hidden="true"><b style="width:${total ? Math.min(100, (got / total) * 100).toFixed(1) : 0}%"></b></i>`;

// 図鑑の項目の姿を描くための材料 (その姿が出る世界と seed を探す)
const specs = new Map<string, EnemySpec | null>();
function specOf(b: BestiaryEntry): EnemySpec | null {
  if (specs.has(b.id)) return specs.get(b.id)!;
  let found: EnemySpec | null = null;
  for (const w of b.worlds) for (let s = 0; s < 64 && !found; s++) { const e = enemyFor(w, b.foe, s); if (enemyKind(e) === b.id) found = e; }
  specs.set(b.id, found);
  return found;
}
// 描く。まだ会っていないものは影だけ
function paintEntry(cv: HTMLCanvasElement, b: BestiaryEntry, met: boolean): void {
  const e = specOf(b);
  if (!e) return;
  const P = paintEnemy(e, 'idle', 0);
  if (!met) for (let i = 0; i < P.d.length; i += 4) if (P.d[i + 3]) { P.d[i] = 46; P.d[i + 1] = 42; P.d[i + 2] = 66; }
  P.put(cv);
}

const KINDS: [string, string, string][] = [['world', '世界', 'Worlds'], ['race', '種族', 'Races'], ['cheat', '転生特典', 'Gifts'], ['status', '身分', 'Births'],
  ['startAge', '始まる年齢', 'Starting ages'], ['blessing', '女神の加護', 'Blessing'], ['trait', 'スキルと体質', 'Traits']];

function ticketsHTML(p: Progress): string {
  const kinds = KINDS.map(([k, ja, en]) => {
    const keys = ALL_UNLOCKS.filter((x) => x.startsWith(`${k}:`) && PRICES[x] > 0);
    const got = keys.filter((x) => p.unlocked.includes(x)).length;
    return keys.length ? `<li><span>${L(ja, en)}</span>${bar(got, keys.length)}<em>${got}/${keys.length}</em></li>` : '';
  }).join('');
  const log = [...p.ticketLog].reverse().slice(0, 12);
  return `<section class="panel"><h2>${L('チケット', 'Tickets')} <b class="tickets">${p.tickets}</b></h2>
    <p class="note">${L('おまかせで転生して最後まで生きるともらえる。設定して転生や、ほかの選択肢の解放に使う。', 'Earned by living a random rebirth to the end. Spend them to open custom rebirth and its options.')}</p>
    <h3>${L('解放した割合', 'Unlocked')}</h3><ul class="bars unlocks">${kinds}</ul>
    <h3>${L('もらった履歴', 'History')}</h3>
    ${log.length ? `<ul class="ticketlog">${log.map((x) => `<li><span>${day(x.at)}</span><div><b>+${x.gain}</b> ${esc(x.name)} <small>(${esc(worldName(x.world))})</small><small>${x.parts.map((q) => `${esc(q.label)} +${q.n}`).join(L('・', ', '))}</small></div></li>`).join('')}</ul>`
      : `<p class="note">${L('まだない。', 'None yet.')}</p>`}</section>`;
}

function bestiaryHTML(p: Progress, world: WorldId | ''): string {
  const pr = bestiaryProgress(p, world || undefined);
  const list = world ? BESTIARY.filter((b) => b.worlds.includes(world)) : BESTIARY;
  return `<section class="panel" id="bestiary"><h2>${L('魔物図鑑', 'Bestiary')} <small>${pr.met}/${pr.total}${L(`・倒した ${pr.won}`, ` · defeated ${pr.won}`)}</small></h2>
    <label class="field">${L('世界で絞る', 'Filter by world')}<select id="bworld"><option value="">${L('すべての世界', 'All worlds')} (${bestiaryProgress(p).met}/${BESTIARY.length})</option>
      ${WORLD_IDS.map((w) => { const q = bestiaryProgress(p, w); return `<option value="${w}" ${w === world ? 'selected' : ''}>${esc(worldName(w))} (${q.met}/${q.total})</option>`; }).join('')}</select></label>
    <ul class="dex">${list.map((b) => {
      const r = p.bestiary[b.id];
      return `<li class="${r ? 'met' : 'unmet'}"><canvas class="pix foe" data-foe="${esc(b.id)}" data-met="${r ? 1 : 0}" width="48" height="48" aria-hidden="true"></canvas>
        <div><b>${r ? esc(T(b.name)) : '???'}</b><small class="stars" aria-label="${L(`危険度${b.danger}`, `danger ${b.danger}`)}">${'◆'.repeat(b.danger)}${'◇'.repeat(5 - b.danger)}</small>
        ${r ? `<small>${L(`会った ${r.met}・倒した ${r.won}`, `met ${r.met} · defeated ${r.won}`)}</small><small>${L(`はじめて: ${esc(r.first.name)} (${esc(worldName(r.first.world))})`, `First: ${esc(r.first.name)} (${esc(worldName(r.first.world))})`)}</small><small class="flavor">${esc(T(b.flavor))}</small>`
          : `<small>${esc(b.worlds.slice(0, 3).map(worldName).join(L('・', ', ')))}${b.worlds.length > 3 ? '…' : ''}</small>`}</div></li>`;
    }).join('')}</ul></section>`;
}

// 稀さの段 (会っていなくても見える)。伝説は枠の色でも分かるように (CSS の .r5)
const TIER: Record<number, string> = { 1: L('平凡', 'Common'), 2: L('珍しい', 'Uncommon'), 3: L('稀', 'Rare'), 4: L('とても稀', 'Very rare'), 5: L('伝説', 'Legendary') };

function encountersHTML(p: Progress): string {
  const pr = encounterProgress(p);
  return `<section class="panel" id="encounters"><h2>${L('出会い図鑑', 'Encounters')} <small>${pr.met}/${pr.total}</small></h2>
    <ul class="dex enc">${ENCOUNTERS.map((d) => {
      const r = p.encounters[d.id];
      return `<li class="${r ? 'met' : 'unmet'} r${d.rarity}"><span class="rar"><span class="tier">${esc(TIER[d.rarity] ?? '')}</span><span aria-hidden="true">${'★'.repeat(d.rarity)}${'☆'.repeat(5 - d.rarity)}</span></span>
        <div><b>${r ? esc(T(d.name)) : '???'}</b>${r ? `<small>${L(`${r.n}回`, `${r.n} ${r.n === 1 ? 'time' : 'times'}`)}${L('・', ' · ')}${L(`はじめて: ${esc(r.first.name)} (${esc(worldName(r.first.world))})`, `first: ${esc(r.first.name)} (${esc(worldName(r.first.world))})`)}</small><small class="flavor">${esc(T(d.flavor))}</small>` : `<small>${L('まだ出会っていない', 'Not yet met')}</small>`}</div></li>`;
    }).join('')}</ul></section>`;
}

export function showCollection(nav: Nav): void {
  let world: WorldId | '' = '';
  const p = loadProgress();
  screen(`
  <main class="page collection">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('図鑑', 'Collection')}</h1>
    <div class="choices"><button data-go="achievements">${L('実績を見る', 'Achievements')}</button></div>
    ${ticketsHTML(p)}
    <div id="bbox">${bestiaryHTML(p, world)}</div>
    ${encountersHTML(p)}
    ${Object.keys(p.bestiary).length || Object.keys(p.encounters).length || p.ticketLog.length ? adHTML('collection') : ''}
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    if (t.closest('[data-go=achievements]')) return nav.achievements();
  }, { back: nav.title });
  const paint = () => document.querySelectorAll<HTMLCanvasElement>('canvas[data-foe]').forEach((cv) => {
    const b = BESTIARY.find((x) => x.id === cv.dataset.foe);
    if (b) paintEntry(cv, b, cv.dataset.met === '1');
  });
  paint();
  document.getElementById('app')!.onchange = (e) => {
    const s = e.target as HTMLSelectElement;
    if (s.id !== 'bworld') return;
    world = s.value as WorldId | '';
    document.getElementById('bbox')!.innerHTML = bestiaryHTML(loadProgress(), world);
    paint();
    document.getElementById('bworld')?.focus();
  };
}

// ---- 実績 -------------------------------------------------------------------

const CAT: Record<AchievementCategory, [string, string]> = {
  total: ['通算', 'Totals'], feat: ['偉業', 'Feats'], world: ['世界', 'Worlds'], race: ['種族', 'Races'], cheat: ['転生特典', 'Gifts'],
  death: ['死に方', 'Deaths'], social: ['人の輪', 'People'], generation: ['系譜', 'Generations'], collection: ['収集', 'Collection'], secret: ['秘密', 'Secret'],
};

// 進み具合 (0〜1)。数で書ける条件だけ。ほかは解放したら 1
function progressOf(c: Cond, p: Progress): number {
  if ('total' in c) return Math.min(1, p.totals[c.total] / c.gte);
  if ('distinct' in c) return Math.min(1, ((c.random ? p.distinctRandom : p.distinct)?.[c.distinct]?.length ?? 0) / c.gte);
  if ('all' in c) return Math.min(...c.all.map((x) => progressOf(x, p)));
  if ('any' in c) return Math.max(...c.any.map((x) => progressOf(x, p)));
  if ('everyWorld' in c && !c.fact) return WORLD_IDS.filter((w) => (p.worldsDone[w] ?? 0) > 0).length / WORLD_IDS.length;
  return 0;
}

export function showAchievements(nav: Nav): void {
  const p = loadProgress();
  const list = allAchievements();
  const got = list.filter((a) => p.achievements[a.id]).length;
  const cats = (Object.keys(CAT) as AchievementCategory[]).filter((c) => list.some((a) => a.category === c));
  screen(`
  <main class="page achievements">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('実績', 'Achievements')} <small>${got}/${list.length}</small></h1>
    <div class="choices"><button data-go="collection">${L('図鑑を見る', 'Collection')}</button></div>
    ${cats.map((c) => {
      const as = list.filter((a) => a.category === c);
      return `<section class="panel"><h2>${L(...CAT[c])} <small>${as.filter((a) => p.achievements[a.id]).length}/${as.length}</small></h2><ul class="ach">${as.map((a) => {
        const r = p.achievements[a.id];
        const secret = a.hidden && !r;
        const k = r ? 1 : progressOf(a.cond, p);
        return `<li class="${r ? 'got' : ''}"><div><b>${secret ? '???' : esc(T(a.name))}</b><small>${secret ? L('条件は解放まで伏せてある', 'Hidden until unlocked') : esc(T(a.desc))}</small>
          ${r ? `<small class="when">${day(r.at)}${L('・', ' · ')}${esc(r.name)} (${esc(worldName(r.world))})</small>` : k > 0 ? `<span class="prog">${bar(k, 1)}<em>${Math.floor(k * 100)}%</em></span>` : ''}</div>
          ${a.tickets ? `<span class="reward">+${a.tickets}${L('枚', '')}</span>` : ''}</li>`;
      }).join('')}</ul></section>`;
    }).join('')}
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    if (t.closest('[data-go=collection]')) return nav.collection();
  }, { back: nav.title });
}
