// 転生の演出: 前世の終わり → 声 → 世界 → 種族と生まれ → 転生特典・加護・持って生まれたもの → 名前。
// 結果は主人公 (Hero) がもう持っている。ここは見せ方だけで、人生の乱数には触らない (回る候補は seed から作る別の乱数)。
// 押す・Enter・Space・Esc で最後へ飛ぶ。動きを減らす設定なら回さずに速く出す。終わったら転生の場面 (setup.ts の showArrival)
import type { Hero, Setup, Status, TraitDef } from '../engine/types';
import { CHEATS, RACE_IDS, WORLD_IDS, WORLDS, availableCheats, cheatWeight, makeRng, raceOf, statusName, traitOf } from '../engine';
import { faceHTML, heroFigure, paintAll, sceneHTML, sceneOf } from './pixel';
import { TALENT_NAME } from './labels';
import { meeting, pastLine } from './setup';
import { itemName } from '../engine/transfer';
import { screen } from './nav';
import { esc } from './dom';
import { isEn, L, T } from '../i18n';

type Rarity = 'common' | 'rare' | 'legend' | 'curse';
const RARITY: Record<Rarity, string> = {
  common: L('よくある', 'Common'), rare: L('まれ', 'Rare'), legend: L('伝説', 'Legendary'), curse: L('試練', 'Hardship'),
};
const MAGIC = [L('魔法のない', 'no magic'), L('魔法はまれ', 'rare magic'), L('魔法が職になる', 'magic as a trade'), L('魔法が戦を決める', 'magic that wins wars')];
const POWERS = [L('異能なし', 'no powers'), L('異能はまれ', 'rare powers'), L('異能者がいる', 'some with powers'), L('誰もが異能', 'powers everywhere')];

const statusRarity = (s: Status): Rarity => (s === 'royal' || s === 'noble' ? 'legend' : s === 'gentry' || s === 'merchant' ? 'rare' : s === 'slave' || s === 'orphan' ? 'curse' : 'common');
const traitRarity = (cost: number): Rarity => (cost < 0 ? 'curse' : cost >= 4 ? 'legend' : cost >= 2 ? 'rare' : 'common');
const cheatRarity = (w: number): Rarity => (w <= 1 ? 'legend' : w <= 4 ? 'rare' : 'common');
const tag = (r: Rarity) => `<small class="rv-rar">${RARITY[r]}</small>`;

