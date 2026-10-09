// 開発用: 場面を 10fps で動かして見る。?frames=0,3,6,9 なら tick を変えた連続コマを横に並べる
import { ambientOf, paintScene } from '../src/ui/scene';
import type { Place, SceneSpec, Tod, WorldId } from '../src/engine/types';

const DEFAULT = 'cyberpunk/city/night,wa/temple/morning,ocean/ship/dusk,medieval/battle/day,dark/grave/night,steampunk/forge/day,game/dungeon/day,frontier/home/day';
const q = new URLSearchParams(location.search);
document.body.style.setProperty('--k', q.get('scale') ?? '2');
const specs: SceneSpec[] = (q.get('scenes') ?? DEFAULT).split(',').map((v, i) => {
  const [world, place, tod, season] = v.split('/');
  return { seed: 2024 + i * 31, world: world as WorldId, place: place as Place, home: 'house', tod: tod as Tod, season: (Number(season ?? (world === 'wa' ? 0 : world === 'frontier' ? 3 : 1)) as SceneSpec['season']), figures: [] };
});
const out = document.getElementById('out')!, info = document.getElementById('info')!;
const canvas = (row: HTMLElement, cap: string) => {
  const fig = document.createElement('figure'), cv = document.createElement('canvas'), fc = document.createElement('figcaption');
  fc.textContent = cap; fig.append(cv, fc); row.append(fig); return cv;
};
let total = 0, n = 0, worst = 0;
const draw = (s: SceneSpec, tick: number, cv: HTMLCanvasElement) => {
  const t0 = performance.now();
  const pix = paintScene(s, tick);
  const dt = performance.now() - t0; total += dt; n++; worst = Math.max(worst, dt);
  pix.put(cv);
};
const frames = q.get('frames');
if (frames) {
  for (const s of specs) {
    const row = document.createElement('div'); row.className = 'row'; out.append(row);
    for (const t of frames.split(',').map(Number)) draw(s, t, canvas(row, `${s.world}/${s.place}/${s.tod} tick ${t}${ambientOf(s) ? '' : ' (動きなし)'}`));
  }
  info.textContent = ` 平均 ${(total / n).toFixed(2)}ms 最大 ${worst.toFixed(2)}ms`;
} else {
  const row = document.createElement('div'); row.className = 'row'; out.append(row);
  const cvs = specs.map((s) => canvas(row, `${s.world}/${s.place}/${s.tod}`));
  let tick = 0;
  specs.forEach((s, i) => draw(s, 0, cvs[i]));
  setInterval(() => {
    tick++;
    specs.forEach((s, i) => { if (ambientOf(s)) draw(s, tick, cvs[i]); });
    info.textContent = ` tick ${tick} 平均 ${(total / n).toFixed(2)}ms 最大 ${worst.toFixed(2)}ms`;
  }, 100);
}
