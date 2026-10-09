// 主人公 (Hero) から絵の材料を組み立て、背景に立ち絵を重ねて描く。描く本体は scene.ts / sprite.ts / portrait.ts。
// 見た目は Figure.seed から決まるので、輪の人の seed は (主人公の seed, Tie.id) から作る。場面でも顔でも同じ色になる
import type { Figure, Hero, Home, JobId, Place, SceneSpec, Status, Tie, Tod, WorldId, YearKind } from '../engine/types';
import { around, heq, raceOf, stageAt, stageOf } from '../engine';
import { paintScene, tintOf, groundY, W, H } from './scene';
import { paintSprite, SW, SH } from './sprite';
import { paintPortrait } from './portrait';
import { hash, type Pix } from './raster';

export { W, H };

export const heroFigure = (h: Hero): Figure => ({
  seed: h.seed, race: h.race, sex: h.sex, stage: stageOf(h), job: h.job, status: h.status, me: true, dead: !h.alive,
});

export const tieFigure = (h: Pick<Hero, 'seed' | 'status'>, t: Pick<Tie, 'id' | 'race' | 'sex' | 'age' | 'alive' | 'job'>): Figure => ({
  seed: hash(h.seed, t.id), race: t.race, sex: t.sex, stage: stageAt(heq(t.age, raceOf(t.race))), job: t.job ?? null, status: h.status, dead: !t.alive,
});

const HOME: Record<Status, Home> = { slave: 'hovel', orphan: 'hovel', poor: 'hovel', commoner: 'house', merchant: 'house', gentry: 'manor', noble: 'manor', royal: 'castle' };

const JOB_PLACE: Partial<Record<JobId, Place>> = {
  farmer: 'field', merchant: 'shop', smith: 'forge', alchemist: 'lab', herbalist: 'shop', priest: 'temple', saint: 'temple', knight: 'castle',
  soldier: 'castle', mercenary: 'wild', adventurer: 'guild', hero: 'wild', mage: 'academy', scholar: 'academy', bard: 'town', thief: 'town',
  tamer: 'wild', cook: 'shop', lord: 'castle', servant: 'home', hunter: 'wild', sailor: 'ship', miner: 'dungeon', assassin: 'city',
  necromancer: 'grave', samurai: 'castle', onmyoji: 'temple', cultivator: 'wild', ninja: 'town', engineer: 'forge', factory: 'forge',
  airship: 'ship', corp: 'city', hacker: 'city', pilot: 'ship', medic: 'lab', researcher: 'lab', office: 'city', explorer: 'dungeon',
  police: 'city', scavenger: 'wild', raider: 'wild',
};

function placeOf(h: Hero, kind: YearKind | undefined): Place {
  const job = h.job && h.flags.retired === undefined ? JOB_PLACE[h.job] : undefined;
  switch (kind) {
    case 'school': return 'academy';
    case 'battle': return 'battle';
    case 'adventure': return job === 'guild' || job === 'dungeon' ? job : h.age % 3 === 0 ? 'dungeon' : 'guild';
    case 'work': return job ?? 'town';
    case 'power': return 'temple';
    case 'arrival': return h.arrival === 'summoned' ? 'temple' : 'home';
    case 'fame': return h.status === 'noble' || h.status === 'royal' ? 'castle' : 'town';
    case 'hard': return 'wild';
    case 'loss': return 'grave';
    case 'old': case 'love': case 'family': case 'child': case 'ill': return 'home';
    default: return job ?? 'home';
  }
}

const TODS: Tod[] = ['morning', 'day', 'day', 'day', 'dusk', 'night'];