/** 演出を流して、終わったら (または飛ばしたら) done。back はブラウザの戻る */
export function showReveal(h: Hero, asked: Setup, done: () => void, back: () => void): void {
  const a = asked.hero, wa = asked.world;
  const quick = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spinRng = makeRng((h.seed ^ 0x51ed270b) >>> 0); // 見せるための候補だけ (人生の乱数とは別)
  const raceShare = (() => { const all = h.world.races.reduce((s, [, n]) => s + n, 0); return (h.world.races.find(([r]) => r === h.race)?.[1] ?? 0) / (all || 1); })();
  const raceRar: Rarity = raceShare < 0.05 ? 'legend' : raceShare < 0.2 ? 'rare' : 'common';
  const cheat = h.cheat ? CHEATS[h.cheat] : null;
  const cheatRar: Rarity = h.cheat ? cheatRarity(cheatWeight(h.cheat)) : 'curse';
  const traits = h.traits.filter((id) => !h.soul?.traits.includes(id)).map(traitOf).filter((t): t is TraitDef => !!t);
  // 前世から魂に刻まれて引き継いだもの (meta/soul.ts)。授けられたものの前に、光る札で
  const soulDefs = (h.soul?.traits ?? []).map(traitOf).filter((t): t is TraitDef => !!t);
  const picked = `<small class="rv-pick">${L('選んだ', 'Your pick')}</small>`;
  const past = pastLine(h);
  const tf = h.transfer; // 異世界転移: 魔法陣か、角を曲がるか。種族と生まれは回さず、元の世界の自分を出す
  const voice = tf ? h.log[0]?.text ?? '' : meeting(h);
  const born = L(`${statusName(h.status, h.world)}の家に、${h.sex === 'F' ? '女の子' : '男の子'}として`, `Into a ${statusName(h.status, h.world).toLowerCase()} family, as a ${h.sex === 'F' ? 'girl' : 'boy'}`);

  screen(`
  <main class="page reveal" aria-live="polite">
    <button class="rv-skip" data-rv="skip">${L('スキップ ▸▸', 'Skip ▸▸')}</button>
    <p class="rv-next" id="rv-next">${L('次へ ▸ (押す・Enter)', 'Next ▸ (tap or Enter)')}</p>
    <section class="rv-stage" id="rv-void">
      ${tf ? `<div class="rv-circle${tf.how === 'vanish' ? ' rv-corner' : ''}" aria-hidden="true"></div>` : ''}
      ${past ? `<p class="rv-past">${esc(past)}</p>` : ''}
      <p class="rv-voice">${esc(voice)}</p>
    </section>
    <section class="rv-stage" id="rv-world">
      <p class="kicker">${L('生まれ変わる世界', 'The world you are born into')} ${wa.preset !== 'random' ? picked : ''}</p>
      <h2 class="rv-spin" id="rv-wn">&nbsp;</h2>
      <div class="rv-scene">${sceneHTML(sceneOf(h), L('生まれた場所', 'Where it begins'))}</div>
      <p class="rv-sub">${esc(`${MAGIC[h.world.magic]}${L('・', ' · ')}${POWERS[h.world.powers]}${L('・', ' · ')}${L('危険', 'danger')} ${h.world.danger}/10${L('・', ' · ')}${L('戦', 'war')} ${h.world.war}/10`)}</p>
    </section>
    <section class="rv-stage" id="rv-born">
      <p class="kicker">${tf ? L('元の世界の、あなた', 'You, as you were back home') : `${L('種族', 'Race')} ${a.race ? picked : ''}`}</p>
      <h2 class="rv-spin rv-${tf ? 'common' : raceRar}" id="rv-rn">&nbsp;</h2>
      ${tf ? `<p class="rv-line" id="rv-st">${esc(L(`${h.past?.age ?? h.age}歳・${T(tf.job)}`, `${h.past?.age ?? h.age}, ${T(tf.job).toLowerCase()}`))}<br><small>${esc(L(`持ってきた物: ${tf.items.map(itemName).join('・')}`, `In the pockets: ${tf.items.map(itemName).join(', ')}`))}</small></p>`
        : `<p class="rv-line rv-${statusRarity(h.status)}" id="rv-st">${esc(born)} ${tag(statusRarity(h.status))}</p>`}
      <p class="rv-line" id="rv-ta">${L('才能', 'Talent')}: <b>${esc(TALENT_NAME[h.talent])}</b></p>
    </section>
    ${h.soul ? `<section class="rv-stage" id="rv-soul">
      <p class="kicker">${L('前世から引き継いだもの', 'Carried over from a past life')}</p>
      <div class="rv-card rv-legend rv-soulcard" id="rv-sc"><small>${esc(L(`${h.soul.from}の魂に刻まれていた`, `Etched into ${h.soul.from}'s soul`))}</small>
        ${soulDefs.map((t) => `<h2>${esc(T(t.name))}</h2><p>${esc(T(t.desc))}</p>`).join('')}
        ${h.soul.cheat ? `<h2>${esc(T(CHEATS[h.soul.cheat].name))}</h2><p>${esc(T(CHEATS[h.soul.cheat].desc))}</p>` : ''}</div>
    </section>` : ''}
    <section class="rv-stage" id="rv-gift">
      <p class="kicker">${L('授けられたもの', 'What you were given')}</p>
      ${tf ? `<div class="rv-card rv-common" id="rv-lang"><small>${L('転移の定番', 'Standard issue')}</small><h2>${L('言語理解', 'Language comprehension')}</h2><p>${L('なぜか言葉が分かる。文字はまだ読めない。', 'Somehow you understand the language. Reading it is another matter.')}</p></div>` : ''}
      <div class="rv-card rv-${cheatRar}" id="rv-cheat"><small>${tf ? L('授かった力', 'Gifted power') : L('転生特典', 'Cheat skill')} ${a.cheat ? picked : ''}</small><h2 class="rv-spin" id="rv-cn">&nbsp;</h2>
        <p id="rv-cd">${cheat ? `${esc(T(cheat.desc))} ${tag(cheatRar)}` : L('何も授からなかった。', 'Nothing was given.')}</p></div>
      ${h.blessing ? `<div class="rv-card rv-legend rv-bless" id="rv-bl"><small>${L('女神の加護', "Goddess's blessing")}</small><h2>${L('加護を受けた', 'Blessed')}</h2><p>${L('大人になるまで、命を守る光がそばにある。', 'Until you grow up, a light keeps watch over you.')}</p></div>` : ''}
      <ul class="rv-traits">${traits.map((t, i) => `<li class="rv-card rv-${traitRarity(t.cost)}" id="rv-t${i}"><b>${esc(T(t.name))}</b> ${tag(traitRarity(t.cost))}<small>${esc(T(t.desc))}</small></li>`).join('')}</ul>
    </section>
    <section class="rv-stage" id="rv-name">
      ${faceHTML(heroFigure(h), 'face big')}
      <p class="kicker">${L('この世界での名前', 'Your name in this world')}</p>
      <h1>${esc(h.name)}</h1>
    </section>
  </main>`, (t) => (t.closest('[data-rv=skip]') ? finish() : next()), { back: () => { stop(); back(); }, esc: false, bar: false });
  const root = document.querySelector<HTMLElement>('main.reveal')!;
  paintAll(root);

  // 読める速さで進める: 文は字数 (日本語 70ms/字・英語 250ms/語) + 1.2秒、短くても2秒は残す。
  // 世界と授かったものの後は、押す (Enter) まで待つ。押すと今の待ちを終えて次へ。スキップ (Esc) で最後へ
  let over = false;
  let wake: (() => void) | null = null;
  const $ = (id: string) => document.getElementById(id);
  const stop = () => { over = true; wake?.(); document.removeEventListener('keydown', key); };
  function finish(): void { if (over) return; stop(); done(); }
  function next(): void { wake?.(); }
  function key(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
  }
  document.addEventListener('keydown', key);
  // ms 待つ (押されたら早く終わる)。tap: true なら押されるまで待つ
  const wait = (ms: number, tap = false) => new Promise<void>((ok) => {
    if (over) return ok();
    const hint = $('rv-next');
    if (tap) hint?.classList.add('on');
    const id = tap ? 0 : window.setTimeout(() => { wake = null; ok(); }, ms);
    wake = () => { clearTimeout(id); wake = null; hint?.classList.remove('on'); ok(); };
  });
  const readMs = (text: string) => Math.max(2000, (isEn ? text.trim().split(/\s+/).length * 250 : [...text].length * 70) + 1200);
  const stage = (id: string) => { root.querySelectorAll('.rv-stage.on').forEach((x) => x.classList.remove('on')); $(id)?.classList.add('on'); };
  const show = (id: string) => $(id)?.classList.add('on');
  const textOf = (id: string) => $(id)?.textContent ?? '';
  // 名札が速く回って、だんだん遅くなって止まる。選んだものと動きを減らす設定は回さない (待ちは押しても縮まない短い演出)
  const spin = async (id: string, pool: string[], last: string, spinning: boolean, ms: number) => {
    const el = $(id)!;
    if (spinning && !quick && pool.length >= 2) {
      for (let w = 40, sum = 0; sum < ms && !over; w *= 1.2) {
        el.textContent = pool[Math.floor(spinRng() * pool.length)];
        await new Promise((ok) => setTimeout(ok, w));
        sum += w;
      }
    }
    el.textContent = last;
    el.classList.add('land');
  };

  void (async () => {
    stage('rv-void');
    if (past) { root.querySelector('.rv-past')?.classList.add('on'); await wait(readMs(past)); }
    root.querySelector('.rv-voice')?.classList.add('on');
    await wait(readMs(voice));
    if (over) return;
    stage('rv-world');
    await spin('rv-wn', WORLD_IDS.map((w) => T(WORLDS[w].name)), T(h.world.name), wa.preset === 'random', 1000);
    root.querySelector('#rv-world .rv-scene')?.classList.add('on');
    root.querySelector('#rv-world .rv-sub')?.classList.add('on');
    await wait(0, true);
    if (over) return;
    stage('rv-born');
    await spin('rv-rn', RACE_IDS.map((r) => T(raceOf(r).name)), tf ? h.name : T(raceOf(h.race).name), !a.race && !tf, 700);
    show('rv-st'); show('rv-ta');
    await wait(readMs(textOf('rv-st') + textOf('rv-ta')));
    if (over) return;
    if (h.soul) {
      stage('rv-soul');
      $('rv-sc')?.classList.add('landed');
      await wait(0, true);
      if (over) return;
    }
    stage('rv-gift');
    if (tf) { show('rv-lang'); await wait(1500); }
    await spin('rv-cn', availableCheats(h.world).map((c) => T(c.name)), cheat ? T(cheat.name) : L('なし', 'None'), !a.cheat && !h.soul?.cheat, 1000);
    show('rv-cd'); $('rv-cheat')?.classList.add('landed');
    await wait(readMs(textOf('rv-cd')));
    if (h.blessing) { show('rv-bl'); await wait(1500); }
    for (let i = 0; i < traits.length && !over; i++) { show(`rv-t${i}`); await wait(900); }
    await wait(0, true);
    if (over) return;
    stage('rv-name');
    await wait(2500);
    finish();
  })();
}
