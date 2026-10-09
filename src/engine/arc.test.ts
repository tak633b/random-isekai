import { describe, it, expect, afterAll } from 'vitest';
import { createHero } from './hero';
import { liveOut } from './life';
import { allEvents, allDeaths, applyEvent, candidates, useData } from './events';
import { allTraits, useTraits } from './traits';
import { die } from './life';
import { ARC_FLAGS, KEEP } from './arc';
import { PEOPLE } from './people';
import { REINC } from './reincarnators';
import { heqOf } from './mortality';
import type { EventDef, TraitDef } from './types';

const ORIGINAL = { events: allEvents(), deaths: allDeaths(), traits: allTraits() };
afterAll(() => { useData({ events: ORIGINAL.events, deaths: ORIGINAL.deaths }); useTraits(ORIGINAL.traits); });

const HEROIC = ['adventure', 'battle', 'power', 'fame'];

describe('英雄の筋の段階', () => {
  const lives = Array.from({ length: 300 }, (_, i) => liveOut(createHero({ seed: i * 7919 + 1, world: { preset: 'random' }, hero: { cheat: 'appraisal', arrival: 'reborn' }, auto: true })));
  it('段階は順に進む (先の段階のしるしが立っていれば、前の段階も先に立っている)', () => {
    const order = ['arc.notice', 'arc.first', 'arc.deed', 'arc.saved', 'arc.legend'];
    let deep = 0;
    for (const h of lives) {
      for (let i = 1; i < order.length; i++) {
        const at = h.flags[order[i]];
        if (at === undefined) continue;
        const prev = h.flags[order[i - 1]];
        expect(prev, `${order[i]} の前に ${order[i - 1]}`).toBeDefined();
        expect(prev!).toBeLessThanOrEqual(at);
      }
      if (h.flags['arc.deed'] !== undefined) { deep++; expect(h.flags.guild).toBeDefined(); }
    }
    expect(deep).toBeGreaterThan(0);
  });
  it('人間換算20歳まで生きた特典持ちは、力に気づき、使い、ギルド (宗門・資格) に入っている (隠居した人を除く)', () => {
    const grown = lives.filter((x) => heqOf(x) >= 20 && x.flags.retired === undefined);
    expect(grown.length).toBeGreaterThan(50);
    for (const h of grown) for (const f of ARC_FLAGS.slice(0, 3)) expect(h.flags[f], `${f} ${h.race} ${h.age}`).toBeDefined();
  });
});

// 実測 (2026-10-09, tmpcheck/measure.test.ts と同じ 1000人): 特典なし・現地の生まれ・平民 44人の英雄の記録は 6.2 → 6.3件 (筋の前と後)
describe('登録した人の職業', () => {
  it('ギルド (宗門・資格) に入るか手柄を立てた特典持ちは、最後の職業が戦う職。それ以外の職からは転職の一文がある', () => {
    let n = 0, moved = 0;
    for (let s = 1; s <= 400; s++) {
      const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'random' }, hero: { cheat: 'sword_saint' }, auto: true }));
      if (h.flags.guild === undefined && h.flags['arc.deed'] === undefined) continue;
      // 隠居してから登録した人・大人になる前に亡くなった人は対象外
      if (heqOf(h) < 16 || (h.flags.retired !== undefined && h.flags.retired <= (h.flags.guild ?? h.age))) continue;
      if (!h.alive && h.flags.adult === h.age) continue; // 大人になったその年に、職業を選ぶ前の出来事で亡くなった人
      n++;
      expect(KEEP, `${h.world.id} ${h.job}`).toContain(h.job);
      if (h.log.some((e) => /を置いて、.+になった/.test(e.text))) moved++;
    }
    expect(n).toBeGreaterThan(100);
    expect(moved).toBeGreaterThan(0); // 農民などに就いてから登録した人がいて、転職の一文が年表にある
  });
});

