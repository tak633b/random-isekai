import { describe, it, expect } from 'vitest';
import { createHero } from './hero';
import { advanceYear } from './life';
import { WORLD_IDS } from './worlds';
import { courseOf, deedLine, isReincEntry, reincarnatorLife, reincarnatorsOf, reincarnatorYear, REINC } from './reincarnators';
import { heq, heqOf } from './mortality';
import { raceOf } from './races';
import type { Hero, Setup, WorldId } from './types';

// life.ts の advanceYear が毎年 peopleYear の後に reincarnatorYear を呼ぶ
const setup = (seed: number, preset: WorldId | 'random' = 'random'): Setup => ({ seed, world: { preset }, hero: {}, auto: true });

function live(h: Hero, mode: { on?: boolean; meet?: boolean } = {}, max = 4000): Hero {
  REINC.on = mode.on ?? true; REINC.meet = mode.meet ?? true;
  try { for (let i = 0; i < max && h.alive; i++) advanceYear(h); } finally { REINC.on = true; REINC.meet = true; }
  return h;
}
// 転生者の行を除いた年表
const core = (h: Hero) => JSON.stringify(h.log.filter((e) => !isReincEntry(e)));

describe('名簿', () => {
  it('同じ seed なら同じ', () => {
    for (let s = 1; s <= 30; s++) {
      const a = live(createHero(setup(s)));
      const b = live(createHero(setup(s)));
      expect(JSON.stringify(reincarnatorsOf(b))).toBe(JSON.stringify(reincarnatorsOf(a)));
    }
  });

  it('召喚の盛んな世界は多く、現代・SF・文明の後は少ない', () => {
    const mean = (id: WorldId) => {
      let n = 0;
      for (let s = 1; s <= 100; s++) n += reincarnatorsOf(createHero({ ...setup(s, id), hero: { race: 'human' } })).length;
      return n / 100;
    };
    expect(mean('game')).toBeGreaterThan(mean('modern') * 3);
    expect(mean('medieval')).toBeGreaterThan(mean('postapoc') * 3);
  });

  it('魔王になる人は、魔王のいる世界にしかいない', () => {
    for (let s = 1; s <= 200; s++) {
      for (const id of ['modern', 'space', 'steampunk'] as WorldId[]) {
        expect(reincarnatorsOf(createHero(setup(s, id))).some((p) => p.fate === 'demonlord')).toBe(false);
      }
    }
  });
});

describe('主人公の乱数の並びを変えない', () => {
  it('reincarnatorYear は h.rng を引かない', () => {
    for (let s = 1; s <= 100; s++) {
      const h = createHero(setup(s));
      for (let i = 0; i < 120 && h.alive; i++) {
        advanceYear(h);
        const st = h.rng.state;
        reincarnatorYear(h);
        reincarnatorsOf(h);
        expect(h.rng.state).toBe(st);
      }
    }
  });

  it('会わなければ (噂と訃報だけ)、一生を通して入れない人生と同じ', () => {
    for (let s = 1; s <= 300; s++) {
      const a = live(createHero(setup(s)), { on: false });
      const b = live(createHero(setup(s)), { meet: false });
      expect(b.rng.state).toBe(a.rng.state);
      expect(b.age).toBe(a.age);
      expect(core(b)).toBe(core(a));
    }
  });

  // 会うと輪に人が増え、その人の年取りの生死を h.rng で引くので、会った年から後は変わりうる
  it('最初に会う年までは、入れない人生と年ごとに同じ', () => {
    let met = 0;
    for (let s = 1; s <= 300; s++) {
      const a = createHero(setup(s));
      const b = createHero(setup(s));
      for (let i = 0; i < 400 && a.alive; i++) {
        REINC.on = false; advanceYear(a); REINC.on = true;
        advanceYear(b);
        if (reincarnatorsOf(b).some((p) => p.tieId !== undefined)) { met++; break; }
        expect(b.rng.state).toBe(a.rng.state);
        expect(core(b)).toBe(core(a));
      }
    }
    expect(met).toBeGreaterThan(0);
  });
});

