// 魂に刻まれたもの (meta/soul.ts): 引く割合、身につけた技を先に、一度だけ使う、保存から同じ人生、同期の合わせ方、試行は使わない
import { beforeEach, describe, expect, it } from 'vitest';
import { createHero, liveOut } from '../engine';
import { advanceYear, fromSaved, toSaved } from '../engine/life';
import type { Hero, SoulCarry } from '../engine/types';
import { pendingSoul, rollSoul, SOUL_P, takeSoul } from './soul';
import { loadProgress, newProgress, resetProgress, saveProgress, setStorage } from './store';
import { grantLife, seenKeys } from './tickets';
import { factsOf } from './facts';
import { mergeProgress } from './merge';
import type { Progress } from './types';

const born = (seed: number, soul?: SoulCarry, world: 'medieval' | 'random' = 'medieval'): Hero =>
  createHero({ seed, world: { preset: world }, hero: { race: 'human', cheat: 'none', traits: [], ...(soul ? { soul } : {}) }, auto: true });

// 技を3つ持ち、1つは鍛えて身につけた人
const holder = (): Hero => {
  const h = born(1);
  h.traits = ['sk.sword', 'sk.cook', 'sk.bow'];
  h.learned = ['sk.cook'];
  h.cheat = 'appraisal';
  return h;
};

describe('魂に刻まれたもの', () => {
  beforeEach(() => { setStorage(null); resetProgress(); });

  it('引く割合: 技1つ ≈ 10%・技2つ ≈ 2%・特典 ≈ 0.5%。同じ lifeId なら同じ結果', () => {
    const h = holder();
    const N = 40000;
    let one = 0, two = 0, cheat = 0;
    for (let i = 0; i < N; i++) {
      const r = rollSoul(h, String(i));
      if (!r) continue;
      if (r.cheat) cheat++; else if (r.traits.length === 2) two++; else one++;
    }
    expect(one / N).toBeCloseTo(SOUL_P.one, 1);
    expect(Math.abs(two / N - SOUL_P.two)).toBeLessThan(0.004);
    expect(Math.abs(cheat / N - SOUL_P.cheat)).toBeLessThan(0.002);
    expect(rollSoul(h, '77')).toEqual(rollSoul(h, '77'));
  });

  it('身につけた技を先に選び、弱点は持っていかない', () => {
    const h = holder();
    h.traits.push('gf.frail');
    for (let i = 0; i < 3000; i++) {
      const r = rollSoul(h, String(i));
      if (!r) continue;
      expect(r.traits[0]).toBe('sk.cook');
      expect(r.traits).not.toContain('gf.frail');
    }
  });

  it('引き継いだ技は生まれたときから持ち、年表の最初の行と、元の setup には残らない (同じ設定でもう一度で二度使わない)', () => {
    const soul: SoulCarry = { traits: ['sk.sword'], from: 'アルト', chain: { 'sk.sword': 1 } };
    const h = born(5, soul);
    expect(h.traits).toContain('sk.sword');
    expect(h.soul?.traits).toEqual(['sk.sword']);
    expect(h.log[0].text).toContain('前世');
    expect(h.setup.hero.soul).toBeUndefined();
    expect(createHero(h.setup).traits).not.toContain('sk.sword');
    // 引き継ぎの無い同じ seed と、世界・名前・家族は同じ (乱数を引かない)
    const plain = born(5);
    expect([h.world.id, h.name, h.people.map((t) => t.name)]).toEqual([plain.world.id, plain.name, plain.people.map((t) => t.name)]);
  });

  it('途中で保存して読み直しても、引き継いだ人生はそのまま同じ', () => {
    const h = born(9, { traits: ['sk.sword'], from: 'X' }, 'random');
    for (let i = 0; i < 25 && h.alive; i++) advanceYear(h);
    const a = fromSaved(JSON.parse(JSON.stringify(toSaved(h))));
    expect(a.soul).toEqual(h.soul);
    liveOut(h); liveOut(a);
    expect(a.log).toEqual(h.log);
  });

  it('精算で置かれ、次の転生で一度だけ受け取る。引き継いだものは「見た」に数えない', () => {
    // 引く lifeId (= seed) を探す
    let h: Hero | null = null;
    for (let s = 1; s < 400 && !h; s++) { const x = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true })); if (x.traits.length && rollSoul(x, String(s))) h = x; }
    expect(h).not.toBeNull();
    const g = grantLife(h!, true);
    expect(g.soul).not.toBeNull();
    expect(pendingSoul()).toEqual(g.soul);
    expect(takeSoul()).toEqual(g.soul);
    expect(takeSoul()).toBeNull();
    expect(loadProgress().soul?.used).toBe(true);
    const next = born(3, g.soul!);
    for (const id of next.soul?.traits ?? []) expect(seenKeys(next)).not.toContain(`trait:${id}`);
    expect(factsOf(next, true).inherited).toBe((next.soul?.traits.length ?? 0) + (next.soul?.cheat ? 1 : 0));
  });

  it('引き継いで生まれた人生を終えると「魂の記憶」、特典ごとなら「魂の特典」', () => {
    const h = liveOut(born(11, { traits: ['sk.sword'], cheat: 'appraisal', from: 'A', chain: { 'sk.sword': 3 } }));
    const ids = grantLife(h, true).achievements.map((a) => a.id);
    expect(ids).toContain('a.feat.soulMemory');
    expect(ids).toContain('a.feat.soulChain3');
    expect(ids).toContain('a.feat.soulCheat');
  });

  it('三代: 引き継いだ技をまた持っていくと数が増える', () => {
    const h = holder();
    h.learned = [];
    h.traits = ['sk.sword'];
    h.soul = { traits: ['sk.sword'], from: 'A', chain: { 'sk.sword': 2 } };
    let r: SoulCarry | null = null;
    for (let i = 0; !r; i++) r = rollSoul(h, String(i));
    expect(r.chain?.['sk.sword']).toBe(3);
  });

  it('同期: 新しい方を取り、同じ人生のものなら使ったしるしが残る (順に依らない)', () => {
    const carry = (t: string): SoulCarry => ({ traits: [t], from: 'A' });
    const p = (soul: Progress['soul']): Progress => ({ ...newProgress(), soul });
    const old = p({ at: 1, lifeId: '1', name: 'A', world: 'medieval', carry: carry('sk.sword') });
    const neu = p({ at: 2, lifeId: '2', name: 'B', world: 'medieval', carry: carry('sk.cook') });
    expect(mergeProgress(old, neu).soul?.lifeId).toBe('2');
    expect(mergeProgress(neu, old)).toEqual(mergeProgress(old, neu));
    const used = p({ ...old.soul!, used: true });
    expect(mergeProgress(old, used).soul?.used).toBe(true);
    expect(mergeProgress(used, old)).toEqual(mergeProgress(old, used));
    saveProgress(mergeProgress(old, used));
    expect(pendingSoul()).toBeNull();
  });

  it('何回も試す (trials) は元の setup で生き直すので、引き継ぎを使わない', () => {
    const h = born(5, { traits: ['sk.sword'], from: 'A' });
    const trial = createHero({ ...h.setup, seed: 6 });
    expect(trial.soul).toBeUndefined();
  });
});
