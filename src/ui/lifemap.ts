// 一生の地図: 1マス = 1年。その年の色 (Hero.kinds) で塗る。人生の画面では生きた年のあとに寿命の目安まで空のマスを並べ、
// 死亡記録では生きた年だけ。マスを押すと年表のその年へ (data-jump。画面の側がいつもどおり受け取る)
import type { YearKind } from '../engine/types';
import { KIND_NAME } from './labels';
import { esc } from './dom';
import { L } from '../i18n';

// 記録に残すときの1文字 (LifeRecord.kinds)。分からない年は '.'
const CODE: Record<YearKind, string> = {
  arrival: 'a', child: 'c', school: 's', adventure: 'v', battle: 'b', work: 'w', love: 'l', family: 'f',
  loss: 'x', ill: 'i', power: 'p', fame: 'm', hard: 'h', old: 'o', death: 'd',
};
const KIND_OF = Object.fromEntries(Object.entries(CODE).map(([k, c]) => [c, k as YearKind])) as Record<string, YearKind>;
export const encodeKinds = (kinds: readonly (YearKind | undefined)[], upto: number): string =>
  Array.from({ length: upto + 1 }, (_, a) => (kinds[a] ? CODE[kinds[a]!] : '.')).join('');

// 暗い地に見分けやすい色。似た種類は近い色に (戦い・苦しい年・病は赤から茶、恋と家族は桃から朱)
export const MAP_COLOR: Record<YearKind, string> = {
  arrival: '#b98cf0', child: '#d9cba0', school: '#8cc48a', adventure: '#e8b44a', battle: '#d86a5a', work: '#5f9a6a', love: '#f0a0c0',
  family: '#e0857a', loss: '#6f6888', ill: '#c98a4b', power: '#7cc4d8', fame: '#f5dd84', hard: '#9b5148', old: '#a59ab8', death: '#ede4d0',
};
const EMPTY = '#2a2640', GAP = 1;

export const mapCols = (n: number): number => (n <= 120 ? 10 : n <= 400 ? 20 : 40);
const cellOf = (n: number): number => (n <= 120 ? 12 : n <= 400 ? 8 : 5);

/** 地図を描く。code は1年1文字、span は空のマスも含めて並べる年数 (省略 = 生きた年だけ)。ctx を渡せば (x, y) から描く (共有の画像用) */
export function drawLifeMap(target: HTMLCanvasElement | CanvasRenderingContext2D, code: string, span = code.length, at: [number, number] = [0, 0], cell?: number): { w: number; h: number } {
  const n = Math.max(code.length, Math.ceil(span));
  const cols = mapCols(n), c = cell ?? cellOf(n), rows = Math.ceil(n / cols);
  const w = cols * (c + GAP) - GAP, h = rows * (c + GAP) - GAP;
  let g: CanvasRenderingContext2D;
  if ('getContext' in target) {
    target.width = w; target.height = h;
    g = target.getContext('2d')!;
  } else g = target;
  const [x0, y0] = at;
  for (let a = 0; a < n; a++) {
    const k = KIND_OF[code[a]];
    g.fillStyle = a < code.length ? (k ? MAP_COLOR[k] : EMPTY) : EMPTY;
    const x = x0 + (a % cols) * (c + GAP), y = y0 + Math.floor(a / cols) * (c + GAP);
    if (a < code.length) g.fillRect(x, y, c, c);
    else { g.globalAlpha = 0.45; g.fillRect(x, y, c, c); g.globalAlpha = 1; }
  }
  return { w, h };
}

/** 地図の絵と凡例 (出てくる種類だけ)。描くのは paintLifeMaps */
export function lifeMapHTML(code: string, span?: number, id = ''): string {
  const seen = [...new Set(code.replace(/\./g, ''))].map((c) => KIND_OF[c]).filter(Boolean);
  const order = Object.keys(CODE) as YearKind[];
  return `<div class="lifemap">
    <canvas class="mapcv"${id ? ` id="${id}"` : ''} data-lifemap="${esc(code)}"${span ? ` data-span="${Math.ceil(span)}"` : ''} role="img" aria-label="${L(`一生の地図 (1マス1年、${code.length}年)`, `Life map (one square per year, ${code.length} years)`)}"></canvas>
    <ul class="maplegend">${order.filter((k) => seen.includes(k)).map((k) => `<li><i style="background:${MAP_COLOR[k]}"></i>${esc(KIND_NAME[k])}</li>`).join('')}</ul>
  </div>`;
}

/** data-lifemap の絵を描き、押したマスの年を data-jump に入れる (押した年へ飛ぶのは画面の側) */
export function paintLifeMaps(root: ParentNode = document): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-lifemap]').forEach((cv) => {
    const code = cv.dataset.lifemap ?? '';
    const span = Number(cv.dataset.span ?? code.length);
    drawLifeMap(cv, code, span);
    cv.onclick = (ev) => {
      const n = Math.max(code.length, span), cols = mapCols(n), c = cellOf(n);
      const k = cv.width / cv.getBoundingClientRect().width;
      const a = Math.floor(ev.offsetY * k / (c + GAP)) * cols + Math.floor(ev.offsetX * k / (c + GAP));
      if (a >= 0 && a < code.length) cv.dataset.jump = String(a); else delete cv.dataset.jump;
    };
  });
}
