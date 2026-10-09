// 英語で生きた人生も言葉の網に掛からない。i18n.ts は読み込んだ時に言語を決めるので、保存先を英語にしてから読み込む
import { expect, it, vi } from 'vitest';
vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: () => undefined });
globalThis.window ??= { addEventListener() {} };
const { validEntry } = await import('./validate.mjs');
const { WORLD_IDS, createHero, liveOut } = await import('../src/engine');
const { toMemorialPost } = await import('../src/net/memorial');

it('英語の人生は検証を通る (網に掛からない)', () => {
  for (let i = 0; i < 64; i++) {
    const p = toMemorialPost(liveOut(createHero({ seed: 9000 + i, world: { preset: WORLD_IDS[i % WORLD_IDS.length] }, hero: {}, auto: true })));
    expect(p.lang).toBe('en');
    expect(() => validEntry(p)).not.toThrow();
  }
});
