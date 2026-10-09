// 画面どうしの行き来。各画面は Nav を受け取って次の画面を呼ぶ (画面のファイルどうしが互いを import しないように)
import type { Hero, Setup } from '../engine/types';

export interface Nav {
  title(): void;
  setup(): void;
  start(setup: Setup): void;      // 主人公を作って転生の場面へ
  life(h: Hero, resumed?: boolean): void;
  death(h: Hero): void;
  trials(setup: Setup): void;
  past(): void;
  memorial(id?: number): void;  // 共有の追悼館 (id があればその1件)
}

export const app = (): HTMLElement => document.getElementById('app')!;

// 画面を入れ替えて先頭へ。クリックは1つの onclick で data-* を見て振り分ける
export function screen(html: string, onClick: (t: HTMLElement, e: MouseEvent) => void): void {
  const el = app();
  el.innerHTML = html;
  el.onclick = (e) => onClick(e.target as HTMLElement, e);
  window.scrollTo(0, 0);
}
