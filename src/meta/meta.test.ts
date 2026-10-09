import { beforeEach, describe, expect, it } from 'vitest';
import { createHero, liveOut } from '../engine';
import type { Hero } from '../engine/types';
import { continueAs, heirsOf } from '../engine/lineage';
import { enemyKinds } from '../ui/enemy';
import { BESTIARY_TEXT } from '../data/bestiary';
import { devGrant, loadProgress, newProgress, PROGRESS_KEY, resetProgress, saveProgress, setStorage, type KV } from './store';
import { factsOf, lifeIdOf } from './facts';
import { grantLife, ticketsFor, TICKETS_MAX_PER_LIFE } from './tickets';
import { canUnlock, CUSTOM, FREE, isUnlocked, priceOf, PRICES, unlock, unlockBlock, unlockedChoices } from './unlocks';
import { BESTIARY, bestiaryByWorld, foeKindOf } from './bestiary';
import { ENCOUNTERS } from './encounters';
import { playLives } from './sim';
import type { UnlockKey } from './types';

class Mem implements KV {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
class Broken implements KV {
  getItem(): string | null { throw new Error('denied'); }
  setItem(): void { throw new Error('quota'); }
}

const life = (seed: number): Hero => liveOut(createHero({ seed, world: { preset: 'random' }, hero: {}, auto: true }));
// 最後まで生きた人生 (おまかせ)
const lives = new Map<number, Hero>();
const dead = (seed: number) => { let h = lives.get(seed); if (!h) { h = life(seed); lives.set(seed, h); } return h; };

beforeEach(() => { setStorage(new Mem()); });

describe('記録の置き場所', () => {
  it('書いたものを読み直せる (版つきの1つの鍵)', () => {
    const kv = new Mem();
    setStorage(kv);
    devGrant(3);
    expect([...kv.m.keys()]).toEqual([PROGRESS_KEY]);
    expect(JSON.parse(kv.m.get(PROGRESS_KEY)!).v).toBe(1);
    setStorage(kv); // 読み直す
    expect(loadProgress().tickets).toBe(3);
  });

  it('ストレージが使えなくてもメモリの中で動く', () => {
    setStorage(new Broken());
    expect(loadProgress().tickets).toBe(0);
    expect(devGrant(12)).toBe(12);
    expect(unlock(CUSTOM)).toBe(true);
    expect(loadProgress().tickets).toBe(2);
    setStorage(null);
    expect(devGrant(1)).toBe(1);
  });

  it('壊れた値・違う版は捨てて新しく始める', () => {
    for (const bad of ['{', 'null', '[]', '"x"', JSON.stringify({ v: 2, tickets: 99 }), JSON.stringify({ tickets: 99 })]) {
      const kv = new Mem();
      kv.setItem(PROGRESS_KEY, bad);
      setStorage(kv);
      expect(loadProgress()).toEqual(newProgress());
    }
  });

  it('欠けた項目は埋め、おかしな値は直す', () => {
    const kv = new Mem();
    kv.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, tickets: -5, granted: ['a', 3], totals: { lives: 'x', years: 7 } }));
    setStorage(kv);
    const p = loadProgress();
    expect(p.tickets).toBe(0);
    expect(p.granted).toEqual(['a']);
    expect(p.totals.lives).toBe(0);
    expect(p.totals.years).toBe(7);
    expect(p.bestiary).toEqual({});
  });
});

