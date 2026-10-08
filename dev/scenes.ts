// 開発用: 世界 × 場所 × 時刻の場面を並べて見る。URL の ?world= ?place= ?tod= ?home= ?season= ?scale= で絞る
import { paintScene } from '../src/ui/scene';
import type { Home, Place, SceneSpec, Tod, WorldId } from '../src/engine/types';

const WORLDS: WorldId[] = ['medieval', 'dark', 'game', 'academy', 'wa', 'xianxia', 'steampunk', 'cyberpunk', 'space', 'modern', 'postapoc', 'ocean', 'desert', 'beast', 'myth', 'frontier'];
const PLACES: Place[] = ['home', 'field', 'town', 'guild', 'dungeon', 'battle', 'academy', 'temple', 'shop', 'forge', 'lab', 'castle', 'ship', 'wild', 'city', 'grave'];
const TODS: Tod[] = ['morning', 'day', 'dusk', 'night'];
const HOMES: Home[] = ['hovel', 'house', 'manor', 'castle'];

const q = new URLSearchParams(location.search);
const pick = <T extends string>(all: T[], key: string): T[] => (q.get(key) ? (q.get(key)!.split(',') as T[]) : all);
const worlds = pick(WORLDS, 'world'), places = pick(PLACES, 'place');
const fixedTod = q.get('tod') as Tod | null, fixedHome = q.get('home') as Home | null, fixedSeason = q.get('season');
document.body.style.setProperty('--k', q.get('scale') ?? '2');

const out = document.getElementById('out')!;
let total = 0, n = 0, worst = 0;
worlds.forEach((world, wi) => {
  const h2 = document.createElement('h2');
  h2.textContent = world;
  out.append(h2);
  const row = document.createElement('div');
  row.className = 'row';
  out.append(row);
  places.forEach((place, pi) => {
    const tod = fixedTod ?? TODS[(wi + pi) % 4];
    const home = fixedHome ?? HOMES[(wi + pi) % 4];
    const season = (fixedSeason ? Number(fixedSeason) : (wi * 3 + pi) % 4) as SceneSpec['season'];
    const spec: SceneSpec = { seed: 1000 + wi * 37 + pi * 11, world, place, home, tod, season, figures: [] };
    const t0 = performance.now();
    const pix = paintScene(spec);
    const dt = performance.now() - t0; total += dt; n++; worst = Math.max(worst, dt);
    const fig = document.createElement('figure');
    const cv = document.createElement('canvas');
    pix.put(cv);
    const cap = document.createElement('figcaption');
    cap.textContent = `${place}${place === 'home' ? '/' + home : ''} · ${tod} · 季${season}`;
    fig.append(cv, cap);
    row.append(fig);
  });
});
document.getElementById('info')!.textContent = ` ${n}枚 平均 ${(total / n).toFixed(2)}ms 最大 ${worst.toFixed(2)}ms`;
