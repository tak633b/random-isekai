// 立ち絵 32×48 の全身。2〜3頭身の RPG 風。背景は透明のままで、足元が下端。
// 体の寸法・色・服・持ち物は look.ts が決める。最後に 1px の暗い輪郭を付けて、どんな背景からも浮くようにする。
import type { Figure } from '../engine/types';
import { lookOf, type Item, type Look } from './look';
import { mixc, Pix, tones } from './raster';

export const SW = 32, SH = 48;
const DARK = '#1a1018';
const WOOD = tones('#7a5232'), STEEL = tones('#9aa2b0'), GOLD = tones('#d8b050'), PAPER = '#f0ece0';

export function paintSprite(f: Figure): Pix {
  const o = lookOf(f);
  const P = new Pix(SW, SH);
  // 半透明 (スライム・妖精の羽・光) は最後に alpha を下げる。上から別の色を塗れば消える
  const glass = new Uint8Array(SW * SH);
  const px = (x: number, y: number, c: string, g = 0, raw = false) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    P.px(x, y, c, 1, raw); glass[y * SW + x] = g;
  };
  const box = (x: number, y: number, w: number, h: number, c: string, g = 0) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, c, g); };
  const line = (pts: number[][], w: number, c: string[], g = 0) => {
    for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t <= 1; t += 0.08) {
      const k = (i + t) / (pts.length - 1), x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      const r = Math.max(0.5, w * (1 - k * 0.6));
      for (let yy = Math.round(y - r + 0.5); yy <= y + r - 0.5; yy++) for (let xx = Math.round(x - r + 0.5); xx <= x + r - 0.5; xx++) px(xx, yy, c[Math.min(c.length - 1, xx < x ? 0 : 1)], g);
    }
  };
  const J = o.jelly ? 1 : 0;
  const sk = tones(o.skin), hr = tones(o.hair), cl = tones(o.cloth), tr = tones(o.trim), s2 = tones(o.skin2);
  const metal = o.kind === 'armor';
  const body = metal ? tones(mixc(o.cloth, '#c8d0dc', 0.2)) : cl;

  // 寸法
  const w = o.width, x0 = 16 - w / 2, x1 = 15 + w / 2;
  const legTop = 48 - o.leg, top = legTop - o.body;
  const hw = 2 * Math.round(o.head / 2) + (o.alien ? 2 : 0), hh = o.head;
  const hb = top + (o.stoop ? 1 : 0), ht = hb - hh + 1, hx0 = 16 - hw / 2, hx1 = 15 + hw / 2;
  const hcy = ht + hh / 2;
  const inHead = (x: number, y: number, g = 0) => ((x + 0.5 - 16) / (hw / 2 + g)) ** 2 + ((y + 0.5 - hcy) / (hh / 2 + g)) ** 2 <= 1;
  const eyeY = ht + Math.round(hh * 0.55), e = Math.round(hw * 0.25);
  const armLen = Math.max(3, o.body - 1), handY = top + armLen;
  const LH: [number, number] = [x0 - 2, handY - 1], RH: [number, number] = [x1 + 1, handY - 1];

  // ---- 背中 ----
  if (o.cape) { const c = tones(o.cape); for (let y = top + 1; y < Math.min(47, legTop + o.leg - 2); y++) { const g = Math.min(3, (y - top) >> 2); box(x0 - 1 - g, y, w + 2 + g * 2, 1, (y & 1) ? c[0] : c[1]); } }
  if (o.back === 'pack') { box(x0 - 1, top - 1, w + 2, o.body - 1, WOOD[1]); box(x0, top - 3, w, 2, '#8a7a5a'); }
  if (o.back === 'quiver') { box(x1 - 2, top - 4, 3, o.body, '#6a4a2a'); for (const dx of [-2, -1, 0]) { px(x1 + dx, top - 6, '#e8e0d0'); px(x1 + dx, top - 5, '#c03a2a'); } }
  if (o.back === 'greatsword') { line([[x1 + 2, top - 6], [x0 - 2, legTop + 3]], 1.2, STEEL); box(x1, top - 7, 3, 2, WOOD[1]); box(x1 - 1, top - 5, 5, 1, GOLD[1]); }
  if (o.back === 'blade') { line([[x0 - 1, top - 5], [x1 + 1, legTop]], 0.6, ['#2a2a32', '#3a3a44']); box(x0 - 2, top - 6, 2, 2, '#c03a2a'); }
  if (o.wing) {
    const wc = tones(o.wingC);
    for (const s of [-1, 1]) for (let y = top - 8; y < legTop + 2; y++) for (let dx = 0; dx < 10; dx++) {
      const X = s < 0 ? x0 - dx : x1 + dx, yy = y - (top - 8);
      if (o.wing === 'feather' && ((dx - 4) / 5.5) ** 2 + ((y - top + 1) / 8) ** 2 <= 1 && !(y > top + 4 && (dx + y) % 3 === 0)) px(X, y, dx > 6 || yy % 4 === 0 ? wc[0] : wc[2]);
      if (o.wing === 'bat' && y < top + 6 && dx < 9 && yy > dx * 0.6 - 2 && !(y > top + 2 && dx % 3 === 2)) px(X, y, dx % 3 === 0 ? wc[2] : wc[0]);
      if (o.wing === 'fairy') { const up = ((dx - 3.5) / 4) ** 2 + ((y - top + 2) / 5) ** 2 <= 1, lo = ((dx - 3) / 3) ** 2 + ((y - top - 5) / 3) ** 2 <= 1; if (up || lo) px(X, y, dx === 3 ? '#ffffff' : o.wingC, 2, true); }
    }
  }
  if (o.tail) {
    const tc = tones(o.beast ? o.fur : o.tail === 'devil' ? '#2a2028' : o.skin2 && (o.scales || o.snout) ? o.skin : o.hair);
    const ax = x1, ay = legTop - 1;
    const T: Record<string, [number[][], number]> = {
      curl: [[[0, 0], [3, -1], [5, -4], [4, -7], [2, -6]], 1.6], thin: [[[0, 0], [4, 1], [6, -2], [6, -7], [8, -10]], 0.8],
      round: [[[1, -1], [2, -1]], 1.8], fox: [[[0, 0], [4, 0], [7, -4], [8, -9], [6, -12]], 2.8], wolf: [[[0, -1], [4, 0], [7, 3], [9, 4]], 2.4],
      dragon: [[[0, 0], [3, 3], [6, 6], [10, 7]], 2.8], devil: [[[0, 0], [4, 2], [7, -1], [8, -5]], 0.6], lizard: [[[0, 0], [4, 4], [8, 7], [12, 8]], 2.6],
    };
    const [pts, tw] = T[o.tail];
    for (let n = 0; n < o.tails; n++) line(pts.map(([x, y]) => [ax + x - n * 2, ay + y + n * 2 - (n ? 1 : 0)]), tw, tc, J);
    const end = pts[pts.length - 1];
    if (o.tail === 'fox') box(ax + end[0] - 1, ay + end[1], 2, 2, '#f4f0e8');
    if (o.tail === 'devil') { box(ax + end[0] - 1, ay + end[1] - 1, 3, 1, tc[1]); px(ax + end[0], ay + end[1] - 2, tc[1]); }
  }
  // 後ろ髪
  const H = o.style, hood = o.hat === 'hood' || o.hat === 'veil';
  if (!hood) {
    if (H === 'long' || H === 'braid') box(hx0, eyeY, hw, Math.round(o.body * 0.7) + hb - eyeY, hr[0], J);
    if (H === 'bob') box(hx0 - 1, eyeY - 2, hw + 2, hb - eyeY + 3, hr[0], J);
    if (H === 'pony') line([[hx1, ht + 3], [hx1 + 2, ht + 6], [hx1 + 2, hb + 3]], 1.6, hr, J);
    if (H === 'twin') for (const s of [-1, 1]) line([[s < 0 ? hx0 : hx1, ht + 3], [s < 0 ? hx0 - 2 : hx1 + 2, eyeY + 1], [s < 0 ? hx0 - 2 : hx1 + 2, hb + 4]], 1.6, hr, J);
  }

  // ---- 脚 ----
  const lw = Math.max(2, w / 2 - 1);
  const legC = o.kind === 'suit' ? tones(mixc(o.cloth, '#140c10', 0.2)) : tones(o.pants);
  if (o.fish) {
    for (let y = legTop; y < 45; y++) { const k = (y - legTop) / (45 - legTop), hwid = (w / 2) * (1 - k * 0.7) + 0.5, cx = 16 + Math.sin(k * 3) * 1.5; for (let x = Math.floor(cx - hwid); x < cx + hwid; x++) px(x, y, (x + y) % 3 === 0 ? s2[0] : x > cx ? s2[2] : s2[1]); }
    for (let y = 44; y < 48; y++) { const hwid = 1 + (y - 44) * 1.3; box(17 - hwid, y, hwid * 2, 1, (y & 1) ? s2[1] : s2[2]); }
  } else if (o.jelly) {
    for (let y = legTop - 1; y < 48; y++) { const hwid = w / 2 + (y - legTop) * 0.7; for (let x = Math.floor(16 - hwid); x < 16 + hwid; x++) px(x, y, y === 47 || x < 16 - hwid + 1 ? sk[0] : (x + y) % 7 === 0 ? sk[3] : sk[1], 1); }
  } else for (const lx of [15 - lw, 17]) {
    box(lx, legTop, lw, o.leg, lx < 16 ? legC[0] : legC[1]);
    const bh = Math.min(2, o.leg - 1), fx = lx < 16 ? lx - 1 : lx;
    if (o.leg > 2) box(fx, 48 - bh, lw + 1, bh, o.barefoot ? sk[1] : o.boots);
    if (o.leg > 4 && !o.barefoot) box(lx, 48 - bh - 1, lw, 1, mixc(o.boots, '#140c10', 0.3));
  }
  if (o.kind === 'kimono' && o.item === 'katana') box(x0 - 1, legTop, w + 2, o.leg - 1, tr[1]);

  // ---- 胴 ----
  const robeTo = o.kind === 'robe' ? 47 : o.kind === 'dress' ? legTop + Math.round(o.leg * 0.7) : o.kind === 'coat' ? legTop + Math.round(o.leg * 0.55) : legTop + (o.kind === 'rags' ? 1 : 0);
  for (let y = top; y < robeTo; y++) {
    const flare = y >= legTop - 1 ? Math.floor((y - legTop + 2) / 2.5) : 0;
    const a = x0 - flare, b = x1 + flare;
    for (let x = a; x <= b; x++) {
      if (y === top && (x === a || x === b)) continue;
      if (o.kind === 'rags' && y === robeTo - 1 && (x * 5) % 3 === 0) continue;
      px(x, y, x <= a ? body[0] : x >= b - 1 ? body[2] : body[1]);
    }
  }
  if (o.kind === 'coat') { box(15, top + 2, 2, robeTo - top - 2, mixc(o.trim, '#f0e8dc', 0.4)); }
  if (o.kind === 'suit') { box(15, top, 2, 3, '#ece6dc'); box(15, top + 1, 2, Math.max(2, o.body - 3), tr[1]); }
  if (o.kind === 'kimono') { for (let i = 0; i < 4; i++) { px(x0 + 2 + i, top + i, '#ece6dc'); px(x1 - 2 - i, top + i, tr[1]); } box(x0, legTop - 3, w, 2, tr[0]); }
  if (o.kind === 'apron') box(x0 + 2, top + 2, w - 4, legTop - top + Math.round(o.leg / 2) - 2, tr[2]);
  if (o.kind === 'robe') { for (let y = top + 1; y < 47; y++) px(16, y, tr[1]); box(x0, legTop - 2, w, 1, tr[1]); }
  if (o.kind === 'tunic' || o.kind === 'rags' || o.kind === 'dress' || metal) { box(x0, legTop - 2, w, 1, metal ? tr[1] : '#4a3020'); px(16, legTop - 2, GOLD[2]); }
  if (metal) { box(x0 + 2, top + 1, w - 4, 1, body[3]); box(15, top + 2, 2, o.body - 5, body[2]); }
  if (o.gold) { for (let x = x0 + 1; x < x1; x += 2) px(x, top, GOLD[2]); for (let x = x0 - 1; x <= x1 + 1; x += 2) px(x, robeTo - 1, GOLD[1]); }
  if (o.patch) box(x0 + 1, legTop - 5, 2, 2, mixc(o.cloth, '#c8a878', 0.5));
  if (o.back === 'pack' || o.back === 'quiver') { line([[x0 + 1, top], [x1 - 1, legTop - 3]], 0.5, ['#4a3020']); }
  if (o.cape) { px(x0 + 1, top + 1, GOLD[2]); px(x1 - 1, top + 1, GOLD[2]); }

  // ---- 腕 ----
  const sleeve = o.kind === 'rags' || o.item === 'hammer' ? sk : body;
  for (const [ax, c] of [[x0 - 2, sleeve[0]], [x1 + 1, sleeve[1]]] as [number, string][]) {
    box(ax, top + 1, 2, armLen - 1, c, o.kind === 'rags' ? J : 0);
    if (o.kind !== 'rags' && o.item !== 'hammer') box(ax, top + 1, 2, Math.ceil(armLen / 2), ax < 16 ? body[0] : body[1]);
  }
  if (o.mech) box(x1 + 1, top + 1, 2, armLen + 1, s2[1]);
  if (metal) for (const ax of [x0 - 2, x1]) { box(ax, top, 3, 2, body[2]); px(ax + 1, top, body[3]); }

  // ---- 頭 ----
  const ears = () => {
    if (o.beast || o.snout || o.alien) return;
    for (const s of [-1, 1]) {
      const ex = s < 0 ? hx0 - 1 : hx1 + 1;
      if (o.ear === 'round' && !hood) px(ex, eyeY, s < 0 ? sk[0] : sk[1], J);
      if (o.ear === 'elf') line([[ex, eyeY], [ex + s * 2, eyeY - 2], [ex + s * 4, eyeY - 4]], 0.6, sk);
      if (o.ear === 'half') line([[ex, eyeY], [ex + s * 2, eyeY - 2]], 0.6, sk);
      if (o.ear === 'goblin') { line([[ex, eyeY], [ex + s * 4, eyeY - 2]], 1.2, sk); }
      if (o.ear === 'fin') for (let i = 0; i < 3; i++) px(ex + s * (1 + (i === 1 ? 1 : 0)), eyeY - 1 + i, s2[i & 1]), px(ex, eyeY - 1 + i, s2[1]);
      if (o.ear === 'mech') { box(s < 0 ? ex - 1 : ex, eyeY - 1, 2, 3, '#8a96a8'); px(ex, eyeY, o.eye, 0, true); }
    }
  };
  ears();
  for (let y = ht; y <= hb; y++) for (let x = hx0; x <= hx1; x++) if (inHead(x, y)) {
    const sc = o.snout ? ((x + y) % 3 === 0 ? s2[0] : y > eyeY + 1 && Math.abs(x - 15.5) < 3 ? mixc(o.skin, '#f0e0b0', 0.4) : sk[x < hx0 + 2 ? 0 : x > hx1 - 2 ? 2 : 1]) : sk[x < hx0 + 1 ? 0 : x > hx1 - 2 ? 2 : 1];
    px(x, y, sc, J);
  }
  // 顔
  const eL = 16 - e - 2, eR = 15 + e;
  if (o.alien) for (const ex of [eL, eR]) { box(ex, eyeY - 1, 2, 2, DARK); px(ex + (ex < 16 ? -1 : 2), eyeY - 2, DARK); px(ex + (ex < 16 ? 0 : 1), eyeY - 2, DARK); }
  else for (const ex of [eL, eR]) {
    if (o.mech && ex === eR) { box(ex, eyeY - 1, 2, 2, s2[1]); px(ex, eyeY, '#ff4040', 0, true); continue; }
    if (o.pupil === 'black') { box(ex, eyeY - 1, 2, 2, DARK); px(ex + (ex < 16 ? 1 : 0), eyeY, o.eye); continue; }
    if (o.pupil === 'glow') { box(ex, eyeY - 1, 2, 2, o.eye, 0); px(ex, eyeY - 1, '#ffffff', 0, true); continue; }
    box(ex, eyeY - 1, 2, 1, DARK); box(ex, eyeY, 2, 1, o.eye); px(ex + 1, eyeY, o.pupil === 'slit' ? DARK : mixc(o.eye, '#ffffff', 0.4));
    if (o.sex === 'F' && !o.snout) px(ex < 16 ? ex - 1 : ex + 2, eyeY - 1, DARK);
  }
  if (o.snout) { px(15, eyeY + 3, DARK); px(16, eyeY + 3, DARK); }
  else if (!o.alien) {
    box(15, eyeY + 2 + (hh > 12 ? 1 : 0), 2, 1, mixc(o.skin, '#7a2a2a', 0.4));
    if (o.blush) { px(eL - 1, eyeY + 1, '#e88a8a'); px(eR + 2, eyeY + 1, '#e88a8a'); }
    if (o.fangs) px(16, eyeY + 4, '#ffffff');
    if (o.tusks) { px(13, eyeY + 2, '#ece4c8'); px(18, eyeY + 2, '#ece4c8'); }
    if (o.spots) { px(hx0 + 1, ht + 4, o.skin2); px(hx1 - 2, eyeY + 2, o.skin2); }
    if (o.seams) { px(eL, eyeY + 2, o.skin2); px(eR + 1, eyeY + 2, o.skin2); }
    if (o.scales && !o.fish) { px(hx0, eyeY + 1, s2[2]); px(hx1, eyeY + 1, s2[2]); px(hx1 - 1, eyeY + 2, s2[1]); }
    if (o.rune) px(15, ht + 3, '#c03a6a');
    if (o.wrinkle > 1) { px(eL - 1, eyeY + 2, sk[0]); px(eR + 2, eyeY + 2, sk[0]); }
    if (o.beard) for (let y = eyeY + 3; y <= hb + (o.race === 'dwarf' ? 3 : 1); y++) for (let x = hx0 + 1; x < hx1; x++) if ((inHead(x, y) || y > hb) && Math.abs(x - 15.5) < hw / 2 - 1 - Math.max(0, y - hb) && !(y === eyeY + 3 && Math.abs(x - 15.5) < 1.5) && (o.race === 'dwarf' || y > eyeY + 3 || Math.abs(x - 15.5) > 3)) px(x, y, hr[x < 15 ? 0 : 1]);
  }
  if (o.mask === 'cloth') box(hx0, eyeY + 1, hw, hb - eyeY, o.cloth);
  if (o.mask === 'gas') { box(hx0 + 2, eyeY + 1, hw - 4, hb - eyeY, '#4a4a42'); box(14, eyeY + 3, 4, 2, '#2a2a28'); box(eL, eyeY - 1, 2, 2, '#8ab0a0'); box(eR, eyeY - 1, 2, 2, '#8ab0a0'); }

  // 前髪
  const hairPx = (x: number, y: number) => px(x, y, hr[x > hx1 - 2 || (y === ht + 1 && x > 15 && x < hx1 - 1) ? 2 : x < hx0 + 1 ? 0 : 1], J);
  const cap = (fr: (x: number) => number) => { for (let y = ht - 1; y <= hb; y++) for (let x = hx0 - 1; x <= hx1 + 1; x++) if (inHead(x, y, 0.8) && y < fr(x)) hairPx(x, y); };
  const edge = (x: number) => x <= hx0 || x >= hx1;
  const fringe = ht + Math.round(hh * 0.3);
  if (!hood) {
    if (H === 'short' || H === 'spiky' || H === 'pony') cap((x) => (edge(x) ? eyeY : fringe + ((x & 1) ? 1 : 0)));
    if (H === 'spiky') for (const sx of [hx0 + 1, 15, hx1 - 1]) { px(sx, ht - 2, hr[1]); px(sx + 1, ht - 2, hr[2]); px(sx, ht - 3, hr[1]); }
    if (H === 'side') cap((x) => (edge(x) ? eyeY : x < 15 ? fringe + 2 : fringe));
    if (H === 'long' || H === 'bob' || H === 'twin' || H === 'braid') cap((x) => (x <= hx0 + 1 || x >= hx1 - 1 ? eyeY + 3 : fringe + (x === 17 ? -1 : 0)));
    if (H === 'bun') { cap((x) => (edge(x) ? eyeY - 1 : fringe)); box(14, ht - 3, 4, 3, hr[1], J); px(16, ht - 3, hr[2], J); }
    if (H === 'tuft') { px(15, ht - 1, hr[1], J); px(16, ht - 2, hr[1], J); px(16, ht, hr[1], J); }
    if (H === 'bald') for (const x of [hx0, hx1]) box(x, eyeY - 2, 1, 2, hr[1]);
    if (H === 'twin') for (const s of [-1, 1]) px(s < 0 ? hx0 - 1 : hx1 + 1, ht + 3, '#d84a6a');
    if (H === 'braid') line([[hx0, hb - 1], [hx0, hb + Math.round(o.body * 0.6)]], 0.9, hr, J);
  }
  if (o.snout) for (let i = 0; i < 3; i++) px(15 + (i & 1), ht - 1 + i * 2, s2[0]);

  // 獣の耳・角
  if (o.beast) {
    const fc = tones(o.fur), inner = mixc(o.fur, '#e8a0a0', 0.45);
    for (const s of [-1, 1]) {
      const bx = s < 0 ? hx0 + 2 : hx1 - 2;
      if (o.beast === 'rabbit') { box(bx - (s < 0 ? 1 : 0), ht - 8, 2, 9, fc[1]); px(bx - (s < 0 ? 0 : 0), ht - 6, inner); px(bx, ht - 5, inner); px(bx, ht - 4, inner); }
      else if (o.beast === 'dogdrop') box(s < 0 ? hx0 - 1 : hx1, ht + 1, 2, 5, fc[0]);
      else {
        const tall = o.beast === 'wolf' ? 4 : o.beast === 'fox' ? 4 : 3;
        for (let i = 0; i < tall; i++) { const half = Math.floor(i / 1.6); box(bx - half, ht - tall + i + 1, half * 2 + 1, 1, i > 1 && half > 0 ? inner : fc[1]); }
        if (o.beast === 'fox') px(bx, ht - tall + 1, '#f4f0e8');
      }
    }
  }
  if (o.horn) {
    const hc = tones(o.hornC);
    for (const s of [-1, 1]) {
      const m = (pts: number[][]) => pts.map(([x, y]) => [s < 0 ? x : 31 - x, y]);
      if (o.horn === 'back') line(m([[hx0 + 1, ht + 2], [hx0 - 1, ht - 1], [hx0 - 1, ht - 4]]), 1, hc);
      if (o.horn === 'up') line(m([[hx0 + 2, ht + 1], [hx0 + 1, ht - 2], [hx0 + 2, ht - 4]]), 1, hc);
      if (o.horn === 'ram') line(m([[hx0 + 1, ht + 2], [hx0 - 2, ht + 2], [hx0 - 2, ht + 5], [hx0, ht + 6]]), 1, hc);
      if (o.horn === 'oni2') line(m([[hx0 + 3, ht + 1], [hx0 + 2, ht - 3], [hx0 + 2, ht - 4]]), 1, hc);
    }
    if (o.horn === 'oni1') line([[16, ht + 1], [16, ht - 4], [16, ht - 5]], 1.2, hc);
  }
  if (o.halo) for (let x = 12; x < 20; x++) { const y = ht - 3 + (x === 12 || x === 19 ? 0 : x === 13 || x === 18 ? -1 : -1); px(x, y + (x > 13 && x < 18 ? 0 : 0), '#f8e070', 0, true); }

  hat(o, { px, box, line }, hx0, hx1, ht, hw, fringe, eyeY, hb);
  if (o.crown === 'crown') { box(hx0 + 2, ht - 2, hw - 4, 2, GOLD[1]); for (let x = hx0 + 2; x < hx1 - 1; x += 2) px(x, ht - 3, GOLD[2]); px(15, ht - 2, '#d03050', 0, true); }
  if (o.crown === 'tiara') { box(hx0 + 2, ht + 1, hw - 4, 1, GOLD[2]); px(15, ht, GOLD[2]); px(16, ht, '#e05080', 0, true); }
  if (o.collar) { box(x0 + 2, top, w - 4, 1, '#6a6a72'); px(16, top + 1, '#8a8a94'); }

  // ---- 持ち物 ----
  if (o.item) item(o.item, LH, -1, { px, box, line }, o, top, legTop);
  if (o.off) item(o.off, RH, 1, { px, box, line }, o, top, legTop);
  for (const [hx, hy] of [LH, RH]) box(hx, hy, 2, 2, o.mech && hx > 16 ? s2[2] : sk[1], J);
  if (o.off === 'shield') shield(RH, { px, box, line }, o);

  outline(P);
  for (let i = 0; i < glass.length; i++) if (glass[i]) P.d[i * 4 + 3] = glass[i] === 1 ? 190 : 140;
  if (f.dead) P.grey();
  return P;
}