// その年の場面。亡くなった後は墓と、最後にそばにいた人
export function sceneOf(h: Hero, mourners: Tie[] = []): SceneSpec {
  const r = hash(h.seed, h.age, 0x7173);
  const world: WorldId = h.world.id;
  const base = { seed: hash(h.seed, h.age), world, home: HOME[h.status], tod: TODS[r % TODS.length], season: ((r >>> 8) % 4) as SceneSpec['season'] };
  if (!h.alive) return { ...base, place: 'grave', dead: true, figures: mourners.slice(0, 4).map((t) => tieFigure(h, t)) };
  const childhood = stageOf(h) === 'infant' || stageOf(h) === 'child' || stageOf(h) === 'teen';
  // 子どものうちは親ときょうだい、大人になったら近い人から
  const near = around(h).filter((t) => t.role !== 'nemesis' && t.role !== 'rival')
    .sort((a, b) => (childhood ? +isFamily(b) - +isFamily(a) : 0) || b.bond - a.bond).slice(0, 4);
  const left = near.filter((_, i) => i % 2 === 0).reverse(), right = near.filter((_, i) => i % 2 === 1);
  const figures = [...left.map((t) => tieFigure(h, t)), heroFigure(h), ...right.map((t) => tieFigure(h, t))];
  return { ...base, place: placeOf(h, h.kinds[h.age]), figures };
}
const isFamily = (t: Tie) => t.role === 'mother' || t.role === 'father' || t.role === 'sibling' || t.role === 'spouse' || t.role === 'child';

// 背景に立ち絵を重ねる。立ち絵にも場面の時刻の色 (tint) を掛ける
export function compose(s: SceneSpec): Pix {
  const P = paintScene(s);
  const tint = tintOf(s);
  const n = s.figures.length;
  const gap = n > 4 ? 30 : 36;
  const y0 = groundY(s) - SH + 2;
  s.figures.forEach((f, i) => {
    const sp = paintSprite(f);
    const x0 = Math.round(W / 2 + (i - (n - 1) / 2) * gap - SW / 2);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const si = (y * SW + x) * 4, a = sp.d[si + 3] / 255;
      const X = x0 + x, Y = y0 + y;
      if (a <= 0 || X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const di = (Y * W + X) * 4;
      for (let k = 0; k < 3; k++) P.d[di + k] = P.d[di + k] * (1 - a) + sp.d[si + k] * tint[k] * a;
    }
  });
  return P;
}

export function drawScene(cv: HTMLCanvasElement, s: SceneSpec): void {
  compose(s).put(cv);
  cv.dataset.fit = '1';
  fit(cv);
}

export function drawFace(cv: HTMLCanvasElement, f: Figure): void {
  paintPortrait(f).put(cv);
}

// 絵は整数倍で拡大する。枠が 1倍より狭ければ枠いっぱいに
export function fit(cv: HTMLCanvasElement): void {
  const box = cv.parentElement?.clientWidth ?? cv.width;
  const k = Math.floor(box / cv.width);
  cv.style.width = k >= 1 ? `${cv.width * k}px` : '100%';
}
export function fitAll(root: ParentNode = document): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-fit]').forEach(fit);
}
window.addEventListener('resize', () => fitAll());

// data-face (Figure の JSON) や data-scene (SceneSpec の JSON) を持つキャンバスをまとめて描く
const faces = new Map<string, Pix>();
export function paintAll(root: ParentNode = document): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-face]').forEach((cv) => {
    const key = cv.dataset.face!;
    try {
      // 顔は同じ人なら同じ絵なので描いたものを使い回す (人生の画面は毎年人の輪を描き直すため)
      let p = faces.get(key);
      if (!p) { if (faces.size > 500) faces.clear(); p = paintPortrait(JSON.parse(key) as Figure); faces.set(key, p); }
      p.put(cv);
    } catch { /* 形が古ければ描かない */ }
  });
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-scene]').forEach((cv) => {
    try { drawScene(cv, JSON.parse(cv.dataset.scene!) as SceneSpec); } catch { /* 同上 */ }
  });
}

const attr = (v: unknown) => JSON.stringify(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export const faceHTML = (f: Figure, cls = 'face'): string => `<canvas class="pix ${cls}" data-face="${attr(f)}" width="48" height="56" aria-hidden="true"></canvas>`;
export const sceneHTML = (s: SceneSpec, label = ''): string =>
  `<canvas class="pix scene" data-scene="${attr(s)}" width="${W}" height="${H}" role="img" aria-label="${attr(label).slice(1, -1)}"></canvas>`;
