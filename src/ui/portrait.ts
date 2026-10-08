// 顔 48×56。顔は楕円に3段の陰影 (光は右上)、髪は毛筋とつや。種族で耳・角・肌・目、身分で服の飾り。
// 見た目は look.ts が seed から決めるので、場面の立ち絵と同じ色になる。亡くなった人は灰色にする。
import type { Figure } from '../engine/types';
import { lookOf } from './look';
import { dith, mixc, Pix, tones } from './raster';

export const PW = 48, PH = 56;
const FX = 23.5, FY = 26.5, RX = 10, RY = 13;
const side = (x: number) => Math.abs(x - FX);
const inFace = (x: number, y: number) => ((x - FX) / RX) ** 2 + ((y - FY) / RY) ** 2 <= 1;
const inSkull = (x: number, y: number, gx = 0, gy = 0) => ((x - FX) / (RX + 1.6 + gx)) ** 2 + ((y - 23) / (RY + 0.5 + gy)) ** 2 <= 1;
const DARK = '#1a1018';

export function paintPortrait(f: Figure): Pix {
  const o = lookOf(f);
  const P = new Pix(PW, PH);
  const px = (x: number, y: number, c: string, a = 1) => P.px(x, y, c, a);
  const box = (x: number, y: number, w: number, h: number, c: string) => P.box(x, y, w, h, c);
  const each = (fn: (x: number, y: number) => void) => { for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) fn(x, y); };
  const fill = (inside: (x: number, y: number) => boolean, col: (x: number, y: number) => string, a = 1) => each((x, y) => { if (inside(x, y)) px(x, y, col(x, y), a); });
  // 太さが先へ細くなる線 (角・耳・尾)
  const stroke = (pts: number[][], w0: number, c: string[]) => {
    for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t <= 1; t += 0.1) {
      const k = (i + t) / (pts.length - 1), x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      const r = Math.max(0.5, w0 * (1 - k * 0.85));
      for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) px(xx, yy, c[xx < x - r * 0.3 ? 0 : xx > x + r * 0.3 ? 2 : 1]);
    }
  };
  const mirror = (pts: number[][]) => pts.map(([x, y]) => [47 - x, y]);
  const sk = tones(o.skin), hr = tones(o.hair), cl = tones(o.cloth), s2 = tones(o.skin2);
  const ja = o.jelly ? 0.78 : 1;

  // 背景: 縦のグラデーションをディザで
  const bg2 = mixc(o.bg, '#3a3440', 0.22);
  each((x, y) => px(x, y, dith(x, y, y / PH) ? bg2 : o.bg));
  if (o.halo) for (let x = 14; x < 34; x++) for (let y = 1; y < 8; y++) { const d = ((x - FX) / 9) ** 2 + ((y - 4) / 2.2) ** 2; if (d <= 1 && d >= 0.45) P.px(x, y, d > 0.8 ? '#d8a830' : '#fff0a0', 1, true); }

  // 翼 (肩の後ろ)
  if (o.wing) for (const s of [-1, 1]) {
    const wx = (x: number) => (s < 0 ? x : 47 - x);
    const wc = tones(o.wingC);
    for (let y = 18; y < PH; y++) for (let x = 0; x < 14; x++) {
      const X = wx(x);
      if (o.wing === 'feather' && ((x - 7) / 8) ** 2 + ((y - 36) / 17) ** 2 <= 1 && !(y > 46 && (x + y) % 5 === 0)) px(X, y, (y + x) % 4 === 0 ? wc[0] : x > 7 ? wc[2] : wc[1]);
      if (o.wing === 'bat' && y < 46 && x > (y - 18) * 0.25 && ((x - 8) / 8) ** 2 + ((y - 30) / 12) ** 2 <= 1 && !(y > 36 && Math.abs(((x + 1) % 5) - 2) < 1.5 && y > 40 - (x % 5))) px(X, y, x % 5 === 1 ? wc[2] : wc[0]);
      if (o.wing === 'fairy') { const up = ((x - 6) / 7) ** 2 + ((y - 26) / 9) ** 2 <= 1, lo = ((x - 8) / 5) ** 2 + ((y - 40) / 6) ** 2 <= 1; if (up || lo) P.px(X, y, x % 4 === 0 ? '#ffffff' : o.wingC, 0.55, true); }
    }
  }
  // 頭巾 (後ろ)
  if (o.hat === 'hood' || o.hat === 'veil') { const hc = tones(o.hatC); fill((x, y) => ((x - FX) / 15) ** 2 + ((y - 25) / 18) ** 2 <= 1 || (y > 36 && side(x) < 16), (x, y) => hc[(x - FX) / 18 + ((x + y) % 9 === 0 ? -0.3 : 0) > 0.35 ? 2 : x < 14 ? 0 : 1]); }

  // 髪の色: 右から光、毛筋の線
  const hairAt = (x: number, y: number) => { const l = (x - FX) / 14 + 0.15 - (y - 14) / 70 + ((x * 3 + y) % 6 === 0 ? 0.25 : (x + y * 2) % 7 === 0 ? -0.2 : 0); return hr[l > 0.55 ? 3 : l > 0.25 ? 2 : l > -0.25 ? 1 : 0]; };
  const fillHair = (fn: (x: number, y: number) => boolean) => fill(fn, hairAt, ja);
  const top = (hl: (x: number) => number) => (x: number, y: number) => inSkull(x, y) && y < hl(x);
  const H = o.style;
  const hooded = o.hat === 'hood' || o.hat === 'veil';

  // 後ろ髪
  if (!hooded) {
    if (H === 'long') fillHair((x, y) => inSkull(x, y, 1.5, 0) || (y >= 22 && y < 52 && side(x) < 13.5 - (y > 46 ? (y - 46) * 0.6 : 0)));
    if (H === 'bob') fillHair((x, y) => inSkull(x, y, 2, 0) || (y >= 22 && y < 39 && side(x) < 13.5));
    if (H === 'pony') { fillHair((x, y) => inSkull(x, y, 0.8, 0)); for (let y = 14; y < 44; y++) box(33 + Math.floor((y - 14) / 7), y, 5 - Math.floor((y - 14) / 9), 1, y % 3 ? hr[1] : hr[0]); }
    if (H === 'twin') { fillHair((x, y) => inSkull(x, y, 0.8, 0)); for (const s of [-1, 1]) fillHair((x, y) => ((x - FX - s * 15) / 3.5) ** 2 + ((y - 30) / 14) ** 2 <= 1 && y > 16); }
    if (H === 'braid') { fillHair((x, y) => inSkull(x, y, 0.8, 0)); for (let y = 30; y < 54; y++) { const w = y % 4 < 2 ? 3 : 4; box(32 - (w > 3 ? 1 : 0) - Math.floor((y - 30) / 8), y, w, 1, y % 4 === 0 ? hr[0] : hr[1]); } }
    if (H === 'short' || H === 'spiky' || H === 'side' || H === 'bun') fillHair((x, y) => inSkull(x, y, 0.6, 0) && y < 26);
  }

  // 肩・服と首
  const wide = Math.max(0, (o.width - 10) * 0.8);
  const metal = o.kind === 'armor';
  fill((x, y) => y >= 44 && side(x) < 20 + wide - Math.max(0, 48 - y) * 1.2, (x, y) => (side(x) > 17 + wide && o.cape ? tones(o.cape)[x > FX ? 2 : 0] : x > 33 + wide ? cl[2] : x < 14 - wide ? cl[0] : cl[1]));
  box(20, 37, 8, 8, sk[0]); box(23, 38, 5, 7, sk[1]);
  const tr = tones(o.trim);
  if (metal) { for (const s of [-1, 1]) fill((x, y) => ((x - FX - s * (15 + wide)) / 7) ** 2 + ((y - 47) / 4.5) ** 2 <= 1, (x, y) => (y < 45 ? cl[3] : (x - FX) * s > 15 + wide ? cl[2] : cl[1])); box(17, 42, 14, 3, cl[0]); box(18, 42, 12, 1, cl[2]); box(18, 51, 12, 1, tr[1]); }
  else if (o.kind === 'robe') for (let i = 0; i < 7; i++) { px(19 + i * 0.7, 44 + i, tr[1]); px(28 - i * 0.7, 44 + i, tr[1]); px(20 + i * 0.7, 44 + i, tr[2]); }
  else if (o.kind === 'kimono') { for (let i = 0; i < 9; i++) { px(19 + i, 43 + i, '#ece6dc'); px(18 + i, 43 + i, tr[1]); px(29 - i * 0.6, 43 + i * 0.8, tr[1]); } box(14, 54, 20, 2, tr[0]); }
  else if (o.kind === 'suit') { for (let y = 44; y < PH; y++) { const w = Math.max(0, 6 - (y - 44)); box(FX - w / 2, y, w, 1, '#ece6dc'); } box(23, 45, 2, 11, tr[1]); px(23, 45, tr[2]); for (let i = 0; i < 8; i++) { px(18 + i * 0.6, 44 + i, cl[0]); px(29 - i * 0.6, 44 + i, cl[0]); } }
  else if (o.kind === 'coat') { box(16, 41, 4, 5, tr[1]); box(28, 41, 4, 5, tr[1]); box(23, 46, 2, 10, cl[0]); for (let y = 48; y < PH; y += 3) px(25, y, tr[2]); }
  else if (o.kind === 'apron') { box(18, 44, 2, 12, tr[1]); box(28, 44, 2, 12, tr[1]); box(20, 50, 8, 6, tr[2]); }
  else if (o.kind === 'rags') for (let x = 17; x < 31; x++) px(x, 44 + ((x * 7) % 3 === 0 ? 1 : 0), cl[0]);
  else for (let x = 19; x < 29; x++) px(x, 44 + (side(x) < 3 ? 1 : 0), tr[1]);
  if (o.gold) for (let x = 12; x < 36; x += 2) px(x, 52 + (side(x) < 6 ? 0 : 1), '#e8c050');
  if (o.cape) { const c = tones(o.cape); box(10 - wide, 44, 4, 2, c[1]); box(34 + wide, 44, 4, 2, c[1]); px(15, 45, '#e8c050'); px(32, 45, '#e8c050'); }
  if (o.patch) { box(9, 49, 5, 4, mixc(o.cloth, '#c8a878', 0.5)); for (let x = 9; x < 14; x += 2) px(x, 48, '#2a2018'); }
  if (o.collar) { box(19, 40, 10, 3, '#5a5a62'); box(19, 40, 10, 1, '#8a8a94'); box(23, 43, 2, 2, '#6a6a72'); }
  if (o.mask === 'gas') { box(18, 44, 12, 7, '#4a4a42'); box(19, 45, 4, 4, '#2a2a28'); box(25, 45, 4, 4, '#2a2a28'); px(20, 46, '#8ab0a0'); px(26, 46, '#8ab0a0'); box(22, 50, 4, 3, '#3a3a34'); }

  // 耳 (横)
  const beast = !!o.beast;
  const longHair = H === 'long' || H === 'bob' || H === 'twin';
  if (!beast && !o.snout && !o.alien) for (const s of [-1, 1]) {
    const ex = s < 0 ? 12 : 34, m = (pts: number[][]) => (s < 0 ? pts : mirror(pts));
    if (o.ear === 'round' && !longHair && !hooded) { box(ex, 25, 2, 5, s < 0 ? sk[0] : sk[1]); px(s < 0 ? 13 : 34, 27, sk[0]); }
    if (o.ear === 'elf') stroke(m([[13, 28], [9, 25], [4, 20]]), 2, sk);
    if (o.ear === 'half') stroke(m([[13, 28], [10, 25], [8, 23]]), 1.8, sk);
    if (o.ear === 'goblin') stroke(m([[13, 27], [7, 24], [1, 21]]), 3, sk);
    if (o.ear === 'fin') for (let i = 0; i < 4; i++) stroke(m([[13, 25 + i], [7 - i * 0.5, 20 + i * 3]]), 1.2, s2);
    if (o.ear === 'mech') { box(s < 0 ? 10 : 34, 24, 4, 7, '#8a96a8'); box(s < 0 ? 11 : 35, 25, 2, 5, '#5a6270'); P.px(s < 0 ? 11 : 36, 27, o.eye, 1, true); }
  }

  // 顔: 3段の陰影 (光は右上)
  const shade = (x: number, y: number, c = sk) => { const l = ((x - FX) / RX) * 0.8 - ((y - FY) / RY) * 0.3; return c[l > 0.35 ? 2 : l < -0.45 ? 0 : 1]; };
  if (o.snout) {
    const belly = tones(mixc(o.skin, '#f0e0b0', 0.45));
    const inHead = (x: number, y: number) => ((x - FX) / 11) ** 2 + ((y - 24) / 13) ** 2 <= 1 || ((x - FX) / 8.5) ** 2 + ((y - 34) / 7) ** 2 <= 1;
    fill(inHead, (x, y) => (y > 33 && side(x) < 6 ? belly[1] : (x + (y >> 1) * 2) % 4 === 0 && y % 2 === 0 ? s2[0] : shade(x, y)));
    for (let i = 0; i < 4; i++) { const y = 6 + i * 3; box(23, y, 2, 3, s2[i % 2]); px(22, y + 2, s2[0]); px(25, y + 2, s2[0]); }
    for (const ex of [15, 30]) { box(ex, 24, 3, 3, o.eye); box(ex + 1, 24, 1, 3, DARK); px(ex + 2, 24, '#ffffff'); box(ex, 23, 3, 1, s2[0]); }
    px(21, 33, DARK); px(26, 33, DARK);
    for (let x = 16; x < 32; x++) px(x, 38 + (side(x) > 6 ? -1 : 0), s2[0]);
  } else if (o.alien) {
    fill((x, y) => ((x - FX) / 13) ** 2 + ((y - 22) / 15) ** 2 <= 1 && y < 38 - Math.max(0, side(x) - 4) * 0, (x, y) => shade(x, y));
    fill((x, y) => ((x - FX) / 6.5) ** 2 + ((y - 34) / 7) ** 2 <= 1, (x, y) => shade(x, y));
    for (const s of [-1, 1]) fill((x, y) => { const dx = (x - FX - s * 6) * 0.9 + s * (y - 27) * 0.5, dy = y - 28; return (dx / 4) ** 2 + (dy / 2.6) ** 2 <= 1; }, (x, y) => ((x + y) % 7 === 0 ? '#6a6a80' : '#141018'));
    box(22, 37, 4, 1, sk[0]);
  } else {
    fill(inFace, (x, y) => shade(x, y), ja);
    if (o.jelly) { fill((x, y) => inFace(x, y) && ((x - 29) / 3) ** 2 + ((y - 19) / 4) ** 2 <= 1, () => sk[3], 0.7); for (const [x, y] of [[20, 40], [27, 41], [25, 43]]) box(x, y, 1, 2, sk[1]); }
    if (o.scales) for (const s of [-1, 1]) for (const [dx, dy] of [[8, 0], [9, 2], [7, 3], [8, 5], [9, -2]]) px(FX + s * dx - 0.5 + (s > 0 ? 1 : 0), 26 + dy, (dx + dy) % 2 ? s2[1] : s2[2]);
    if (o.seams) { for (let y = 31; y < 39; y++) { px(17, y, o.skin2); px(30, y, o.skin2); } box(15, 20, 18, 1, mixc(o.skin, o.skin2, 0.5)); }
    if (o.mech) { fill((x, y) => inFace(x, y) && x > 25 && y > 22 && y < 33, (x, y) => (y === 23 || x === 26 ? '#4a5260' : s2[x > 30 ? 2 : 1])); box(27, 27, 4, 3, '#2a2028'); P.px(28, 28, '#ff4040', 1, true); P.px(29, 28, '#ff8070', 1, true); }
    if (o.spots) for (const [x, y] of [[16, 22], [17, 23], [29, 33], [30, 32], [31, 20], [19, 35]]) px(x, y, o.skin2);
    if (o.rune) { px(24, 18, '#c03a6a'); px(23, 19, '#c03a6a'); px(25, 19, '#c03a6a'); px(24, 20, '#c03a6a'); }
    if (o.wrinkle) { px(17, 31, sk[0]); px(31, 31, sk[0]); px(18, 32, sk[0]); px(30, 32, sk[0]); box(20, 20, 7, 1, sk[0]); }
    if (o.wrinkle > 1) { box(21, 22, 5, 1, sk[0]); px(16, 29, sk[0]); px(32, 29, sk[0]); px(19, 33, sk[0]); px(29, 33, sk[0]); }
    // 目・眉・鼻・口
    const young = o.stage === 'infant' || o.stage === 'child';
    const brow = o.wrinkle > 1 ? hr[1] : hr[0];
    if (!o.jelly) { box(17, 25, 4, 1, brow); box(27, 25, 4, 1, brow); }
    for (const ex of [18, 27]) {
      if (o.mech && ex === 27) continue;
      if (o.pupil === 'black') { box(ex - 1, 28, 5, 3, '#1a1018'); px(ex + 1, 29, o.eye); px(ex + 2, 29, o.eye); continue; }
      const eh = young ? 3 : o.wrinkle > 1 ? 2 : 3;
      box(ex, 28, 3, eh, o.eye); box(ex, 28, 3, 1, mixc(o.eye, DARK, 0.5));
      if (o.pupil === 'slit') box(ex + 1, 28, 1, eh, DARK); else if (o.pupil === 'glow') { for (let x = ex; x < ex + 3; x++) P.px(x, 29, '#ffffff', 0.6, true); } else px(ex + 1, 29, DARK);
      px(ex + 2, 28, '#ffffff');
      box(ex - (o.sex === 'F' ? 1 : 0), 27, o.sex === 'F' ? 4 : 3, 1, DARK);
      if (o.sex === 'F') px(ex + (ex < FX ? -1 : 3), 28, DARK);
    }
    if (!o.jelly) {
      px(24, 31, sk[2]); px(23, 32, sk[0]); px(24, 33, sk[0]);
      if (o.bigNose) { box(22, 31, 4, 3, sk[2]); box(22, 34, 4, 1, sk[0]); }
    }
    if (o.blush) for (const x of [16, 30]) { px(x, 32, '#e07a7a', 0.45); px(x + 1, 32, '#e07a7a', 0.45); }
    const lip = mixc(o.skin, '#7a2a2a', 0.35);
    box(22, 36, 5, 1, o.jelly ? sk[0] : lip);
    if (o.fangs) { px(22, 37, '#f8f4ec'); px(26, 37, '#f8f4ec'); }
    if (o.tusks) { box(20, 34, 1, 3, '#ece4c8'); box(28, 34, 1, 3, '#ece4c8'); }
    if (o.beard) fill((x, y) => y > 31 && y < 44 && (inFace(x, y) || (y > 38 && side(x) < 7)) && !(y === 36 && side(x) < 3) && !(y < 34 && side(x) < 6), hairAt);
  }
  if (o.mask === 'cloth') fill((x, y) => inFace(x, y) && y >= 32, (x, y) => tones(o.cloth)[x > 28 ? 2 : 1]);

  // 前髪・頭頂
  if (!hooded) {
    const longFront = top((x) => 18 + side(x) * 0.25 + (side(x) > 9 ? 6 : 0) - (x > FX + 1 && x < FX + 4 ? 2 : 0));
    if (H === 'short') fillHair(top((x) => 19 + (side(x) > 8 ? 4 : 0) + ((x & 1) && side(x) < 8 ? 1 : 0)));
    if (H === 'spiky') { fillHair(top((x) => 20 + (side(x) > 8 ? 3 : 0) - (x % 3 === 0 ? 1 : 0))); for (const sx of [13, 18, 24, 30, 35]) stroke([[sx, 13], [sx + (sx - FX) * 0.25, 6]], 2.2, hr); }
    if (H === 'side') fillHair(top((x) => (x < 20 ? 22 : 18 - (x - 20) * 0.15) + (side(x) > 9 ? 5 : 0)));
    if (H === 'long' || H === 'bob' || H === 'pony' || H === 'twin' || H === 'braid') fillHair(longFront);
    if (H === 'bun') { fillHair(top((x) => 18 + side(x) * 0.3 + (side(x) > 9 ? 4 : 0))); fillHair((x, y) => ((x - FX) / 5.5) ** 2 + ((y - 7) / 4.5) ** 2 <= 1); }
    if (H === 'tuft') { fillHair((x, y) => inSkull(x, y) && y < 15 && side(x) < 6); stroke([[24, 12], [27, 7], [25, 5]], 1.3, hr); }
    if (H === 'bald') {
      fill((x, y) => inSkull(x, y) && !inFace(x, y) && y < 20, (x, y) => { const l = (x - FX) / 11 - (y - 12) / 18; return l > 0.45 ? sk[3] : l > 0 ? sk[2] : sk[1]; });
      for (let y = 20; y < 30; y++) for (const x of [12, 13, 34, 35]) if (inSkull(x, y)) px(x, y, hairAt(x, y));
    }
    if (H === 'twin') for (const s of [-1, 1]) box(FX + s * 11 - 1.5, 16, 3, 3, '#d84a6a');
  } else {
    const hc = tones(o.hatC);
    fill((x, y) => ((x - FX) / 14) ** 2 + ((y - 24) / 16) ** 2 <= 1 && !(((x - FX) / 9.5) ** 2 + ((y - 28) / 12) ** 2 <= 1 && y > 17), (x, y) => hc[(x - FX) / 14 > 0.3 ? 2 : (x - FX) / 14 < -0.4 ? 0 : 1]);
    fillHair((x, y) => inFace(x, y) && y < 22 && y > 15 && (side(x) > 5 || y < 19));
    if (o.hat === 'veil') box(15, 15, 18, 2, '#d8b050');
  }

  // 獣の耳 (頭の上)
  if (o.beast) {
    const fc = tones(o.fur), inner = mixc(o.fur, '#e8a0a0', 0.4);
    for (const s of [-1, 1]) {
      const m = (pts: number[][]) => (s < 0 ? pts : mirror(pts));
      if (o.beast === 'cat' || o.beast === 'fox' || o.beast === 'wolf' || o.beast === 'dog') {
        const big = o.beast === 'wolf' ? 1.25 : o.beast === 'fox' ? 1.15 : o.beast === 'dog' ? 1 : 0.95;
        const bx = s < 0 ? 15 : 32, ty = 13 - 9 * big;
        for (let y = Math.floor(ty); y < 15; y++) { const k = (y - ty) / (15 - ty), hw = k * 4.5 * big; for (let x = Math.floor(bx - hw); x <= bx + hw; x++) px(x, y, Math.abs(x - bx) < hw - 1.6 && y > ty + 2 ? inner : fc[x > bx ? 2 : 1]); }
        if (o.beast === 'fox') { px(bx, Math.floor(ty), '#f4f0e8'); px(bx, Math.floor(ty) + 1, '#f4f0e8'); }
      }
      if (o.beast === 'dogdrop') stroke(m([[14, 12], [10, 16], [9, 24]]), 3.2, fc);
      if (o.beast === 'rabbit') { stroke(m([[18, 12], [16, 4], [17, -6]]), 3, fc); stroke(m([[18, 10], [16.5, 2]]), 1, [inner, inner, inner]); }
    }
  }
  // 角
  if (o.horn) {
    const hc = tones(o.hornC);
    for (const s of [-1, 1]) {
      const m = (pts: number[][]) => (s < 0 ? pts : mirror(pts));
      if (o.horn === 'back') stroke(m([[15, 15], [10, 10], [8, 4], [10, 0]]), 2.4, hc);
      if (o.horn === 'up') stroke(m([[16, 13], [13, 7], [13, 2], [15, -1]]), 2.4, hc);
      if (o.horn === 'ram') stroke(m([[16, 14], [11, 12], [8, 16], [9, 21], [13, 21]]), 2.4, hc);
      if (o.horn === 'oni2') stroke(m([[19, 14], [17, 7], [17, 3]]), 2.2, hc);
    }
    if (o.horn === 'oni1') stroke([[23.5, 15], [23.5, 6], [24, 1]], 3, hc);
  }
  // 頭の飾り
  if (o.hat === 'goggles') { box(13, 16, 22, 2, '#3a2a22'); for (const gx of [16, 26]) { box(gx, 14, 6, 5, '#7a6a4a'); box(gx + 1, 15, 4, 3, '#6ab0c8'); px(gx + 3, 15, '#ffffff'); } }
  if (o.hat === 'band' || o.hat === 'circlet') { box(13, 18, 22, 2, o.hat === 'circlet' ? '#d8b050' : tones(o.trim)[1]); if (o.hat === 'circlet') P.px(23, 18, '#80c0ff', 1, true); }
  if (o.crown === 'crown') { const g = tones('#d8b050'); box(15, 9, 18, 4, g[1]); box(15, 12, 18, 1, g[0]); for (const x of [15, 19, 23, 27, 31]) box(x, 6, 2, 3, g[2]); P.px(23, 10, '#d03050', 1, true); P.px(18, 10, '#3060d0', 1, true); P.px(29, 10, '#30a060', 1, true); }
  if (o.crown === 'tiara') { for (let x = 16; x < 32; x++) px(x, 14 + Math.round(side(x) * side(x) / 40), '#e8c050'); box(23, 11, 2, 3, '#e8c050'); P.px(23, 12, '#e05080', 1, true); }

  if (f.dead) P.grey();
  return P;
}
