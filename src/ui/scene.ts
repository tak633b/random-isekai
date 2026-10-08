// 場面のピクセル画 320×100 (背景だけ。人物は sprite.ts が上に重ねる)。
// 世界の様式 (STYLE) × 場所 (Place) × 時刻 × 季節。細部は seed から決まるので同じ spec なら同じ絵。
// 空と明かりは raw で描いて時刻の tint を受けない。それ以外は tint を受ける (人物にも tintOf を掛ける)。
import type { Place, SceneSpec, Tod, WorldId } from '../engine/types';
import { makeRng, type Rng } from '../engine/rng';
import { dith, hash, mixc, Pix, tones } from './raster';

export const W = 320, H = 100;
const HZ = 62; // 地面の始まり
const BY = 80; // 建物の足もと
const GY = 90; // 人の足もと

type Tex = 'timber' | 'post' | 'stone' | 'brick' | 'log' | 'plank' | 'metal' | 'mud' | 'plain' | 'ruin';
type Roof = 'gable' | 'thatch' | 'tile' | 'curve' | 'dome' | 'flat' | 'mansard' | 'pediment';
type Far = 'hills' | 'fuji' | 'needles' | 'factory' | 'neon' | 'alien' | 'skyline' | 'ruin' | 'sea' | 'dunes' | 'forest' | 'cape' | 'mount';
type Tree = 'oak' | 'dead' | 'sakura' | 'pine' | 'bamboo' | 'palm' | 'giant' | 'olive' | 'none';
type Pave = 'cobble' | 'stone' | 'asphalt' | 'metal' | 'sand' | 'plank' | 'dirt';
type Dun = 'stone' | 'cave' | 'metal';
interface Style {
  wall: string; tex: Tex; roof: Roof; roofCol: string; trim: string; door: string; stone: string;
  grass: [string, string]; soil: string; leaf: string; far: Far; tree: Tree; pave: Pave; dun: Dun;
  snowy?: boolean; sci?: boolean; urban?: boolean; sand?: boolean;
}
const STYLE: Record<WorldId, Style> = {
  medieval: { wall: '#e8dcc4', tex: 'timber', roof: 'gable', roofCol: '#a8483c', trim: '#5a3a28', door: '#6a4a30', stone: '#9a948a', grass: ['#5e8a3e', '#76a04a'], soil: '#6a4e34', leaf: '#4a8a3a', far: 'hills', tree: 'oak', pave: 'cobble', dun: 'stone', snowy: true },
  dark: { wall: '#7a726a', tex: 'stone', roof: 'gable', roofCol: '#3e383c', trim: '#2e2622', door: '#3a2a22', stone: '#6a6a70', grass: ['#4a5040', '#565c48'], soil: '#4a3e34', leaf: '#4a5a3a', far: 'hills', tree: 'dead', pave: 'cobble', dun: 'stone', snowy: true },
  game: { wall: '#f6ecd2', tex: 'timber', roof: 'gable', roofCol: '#e04a3a', trim: '#7a4a2a', door: '#8a5a30', stone: '#b4aca0', grass: ['#5ab84a', '#78d058'], soil: '#a07a4a', leaf: '#3aa84a', far: 'hills', tree: 'oak', pave: 'cobble', dun: 'stone', snowy: true },
  academy: { wall: '#f4f0ea', tex: 'plain', roof: 'mansard', roofCol: '#5a6a9a', trim: '#d8b860', door: '#7a5a48', stone: '#d8d0c4', grass: ['#6aa04e', '#84b85e'], soil: '#8a6e4e', leaf: '#4a8a4a', far: 'hills', tree: 'oak', pave: 'cobble', dun: 'stone', snowy: true },
  wa: { wall: '#ece4d0', tex: 'post', roof: 'tile', roofCol: '#4a5262', trim: '#5a3a28', door: '#4a3424', stone: '#9a9890', grass: ['#6a9a48', '#80aa52'], soil: '#7a5a3a', leaf: '#4a8a3a', far: 'fuji', tree: 'sakura', pave: 'stone', dun: 'cave', snowy: true },
  xianxia: { wall: '#ece0c8', tex: 'post', roof: 'curve', roofCol: '#2f6a5a', trim: '#b83a2a', door: '#8a2a20', stone: '#a8a498', grass: ['#5a8a5a', '#6a9a62'], soil: '#6a5a44', leaf: '#3f7a52', far: 'needles', tree: 'bamboo', pave: 'stone', dun: 'cave', snowy: true },
  steampunk: { wall: '#9a5a44', tex: 'brick', roof: 'gable', roofCol: '#4a4a56', trim: '#b8904a', door: '#4a3428', stone: '#7a746c', grass: ['#5a6a44', '#6a7450'], soil: '#5a4a3a', leaf: '#4a6a3a', far: 'factory', tree: 'oak', pave: 'cobble', dun: 'stone', snowy: true, urban: true },
  cyberpunk: { wall: '#3a3a52', tex: 'metal', roof: 'flat', roofCol: '#26263a', trim: '#ff4ab8', door: '#1a1a28', stone: '#4a4a5a', grass: ['#2a2a3a', '#32324a'], soil: '#2a2a34', leaf: '#3a6a5a', far: 'neon', tree: 'none', pave: 'asphalt', dun: 'metal', sci: true, urban: true },
  space: { wall: '#d8dce4', tex: 'metal', roof: 'dome', roofCol: '#b8c0cc', trim: '#4ab8f8', door: '#3a4a5a', stone: '#8a8a9a', grass: ['#6a5a78', '#7a6a88'], soil: '#5a4a68', leaf: '#4ac8a8', far: 'alien', tree: 'none', pave: 'metal', dun: 'metal', sci: true },
  modern: { wall: '#cfcac0', tex: 'plain', roof: 'flat', roofCol: '#6a6a70', trim: '#8a8a90', door: '#5a5a64', stone: '#9a9a9c', grass: ['#5e8a3e', '#6e9a46'], soil: '#6a5a44', leaf: '#4a8a3a', far: 'skyline', tree: 'oak', pave: 'asphalt', dun: 'cave', snowy: true, urban: true },
  postapoc: { wall: '#8a7a68', tex: 'ruin', roof: 'flat', roofCol: '#5a4a3e', trim: '#8a4a2a', door: '#3a2e26', stone: '#7a6e60', grass: ['#a89068', '#b89e74'], soil: '#7a6248', leaf: '#6a7040', far: 'ruin', tree: 'dead', pave: 'asphalt', dun: 'metal', sand: true },
  ocean: { wall: '#e0d0aa', tex: 'plank', roof: 'thatch', roofCol: '#c8a45e', trim: '#7a5a3a', door: '#6a4a30', stone: '#a89a8a', grass: ['#e8d8a8', '#f0e2b6'], soil: '#c8b080', leaf: '#3f8a3a', far: 'sea', tree: 'palm', pave: 'plank', dun: 'cave', sand: true },
  desert: { wall: '#d8a878', tex: 'mud', roof: 'dome', roofCol: '#e0b888', trim: '#2a4a8a', door: '#7a4a2a', stone: '#c8a070', grass: ['#d8b070', '#e2be82'], soil: '#b88a50', leaf: '#5a8a3a', far: 'dunes', tree: 'palm', pave: 'sand', dun: 'stone', sand: true },
  beast: { wall: '#8a6a48', tex: 'log', roof: 'thatch', roofCol: '#7a8a4a', trim: '#5a4030', door: '#3a2a1e', stone: '#8a8478', grass: ['#4a7a3a', '#5a8a42'], soil: '#5a4430', leaf: '#3a7a3a', far: 'forest', tree: 'giant', pave: 'dirt', dun: 'cave', snowy: true },
  myth: { wall: '#f0ece4', tex: 'plain', roof: 'pediment', roofCol: '#c87a4a', trim: '#d8b048', door: '#6a5a4a', stone: '#e4dcd0', grass: ['#8a9a4e', '#9aa858'], soil: '#a0805a', leaf: '#7a8a5a', far: 'cape', tree: 'olive', pave: 'stone', dun: 'stone' },
  frontier: { wall: '#a0784e', tex: 'log', roof: 'gable', roofCol: '#6a5038', trim: '#5a3a24', door: '#5a3a24', stone: '#9a948a', grass: ['#7aa84a', '#8eb856'], soil: '#7a5a3a', leaf: '#4a8a3a', far: 'mount', tree: 'pine', pave: 'dirt', dun: 'cave', snowy: true },
};

const SKY: Record<Tod, string[]> = {
  morning: ['#6f8fc0', '#9ab4d8', '#d8c8cc', '#f4d4b0', '#f8e4c4'],
  day: ['#3f78c0', '#5a90d0', '#80acdc', '#acc8e4', '#cfe0ea'],
  dusk: ['#2b2f5a', '#5b3f6e', '#a8546a', '#e07b55', '#f4b664', '#f8d98e'],
  night: ['#0c1024', '#141a38', '#22284a', '#3a3456'],
};
const SKY_OVER: Partial<Record<WorldId, [string, number]>> = {
  dark: ['#4a4650', 0.55], cyberpunk: ['#2a0e44', 0.55], postapoc: ['#b08050', 0.45], myth: ['#3a4058', 0.32],
  xianxia: ['#e4ece8', 0.32], academy: ['#f4d8ec', 0.18], game: ['#2a8af8', 0.18], steampunk: ['#8a7a68', 0.38], desert: ['#1858c0', 0.14],
};
const SPACE_SKY: Record<Tod, string[]> = {
  morning: ['#04040c', '#0c1028', '#1a2048', '#3a3a6a'], day: ['#04040c', '#0a0e24', '#14204a', '#24386a'],
  dusk: ['#04040c', '#120c28', '#2a1840', '#5a2a4a'], night: ['#020208', '#06061a', '#0c0e28', '#141838'],
};
const TINT: Record<Tod, number[]> = { morning: [1, 0.95, 0.9], day: [1, 1, 1], dusk: [0.94, 0.72, 0.64], night: [0.34, 0.38, 0.6] };
const LIT = '#f6c35c', LIT2 = '#fff1b0';
const NEON = ['#ff4ab8', '#4af0e8', '#f8e85a', '#a85aff'];

interface Ctx { P: Pix; s: SceneSpec; st: Style; r: Rng; tod: Tod; dir: number; lit: boolean; night: boolean; snow: boolean; place: Place; sky: string[] }

const todOf = (s: SceneSpec): Tod => (s.dead || s.place === 'grave' ? 'night' : s.tod);
const indoor = (s: SceneSpec) => s.place === 'dungeon' || (s.place === 'ship' && STYLE[s.world].sci);

export function tintOf(s: SceneSpec): number[] {
  if (s.place === 'dungeon') return [0.74, 0.68, 0.76];
  if (indoor(s)) return [0.86, 0.9, 1];
  const t = TINT[todOf(s)];
  const k = s.world === 'dark' ? [0.84, 0.84, 0.9] : s.world === 'postapoc' ? [1, 0.93, 0.82] : s.world === 'cyberpunk' ? [0.8, 0.72, 1] : s.world === 'space' ? [0.9, 0.92, 1] : [1, 1, 1];
  return t.map((v, i) => v * k[i]);
}
export const groundY = (_s: SceneSpec): number => GY;

// ---- 共通の道具 -------------------------------------------------------------

function grad(P: Pix, y0: number, h: number, stops: string[]): void {
  for (let y = 0; y < h; y++) {
    const f = (y / (h - 1)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), t = f - i;
    for (let x = 0; x < W; x++) P.px(x, y0 + y, dith(x, y, t) ? stops[i + 1] : stops[i], 1, true);
  }
}
function disc(P: Pix, cx: number, cy: number, rad: number, c: string, c2: string, raw = true): void {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y); if (d < rad - 0.5) P.px(cx + x, cy + y, d < rad * 0.72 ? c : c2, 1, raw); }
}
function glow(P: Pix, cx: number, cy: number, rad: number, col: string, a = 0.3): void {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y) / rad; if (d < 1 && dith(cx + x, cy + y, 1 - d)) P.px(cx + x, cy + y, col, a, true); }
}
const horizon = (c: Ctx) => (c.night ? '#2a2e50' : c.sky[c.sky.length - 1]);

function ridge(c: Ctx, base: number, amp: number, f: number, ph: number, col: string, haze: number, o: { sharp?: boolean; flat?: boolean; cap?: string } = {}): void {
  const hz = horizon(c), mixed = mixc(col, hz, haze), m2 = mixc(col, hz, haze * 0.6);
  for (let x = 0; x < W; x++) {
    const u = x * f + ph;
    let y = o.sharp ? base - amp * (1 - Math.abs(((u / Math.PI) % 2) - 1) * 2) - Math.sin(x * 0.31) * 0.8 : base + Math.sin(u) * amp + Math.sin(u * 2.3 + 1) * amp * 0.4 + Math.sin(x * 0.9) * 0.5;
    if (o.flat) y = Math.max(base - amp * 0.4, y);
    y = Math.round(y);
    for (let yy = y; yy < HZ + 4; yy++) c.P.px(x, yy, dith(x, yy, 0.5) ? mixed : m2);
    if (o.cap && y < base - amp * 0.5) for (let k = 0; k < 2; k++) c.P.px(x, y + k, o.cap);
    if (c.tod === 'dusk' && haze < 0.25 && base < 58) c.P.px(x, y, '#d79a5a', 1, true);
  }
}

