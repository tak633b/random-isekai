import './style.css';
import type { SceneSpec, Setup } from './engine/types';
import { WORLD_IDS, createHero, randomSeed } from './engine';
import { paintAll, sceneHTML } from './ui/pixel';
import { records, showPast } from './ui/records';
import { showArrival, showSetup } from './ui/setup';
import { showReveal } from './ui/reveal';
import { resumeLife, savedLife, showLife } from './ui/life';
import { showDeath } from './ui/death';
import { showFinale } from './ui/finale';
import { showTrials } from './ui/trials';
import { showMemorial } from './ui/memorial';
import { showHandover } from './ui/lineage';
import { screen, type Nav } from './ui/nav';
import { hash } from './ui/raster';
import { esc } from './ui/dom';
import { isEn, L, T, lang, setLang } from './i18n';
import { ageText, lockIcon } from './ui/labels';
import { adHTML } from './ui/ads';
import { exposeDev, loadProgress } from './meta/store';
import { pendingSoul, soulNames, takeSoul } from './meta/soul';
import { CUSTOM, isUnlocked, priceOf, unlock } from './meta/unlocks';
import { setRandom } from './ui/mode';
import { showAchievements, showCollection } from './ui/collection';
import { toast } from './ui/toast';
import { accountClick, accountHTML, paintAccount } from './ui/account';
import { accountEnabled, initAccount } from './net/account';
import { initMusic, musicControl, musicEnd, musicLife, musicReveal, musicScene } from './ui/music';
import { sfx } from './ui/sfx';

document.documentElement.lang = lang;
if (isEn) {
  document.title = 'Random Isekai';
  document.querySelector('meta[name=description]')?.setAttribute('content', 'Be reborn into a random other world and live one whole life, year by year, to the end.');
}

const nav: Nav = {
  title,
  setup: () => showSetup(nav),
  start(setup: Setup, random = false, asked?: Setup) {
    // 魂に刻まれたものを、この転生の始まりに一度だけ受け取る (meta/soul.ts)。前の setup に残っているものは使わない
    const h = createHero({ ...setup, hero: { ...setup.hero, soul: takeSoul() ?? undefined } });
    setRandom(h, random);
    const a = asked ?? setup;
    musicReveal();
    // 演出のあと (飛ばしても) 転生の場面へ。戻るは、おまかせならタイトル、設定したなら設定へ
    showReveal(h, a, () => showArrival(h, a, nav), random ? title : nav.setup);
  },
  life: (h, resumed) => showLife(h, nav, resumed),
  death: (h) => { musicEnd(h); sfx(h.death?.hazard === 'return' ? 'portal' : 'soul'); showFinale(h, () => showDeath(h, nav)); }, // 最期の場面のあとに死亡記録
  trials: (setup) => showTrials(setup, nav),
  past: (focus) => showPast(nav, focus),
  handover: (prev, h) => { musicLife(h); showHandover(prev, h, nav); },
  memorial: (id) => showMemorial(nav, id),
  collection: () => showCollection(nav),
  achievements: () => showAchievements(nav),
};
exposeDev(); // 開発ビルドでだけ window.__ri (本番では何もしない)
void initAccount(); // ログイン済みなら記録の同期を始める (ログインを出さないビルドでは何もしない)
initMusic(); // ♪ BGM (既定は切。タイトルと一生の画面に置く)