// 特典なしの英雄の記録を、エンジンだけのぶんと、輪の人 (people.ts) と転生者 (reincarnators.ts) が足すぶんに分けて見る。
// 実測 (2026-10-09, この300人): エンジンだけ 6.39件 (標準偏差 5.53、標準誤差 0.32)。英雄の筋を入れる前の基準は 6.2件 (tmpcheck の現地平民 44人)。
// 輪の人を入れると 7.79件 (+1.40。仲間の出世・頭になった記録が fame に数えられる)、転生者を足しても 7.79件 (+0.00)。
// 上限: エンジンだけ 7.5件未満 (6.4 + 標準誤差の約3.5倍。筋が特典なしに漏れれば越える)、足すぶん 2.5件未満 (同じ seed で比べるので揺れは小さい)
describe('特典の無い人生は普通のまま', () => {
  const heroicOf = (people: boolean, reinc: boolean) => {
    PEOPLE.on = people; REINC.on = reinc;
    let heroic = 0;
    try {
      for (let s = 1; s <= 300; s++) {
        const h = liveOut(createHero({ seed: s * 7919, world: { preset: 'random' }, hero: { cheat: 'none', arrival: 'native', status: 'commoner' }, auto: true }));
        heroic += h.log.filter((e) => HEROIC.includes(e.kind)).length;
        expect(h.flags['arc.notice']).toBeUndefined();
      }
    } finally { PEOPLE.on = true; REINC.on = true; }
    return heroic / 300;
  };
  it('特典なし・現地の生まれ・平民の英雄の記録は、エンジンだけで7.5件未満、輪の人と転生者が足すぶんは2.5件未満', () => {
    const engine = heroicOf(false, false);
    const all = heroicOf(true, true);
    expect(engine).toBeLessThan(7.5);
    expect(all - engine).toBeLessThan(2.5);
  }, 30_000);
});

describe('特典・trait の置き換えと needs', () => {
  const POOL: TraitDef[] = [
    { id: 't.sword', kind: 'skill', name: { ja: '剣術', en: 'Swordsmanship' }, desc: { ja: '', en: '' }, cost: 2 },
    { id: 't.tough', kind: 'constitution', name: { ja: '頑健', en: 'Tough' }, desc: { ja: '', en: '' }, cost: 2 },
  ];
  const ev: EventDef = { id: 't.show', stage: ['infant', 'child', 'teen', 'adult', 'middle', 'elder'], w: 1, kind: 'power', needs: ['skill'],
    ja: '〈{cheat}〉と〈{skill}〉で切り抜けた', en: 'Got through with "{cheat}" and "{skill}"' };
  const bare: EventDef = { ...ev, id: 't.bare', needs: undefined, ja: '{cheat}', en: '{cheat}' };
  it('{cheat} と {skill} が持っている名前で埋まる', () => {
    useTraits(POOL);
    useData({ events: [ev], deaths: [] });
    const h = createHero({ seed: 1, world: { preset: 'medieval' }, hero: { cheat: 'appraisal', traits: ['t.sword', 't.tough'], points: {}, arrival: 'reborn' }, auto: true });
    expect(candidates(h).map((d) => d.id)).toEqual(['t.show']);
    applyEvent(h, ev, die);
    expect(h.log.at(-1)!.text).toBe('〈鑑定〉と〈剣術〉で切り抜けた');
  });
  it('needs の種類の trait や、置き換える特典を持たない人には起きない', () => {
    useTraits(POOL);
    useData({ events: [ev, bare], deaths: [] });
    const noSkill = createHero({ seed: 1, world: { preset: 'medieval' }, hero: { cheat: 'appraisal', traits: ['t.tough'], points: {}, arrival: 'reborn' }, auto: true });
    expect(candidates(noSkill).map((d) => d.id)).toEqual(['t.bare']);
    const noCheat = createHero({ seed: 1, world: { preset: 'medieval' }, hero: { cheat: 'none', traits: ['t.sword'], points: {}, arrival: 'native' }, auto: true });
    expect(candidates(noCheat).map((d) => d.id)).toEqual([]);
  });
});

describe('同じ seed なら同じ英雄の人生', () => {
  it('特典を持つ人生のログが一致する', () => {
    const s = { seed: 77, world: { preset: 'game' as const }, hero: { cheat: 'sword_saint' as const }, auto: true };
    expect(liveOut(createHero(s)).log).toEqual(liveOut(createHero(s)).log);
  });
});