describe('チケット', () => {
  it('おまかせで最後まで生きると1〜上限枚、二度は出ない', () => {
    const h = dead(1);
    const r = grantLife(h, true);
    expect(r.already).toBe(false);
    expect(r.tickets.gain).toBeGreaterThanOrEqual(1);
    expect(r.tickets.gain).toBeLessThanOrEqual(TICKETS_MAX_PER_LIFE);
    expect(r.tickets.parts.reduce((s, x) => s + x.n, 0)).toBe(r.tickets.gain);
    const after = loadProgress();
    expect(after.granted).toContain(lifeIdOf(h));
    expect(after.totals.lives).toBe(1);
    const again = grantLife(h, true);
    expect(again.already).toBe(true);
    expect(loadProgress()).toEqual(after);
  });

  it('設定した人生と、生きている途中の人生は0枚', () => {
    expect(grantLife(dead(2), false).tickets.gain).toBe(0);
    const alive = createHero({ seed: 3, world: { preset: 'random' }, hero: {}, auto: true });
    const r = grantLife(alive, true);
    expect(r.tickets.gain).toBe(0);
    expect(loadProgress().granted).toEqual([lifeIdOf(dead(2))]);
  });

  it('おまかせの人生を続けて10枚に届くのは平均4〜6人目 (1人目では届かない)', () => {
    const need: number[] = [];
    let first = 0;
    for (let b = 1; b <= 20; b++) {
      let k = 0;
      playLives(700 + b, 15, { onLife: (r, _h, i) => { if (i === 0) first = Math.max(first, r.ticketsNow); if (!k && r.ticketsNow >= 10) k = i + 1; } });
      need.push(k || 99);
    }
    // 測った値 (2026-10-09, 20人): 平均 4.50、最小 3、最大 7。1人目は多くて5枚
    const avg = need.reduce((s, x) => s + x, 0) / need.length;
    expect(first).toBeLessThan(10);
    expect(avg).toBeGreaterThanOrEqual(4);
    expect(avg).toBeLessThanOrEqual(6);
    setStorage(new Mem());
  });

  it('代を継いだ人生は別の id で、おまかせのまま精算できる', () => {
    let h: Hero | undefined;
    for (let s = 1; s < 80 && !h; s++) { const keys = heirsOf(dead(s)); if (keys.length) h = liveOut(continueAs(dead(s), keys[0])); }
    expect(h).toBeDefined();
    expect(lifeIdOf(h!)).toMatch(/^\d+\/[tr]:\d+$/);
    expect(factsOf(h!, true).gen).toBe(2);
    expect(grantLife(h!, true).tickets.gain).toBeGreaterThan(0);
  });
});

describe('事実の数え方', () => {
  it('戦いで倒れた年は1回だけ数える (死亡の記録の行は除く)', () => {
    let h: Hero | undefined;
    for (let s = 1; s < 400 && !h; s++) if (dead(s).log.some((e) => e.kind === 'death' && e.fight)) h = dead(s);
    expect(h).toBeDefined();
    const rows = h!.log.filter((e) => e.fight && e.kind !== 'death');
    expect(factsOf(h!, true).foesMet).toBe(rows.length);
    expect(factsOf(h!, true).foesLost).toBe(rows.filter((e) => e.fight!.result === 'lose').length);
  });

  it('続けた主人公は、続けてからのぶんだけ数える', () => {
    let n = 0;
    for (let s = 1; s < 120 && n < 5; s++) {
      const keys = heirsOf(dead(s));
      if (!keys.length) continue;
      n++;
      const start = continueAs(dead(s), keys[0]);
      const at = factsOf(start, true); // 続けた直後: まだ何もしていない
      expect(at.foesMet).toBe(0);
      expect(at.marriages + at.children).toBe(0);
      expect(at.flags).toEqual([]);
      expect(at.startAge).toBeUndefined();
    }
    expect(n).toBe(5);
  });
});

describe('1000人のおまかせの人生', () => {
  it('世界ごとの1人あたりのチケット', () => {
    const per: Record<string, number[]> = {};
    playLives(1, 1000, { onLife: (r) => (per[r.facts.world] ??= []).push(r.tickets.gain) });
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    // 測った値 (2026-10-09, 初めての世界の加算を外す前): 全体 2.19、世界ごと 1.79 (神話) 〜 2.64 (宇宙)
    expect(Object.keys(per).length).toBe(16);
    for (const [w, xs] of Object.entries(per)) {
      expect(avg(xs), w).toBeGreaterThan(1.3);
      expect(avg(xs), w).toBeLessThan(3.2);
    }
    expect(avg(Object.values(per).flat())).toBeGreaterThan(1.6);
    expect(avg(Object.values(per).flat())).toBeLessThan(2.8);
    setStorage(new Mem());
  });
});

