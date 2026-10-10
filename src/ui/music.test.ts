import { describe, it, expect } from 'vitest';
import readme from '../../README.md?raw';
import readmeJa from '../../README.ja.md?raw';
import about from '../../public/about.html?raw';
import credits from '../../public/audio/CREDITS.txt?raw';
import { WORLD_IDS } from '../engine';
import { TRACKS, WORLD_TRACK } from './music';

// 置いてある曲 (読み込みはしない。パスだけ)
const onDisk = Object.keys(import.meta.glob('../../public/audio/*.mp3')).map((p) => p.split('/').pop()!);

describe('音楽', () => {
  const files = Object.values(TRACKS).map((t) => t.file);
  it('曲はすべて public/audio にあり、使っていない曲は置かない', () => {
    expect(onDisk.sort()).toEqual([...new Set(files)].sort());
  });
  it('どの曲もクレジット (README 両方・about・CREDITS.txt) に載っている', () => {
    for (const t of Object.values(TRACKS)) {
      for (const c of [readme, readmeJa, credits]) expect(c, t.title).toContain(`"${t.title}"`);
      expect(about, t.title).toContain(`>${t.title}</a>`);
      expect(credits, t.file).toContain(t.file);
    }
  });
  it('ライセンスは CC0 か CC BY だけ (SA・NC は使わない)', () => {
    for (const t of Object.values(TRACKS)) expect(['CC0', 'CC BY 3.0', 'CC BY 4.0'], t.title).toContain(t.license);
  });
  it('16の世界それぞれに暮らしの曲がある', () => {
    for (const w of WORLD_IDS) expect(TRACKS[WORLD_TRACK[w]], w).toBeDefined();
  });
});