// 壁: 光の側を明るく、反対を暗く。様式ごとの木組み・石積み・煉瓦
function wall(c: Ctx, x: number, y: number, w: number, h: number, col = c.st.wall, tex: Tex = c.st.tex, shadow = true): void {
  const t = tones(col), { P, dir } = c, beam = c.st.trim;
  x = Math.round(x); y = Math.round(y);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const k = xx - x, j = yy - y;
    const litS = dir > 0 ? k >= w - Math.max(3, w * 0.22) : k < Math.max(3, w * 0.22), sh = dir > 0 ? k < 2 : k >= w - 2;
    let v = litS ? t[2] : sh ? t[0] : t[1];
    switch (tex) {
      case 'timber': if (k === 0 || k === w - 1 || j === 0 || j === Math.floor(h / 2) || k % 9 === 4 || (j < h / 2 && (k + j) % 9 === 0 && k % 9 < 4)) v = beam; break;
      case 'post': if (k < 2 || k >= w - 2 || k % 10 === 5 || j === 0 || j === h - 1) v = beam; break;
      case 'stone': case 'ruin': if (j % 4 === 3 || (k + Math.floor(j / 4) * 3) % 7 === 0) v = t[0]; break;
      case 'brick': if (j % 3 === 2 || (k + (Math.floor(j / 3) % 2) * 2) % 5 === 0) v = mixc(t[0], '#2a1a14', 0.2); break;
      case 'log': v = j % 3 === 2 ? t[0] : j % 3 === 0 ? t[2] : v; if ((k === 0 || k === w - 1) && j % 3 !== 2) v = t[3]; break;
      case 'plank': if (k % 4 === 0) v = t[0]; break;
      case 'metal': if (k % 10 === 0 || j === 0) v = t[0]; else if (k % 10 === 2 && j % 6 === 2) v = t[3]; break;
      case 'mud': if ((hash(xx, yy) & 15) === 0) v = t[0]; break;
    }
    P.px(xx, yy, v);
  }
  if (tex === 'ruin') for (let i = 0; i < w * h / 60; i++) { const hx = x + 2 + (hash(x, y, i) % Math.max(1, w - 6)), hy = y + 2 + (hash(i, x) % Math.max(1, h - 6)); P.box(hx, hy, 3, 2, '#2a2420'); P.px(hx + 3, hy + 1, t[0]); }
  if (shadow) castShadow(c, x, w, h);
}
function castShadow(c: Ctx, x: number, w: number, h: number, base = BY): void {
  const len = c.tod === 'day' ? 2 : c.night || indoor(c.s) ? 0 : Math.min(16, h * 0.45);
  for (let i = 0; i < len; i++) for (let k = 0; k < w; k++) c.P.dark(c.dir > 0 ? x + k - i : x + k + i, base + Math.floor(i / 4), 0.26);
}
function win(c: Ctx, x: number, y: number, w: number, h: number, chance = 0.5): void {
  const { P, r, st } = c, wa = c.s.world === 'wa' || c.s.world === 'xianxia';
  if (c.lit && r() < chance) {
    const col = c.s.world === 'cyberpunk' ? NEON[Math.floor(r() * 3)] : LIT;
    P.box(x, y, w, h, col, true); P.px(x + (c.dir > 0 ? w - 1 : 0), y, LIT2, 1, true);
    if (wa && w > 3) for (let k = 2; k < w; k += 3) P.box(x + k, y, 1, h, '#8a5a30', true);
    return;
  }
  if (wa) { P.box(x, y, w, h, '#e8e0c8'); for (let k = 2; k < w; k += 3) P.box(x + k, y, 1, h, st.trim); if (h > 3) P.box(x, y + (h >> 1), w, 1, st.trim); return; }
  P.box(x, y, w, h, c.night ? '#1a1e34' : st.sci ? '#4a7aa8' : '#6a8aa4');
  if (!c.night) P.px(x + (c.dir > 0 ? w - 1 : 0), y, '#cfe2ee');
  if (!st.sci && !st.urban && w >= 4) P.box(x + (w >> 1), y, 1, h, st.trim);
}
function door(c: Ctx, x: number, y: number, w: number, h: number): void {
  const t = tones(c.st.door);
  c.P.box(x, y, w, h, t[1]); c.P.box(x, y, w, 1, t[0]);
  if (!c.st.sci) c.P.px(x + w - 2, y + (h >> 1), '#d8b050'); else c.P.box(x + 1, y + 2, w - 2, 1, c.st.trim, c.lit);
}

// 屋根。y は壁の上端。返り値は屋根のてっぺん
function roof(c: Ctx, x: number, y: number, w: number, kind: Roof = c.st.roof, col = c.st.roofCol): number {
  const { P, dir } = c, t = tones(col);
  const shade = (k: number, ww: number) => (dir > 0 ? (k > ww * 0.6 ? t[2] : t[1]) : k < ww * 0.4 ? t[2] : t[1]);
  const snowCap = c.snow && kind !== 'flat' && kind !== 'dome';
  switch (kind) {
    case 'gable': case 'thatch': case 'pediment': {
      const step = kind === 'pediment' ? 3 : 2, n = Math.ceil((w + 6) / (step * 2));
      for (let i = 0; i < n; i++) {
        const ww = w + 6 - i * step * 2, xx = x - 3 + i * step;
        for (let k = 0; k < ww; k++) {
          let v = i % 2 ? shade(k, ww) : t[0];
          if (kind === 'thatch') v = (k + i) % 3 ? shade(k, ww) : t[0];
          if (kind === 'pediment') v = i === 0 ? c.st.trim : t[1];
          if (snowCap && (i > n - 3 || (i % 3 === 0 && (k + i) % 4))) v = i % 2 ? '#eef2f8' : '#d8e0ea';
          P.px(xx + k, y - 1 - i, v);
        }
      }
      if (kind === 'thatch') for (let k = -3; k < w + 3; k += 2) P.px(x + k, y, t[0]);
      return y - 1 - n;
    }
    case 'tile': case 'curve': {
      const n = Math.max(4, Math.min(9, Math.round(w / 6))), curl = kind === 'curve' ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const ww = Math.round(w + 12 - (i / n) * (w * 0.55 + 12)), xx = x + (w - ww) / 2;
        for (let k = 0; k < ww; k++) {
          const e = Math.abs(k - ww / 2) / (ww / 2);
          const yy = y - 1 - i - (i === 0 ? Math.round(e ** 6 * curl) : 0);
          P.px(xx + k, yy, snowCap && i > n - 3 ? '#eef2f8' : i === 0 ? t[0] : k % 2 ? shade(k, ww) : t[0]);
        }
      }
      const top = y - 1 - n, rw = Math.round(w * 0.45);
      P.box(x + (w - rw) / 2, top, rw, 1, kind === 'curve' ? '#d8b048' : t[0]);
      if (kind === 'curve') { P.px(x - 6, y - 5, '#d8b048'); P.px(x + w + 5, y - 5, '#d8b048'); P.px(x + (w - rw) / 2 - 1, top - 1, '#d8b048'); P.px(x + (w + rw) / 2, top - 1, '#d8b048'); }
      return top;
    }
    case 'dome': {
      if (w > 40) { P.box(x - 1, y - 2, w + 2, 2, t[0]); return roof(c, x + w / 2 - 15, y - 2, 30, 'dome', col); }
      const rad = Math.floor(w / 2) - 1, cx = x + w / 2;
      for (let yy = 0; yy <= rad; yy++) for (let k = -rad; k <= rad; k++) if (k * k + yy * yy * 1.4 < rad * rad) P.px(cx + k, y - 1 - yy, k * dir > rad * 0.3 ? t[2] : k * dir < -rad * 0.5 ? t[0] : t[1]);
      const top = y - 1 - Math.round(rad / 1.18);
      P.box(cx, top - 3, 1, 3, c.st.trim);
      return top - 3;
    }
    case 'mansard': {
      for (let i = 0; i < 7; i++) P.box(x - 2 + i, y - 1 - i, w + 4 - i * 2, 1, i % 2 ? t[1] : t[0]);
      for (let k = x + 6; k < x + w - 8; k += 12) { P.box(k, y - 7, 5, 6, c.st.wall); win(c, k + 1, y - 5, 3, 3, 0.4); P.box(k - 1, y - 8, 7, 1, t[0]); }
      P.box(x + 4, y - 8, w - 8, 1, c.st.trim);
      return y - 8;
    }
    default: P.box(x - 1, y - 2, w + 2, 2, t[0]); return y - 2;
  }
}

// 家1軒: 壁 + 屋根 + 窓 + 戸
function house(c: Ctx, x: number, w: number, h: number, o: { tex?: Tex; roof?: Roof; col?: string; roofCol?: string; floors?: number; wins?: number } = {}): number {
  wall(c, x, BY - h, w, h, o.col, o.tex);
  const top = roof(c, x, BY - h, w, o.roof, o.roofCol);
  const floors = o.floors ?? Math.max(1, Math.floor(h / 13)), fh = Math.floor((h - 2) / floors);
  const dw = Math.min(7, Math.max(5, w >> 3)), dx = x + Math.round(w / 2 - dw / 2) + ((hash(x, w) & 1) ? 6 : -6) * (w > 30 ? 1 : 0);
  const sp = o.wins ?? 10;
  for (let f = 0; f < floors; f++) {
    const wy = BY - h + 3 + f * fh;
    for (let wx = x + 4; wx + 4 < x + w - 2; wx += sp) {
      if (f === floors - 1 && wx + 5 > dx - 1 && wx < dx + dw + 1) continue;
      win(c, wx, wy, Math.min(5, sp - 4), Math.min(5, fh - 6), 0.55);
    }
  }
  door(c, dx, BY - Math.min(12, h - 2), dw, Math.min(12, h - 2));
  return top;
}

// ---- 空 --------------------------------------------------------------------

function sky(c: Ctx): void {
  const { P, tod, r, s } = c, space = s.world === 'space';
  grad(P, 0, HZ + 4, c.sky);
  if (c.night || space) for (let i = 0; i < (space ? 90 : 50); i++) P.px(r() * W, r() * (space ? 56 : 38), r() < 0.3 ? '#e0e4ff' : '#5a6290', 1, true);
  if (space) {
    // 惑星と輪
    const px = 60 + (s.seed % 180), py = 18 + (s.seed % 9), rad = 11 + (s.seed % 6), pc = ['#c87a5a', '#5a8ac8', '#8ac87a', '#c8a85a'][s.seed % 4], pt = tones(pc);
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y); if (d < rad) P.px(px + x, py + y, x - y > rad * 0.6 ? pt[0] : (y + (x >> 2)) % 5 === 0 ? pt[2] : pt[1], 1, true); }
    for (let k = -rad * 1.9; k <= rad * 1.9; k++) { const yy = py + k * 0.22; if (Math.hypot(k, (yy - py) * 3) > rad * 0.95 || yy > py) P.px(px + k, yy, '#e8dcc0', 1, true); }
    disc(P, 280 - (s.seed % 40), 10, 3, '#d8d8e0', '#a8a8b8');
    if (tod === 'dusk' || tod === 'morning') glow(P, tod === 'morning' ? 40 : 250, HZ, 30, '#f8a060', 0.25);
    return;
  }
  if (c.night) {
    const red = s.world === 'dark', mx = 250 + (s.seed % 50), my = 14;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y), d2 = Math.hypot(x - 3, y - 1); if (red ? d < 6 : d < 4.6 && d2 > 3.6) P.px(mx + x, my + y, red ? (d < 4 ? '#e04a3a' : '#a82a2a') : '#f2ecc8', 1, true); }
    if (red) glow(P, mx, my, 14, '#a82a2a', 0.25);
  } else if (tod === 'dusk') { disc(P, 246, 50, 10, '#fff4c8', '#fbe3a0'); for (let x = 190; x < 310; x++) if (dith(x, 56, 0.4)) P.px(x, 56, '#fbe3a0', 1, true); }
  else if (tod === 'morning') disc(P, 58, 38, 7, '#fff8e0', '#fbe8b8');
  else if (s.world !== 'dark' && s.world !== 'myth') disc(P, 214, 12, 6, '#fffbe8', '#fdf3c4');
  // 雲。神話は雷雲、ダークは曇天、ゲームは丸い雲
  const storm = s.world === 'myth' && (hash(s.seed, 7) & 3) < 3, heavy = storm || s.world === 'dark' || s.world === 'steampunk';
  const cloud = c.night ? ['#1a1e38', '#2a2e4a'] : storm ? ['#3a3e50', '#5a6074'] : heavy ? ['#6a6870', '#8a8890'] : tod === 'dusk' ? ['#6a4a6a', '#e8a07a'] : tod === 'morning' ? ['#e8d8d8', '#fff4ec'] : ['#dce8f2', '#ffffff'];
  const n = s.world === 'cyberpunk' ? 0 : c.night ? 2 : heavy ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const cx = 20 + i * (300 / n) + r() * 40, cy = 6 + r() * (heavy ? 14 : 22), w = (heavy ? 34 : 18) + Math.floor(r() * 22), hh = heavy ? 5 : s.world === 'game' ? 4.5 : 3.2;
    for (let y = -6; y <= 6; y++) for (let x = -w / 2; x <= w / 2; x++) {
      const e = (x / (w / 2)) ** 2 + (y / hh) ** 2 + Math.sin(x * 0.7 + i) * 0.15;
      if (e < 1) P.px(cx + x, cy + y, s.world === 'game' && !c.night && e > 0.82 ? '#9ab8e8' : y > 0 && !dith(cx + x, cy + y, 0.5 - y * 0.1) ? cloud[0] : cloud[1], 1, true);
    }
  }
  if (storm) { let x = 90 + (s.seed % 140), y = 14; while (y < 54) { const nx = x + ((hash(x, y) & 3) - 1.5) * 2; for (let k = 0; k < 4; k++) P.px(x + (nx - x) * k / 4, y + k, '#fff8c0', 1, true); x = nx; y += 4; } }
  if (s.world === 'steampunk') airship(c, 40 + (s.seed % 200), 16 + (s.seed % 10));
  if (!c.night && tod !== 'dusk' && !c.st.sci && s.world !== 'cyberpunk') for (let i = 0; i < 3; i++) { const bx = 90 + r() * 120, by = 14 + r() * 16; for (const [dx, dy] of [[0, 0], [1, -1], [2, 0], [-1, -1], [-2, 0]]) P.px(bx + dx, by + dy, '#3a3a48', 1, true); }
}
function airship(c: Ctx, x: number, y: number): void {
  const { P } = c, t = tones('#a8806a');
  for (let k = -16; k <= 16; k++) for (let j = -5; j <= 5; j++) if ((k / 16) ** 2 + (j / 5) ** 2 < 1) P.px(x + k, y + j, j < -2 ? t[2] : j > 2 ? t[0] : (k + 16) % 8 === 0 ? t[0] : t[1]);
  P.box(x - 5, y + 6, 10, 3, '#5a4030'); P.box(x - 20, y - 3, 3, 6, '#7a5a40'); P.px(x - 4, y + 7, LIT, 1, c.lit); P.px(x + 2, y + 7, LIT, 1, c.lit);
}

