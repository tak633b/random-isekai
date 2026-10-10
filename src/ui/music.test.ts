import { describe, it, expect } from 'vitest';
import readme from '../../README.md?raw';
import readmeJa from '../../README.ja.md?raw';
import about from '../../public/about.html?raw';
import credits from '../../public/audio/CREDITS.txt?raw';
import { WORLD_IDS } from '../engine';
import { gainOf, RETRO, TRACKS, WORLD_TRACK } from './music';

// 置いてある曲 (読み込みはしない。パスだけ)
const onDisk = Object.keys(import.meta.glob('../../public/audio/*.mp3')).map((p) => p.split('/').pop()!);

describe('音楽', () => {
  const all = [...Object.values(TRACKS), ...Object.values(RETRO)];
  const files = all.map((t) => t.file);
  it('曲はすべて public/audio にあり、使っていない曲は置かない', () => {
    expect(onDisk.sort()).toEqual([...new Set(files)].sort());
  });
  it('どの曲もクレジット (README 両方・about・CREDITS.txt) に載っている', () => {
    for (const t of all) {
      for (const c of [readme, readmeJa, credits]) expect(c, t.title).toContain(`"${t.title}"`);
      expect(about, t.title).toContain(`>${t.title}</a>`);
      expect(credits, t.file).toContain(t.file);
    }
  });
  it('ライセンスは CC0 か CC BY だけ (SA・NC は使わない)', () => {
    for (const t of all) expect(['CC0', 'CC BY 3.0', 'CC BY 4.0'], t.title).toContain(t.license);
  });
  it('16の世界それぞれに暮らしの曲がある', () => {
    for (const w of WORLD_IDS) expect(TRACKS[WORLD_TRACK[w]], w).toBeDefined();
  });
  it('音量は2乗の曲線で、既定 (35) は静か・最大 (100) で 0.4', () => {
    expect(gainOf(0)).toBe(0);
    expect(gainOf(35)).toBeCloseTo(0.049, 3);
    expect(gainOf(100)).toBeCloseTo(0.4, 6);
  });
});
