// 設定の画面 (世界と主人公を選ぶ) と、転生の場面 (前世の終わりと女神/召喚、おまかせの項目がどう決まったか)
import type { Arrival, CheatId, Hero, Level4, MemoryLevel, Policy, RaceId, Setup, Sex, Status, Talent, World, WorldId } from '../engine/types';
import { CHEATS, CHEAT_IDS, RACE_IDS, STATUSES, TALENTS, WORLDS, WORLD_IDS, availableCheats, makeRng, raceOf, randomSeed, resolveWorld, statusName, worldNames } from '../engine';
import { paintScene } from './scene';
import { paintSprite } from './sprite';
import { faceHTML, sceneHTML, sceneOf, paintAll, heroFigure } from './pixel';
import { ARRIVAL_NAME, MEMORY_NAME, PAST_CAUSE_NAME, POLICY_NAME, SEX_NAME, TALENT_NAME } from './labels';
import { esc, load, save } from './dom';
import { screen, type Nav } from './nav';
import { L, T } from '../i18n';

export interface Choice {
  world: WorldId | 'random';
  magic?: Level4; powers?: Level4; danger?: number; war?: number;
  race?: RaceId; sex?: Sex; status?: Status; talent?: Talent; cheat?: CheatId | 'none';
  arrival?: Arrival; memory?: MemoryLevel; name?: string; policy?: Policy;
}

const KEY = 'choice';
const LV: Level4[] = [0, 1, 2, 3];
const POLICIES: Policy[] = ['careful', 'normal', 'bold'];
const ARRIVALS: Arrival[] = ['reborn', 'awaken', 'summoned', 'native'];
const MEMORIES: MemoryLevel[] = ['none', 'faint', 'full'];

export function toSetup(c: Choice): Setup {
  const world = { preset: c.world, ...(c.magic !== undefined ? { magic: c.magic } : {}), ...(c.powers !== undefined ? { powers: c.powers } : {}),
    ...(c.danger !== undefined ? { danger: c.danger } : {}), ...(c.war !== undefined ? { war: c.war } : {}) };
  const hero = Object.fromEntries((['race', 'sex', 'status', 'talent', 'cheat', 'arrival', 'memory', 'name'] as const)
    .filter((k) => c[k] !== undefined && c[k] !== '').map((k) => [k, c[k]]));
  // 性格のおまかせはエンジンの既定 (ふつう)
  return { seed: randomSeed(), world, hero, ...(c.policy ? { policy: c.policy } : {}) };
}

// 世界を選んだ後の値 (おまかせなら代表として剣と魔法の中世)
const worldOf = (c: Choice): World | null => (c.world === 'random' ? null : resolveWorld(toSetup(c).world, makeRng(1)));
const racesOf = (w: World | null): RaceId[] => (w ? w.races.filter(([, n]) => n > 0).map(([r]) => r) : RACE_IDS);
const cheatsOf = (w: World | null): CheatId[] => (w ? availableCheats(w).map((x) => x.id) : CHEAT_IDS);

// ---- 部品 -----------------------------------------------------------------

// 一つの項目の選択肢。v が undefined の「おまかせ」を先頭に
function seg<V extends string | number>(k: keyof Choice, cur: V | undefined, opts: [V, string][], wide = false): string {
  const b = (v: V | undefined, label: string) => {
    const on = v === cur;
    return `<button type="button" data-k="${k}" data-v="${v === undefined ? '' : esc(String(v))}" class="${on ? 'on' : ''}" aria-pressed="${on}">${esc(label)}</button>`;
  };
  return `<div class="opts${wide ? ' wide' : ''}">${b(undefined, L('おまかせ', 'Random'))}${opts.map(([v, l]) => b(v, l)).join('')}</div>`;
}
const row = (title: string, body: string, note = '') => `<div class="row"><h3>${title}</h3>${body}${note ? `<p class="note">${note}</p>` : ''}</div>`;

