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
    const r = runTrials({ seed: 3, world: { preset: 'medieval' }, hero: { race: 'human', cheat: 'immortal_body', arrival: 'reborn' } }, 60, undefined, 150);
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
  // 機械の速さで揺れるので、幅は倍に取る
  it('1000回が数秒で終わる', () => {
    const t0 = performance.now();
    runTrials(setup('human'), 1000);
    // 実測 (2026-10-09, M3 Max): 英雄の筋・人物像・転生者を入れる前 353ms、入れた後 798ms。GitHub Actions の機械はおよそ3倍遅い。
    // 手元の上限は今の倍ほどにして、重くなったらここで気づけるようにする
    expect(performance.now() - t0).toBeLessThan((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CI ? 6000 : 1600);
  }, 20_000);
});

// 実測 (2026-10-09, 中世欧州風・平民・1000回): 人間 平均31.1 最長98 / エルフ 平均66.0 最長593 (200歳到達 9.3%、500歳 0.4%) / ゴブリン 平均10.9 最長30。
// エルフは子ども期が100年あり、そのあいだ ch × E(0.4) で亡くなるので中央値は人間と変わらない。長く生きる個体がいることで平均が伸びる
describe('種族で寿命が変わる', () => {
  const human = runTrials(setup('human'), 1000);
  it('エルフは人間より平均享年が大きく、300歳を越える個体がいる', () => {
    const elf = runTrials(setup('elf'), 1000);
    expect(elf.mean).toBeGreaterThan(human.mean * 1.5);
    expect(elf.max).toBeGreaterThan(300);
    expect(elf.reach[200]).toBeGreaterThan(0.03);
  }, 30_000);
  it('ゴブリンは人間より短い', () => {
    const gob = runTrials(setup('goblin'), 1000);
    expect(gob.mean).toBeLessThan(human.mean * 0.6);
    expect(gob.max).toBeLessThanOrEqual(45); // 種族の上限
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