function title(): void {
  const s = randomSeed();
  const world = WORLD_IDS[hash(s) % WORLD_IDS.length];
  const spec: SceneSpec = { seed: s, world, place: (['town', 'temple', 'field', 'castle', 'wild'] as const)[hash(s, 1) % 5], home: 'house', tod: (['morning', 'day', 'dusk', 'night'] as const)[hash(s, 2) % 4], season: (hash(s, 3) % 4) as SceneSpec['season'], figures: [] };
  const n = records().length;
  const cur = savedLife();
  musicScene('title');
  screen(`
  <main class="page title">
    <div class="topctl">${musicControl()}<div class="langsw" role="group" aria-label="Language"><button data-lang="ja" class="${lang === 'ja' ? 'on' : ''}" lang="ja" aria-pressed="${lang === 'ja'}">日本語</button><button data-lang="en" class="${lang === 'en' ? 'on' : ''}" lang="en" aria-pressed="${lang === 'en'}">English</button></div></div>
    <div class="titlescene">${sceneHTML(spec, L('どこかの異世界', 'Some other world'))}</div>
    <h1 class="logo">Random <span>Isekai</span></h1>
    <p class="subtitle">${L('どの異世界に、何として生まれるかは選べない。', "You don't get to choose which world, or what you are born as.")}</p>
    <p class="lead">${L('剣と魔法の中世、和の国、ネオンの巨大都市、文明の後。16の異世界のどこかに生まれ直し、一年ずつ最後まで生きる。生き死には、その世界の生命表と、種族・身分・職業・転生特典の倍率で決まる。死んだときは、なぜそうなったかを数字で書く。',
      'A sword-and-sorcery kingdom, a land of samurai, a neon megacity, the world after the fall. Be reborn into one of 16 other worlds and live one year at a time, to the very end. Whether you survive each year comes from that world’s life table, weighed by race, birth, trade and the gift you were given. When you die, the numbers behind it are written down.')}</p>
    <div class="choices big">
      ${cur ? `<button class="primary" data-go="resume">${L('続きから', 'Continue')} <small>${esc(cur.name)}${L('・', ', ')}${ageText(cur.age)}${L('・', ', ')}${esc(T(cur.world.name))}</small></button>` : ''}
      <button class="${cur ? '' : 'primary'}" data-go="random">${L('完全ランダムで転生', 'Reborn at random')}</button>
      ${setupButton()}
      <button data-go="past">${L('過去の人生', 'Past lives')}${n ? ` <small>${n}</small>` : ''}</button>
      <button data-go="memorial">${L('追悼館', 'Memorial')}</button>
      <button data-go="collection">${L('図鑑', 'Collection')} <small>${loadProgress().tickets}${L('枚', ' tickets')}</small></button>
      <button data-go="achievements">${L('実績', 'Achievements')}</button>
    </div>
    ${soulHint()}
    <div id="unlockask" role="alertdialog" aria-live="polite" hidden></div>
    ${accountHTML()}
    <p class="note">${L(`絵も人生もその場で作る。${accountEnabled ? '記録はこの端末に残る (ログインすると、チケット・解放・図鑑・実績はアカウントにも)。' : '記録はこの端末にだけ残る。'}幼い子の死や戦争など重い出来事も、その世界の確率どおりに起きる。`, `Every picture and life is made on the spot. ${accountEnabled ? 'Records stay on this device (sign in to also keep tickets, unlocks, collection and achievements in your account).' : 'Records stay on this device only.'} Hard things, like children dying or war, happen at that world’s odds.`)}</p>
    ${adHTML('title')}
    <footer class="note legal"><a href="about.html${isEn ? '#en' : ''}">${L('このゲームについて', 'About')}</a> · <a href="privacy.html${isEn ? '#en' : ''}">${L('プライバシー', 'Privacy')}</a> · <a href="terms.html${isEn ? '#en' : ''}">${L('利用規約', 'Terms')}</a> · <a href="contact.html${isEn ? '#en' : ''}">${L('お問い合わせ', 'Contact')}</a></footer>
  </main>`, (t) => {
    if (accountClick(t)) return;
    const lg = t.closest<HTMLElement>('[data-lang]')?.dataset.lang;
    if ((lg === 'ja' || lg === 'en') && lg !== lang) return setLang(lg);
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go === 'resume') { const h = resumeLife(); return h ? nav.life(h, true) : title(); }
    if (go === 'random') nav.start({ seed: randomSeed(), world: { preset: 'random' }, hero: {} }, true);
    if (go === 'setup') return isUnlocked(CUSTOM) ? nav.setup() : askCustom();
    if (go === 'opencustom') { if (unlock(CUSTOM)) { nav.setup(); toast(L('「設定して転生」を開けた', '"Choose your rebirth" is open')); } return; }
    if (go === 'nocustom') { document.getElementById('unlockask')!.hidden = true; return; }
    if (go === 'collection') nav.collection();
    if (go === 'achievements') nav.achievements();
    if (go === 'past') nav.past();
    if (go === 'memorial') nav.memorial();
  });
  paintAll(document.getElementById('app')!);
  paintAccount();
}

// 魂に刻まれて、次の転生を待っているもの
function soulHint(): string {
  const c = pendingSoul();
  if (!c) return '';
  const names = soulNames(c);
  return `<p class="soulhint">${esc(L(`${c.from}の魂に刻まれた${names}が、次の転生を待っている。`, `${names} etched into ${c.from}'s soul waits for your next rebirth.`))}</p>`;
}

// 「設定して転生」: 閉じているあいだは鍵とチケットの進み具合 (例 6/10)
function setupButton(): string {
  if (isUnlocked(CUSTOM)) return `<button data-go="setup">${L('設定して転生', 'Choose your rebirth')}</button>`;
  const need = priceOf(CUSTOM) ?? 10, have = Math.min(need, loadProgress().tickets);
  return `<button data-go="setup" class="locked" aria-describedby="custnote">${lockIcon()} ${L('設定して転生', 'Choose your rebirth')} <small id="custnote">${have}/${need}</small></button>`;
}
function askCustom(): void {
  const box = document.getElementById('unlockask')!;
  const need = priceOf(CUSTOM) ?? 10, have = loadProgress().tickets;
  box.hidden = false;
  box.innerHTML = have >= need
    ? `<p>${L(`チケット${need}枚で「設定して転生」を開ける? (今${have}枚)。開けると、中世・人間・赤ちゃんから・平民と、ふつうの能力12個が最初から使える。`, `Open "Choose your rebirth" for ${need} tickets? (You have ${have}.) It comes with the medieval world, humans, birth start, commoner status and 12 ordinary traits.`)}</p>
      <div class="choices"><button class="primary" data-go="opencustom">${L('開ける', 'Open it')}</button><button data-go="nocustom">${L('やめる', 'Cancel')}</button></div>`
    : `<p>${L(`「設定して転生」はチケット${need}枚で開く。今${have}枚。おまかせで転生して最後まで生きると、チケットがもらえる。`, `"Choose your rebirth" opens for ${need} tickets. You have ${have}. Live a random rebirth to the end to earn tickets.`)}</p>
      <div class="choices"><button data-go="nocustom">${L('閉じる', 'Close')}</button></div>`;
  box.querySelector<HTMLElement>('button')?.focus();
}

title();
