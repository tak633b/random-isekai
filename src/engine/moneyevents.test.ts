// お金のハラハラ (moneyevents.ts): 世界ごとの言い方、何年か後の結末、作戦での選び方、保存からの再開
import { describe, expect, it } from 'vitest';
import { advanceYear, createHero } from '.';
import { choose, fromSaved, liveOut, toSaved } from './life';
import { addGold, COIN } from './bonds';
import { moneyDue, moneyEventByRef } from './moneyevents';
import { MONEY } from '../data/money';
import { WORLD_IDS } from './worlds';
import type { Hero } from './types';

const adult = (seed: number, preset: Parameters<typeof createHero>[0]['world']['preset'] = 'medieval', policy?: Hero['policy']): Hero => {
  const h = createHero({ seed, world: { preset }, hero: { status: 'commoner' }, auto: true, policy });
  h.age = 30;
  return h;
};

describe('お金のハラハラ', () => {
  it('16の世界すべてで6つの出来事が組み立ち、闇金・人さらいはその世界の言い方で出る', () => {
    for (const w of WORLD_IDS) {
      const h = adult(1, w);
      const kin = h.people[0].id;
      for (const k of ['shady', 'lend', 'ransom', 'dowry', 'invest', 'tax']) {
        const d = moneyEventByRef(h, `mev:${k}:${k === 'lend' || k === 'ransom' || k === 'dowry' ? kin : 10 * COIN}`);
        expect(d, `${w} ${k}`).not.toBeNull();
        expect(d!.options.length).toBeGreaterThan(1);
      }
      expect(moneyEventByRef(h, 'mev:shady:0')!.text).toContain(MONEY[w].shady[0]);
      expect(moneyEventByRef(h, `mev:ransom:${kin}`)!.text).toContain(MONEY[w].kidnap[0]);
    }
  });

  it('闇金: 三年後に1.8倍を返す。払えなければ取り立て屋に殴られ、借金が残る', () => {
    const rich = adult(2);
    addGold(rich, 100 * COIN);
    moneyEventByRef(rich, 'mev:shady:0')!.options[0].apply(rich);
    const g = rich.gold!;
    rich.age += 3;
    moneyDue(rich);
    expect(g - rich.gold!).toBe(36 * COIN);
    expect(rich.flags.shadyBeaten).toBeUndefined();

    const poor = adult(2);
    addGold(poor, -poor.gold!);
    moneyEventByRef(poor, 'mev:shady:0')!.options[0].apply(poor);
    addGold(poor, -poor.gold!); // 借りた分は使ってしまった
    poor.age += 3;
    moneyDue(poor);
    expect(poor.gold!).toBe(-36 * COIN);
    expect(poor.flags.shadyBeaten).toBe(poor.age);
    expect(poor.money?.shady).toBeUndefined();
  });

  it('貸した金の結末は貸した年に決まる。踏み倒した人は輪から離れる', () => {
    const run = () => { const h = adult(1); const id = h.people[0].id; moneyEventByRef(h, `mev:lend:${id}`)!.options[0].apply(h); return h.money!.lent!.out; };
    expect(run()).toBe(run());
    const h = adult(1);
    const t = h.people[0];
    moneyEventByRef(h, `mev:lend:${t.id}`)!.options[0].apply(h);
    h.money = { lent: { ...h.money!.lent!, out: 'gone' } };
    h.age = h.money.lent!.due;
    moneyDue(h);
    expect(t.until).toBe(h.age);
    expect(h.log.at(-1)!.leave).toEqual([t.id]);
  });

  it('作戦: いのちだいじには闇金を断り身代金を払う。ガンガンいこうぜは借りて、自分で助けに行く', () => {
    const c = adult(3, 'medieval', 'careful'), b = adult(3, 'medieval', 'bold');
    const kin = c.people[0].id;
    expect(moneyEventByRef(c, 'mev:shady:0')!.auto(c)).toBe(1);
    expect(moneyEventByRef(b, 'mev:shady:0')!.auto(b)).toBe(0);
    expect(moneyEventByRef(c, `mev:ransom:${kin}`)!.auto(c)).toBe(0);
    expect(moneyEventByRef(b, `mev:ransom:${kin}`)!.auto(b)).toBe(2);
  });

  it('お金の選択を待ったまま保存しても、同じ選択で戻り、同じ人生になる', () => {
    let h: Hero | null = null;
    for (let s = 1; s < 200 && !h; s++) {
      const x = createHero({ seed: s, world: { preset: 'medieval' }, hero: {} });
      while (x.alive && x.age < 90) {
        if (x.pending.length) { if (x.pending[0].ref?.startsWith('mev:')) { h = x; break; } choose(x, x.pending[0].auto(x)); }
        else advanceYear(x);
      }
    }
    expect(h).not.toBeNull();
    const b = fromSaved(JSON.parse(JSON.stringify(toSaved(h!))));
    expect(b.pending.map((d) => d.ref)).toEqual(h!.pending.map((d) => d.ref));
    expect(b.pending[0].text).toBe(h!.pending[0].text);
    for (const x of [h!, b]) { x.auto = true; choose(x, x.pending[0].auto(x)); liveOut(x); }
    expect(b.log).toEqual(h!.log);
  });
});