// ---- 遠景 ------------------------------------------------------------------

function silhouetteBox(c: Ctx, x: number, top: number, w: number, col: string): void { c.P.box(x, top, w, HZ + 4 - top, col); }

function backdrop(c: Ctx): void {
  const { P, s, st, r, night } = c, sd = s.seed, hz = horizon(c);
  const farC = (col: string, k = 0.45) => (night ? mixc(col, '#2a2e50', 0.5) : mixc(col, hz, k));
  switch (st.far) {
    case 'hills': case 'mount': {
      const m = st.far === 'mount';
      ridge(c, m ? 40 : 46, m ? 10 : 5, m ? 0.04 : 0.025, sd % 7, m ? '#6a7aa8' : s.world === 'dark' ? '#4a4a58' : '#7a8aa8', 0.55, { sharp: m, cap: m || c.snow ? '#eef2f8' : undefined });
      // 遠い城 / 宮殿 / 廃塔
      if (s.world !== 'frontier' && s.world !== 'game') {
        const cx = 40 + (sd % 220), col = farC(s.world === 'academy' ? '#c8c8d8' : '#6a6a80', 0.5);
        for (const [dx, h] of [[0, 14], [6, 9], [11, 18], [17, 9], [22, 14]]) { silhouetteBox(c, cx + dx, 50 - h, s.world === 'dark' && dx === 11 ? 3 : 5, col); if (s.world !== 'dark') P.box(cx + dx - 1, 50 - h - 2, 7, 2, col); else if (dx === 11) P.px(cx + dx + 3, 50 - h + 2, col); }
      }
      ridge(c, 54, 3, 0.045, 3 + (sd % 5), s.world === 'game' ? '#4aa84a' : s.world === 'dark' ? '#3e4a3a' : '#5a7a5a', 0.3);
      if (m) for (let x = 0; x < W; x += 4) { const h = 6 + (hash(x, sd) % 5); for (let j = 0; j < h; j++) for (let k = -(j >> 1); k <= j >> 1; k++) P.px(x + k, 58 - h + j, farC('#2f5a3a', 0.15)); }
      if (s.world === 'dark') for (let i = 0; i < 4; i++) { const tx = 20 + i * 80 + (hash(sd, i) % 40); P.box(tx, 46, 1, 10, '#2a2a30'); P.px(tx - 1, 48, '#2a2a30'); P.px(tx + 1, 47, '#2a2a30'); P.px(tx - 2, 47, '#2a2a30'); }
      if (s.world === 'medieval' && (sd & 1)) { const wx = 60 + (sd % 200); P.box(wx, 46, 3, 8, farC('#e8dcc4', 0.3)); for (let k = -5; k <= 5; k++) { P.px(wx + 1 + k, 46 + k, farC('#5a4030', 0.3)); P.px(wx + 1 + k, 46 - k, farC('#5a4030', 0.3)); } }
      ridge(c, 60, 1.4, 0.08, sd % 3, st.grass[0], 0.12);
      break;
    }
    case 'fuji': {
      const fx = 70 + (sd % 180);
      ridge(c, 50, 4, 0.03, sd % 7, '#7a8aa8', 0.55);
      for (let y = 18; y < HZ; y++) { const half = (y - 18) * 2.2; for (let k = -half; k <= half; k++) P.px(fx + k, y, y < 28 + Math.sin(k) * 1.5 && !(c.s.season === 1) ? '#eef2f8' : farC('#5a6a98', 0.35)); }
      const pc = farC('#4a4a5a', 0.35), px = fx > 160 ? fx - 110 : fx + 90;
      for (let i = 0; i < 4; i++) { P.box(px - 7 + i * 1.5, 46 - i * 5, 14 - i * 3, 1, pc); P.box(px - 3 + i, 47 - i * 5, 6 - i * 2, 4, pc); }
      P.box(px, 24, 1, 4, pc);
      ridge(c, 56, 2.5, 0.05, 2, '#4a7a4a', 0.3);
      ridge(c, 60, 1.2, 0.09, 1, st.grass[0], 0.1);
      break;
    }
    case 'needles': {
      // 尖った岩山と雲海、峰の上の楼閣
      for (let i = 0; i < 7; i++) {
        const cx = 10 + i * 48 + (hash(sd, i) % 24), top = 10 + (hash(i, sd) % 22), w2 = 7 + (hash(sd, i, 2) % 6), col = farC(i % 2 ? '#5a7a7a' : '#4a6a6a', i % 2 ? 0.55 : 0.35);
        for (let y = top; y < HZ; y++) { const half = w2 * Math.min(1, 0.4 + (y - top) / 30); for (let k = -half; k <= half; k++) P.px(cx + k, y, k > half * 0.4 ? mixc(col, '#000000', 0.12) : col); }
        P.px(cx - 2, top + 2, '#3a5a3a'); P.px(cx + 3, top + 4, '#3a5a3a');
        if (i === sd % 7) { const pc = farC('#a83a2a', 0.2); P.box(cx - 5, top - 4, 10, 4, pc); P.box(cx - 7, top - 5, 14, 1, farC('#2f5a4a', 0.2)); P.box(cx - 4, top - 8, 8, 3, pc); P.box(cx - 6, top - 9, 12, 1, farC('#2f5a4a', 0.2)); }
      }
      for (let y = 40; y < HZ; y++) for (let x = 0; x < W; x++) { const t = Math.sin(x * 0.05 + y * 0.6 + sd) * 0.5 + 0.5; if (dith(x, y, (y - 40) / 22 * 0.9 * t + 0.1)) P.px(x, y, c.night ? '#4a5070' : '#f0f4f2', 0.85); }
      ridge(c, 60, 1.5, 0.07, 1, st.grass[0], 0.1);
      break;
    }
    case 'factory': case 'neon': case 'skyline': case 'ruin': {
      const neon = st.far === 'neon', ruin = st.far === 'ruin';
      if (!neon) ridge(c, 48, 4, 0.03, sd % 7, '#7a8090', 0.6);
      const col = night ? (neon ? '#1a1430' : '#3a4470') : farC(neon ? '#2a2440' : ruin ? '#8a7060' : st.far === 'factory' ? '#6a5a50' : '#6a7484', neon ? 0.15 : 0.4);
      for (let x = 0; x < W;) {
        const w = 8 + (hash(x, sd) % 16), tall = neon ? 46 : st.far === 'factory' ? 18 : 26, top = HZ - 6 - (hash(sd, x) % tall);
        if (ruin) { for (let k = 0; k < w; k++) { const tt = top + Math.abs(((k * 7 + x) % 11) - 5) * 1.5; P.box(x + k, tt, 1, HZ + 4 - tt, col); } }
        else silhouetteBox(c, x, top, w, col);
        if (st.far === 'factory' && (hash(x) & 3) === 0) { silhouetteBox(c, x + 2, top - 16, 3, col); for (let i = 0; i < 9; i++) for (let k = 0; k < 3 + i * 0.5; k++) { const sx = x + 3 + i * 1.6 + Math.sin(i + k) * 2, sy = top - 18 - i * 2 + k * 0.6; if (dith(Math.round(sx), Math.round(sy), 0.6 - i * 0.04)) P.px(sx, sy, night ? '#3a3a50' : '#a8a4a0'); } }
        if (c.lit || neon) for (let yy = top + 3; yy < HZ; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (r() < (neon ? 0.25 : 0.12)) P.px(xx, yy, neon ? NEON[(xx + yy) % 4] : '#8a7a5a', neon ? 0.8 : 1, true);
        if (neon && (hash(x, 3) % 4) === 0) { const nc = NEON[hash(x) % 4]; P.box(x + 1, top + 4, 2, 10, nc, true); glow(P, x + 2, top + 9, 6, nc, 0.2); }
        x += w + (ruin ? 3 : 1);
      }
      if (st.far === 'skyline') { const tx = 40 + (sd % 220), tc = night ? '#3a4470' : farC('#c8603a', 0.35); for (let y = 16; y < HZ; y++) { const half = Math.round(1 + ((y - 16) / 46) ** 2 * 9); P.px(tx - half, y, tc); P.px(tx + half, y, tc); if (y % 6 === 0 || y === 34) P.box(tx - half, y, half * 2 + 1, 1, tc); } P.box(tx, 10, 1, 6, tc); if (c.lit) P.px(tx, 10, '#f84a4a', 1, true); }
      if (ruin || s.world === 'postapoc') for (let y = 30; y < HZ + 4; y++) for (let x = 0; x < W; x++) if (dith(x, y, (y - 30) / 40)) P.px(x, y, '#c8a070', 0.25);
      break;
    }
    case 'alien': {
      ridge(c, 52, 3, 0.03, sd % 5, '#5a4a6a', 0.4, { flat: true });
      const dx = 30 + (sd % 220), dc = farC('#c8d0dc', 0.3);
      for (let k = -14; k <= 14; k++) for (let j = 0; j < 10; j++) if (k * k / 196 + j * j / 100 < 1) P.px(dx + k, 56 - j, dc);
      silhouetteBox(c, dx + 18, 30, 3, dc); P.px(dx + 19, 29, '#f84a4a', 1, true);
      for (let i = 0; i < 6; i++) { const ax = (hash(sd, i) % W), ah = 6 + (hash(i, sd) % 12); for (let j = 0; j < ah; j++) P.box(ax - (j >> 2), 60 - ah + j, 1 + (j >> 1), 1, farC('#4a3a5a', 0.2)); }
      if (c.lit) for (let k = -12; k <= 12; k += 4) P.px(dx + k, 52, '#9ae8ff', 1, true);
      break;
    }
    case 'sea': case 'cape': {
      const sea = night ? ['#1a2a4a', '#24365a'] : c.tod === 'dusk' ? ['#4a4a7a', '#8a6a7a'] : ['#2a7aa8', '#4a9ac0'];
      for (let y = 50; y < HZ + 4; y++) for (let x = 0; x < W; x++) P.px(x, y, dith(x, y, (y - 50) / 14) ? sea[0] : sea[1]);
      for (let i = 0; i < 40; i++) P.box(r() * W, 52 + r() * 12, 2 + r() * 3, 1, night ? '#3a4a6a' : '#cfe8f0');
      if (c.tod === 'dusk') for (let y = 50; y < HZ + 4; y++) for (let k = -6; k <= 6; k++) if (dith(246 + k, y, 0.5 - Math.abs(k) / 14)) P.px(246 + k + Math.sin(y) * 2, y, '#f8d08a', 1, true);
      if (st.far === 'cape') {
        const cl = (sd & 1) ? 0 : 1;
        for (let x = 0; x < 110; x++) { const xx = cl ? W - 1 - x : x, top = 34 + x * x / 300; for (let y = top; y < HZ + 4; y++) P.px(xx, y, farC(y - top < 3 ? '#7a8a4a' : '#c8b898', 0.3)); }
        const tx = cl ? W - 50 : 26, tc = farC('#f0ece4', 0.2);
        P.box(tx, 28, 26, 2, tc); for (let k = 0; k < 6; k++) P.box(tx + 1 + k * 4.6, 30, 2, 6, tc); P.box(tx - 1, 36, 28, 2, tc);
        for (let i = 0; i < 5; i++) P.box(tx + i * 2.5, 27 - i, 26 - i * 5, 1, tc);
      } else {
        for (let i = 0; i < 2; i++) { const ix = 40 + (hash(sd, i) % 240), iw = 16 + (hash(i, sd) % 20); for (let k = -iw; k <= iw; k++) { const hh = Math.round((1 - (k / iw) ** 2) * 6); P.box(ix + k, 51 - hh, 1, hh, farC('#3a6a4a', 0.4)); } }
        if (sd & 1) { const lx = 260 - (sd % 60); P.box(lx, 34, 4, 17, farC('#f0ece4', 0.2)); P.box(lx, 38, 4, 2, farC('#c84a3a', 0.2)); P.box(lx, 44, 4, 2, farC('#c84a3a', 0.2)); P.box(lx - 1, 32, 6, 2, '#3a3a40'); if (c.lit) { P.px(lx + 1, 33, LIT2, 1, true); glow(P, lx + 2, 33, 10, LIT, 0.25); } }
      }
      break;
    }
    case 'dunes': {
      ridge(c, 46, 6, 0.02, sd % 7, '#c89a6a', 0.45, { flat: false });
      const px = 50 + (sd % 200), pc = farC('#c8a070', 0.35);
      for (let k = 0; k < 4; k++) if (k !== 2) P.box(px + k * 7, 40 + (k === 3 ? 6 : 0), 3, 14 - (k === 3 ? 6 : 0), pc); P.box(px - 1, 39, 10, 2, pc);
      for (let y = 22; y < 48; y++) { const half = (y - 22) * 0.9; P.box(px + 70 - half, y, half * 2, 1, farC('#d8b080', 0.45)); }
      ridge(c, 54, 4, 0.035, 2 + (sd % 3), '#d8aa70', 0.25);
      ridge(c, 60, 2, 0.06, sd % 2, st.grass[0], 0.08);
      break;
    }
    case 'forest': {
      ridge(c, 44, 5, 0.03, sd % 7, '#5a7a6a', 0.55);
      for (let i = 0; i < 6; i++) {
        const tx = 10 + i * 56 + (hash(sd, i) % 30), col = farC(i % 2 ? '#3a5a3a' : '#2f4a32', 0.4), tw = 5 + (i % 3);
        silhouetteBox(c, tx, 14, tw, farC('#4a3a2a', 0.4));
        for (let j = -12; j <= 12; j++) for (let k = -22; k <= 22; k++) if ((k / 22) ** 2 + (j / 10) ** 2 < 1 - ((k * 13 + j * 7) & 7) * 0.02) P.px(tx + k, 12 + j, col);
      }
      ridge(c, 58, 2, 0.06, 1, '#3a6a3a', 0.2);
      break;
    }
  }
  // 現代: 遠くに開いたダンジョンの門
  if (s.world === 'modern' && c.place !== 'city') gate(c, 30 + (sd % 250), HZ - 2, 6, 12);
}

function gate(c: Ctx, cx: number, by: number, rw: number, rh: number): void {
  const { P } = c;
  for (let y = -rh; y <= 0; y++) for (let k = -rw; k <= rw; k++) {
    const e = (k / rw) ** 2 + (y / rh) ** 2;
    if (e < 1) P.px(cx + k, by + y, e < 0.4 ? '#0a0414' : e < 0.75 ? '#4a1a7a' : '#a85aff', 1, true);
  }
  glow(P, cx, by - rh / 2, rh + 6, '#a85aff', 0.22);
}

// ---- 地面 ------------------------------------------------------------------

function ground(c: Ctx, paved: boolean): void {
  const { P, st, s } = c;
  const snow = c.snow, g = snow ? ['#dfe6ee', '#c8d4e2'] : st.grass;
  const g2 = !snow && s.season === 2 && !st.sand && !st.sci ? [mixc(g[0], '#a8902e', 0.4), mixc(g[1], '#b8a03a', 0.4)] : g;
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) P.px(x, y, dith(x, y, (y - HZ) / (H - HZ)) ? g2[1] : g2[0]);
  const r = makeRng(s.seed + 3);
  if (!st.sci) for (let i = 0; i < 200; i++) {
    const x = r() * W, y = HZ + 2 + r() * (H - HZ - 2);
    P.px(x, y, mixc(g2[0], '#000000', 0.28)); P.px(x, y - 1, tones(g2[1])[2]);
    if (s.season === 0 && !snow && !st.sand && r() < 0.15) P.px(x, y - 2, ['#f2e6a0', '#e8a0b0', '#ffffff'][i % 3]);
  } else for (let i = 0; i < 80; i++) P.px(r() * W, HZ + 2 + r() * 36, mixc(g2[0], '#000000', 0.3));
  if (paved) pave(c, BY + 1, H - BY - 1);
  else if (!st.sand && st.pave !== 'metal') for (let y = BY + 3; y < GY + 4; y++) for (let x = 0; x < W; x++) if (Math.abs(y - (BY + 3 + (GY - BY) / 2) - Math.sin(x * 0.03 + s.seed) * 2) < 4 && dith(x, y, 0.65)) P.px(x, y, snow ? '#b8c4d4' : mixc(st.soil, g2[0], 0.3));
}
function pave(c: Ctx, y0: number, h: number): void {
  const { P, st } = c, t = tones(st.pave === 'cobble' ? st.stone : st.pave === 'stone' ? '#b8b4a8' : st.pave === 'asphalt' ? '#4a4a52' : st.pave === 'metal' ? '#8a8e9a' : st.pave === 'plank' ? '#a07a4a' : st.pave === 'sand' ? '#d8b880' : '#8a6a48');
  for (let y = y0; y < y0 + h; y++) for (let x = 0; x < W; x++) {
    const j = y - y0;
    let v = dith(x, y, j / h) ? t[1] : t[2];
    switch (st.pave) {
      case 'cobble': if (j % 4 === 3 || (x + (Math.floor(j / 4) % 2) * 3) % 6 === 0) v = t[0]; break;
      case 'stone': if (j % 6 === 5 || (x + (Math.floor(j / 6) % 2) * 6) % 12 === 0) v = t[0]; break;
      case 'asphalt': v = dith(x, y, 0.3) ? t[0] : t[1]; if (j === 0) v = '#8a8a8e'; if (j > 6 && j < 8 && x % 24 < 10) v = '#c8b860'; if (c.s.world === 'postapoc' && (hash(x >> 2, j >> 1) & 15) === 0) v = '#2a2420'; break;
      case 'metal': if (j % 5 === 0 || x % 16 === 0) v = t[0]; break;
      case 'plank': if (j % 3 === 2) v = t[0]; else if ((x + j * 7) % 23 === 0) v = t[0]; break;
      case 'sand': case 'dirt': v = dith(x, y, 0.5) ? t[1] : t[2]; break;
    }
    P.px(x, y, v);
  }
  if (c.s.world === 'cyberpunk') for (let i = 0; i < 18; i++) { const x = (hash(c.s.seed, i) % W), y = y0 + 4 + (hash(i, c.s.seed) % (h - 4)); P.box(x, y, 6 + (i % 5), 1, NEON[i % 4], true); }
}

