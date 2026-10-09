// 画面どうしの行き来。各画面は Nav を受け取って次の画面を呼ぶ (画面のファイルどうしが互いを import しないように)
// 戻り方は1つにまとめる: 画面の「← 戻る」(上と下)・Esc・ブラウザの戻る は、どれもその画面の back を呼ぶ。
// 履歴はタイトルの上に1段だけ積む (どの画面でもブラウザの戻るは「その画面の戻る」。進むは使わない)
import type { Hero, Setup } from '../engine/types';
import { L } from '../i18n';
import { clearToasts } from './toast';

export interface Nav {
  title(): void;
  setup(): void;
  start(setup: Setup, random?: boolean, asked?: Setup): void; // 主人公を作って転生の場面へ。random はおまかせ転生 (チケットが出る)。asked は「どう決まったか」の元の選び方
  life(h: Hero, resumed?: boolean): void;
  handover(prev: Hero, h: Hero): void; // 輪の人として続ける (引き継ぎの場面)
  death(h: Hero): void;
  trials(setup: Setup): void;
  past(focus?: number): void;  // focus はその記録を開いた状態で
  memorial(id?: number): void;  // 共有の追悼館 (id があればその1件)
  collection(): void;           // 図鑑 (チケット・解放・魔物・出会い)
  achievements(): void;         // 実績
}

export const app = (): HTMLElement => document.getElementById('app')!;

export interface ScreenOpts {
  back?: () => void;  // 戻る先。無い画面 (タイトル) は履歴を積まない
  label?: string;     // 「← 戻る」の文字。既定は「← タイトルへ」
  esc?: boolean;      // Esc で戻るか (既定 true。遊んでいる途中や演出は自分でキーを扱う)
  bar?: boolean;      // 「← 戻る」のボタンを上と下に置くか (既定 true。一生の画面は自分の「中断」を使う)
}

let back: (() => void) | null = null;
let esc = true;
let skipPop = 0;
const IN = 'ri-in';

function push(): void {
  try { if (history.state !== IN) history.pushState(IN, ''); } catch { /* 履歴が使えなくても画面の戻るは効く */ }
}

/** 画面の中で戻る先が変わったとき (追悼館の1件 → 一覧 など) */
export function setBack(f: (() => void) | null): void {
  back = f;
  if (f) push();
}

// 開いているダイアログ (人の一生・選択肢) があれば、それを閉じるのが先
const openModal = (): HTMLElement | null => document.querySelector<HTMLElement>('.modal-back:not([hidden])');

// 画面を入れ替えて先頭へ。クリックは1つの onclick で data-* を見て振り分ける。button.back は戻る
export function screen(html: string, onClick: (t: HTMLElement, e: MouseEvent) => void, opts: ScreenOpts = {}): void {
  const el = app();
  clearToasts();
  el.innerHTML = html;
  back = opts.back ?? null;
  esc = opts.esc ?? true;
  if (back && opts.bar !== false) {
    const main = el.querySelector('main');
    const label = opts.label ?? L('← タイトルへ', '← Back to title');
    if (main && !main.querySelector(':scope > button.back')) main.insertAdjacentHTML('afterbegin', `<button class="back">${label}</button>`);
    main?.insertAdjacentHTML('beforeend', `<p class="backbar"><button class="back">${label}</button></p>`);
  }
  if (back) push();
  else if (history.state === IN) {
    skipPop++;
    history.back();
  }
  el.onclick = (e) => {
    const t = e.target as HTMLElement;
    if (back && t.closest('button.back')) return back();
    onClick(t, e);
  };
  window.scrollTo(0, 0);
  // 読み上げとキーボードのために、新しい画面の見出しへ
  const h1 = el.querySelector<HTMLElement>('h1');
  if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof history !== 'undefined') {
  // 戻ったときのスクロールはブラウザに戻させない (画面は作り直して先頭から)
  try { history.scrollRestoration = 'manual'; } catch { /* 古いブラウザ */ }
  addEventListener('popstate', () => {
    if (skipPop) { skipPop--; return; }
    const m = openModal();
    if (m) { push(); m.querySelector<HTMLElement>('[data-x=close], .close')?.click(); return; }
    back?.();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !back || !esc || openModal()) return;
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [role=alertdialog]:not([hidden])')) return;
    e.preventDefault();
    back();
  });
}
