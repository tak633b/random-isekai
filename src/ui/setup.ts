// 設定の画面 (世界と主人公を選ぶ) と、転生の場面 (前世の終わりと女神/召喚、おまかせの項目がどう決まったか)
import type { Arrival, CheatId, Hero, Level4, MemoryLevel, Policy, RaceId, Setup, Sex, StartAge, Status, Talent, World, WorldId } from '../engine/types';
import { BLESSING, CHEATS, CHEAT_IDS, lifeTableFor, RACE_IDS, STATUSES, TALENTS, WORLDS, WORLD_IDS, availableCheats, makeRng, raceOf, randomSeed, resolveWorld, statusName, worldNames } from '../engine';
import { paintScene } from './scene';
import { paintSprite } from './sprite';
import { faceHTML, sceneHTML, sceneOf, paintAll, heroFigure } from './pixel';
import { ARRIVAL_NAME, MEMORY_NAME, POLICY_NAME, SEX_NAME, TALENT_NAME, ageText, pastEnd } from './labels';
import { buildErrors, buildHTML, listHTML, newBuild, onBuildClick, prune, traitTags, type BuildState } from './build';
import { aiSettingsPanel } from './aipanel';
import { esc, load, save } from './dom';
import { screen, type Nav } from './nav';
import { L, T } from '../i18n';
import { BLESSING_KEY, isSeen, isUnlocked, priceOf, unlock, unlockedChoices } from '../meta/unlocks';
import type { UnlockKey } from '../meta/types';
import { loadProgress } from '../meta/store';
import { randomBuild, allTraits } from '../engine';
import { lockIcon } from './labels';
import { lockedBtn } from './lockbtn';
import { toast } from './toast';

export interface Choice {
  world: WorldId | 'random';
  magic?: Level4; powers?: Level4; danger?: number; war?: number;
  race?: RaceId; sex?: Sex; status?: Status; talent?: Talent; cheat?: CheatId | 'none';
  arrival?: Arrival; memory?: MemoryLevel; name?: string; policy?: Policy;
  blessing?: boolean; startAge?: StartAge; build?: BuildState;
}

const START_AGES: StartAge[] = ['birth', 'child', 'teen', 'adult'];
const START_NAME: Record<StartAge, string> = {
  birth: L('赤ちゃんから', 'From birth'), child: L('子ども (5〜8歳)', 'Child (5–8)'), teen: L('十代 (13〜16歳)', 'Teen (13–16)'), adult: L('大人として召喚・転移 (17〜30歳)', 'Summoned as an adult (17–30)'),
};

const KEY = 'choice';
const LV: Level4[] = [0, 1, 2, 3];
const POLICIES: Policy[] = ['careful', 'normal', 'bold'];
const ARRIVALS: Arrival[] = ['reborn', 'awaken', 'summoned', 'native'];
const MEMORIES: MemoryLevel[] = ['none', 'faint', 'full'];

export function toSetup(c: Choice): Setup {
  const world = { preset: c.world, ...(c.magic !== undefined ? { magic: c.magic } : {}), ...(c.powers !== undefined ? { powers: c.powers } : {}),
    ...(c.danger !== undefined ? { danger: c.danger } : {}), ...(c.war !== undefined ? { war: c.war } : {}) };
  const hero: Setup['hero'] = Object.fromEntries((['race', 'sex', 'status', 'talent', 'cheat', 'arrival', 'memory', 'name', 'startAge'] as const)
    .filter((k) => c[k] !== undefined && c[k] !== '').map((k) => [k, c[k]]));
  if (c.blessing) hero.blessing = true;
  if (c.build?.mode === 'pick') { hero.traits = [...c.build.traits]; hero.points = { ...c.build.points }; }
  // 性格のおまかせはエンジンの既定 (ふつう)
  return { seed: randomSeed(), world, hero, ...(c.policy ? { policy: c.policy } : {}) };
}