interface Pen {
  px: (x: number, y: number, c: string, g?: number, raw?: boolean) => void;
  box: (x: number, y: number, w: number, h: number, c: string, g?: number) => void;
  line: (pts: number[][], w: number, c: string[], g?: number) => void;
}

function hat(o: Look, { px, box, line }: Pen, hx0: number, hx1: number, ht: number, hw: number, fringe: number, eyeY: number, hb: number): void {
  if (!o.hat) return;
  const c = tones(o.hatC), t = tones(o.trim);
  switch (o.hat) {
    case 'wizard': box(hx0 - 2, ht + 2, hw + 4, 2, c[0]); for (let i = 0; i < 9; i++) box(16 - Math.round((9 - i) / 2) + Math.floor(i / 3), ht + 1 - i, Math.max(1, 9 - i), 1, c[i < 3 ? 1 : 2]); box(hx0 + 1, ht + 1, hw - 2, 1, t[1]); break;
    case 'hood': case 'veil': {
      for (let y = ht - 1; y <= hb + 1; y++) for (let x = hx0 - 1; x <= hx1 + 1; x++) {
        const inner = y > ht + 2 && x > hx0 && x < hx1 && y < hb + 1;
        if (!inner && ((x + 0.5 - 16) / (hw / 2 + 1)) ** 2 + ((y + 0.5 - (ht + hb) / 2) / ((hb - ht) / 2 + 1.5)) ** 2 <= 1) px(x, y, c[x < 15 ? 0 : x > hx1 - 1 ? 2 : 1]);
      }
      if (o.hat === 'veil') box(hx0 + 1, ht + 2, hw - 2, 1, '#d8b050');
      break;
    }
    case 'kettle': box(hx0 - 2, fringe, hw + 4, 1, STEEL[0]); for (let y = ht - 1; y < fringe; y++) box(hx0 + (y < ht + 1 ? 2 : 0), y, hw - (y < ht + 1 ? 4 : 0), 1, STEEL[y < ht + 1 ? 2 : 1]); break;
    case 'straw': box(hx0 - 3, fringe - 1, hw + 6, 2, '#d8b860'); box(hx0 + 1, ht - 1, hw - 2, fringe - ht, '#c8a850'); box(hx0 + 1, fringe - 2, hw - 2, 1, '#a83a2a'); break;
    case 'chef': box(hx0 + 1, ht - 5, hw - 2, 6, '#f8f6f0'); box(hx0, ht - 5, hw, 2, '#ffffff'); box(hx0 + 1, ht + 1, hw - 2, 1, '#d8d4cc'); break;
    case 'mitre': for (let i = 0; i < 7; i++) box(16 - Math.ceil((7 - i) / 1.4) + 0, ht + 1 - i, Math.ceil((7 - i) / 1.4) * 2, 1, '#f4f0e8'); box(15, ht - 4, 2, 4, '#d8b050'); box(14, ht - 3, 4, 1, '#d8b050'); break;
    case 'goggles': box(hx0, fringe - 1, hw, 1, '#3a2a22'); for (const gx of [13, 17]) { box(gx, fringe - 2, 3, 2, '#7a6a4a'); px(gx + 1, fringe - 2, '#8ad0e0'); } break;
    case 'eboshi': box(hx0 + 2, ht - 6, hw - 5, 7, '#1e1a20'); box(hx0 + 3, ht - 7, hw - 7, 1, '#2a2630'); break;
    case 'band': box(hx0, fringe - 1, hw, 1, t[1]); px(hx1 + 1, fringe, t[1]); px(hx1 + 2, fringe + 1, t[1]); break;
    case 'bandana': for (let y = ht - 1; y < fringe; y++) for (let x = hx0; x <= hx1; x++) if (((x + 0.5 - 16) / (hw / 2 + 0.8)) ** 2 + ((y + 0.5 - (ht + hw / 2)) / (hw / 2 + 0.8)) ** 2 <= 1) px(x, y, t[(x + y) % 4 === 0 ? 0 : 1]); px(hx1 + 1, fringe - 1, t[1]); px(hx1 + 2, fringe, t[1]); break;
    case 'cap': box(hx0, ht - 1, hw, fringe - ht + 1, c[1]); box(hx0 - 1, fringe, hw / 2 + 2, 1, c[0]); px(15, ht, '#d8b050'); break;
    case 'hardhat': box(hx0, ht - 1, hw, fringe - ht + 1, '#e8b830'); box(hx0 - 1, fringe, hw + 2, 1, '#c89820'); box(hx0 + 2, ht - 1, hw - 4, 1, '#f8d860'); break;
    case 'lamp': box(hx0, ht - 1, hw, fringe - ht + 1, '#6a5a3a'); box(hx0 - 1, fringe, hw + 2, 1, '#4a3a2a'); box(15, ht, 2, 2, '#fff4a0'); px(15, ht, '#ffffff', 0, true); break;
    case 'aviator': for (let y = ht - 1; y <= eyeY + 2; y++) for (let x = hx0 - 1; x <= hx1 + 1; x++) if ((y < fringe || x <= hx0 || x >= hx1) && ((x + 0.5 - 16) / (hw / 2 + 1)) ** 2 + ((y + 0.5 - (ht + hb) / 2) / ((hb - ht) / 2 + 1)) ** 2 <= 1) px(x, y, c[x < 15 ? 0 : 1]); for (const gx of [12, 17]) { box(gx, ht, 3, 2, '#7a6a4a'); px(gx + 1, ht, '#8ad0e0'); } break;
    case 'brim': box(hx0 - 3, fringe - 1, hw + 6, 1, c[0]); box(hx0 + 1, ht - 2, hw - 2, fringe - ht + 1, c[1]); box(hx0 + 1, fringe - 2, hw - 2, 1, '#3a2a20'); break;
    case 'feather': box(hx0 - 1, ht - 1, hw + 2, fringe - ht + 1, c[1]); box(hx0 - 2, fringe - 1, hw + 4, 1, c[0]); line([[hx1 - 1, ht], [hx1 + 3, ht - 5]], 0.7, ['#e8e0d0', '#f8f4ec']); break;
    case 'visor': box(hx0, ht - 1, hw, 2, '#3a3a44'); box(hx0 - 1, eyeY - 1, 2, 3, '#3a3a44'); line([[hx0, eyeY + 2], [13, hb]], 0.5, ['#3a3a44']); break;
    case 'circlet': box(hx0 + 1, fringe - 1, hw - 2, 1, '#d8b050'); px(15, fringe - 1, '#80c0ff', 0, true); px(16, fringe - 1, '#80c0ff', 0, true); break;
    default: break;
  }
}

