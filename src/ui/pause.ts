// ひと息の画面 (engine/reflect.ts の問い)。一行のメモを残すか、書かずに続ける。
// 自動で決める・速いとき (timed) は 7秒で書かずに続く。書きはじめたら止まる。「これからは聞かない」はこの端末に残す
import type { Hero } from '../engine/types';
import { heqOf } from '../engine';
import { keepNote, NOTE_MAX, pauseQuestion } from '../engine/reflect';
import { esc, load, save } from './dom';
import { L } from '../i18n';

const OFF = 'pauseOff';
export const PAUSE_SEC = 7;
export const pauseOff = (): boolean => load<boolean>(OFF, false);

/** 問いを出す。閉じたら (残しても書かなくても) done */
export function openPause(h: Hero, at: number, timed: boolean, done: () => void): void {
  const q = pauseQuestion(h, at);
  const heq = Math.round(heqOf(h));
  const back = document.createElement('div');
  back.className = 'modal-back pause';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ptitle">
    <p class="kicker">${L(`ひと息・${h.age}歳`, `A pause · age ${h.age}`)}${heq !== h.age ? L(`(人間でいえば${heq}歳)`, ` (about ${heq} in human years)`) : ''}</p>
    <h2 id="ptitle">${esc(q)}</h2>
    <label class="field"><span class="vh">${L('一行のメモ', 'A one-line note')}</span><textarea id="pnote" maxlength="${NOTE_MAX}" rows="2" placeholder="${L('一行だけ (書かなくてもいい)', 'One line, if you like. Or nothing at all.')}"></textarea></label>
    <div class="choices"><button class="primary" data-p="keep">${L('残して続ける', 'Keep it and go on')}</button><button data-p="skip">${L('書かずに続ける', 'Go on without writing')}</button></div>
    <label class="check"><input type="checkbox" id="poff"> ${L('これからは聞かない', "Don't ask again")}</label>
    <p class="note" id="ptimer" aria-live="off"></p>
    <p class="note">${L('残した言葉は、死亡記録に載る。', 'Whatever you write will appear in the record of this life.')}</p></div>`;
  (document.getElementById('app') ?? document.body).append(back);
  const ta = back.querySelector<HTMLTextAreaElement>('#pnote')!;
  const timer = back.querySelector<HTMLElement>('#ptimer')!;
  let left = PAUSE_SEC, tick = 0, closed = false;
  const close = (keep: boolean) => {
    if (closed) return;
    closed = true;
    window.clearInterval(tick);
    keepNote(h, at, q, keep ? ta.value : '');
    if (back.querySelector<HTMLInputElement>('#poff')!.checked) save(OFF, true);
    back.remove();
    done();
  };
  const stopTimer = () => { if (!tick) return; window.clearInterval(tick); tick = 0; timer.textContent = ''; };
  if (timed) {
    const show = () => { timer.textContent = L(`${left}秒で続く (書きはじめると止まる)`, `Continues in ${left}s (stops once you start typing)`); };
    show();
    tick = window.setInterval(() => { if (!back.isConnected) return window.clearInterval(tick); if (--left <= 0) close(false); else show(); }, 1000);
  }
  ta.addEventListener('input', stopTimer);
  ta.addEventListener('focus', () => { if (ta.value) stopTimer(); });
  back.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('[data-p]')?.dataset.p;
    if (p) { e.stopPropagation(); close(p === 'keep' && !!ta.value.trim()); }
  });
  back.addEventListener('keydown', (e) => {
    e.stopPropagation(); // 人生の画面の数字キー・Esc に渡さない
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'Enter' && !e.shiftKey && e.target === ta) { e.preventDefault(); close(!!ta.value.trim()); }
  });
  (timed ? back.querySelector<HTMLElement>('[data-p=skip]')! : ta).focus();
}