// ---- 木・小物 ---------------------------------------------------------------

function tree(c: Ctx, x: number, base: number, sc = 1, kind: Tree = c.st.tree): void {
  const { P, s, dir } = c;
  const leafC = kind === 'sakura' ? (s.season === 0 ? '#e8b4c4' : s.season === 2 ? '#c8442a' : '#4a8a3a') : kind === 'olive' ? '#7a8a5a' : s.season === 2 && kind === 'oak' ? '#c8702a' : c.st.leaf;
  const lt = tones(leafC), leaf = (dx: number, dy: number) => (dy < 0 && dx * dir > 0 ? lt[2] : dx * dir < -2 ? lt[0] : lt[1]);
  const bare = c.snow || (s.season === 3 && (kind === 'oak' || kind === 'sakura'));
  switch (kind) {
    case 'none': return;
    case 'palm': {
      const h = Math.round(26 * sc);
      for (let i = 0; i < h; i++) { const xx = x + Math.round(Math.sin(i / h * 1.4) * 3); P.px(xx, base - i, i % 3 ? '#7a5a3a' : '#5a4028'); P.px(xx + 1, base - i, '#8a6a46'); }
      const tx = x + 3, ty = base - h;
      for (let a = 0; a < 7; a++) { const ang = Math.PI * (1.08 + a * 0.14); for (let k = 1; k < 12 * sc; k++) P.px(tx + Math.cos(ang) * k, ty + Math.sin(ang) * k * 0.6 + k * k * 0.05, k > 8 ? lt[0] : leaf(Math.cos(ang), -1)); }
      return;
    }
    case 'pine': {
      P.box(x, base - 4, 2, 4, '#4a3020');
      for (let i = 0; i < 5; i++) for (let k = -(1 + i * 2 * sc); k <= 1 + i * 2 * sc; k++) for (let j = 0; j < 4; j++) P.px(x + k, base - 24 * sc + i * 4 + j, c.snow && j === 0 ? '#eef2f8' : leaf(k, j - 1));
      return;
    }
    case 'bamboo': {
      for (let i = 0; i < 5; i++) { const bx = x - 8 + i * 4, h = Math.round((30 + (hash(x, i) % 14)) * sc); for (let y = 0; y < h; y++) P.px(bx, base - y, y % 7 === 0 ? '#3a6a3a' : i % 2 ? '#6aa04a' : '#5a9040'); for (let y = 8; y < h; y += 9) for (let k = 1; k < 5; k++) P.px(bx + (i % 2 ? k : -k), base - y - k * 0.4, lt[1]); }
      return;
    }
    case 'dead': {
      const h = Math.round(22 * sc);
      P.box(x, base - h, 2, h, '#3a3030');
      for (const [dx, dy, len] of [[-1, -h + 4, 6], [2, -h + 7, 7], [-1, -h + 11, 5], [2, -h + 2, 4]]) for (let k = 0; k < len; k++) P.px(x + dx + (dx < 0 ? -k : k), base + dy - k * 0.6, '#3a3030');
      return;
    }
    case 'giant': {
      const h = Math.round(60 * sc), tw = Math.round(8 * sc), tt = tones('#6a4a30');
      for (let y = 0; y < h; y++) for (let k = 0; k < tw + (y < 4 ? 4 - y : 0) * 2; k++) P.px(x - (y < 4 ? 4 - y : 0) + k, base - y, k < 2 ? tt[dir > 0 ? 0 : 2] : (k + y) % 7 === 0 ? tt[0] : tt[1]);
      for (let j = -14; j <= 10; j++) for (let k = -26; k <= 26; k++) if ((k / 26) ** 2 + (j / 12) ** 2 < 1 - ((k * 13 + j * 7) & 7) * 0.02) P.px(x + tw / 2 + k, base - h + j, c.snow && j < -8 ? '#eef2f8' : leaf(k, j));
      return;
    }
    default: {
      P.box(x, base - 12 * sc, 2, 12 * sc, '#5a4030'); P.px(x + (dir > 0 ? 1 : 0), base - 10, '#7a5a40');
      if (bare) { for (const [dx, dy] of [[-4, -16], [-2, -14], [3, -15], [5, -18], [0, -18], [-5, -19], [2, -20]]) P.px(x + dx, base + dy * sc, '#4a3424'); if (c.snow) for (const [dx, dy] of [[-4, -17], [3, -16], [0, -19]]) P.px(x + dx, base + dy * sc, '#eef2f8'); return; }
      const rx = (kind === 'olive' ? 7 : 10) * sc, ry = (kind === 'olive' ? 6 : 9) * sc;
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
        if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1 - ((dx * 31 + dy * 17) & 7) * 0.02) continue;
        P.px(x + 1 + dx, base - 12 * sc - ry + 2 + dy, leaf(dx, dy));
      }
      if (kind === 'sakura' && s.season === 0) for (let i = 0; i < 10; i++) P.px(x - 20 + (hash(x, i) % 40), base - 30 + (hash(i, x) % 32), '#f8d4dc');
    }
  }
}

