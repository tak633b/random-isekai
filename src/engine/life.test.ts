import { describe, it, expect } from 'vitest';
import { WORLD_IDS, WORLDS, TABLE_E0 } from './worlds';
import { createHero } from './hero';
import { advanceYear, fromSaved, liveOut, toSaved } from './life';
import type { JobId, Setup, WorldId } from './types';

const plain = (seed: number, preset: WorldId): Setup =>
  ({ seed, world: { preset }, hero: { race: 'human', status: 'commoner', cheat: 'none', arrival: 'native', traits: [], points: {} }, auto: true });

// 特典なし・平民・人間・現地の生まれ・自動で生きた人生の平均享年 (死んだ年 + 0.5) を、research/03 5-3節の e0 と比べる。
// 戦争・疫病・飢饉・出産・職業・出来事の危険は別に引くので、その見込みを基準から割り戻してある (mortality.ts の deflate)。
// 実測 (2026-10-09, 3000人, seed = s × 7919。親の出来事の条件・仙侠の修行の老化を入れた後): 差は -1.5 (academy) 〜 +1.5 (xianxia)、
// dark +1.2、myth +1.0、ほかは ±0.7以内。xianxia は修行の段階で老いが遅くなる人がいるぶん長い。
// academy は 1500人では -3.1 だった。seed の組を変えると -1.9 と +0.3 で、1組の揺れが ±1年ほどある (享年の標準偏差が 30年前後あるため)。
// 許容幅 = 1.5 + 2.5 × 標本誤差。1.5 は割り戻しの見積もりの粗さ (出来事の能力の増減や、しるしで絞られる出来事を見ていない)、
// 2.5 × 標本誤差は乱数の並びによる揺れ。3000人で標本誤差は 0.5〜0.6年なので、幅はおよそ DESIGN 2節のねらいの ±3年になる
const N = 3000;
describe('自動で生きた人生の平均享年が、世界の表の e0 に近い', () => {
  for (const id of WORLD_IDS) {
    it(id, () => {
      const ages: number[] = [];
      let u5 = 0;
      for (let s = 1; s <= N; s++) {
        const h = liveOut(createHero(plain(s * 7919, id)));
        ages.push(h.age + 0.5);
        if (h.age < 5) u5++;
      }
      const mean = ages.reduce((a, b) => a + b, 0) / N;
      const sd = Math.sqrt(ages.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
      expect(Math.abs(mean - TABLE_E0[id]), `平均 ${mean.toFixed(1)}`).toBeLessThan(1.5 + 2.5 * sd / Math.sqrt(N));
      // 5歳までに亡くなる割合と q5。実測 (3000人): 差は -0.018 (postapoc) 〜 +0.001 (game ほか)。1500人では -0.027 (xianxia) まで出た。
      // 疫病・飢饉の年の死を割り戻したぶん、平時の年はわずかに低く出る。許容幅は 0.015 + 2.5 × 標本誤差
      const q5 = WORLDS[id].q5;
      expect(Math.abs(u5 / N - q5), `5歳未満 ${(u5 / N).toFixed(3)}`).toBeLessThan(0.015 + 2.5 * Math.sqrt(q5 * (1 - q5) / N));
    }, 60_000);
  }
});

// 成人した後に職業を決め打ちして、死因の分類のうち魔物の割合を比べる。
// 実測 (2026-10-09, 中世欧州風・人間・平民の男, 成人まで生きた 836人): 農民 0.051、冒険者 0.458 (9倍)
describe('冒険者は農民より魔物で亡くなる割合が大きい', () => {
  it('中世欧州風', () => {
    const share = (job: JobId) => {
      let monster = 0, n = 0;
      for (let s = 1; s <= 1500; s++) {
        const h = createHero({ ...plain(s * 104729, 'medieval'), hero: { race: 'human', status: 'commoner', cheat: 'none', arrival: 'native', sex: 'M' } });
        while (h.alive && h.flags.adult === undefined) advanceYear(h);
        if (!h.alive) continue;
        h.job = job;
        liveOut(h);
        n++;
        if (h.death!.hazard === 'monster') monster++;
      }
      return monster / n;
    };
    const farmer = share('farmer'), adv = share('adventurer');
    expect(adv).toBeGreaterThan(farmer * 3);
    expect(adv).toBeGreaterThan(0.25);
  }, 60_000);
});

describe('同じ seed からは同じ人生', () => {
  it('おまかせの設定でもログが一致する', () => {
    const s: Setup = { seed: 42, world: { preset: 'random' }, hero: {}, auto: true };
    expect(liveOut(createHero(s)).log).toEqual(liveOut(createHero(s)).log);
  });
  it('埋めた後の設定 (hero.setup) で生き直しても同じ人生になる', () => {
    const a = createHero({ seed: 99, world: { preset: 'random' }, hero: {}, auto: true });
    const b = createHero(a.setup);
    expect(b.name).toBe(a.name); // 名字も消えない
    expect(liveOut(b).log).toEqual(liveOut(a).log);
  });
  it('名字のある身分で、選んだ名に家名が付く', () => {
    const a = createHero({ seed: 99, world: { preset: 'wa' }, hero: { status: 'noble' }, auto: true });
    const b = createHero(a.setup);
    expect(a.name).not.toBe(a.given);
    expect(b.name).toBe(a.name);
  });
});

describe('前世の年齢と死に方', () => {
  it('老衰は60歳から、過労は22〜60歳、学生の前世はその年齢、召喚は今の年齢', () => {
    for (let s = 1; s <= 600; s++) {
      const h = createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true });
      const p = h.past;
      if (!p) continue;
      if (h.arrival === 'summoned') { expect(p.age).toBe(h.age); continue; }
      if (p.cause === 'old') expect(p.age).toBeGreaterThanOrEqual(60);
      if (p.cause === 'overwork') { expect(p.age).toBeGreaterThanOrEqual(22); expect(p.age).toBeLessThanOrEqual(60); }
      if (p.job.ja === '高校生') expect(p.age).toBeLessThanOrEqual(18);
      if (p.job.ja === '年金暮らし') expect(p.age).toBeGreaterThanOrEqual(65);
    }
  });
});

