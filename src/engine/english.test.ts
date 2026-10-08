import { describe, it, expect, vi } from 'vitest';

// 英語表示: i18n.ts は読み込んだ時に言語を決めるので、保存先を英語にしてから engine を読み込み直す
vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: () => undefined });

const JA = /[぀-ヿ㐀-鿿＀-￯]/;

describe('英語表示でも一生が回る', () => {
  it('ログ・なぜ・死亡の記録・名前に日本語の文字が混じらない', async () => {
    vi.resetModules();
    const { isEn } = await import('../i18n');
    const { createHero } = await import('./hero');
    const { liveOut } = await import('./life');
    expect(isEn).toBe(true);
    const bad: string[] = [];
    for (let s = 1; s <= 300; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'random' }, hero: {}, auto: true }));
      expect(h.alive).toBe(false);
      const texts = [h.name, h.death!.label, h.death!.text, ...h.people.map((t) => t.name), ...h.log.flatMap((e) => [e.text, e.why ?? ''])];
      for (const t of texts) if (JA.test(t)) bad.push(`${h.world.id}: ${t}`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 60_000);
});