function lamp(c: Ctx, x: number): void {
  const { P, st, s } = c;
  const lc = s.world === 'cyberpunk' ? NEON[1] : st.sci ? '#9ae8ff' : s.world === 'modern' ? '#f8f4e0' : LIT;
  if (s.world === 'wa' || s.world === 'xianxia') {
    // 石灯籠
    const t = tones(st.stone);
    P.box(x - 1, BY - 4, 4, 4, t[1]); P.box(x, BY - 10, 2, 6, t[1]); P.box(x - 2, BY - 13, 6, 3, c.lit ? LIT : t[0], c.lit); P.box(x - 3, BY - 15, 8, 2, t[2]); P.px(x + 1, BY - 16, t[1]);
    if (c.lit) glow(P, x + 1, BY - 12, 10, LIT, 0.25);
    return;
  }
  const h = st.sci || s.world === 'modern' ? 44 : 30;
  P.box(x, BY - h, 2, h + 8, st.sci ? '#5a5a6a' : '#2a2a34');
  if (st.sci || s.world === 'modern') P.box(x - 5, BY - h, 7, 2, '#3a3a44'); else { P.box(x - 2, BY - h - 5, 6, 5, '#2a2a34'); P.box(x - 1, BY - h - 4, 4, 3, c.lit ? lc : '#d8d0b0', c.lit); }
  if (!c.lit) return;
  const lx = st.sci || s.world === 'modern' ? x - 3 : x + 1, ly = st.sci || s.world === 'modern' ? BY - h + 2 : BY - h - 3;
  P.box(lx - 1, ly - 1, 3, 1, LIT2, true);
  for (let y = ly; y < GY + 2; y++) {
    const half = (y - ly) * 0.4;
    for (let k = -half; k <= half; k++) { const xx = Math.round(lx + k), t = 1 - (Math.abs(k) / (half + 1)) * 0.8 - (y - ly) / 90; if (t > 0.3 && dith(xx, y, t - 0.15)) P.px(xx, y, lc, 0.2, true); }
  }
}
function barrel(c: Ctx, x: number, y = BY + 2): void { const t = tones('#8a5a34'); c.P.box(x, y - 8, 7, 8, t[1]); c.P.box(x + (c.dir > 0 ? 5 : 0), y - 8, 2, 8, t[2]); c.P.box(x, y - 7, 7, 1, '#4a4a50'); c.P.box(x, y - 2, 7, 1, '#4a4a50'); }
function crate(c: Ctx, x: number, y = BY + 2, col = '#a07a4a'): void { const t = tones(col); c.P.box(x, y - 7, 8, 7, t[1]); c.P.box(x, y - 7, 8, 1, t[2]); for (let k = 0; k < 7; k++) c.P.px(x + k, y - 7 + k, t[0]); }
function chest(c: Ctx, x: number, y = BY + 4): void { const t = tones('#a8642a'); c.P.box(x, y - 8, 12, 8, t[1]); c.P.box(x, y - 10, 12, 3, t[2]); c.P.box(x, y - 7, 12, 1, '#e8c040'); c.P.box(x + 5, y - 8, 2, 3, '#f8e070'); c.P.box(x, y - 10, 1, 10, '#e8c040'); c.P.box(x + 11, y - 10, 1, 10, '#e8c040'); }
function banner(c: Ctx, x: number, col: string, h = 30, y = BY + 4): void {
  const { P } = c, t = tones(col);
  P.box(x, y - h, 1, h, '#4a3a2a'); P.px(x, y - h - 1, '#d8c060');
  for (let j = 0; j < 12; j++) for (let k = 0; k < 9; k++) { const wv = Math.round(Math.sin(k * 0.6 + j * 0.2) * 1); if (j < 11 || k % 3 !== 1) P.px(x + 1 + k, y - h + 1 + j + wv, k < 2 ? t[2] : (j === 4 || j === 5) && k > 2 && k < 7 ? t[3] : t[1]); }
}
function smoke(c: Ctx, x: number, y: number, n = 14, col = '#8a8480'): void {
  for (let i = 0; i < n; i++) for (let k = 0; k < 4 + i * 0.5; k++) { const sx = x + i * 1.4 + Math.sin(i * 0.8 + k) * (2 + i * 0.2), sy = y - i * 2.4 + k * 0.6; if (dith(Math.round(sx), Math.round(sy), 0.7 - i * 0.035)) c.P.px(sx, sy, c.night ? '#3a3a48' : col); }
}
function fire(c: Ctx, x: number, y: number, s = 1): void {
  const { P } = c;
  for (let j = 0; j < 8 * s; j++) for (let k = -4 * s; k <= 4 * s; k++) { const w2 = (4 * s) * (1 - j / (8 * s)); if (Math.abs(k) < w2 && dith(x + k, y - j, 1 - j / (9 * s))) P.px(x + k, y - j, j < 3 * s ? '#f8e070' : j < 5 * s ? '#f8a030' : '#d84a20', 1, true); }
  glow(P, x, y - 3 * s, 12 * s, '#f8a030', 0.2);
}
function torch(c: Ctx, x: number, y: number): void { c.P.box(x, y, 2, 6, '#4a3424'); c.P.box(x - 1, y - 1, 4, 2, '#5a4a3a'); fire(c, x + 1, y - 1, 0.6); }
function fence(c: Ctx, x0: number, x1: number, y = BY + 2): void {
  const col = c.st.sci ? '#7a7a8a' : '#8a6a46';
  for (let x = x0; x < x1; x += 6) c.P.box(x, y - 8, 2, 8, col);
  c.P.box(x0, y - 6, x1 - x0, 1, col); c.P.box(x0, y - 3, x1 - x0, 1, tones(col)[0]);
}
function rose(c: Ctx, x: number, w: number): void {
  for (let k = 0; k < w; k++) for (let j = 0; j < 6; j++) if (((k - w / 2) / (w / 2)) ** 2 + ((j - 6) / 6) ** 2 < 1) c.P.px(x + k, BY - 4 + j, (k * 7 + j * 3) % 5 === 0 ? (c.s.season === 3 ? '#8a6a5a' : '#d83a5a') : j < 2 ? '#5a9a4a' : '#3f7a3a');
}
function fountain(c: Ctx, x: number): void {
  const { P } = c, t = tones('#e8e4dc');
  P.box(x, BY - 2, 30, 6, t[1]); P.box(x, BY - 2, 30, 1, t[2]); P.box(x + 2, BY - 1, 26, 2, c.night ? '#2a3a5a' : '#6ab0d8');
  P.box(x + 13, BY - 12, 4, 10, t[1]); P.box(x + 9, BY - 13, 12, 2, t[2]);
  for (let i = 0; i < 8; i++) { P.px(x + 15 - i * 0.8, BY - 14 - Math.sin(i / 8 * Math.PI) * 5 + i, '#c8e8f8'); P.px(x + 15 + i * 0.8, BY - 14 - Math.sin(i / 8 * Math.PI) * 5 + i, '#c8e8f8'); }
}
function torii(c: Ctx, x: number, w: number, h: number, by = BY): void {
  const { P } = c, red = tones('#c8402a');
  P.box(x + 3, by - h, 3, h, red[1]); P.box(x + w - 6, by - h, 3, h, red[1]);
  P.box(x, by - h - 2, w, 2, red[1]); P.box(x - 2, by - h - 4, w + 4, 2, '#2a2a2a'); P.px(x - 3, by - h - 5, '#2a2a2a'); P.px(x + w + 2, by - h - 5, '#2a2a2a');
  P.box(x + 2, by - h + 4, w - 4, 2, red[1]); P.box(x + (w >> 1) - 1, by - h - 1, 2, 5, red[0]);
}
function signboard(c: Ctx, x: number, y: number, w: number, h: number, icon: 'guild' | 'shop' | 'forge'): void {
  const { P, st } = c;
  if (st.sci || c.s.world === 'modern') { const nc = NEON[(c.s.seed + x) % 4]; P.box(x, y, w, h, '#1a1a28'); P.box(x + 1, y + 1, w - 2, h - 2, nc, c.lit || st.sci); if (c.lit) glow(P, x + w / 2, y + h / 2, w, nc, 0.2); for (let k = 3; k < w - 3; k += 3) P.box(x + k, y + 2, 2, h - 4, '#1a1a28', true); return; }
  const t = tones('#8a6038');
  P.box(x + 2, y - 3, 1, 3, '#3a3030'); P.box(x + w - 3, y - 3, 1, 3, '#3a3030');
  P.box(x, y, w, h, t[1]); P.box(x, y, w, 1, t[2]); P.box(x, y + h - 1, w, 1, t[0]);
  const cx = x + (w >> 1), cy = y + (h >> 1);
  if (icon === 'guild') { P.box(cx - 3, cy - 2, 6, 5, '#5a7ab8'); P.px(cx - 3, cy + 2, t[1]); P.px(cx + 2, cy + 2, t[1]); for (let k = -4; k <= 4; k++) { P.px(cx + k, cy + k * 0.5, '#d8d8e0'); } P.px(cx - 4, cy - 3, '#d8b050'); }
  else if (icon === 'forge') { P.box(cx - 4, cy, 8, 2, '#3a3a40'); P.box(cx - 2, cy + 2, 4, 2, '#3a3a40'); P.box(cx - 5, cy, 2, 1, '#3a3a40'); }
  else { P.box(cx - 2, cy - 2, 5, 5, '#d8b050'); P.px(cx, cy, '#8a6038'); }
}
function terminal(c: Ctx, x: number): void {
  const { P, st } = c;
  P.box(x, BY - 20, 12, 22, '#3a3a4a'); P.box(x + 1, BY - 19, 10, 1, '#5a5a6a');
  const sc = st.sci ? '#4af0e8' : '#7ac8f8';
  P.box(x + 2, BY - 17, 8, 7, sc, true); for (let k = 0; k < 3; k++) P.box(x + 3, BY - 15 + k * 2, 3 + ((k * 5 + x) % 4), 1, '#1a3a4a', true);
  P.box(x + 2, BY - 7, 8, 2, '#5a5a6a'); glow(P, x + 6, BY - 13, 10, sc, 0.18);
}
function crops(c: Ctx, x0: number, x1: number): void {
  const { P, s, st } = c, crop = c.snow ? '#a89a7a' : s.season === 2 ? '#c8a040' : s.season === 0 ? '#7ab04a' : '#4a8a32', ct = tones(crop);
  for (let y = BY - 2; y < H; y += 4) {
    for (let x = x0; x < x1; x++) P.px(x, y + 1, mixc(st.soil, '#000000', 0.2));
    for (let x = x0 + ((y / 4) % 2) * 2; x < x1; x += 4) { const sz = 1 + Math.floor((y - BY + 4) / 6); for (let k = 0; k < sz + 1; k++) P.px(x, y - k, k === sz ? ct[2] : ct[1]); P.px(x + 1, y - 1, ct[0]); }
  }
}
function scarecrow(c: Ctx, x: number): void {
  const { P } = c;
  P.box(x + 4, BY - 22, 1, 26, '#6a4a30'); P.box(x, BY - 16, 9, 1, '#6a4a30');
  P.box(x + 2, BY - 15, 5, 7, '#7a5a8a'); P.box(x + 3, BY - 21, 3, 3, '#e8d8a0'); P.box(x + 1, BY - 22, 7, 1, '#c8a040'); P.box(x + 2, BY - 23, 5, 1, '#c8a040');
}
function rock(c: Ctx, x: number, w: number, h: number, col = c.st.stone): void {
  const t = tones(col);
  for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) if (((k - w / 2) / (w / 2)) ** 2 + ((j - h) / h) ** 2 < 1) c.P.px(x + k, BY + 4 - h + j, j < h * 0.35 ? (c.snow ? '#eef2f8' : t[2]) : (k > w * 0.6) === (c.dir > 0) ? t[1] : t[0]);
}

// ---- 建物の種類 -------------------------------------------------------------

