// 画面どうしの行き来。各画面は Nav を受け取って次の画面を呼ぶ (画面のファイルどうしが互いを import しないように)
import type { Hero, Setup } from '../engine/types';
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

// 画面を入れ替えて先頭へ。クリックは1つの onclick で data-* を見て振り分ける
export function screen(html: string, onClick: (t: HTMLElement, e: MouseEvent) => void): void {
  const el = app();
  clearToasts();
  el.innerHTML = html;
  el.onclick = (e) => onClick(e.target as HTMLElement, e);
  window.scrollTo(0, 0);
}