// おまかせの項目を、解放したものの中から引いて埋める (エンジンに任せると、まだ解放していないものまで出るため)。
// 引くのは設定の seed から作る別の乱数 (人生の乱数の並びは変えない)
export function fillFromUnlocked(s: Setup, c: Choice): Setup {
  const r = makeRng((s.seed ^ 0x9e3779b9) >>> 0);
  const pick = <T,>(xs: T[], d: T): T => (xs.length ? xs[Math.floor(r() * xs.length)] : d);
  const u0 = unlockedChoices();
  const world = c.world === 'random' ? pick(u0.worlds, 'medieval' as WorldId) : c.world;
  const w = resolveWorld({ ...s.world, preset: world }, makeRng(1));
  const u = unlockedChoices(w);
  const hero = { ...s.hero };
  if (hero.race === undefined) hero.race = pick(u.races.length ? u.races : unlockedChoices().races, 'human' as RaceId);
  if (hero.status === undefined) hero.status = pick(u.statuses, 'commoner' as Status);
  if (hero.cheat === undefined) hero.cheat = r() < 0.12 || !u.cheats.length ? 'none' : pick(u.cheats, 'none' as CheatId | 'none');
  if (hero.traits === undefined) {
    const ok = new Set(unlockedChoices(w, hero.race).traits);
    const b = randomBuild(r, w, hero.race!, {}, allTraits().filter((t) => ok.has(t.id)));
    hero.traits = b.traits; hero.points = b.points;
  }
  return { ...s, world: { ...s.world, preset: world }, hero };
}

// 世界を選んだ後の値 (おまかせなら代表として剣と魔法の中世)
const worldOf = (c: Choice): World | null => (c.world === 'random' ? null : resolveWorld(toSetup(c).world, makeRng(1)));
const racesOf = (w: World | null): RaceId[] => (w ? w.races.filter(([, n]) => n > 0).map(([r]) => r) : RACE_IDS);
const cheatsOf = (w: World | null): CheatId[] => (w ? availableCheats(w).map((x) => x.id) : CHEAT_IDS);

// ---- 部品 -----------------------------------------------------------------