describe('途中で保存して再開しても同じ人生になる', () => {
  for (const preset of ['medieval', 'space', 'game'] as const) {
    it(`${preset}: 30歳で保存・復元したあとのログが一致する`, () => {
      // 30歳まで生きる seed を探す (中世では半分ほどが30歳までに亡くなる)
      let a = createHero({ seed: 7, world: { preset }, hero: { race: 'human' }, auto: true });
      for (let s = 7; ; s++) {
        a = createHero({ seed: s, world: { preset }, hero: { race: 'human' }, auto: true });
        while (a.alive && a.age < 30) advanceYear(a);
        if (a.alive) break;
      }
      const b = fromSaved(JSON.parse(JSON.stringify(toSaved(a))));
      liveOut(a);
      liveOut(b);
      expect(b.log).toEqual(a.log);
      expect(b.age).toBe(a.age);
      expect(b.people).toEqual(a.people);
    });
  }
});

describe('選択を待つ', () => {
  it('自動でない人生は、職業選びの選択で止まる', () => {
    const h = createHero({ seed: 3, world: { preset: 'modern' }, hero: { race: 'human', status: 'commoner', arrival: 'native' } });
    while (h.alive && !h.pending.length && h.age < 40) advanceYear(h);
    expect(h.pending.length).toBeGreaterThan(0);
    const age = h.age;
    advanceYear(h);
    expect(h.age).toBe(age); // 選ぶまで進まない
    // 保存しても待っている選択は戻る
    const back = fromSaved(JSON.parse(JSON.stringify(toSaved(h))));
    expect(back.pending.map((d) => d.ref)).toEqual(h.pending.map((d) => d.ref));
  });
});