describe('会った転生者', () => {
  it('tieId は輪に実在し、名前と種族が合う', () => {
    let n = 0;
    for (let s = 1; s <= 300; s++) {
      const h = live(createHero(setup(s, 'game')));
      for (const p of reincarnatorsOf(h).filter((x) => x.tieId !== undefined)) {
        const t = h.people.find((x) => x.id === p.tieId);
        expect(t).toBeTruthy();
        expect(t!.name).toBe(p.name);
        expect(t!.race).toBe(p.race);
        n++;
      }
    }
    expect(n).toBeGreaterThan(0);
  });

  // 実測 (2026-10-09, 世界ごと seed 1〜300, おまかせの主人公, 人間換算16歳まで生きた人生, 会うのは多くて2人・特典なしは会う確率 0.3倍):
  // 1人の人生で会う転生者の数の平均 academy 0.72、game 0.69、medieval 0.58、xianxia 0.58、wa 0.52、space 0.49、frontier 0.49、
  //   ocean 0.43、dark 0.39、desert 0.39、modern 0.34、steampunk 0.31、myth 0.30、beast 0.27、cyberpunk 0.22、postapoc 0.12
  // 宇宙は名簿が少ないが寿命が長い (e0 85) ので、会う年数が多い
  it('1人の人生で会うのは0〜2人、行は数件', () => {
    for (const id of WORLD_IDS) {
      let met = 0, lines = 0, adults = 0;
      for (let s = 1; s <= 100; s++) {
        const h = live(createHero(setup(s * 7919, id)));
        if (heqOf(h) < 16) continue;
        adults++;
        const m = reincarnatorsOf(h).filter((p) => p.tieId !== undefined).length;
        expect(m).toBeLessThanOrEqual(2);
        met += m;
        lines += h.log.filter(isReincEntry).length;
      }
      expect(met / adults, id).toBeLessThan(1.2);
      expect(lines / adults, id).toBeLessThan(6);
    }
  }, 120_000);
});

describe('その人の一生 (reincarnatorLife)', () => {
  const find = (fate: string, n: number) => {
    const out: [Hero, number][] = [];
    for (let s = 1; s <= 400 && out.length < n; s++) {
      const h = live(createHero(setup(s, 'game')), {}, 30);
      const p = reincarnatorsOf(h).find((x) => x.fate === fate && x.bornAt > -50);
      if (p) out.push([h, p.id]);
    }
    return out;
  };

  // 生まれ直した人は人間換算30歳まで、召喚された人は来てから5年ほどで (来た年齢は15〜35歳)
  it('early は若くして、筋の年に亡くなる', () => {
    for (const [h, id] of find('early', 15)) {
      const life = reincarnatorLife(h, id);
      const c = courseOf(h, reincarnatorsOf(h).find((p) => p.id === id)!);
      expect(life.ageAtDeath).toBe(c.ageAtDeath);
      expect(heq(life.ageAtDeath!, raceOf(life.race))).toBeLessThanOrEqual(42);
    }
  }, 60_000);

  it('demonlord は魔王を名乗った記録があり、討たれて亡くなる', () => {
    for (const [h, id] of find('demonlord', 10)) {
      const life = reincarnatorLife(h, id);
      expect(life.log.some((e) => e.text.includes('を名乗った'))).toBe(true);
      expect(life.death?.text).toContain('討たれた');
      expect(life.diedAt).toBe(courseOf(h, reincarnatorsOf(h).find((p) => p.id === id)!).diedAt);
    }
  }, 60_000);

  it('hero は手柄の記録があり、その年まで生きる', () => {
    for (const [h, id] of find('hero', 10)) {
      const life = reincarnatorLife(h, id);
      expect(life.log.some((e) => e.text === deedLine(h, reincarnatorsOf(h).find((p) => p.id === id)!))).toBe(true); // 手柄の言い回しは名簿の中で替わる (deedLine)
      const c = courseOf(h, reincarnatorsOf(h).find((p) => p.id === id)!);
      expect(life.diedAt ?? Infinity).toBeGreaterThanOrEqual(c.deedAt!);
    }
  }, 60_000);

  it('会った人の一生には、出会いの記録が入る', () => {
    let n = 0;
    for (let s = 1; s <= 300 && n < 5; s++) {
      const h = live(createHero(setup(s, 'game')));
      const p = reincarnatorsOf(h).find((x) => x.tieId !== undefined);
      if (!p) continue;
      expect(reincarnatorLife(h, p.id).log.some((e) => e.text.includes(`${h.given}と出会った`))).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThan(0);
  }, 60_000);
});

describe('名簿の文と名前', () => {
  it('1つの名簿の中で、手柄の文と前世の一文 (年齢・仕事・死に方) が重ならない。名前は2文字以上', async () => {
    const { deedLine } = await import('./reincarnators');
    let deeds = 0, people = 0;
    for (const w of WORLD_IDS) for (let s = 1; s <= 25; s++) {
      const h = createHero(setup(s * 17, w));
      const roster = reincarnatorsOf(h);
      const lines = roster.map((p) => deedLine(h, p)).filter(Boolean);
      expect(new Set(lines).size, `${w} ${s} 手柄`).toBe(lines.length);
      const pasts = roster.map((p) => `${p.past.age}|${p.past.job.ja}|${p.past.cause}`);
      expect(new Set(pasts).size, `${w} ${s} 前世`).toBe(pasts.length);
      for (const p of roster) expect([...p.name.replace(/[・\s]/g, '')].length, `${w} ${p.name}`).toBeGreaterThanOrEqual(2);
      deeds += lines.length; people += roster.length;
    }
    expect(deeds).toBeGreaterThan(100);
    expect(people).toBeGreaterThan(500);
  });
});