function shield([hx, hy]: [number, number], { px, box }: Pen, o: Look): void {
  const c = tones(o.trim), big = o.item === 'light' || o.kind === 'armor';
  const x = hx - 1, y = hy - 4, w = big ? 6 : 5, h = big ? 8 : 6;
  for (let yy = 0; yy < h; yy++) { const cut = yy >= h - 2 ? yy - (h - 3) : 0; box(x + cut, y + yy, w - cut * 2, 1, yy === 0 ? c[2] : c[1]); }
  box(x + Math.floor(w / 2) - 1, y + 1, 2, h - 3, big ? '#d8b050' : '#8a8a8a');
  px(x, y, STEEL[2]); px(x + w - 1, y, STEEL[2]);
}

// 持ち物。s = -1 は体の左 (外は左)、1 は右
function item(it: Item, [hx, hy]: [number, number], s: number, { px, box, line }: Pen, o: Look, top: number, legTop: number): void {
  const X = (d: number) => (s < 0 ? hx - d : hx + 1 + d);   // 手の外側を 0 として外へ d
  const tr = tones(o.trim);
  switch (it) {
    case 'sword': box(X(0) - (s < 0 ? 0 : 0), hy - 9, 1, 8, STEEL[2]); box(X(-1), hy - 9, 1, 8, STEEL[1]); px(X(0), hy - 10, STEEL[3]); box(Math.min(X(1), X(-2)), hy - 1, 4, 1, '#d8b050'); px(X(0), hy + 2, '#d8b050'); break;
    case 'light':
      for (let y = hy - 12; y < hy - 1; y++) for (const d of [-2, 1]) px(X(d), y, '#fff4a0', 2, true);
      box(Math.min(X(0), X(-1)), hy - 12, 2, 11, '#fffbe8'); px(X(0), hy - 13, '#ffffff', 0, true); box(Math.min(X(1), X(-2)), hy - 1, 4, 1, '#d8b050'); break;
    case 'staff': line([[X(0), hy + 5], [X(0), hy - 13]], 0.5, WOOD); box(Math.min(X(-1), X(1)), hy - 16, 3, 3, '#80d0ff'); px(X(0), hy - 16, '#ffffff', 0, true); break;
    case 'skull': line([[X(0), hy + 5], [X(0), hy - 12]], 0.5, ['#3a2a30', '#4a3a40']); box(Math.min(X(-1), X(1)), hy - 15, 3, 3, '#e8e4d8'); px(X(-1), hy - 14, '#a050ff', 0, true); px(X(1), hy - 14, '#a050ff', 0, true); break;
    case 'holy': line([[X(0), hy + 5], [X(0), hy - 12]], 0.5, GOLD); for (const [dx, dy] of [[0, -16], [-1, -15], [1, -15], [-1, -14], [1, -14], [0, -13]]) px(X(dx), hy + dy, '#f8e070', 0, true); px(X(0), hy - 14, '#fffbe0', 2, true); break;
    case 'cross': line([[X(0), hy + 4], [X(0), hy - 9]], 0.5, GOLD); box(Math.min(X(-1), X(1)), hy - 7, 3, 1, GOLD[2]); break;
    case 'bow': for (let y = -7; y <= 6; y++) { const d = Math.round(2.4 - (y * y) / 18); px(X(d), hy + y, WOOD[1]); } for (let y = -6; y <= 5; y++) px(X(-1), hy + y, '#e8e0d0'); break;
    case 'whip': box(X(0), hy - 1, 1, 3, '#3a2a20'); line([[X(0), hy + 2], [X(2), hy + 5], [X(0), hy + 7], [X(3), hy + 9]], 0.5, ['#6a4a2a']); break;
    case 'bag': box(Math.min(X(0), X(3)), hy + 2, 4, 4, '#a07a40'); box(Math.min(X(0), X(3)) + 1, hy + 1, 2, 1, '#6a4a2a'); px(Math.min(X(0), X(3)) + 2, hy + 3, '#e8c050'); break;
    case 'hoe': line([[X(-1), hy + 6], [X(1), hy - 9]], 0.5, WOOD); box(Math.min(X(1), X(3)), hy - 10, 3, 2, STEEL[1]); break;
    case 'hammer': line([[X(0), hy + 3], [X(0), hy - 4]], 0.5, WOOD); box(Math.min(X(-1), X(2)), hy - 6, 4, 3, STEEL[0]); box(Math.min(X(-1), X(2)), hy - 6, 4, 1, STEEL[2]); break;
    case 'katana': line([[X(0), hy + 1], [X(2), hy - 4], [X(3), hy - 11]], 0.5, [STEEL[2], STEEL[3]]); px(X(0), hy - 1, '#2a2028'); px(X(1), hy - 1, '#2a2028'); break;
    case 'ofuda': for (const d of [0, 1, 2]) { box(X(d), hy - 4 + d, 1, 4, PAPER); px(X(d), hy - 3 + d, '#c02a2a'); } break;
    case 'wrench': line([[X(0), hy + 3], [X(1), hy - 4]], 0.5, STEEL); box(Math.min(X(0), X(2)), hy - 6, 3, 2, STEEL[1]); break;
    case 'tablet': box(15 - 2, hy - 2, 6, 4, '#2a2a34'); box(15 - 1, hy - 1, 4, 2, '#40e0a0'); px(14, hy - 1, '#c0ffe0', 0, true); break;
    case 'flask': box(Math.min(X(0), X(2)), hy - 3, 3, 3, '#60e070'); px(X(1), hy - 4, '#d8e8e8'); px(X(1), hy - 5, '#a08060'); px(X(0), hy - 3, '#c0ffc0', 0, true); break;
    case 'basket': box(Math.min(X(0), X(3)), hy + 1, 4, 3, '#a8803a'); for (const d of [0, 2]) px(Math.min(X(0), X(3)) + d, hy + 2, '#7a5a2a'); px(Math.min(X(0), X(3)) + 1, hy, '#5aa040'); px(Math.min(X(0), X(3)) + 2, hy - 1, '#6ab048'); break;
    case 'book': box(Math.min(X(0), X(2)), hy - 3, 3, 4, tr[1]); box(Math.min(X(0), X(2)) + (s < 0 ? 2 : 0), hy - 3, 1, 4, PAPER); break;
    case 'spear': line([[X(0), hy + 6], [X(0), top - 6]], 0.5, WOOD); box(X(0), top - 9, 1, 3, STEEL[2]); px(X(-1), top - 7, STEEL[1]); px(X(1), top - 7, STEEL[1]); px(X(0), top - 10, STEEL[3]); break;
    case 'axe': line([[X(0), hy + 4], [X(0), hy - 7]], 0.5, WOOD); box(Math.min(X(1), X(3)), hy - 8, 3, 4, STEEL[1]); box(Math.min(X(1), X(3)), hy - 8, 3, 1, STEEL[3]); break;
    case 'dagger': box(X(0), hy - 4, 1, 3, STEEL[2]); px(X(0), hy - 5, STEEL[3]); box(Math.min(X(-1), X(1)), hy - 1, 3, 1, '#4a3a2a'); break;
    case 'lute': { const bx = 15 + s; box(bx - 2, hy - 2, 5, 4, '#b07a3a'); px(bx, hy - 1, '#3a2010'); line([[bx, hy - 2], [bx + 4 * s * -1, hy - 7]], 0.5, ['#6a4020']); break; }
    case 'ladle': line([[X(0), hy + 2], [X(0), hy - 5]], 0.5, STEEL); box(Math.min(X(-1), X(1)), hy - 7, 3, 2, STEEL[1]); break;
    case 'scepter': line([[X(0), hy + 3], [X(0), hy - 6]], 0.5, GOLD); box(Math.min(X(-1), X(1)), hy - 8, 3, 2, GOLD[2]); px(X(0), hy - 8, '#d03050', 0, true); break;
    case 'tray': box(Math.min(X(-1), X(3)), hy - 1, 5, 1, STEEL[2]); box(Math.min(X(0), X(2)), hy - 3, 2, 2, PAPER); break;
    case 'pick': line([[X(0), hy + 4], [X(0), hy - 7]], 0.5, WOOD); line([[X(-2), hy - 6], [X(0), hy - 8], [X(3), hy - 6]], 0.5, STEEL); break;
    case 'star': for (const [dx, dy] of [[1, 0], [0, -1], [1, -1], [2, -1], [1, -2]]) px(X(dx), hy + dy - 1, STEEL[dx === 1 && dy === -1 ? 0 : 2]); break;
    case 'gun': box(Math.min(X(-1), X(5)), hy - 1, 7, 2, '#3a3a3a'); box(Math.min(X(-1), X(5)), hy - 1, 7, 1, '#5a5a5a'); box(Math.min(X(0), X(1)), hy + 1, 2, 2, '#5a3a2a'); break;
    case 'club': line([[X(0), hy + 2], [X(1), hy - 6]], 0.9, WOOD); px(X(2), hy - 5, STEEL[2]); px(X(0), hy - 6, STEEL[2]); break;
    case 'case': box(Math.min(X(-1), X(3)), hy + 2, 5, 4, '#2a2420'); px(Math.min(X(-1), X(3)) + 2, hy + 1, '#5a4a40'); px(Math.min(X(-1), X(3)) + 2, hy + 3, '#d8b050'); break;
    case 'kit': box(Math.min(X(-1), X(3)), hy + 2, 5, 4, '#f4f0ec'); box(Math.min(X(-1), X(3)) + 2, hy + 2, 1, 4, '#d02a2a'); box(Math.min(X(-1), X(3)) + 1, hy + 3, 3, 1, '#d02a2a'); break;
    case 'board': box(Math.min(X(0), X(3)), hy - 4, 4, 5, '#8a6a3a'); box(Math.min(X(0), X(3)) + 1, hy - 3, 2, 3, PAPER); break;
    case 'baton': line([[X(0), hy + 3], [X(1), hy - 4]], 0.5, ['#1a1a20', '#2a2a30']); break;
    case 'torch': box(X(0), hy + 2, 1, 1, '#3a3a3a'); box(Math.min(X(-1), X(1)), hy + 3, 3, 3, '#5a5a5a'); px(X(0), hy + 4, '#fff0a0', 0, true); for (const d of [-2, 2]) px(X(d), hy + 4, '#ffe080', 2, true); break;
    case 'bar': line([[X(0), hy + 4], [X(0), hy - 5], [X(2), hy - 7]], 0.5, ['#a83a2a', '#c04a3a']); break;
    case 'rope': for (let a = 0; a < 6.3; a += 0.4) px(X(1.5) + Math.cos(a) * 2 * (s < 0 ? -1 : 1), hy + 4 + Math.sin(a) * 2, '#c8a870'); break;
    case 'box': box(Math.min(X(-1), X(3)), hy + 2, 5, 3, '#b03a2a'); box(Math.min(X(-1), X(3)) + 1, hy + 1, 3, 1, '#5a5a5a'); break;
    case 'helmet': box(Math.min(X(0), X(3)), hy + 1, 4, 4, '#ece8e0'); box(Math.min(X(0), X(3)) + (s < 0 ? 0 : 1), hy + 2, 3, 2, '#3a5a8a'); break;
    case 'scope': line([[X(0), hy], [X(3), hy - 3]], 0.6, GOLD); break;
    case 'whisk': box(X(0), hy - 3, 1, 4, WOOD[1]); for (let i = 0; i < 4; i++) px(X(i % 2), hy + 1 + i, '#f4f0e8'); break;
    case 'cane': line([[X(0), hy], [X(1), legTop + o.leg - 1]], 0.5, WOOD); px(X(-1), hy, WOOD[1]); break;
    case 'shield': break;
    default: break;
  }
}

// 1px の輪郭: 描いていない画素で、隣に描いた画素があれば、その色を暗くして塗る
function outline(P: Pix): void {
  const d = P.d, src = new Uint8ClampedArray(d);
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const i = (y * P.w + x) * 4;
    if (src[i + 3]) continue;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= P.w || Y >= P.h) continue;
      const j = (Y * P.w + X) * 4;
      if (!src[j + 3]) continue;
      const k = 0.72;
      d[i] = src[j] * (1 - k) + 16 * k; d[i + 1] = src[j + 1] * (1 - k) + 8 * k; d[i + 2] = src[j + 2] * (1 - k) + 16 * k; d[i + 3] = 255;
      break;
    }
  }
}
