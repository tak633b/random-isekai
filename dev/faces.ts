// 開発用: 全種族 × 性別 × 段階の顔と、全職業の立ち絵を並べる
import type { Figure, JobId, RaceId, Stage, Status } from '../src/engine/types';
import { paintPortrait } from '../src/ui/portrait';
import { paintSprite } from '../src/ui/sprite';

const RACES: RaceId[] = ['human', 'elf', 'half_elf', 'dark_elf', 'dwarf', 'halfling', 'beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf',
  'dragonkin', 'demon', 'vampire', 'oni', 'goblin', 'orc', 'lizardfolk', 'merfolk', 'winged', 'fairy', 'slime', 'homunculus', 'android', 'cyborg', 'mutant', 'alien'];
const STAGES: Stage[] = ['infant', 'child', 'teen', 'adult', 'middle', 'elder'];
const STATUS: Status[] = ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'];
const JOBS: JobId[] = ['farmer', 'merchant', 'smith', 'alchemist', 'herbalist', 'priest', 'knight', 'soldier', 'mercenary', 'adventurer', 'mage', 'scholar', 'bard',
  'thief', 'tamer', 'cook', 'lord', 'servant', 'hunter', 'sailor', 'miner', 'assassin', 'necromancer', 'hero', 'saint', 'samurai', 'onmyoji', 'cultivator', 'ninja',
  'engineer', 'factory', 'airship', 'corp', 'hacker', 'pilot', 'medic', 'researcher', 'office', 'explorer', 'police', 'scavenger', 'raider'];

const out = document.getElementById('out')!;
let n = 0, ms = 0;
const fig = (o: Partial<Figure>): Figure => ({ seed: 1, race: 'human', sex: 'M', stage: 'adult', job: null, status: 'commoner', ...o });
function cell(row: HTMLElement, f: Figure, kind: 'p' | 's', label = '', alt = false): void {
  const t = performance.now();
  const P = kind === 'p' ? paintPortrait(f) : paintSprite(f);
  ms += performance.now() - t; n++;
  const cv = document.createElement('canvas');
  cv.className = kind + (alt ? ' alt' : '');
  P.put(cv);
  const d = document.createElement('div');
  d.className = 'cell';
  d.append(cv);
  if (label) { const s = document.createElement('span'); s.textContent = label; d.append(s); }
  row.append(d);
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

const only = new URLSearchParams(location.search).get('part');
if (!only || only === 'faces') {
  head('顔: 種族 × 性別 × 段階');
  RACES.forEach((race, i) => {
    const r = row(race);
    for (const sex of ['F', 'M'] as const) STAGES.forEach((stage, j) => cell(r, fig({ seed: 100 + i * 7 + j * 3 + (sex === 'F' ? 50 : 0), race, sex, stage }), 'p'));
  });
  head('顔: 身分 (人間・エルフ) と死者');
  const r1 = row('status');
  STATUS.forEach((status, i) => cell(r1, fig({ seed: 300 + i, race: i & 1 ? 'elf' : 'human', sex: i & 2 ? 'F' : 'M', status }), 'p', status));
  cell(r1, fig({ seed: 77, dead: true }), 'p', 'dead');
}
if (!only || only === 'sprites') {
  head('立ち絵: 職業');
  for (let k = 0; k < JOBS.length; k += 14) {
    const r = row(k ? '' : 'jobs');
    JOBS.slice(k, k + 14).forEach((job, i) => cell(r, fig({ seed: 500 + k + i, race: 'human', sex: (k + i) & 1 ? 'F' : 'M', job }), 's', job, (i & 1) === 1));
  }
  head('立ち絵: 種族 (大人、職業なし)');
  for (let k = 0; k < RACES.length; k += 14) {
    const r = row(k ? '' : 'races');
    RACES.slice(k, k + 14).forEach((race, i) => cell(r, fig({ seed: 700 + k + i, race, sex: (k + i) & 1 ? 'F' : 'M' }), 's', race, (i & 1) === 1));
  }
  head('立ち絵: 種族 × 職業');
  const mix: [RaceId, JobId][] = [['elf', 'hunter'], ['dwarf', 'smith'], ['beast_cat', 'thief'], ['beast_rabbit', 'bard'], ['beast_fox', 'onmyoji'], ['beast_wolf', 'mercenary'],
    ['dragonkin', 'knight'], ['demon', 'necromancer'], ['vampire', 'lord'], ['oni', 'samurai'], ['goblin', 'merchant'], ['orc', 'soldier'], ['lizardfolk', 'adventurer'], ['merfolk', 'sailor'],
    ['winged', 'saint'], ['fairy', 'mage'], ['slime', 'cook'], ['android', 'hacker'], ['cyborg', 'police'], ['mutant', 'scavenger'], ['alien', 'researcher']];
  for (let k = 0; k < mix.length; k += 14) {
    const r = row(k ? '' : 'mix');
    mix.slice(k, k + 14).forEach(([race, job], i) => cell(r, fig({ seed: 900 + k + i, race, sex: i & 1 ? 'F' : 'M', job }), 's', race.replace('beast_', '') + '/' + job, (i & 1) === 1));
  }
  head('立ち絵: 段階・身分');
  const r2 = row('stages');
  STAGES.forEach((stage, i) => cell(r2, fig({ seed: 40, stage, sex: 'F', race: 'beast_dog' }), 's', stage, (i & 1) === 1));
  STAGES.forEach((stage, i) => cell(r2, fig({ seed: 41, stage, race: 'human', job: stage === 'adult' || stage === 'middle' ? 'farmer' : null }), 's', stage, (i & 1) === 0));
  const r3 = row('status');
  STATUS.forEach((status, i) => cell(r3, fig({ seed: 60 + i, status, sex: i & 1 ? 'F' : 'M' }), 's', status, (i & 1) === 1));
  cell(r3, fig({ seed: 61, dead: true, job: 'knight' }), 's', 'dead');
}
const msg = `${n} 枚 / ${ms.toFixed(1)}ms (1枚 ${(ms / n).toFixed(3)}ms)`;
document.getElementById('timing')!.textContent = msg;
console.log(msg);
