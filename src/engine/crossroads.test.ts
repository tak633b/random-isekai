// 岐路 (crossroads.ts)・ひと息 (reflect.ts)・アルバム (album.ts)・老いてからの小さな選択 (life.ts の minorDecision)
import { describe, expect, it } from 'vitest';
import { createHero } from '.';
import { advanceYear, choose, die, fromSaved, liveOut, minorDecision, toSaved } from './life';
import { crossroads, crossroadsByRef, RECORD_DRAG, RECORD_YEARS, recordDrag } from './crossroads';
import { pauseDue, pauseQuestion, keepNote, NOTE_MAX, PAUSE_HEQ } from './reflect';
import { albumOf, ALBUM_MAX } from './album';
import { COIN } from './bonds';
import { heqOf } from './mortality';
import type { Decision, Hero } from './types';

const adult = (seed: number, policy: Hero['policy'] = 'normal'): Hero => {
  const h = createHero({ seed, world: { preset: 'medieval' }, hero: { status: 'commoner', race: 'human' }, auto: true, policy });
  h.age = 30;
  return h;
};

describe('岐路', () => {
  it('主人公の乱数 (h.rng) を引かない', () => {
    const h = adult(3);
    h.state.plague = 1;
    const before = h.rng.state;
    for (let i = 0; i < 20; i++) { crossroads(h, die); h.age++; }
    expect(h.rng.state).toBe(before);
  });

  it('同じ seed なら同じ一生 (岐路の選択と結末も)', () => {
    const a = liveOut(createHero({ seed: 77, world: { preset: 'random' }, hero: {}, auto: true }));
    const b = liveOut(createHero({ seed: 77, world: { preset: 'random' }, hero: {}, auto: true }));
    expect(b.log.map((e) => e.text)).toEqual(a.log.map((e) => e.text));
  });

  it('召集令状: 3つの道。身代わりは12枚払って兵役を外れ、逃げるのは前科か、見つからずに済むか', () => {
    const h = adult(5);
    h.gold = 100 * COIN;
    h.flags.drafted = h.age; h.flags.draftCall = h.age;
    const d = crossroads(h, die)!;
    expect(d.ref).toBe('xr:draft:0');
    expect(d.options).toHaveLength(3);
    d.options[2].apply(h);
    expect(h.gold).toBe(88 * COIN);
    expect(h.flags.drafted).toBeUndefined();
    // 逃げる: 結末はその年の横の乱数で決まる (同じ人・同じ年なら同じ)
    const x = adult(5), y = adult(5);
    for (const z of [x, y]) { z.flags.drafted = z.age; crossroadsByRef(z, 'xr:draft:0', die)!.options[1].apply(z); }
    expect(x.flags.drafted).toBeUndefined();
    expect(x.flags.record).toBe(y.flags.record);
    expect(x.log.at(-1)!.text).toBe(y.log.at(-1)!.text);
  });

  it('保存から待っている岐路を作り直せる', () => {
    const h = createHero({ seed: 11, world: { preset: 'medieval' }, hero: { status: 'commoner' }, auto: false });
    h.age = 30;
    const d = crossroadsByRef(h, 'xr:plague:0', die)!;
    h.pending.push(d);
    const back = fromSaved(toSaved(h));
    expect(back.pending[0].title).toBe(d.title);
    expect(back.pending[0].options.map((o) => o.label)).toEqual(d.options.map((o) => o.label));
    choose(back, 2);
    expect(back.sick?.k).toBe(0.6);
  });

  it('前科: 付いている間はギルドの昇格の確率に 0.25 を掛け、6年で消える (消えたら年表に一行)', () => {
    const h = adult(8);
    expect(recordDrag(h)).toBe(1);
    h.flags.record = h.age - RECORD_YEARS + 1;
    crossroads(h, die);
    expect(recordDrag(h)).toBe(RECORD_DRAG);
    h.age++;
    const n = h.log.length;
    crossroads(h, die);
    expect(h.flags.record).toBeUndefined();
    expect(h.log.slice(n).some((e) => e.text.includes('古い帳簿'))).toBe(true);
  });

  it('魔王の軍に協力した人は、魔王が倒れた年に名を晒されて前科が付く', () => {
    const h = adult(9);
    h.state.demonKing = true;
    crossroadsByRef(h, 'xr:demon:0', die)!.options[1].apply(h);
    expect(h.flags['xr.collab']).toBe(h.age);
    h.age++;
    crossroads(h, die);
    expect(h.flags.record).toBeUndefined(); // まだ魔王がいる
    h.state.demonKing = false;
    h.age++;
    crossroads(h, die);
    expect(h.flags.record).toBe(h.age);
    expect(h.flags['xr.collab']).toBeUndefined();
  });

  it('戦災孤児を迎えると、子として輪に入る', () => {
    const h = adult(12);
    const n = h.people.length;
    crossroadsByRef(h, 'xr:orphan:0', die)!.options[0].apply(h);
    const c = h.people[n];
    expect(c.role).toBe('child');
    expect(c.age).toBeGreaterThan(0);
    expect(h.flags[`adopted.${c.id}`]).toBe(h.age);
  });

  it('改宗して親が反対したら仲違いのしるし。親が亡くなったら和解できないまま一行残して消える', () => {
    const h = adult(14);
    const p = h.people.find((t) => t.role === 'mother' || t.role === 'father')!;
    p.alive = true; p.until = undefined;
    const bond = p.bond;
    crossroadsByRef(h, 'xr:convert:0', die)!.options[0].apply(h);
    expect(h.flags['faith.rift']).toBe(h.age);
    const who = h.people.find((t) => t.id === h.flags['faith.riftWho'])!;
    expect(who.bond).toBeLessThan(who === p ? bond : 101);
    for (const t of h.people) if (t.role === 'mother' || t.role === 'father') t.alive = false;
    h.age++;
    crossroads(h, die);
    expect(h.flags['faith.rift']).toBeUndefined();
  });

  it('どの岐路も16の世界で組み立つ (ぬれぎぬ・牢は輪の人がいれば)', () => {
    for (const k of ['draft', 'plague', 'demon', 'bread', 'orphan', 'accused', 'duel', 'convert', 'roots']) {
      const d = crossroadsByRef(adult(1), `xr:${k}:0`, die);
      expect(d, k).not.toBeNull();
      expect(d!.options.length).toBeGreaterThanOrEqual(2);
      expect(d!.auto(adult(1))).toBeLessThan(d!.options.length);
    }
    const h = adult(1);
    expect(crossroadsByRef(h, `xr:jail:${h.people[0].id}`, die)).not.toBeNull();
    expect(crossroadsByRef(h, 'xr:jail:9999', die)).toBeNull();
  });
});

