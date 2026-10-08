import './style.css';
import type { SceneSpec, Setup } from './engine/types';
import { WORLD_IDS, createHero, randomSeed } from './engine';
import { paintAll, sceneHTML } from './ui/pixel';
import { records, showPast } from './ui/records';
import { showArrival, showSetup } from './ui/setup';
import { resumeLife, savedLife, showLife } from './ui/life';
import { showDeath } from './ui/death';
import { showTrials } from './ui/trials';
import { screen, type Nav } from './ui/nav';
import { hash } from './ui/raster';
import { esc } from './ui/dom';
import { isEn, L, T, lang, setLang } from './i18n';
import { ageText } from './ui/labels';

document.documentElement.lang = lang;
if (isEn) {
  document.title = 'Random Isekai';
  document.querySelector('meta[name=description]')?.setAttribute('content', 'Be reborn into a random other world and live one whole life, year by year, to the end.');
}

const nav: Nav = {
  title,
  setup: () => showSetup(nav),
  start(setup: Setup) { showArrival(createHero(setup), setup, nav); },
  life: (h) => showLife(h, nav),
  death: (h) => showDeath(h, nav),
  trials: (setup) => showTrials(setup, nav),
  past: () => showPast(nav),
};

function title(): void {
  const s = randomSeed();
  const world = WORLD_IDS[hash(s) % WORLD_IDS.length];
  const spec: SceneSpec = { seed: s, world, place: (['town', 'temple', 'field', 'castle', 'wild'] as const)[hash(s, 1) % 5], home: 'house', tod: (['morning', 'day', 'dusk', 'night'] as const)[hash(s, 2) % 4], season: (hash(s, 3) % 4) as SceneSpec['season'], figures: [] };
  const n = records().length;
  const cur = savedLife();
  screen(`
  <main class="page title">
    <div class="langsw" role="group" aria-label="Language"><button data-lang="ja" class="${lang === 'ja' ? 'on' : ''}" lang="ja" aria-pressed="${lang === 'ja'}">日本語</button><button data-lang="en" class="${lang === 'en' ? 'on' : ''}" lang="en" aria-pressed="${lang === 'en'}">English</button></div>
    <div class="titlescene">${sceneHTML(spec, L('どこかの異世界', 'Some other world'))}</div>
    <h1 class="logo">Random <span>Isekai</span></h1>
    <p class="subtitle">${L('どの異世界に、何として生まれるかは選べない。', 'You don’t get to choose which world, or what you are born as.')}</p>
    <p class="lead">${L('剣と魔法の中世、和の国、ネオンの巨大都市、文明の後。16の異世界のどこかに生まれ直し、一年ずつ最後まで生きる。生き死には、その世界の生命表と、種族・身分・職業・転生特典の倍率で決まる。死んだときは、なぜそうなったかを数字で書く。',
      'A sword-and-sorcery kingdom, a land of samurai, a neon megacity, the world after the fall. Be reborn into one of 16 other worlds and live one year at a time, to the very end. Whether you survive each year comes from that world’s life table, weighed by race, birth, trade and the gift you were given. When you die, the numbers behind it are written down.')}</p>
    <div class="choices big">
      ${cur ? `<button class="primary" data-go="resume">${L('続きから', 'Continue')} <small>${esc(cur.name)}${L('・', ', ')}${ageText(cur.age)}${L('・', ', ')}${esc(T(cur.world.name))}</small></button>` : ''}
      <button class="${cur ? '' : 'primary'}" data-go="random">${L('完全ランダムで転生', 'Reborn at random')}</button>
      <button data-go="setup">${L('設定して転生', 'Choose your rebirth')}</button>
      <button data-go="past">${L('過去の人生', 'Past lives')}${n ? ` <small>${n}</small>` : ''}</button>
    </div>
    <p class="note">${L('絵も人生もその場で作る。記録はこの端末にだけ残る。幼い子の死や戦争など重い出来事も、その世界の確率どおりに起きる。', 'Every picture and life is made on the spot. Records stay on this device only. Hard things, like children dying or war, happen at that world’s odds.')}</p>
  </main>`, (t) => {
    const lg = t.closest<HTMLElement>('[data-lang]')?.dataset.lang;
    if ((lg === 'ja' || lg === 'en') && lg !== lang) return setLang(lg);
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go === 'resume') { const h = resumeLife(); return h ? nav.life(h) : title(); }
    if (go === 'random') nav.start({ seed: randomSeed(), world: { preset: 'random' }, hero: {} });
    if (go === 'setup') nav.setup();
    if (go === 'past') nav.past();
  });
  paintAll(document.getElementById('app')!);
}

title();
