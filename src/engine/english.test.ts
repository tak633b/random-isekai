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

describe('英語の文の頭は大文字', () => {
  it('年代記・主人公の年表・輪の人の一生の全行が、大文字か数字か記号で始まる。転生者の名は2文字以上の語', async () => {
    vi.resetModules();
    const { createHero } = await import('./hero');
    const { liveOut } = await import('./life');
    const { chronicleOf } = await import('./chronicle');
    const { lifeOfTie } = await import('./others');
    const { reincarnatorsOf } = await import('./reincarnators');
    const LOWER = /^[a-z]/;
    let n = 0;
    for (let s = 1; s <= 60; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'random' }, hero: {}, auto: true }));
      for (const e of chronicleOf(h)) { n++; expect(LOWER.test(e.text), e.text).toBe(false); }
      for (const e of h.log) expect(LOWER.test(e.text), e.text).toBe(false);
      for (const t of h.people.slice(0, 4)) for (const e of lifeOfTie(h, t.id).log) expect(LOWER.test(e.text), e.text).toBe(false);
      for (const p of reincarnatorsOf(h)) for (const w of p.name.split(/\s+/)) expect(w.length, p.name).toBeGreaterThanOrEqual(2);
    }
    expect(n).toBeGreaterThan(300);
  }, 60_000);

  it('英語の文に「a + 母音で始まる語」が無い (職業や種族を差し込んでも a / an が合う)', async () => {
    vi.resetModules();
    const { createHero } = await import('./hero');
    const { liveOut } = await import('./life');
    const { fateLine } = await import('./people');
    const BAD = /\b[Aa] (?=[aeioAEIO])/;
    const bad: string[] = [];
    let n = 0;
    for (let s = 1; s <= 80; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'random' }, hero: {}, auto: true }));
      for (const e of h.log) { n++; if (BAD.test(e.text)) bad.push(e.text); }
      for (const t of h.people) { n++; const f = fateLine(h, t); if (BAD.test(f)) bad.push(f); }
    }
    expect(n).toBeGreaterThan(3000);
    expect(bad.slice(0, 5)).toEqual([]);
  }, 60_000);
});
