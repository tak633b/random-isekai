import { describe, it, expect } from 'vitest';
import { runTrials, REACH_AGES, trialAdd, trialFinish, trialStart } from './trials';
import { createHero } from './hero';
import { liveOut } from './life';
import { trialSeed } from './trials';
import { HAZARDS } from './mortality';
import type { CheatId, RaceId, Setup } from './types';

const setup = (race: RaceId, cheat: CheatId | 'none' = 'none', arrival: 'native' | 'reborn' = 'native'): Setup =>
  ({ seed: 11, world: { preset: 'medieval' }, hero: { race, status: 'commoner', cheat, arrival } });

describe('集計の形', () => {
  it('死因の内訳の合計は1、到達割合は年齢で減る', () => {
    const r = runTrials({ seed: 3, world: { preset: 'random' }, hero: {} }, 300);
    expect(r.n).toBe(300);
    expect(r.ages.length).toBe(300);
    expect(HAZARDS.reduce((s, k) => s + r.byHazard[k], 0)).toBeCloseTo(1, 9);
    for (let i = 1; i < REACH_AGES.length; i++) expect(r.reach[REACH_AGES[i]]).toBeLessThanOrEqual(r.reach[REACH_AGES[i - 1]]);
    expect(r.longest.age).toBe(r.max);
    expect(r.median).toBeGreaterThanOrEqual(r.ages[0]);
    expect(r.median).toBeLessThanOrEqual(r.max);
    expect(r.topCauses.reduce((s, c) => s + c.count, 0)).toBeLessThanOrEqual(300);
  });

  it('上限の年数で打ち切った人は「まだ生きている」に数える', () => {
    // 不死の体の上限は1000歳。打ち切り (150年) を確かめるのはエルフで (人間より若いうちの死が少なく、まだ生きている人が多い)
    const r = runTrials({ seed: 3, world: { preset: 'medieval' }, hero: { race: 'elf', cheat: 'immortal_body', arrival: 'reborn' } }, 60, undefined, 150);
    expect(r.maxYears).toBe(150);
    expect(r.max).toBeLessThanOrEqual(150);
    expect(r.alive).toBe(r.ages.filter((a) => a === 150).length);
    expect(r.alive).toBeGreaterThan(0);
    if (r.alive < r.n) expect(HAZARDS.reduce((s, k) => s + r.byHazard[k], 0)).toBeCloseTo(1, 9);
  });

  it('小分けに足しても (途中で JSON に書いて戻しても) runTrials と同じ集計', () => {
    const whole = runTrials(setup('human'), 120);
    let st = trialStart(setup('human'));
    for (let i = 0; i < 60; i++) trialAdd(st, i);
    st = JSON.parse(JSON.stringify(st));
    for (let i = 119; i >= 60; i--) trialAdd(st, i); // 足す順番は問わない
    expect(trialFinish(st)).toEqual(whole);
  });

  it('同じ設定と seed なら同じ集計', () => {
    expect(runTrials(setup('human'), 100).ages).toEqual(runTrials(setup('human'), 100).ages);
  });

  // 実測 (2026-10-09, 出来事を棄却法で引くようにした後): 中世欧州風・人間で 1000回が 0.28秒、現代 0.45秒、宇宙 0.50秒、エルフ 0.62秒、
  // 不死の体 2.0秒 (上限 1000年で打ち切り、17人がまだ生きている)。
  // 速さ: 300回の試行を、同じ時に回した決まった計算 (乱数の並びを作って並べ替える) と比べる。
  // 全体を並行で回すと絶対時間は 1.5〜2倍に揺れるが (2026-10-09: 単独 347ms・全体の中 545〜809ms)、比はほぼ変わらない (単独 4.7〜4.8・全体の中 4.9)。
  // 上限は比で 10 (今の倍)。2倍重くなればここで落ちる。絶対時間は桁違いに遅くなったときだけ見る
  const ref = (): number => { const a: number[] = []; let x = 1; for (let i = 0; i < 300000; i++) { x = (x * 1103515245 + 12345) % 2147483648; a.push(x); } a.sort((p, q) => p - q); return a[5]; };
  it('300回の試行が十分に速い (決まった計算との比、3度の最小)', () => {
    let best = Infinity, base = Infinity;
    for (let k = 0; k < 3; k++) {
      let t0 = performance.now();
      ref();
      base = Math.min(base, performance.now() - t0);
      t0 = performance.now();
      runTrials(setup('human'), 300);
      best = Math.min(best, performance.now() - t0);
    }
    expect(best / base, `${best.toFixed(0)}ms / ${base.toFixed(0)}ms`).toBeLessThan(10);
    expect(best, `${best.toFixed(0)}ms`).toBeLessThan(5000);
  });
});

// 成人した人だけを見る (乳幼児の死は特典で変わらない部分が大きく、比べたいものが薄まるので)。
// 特典を持つ人は英雄の筋 (arc.ts) に乗って戦う年が増えるので、比べる相手は「死因の倍率を持たない特典」(ステータス偽装) にする。
// 実測 (2026-10-09, 英雄の筋を入れた後, 中世欧州風・転生・1500回):
//   特典なし: 戦い (魔物・暴力・戦・事故) で亡くなるのは成人の1000年あたり 5.42人、病 (病・疫病・出産) の割合 0.202
//   ステータス偽装: 戦い 12.17人 / 1000年 (筋に乗るぶん特典なしの2.2倍)、病の割合 0.154
//   超再生: 戦い 6.80人 / 1000年 (偽装の0.56倍)
//   医療の知識: 病の割合 0.071 (偽装の0.46倍)
describe('転生特典で死因の内訳が変わる', () => {
  const adults = (cheat: CheatId | 'none') => {
    let years = 0, combat = 0, disease = 0, n = 0;
    for (let i = 0; i < 1500; i++) {
      const h = liveOut(createHero({ ...setup('human', cheat, 'reborn'), seed: trialSeed(5, i), auto: true }));
      if (h.age < 16) continue;
      n++; years += h.age - 16;
      const z = h.death!.hazard;
      if (z === 'monster' || z === 'violence' || z === 'war' || z === 'accident') combat++;
      if (z === 'disease' || z === 'plague' || z === 'childbirth') disease++;
    }
    return { combatRate: combat / years, diseaseShare: disease / n };
  };
  const none = adults('hide_status');
  it('超再生は戦いでの死を減らす', () => {
    expect(adults('regeneration').combatRate).toBeLessThan(none.combatRate * 0.8);
  }, 30_000);
  it('医療の知識は病での死の割合を減らす', () => {
    expect(adults('modern_medicine').diseaseShare).toBeLessThan(none.diseaseShare * 0.75);
  }, 30_000);
});
