// ステータス画面 (ゲームのステータス窓のような)。一生の画面の顔と、死亡記録の「ステータスを見る」から開く。
// 値は meta/sheet.ts が主人公から読むだけ (人生は変えない)。Esc・「閉じる」・ブラウザの戻るで閉じる (nav.ts がダイアログを先に閉じる)
import type { Hero } from '../engine/types';
import { sheetOf, type Sheet } from '../meta/sheet';
import { faceHTML, heroFigure, paintAll } from './pixel';
import { esc } from './dom';
import { L } from '../i18n';

const bar = (v: number, max: number, cls: string) => `<i class="sbar ${cls}"><b style="width:${max ? Math.min(100, (v / max) * 100).toFixed(1) : 0}%"></b></i>`;
const sec = (title: string, body: string, open = true) => (body ? `<details class="ssec"${open ? ' open' : ''}><summary>${title}</summary>${body}</details>` : '');
const KIND: Record<string, [string, string]> = { skill: ['スキル', 'Skill'], ability: ['能力', 'Ability'], blessing: ['加護', 'Blessing'], constitution: ['体質', 'Trait'], weakness: ['弱点', 'Weakness'] };

export function sheetHTML(s: Sheet, h: Hero): string {
  const head = `<div class="shead">${faceHTML(heroFigure(h), 'face big')}<div>
    <h2 id="sheettitle">${esc(s.name)}</h2>
    <p>${esc(s.race)}${L('・', ' · ')}${s.sex === 'F' ? L('女', 'Female') : L('男', 'Male')}${L('・', ' · ')}${L(`${s.age}歳`, `age ${s.age}`)}${s.heq !== s.age ? L(`(人間でいえば${s.heq}歳)`, ` (about ${s.heq} in human years)`) : ''}</p>
    <p>${esc(s.standing)}${s.job ? `${L('・', ' · ')}${esc(s.job)}` : ''}${s.rank ? `${L('・ランク', ' · Rank ')}${esc(s.rank)}` : ''}</p>
    <p class="lv">Lv <b>${s.level}</b> ${L('作戦', 'Tactics')}: ${esc(s.tactic)}</p></div></div>`;
  const vit = `<div class="svit"><div><span>HP</span>${bar(s.hp.now, s.hp.max, 'hp')}<em>${s.hp.now}/${s.hp.max}</em></div>
    ${s.mp ? `<div><span>MP</span>${bar(1, 1, 'mp')}<em>${s.mp.max === null ? '∞' : s.mp.max}</em></div>` : ''}</div>`;
  const attrs = `<ul class="sattr">${s.attrs.map((a) => `<li><span>${esc(a.label)}</span>${bar(a.v, 100, 'at')}<em>${a.v}</em></li>`).join('')}</ul>`;
  const skills = s.skills.length || s.cheat || s.blessing ? `<ul class="sskill">
    ${s.cheat ? `<li class="cheat"><b>${esc(s.cheat.name)}</b><small>${L('転生特典・', 'Cheat skill · ')}${esc(s.cheat.desc)}</small></li>` : ''}
    ${s.blessing ? `<li class="cheat"><b>${L('女神の加護', "Goddess's blessing")}</b></li>` : ''}
    ${s.skills.map((k) => `<li><b>${esc(k.name)}</b><small>${L(...KIND[k.kind])}${k.learned ? L('・鍛えて身につけた', ' · learned in this life') : ''}</small></li>`).join('')}</ul>` : '';
  const fights = s.kills.length || s.battles.lost ? `<p>${L(`勝った戦い ${s.battles.won}・傷を負って勝った ${s.battles.hurt}・負けた ${s.battles.lost}`, `Won ${s.battles.won} · won but wounded ${s.battles.hurt} · lost ${s.battles.lost}`)}</p>
    ${s.strongest ? `<p>${L('倒した中でいちばんの強敵', 'Strongest foe defeated')}: <b>${esc(s.strongest.name)}</b> ${'◆'.repeat(s.strongest.danger)}</p>` : ''}
    <ul class="kills">${s.kills.map((k) => `<li><span>${esc(k.name)}</span><em>×${k.n}</em></li>`).join('')}</ul>` : '';
  const story = [
    s.climb ? `<p>${L('身分の歩み', 'Rise and fall')}: ${esc(s.climb)}</p>` : `<p>${L('生まれ', 'Born into')}: ${esc(s.born)}</p>`,
    s.titles.length ? `<p>${L('称号', 'Titles')}: ${s.titles.map((t) => `<span class="title">${esc(t)}</span>`).join(' ')}</p>` : '',
    s.training ? `<p>${L('今の鍛え方', 'Current training')}: ${esc(s.training.label)}${s.training.prog !== undefined ? ` (${s.training.prog}%)` : ''}</p>` : '',
    s.revives.left || s.revives.used ? `<p>${L(`死の取り消し 残り${s.revives.left}回`, `Death undone: ${s.revives.left} left`)}${s.revives.used ? L('(使ったことがある)', ' (used before)') : ''}</p>` : '',
    s.items.length ? `<p>${L('元の世界から持ってきた物', 'Brought from the old world')}: ${esc(s.items.join(L('・', ', ')))}</p>` : '',
    s.companions.length ? `<p>${L('そばにいる人', 'At your side')}: ${s.companions.map((c) => `${esc(c.name)} <small>(${esc(c.role)})</small>`).join(L('、', ', '))}</p>` : '',
  ].join('');
  return `${head}${vit}${sec(L('能力', 'Attributes'), attrs)}${sec(L('スキル・特典', 'Skills and gifts'), skills)}${sec(L('戦いの記録', 'Battle record'), fights, false)}${sec(L('歩み', 'Story so far'), story)}`;
}

export function openSheet(h: Hero): void {
  const back = document.createElement('div');
  back.className = 'modal-back sheetmodal';
  back.innerHTML = `<div class="modal sheet" role="dialog" aria-modal="true" aria-labelledby="sheettitle">
    <div class="modalhead"><button class="close" data-x="close">${L('閉じる', 'Close')}</button></div>${sheetHTML(sheetOf(h), h)}</div>`;
  const prev = document.activeElement as HTMLElement | null;
  const close = () => { back.remove(); document.removeEventListener('keydown', key); prev?.focus(); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  back.onclick = (e) => { const t = e.target as HTMLElement; if (t === back || t.closest('[data-x=close]')) close(); };
  document.addEventListener('keydown', key);
  document.body.append(back);
  paintAll(back);
  back.querySelector<HTMLElement>('[data-x=close]')?.focus();
}
