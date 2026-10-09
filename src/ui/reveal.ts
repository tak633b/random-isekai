// 転生の演出: 前世の終わり → 声 → 世界 → 種族と生まれ → 転生特典・加護・持って生まれたもの → 名前。
// 結果は主人公 (Hero) がもう持っている。ここは見せ方だけで、人生の乱数には触らない (回る候補は seed から作る別の乱数)。
// 押す・Enter・Space・Esc で最後へ飛ぶ。動きを減らす設定なら回さずに速く出す。終わったら転生の場面 (setup.ts の showArrival)
import type { Hero, Setup, Status, TraitDef } from '../engine/types';
import { CHEATS, RACE_IDS, WORLD_IDS, WORLDS, availableCheats, cheatWeight, makeRng, raceOf, statusName, traitOf } from '../engine';
import { faceHTML, heroFigure, paintAll, sceneHTML, sceneOf } from './pixel';
import { TALENT_NAME } from './labels';
import { meeting, pastLine } from './setup';
import { screen } from './nav';
import { esc } from './dom';
import { L, T } from '../i18n';

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
  const traits = h.traits.map(traitOf).filter((t): t is TraitDef => !!t);
  const picked = `<small class="rv-pick">${L('選んだ', 'Your pick')}</small>`;
  const past = pastLine(h);
  const born = L(`${statusName(h.status, h.world)}の家に、${h.sex === 'F' ? '女の子' : '男の子'}として`, `Into a ${statusName(h.status, h.world).toLowerCase()} family, as a ${h.sex === 'F' ? 'girl' : 'boy'}`);

  screen(`
  <main class="page reveal" aria-live="polite">
    <p class="rv-skip">${L('押す・Enter で飛ばす', 'Tap or press Enter to skip')}</p>
    <section class="rv-stage" id="rv-void">
      ${past ? `<p class="rv-past">${esc(past)}</p>` : ''}
      <p class="rv-voice">${esc(meeting(h))}</p>
    </section>
    <section class="rv-stage" id="rv-world">
      <p class="kicker">${L('生まれ変わる世界', 'The world you are born into')} ${wa.preset !== 'random' ? picked : ''}</p>
      <h2 class="rv-spin" id="rv-wn">&nbsp;</h2>
      <div class="rv-scene">${sceneHTML(sceneOf(h), L('生まれた場所', 'Where it begins'))}</div>
      <p class="rv-sub">${esc(`${MAGIC[h.world.magic]}${L('・', ' · ')}${POWERS[h.world.powers]}${L('・', ' · ')}${L('危険', 'danger')} ${h.world.danger}/10${L('・', ' · ')}${L('戦', 'war')} ${h.world.war}/10`)}</p>
    </section>
    <section class="rv-stage" id="rv-born">
      <p class="kicker">${L('種族', 'Race')} ${a.race ? picked : ''}</p>
      <h2 class="rv-spin rv-${raceRar}" id="rv-rn">&nbsp;</h2>
      <p class="rv-line rv-${statusRarity(h.status)}" id="rv-st">${esc(born)} ${tag(statusRarity(h.status))}</p>
      <p class="rv-line" id="rv-ta">${L('才能', 'Talent')}: <b>${esc(TALENT_NAME[h.talent])}</b></p>
    </section>
    <section class="rv-stage" id="rv-gift">
      <p class="kicker">${L('授けられたもの', 'What you were given')}</p>
      <div class="rv-card rv-${cheatRar}" id="rv-cheat"><small>${L('転生特典', 'Cheat skill')} ${a.cheat ? picked : ''}</small><h2 class="rv-spin" id="rv-cn">&nbsp;</h2>
        <p id="rv-cd">${cheat ? `${esc(T(cheat.desc))} ${tag(cheatRar)}` : L('何も授からなかった。', 'Nothing was given.')}</p></div>
      ${h.blessing ? `<div class="rv-card rv-legend rv-bless" id="rv-bl"><small>${L('女神の加護', "Goddess's blessing")}</small><h2>${L('加護を受けた', 'Blessed')}</h2><p>${L('大人になるまで、命を守る光がそばにある。', 'Until you grow up, a light keeps watch over you.')}</p></div>` : ''}
      <ul class="rv-traits">${traits.map((t, i) => `<li class="rv-card rv-${traitRarity(t.cost)}" id="rv-t${i}"><b>${esc(T(t.name))}</b> ${tag(traitRarity(t.cost))}<small>${esc(T(t.desc))}</small></li>`).join('')}</ul>
    </section>
    <section class="rv-stage" id="rv-name">
      ${faceHTML(heroFigure(h), 'face big')}
      <p class="kicker">${L('この世界での名前', 'Your name in this world')}</p>
      <h1>${esc(h.name)}</h1>
    </section>
  </main>`, () => finish(), { back: () => { stop(); back(); }, esc: false, bar: false });
  const root = document.querySelector<HTMLElement>('main.reveal')!;
  paintAll(root);

  const timers: number[] = [];
  let over = false;
  const $ = (id: string) => document.getElementById(id);
  const stop = () => { over = true; timers.forEach(clearTimeout); document.removeEventListener('keydown', key); };
  function finish(): void { if (over) return; stop(); done(); }
  function key(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); }
  }
  document.addEventListener('keydown', key);

  let t = 0;
  const at = (ms: number, f: () => void) => { t += quick ? Math.min(ms, 120) : ms; const when = t; timers.push(window.setTimeout(() => { if (!over) f(); }, when)); };
  const stage = (id: string) => { root.querySelectorAll('.rv-stage.on').forEach((s) => s.classList.remove('on')); $(id)?.classList.add('on'); };
  const show = (id: string) => $(id)?.classList.add('on');
  // 名札が速く回って、だんだん遅くなって止まる。選んだものと動きを減らす設定は回さない
  const spin = (id: string, pool: string[], last: string, spinning: boolean, ms: number) => {
    const el = $(id)!;
    if (!spinning || quick || pool.length < 2) { at(0, () => { el.textContent = last; el.classList.add('land'); }); return; }
    const waits: number[] = [];
    for (let w = 40, sum = 0; sum < ms; w *= 1.2) { waits.push(w); sum += w; }
    waits.forEach((w, i) => {
      const end = i === waits.length - 1;
      at(w, () => { el.textContent = end ? last : pool[Math.floor(spinRng() * pool.length)]; if (end) el.classList.add('land'); });
    });
  };

  // 合わせて 9〜10 秒ほど
  at(80, () => { stage('rv-void'); root.querySelector('.rv-past')?.classList.add('on'); });
  at(past ? 600 : 100, () => root.querySelector('.rv-voice')?.classList.add('on'));
  at(1100, () => stage('rv-world'));
  spin('rv-wn', WORLD_IDS.map((w) => T(WORLDS[w].name)), T(h.world.name), wa.preset === 'random', 1000);
  at(100, () => { root.querySelector('#rv-world .rv-scene')?.classList.add('on'); root.querySelector('#rv-world .rv-sub')?.classList.add('on'); });
  at(800, () => stage('rv-born'));
  spin('rv-rn', RACE_IDS.map((r) => T(raceOf(r).name)), T(raceOf(h.race).name), !a.race, 700);
  at(200, () => show('rv-st'));
  at(250, () => show('rv-ta'));
  at(700, () => stage('rv-gift'));
  spin('rv-cn', availableCheats(h.world).map((c) => T(c.name)), cheat ? T(cheat.name) : L('なし', 'None'), !a.cheat, 1000);
  at(100, () => { show('rv-cd'); $('rv-cheat')?.classList.add('landed'); });
  if (h.blessing) at(350, () => show('rv-bl'));
  const gap = Math.min(220, 900 / (traits.length || 1)); // 多くても1秒ほどに収める
  traits.forEach((_, i) => at(i ? gap : 350, () => show(`rv-t${i}`)));
  at(900, () => stage('rv-name'));
  at(1200, finish);
}