// 一つの項目の選択肢。v が undefined の「おまかせ」を先頭に
function seg<V extends string | number>(k: keyof Choice, cur: V | undefined, opts: [V, string][], wide = false, random = true, keyOf?: (v: V) => UnlockKey | null): string {
  const b = (v: V | undefined, label: string) => {
    const key = v !== undefined && keyOf ? keyOf(v) : null;
    if (key && !isUnlocked(key)) return lockedBtn(key, label);
    const on = v === cur;
    return `<button type="button" data-k="${k}" data-v="${v === undefined ? '' : esc(String(v))}" class="${on ? 'on' : ''}" aria-pressed="${on}">${esc(label)}</button>`;
  };
  return `<div class="opts${wide ? ' wide' : ''}">${random ? b(undefined, L('おまかせ', 'Random')) : ''}${opts.map(([v, l]) => b(v, l)).join('')}</div>`;
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
    ${row(L('種族', 'Race'), seg('race', c.race, racesOf(w).map((r) => [r, T(raceOf(r).name)]), true, true, (r) => `race:${r}`),
      w ? L('この世界で生まれうる種族。', 'Races that can be born in this world.') : L('世界がおまかせなので、どの種族も選べる。', 'Any race, since the world is random.'))}
    <div class="preview" aria-live="polite">${c.race ? `${faceHTML({ seed: 7, race: c.race, sex: c.sex ?? 'F', stage: 'adult', job: null, status: c.status ?? 'commoner' }, 'face big')}<canvas class="pix sprite" id="pvsprite" width="32" height="48" aria-hidden="true"></canvas>
      <p><b>${esc(T(raceOf(c.race).name))}</b><small>${L(`成人 ${raceOf(c.race).adult}歳・寿命の上限 ${raceOf(c.race).maxAge}歳`, `Adult at ${raceOf(c.race).adult}, at most ${raceOf(c.race).maxAge} years`)}</small></p>` : `<p class="note">${L('種族を選ぶと、顔と立ち絵がここに出る。', 'Pick a race to see a face and figure here.')}</p>`}</div>
    ${row(L('性別', 'Sex'), seg('sex', c.sex, [['F', SEX_NAME.F], ['M', SEX_NAME.M]]))}
    ${row(L('身分', 'Born into'), seg('status', c.status, STATUSES.map((s) => [s, statusName(s, sw)]), true, true, (s) => `status:${s}`))}
    ${row(L('才能', 'Talent'), seg('talent', c.talent, TALENTS.map((t) => [t, TALENT_NAME[t]])))}
    ${row(L('転生特典', 'Cheat skill'), seg('cheat', c.cheat, [['none', L('なし', 'None')], ...cheats.map((id) => [id, T(CHEATS[id].name)] as [CheatId | 'none', string])], true, true, (id) => (id === 'none' ? null : `cheat:${id}`)),
      c.cheat && c.cheat !== 'none' ? esc(T(CHEATS[c.cheat].desc)) : w ? L('この世界の魔法と技術で使える特典だけ。', "Only cheat skills that work with this world's magic and technology.") : '')}
    ${row(L('転生の型', 'Arrival'), seg('arrival', c.arrival, ARRIVALS.map((a) => [a, ARRIVAL_NAME[a]])), L('召喚は今の体のまま来る。現地の生まれは前世を持たない。', 'The summoned arrive as they are. The native-born have no past life.'))}
    ${row(L('前世の記憶', 'Memories of a past life'), seg('memory', c.memory, MEMORIES.map((m) => [m, MEMORY_NAME[m]])))}
    ${row(L('始まる年齢', 'Starting age'), seg('startAge', c.startAge, START_AGES.map((a) => [a, START_NAME[a]]), true, true, (a) => `startAge:${a}`), L('おまかせは転生の型どおり (召喚なら大人、ほかは赤ちゃんから)。', 'Random follows the arrival type (adults when summoned, otherwise from birth).'))}
    ${row(L('女神の加護', "Goddess's blessing"), seg('blessing', c.blessing ? '1' : '0', [['0', L('なし', 'No')], ['1', L('あり', 'Yes')]], false, false, (v) => (v === '1' ? BLESSING_KEY : null)), blessingNote(w, c.race))}
    <div class="row"><label><h3>${L('名前 (任意)', 'Name (optional)')}</h3><input id="name" maxlength="24" value="${esc(c.name ?? '')}" placeholder="${L('空ならこの世界らしい名前', 'Leave empty for a local name')}" autocomplete="off"></label></div>
    ${row(L('自動で選ぶときの性格', 'When choosing automatically'), seg('policy', c.policy, POLICIES.map((p) => [p, POLICY_NAME[p]])), L('「最後まで」や何回も試すときに、選択肢をどう選ぶか。', 'How choices are made when you skip ahead or run many lives.'))}`;
}

// 加護の説明。その世界・種族の生命表で、5歳までに亡くなる割合がおよそどう変わるか (5歳までの死はほぼ幼い日の病なので l5 の BLESSING 乗で近似)
function blessingNote(w: World | null, race?: RaceId): string {
  const t = lifeTableFor(w ?? WORLDS.medieval, race ?? 'human');
  const base = 1 - t.l[5], blessed = 1 - t.l[5] ** BLESSING;
  const pc = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
  return L(`成人するまで、病・魔物・事故で亡くなる危険が ${BLESSING}倍になる。${w ? 'この世界' : '剣と魔法の中世'}で5歳までに亡くなる割合が およそ${pc(base)} → ${pc(blessed)}。なしは、その世界の厳しさのまま。`,
    `Until adulthood, the risk of dying from illness, monsters or accidents is ×${BLESSING}. In ${w ? 'this world' : 'the Sword-and-Sorcery Kingdom'}, the share who die before 5 goes from about ${pc(base)} to ${pc(blessed)}. Without it, the world is as harsh as it is.`);
}

// ---- 設定の画面 -------------------------------------------------------------

export function showSetup(nav: Nav): void {
  const c: Choice = { world: 'random', ...load<Partial<Choice>>(KEY, {}) };
  c.build = { ...newBuild(), ...(c.build ?? {}), query: '', more: false };
  let removed: string[] = [];
  if (c.world !== 'random' && !WORLD_IDS.includes(c.world)) c.world = 'random';
  const cards = () => (['random', ...WORLD_IDS] as const).map((id) => {
    const key: UnlockKey | null = id === 'random' ? null : `world:${id}`;
    const locked = key && !isUnlocked(key);
    const name = id === 'random' ? L('おまかせ (解放した世界から)', 'Random (from unlocked worlds)') : T(WORLDS[id].name);
    return `<button type="button" class="wcard${locked ? ' locked' : ''}" ${locked ? `data-unlock="${key}" data-label="${esc(name)}"` : `data-world="${id}"`} aria-pressed="false">
    <canvas class="pix" width="320" height="100" ${id === 'random' ? '' : `data-mini="${id}"`} aria-hidden="true"></canvas><span>${locked ? `${lockIcon()} ` : ''}${esc(name)}${locked ? ` <small class="price${isSeen(key!) ? ' seen' : ''}">${isSeen(key!) ? L('見た・', 'seen · ') : ''}${priceOf(key!)}</small>` : ''}</span></button>`;
  }).join('');
  screen(`
  <main class="page setup">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('設定して転生', 'Choose your rebirth')} <small class="tickets" id="tix">${loadProgress().tickets}${L('枚', ' tickets')}</small></h1>
    <p class="note">${L('どの項目も「おまかせ」のままでいい。選ばなかったものは生まれるときに決まる。', 'Leave anything on Random. Whatever you skip is decided at birth.')}</p>
    <section class="panel"><h2>${L('世界', 'World')}</h2><div class="worlds" id="worlds">${cards()}</div><div id="knobs"></div></section>
    <section class="panel"><h2>${L('主人公', 'You')}</h2><div id="heroform"></div></section>
    <section class="panel"><h2>${L('スキル・能力・加護・体質・弱点', 'Skills, abilities, blessings, constitution, weaknesses')}</h2><div id="build"></div></section>
    <div id="aibox"></div>
    <div class="sticky"><div id="unlockask" role="alertdialog" aria-live="polite" hidden></div><div class="choices"><button class="primary" data-go="start" id="startbtn">${L('この設定で転生', 'Be reborn')}</button><button data-go="reset">${L('全部おまかせに戻す', 'Reset all to Random')}</button></div></div>
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    if (t.closest('[data-go=start]')) { if (buildErrors(c.build!, worldOf(c), c.race).length) return; save(KEY, c); const asked = toSetup(c); return nav.start(fillFromUnlocked(asked, c), false, asked); }
    // 解放: 尋ねてから、チケットを引いて開ける
    const ub = t.closest<HTMLElement>('[data-unlock]');
    if (ub) return askUnlock(ub.dataset.unlock as UnlockKey, ub.dataset.label ?? '');
    const yes = t.closest<HTMLElement>('[data-unlockyes]')?.dataset.unlockyes;
    if (yes) {
      const ok = unlock(yes as UnlockKey);
      document.getElementById('unlockask')!.hidden = true;
      if (ok) { toast(L('解放した', 'Unlocked'), document.querySelector<HTMLElement>('#unlockask b')?.textContent ?? ''); repaintWorlds(); refresh(`[data-v="${yes.split(':')[1]}"]`); }
      return;
    }
    if (t.closest('[data-unlockno]')) { document.getElementById('unlockask')!.hidden = true; return; }
    if (t.closest('[data-go=reset]')) { for (const k of Object.keys(c) as (keyof Choice)[]) delete c[k]; c.world = 'random'; c.build = newBuild(); return refresh(); }
    const bt = t.closest<HTMLElement>('[data-b]');
    if (bt) {
      const what = onBuildClick(bt, c.build!, worldOf(c), c.race);
      const sel = `[data-b="${bt.dataset.b}"]${bt.dataset.k ? `[data-k="${bt.dataset.k}"]` : ''}${bt.dataset.v ? `[data-v="${bt.dataset.v}"]` : ''}`;
      if (what === 'list') { renderList(); app.querySelector<HTMLElement>(sel)?.focus(); }
      else if (what === 'all') refresh(sel);
      return;
    }
    const wb = t.closest<HTMLElement>('[data-world]');
    if (wb) { c.world = wb.dataset.world as Choice['world']; return refresh(); }
    const b = t.closest<HTMLElement>('[data-k]');
    if (b) {
      const k = b.dataset.k as keyof Choice, v = b.dataset.v!;
      const val = k === 'blessing' ? v === '1' : v === '' ? undefined : k === 'magic' || k === 'powers' ? Number(v) : v;
      (c as unknown as Record<string, unknown>)[k] = val;
      refresh(`[data-k="${k}"][data-v="${v}"]`);
    }
  });
  const app = document.getElementById('app')!;
  const paintMini = () => app.querySelectorAll<HTMLCanvasElement>('canvas[data-mini]').forEach((cv) =>
    paintScene({ seed: 11, world: cv.dataset.mini as WorldId, place: 'town', home: 'house', tod: 'day', season: 1, figures: [] }).put(cv));
  paintMini();
  app.onchange = (e) => {
    const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-sel]');
    if (s) { const k = s.dataset.sel as 'danger' | 'war'; c[k] = s.value === '' ? undefined : Number(s.value); }
  };
  app.oninput = (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'name') c.name = el.value.trim() || undefined;
    if (el.id === 'tq') { c.build!.query = el.value; c.build!.more = false; renderList(); const q = document.getElementById('tq') as HTMLInputElement; q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  };
  document.getElementById('aibox')!.append(aiSettingsPanel());

  function renderList(): void {
    const w = worldOf(c), box = app.querySelector<HTMLElement>('.traitpick');
    if (box && w && c.race) box.innerHTML = listHTML(c.build!, w, c.race);
  }

  function askUnlock(key: UnlockKey, label: string): void {
    const box = document.getElementById('unlockask')!;
    const price = priceOf(key) ?? 0, have = loadProgress().tickets;
    box.hidden = false;
    box.innerHTML = have >= price
      ? `<p>${L(`<b>${esc(label)}</b> をチケット${price}枚で解放する? (今${have}枚)`, `Unlock <b>${esc(label)}</b> for ${price} tickets? (You have ${have}.)`)}${isSeen(key) ? `<small>${L('おまかせの人生で見たので半額。', 'Half price: you have seen it in a random life.')}</small>` : ''}</p>
        <div class="choices"><button class="primary" data-unlockyes="${esc(key)}">${L('解放する', 'Unlock')}</button><button data-unlockno="1">${L('やめる', 'Cancel')}</button></div>`
      : `<p>${L(`<b>${esc(label)}</b> の解放にはチケット${price}枚が要る。今${have}枚。`, `<b>${esc(label)}</b> needs ${price} tickets. You have ${have}.`)}</p><div class="choices"><button data-unlockno="1">${L('閉じる', 'Close')}</button></div>`;
    box.querySelector<HTMLElement>('button')?.focus();
  }
  function repaintWorlds(): void {
    document.getElementById('worlds')!.innerHTML = cards();
    paintMini();
    document.getElementById('tix')!.textContent = `${loadProgress().tickets}${L('枚', ' tickets')}`;
  }

  function refresh(focus?: string): void {
    // 解放していないものは選んだままにしない (前に選んだ記録などから)
    if (c.world !== 'random' && !isUnlocked(`world:${c.world}`)) c.world = 'random';
    for (const [k, pre] of [['race', 'race'], ['status', 'status'], ['startAge', 'startAge']] as const) { const v = c[k]; if (v !== undefined && !isUnlocked(`${pre}:${v}` as UnlockKey)) delete c[k]; }
    if (c.cheat && c.cheat !== 'none' && !isUnlocked(`cheat:${c.cheat}`)) delete c.cheat;
    if (c.blessing && !isUnlocked(BLESSING_KEY)) c.blessing = false;
    c.build!.traits = c.build!.traits.filter((id) => isUnlocked(`trait:${id}`));
    const w = worldOf(c);
    if (c.race && !racesOf(w).includes(c.race)) delete c.race;
    if (c.cheat && c.cheat !== 'none' && !cheatsOf(w).includes(c.cheat)) delete c.cheat;
    const gone = prune(c.build!, w, c.race);
    if (gone.length) removed = gone;
    else if (focus && !focus.startsWith('[data-b')) removed = [];
    if (!w || !c.race) c.build!.mode = 'auto';
    document.getElementById('build')!.innerHTML = buildHTML(c.build!, w, c.race, removed);
    const errs = buildErrors(c.build!, w, c.race);
    const start = document.getElementById('startbtn') as HTMLButtonElement;
    start.disabled = errs.length > 0;
    start.title = errs.join(' / ');
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
    [L('転生特典', 'Cheat skill'), h.cheat ? T(CHEATS[h.cheat].name) : L('なし', 'None'), !!a.cheat],
    [L('転生の型', 'Arrival'), ARRIVAL_NAME[h.arrival], !!a.arrival],
    [L('前世の記憶', 'Memories'), MEMORY_NAME[h.memory], !!a.memory],
    [L('始まる年齢', 'Starting age'), ageText(h.age), !!a.startAge],
    [L('女神の加護', "Goddess's blessing"), h.blessing ? L('あり', 'Yes') : L('なし', 'No'), true],
    [L('名前', 'Name'), f.name ?? h.given, !!a.name],
    [L('性格', 'Temperament'), POLICY_NAME[h.policy], !!asked.policy],
  ];
  const end = h.past ? pastEnd(h.past.cause, h.arrival === 'summoned', h.seed).text : '';
  const past = h.past ? L(`前世は${h.past.age}歳の${T(h.past.job)}。${end}。`, `In a past life: a ${h.past.age}-year-old ${T(h.past.job)}. ${end}`) : '';
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
        ${h.traits.length || h.blessing ? `<h3>${L(`持って生まれたもの${a.traits ? '' : ' (おまかせ)'}`, `Born with${a.traits ? '' : ' (random)'}`)}</h3>${traitTags(h.traits, h.blessing)}` : ''}
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
