// 系譜: 亡くなった主人公の輪の人を次の主人公にして続ける。何代目か・前の代の名前の並び・引き継ぎの場面。
// エンジンの continueAs / Hero.lineage を使う (無ければこの画面の部品は出さない)
import type { Hero, Lineage, Tie } from '../engine/types';
import { continueAs as engineContinueAs } from '../engine';
import { reincarnatorsOf } from '../engine/reincarnators';
import { castOf, faceHTML, sceneHTML, tieFigure, paintAll } from './pixel';
import { ROLE_NAME, ageText } from './labels';
import { records, type LifeRecord } from './records';
import { esc } from './dom';
import { screen, type Nav } from './nav';
import { L, T } from '../i18n';

export const lineageOf = (h: Hero): Lineage | undefined => h.lineage;
export const genOf = (h: Hero): number => h.lineage?.gen ?? 1;
export const genWord = (g: number): string => L(`第${g}代`, `Generation ${g}`);

// 記録に残す系譜 (過去の人生の一覧でまとめ、前の代の記録を探すため)
export type RecordLineage = { gen: number; rootSeed: number; names: string[] };
export function recordLineage(h: Hero): RecordLineage | undefined {
  const l = lineageOf(h);
  return l ? { gen: l.gen, rootSeed: l.rootSeed, names: l.ancestors.map((a) => a.name) } : undefined;
}

// 前の代の記録の番号 (過去の人生の一覧の中)。残っていなければ -1
export function ancestorRecord(list: LifeRecord[], l: RecordLineage, gen: number): number {
  // 初代の記録には系譜が無いので、その人生の seed で見分ける
  return list.findIndex((r) => (r.lineage?.rootSeed ?? r.setup.seed) === l.rootSeed && (r.lineage?.gen ?? 1) === gen);
}

// 「第3代: アルト → リナ → 今の人」。前の代は記録が残っていれば押せる (data-record)
export function lineageHTML(l: RecordLineage | undefined, self: string): string {
  if (!l || l.gen <= 1) return '';
  const list = records();
  const names = l.names.map((n, i) => {
    const at = ancestorRecord(list, l, i + 1);
    const label = `${esc(genWord(i + 1))} ${esc(n)}`;
    return at >= 0 ? `<button class="whobtn" data-record="${at}">${label}</button>` : `<span>${label}</span>`;
  });
  return `<p class="lineage"><b>${esc(genWord(l.gen))}</b>${names.join('<i aria-hidden="true">→</i>')}<i aria-hidden="true">→</i><span class="me">${esc(self)}</span></p>`;
}

// 続けられる人: 主人公の死の時点で生きていて、離れていない 子・連れ合い・きょうだい・仲間・弟子・従魔・会った転生者
const HEIRS: Tie['role'][] = ['child', 'spouse', 'sibling', 'companion', 'disciple', 'familiar'];
export function heirsOf(h: Hero): { t: Tie; key: string; reinc: boolean }[] {
  if (h.alive) return [];
  const met = new Map(reincarnatorsOf(h).filter((p) => p.tieId !== undefined).map((p) => [p.tieId!, p.id]));
  return h.people.filter((t) => t.alive && t.until === undefined && (HEIRS.includes(t.role) || met.has(t.id)))
    .sort((a, b) => HEIRS.indexOf(a.role) - HEIRS.indexOf(b.role) || b.bond - a.bond)
    .map((t) => (met.has(t.id) ? { t, key: `r:${met.get(t.id)}`, reinc: true } : { t, key: `t:${t.id}`, reinc: false }));
}

// 死亡記録の「この人で続ける」の欄
export function heirsHTML(h: Hero): string {
  const hs = heirsOf(h);
  if (!hs.length) return '';
  return `<section class="panel heirs"><h2>${L('この人で続ける', 'Continue as someone else')}</h2>
    <p class="note">${L(`${esc(h.given)}の死から1年後、その人の年齢から、その人として生きる。`, `Pick up one year after ${esc(h.given)}'s death, living on as them.`)}</p>
    <ul class="heirlist">${hs.map(({ t, key, reinc }) => `<li>${faceHTML(tieFigure(h, t))}<span><b>${esc(t.name)}</b><small>${esc(ROLE_NAME[t.role])}${reinc ? L('・転生者', ' · reincarnator') : ''}${L('・', ' · ')}${ageText(t.age + 1)}</small></span>
      <button data-heir="${esc(key)}" data-name="${esc(t.name)}" data-age="${t.age + 1}">${L('この人で続ける', 'Continue as them')}</button></li>`).join('')}</ul>
    <div id="heirask" role="alertdialog" aria-live="polite" hidden></div></section>`;
}

// 確かめのひと言を出す。はいなら onYes
export function askHeir(btn: HTMLElement): void {
  const box = document.getElementById('heirask')!;
  box.hidden = false;
  box.innerHTML = `<p>${esc(L(`${btn.dataset.name}として、${btn.dataset.age}歳から続けます。`, `You will go on as ${btn.dataset.name}, from age ${btn.dataset.age}.`))}</p>
    <div class="choices"><button class="primary" data-heirgo="${esc(btn.dataset.heir!)}">${L('続ける', 'Continue')}</button><button data-heirno="1">${L('やめる', 'Cancel')}</button></div>`;
  box.querySelector<HTMLElement>('[data-heirgo]')?.focus();
}

export function continueAs(prev: Hero, key: string): Hero | null {
  try { return engineContinueAs(prev, key); } catch { return null; }
}

// 引き継ぎの場面: 「〇〇の死から1年。〇〇は〇〇歳になっていた」
export function showHandover(prev: Hero, h: Hero, nav: Nav): void {
  const l = lineageOf(h);
  screen(`
  <main class="page arrival handover">
    <article class="record">
      <header><span>${esc(genWord(l?.gen ?? 2))}</span><span>${esc(T(h.world.name))}</span></header>
      ${sceneHTML(castOf(h).spec, L('引き継ぎの場面', 'Handing on'))}
      <div class="recbody">
        <p class="story">${esc(L(`${prev.given}の死から1年。${h.given}は${h.age}歳になっていた。`, `A year after ${prev.given} died, ${h.given} was ${h.age}.`))}</p>
        ${lineageHTML(recordLineage(h), h.name)}
        <div class="choices"><button class="primary" data-go="live">${L('人生を続ける', 'Live on')}</button></div>
      </div>
    </article>
  </main>`, (t) => { if (t.closest('[data-go=live]')) nav.life(h); });
  paintAll(document.getElementById('app')!);
  document.querySelector<HTMLElement>('[data-go=live]')?.focus();
}