function castle(c: Ctx, x: number, w: number): void {
  const { P, st, s } = c;
  if (s.world === 'wa') {
    // 天守: 石垣 + 白壁 + 重ねた瓦屋根
    const t = tones('#8a8680');
    for (let j = 0; j < 14; j++) { const inset = Math.round((14 - j) * 0.5); for (let k = inset; k < w - inset; k++) P.px(x + k, BY - j, (k + j * 3) % 6 === 0 || j % 4 === 0 ? t[0] : t[1]); }
    let y = BY - 14, ww = w - 16, xx = x + 8;
    for (let f = 0; f < 3; f++) { wall(c, xx, y - 12, ww, 12, '#f2eee6', 'plain', false); for (let k = xx + 4; k < xx + ww - 4; k += 8) win(c, k, y - 9, 3, 4, 0.5); roof(c, xx, y - 12, ww, 'tile'); y -= 18; xx += 6; ww -= 12; }
    P.px(xx + ww / 2 - 3, y + 2, '#d8b048'); P.px(xx + ww / 2 + 3, y + 2, '#d8b048');
    return;
  }
  if (s.world === 'xianxia') {
    const t = tones(st.stone);
    for (let j = 0; j < 8; j++) P.box(x - j * 0.4, BY - j, w + j * 0.8, 1, j === 7 ? t[2] : t[1]);
    let y = BY - 8, ww = w - 10, xx = x + 5;
    for (let f = 0; f < 3; f++) { wall(c, xx, y - 12, ww, 12, '#ece0c8', 'plain', false); for (let k = xx + 2; k < xx + ww - 2; k += 6) P.box(k, y - 12, 2, 12, st.trim); for (let k = xx + 4; k < xx + ww - 4; k += 6) win(c, k, y - 9, 2, 5, 0.6); roof(c, xx, y - 12, ww, 'curve'); y -= 19; xx += 5; ww -= 10; }
    return;
  }
  if (st.sci || s.world === 'modern') {
    // 摩天楼
    wall(c, x + w * 0.2, BY - 78, w * 0.6, 78, st.sci ? '#2a3448' : '#4a6a84', 'plain');
    for (let y = BY - 75; y < BY - 4; y += 4) for (let xx = x + w * 0.2 + 3; xx < x + w * 0.8 - 3; xx += 4) win(c, xx, y, 2, 2, 0.5);
    wall(c, x, BY - 30, w, 30, st.wall, st.tex);
    for (let xx = x + 4; xx < x + w - 6; xx += 9) win(c, xx, BY - 24, 5, 6, 0.6);
    door(c, x + w / 2 - 5, BY - 10, 10, 10);
    if (s.world === 'cyberpunk') signboard(c, x + w * 0.2 + 2, BY - 60, w * 0.6 - 4, 6, 'shop');
    P.box(x + w / 2, 0, 1, BY - 78, '#3a3a4a'); P.px(x + w / 2, 2, '#f84a4a', 1, true);
    return;
  }
  if (s.world === 'desert' || s.world === 'myth') {
    wall(c, x, BY - 30, w, 30);
    if (s.world === 'myth') { for (let k = x + 3; k < x + w - 3; k += 7) P.box(k, BY - 28, 3, 28, tones(st.wall)[2]); roof(c, x, BY - 30, w, 'pediment'); }
    else { roof(c, x + w / 2 - 16, BY - 30, 32, 'dome'); for (const mx of [x - 2, x + w - 4]) { wall(c, mx, BY - 52, 6, 52); roof(c, mx, BY - 52, 6, 'dome'); } for (let k = x + 6; k < x + w - 6; k += 10) { win(c, k, BY - 22, 4, 7, 0.5); } }
    door(c, x + w / 2 - 5, BY - 14, 10, 14);
    return;
  }
  // 西洋の城: 城壁 + 塔 + 胸壁。ダークは崩れている
  const ruin = s.world === 'dark', stoneC = ruin ? '#6a6670' : s.world === 'game' ? '#c8c4bc' : s.world === 'academy' ? '#f0ece4' : '#a8a298';
  const keep = Math.round(w * 0.4);
  wall(c, x + (w - keep) / 2, BY - 56, keep, 56, stoneC, 'stone');
  for (let k = 0; k < keep; k += 4) if (!ruin || (hash(k) & 1)) P.box(x + (w - keep) / 2 + k, BY - 59, 2, 3, stoneC);
  for (let y = BY - 50; y < BY - 30; y += 10) for (let k = x + (w - keep) / 2 + 4; k < x + (w + keep) / 2 - 4; k += 8) win(c, k, y, 2, 4, 0.6);
  wall(c, x, BY - 26, w, 26, stoneC, 'stone');
  for (let k = 0; k < w; k += 4) if (!ruin || (hash(k, 3) % 3)) P.box(x + k, BY - 29, 2, 3, stoneC);
  for (const tx of [x - 4, x + w - 10]) {
    wall(c, tx, BY - 44, 14, 44, stoneC, 'stone');
    if (ruin) { for (let k = 0; k < 14; k++) P.box(tx + k, BY - 44, 1, Math.abs(((k * 5) % 9) - 4), horizon(c), true); continue; }
    const rc = tones(s.world === 'game' ? '#3a6ad8' : st.roofCol);
    for (let j = 0; j < 14; j++) P.box(tx + 7 - Math.ceil(j * 0.6), BY - 58 + j, Math.ceil(j * 0.6) * 2, 1, j % 2 ? rc[1] : rc[0]);
    P.box(tx + 6, BY - 62, 1, 4, '#4a3a2a'); P.box(tx + 7, BY - 62, 5, 3, s.world === 'game' ? '#e04a3a' : '#c8b048');
    win(c, tx + 5, BY - 36, 3, 5, 0.6);
  }
  const gx = x + w / 2 - 7;
  P.box(gx, BY - 16, 14, 16, '#2a2020'); for (let k = 0; k < 14; k++) P.px(gx + k, BY - 17 - Math.round(Math.sin(k / 13 * Math.PI) * 3), stoneC);
  if (!ruin) for (let k = 1; k < 14; k += 3) P.box(gx + k, BY - 16, 1, 9, '#5a5a60');
  banner(c, x + (w - keep) / 2 + keep / 2, s.world === 'game' ? '#3a6ad8' : '#a83a3a', 18, BY - 59);
}

function temple(c: Ctx, x: number, w: number): void {
  const { P, st, s } = c;
  switch (s.world) {
    case 'wa': case 'modern': {
      // 社 + 鳥居
      wall(c, x + 14, BY - 16, w - 28, 16, '#e8dcc0', 'plain');
      for (let k = x + 14; k < x + w - 14; k += 6) P.box(k, BY - 16, 2, 16, '#c8402a');
      roof(c, x + 14, BY - 16, w - 28, 'tile', '#5a4a3a');
      P.box(x + w / 2 - 3, BY - 13, 6, 3, '#d8b048'); P.box(x + w / 2, BY - 10, 1, 6, '#c8402a');
      torii(c, x + w / 2 - 14 + (c.dir > 0 ? -30 : 30), 28, 28, BY + 2);
      return;
    }
    case 'xianxia': {
      // 塔
      let y = BY, ww = 26, xx = x + w / 2 - 13;
      for (let f = 0; f < 5; f++) { wall(c, xx, y - 9, ww, 9, '#ece0c8', 'plain', f === 0); P.box(xx + ww / 2 - 2, y - 7, 4, 5, c.lit ? LIT : st.trim, c.lit); roof(c, xx, y - 9, ww, 'curve'); y -= 14; xx += 2; ww -= 4; }
      P.box(xx + ww / 2, y - 8, 1, 8, '#d8b048');
      fire(c, x + 6, BY + 2, 0.4);
      return;
    }
    case 'myth': case 'ocean': {
      const t = tones('#f2eee6');
      P.box(x, BY - 3, w, 3, t[0]); P.box(x + 2, BY - 5, w - 4, 2, t[1]);
      for (let k = x + 4; k < x + w - 6; k += 8) { for (let y = BY - 30; y < BY - 5; y++) P.box(k, y, 4, 1, (y & 1) ? t[1] : t[2]); P.box(k - 1, BY - 31, 6, 1, t[0]); }
      P.box(x + 1, BY - 34, w - 2, 3, t[1]); P.box(x + 1, BY - 33, w - 2, 1, st.trim);
      roof(c, x + 1, BY - 34, w - 2, 'pediment', '#e8e4dc');
      if (c.lit) fire(c, x + w / 2, BY - 6, 0.5);
      return;
    }
    case 'desert': {
      wall(c, x, BY - 26, w, 26); roof(c, x + w / 2 - 15, BY - 26, 30, 'dome', '#3a7ab8');
      wall(c, x + w - 8, BY - 56, 8, 56); roof(c, x + w - 8, BY - 56, 8, 'dome', '#3a7ab8');
      for (let k = x + 5; k < x + w - 12; k += 9) { win(c, k, BY - 20, 4, 8, 0.6); P.px(k + 1, BY - 21, tones(st.wall)[0]); P.px(k + 2, BY - 21, tones(st.wall)[0]); }
      door(c, x + w / 2 - 4, BY - 12, 8, 12);
      return;
    }
    case 'beast': case 'postapoc': {
      // 石の輪とトーテム
      for (let i = 0; i < 5; i++) { const sx = x + i * (w / 5); P.box(sx, BY - 14 - (i % 2) * 4, 6, 14 + (i % 2) * 4, tones(st.stone)[i % 2 ? 1 : 2]); P.box(sx, BY - 14 - (i % 2) * 4, 6, 1, tones(st.stone)[0]); }
      const tx = x + w / 2 - 3, tc = ['#c8402a', '#3a7ab8', '#e8c040', '#3a8a4a'];
      for (let j = 0; j < 4; j++) { P.box(tx, BY - 36 + j * 8, 7, 8, tones('#8a6a48')[1]); P.px(tx + 1, BY - 33 + j * 8, tc[j]); P.px(tx + 5, BY - 33 + j * 8, tc[j]); P.box(tx + 2, BY - 31 + j * 8, 3, 1, '#2a1a10'); }
      P.box(tx - 4, BY - 34, 15, 2, tones('#8a6a48')[0]);
      fire(c, x + w / 2 + (c.dir > 0 ? -18 : 18), BY + 4, 0.6);
      return;
    }
    case 'space': case 'cyberpunk': {
      // 光る碑
      const t = tones('#2a2a3a');
      P.box(x + w / 2 - 6, BY - 50, 12, 50, t[1]); P.box(x + w / 2 - 6 + (c.dir > 0 ? 9 : 0), BY - 50, 3, 50, t[2]);
      const gc = st.sci ? '#9ae8ff' : NEON[0];
      for (let y = BY - 46; y < BY - 4; y += 6) P.box(x + w / 2 - 1, y, 2, 3, gc, true);
      glow(c.P, x + w / 2, BY - 26, 26, gc, 0.18);
      P.box(x, BY - 4, w, 4, '#5a5a6a');
      return;
    }
    default: {
      // 教会: 尖塔と丸窓
      wall(c, x, BY - 28, w - 18, 28); roof(c, x, BY - 28, w - 18, 'gable');
      const tx = x + w - 20;
      wall(c, tx, BY - 48, 18, 48, s.world === 'dark' ? '#5a5660' : '#d8d0c4', 'stone');
      for (let j = 0; j < 22; j++) P.box(tx + 9 - j * 0.4, BY - 70 + j, j * 0.8 + 1, 1, tones(st.roofCol)[j % 2]);
      P.box(tx + 8, BY - 76, 2, 6, '#d8b048'); P.box(tx + 6, BY - 74, 6, 2, '#d8b048');
      disc(P, tx + 9, BY - 38, 4, c.lit ? LIT : '#5a7ab8', c.lit ? '#c8402a' : '#3a4a8a', c.lit);
      door(c, tx + 5, BY - 14, 8, 14);
      for (let k = x + 4; k < x + w - 24; k += 10) win(c, k, BY - 22, 4, 9, 0.6);
    }
  }
}

function shipDeck(c: Ctx): void {
  const { P, s, st } = c;
  if (st.sci) {
    // 艦内: 大きな窓から星と惑星
    const t = tones('#c8ccd8');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y < 12 || y >= 68 || x < 20 || x >= 300 || (x - 20) % 70 < 3) P.px(x, y, y < 12 ? (x % 20 === 0 ? t[0] : t[1]) : y >= 68 ? ((x + y) % 16 === 0 || y === 68 ? t[0] : dith(x, y, (y - 68) / 32) ? t[0] : t[1]) : t[2]);
    for (let x = 0; x < W; x += 40) P.box(x + 10, 13, 20, 1, '#9ae8ff', true);
    // 操作卓
    for (const cx of [40, 240]) { P.box(cx, 70, 40, 10, '#3a3e4a'); P.box(cx, 70, 40, 1, '#5a5e6a'); for (let k = 0; k < 8; k++) P.px(cx + 3 + k * 4, 73, NEON[(k + s.seed) % 4], 1, true); P.box(cx + 14, 62, 12, 7, '#4af0e8', true); }
    return;
  }
  // 甲板: 板張り + 舷側 + 帆柱。蒸気の世界は空を行く飛空艇
  const sky2 = s.world === 'steampunk';
  if (sky2) for (let y = 50; y < HZ + 6; y++) for (let x = 0; x < W; x++) if (dith(x, y, (y - 48) / 16)) P.px(x, y, c.night ? '#3a4060' : '#f0eef0', 1, true);
  const t = tones('#a07a4a');
  for (let y = BY - 2; y < H; y++) for (let x = 0; x < W; x++) P.px(x, y, y % 3 === 0 || (x + (y >> 1) * 13) % 31 === 0 ? t[0] : dith(x, y, (y - BY) / 20) ? t[1] : t[2]);
  P.box(0, BY - 8, W, 2, t[2]); P.box(0, BY - 2, W, 2, t[0]); for (let x = 4; x < W; x += 12) P.box(x, BY - 8, 2, 7, t[1]);
  const mx = (s.seed & 1) ? 50 : 262, sail = tones(s.world === 'dark' ? '#5a504a' : '#f0e8d8');
  P.box(mx, 0, 3, BY, '#5a4030'); P.box(mx - 30, 6, 63, 2, '#5a4030'); P.box(mx - 26, 52, 55, 2, '#5a4030');
  for (let y = 8; y < 52; y++) { const bulge = Math.round(Math.sin((y - 8) / 44 * Math.PI) * 4); P.box(mx - 28 + bulge, y, 58, 1, y % 9 === 0 ? sail[0] : (c.dir > 0 ? sail[2] : sail[1])); }
  if (s.world === 'ocean' || s.world === 'medieval') { const fc = '#2a2a2e'; P.box(mx - 6, 20, 14, 10, fc); P.box(mx - 3, 22, 8, 5, '#e8e4dc'); }
  for (let k = 0; k < 40; k++) P.px(mx - 30 + k * 0.75, 6 + k * 1.8, '#4a3a2a');
  barrel(c, mx > 160 ? 20 : 286, BY + 6);
  if (c.lit) { P.box(mx + 10, 58, 4, 5, LIT, true); glow(P, mx + 12, 60, 10, LIT, 0.25); }
}

