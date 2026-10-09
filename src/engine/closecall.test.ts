// 九死に一生 (closecall.ts): 死の引きを読むだけで、人生 (乱数の並び・生死・ほかの出来事) は変えない
import { afterEach, describe, expect, it } from 'vitest';
import { createHero, liveOut, toSaved } from '.';
import { CLOSE_MAX, CLOSE_SW, closeCount } from './closecall';

afterEach(() => { CLOSE_SW.on = true; });

// 年表 (log)・年の色 (kinds)・しるし closeCall を除いた人生
const core = (h: ReturnType<typeof liveOut>) => {
  const { log, kinds, flags, ...rest } = toSaved(h) as unknown as Record<string, unknown> & { log: unknown; kinds: unknown; flags: Record<string, number> };
  const { closeCall, ...f } = flags;
  void log; void kinds; void closeCall;
  return JSON.stringify({ ...rest, flags: f });
};

describe('九死に一生', () => {
  it('300人で: 書いても書かなくても、年表と年の色としるし以外は同じ人生', () => {
    let n = 0;
    for (let s = 1; s <= 300; s++) {
      const a = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      CLOSE_SW.on = false;
      const b = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      CLOSE_SW.on = true;
      expect(core(a), `seed ${s}`).toBe(core(b));
      expect(a.log.filter((e) => !e.close).map((e) => e.text)).toEqual(b.log.map((e) => e.text));
      n += closeCount(a);
      expect(closeCount(a)).toBeLessThanOrEqual(CLOSE_MAX);
    }
    expect(n).toBeGreaterThan(0);
  });
});