describe('解放', () => {
  it('最初は設定して転生が閉じていて、10枚で開く', () => {
    expect(priceOf(CUSTOM)).toBe(10);
    expect(isUnlocked('world:medieval')).toBe(false);
    devGrant(9);
    expect(unlockBlock(CUSTOM)).toBe('tickets');
    expect(unlockBlock('world:dark')).toBe('locked');
    devGrant(1);
    expect(unlock(CUSTOM)).toBe(true);
    expect(loadProgress().tickets).toBe(0);
    for (const k of FREE) expect(isUnlocked(k)).toBe(true);
    expect(unlockBlock(CUSTOM)).toBe('owned');
  });

  it('使うとチケットが減り、見たものは半額 (切り上げ)', () => {
    devGrant(30);
    unlock(CUSTOM);
    const key: UnlockKey = 'cheat:immortal_body';
    expect(priceOf(key)).toBe(10);
    saveProgress({ ...loadProgress(), seen: [key] });
    expect(priceOf(key)).toBe(5);
    expect(unlock(key)).toBe(true);
    expect(loadProgress().tickets).toBe(15);
    expect(unlock(key)).toBe(false);
    expect(canUnlock('nope:x' as UnlockKey)).toBe(false);
  });

  it('値段の表: 全部1以上 (無料を除く)、特典の上位は8以上', () => {
    for (const [k, v] of Object.entries(PRICES)) if (!FREE.includes(k as UnlockKey)) expect(v, k).toBeGreaterThanOrEqual(1);
    expect(PRICES['cheat:immortal_body']).toBeGreaterThanOrEqual(8);
    expect(FREE.filter((k) => k.startsWith('trait:')).length).toBeGreaterThan(4);
  });

  it('おまかせで引く範囲は解放したものだけ', () => {
    devGrant(20);
    unlock(CUSTOM);
    unlock('race:elf');
    const c = unlockedChoices('medieval', 'human');
    expect(c.worlds).toEqual(['medieval']);
    expect(c.races).toEqual(['human', 'elf']);
    expect(c.cheats).toEqual([]);
    expect(c.startAges).toEqual(['birth']);
    expect(c.traits.length).toBeGreaterThan(0);
    expect(unlockedChoices('space', 'human').races).toEqual(['human']); // エルフは宇宙に生まれない
  });

  it('おまかせの人生で見たものに印が付く', () => {
    const h = dead(5);
    grantLife(h, true);
    expect(loadProgress().seen).toContain(`world:${h.world.id}`);
    expect(loadProgress().seen).toContain(`race:${h.race}`);
  });
});

describe('図鑑', () => {
  it('すべての姿に項目と文がある', () => {
    for (const id of enemyKinds()) {
      expect(BESTIARY_TEXT[id], id).toBeDefined();
      const e = BESTIARY.find((b) => b.id === id)!;
      expect(e.worlds.length, id).toBeGreaterThan(0);
      expect(e.danger).toBeGreaterThanOrEqual(1);
      expect(e.danger).toBeLessThanOrEqual(5);
    }
    expect(Object.keys(BESTIARY_TEXT).sort()).toEqual([...enemyKinds()].sort());
    for (const n of Object.values(bestiaryByWorld())) expect(n).toBeGreaterThanOrEqual(8);
  });

  it('出会った姿は戦いの場面と同じ式で決まり、記録に入る', () => {
    let h: Hero | undefined;
    for (let s = 1; s < 60 && !h; s++) if (dead(s).log.some((e) => e.fight)) h = dead(s);
    const f = factsOf(h!, true);
    const kinds = h!.log.filter((e) => e.fight).map((e) => foeKindOf(h!, e));
    expect(new Set(f.foeKinds)).toEqual(new Set(kinds));
    const r = grantLife(h!, true);
    expect(new Set(r.bestiary)).toEqual(new Set(f.foeKinds));
    for (const k of f.foeKinds) expect(loadProgress().bestiary[k].met).toBe(1);
  });

  it('出会い図鑑: しるしと転生者の筋で数える', () => {
    expect(new Set(ENCOUNTERS.map((e) => e.id)).size).toBe(ENCOUNTERS.length);
    const h = dead(6);
    const marked = { ...h, flags: { ...h.flags, 'enc.dragon': 30 } } as Hero;
    expect(factsOf(marked, true).encounters).toContain('dragon');
    let met: Hero | undefined;
    for (let s = 1; s < 300 && !met; s++) if ((dead(s).reinc?.met.length ?? 0) > 0) met = dead(s);
    expect(factsOf(met!, true).encounters.some((id) => id.startsWith('reinc_'))).toBe(true);
  });
});

describe('ほかの片付け', () => {
  it('resetProgress で空に戻る', () => {
    devGrant(5);
    resetProgress();
    expect(loadProgress()).toEqual(newProgress());
  });
});