function dungeon(c: Ctx): void {
  const { P, s, st } = c, kind = st.dun, vx = 160, vy = 46;
  const base = kind === 'metal' ? '#5a5e6e' : kind === 'cave' ? (s.world === 'beast' ? '#5a4a3a' : '#5a5650') : s.world === 'desert' ? '#a8845a' : s.world === 'myth' ? '#8a8478' : '#6a6460';
  const t = tones(base), ceil = mixc(t[0], '#000000', 0.35), memo = new Map<string, string>();
  // 奥ほど暗く。色ごとに8段を先に作っておく (画素ごとに mixc を呼ぶと 5ms を超える)
  const shade = (v: string, k: number) => { const key = v + k; let o = memo.get(key); if (!o) { o = mixc(v, '#000000', k / 14); memo.set(key, o); } return o; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // 奥へすぼまる回廊: 中央の暗い口、左右の壁、床、天井
    const dx = (x - vx) / 160, dy = y - vy, depth = Math.max(Math.abs(dx) * 46, dy > 0 ? dy * 0.9 : -dy * 0.9);
    let v: string;
    if (depth < 10) v = depth < 6 ? '#0a080c' : '#1a161c';
    else if (y > vy + Math.abs(dx) * 46) { const rows = Math.floor(Math.log(dy + 1) * 6), cols = Math.floor(dx * 12 * (dy + 4) / 10); v = (rows + cols) % 2 ? t[0] : t[1]; if (kind === 'cave' || s.world === 'ocean') v = dith(x, y, 0.4) ? t[0] : t[1]; if (s.world === 'ocean' && dy > 30) v = dith(x, y, 0.5) ? '#2a5a7a' : '#3a6a8a'; }
    else if (y < vy - Math.abs(dx) * 46) v = ceil;
    else {
      const sh = Math.min(1, depth / 50);
      if (kind === 'stone') v = (y % 6 === 0 || (x + Math.floor(y / 6) * 5) % 11 === 0) ? t[0] : sh > 0.5 ? t[2] : t[1];
      else if (kind === 'metal') v = x % 20 === 0 || y % 14 === 0 ? t[0] : (x % 20 === 2 && y % 14 === 2) ? t[3] : t[1];
      else v = (hash(x >> 2, y >> 2) & 3) === 0 ? t[0] : (hash(x >> 3, y >> 3) & 3) === 1 ? t[2] : t[1];
      v = shade(v, Math.round((1 - sh) * 7));
    }
    P.px(x, y, v);
  }
  if (kind === 'metal') { for (const lx of [40, 280]) { P.box(lx, 20, 2, 50, '#4af0e8', true); glow(P, lx, 45, 18, '#4af0e8', 0.2); } }
  else for (const tx of [52, 266]) { torch(c, tx, 40); }
  switch (s.world) {
    case 'game': chest(c, 236, GY + 2); chest(c, 72, GY + 2); break;
    case 'wa': torii(c, 146, 28, 26, 66); for (const lx of [100, 214]) { P.box(lx, 30, 6, 8, '#c8402a', true); P.box(lx + 1, 29, 4, 1, '#2a2a2a'); glow(P, lx + 3, 34, 8, '#f8a050', 0.25); } break;
    case 'xianxia': case 'modern': case 'space': for (let i = 0; i < 6; i++) { const cx = 20 + (hash(s.seed, i) % 280), cy = 70 + (hash(i, s.seed) % 24), gc = s.world === 'xianxia' ? '#5ae8a8' : '#b86aff'; for (let j = 0; j < 7; j++) P.box(cx - (j < 4 ? j >> 1 : (7 - j) >> 1), cy - j, 1 + (j < 4 ? j : 7 - j), 1, j < 3 ? gc : mixc(gc, '#ffffff', 0.4), true); glow(P, cx, cy - 3, 8, gc, 0.2); } break;
    case 'dark': case 'postapoc': for (const bx of [80, 230]) { P.box(bx, GY - 1, 8, 2, '#d8d0b8'); P.box(bx + 8, GY - 3, 4, 4, '#d8d0b8'); P.px(bx + 9, GY - 2, '#1a1a1a'); } for (let y = 0; y < 30; y += 2) { P.px(110, y, '#4a4a50'); P.px(210, y, '#4a4a50'); } break;
    case 'desert': for (let y = 50; y < 70; y += 6) for (let x = 20; x < 80; x += 7) P.box(x, y, 3, 2, '#7a5a3a'); break;
  }
}

// ---- 場所 ------------------------------------------------------------------

function sideX(c: Ctx, w: number, margin = 6): number { const left = (hash(c.s.seed, 11) & 1) === 0; return left ? margin + (c.s.seed % 8) : W - margin - w - (c.s.seed % 8); }
function other(c: Ctx, x: number): number { return x < 160 ? 240 + (c.s.seed % 30) : 20 + (c.s.seed % 30); }

function home(c: Ctx): void {
  const { s, st, P } = c;
  switch (s.home) {
    case 'hovel': {
      const x = sideX(c, 34);
      if (st.sci) { wall(c, x, BY - 16, 34, 16, '#7a6a5a', 'metal'); P.box(x - 1, BY - 17, 36, 1, '#4a4a54'); door(c, x + 6, BY - 12, 7, 12); win(c, x + 20, BY - 12, 8, 4, 0.8); }
      else { house(c, x, 30, 15, { roof: s.world === 'wa' || s.world === 'xianxia' ? st.roof : s.world === 'postapoc' ? 'flat' : 'thatch', roofCol: s.world === 'postapoc' ? '#7a5a3e' : st.roof === 'thatch' ? st.roofCol : '#a8904e', tex: st.tex === 'plain' || st.tex === 'timber' || st.tex === 'brick' ? 'plank' : st.tex, col: st.tex === 'plain' ? '#a4785a' : undefined, wins: 14 }); }
      barrel(c, x + 36, BY + 2); crate(c, x + 44, BY + 2);
      tree(c, other(c, x), BY);
      break;
    }
    case 'house': {
      const x = sideX(c, 46);
      house(c, x, 46, 24);
      if (st.far === 'mount' || st.snowy) { P.box(x + 34, BY - 38, 4, 10, '#7a4a3a'); if (c.tod !== 'day') smoke(c, x + 35, BY - 40, 8); }
      tree(c, other(c, x), BY);
      if (!st.sci && !st.urban) fence(c, x < 160 ? x + 50 : x - 30, x < 160 ? x + 76 : x - 4);
      else lamp(c, x < 160 ? x + 56 : x - 12);
      break;
    }
    case 'manor': {
      const x = sideX(c, 84, 2);
      if (s.world === 'wa') { house(c, x, 84, 20, { floors: 1, wins: 9 }); P.box(x - 6, BY - 6, 96, 6, '#e8e0cc'); P.box(x - 7, BY - 8, 98, 2, '#4a5262'); }
      else { house(c, x, 84, 36, { floors: 2, wins: 9 }); P.box(x + 36, BY - 4, 12, 4, tones(st.stone)[2]); }
      if (!st.sci) { rose(c, x < 160 ? x + 90 : x - 30, 24); tree(c, other(c, x) + (x < 160 ? 30 : 0), BY, 1.1); }
      lamp(c, x < 160 ? x + 88 : x - 8);
      break;
    }
    default: castle(c, sideX(c, 110, 0), 110);
  }
}