describe('老いてからは小さな選択を出さない', () => {
  it('人間換算65歳から、買い物・鍛える・小さなお金の話・小さな出来事はその場で決める。岐路は残す', () => {
    const h = adult(2);
    let used = false;
    const minor: Decision = { title: '', text: '', ref: 'shop:save', options: [{ label: 'a', apply: () => { used = true; } }], auto: () => 0 };
    expect(minorDecision(h, minor)).toBe(true);
    expect(used).toBe(true);
    expect(minorDecision(h, crossroadsByRef(h, 'xr:plague:0', die)!)).toBe(false);
  });

  it('手で遊ぶ一生で、65歳から先に小さな選択の画面が来ない (中世欧州風 300人。実測 0件、岐路や大きな出来事は 33件)', () => {
    let minor = 0, major = 0;
    for (let s = 1; s <= 300; s++) {
      const h = createHero({ seed: s, world: { preset: 'medieval' }, hero: {}, auto: false });
      while (h.alive && h.age < 3000) {
        advanceYear(h);
        while (h.pending.length && h.alive) {
          const d = h.pending[0];
          if (heqOf(h) >= 65) { if (/^(shop|train|mev:(shady|lend|invest|tax))/.test(d.ref ?? '')) minor++; else major++; }
          choose(h, d.auto(h));
        }
      }
    }
    expect(minor).toBe(0);
    expect(major).toBe(33);
  });
});

describe('ひと息', () => {
  it('人間換算の節目を越えた年にだけ出て、一度聞いた節目はもう出ない', () => {
    const h = createHero({ seed: 21, world: { preset: 'medieval' }, hero: { race: 'human', arrival: 'reborn' }, auto: true });
    const seen: number[] = [];
    while (h.alive && h.age < 80) {
      const b = h.age;
      advanceYear(h);
      const at = pauseDue(h, b);
      if (at !== null) { seen.push(at); keepNote(h, at, pauseQuestion(h, at), ''); expect(pauseDue(h, b)).toBeNull(); }
    }
    expect(seen).toEqual(PAUSE_HEQ.filter((m) => m <= heqOf(h)));
  });

  it('問いは seed と節目で決まり、名が入る。メモは一行に縮めて80字まで', () => {
    const h = adult(4);
    for (const m of PAUSE_HEQ) {
      const q = pauseQuestion(h, m);
      expect(q).toBe(pauseQuestion(h, m));
      expect(q).not.toMatch(/\{\w+\}/);
    }
    keepNote(h, 15, 'q', `  a\n b ${'x'.repeat(200)}`);
    expect(h.notes![0].text.startsWith('a b x')).toBe(true);
    expect(h.notes![0].text.length).toBe(NOTE_MAX);
  });

  it('ほかの人の一生では出ない', () => {
    const h = adult(4);
    h.setup = { ...h.setup, anchors: { bornAt: 0 } };
    h.age = 20;
    expect(pauseDue(h, 10)).toBeNull();
  });
});

describe('思い出のアルバム', () => {
  it('多くて12枚。最初は誕生、亡くなった人の最後は最期、年の順', () => {
    for (let s = 1; s <= 40; s++) {
      const h = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      const a = albumOf(h);
      expect(a.length).toBeLessThanOrEqual(ALBUM_MAX);
      expect(a[0].e).toBe(h.log[0]);
      expect(a[0].tag).toBe('birth');
      expect(a.at(-1)!.tag).toBe('death');
      for (let i = 1; i < a.length; i++) expect(a[i].e.age).toBeGreaterThanOrEqual(a[i - 1].e.age);
    }
  });
});