function knobs(c: Choice, w: World | null): string {
  const base = c.world === 'random' ? null : WORLDS[c.world];
  const sel = (k: 'danger' | 'war', cur?: number) => `<select data-sel="${k}" aria-label="${k === 'danger' ? L('危険度', 'Danger') : L('戦争', 'War')}">
    <option value="">${L('おまかせ', 'Default')}${base ? ` (${base[k]})` : ''}</option>${Array.from({ length: 11 }, (_, i) => `<option value="${i}" ${cur === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
  const note = base && w ? L(`元の値: 技術${base.tech}・魔法${base.magic}・異能${base.powers}・危険${base.danger}・戦争${base.war}・医療${w.medicine.toFixed(1)}・治安${base.law}`,
    `Base values: tech ${base.tech}, magic ${base.magic}, powers ${base.powers}, danger ${base.danger}, war ${base.war}, medicine ${w.medicine.toFixed(1)}, law ${base.law}`) : '';
  return `<div class="knobs">
    ${row(L('魔法の強さ', 'Magic'), seg('magic', c.magic, LV.map((v) => [v, String(v)])))}
    ${row(L('異能の強さ', 'Powers'), seg('powers', c.powers, LV.map((v) => [v, String(v)])))}
    <div class="row two"><label><h3>${L('危険度', 'Danger')}</h3>${sel('danger', c.danger)}</label><label><h3>${L('戦争', 'War')}</h3>${sel('war', c.war)}</label></div>
  </div><p class="note">${note || L('おまかせの世界では、引いた世界の値に上の変更を重ねる。', 'With a random world, these changes apply on top of whichever world is drawn.')}</p>`;
}

function heroForm(c: Choice, w: World | null): string {
  const sw = w ?? WORLDS.medieval;
  const cheats = cheatsOf(w);
  return `
    ${row(L('種族', 'Race'), seg('race', c.race, racesOf(w).map((r) => [r, T(raceOf(r).name)]), true),
      w ? L('この世界で生まれうる種族。', 'Races that can be born in this world.') : L('世界がおまかせなので、どの種族も選べる。', 'Any race, since the world is random.'))}
    <div class="preview" aria-live="polite">${c.race ? `${faceHTML({ seed: 7, race: c.race, sex: c.sex ?? 'F', stage: 'adult', job: null, status: c.status ?? 'commoner' }, 'face big')}<canvas class="pix sprite" id="pvsprite" width="32" height="48" aria-hidden="true"></canvas>
      <p><b>${esc(T(raceOf(c.race).name))}</b><small>${L(`成人 ${raceOf(c.race).adult}歳・寿命の上限 ${raceOf(c.race).maxAge}歳`, `Adult at ${raceOf(c.race).adult}, at most ${raceOf(c.race).maxAge} years`)}</small></p>` : `<p class="note">${L('種族を選ぶと、顔と立ち絵がここに出る。', 'Pick a race to see a face and figure here.')}</p>`}</div>
    ${row(L('性別', 'Sex'), seg('sex', c.sex, [['F', SEX_NAME.F], ['M', SEX_NAME.M]]))}
    ${row(L('身分', 'Born into'), seg('status', c.status, STATUSES.map((s) => [s, statusName(s, sw)]), true))}
    ${row(L('才能', 'Talent'), seg('talent', c.talent, TALENTS.map((t) => [t, TALENT_NAME[t]])))}
    ${row(L('転生特典', 'Gift'), seg('cheat', c.cheat, [['none', L('なし', 'None')], ...cheats.map((id) => [id, T(CHEATS[id].name)] as [CheatId, string])], true),
      c.cheat && c.cheat !== 'none' ? esc(T(CHEATS[c.cheat].desc)) : w ? L('この世界の魔法と技術で使える特典だけ。', 'Only gifts that work with this world’s magic and technology.') : '')}
    ${row(L('転生の型', 'Arrival'), seg('arrival', c.arrival, ARRIVALS.map((a) => [a, ARRIVAL_NAME[a]])), L('召喚は今の体のまま来る。現地の生まれは前世を持たない。', 'The summoned arrive as they are. The native-born have no past life.'))}
    ${row(L('前世の記憶', 'Memories of a past life'), seg('memory', c.memory, MEMORIES.map((m) => [m, MEMORY_NAME[m]])))}
    <div class="row"><label><h3>${L('名前 (任意)', 'Name (optional)')}</h3><input id="name" maxlength="24" value="${esc(c.name ?? '')}" placeholder="${L('空ならこの世界らしい名前', 'Leave empty for a local name')}" autocomplete="off"></label></div>
    ${row(L('自動で選ぶときの性格', 'When choosing automatically'), seg('policy', c.policy, POLICIES.map((p) => [p, POLICY_NAME[p]])), L('「最後まで」や何回も試すときに、選択肢をどう選ぶか。', 'How choices are made when you skip ahead or run many lives.'))}`;
}

// ---- 設定の画面 -------------------------------------------------------------

export function showSetup(nav: Nav): void {
  const c: Choice = { world: 'random', ...load<Partial<Choice>>(KEY, {}) };
  if (c.world !== 'random' && !WORLD_IDS.includes(c.world)) c.world = 'random';
  const cards = (['random', ...WORLD_IDS] as const).map((id) => `<button type="button" class="wcard" data-world="${id}" aria-pressed="false">
    <canvas class="pix" width="320" height="100" ${id === 'random' ? '' : `data-mini="${id}"`} aria-hidden="true"></canvas><span>${id === 'random' ? L('おまかせ', 'Random') : esc(T(WORLDS[id].name))}</span></button>`).join('');
  screen(`
  <main class="page setup">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('設定して転生', 'Choose your rebirth')}</h1>
    <p class="note">${L('どの項目も「おまかせ」のままでいい。選ばなかったものは生まれるときに決まる。', 'Leave anything on Random. Whatever you skip is decided at birth.')}</p>
    <section class="panel"><h2>${L('世界', 'World')}</h2><div class="worlds">${cards}</div><div id="knobs"></div></section>
    <section class="panel"><h2>${L('主人公', 'You')}</h2><div id="heroform"></div></section>
    <div class="choices sticky"><button class="primary" data-go="start">${L('この設定で転生', 'Be reborn')}</button><button data-go="reset">${L('全部おまかせに戻す', 'Reset all to Random')}</button></div>
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    if (t.closest('[data-go=start]')) { save(KEY, c); return nav.start(toSetup(c)); }
    if (t.closest('[data-go=reset]')) { for (const k of Object.keys(c) as (keyof Choice)[]) delete c[k]; c.world = 'random'; return refresh(); }
    const wb = t.closest<HTMLElement>('[data-world]');
    if (wb) { c.world = wb.dataset.world as Choice['world']; return refresh(); }
    const b = t.closest<HTMLElement>('[data-k]');
    if (b) {
      const k = b.dataset.k as keyof Choice, v = b.dataset.v!;
      const val = v === '' ? undefined : k === 'magic' || k === 'powers' ? Number(v) : v;
      (c as unknown as Record<string, unknown>)[k] = val;
      refresh(`[data-k="${k}"][data-v="${v}"]`);
    }
  });
  const app = document.getElementById('app')!;
  app.querySelectorAll<HTMLCanvasElement>('canvas[data-mini]').forEach((cv) =>
    paintScene({ seed: 11, world: cv.dataset.mini as WorldId, place: 'town', home: 'house', tod: 'day', season: 1, figures: [] }).put(cv));
  app.onchange = (e) => {
    const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-sel]');
    if (s) { const k = s.dataset.sel as 'danger' | 'war'; c[k] = s.value === '' ? undefined : Number(s.value); }
  };
  app.oninput = (e) => { if ((e.target as HTMLElement).id === 'name') c.name = (e.target as HTMLInputElement).value.trim() || undefined; };

  function refresh(focus?: string): void {
    const w = worldOf(c);
    if (c.race && !racesOf(w).includes(c.race)) delete c.race;
    if (c.cheat && c.cheat !== 'none' && !cheatsOf(w).includes(c.cheat)) delete c.cheat;
    app.querySelectorAll<HTMLElement>('[data-world]').forEach((b) => { const on = b.dataset.world === c.world; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    document.getElementById('knobs')!.innerHTML = knobs(c, w);
    document.getElementById('heroform')!.innerHTML = heroForm(c, w);
    paintAll(document.getElementById('heroform')!);
    const sp = document.getElementById('pvsprite') as HTMLCanvasElement | null;
    if (sp && c.race) paintSprite({ seed: 7, race: c.race, sex: c.sex ?? 'F', stage: 'adult', job: null, status: c.status ?? 'commoner' }).put(sp);
    if (focus) app.querySelector<HTMLElement>(focus)?.focus();
  }
  refresh();
}

// ---- 転生の場面 -------------------------------------------------------------

function meeting(h: Hero): string {
  const god = worldNames(h).god;
  const gift = h.cheat ? T(CHEATS[h.cheat].name) : '';
  switch (h.arrival) {
    case 'reborn': return gift
      ? L(`白い何もない場所で、${god}と名乗る女神に会った。「次の世界で困らないように」と「${gift}」を授けられ、意識が遠のいた。`,
        `In a white, empty place, a goddess calling herself ${god} appeared. "So you won't struggle next time," she said, and gave the gift of ${gift}. Then everything faded.`)
      : L(`白い何もない場所で、${god}と名乗る女神に会った。「授けられるものはありません。今度は長く生きて」とだけ言われた。`,
        `In a white, empty place, a goddess calling herself ${god} appeared. "I have nothing to give you," she said. "Just live longer this time."`);
    case 'awaken': return (h.memory === 'none'
      ? L('この世界の子として生まれた。前世のことは、思い出せないまま終わるのかもしれない。', 'Born a child of this world. The past life may never come back.')
      : L('この世界の子として生まれた。前世のことは、まだ思い出していない。', 'Born a child of this world. The past life has not come back yet.'))
      + (gift ? L(`体の奥には「${gift}」が眠っている。`, ` Somewhere inside, ${gift} lies dormant.`) : '');
    case 'summoned': return L('足もとに光る陣が広がり、気づくと見知らぬ神殿に立っていた。神官たちがこちらを見つめている。', 'A circle of light spread underfoot. Then there was a strange temple, and priests staring.')
      + (gift ? L(`自分の中に「${gift}」があるのが分かった。`, ` ${gift} was there, inside, unmistakably.`) : '');
    case 'native': return L(`前世はない。${T(h.world.name)}に生まれた、ただひとりの子。`, `No past life. Just one child born into the ${T(h.world.name)}.`);
  }
}

export function showArrival(h: Hero, asked: Setup, nav: Nav): void {
  const f = h.setup.hero, a = asked.hero, wa = asked.world;
  const rnd = (picked: boolean) => (picked ? '' : `<em>${L('おまかせ', 'random')}</em>`);
  const items: [string, string, boolean][] = [
    [L('世界', 'World'), T(h.world.name), wa.preset !== 'random'],
    [L('魔法・異能', 'Magic, powers'), `${h.world.magic} / ${h.world.powers}`, wa.magic !== undefined && wa.powers !== undefined],
    [L('危険度・戦争', 'Danger, war'), `${h.world.danger} / ${h.world.war}`, wa.danger !== undefined && wa.war !== undefined],
    [L('種族', 'Race'), T(raceOf(h.race).name), !!a.race],
    [L('性別', 'Sex'), SEX_NAME[h.sex], !!a.sex],
    [L('身分', 'Born into'), statusName(h.status, h.world), !!a.status],
    [L('才能', 'Talent'), TALENT_NAME[h.talent], !!a.talent],
    [L('転生特典', 'Gift'), h.cheat ? T(CHEATS[h.cheat].name) : L('なし', 'None'), !!a.cheat],
    [L('転生の型', 'Arrival'), ARRIVAL_NAME[h.arrival], !!a.arrival],
    [L('前世の記憶', 'Memories'), MEMORY_NAME[h.memory], !!a.memory],
    [L('名前', 'Name'), f.name ?? h.given, !!a.name],
    [L('性格', 'Temperament'), POLICY_NAME[h.policy], !!asked.policy],
  ];
  const past = h.past ? L(`前世は${h.past.age}歳の${T(h.past.job)}。${PAST_CAUSE_NAME[h.past.cause]}。`, `In a past life: a ${h.past.age}-year-old ${T(h.past.job)}. ${PAST_CAUSE_NAME[h.past.cause]}.`) : '';
  screen(`
  <main class="page arrival">
    <article class="record">
      <header><span>${L('転生', 'Arrival')}</span><span>${esc(T(h.world.name))}</span></header>
      ${sceneHTML(sceneOf(h), L('生まれた場所', 'Where it begins'))}
      <div class="recbody">
        ${past ? `<p class="kicker">${L('前世の終わり', 'How the last life ended')}</p><p class="lead">${esc(past)}</p>` : ''}
        <p class="story">${esc(meeting(h))}</p>
        <p class="story">${esc(h.log[0]?.text ?? '')}</p>
        <div class="rechead">${faceHTML(heroFigure(h), 'face big')}<div><p class="kicker">${L('名前', 'Name')}</p><h1>${esc(h.name)}</h1></div></div>
        <h3>${L('どう決まったか', 'How it was decided')}</h3>
        <dl class="facts decided">${items.map(([k, v, picked]) => `<div><dt>${esc(k)} ${rnd(picked)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <div class="choices"><button class="primary" data-go="live">${L('人生を始める', 'Begin this life')}</button><button data-go="setup">${L('設定に戻る', 'Back to setup')}</button></div>
      </div>
    </article>
  </main>`, (t) => {
    if (t.closest('[data-go=live]')) return nav.life(h);
    if (t.closest('[data-go=setup]')) return nav.setup();
  });
  paintAll(document.getElementById('app')!);
}
