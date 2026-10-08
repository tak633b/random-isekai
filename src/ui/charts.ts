// 小さなグラフ (SVG と横棒)。数字は文字でも並べるので、グラフは見取り図の役
import { esc } from './dom';
import { L } from '../i18n';

// 横棒の一覧。p は 0〜1。大きいものほど長い (いちばん大きいものを満杯にする)
export function barList(rows: { label: string; p: number; note?: string }[], cls = ''): string {
  const top = Math.max(...rows.map((r) => r.p), 1e-9);
  return `<ul class="bars ${cls}">${rows.map((r) => `<li><span>${esc(r.label)}</span><i><b style="width:${((r.p / top) * 100).toFixed(1)}%"></b></i><em>${r.note ?? fmtPct(r.p)}</em></li>`).join('')}</ul>`;
}

export const fmtPct = (p: number): string => (p >= 0.1 ? `${Math.round(p * 100)}%` : p >= 0.001 ? `${(p * 100).toFixed(1)}%` : p > 0 ? '<0.1%' : '0%');

// 享年の分布。幅は最長の年齢に合わせて 1・5・10・50・100 年から選ぶ (棒が 10〜40 本になるように)
export function ageHistogram(ages: number[], marks: { age: number; label: string }[] = []): string {
  if (!ages.length) return '';
  const max = ages[ages.length - 1];
  const width = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((w) => max / w <= 40) ?? 1000;
  const bins = Math.floor(max / width) + 1;
  const counts = new Array<number>(bins).fill(0);
  for (const a of ages) counts[Math.floor(a / width)]++;
  const top = Math.max(...counts);
  const VW = 600, VH = 180, bw = VW / bins;
  const x = (age: number) => (age / (bins * width)) * VW;
  const bars = counts.map((c, i) => {
    const h = (c / top) * VH;
    return `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${(VH - h).toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h.toFixed(1)}"><title>${esc(L(`${i * width}〜${i * width + width - 1}歳: ${c}人`, `${i * width}–${i * width + width - 1}: ${c}`))}</title></rect>`;
  }).join('');
  const step = niceStep(bins * width);
  const ticks = Array.from({ length: Math.floor((bins * width) / step) + 1 }, (_, i) => i * step)
    .map((a) => `<text x="${x(a).toFixed(1)}" y="${VH + 16}" text-anchor="${a === 0 ? 'start' : x(a) > VW - 24 ? 'end' : 'middle'}">${a}</text>`).join('');
  const lines = marks.map((m, i) => `<line class="mark" x1="${x(m.age + 0.5)}" x2="${x(m.age + 0.5)}" y1="0" y2="${VH}"/><text class="marklabel" x="${x(m.age + 0.5) + 4}" y="${12 + i * 14}">${esc(m.label)}</text>`).join('');
  return `<svg class="hist" viewBox="-4 -4 ${VW + 8} ${VH + 24}" role="img" aria-label="${esc(L('享年の分布', 'Distribution of age at death'))}">
    <line class="axis" x1="0" x2="${VW}" y1="${VH}" y2="${VH}"/>${bars}${lines}${ticks}</svg>`;
}

function niceStep(span: number): number {
  for (const s of [5, 10, 20, 50, 100, 200, 500, 1000]) if (span / s <= 8) return s;
  return 2000;
}