function place(c: Ctx): void {
  const { P, s, st } = c;
  switch (c.place) {
    case 'home': home(c); return;
    case 'field': {
      if (st.sci) {
        // 水耕棚とドーム
        for (let i = 0; i < 4; i++) { const rx = 10 + i * 82; P.box(rx, BY - 18, 50, 20, '#3a3e4a'); for (let j = 0; j < 3; j++) { P.box(rx + 2, BY - 16 + j * 6, 46, 1, '#c8ccd8'); for (let k = 0; k < 46; k += 3) P.px(rx + 3 + k, BY - 17 + j * 6, '#5ad85a'); P.box(rx + 2, BY - 18 + j * 6, 46, 1, '#f86ad8', true); } glow(P, rx + 25, BY - 10, 20, '#f86ad8', 0.12); }
        return;
      }
      crops(c, 0, W);
      const x = sideX(c, 30);
      if (s.world === 'postapoc') { P.box(x + 10, BY - 40, 3, 40, '#6a5a4a'); P.box(x + 22, BY - 40, 3, 40, '#6a5a4a'); wall(c, x + 4, BY - 56, 26, 16, '#8a5a3a', 'metal'); }
      else if (s.world === 'desert' || s.world === 'ocean') { tree(c, x, BY); tree(c, x + 22, BY + 2, 0.8); }
      else if (s.world === 'wa' || s.world === 'xianxia') { house(c, x, 30, 14, { roof: 'thatch', roofCol: '#a8904e' }); }
      else { house(c, x, 32, 22, { col: '#a8483c', tex: 'plank', roof: 'gable', roofCol: '#6a4a3a', floors: 1, wins: 30 }); }
      scarecrow(c, other(c, x));
      return;
    }
    case 'town': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const w = 30 + (hash(s.seed, i) % 14), x = i * 54 + (hash(i, s.seed) % 10) - 4, h = 18 + (hash(s.seed, i, 3) % 16);
        if (i === 2 || i === 3) { house(c, x, w, h - 6, { wins: 12 }); continue; }
        house(c, x, w, h, { roofCol: i % 2 && !st.sci && st.roof !== 'tile' ? mixc(st.roofCol, '#3a5a8a', 0.4) : undefined, wins: 9 });
      }
      lamp(c, 98 + (s.seed % 20)); lamp(c, 222 - (s.seed % 20));
      if (!st.sci) { barrel(c, 140, BY + 4); crate(c, 176, BY + 4); }
      return;
    }
    case 'city': {
      for (let i = 0; i < 9; i++) {
        const w = 24 + (hash(s.seed, i) % 14), x = i * 36 - 6, h = 30 + (hash(i, s.seed) % (st.sci || st.urban ? 44 : 22));
        house(c, x, w, h, { floors: Math.floor(h / 11), wins: 7, roof: st.sci || st.urban ? 'flat' : st.roof });
        if (s.world === 'cyberpunk' && i % 2) signboard(c, x + 2, BY - h + 6, 6, 18, 'shop');
      }
      if (!st.sci && !st.urban && s.world !== 'desert') { const sx = 120 + (s.seed % 80); wall(c, sx, BY - 50, 12, 50, st.stone, 'stone'); for (let j = 0; j < 20; j++) P.box(sx + 6 - j * 0.3, BY - 70 + j, j * 0.6 + 1, 1, tones(st.roofCol)[j % 2]); }
      lamp(c, 70); lamp(c, 250);
      return;
    }
    case 'guild': {
      const x = sideX(c, 72, 2);
      house(c, x, 72, 34, { floors: 2, wins: 11 });
      signboard(c, x + 22, BY - 30, 28, 10, 'guild');
      if (st.sci || s.world === 'modern') { terminal(c, other(c, x)); terminal(c, other(c, x) + 16); }
      else { const bx = other(c, x); P.box(bx, BY - 22, 26, 16, '#8a6038'); P.box(bx + 1, BY - 21, 24, 14, '#c8a870'); for (let i = 0; i < 6; i++) P.box(bx + 3 + (i % 3) * 8, BY - 19 + Math.floor(i / 3) * 7, 5, 5, ['#f0ece0', '#e8d8a0', '#f0e0d0'][i % 3]); P.box(bx + 3, BY - 6, 2, 8, '#6a4a30'); P.box(bx + 21, BY - 6, 2, 8, '#6a4a30'); barrel(c, x < 160 ? x + 76 : x - 10, BY + 2); }
      lamp(c, x < 160 ? x + 86 : x - 14);
      return;
    }
    case 'dungeon': dungeon(c); return;
    case 'battle': {
      const r = makeRng(hash(s.seed, 9));
      for (let i = 0; i < 4; i++) { const x = 20 + i * 80 + r() * 30; smoke(c, x, HZ + 2, 18, '#6a6460'); if (i % 2 === 0) fire(c, x, HZ + 4, 0.8); }
      const cols = ['#a83a3a', '#3a5aa8', '#d8b048', '#3a8a4a'];
      for (let i = 0; i < 4; i++) banner(c, i < 2 ? 14 + i * 26 : W - 26 - (i - 2) * 26, cols[(s.seed + (i < 2 ? 0 : 1)) % 4], 34 + (i % 2) * 6, BY + 6);
      for (let i = 0; i < 10; i++) { const x = r() * W, y = BY + 4 + r() * 14; if (st.sci) { P.box(x, y - 2, 6, 3, '#4a4a54'); P.px(x + 2, y - 3, '#f8a030', 1, true); } else { P.box(x, y - 8, 1, 8, '#8a8a90'); P.box(x - 1, y - 6, 3, 1, '#5a4030'); } }
      for (let i = 0; i < 40; i++) P.px(r() * W, BY + r() * 20, '#4a3a2a', 0.6);
      return;
    }
    case 'academy': {
      const x = sideX(c, 96, 0);
      house(c, x, 96, 32, { floors: 2, wins: 10, col: st.sci ? undefined : s.world === 'wa' || s.world === 'xianxia' ? undefined : '#f4f0ea', roof: st.urban || st.sci ? 'flat' : st.roof === 'gable' || st.roof === 'thatch' ? 'mansard' : st.roof });
      const tx = x + 40;
      wall(c, tx, BY - 56, 16, 24, st.sci ? st.wall : '#f4f0ea', st.sci ? 'metal' : 'plain', false);
      roof(c, tx, BY - 56, 16, st.sci ? 'dome' : st.roof === 'tile' || st.roof === 'curve' ? st.roof : 'gable', st.roof === 'mansard' ? st.roofCol : undefined);
      disc(P, tx + 8, BY - 47, 4, '#f8f4e8', '#5a5a5a', false); P.box(tx + 8, BY - 50, 1, 3, '#2a2a2a'); P.box(tx + 8, BY - 47, 2, 1, '#2a2a2a');
      const ox = other(c, x);
      if (s.world === 'academy' || s.world === 'medieval' || s.world === 'game') { fountain(c, ox - 10); rose(c, ox + 24, 20); } else tree(c, ox, BY);
      return;
    }
    case 'temple': temple(c, sideX(c, 72, 4), 72); tree(c, other(c, sideX(c, 72, 4)), BY); return;
    case 'shop': {
      const x = sideX(c, 52);
      house(c, x, 52, 30, { floors: 2, wins: 12 });
      const aw = st.sci ? [NEON[s.seed % 4], '#1a1a28'] : ['#e4e0d4', ['#c8483c', '#2e6a5a', '#3a5a8a'][s.seed % 3]];
      for (let i = 0; i < 14; i++) P.box(x - 2 + i * 4, BY - 17, 4, 4, aw[i % 2], st.sci);
      for (let i = 0; i < 14; i++) P.px(x - 2 + i * 4 + 2, BY - 13, aw[i % 2], 1, st.sci);
      const sx = x < 160 ? x + 56 : x - 34;
      P.box(sx, BY - 8, 30, 8, '#8a5a3a'); P.box(sx, BY - 8, 30, 1, '#a87a4a');
      for (let i = 0; i < 9; i++) P.box(sx + 2 + i * 3, BY - 11 - (i % 2), 2, 3, st.sci ? NEON[i % 4] : ['#d8a031', '#6b8e4e', '#c8553d', '#e8c84a', '#d84a4a', '#4a6ad8'][(i + s.seed) % 6], st.sci);
      signboard(c, x < 160 ? x + 52 : x - 10, BY - 30, 10, 8, 'shop');
      return;
    }
    case 'forge': {
      const x = sideX(c, 56);
      house(c, x, 56, 26, { tex: st.sci ? 'metal' : st.tex === 'plain' ? 'stone' : st.tex, floors: 1, wins: 50 });
      const ch = x + 44; wall(c, ch, BY - 48, 7, 22, '#7a5a4a', 'brick', false); smoke(c, ch + 3, BY - 50, 16, '#9a9490');
      P.box(x + 6, BY - 14, 14, 10, '#2a1a14'); fire(c, x + 13, BY - 5, 0.8);
      const ax = x < 160 ? x + 64 : x - 22, t = tones('#4a4a54');
      P.box(ax, BY - 4, 6, 6, '#5a4030'); P.box(ax - 3, BY - 8, 14, 3, t[1]); P.box(ax - 3, BY - 8, 14, 1, t[2]); P.box(ax - 5, BY - 7, 2, 1, t[1]);
      signboard(c, x < 160 ? x + 58 : x - 14, BY - 28, 12, 8, 'forge');
      for (let i = 0; i < 3; i++) P.box(ax + 18 + i * 3, BY - 12, 1, 14, '#9a9aa4');
      if (s.world === 'steampunk') { const gx = other(c, x); for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, rr = a % 2 ? 9 : 7; P.box(gx + Math.cos(ang) * rr, BY - 24 + Math.sin(ang) * rr, 2, 2, '#b8904a'); } disc(P, gx, BY - 24, 7, '#a8804a', '#8a6a3a', false); disc(P, gx, BY - 24, 2, '#4a3a2a', '#4a3a2a', false); }
      return;
    }
    case 'lab': {
      const x = sideX(c, 60);
      house(c, x, 44, 30, { floors: 2, wins: 10, tex: st.sci ? 'metal' : st.tex === 'plain' ? 'stone' : st.tex });
      const tx = x + 44;
      wall(c, tx, BY - 50, 16, 50, st.sci ? st.wall : st.stone, st.sci ? 'metal' : 'stone');
      const dt = tones(st.sci ? '#9ae8ff' : '#8ac8d8');
      for (let j = 0; j < 9; j++) for (let k = -10; k <= 10; k++) if (k * k / 100 + j * j / 81 < 1) P.px(tx + 8 + k, BY - 50 - j, (k + j) % 4 === 0 ? dt[3] : dt[1], 0.85);
      P.box(tx + 8, BY - 66, 1, 7, '#5a5a6a'); P.px(tx + 8, BY - 67, c.lit ? '#f84a4a' : '#8a4a4a', 1, c.lit);
      if (s.world === 'steampunk' || s.world === 'dark') for (let k = 0; k < 14; k++) P.px(tx + 8 + (hash(k, s.seed) % 7) - 3, BY - 67 - k, '#c8e8ff', 1, true);
      const ox = other(c, x);
      for (let i = 0; i < 3; i++) { const fc = ['#5ad85a', '#d85ab8', '#5ab8f8'][i]; P.box(ox + i * 7, BY - 6, 5, 6, '#c8d8e0'); P.box(ox + 1 + i * 7, BY - 4, 3, 4, fc, true); P.box(ox + 1 + i * 7, BY - 9, 3, 3, '#c8d8e0'); }
      return;
    }
    case 'castle': castle(c, 105, 110); for (const x of [20, 280]) lamp(c, x); return;
    case 'ship': shipDeck(c); return;
    case 'wild': {
      const r = makeRng(hash(s.seed, 5));
      if (st.sci) { for (let i = 0; i < 7; i++) { const x = r() * W, h = 8 + r() * 16, gc = ['#4af0e8', '#a85aff', '#5ad8a8'][i % 3]; for (let j = 0; j < h; j++) P.box(x - (h - j) * 0.2, BY + 2 - j, Math.max(1, (h - j) * 0.4), 1, j > h * 0.6 ? mixc(gc, '#ffffff', 0.3) : gc, c.lit); } rock(c, 40, 30, 10); rock(c, 250, 24, 8); return; }
      if (s.world === 'postapoc') { const x = sideX(c, 40); const t = tones('#8a4a2a'); P.box(x, BY - 8, 36, 8, t[1]); P.box(x + 6, BY - 14, 20, 6, t[0]); P.box(x + 8, BY - 13, 7, 4, '#2a2420'); for (const wx of [5, 26]) P.box(x + wx, BY - 1, 6, 4, '#1a1a1a'); for (let i = 0; i < 10; i++) P.px(x + r() * 36, BY - 8 + r() * 6, '#5a3020'); }
      for (let i = 0; i < 5; i++) { const x = (i < 3 ? 10 + i * 30 : 230 + (i - 3) * 40) + r() * 14; tree(c, x, BY + (i % 2) * 2, 0.8 + r() * 0.4); }
      rock(c, 110 + r() * 20, 18, 7); rock(c, 196 + r() * 20, 12, 5);
      if (s.world === 'desert') for (let i = 0; i < 3; i++) { const bx = 80 + i * 70; P.box(bx, BY + 2, 6, 2, '#e8e0cc'); P.box(bx + 6, BY, 3, 3, '#e8e0cc'); }
      return;
    }
    case 'grave': {
      const kind = st.sci || s.world === 'modern' ? 'plaque' : s.world === 'wa' || s.world === 'xianxia' ? 'pillar' : s.world === 'myth' || s.world === 'desert' ? 'stele' : s.world === 'beast' || s.world === 'postapoc' ? 'rough' : 'cross';
      const t = tones(kind === 'plaque' ? '#8a8e9a' : '#a8a8b0');
      const stone = (x: number, by: number, sc: number) => {
        const h = Math.round(16 * sc), w2 = Math.round(10 * sc);
        for (let j = 0; j < h; j++) for (let k = 0; k < w2; k++) {
          if (kind === 'cross' && !(k >= w2 * 0.35 && k < w2 * 0.65) && !(j > h * 0.2 && j < h * 0.42)) continue;
          if (kind === 'stele' && j < 3 && Math.abs(k - w2 / 2) > j * 2 + 1) continue;
          if (kind === 'rough' && ((k - w2 / 2) / (w2 / 2)) ** 2 + ((j - h) / h) ** 2 > 1) continue;
          if (kind === 'plaque' && j < h * 0.5) continue;
          if (kind === 'pillar' && (k < w2 * 0.25 || k >= w2 * 0.75) && j < h * 0.85) continue;
          c.P.px(x + k, by - h + j, (k > w2 * 0.6) === (c.dir > 0) ? t[2] : k < 2 ? t[0] : t[1]);
        }
        if (kind === 'pillar') { c.P.box(x, by - 2, w2, 2, t[0]); c.P.box(x + w2 * 0.25, by - h - 1, w2 * 0.5, 1, t[2]); }
      };
      for (let i = 0; i < 6; i++) stone(150 + i * 30 + (hash(s.seed, i) % 10) - 120 * (i % 2), BY - 2, 0.55);
      const gx = sideX(c, 20, 40); stone(gx, BY + 6, 1.2);
      for (const [fx, fc] of [[gx - 3, '#c84a5a'], [gx - 1, '#f2e6a0'], [gx + 15, '#e8e8f0']] as [number, string][]) { P.box(fx, BY + 3, 1, 3, '#3a6a3a'); P.px(fx, BY + 2, fc); }
      P.box(gx + 18, BY + 2, 2, 4, '#f2efd8'); P.px(gx + 18, BY + 1, '#f8c060', 1, true); glow(P, gx + 19, BY + 1, 6, '#f8c060', 0.3);
      if (s.world === 'dark' || s.world === 'medieval') tree(c, other(c, gx), BY, 1, 'dead');
      // 地を這う霧
      for (let y = BY - 6; y < BY + 8; y++) for (let x = 0; x < W; x++) if (dith(x, y, 0.35 * (Math.sin(x * 0.04 + y * 0.3) * 0.5 + 0.5))) P.px(x, y, '#8a92b0', 0.35);
      return;
    }
  }
}

// 天気: 雨 (サイバーパンク)、雪 (冬)、花びら (和の春)、砂塵 (終末)
function weather(c: Ctx): void {
  const { P, s } = c;
  if (indoor(s)) return;
  const r = makeRng(hash(s.seed, 77));
  if (s.world === 'cyberpunk' && (hash(s.seed, 3) % 5) < 3) for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H; for (let k = 0; k < 4; k++) P.px(x - k * 0.4, y + k, '#a8b8e0', 0.35); }
  else if (c.snow) for (let i = 0; i < 70; i++) P.px(r() * W, r() * H, '#ffffff', 0.85);
  else if (s.world === 'wa' && s.season === 0) for (let i = 0; i < 30; i++) P.px(r() * W, r() * H, '#f8c8d4');
  else if (s.world === 'postapoc') for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H; P.px(x, y, '#d8b080', 0.4); P.px(x + 1, y, '#d8b080', 0.4); }
}

export function paintScene(s: SceneSpec): Pix {
  const P = new Pix(W, H), st = STYLE[s.world] ?? STYLE.medieval, tod = todOf(s);
  const pl: Place = s.dead ? 'grave' : s.place;
  const sk = s.world === 'space' ? SPACE_SKY[tod] : SKY_OVER[s.world] ? SKY[tod].map((v) => mixc(v, SKY_OVER[s.world]![0], SKY_OVER[s.world]![1] * (tod === 'night' ? 0.4 : 1))) : SKY[tod];
  const c: Ctx = {
    P, s: { ...s, place: pl }, st, r: makeRng(hash(s.seed, 0x5c)), tod, dir: tod === 'morning' ? -1 : 1,
    lit: tod === 'dusk' || tod === 'night' || pl === 'dungeon' || s.world === 'cyberpunk', night: tod === 'night',
    snow: !!st.snowy && s.season === 3 && !st.sci, place: pl, sky: sk,
  };
  if (indoor(c.s)) { if (pl === 'ship') sky(c); P.tint = tintOf(c.s); if (pl === 'dungeon') dungeon(c); else shipDeck(c); return P; }
  sky(c);
  P.tint = tintOf(c.s);
  if (!(pl === 'ship' && s.world === 'steampunk')) backdrop(c);
  const paved = pl === 'town' || pl === 'city' || pl === 'shop' || pl === 'guild' || ((st.sci || st.urban) && pl !== 'field' && pl !== 'wild' && pl !== 'grave' && pl !== 'battle');
  if (pl !== 'ship') ground(c, !!paved);
  place(c);
  weather(c);
  return P;
}
