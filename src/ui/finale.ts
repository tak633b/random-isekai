// 最期の場面: 死亡記録の前に、静かに一生をふり返る。最後の場面の絵 → 主な出来事を一つずつ (関わった人の顔と) →
// 称号と身分の歩み → そばにいた人 → 最後の一行。笑いは入れない。元の世界へ帰った人は、温かい別の言い方で。
// 読める速さで進み (字数で待つ)、押すと次へ、「記録を見る」でいつでも死亡記録へ
import type { Hero, LogEntry } from '../engine/types';
import { summary } from '../engine';
import { faceHTML, heroFigure, paintAll, sceneHTML, sceneOf, tieFigure } from './pixel';
import { ROLE_NAME, climbText, endAge, titlesOf } from './labels';
import { screen } from './nav';
import { esc } from './dom';
import { isEn, L } from '../i18n';

const readMs = (text: string) => Math.max(2200, (isEn ? text.trim().split(/\s+/).length * 250 : [...text].length * 70) + 1200);

export function showFinale(h: Hero, done: () => void): void {
  const s = summary(h);
  const home = h.death?.hazard === 'return';
  const moments: LogEntry[] = s.highlights.slice(-6);
  const faces = (e: LogEntry) => (e.who ?? []).map((id) => h.people.find((t) => t.id === id)).filter((t) => !!t).slice(0, 3)
    .map((t) => `<span class="fn-who">${faceHTML(tieFigure(h, t!), 'face small')}<small>${esc(t!.name)}</small></span>`).join('');
  const titles = titlesOf(h);
  const climb = climbText(h);
  const by = s.lastWith;
  const last = home
    ? L(`${h.given}は、元の世界へ帰っていった。この世界には、${by.length ? `${by.map((t) => t.name).join('、')}たちと過ごした日々が` : '過ごした日々が'}残った。`,
      `${h.given} went home, to the world {he} came from. ${by.length ? `The days with ${by.map((t) => t.name).join(', ')} stayed behind in this one.` : 'The days lived here stayed behind.'}`.replace('{he}', h.sex === 'F' ? 'she' : 'he'))
    : by.length
      ? L(`最後まで、${by[0].name}がそばにいた。${h.given}の${h.age}年が、静かに閉じた。`, `${by[0].name} stayed until the end. ${h.given}'s ${h.age} years came quietly to a close.`)
      : L(`${h.given}の${h.age}年が、静かに閉じた。`, `${h.given}'s ${h.age} years came quietly to a close.`);

  screen(`
  <main class="page finale${home ? ' home' : ''}">
    <button class="fn-skip" data-fn="skip">${L('記録を見る ▸▸', 'See the record ▸▸')}</button>
    <section class="fn-step" id="fn-0">
      ${sceneHTML(sceneOf(h, by), L('最後の場面', 'The last scene'))}
      <div class="fn-name">${faceHTML(heroFigure(h), 'face big')}<div><h1>${esc(h.name)}</h1><p class="age">${endAge(h.age, h.death?.hazard)}</p></div></div>
      ${s.text ? `<p class="fn-cause">${esc(s.text)}</p>` : ''}
    </section>
    ${moments.map((e, i) => `<section class="fn-step fn-moment" id="fn-m${i}"><span class="fn-age">${L(`${e.age}歳`, `Age ${e.age}`)}</span><p>${esc(e.text)}</p><div class="fn-whos">${faces(e)}</div></section>`).join('')}
    ${titles.length || climb ? `<section class="fn-step" id="fn-t">${climb ? `<p class="climb">${esc(climb)}</p>` : ''}${titles.map((t) => `<span class="title">${esc(t)}</span>`).join(' ')}</section>` : ''}
    ${by.length ? `<section class="fn-step" id="fn-by"><p class="kicker">${home ? L('見送った人', 'Who saw them off') : L('最期にそばにいた人', 'Who was there at the end')}</p><div class="fn-whos">${by.map((t) => `<span class="fn-who">${faceHTML(tieFigure(h, t), 'face small')}<small>${esc(t.name)}<br>${esc(ROLE_NAME[t.role] ?? '')}</small></span>`).join('')}</div></section>` : ''}
    <section class="fn-step fn-last" id="fn-end"><p>${esc(last)}</p><button class="primary" data-fn="skip">${L('死亡記録へ', 'To the record')}</button></section>
  </main>`, (t) => (t.closest('[data-fn=skip]') ? finish() : next()), { back: () => finish(), esc: false, bar: false });
  const root = document.querySelector<HTMLElement>('main.finale')!;
  paintAll(root);

  let over = false;
  let wake: (() => void) | null = null;
  function finish(): void { if (over) return; over = true; wake?.(); document.removeEventListener('keydown', key); done(); }
  function next(): void { wake?.(); }
  function key(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); finish(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
  }
  document.addEventListener('keydown', key);
  const wait = (ms: number) => new Promise<void>((ok) => { if (over) return ok(); const id = window.setTimeout(() => { wake = null; ok(); }, ms); wake = () => { clearTimeout(id); wake = null; ok(); }; });
  const steps = [...root.querySelectorAll<HTMLElement>('.fn-step')];
  void (async () => {
    for (const st of steps) {
      if (over) return;
      st.classList.add('on');
      st.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (st.id !== 'fn-end') await wait(readMs(st.textContent ?? ''));
    }
  })();
}
