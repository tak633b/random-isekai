// 開発用: 全職業の各姿勢のコマ、全世界 × 相手の敵のコマ、動いているところ (枠付きの canvas)
import type { Figure, Foe, JobId, Pose, WorldId } from '../src/engine/types';
import { enemyFor, enemyKind, paintEnemy, type EnemyPose, type EnemySpec } from '../src/ui/enemy';
import type { Pix } from '../src/ui/raster';
import { paintSprite, POSE_FRAMES } from '../src/ui/sprite';

const JOBS: JobId[] = ['farmer', 'merchant', 'smith', 'alchemist', 'herbalist', 'priest', 'knight', 'soldier', 'mercenary', 'adventurer', 'mage', 'scholar', 'bard',
  'thief', 'tamer', 'cook', 'lord', 'servant', 'hunter', 'sailor', 'miner', 'assassin', 'necromancer', 'hero', 'saint', 'samurai', 'onmyoji', 'cultivator', 'ninja',
  'engineer', 'factory', 'airship', 'corp', 'hacker', 'pilot', 'medic', 'researcher', 'office', 'explorer', 'police', 'scavenger', 'raider'];
const POSES: Pose[] = ['idle', 'walk', 'attack', 'hurt', 'down', 'cheer'];
const WORLDS: WorldId[] = ['medieval', 'dark', 'game', 'academy', 'wa', 'xianxia', 'steampunk', 'cyberpunk', 'space', 'modern', 'postapoc', 'ocean', 'desert', 'beast', 'myth', 'frontier'];
const FOES: Foe[] = ['monster', 'beast', 'bandit', 'soldier', 'undead', 'dragon', 'demon', 'machine'];
const EPOSES: [EnemyPose, number][] = [['idle', 2], ['attack', 2], ['hurt', 1], ['down', 1]];

const out = document.getElementById('out')!;
const live: { cv: HTMLCanvasElement; frames: Pix[] }[] = [];
let n = 0, ms = 0;
const time = (fn: () => Pix): Pix => { const t = performance.now(); const P = fn(); ms += performance.now() - t; n++; return P; };
function canvas(P: Pix, cls: string, label: string): HTMLElement {
  const cv = document.createElement('canvas');
  cv.className = cls;
  P.put(cv);
  const d = document.createElement('div');
  d.className = 'cell';
  d.append(cv);
  const s = document.createElement('span');
  s.textContent = label;
  d.append(s);
  return d;
}
function row(title: string): HTMLElement {
  const r = document.createElement('div');
  r.className = 'row';
  const b = document.createElement('b');
  b.textContent = title;
  r.append(b);
  out.append(r);
  return r;
}
function head(t: string): void { const h = document.createElement('h2'); h.textContent = t; out.append(h); }
function addLive(r: HTMLElement, frames: Pix[], cls: string): void {
  const c = canvas(frames[0], cls + ' live', 'anim');
  live.push({ cv: c.querySelector('canvas')!, frames });
  r.append(c);
}
const gap = (r: HTMLElement) => { const g = document.createElement('div'); g.className = 'gap'; r.append(g); };

const part = new URLSearchParams(location.search).get('part');
if (!part || part === 'sprites') {
  head('立ち絵: 職業 × 姿勢 (idle4 walk4 attack3 hurt2 down1 cheer2)');
  JOBS.forEach((job, i) => {
    const f: Figure = { seed: 500 + i, race: (['human', 'elf', 'beast_cat', 'dwarf', 'demon', 'beast_rabbit'] as const)[i % 6], sex: i & 1 ? 'F' : 'M', stage: 'adult', job, status: 'commoner' };
    const r = row(job);
    const all: Pix[] = [];
    for (const pose of POSES) {
      for (let k = 0; k < POSE_FRAMES[pose]; k++) { const P = time(() => paintSprite(f, pose, k)); all.push(P); r.append(canvas(P, 's', pose + k)); }
      gap(r);
    }
    addLive(r, all, 's');
  });
  head('立ち絵: 子ども・老人・種族');
  const extra: Figure[] = [
    { seed: 3, race: 'human', sex: 'F', stage: 'child', job: null, status: 'poor' },
    { seed: 4, race: 'human', sex: 'M', stage: 'elder', job: null, status: 'commoner' },
    { seed: 5, race: 'merfolk', sex: 'F', stage: 'adult', job: 'sailor', status: 'commoner' },
    { seed: 6, race: 'slime', sex: 'F', stage: 'adult', job: 'mage', status: 'commoner' },
    { seed: 7, race: 'winged', sex: 'M', stage: 'adult', job: 'hero', status: 'royal' },
  ];
  extra.forEach((f) => {
    const r = row(f.race + ' ' + f.stage);
    const all: Pix[] = [];
    for (const pose of POSES) { for (let k = 0; k < POSE_FRAMES[pose]; k++) { const P = time(() => paintSprite(f, pose, k)); all.push(P); r.append(canvas(P, 's', pose + k)); } gap(r); }
    addLive(r, all, 's');
  });
}
if (!part || part === 'enemies') {
  head('敵: 姿ごと (idle2 attack2 hurt down)');
  const seen = new Map<string, EnemySpec>();
  for (const w of WORLDS) for (const foe of FOES) for (let s = 0; s < 24; s++) { const e = enemyFor(w, foe, s); const k = enemyKind(e); if (!seen.has(k)) seen.set(k, e); }
  for (const [k, e] of seen) {
    const r = row(`${k} (${e.world}/${e.foe})`);
    const all: Pix[] = [];
    for (const [pose, cnt] of EPOSES) for (let f = 0; f < cnt; f++) { const P = time(() => paintEnemy(e, pose, f)); all.push(P); r.append(canvas(P, 'e', pose + f)); }
    addLive(r, all, 'e');
  }
  head('敵: 世界 × 相手 (seed 0)');
  for (const w of WORLDS) {
    const r = row(w);
    for (const foe of FOES) { const e = enemyFor(w, foe, 0); const P = time(() => paintEnemy(e, 'idle', 0)); r.append(canvas(P, 'e', foe + ':' + enemyKind(e))); }
  }
  document.title = `${seen.size} kinds`;
}
const msg = `${n} 枚 / ${ms.toFixed(1)}ms (1枚 ${(ms / n).toFixed(3)}ms)`;
document.getElementById('timing')!.textContent = msg;
console.log(msg);
let tick = 0;
setInterval(() => { tick++; for (const l of live) l.frames[tick % l.frames.length].put(l.cv); }, 180);
