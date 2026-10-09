// 同じ設定で何回も生きる (DESIGN 6節)。選ばなかった項目を埋めた後の設定 (Hero.setup) を固定し、seed だけ変える。
// 1000回が1〜2秒で終わるよう、ループの中では人生を進める以外のことをしない
import type { Hazard, Policy, Setup } from './types';
import { createHero } from './hero';
import { liveOut } from './life';
import { END_KINDS } from './mortality';

export const REACH_AGES = [20, 40, 60, 80, 100, 200, 500];

export interface TrialResult {
  n: number;
  alive: number;                     // 上限の年数 (maxYears) を生きても、まだ亡くなっていない人 (不老・不死の特典)
  maxYears: number;
  ages: number[];                    // 享年 (小さい順)。まだ生きている人は打ち切った時の年齢で入る
  mean: number;
  median: number;
  max: number;
  reach: Record<number, number>;     // その年齢まで生きた割合
  byHazard: Record<Hazard, number>;  // 亡くなった人の死因の分類の割合 (合計 1。まだ生きている人は数えない)
  topCauses: { label: string; count: number }[];
  longest: { seed: number; age: number };
}

// i 回目の seed。元の seed から素数の歩幅で離す (近い seed どうしの乱数の並びが似ないように)
export const trialSeed = (seed: number, i: number) => (seed + i * 2654435761) >>> 0;

// maxYears: 1人あたり何年まで進めるか。不老・不死の人生は数千年続くことがあり、集計が止まって見えるので打ち切る
export const TRIAL_MAX_YEARS = 1000;

// 小分けに回すための途中の状態 (画面が1フレームに数十人ずつ足していけるように)。JSON にそのまま書ける
export interface TrialState {
  fixed: Setup;                      // 埋めた後の設定 (seed だけ変えて生き直す)
  maxYears: number;
  ages: number[];                    // 足した順
  hz: Record<Hazard, number>;        // 死因の分類ごとの人数
  causes: Record<string, number>;    // 死因の短い名ごとの人数
  alive: number;
  longest: { seed: number; age: number };
}

export function trialStart(setup: Setup, policy?: Policy, maxYears = TRIAL_MAX_YEARS): TrialState {
  return {
    fixed: { ...createHero(setup).setup, auto: true, ...(policy ? { policy } : {}) },
    maxYears, ages: [], hz: Object.fromEntries(END_KINDS.map((k) => [k, 0])) as Record<Hazard, number>, causes: {}, alive: 0,
    longest: { seed: setup.seed, age: -1 },
  };
}

// i 番目の人生を1つ生きて足す。同じ i なら何度足しても同じ人生 (足す順番は問わない)
export function trialAdd(st: TrialState, i: number): void {
  const seed = trialSeed(st.fixed.seed, i);
  const h = createHero({ ...st.fixed, seed });
  liveOut(h, Math.max(0, st.maxYears - h.age));
  st.ages.push(h.age);
  if (h.alive) st.alive++;
  if (h.death) {
    st.hz[h.death.hazard]++;
    st.causes[h.death.label] = (st.causes[h.death.label] ?? 0) + 1;
  }
  // 同じ年齢なら seed の小さい方 (足す順番で結果が変わらないように)
  if (h.age > st.longest.age || (h.age === st.longest.age && seed < st.longest.seed)) st.longest = { seed, age: h.age };
}

// ここまでに足した人数で集計する。途中で呼んでもよい (状態は変えない)
export function trialFinish(st: TrialState): TrialResult {
  const n = st.ages.length;
  const ages = [...st.ages].sort((a, b) => a - b);
  const dead = END_KINDS.reduce((s, k) => s + st.hz[k], 0);
  const byHazard = Object.fromEntries(END_KINDS.map((k) => [k, dead ? st.hz[k] / dead : 0])) as Record<Hazard, number>;
  const reach: Record<number, number> = {};
  for (const x of REACH_AGES) reach[x] = n ? ages.filter((a) => a >= x).length / n : 0;
  return {
    n, alive: st.alive, maxYears: st.maxYears, ages,
    mean: n ? ages.reduce((s, a) => s + a, 0) / n : 0,
    median: n ? (n % 2 ? ages[(n - 1) / 2] : (ages[n / 2 - 1] + ages[n / 2]) / 2) : 0,
    max: n ? ages[n - 1] : 0,
    reach,
    byHazard,
    topCauses: Object.entries(st.causes).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1)).slice(0, 10),
    longest: { ...st.longest },
  };
}

export function runTrials(setup: Setup, n: number, policy?: Policy, maxYears = TRIAL_MAX_YEARS): TrialResult {
  const st = trialStart(setup, policy, maxYears);
  for (let i = 0; i < n; i++) trialAdd(st, i);
  return trialFinish(st);
}
