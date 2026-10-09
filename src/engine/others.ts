// ほかの人の一生と、世界の年ごとの様子。
// 輪の人の一生は、エンジン (createHero / advanceYear) でその人を主人公として生き直して作る。そのため、その世界の死亡率と出来事に従う。
// 主人公の年表と食い違わないよう、分かっていること (生年・家族・連れ合いの期間・子・亡くなった年と死因・共有した出来事・職業) を
// 錨 (Setup.anchors、engine/anchor.ts) としてエンジンに渡す。乱数はその人の seed で、主人公の rng には触れない。
// 一生は保存しない (同じ主人公からは毎回同じものが作れる)
import type { Anchors, Arrival, CheatId, Hazard, Hero, JobId, OtherLife, PastLife, RaceId, Setup, Sex, Status, Tie, WorldYear } from './types';
import { makeRng, type Rng } from './rng';
import { createHero } from './hero';
import { LIVE } from './anchor';
import { demonKingWorld } from './worlds';
import { famineP, heq, plagueP, warStartP, WAR_MEAN_YEARS } from './mortality';
import { personName } from './names';
import { raceOf } from './races';
import { hazardName } from './why';
import { L } from '../i18n';

// ---- 世界の年ごとの様子 -----------------------------------------------------

const decode = (at: number, c: string): WorldYear => {
  const v = parseInt(c, 16) || 0;
  return { at, war: !!(v & 1), plague: !!(v & 2), famine: !!(v & 4), demonKing: !!(v & 8) };
};

interface Sim { war: number; plague: number; famine: number; demonKing: boolean }

// 世界の確率 (life.ts の stepWorld と同じ式) で1年進める。横の乱数で
function simYear(r: Rng, h: Hero, s: Sim): void {
  const w = h.world;
  if (s.war > 0) s.war--; else if (r() < warStartP(w)) s.war = 1 + Math.floor(r() * (WAR_MEAN_YEARS * 2 - 1));
  const k = s.war > 0 ? 2 : 1;
  if (s.plague > 0) s.plague--; else if (r() < plagueP(w) * k) s.plague = 1;
  if (s.famine > 0) s.famine--; else if (r() < famineP(w) * k) s.famine = r() < 0.5 ? 2 : 1;
  if (demonKingWorld(w)) { if (!s.demonKing) { if (r() < 0.005) s.demonKing = true; } else if (r() < 0.05) s.demonKing = false; }
}
const yearOf = (at: number, s: Sim): WorldYear => ({ at, war: s.war > 0, plague: s.plague > 0, famine: s.famine > 0, demonKing: s.demonKing });

const hash = (...xs: (number | string)[]) => {
  let x = 0x811c9dc5;
  for (const v of xs) for (const ch of String(v)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  return x >>> 0;
};

// 亡くなった後 (か今より後): 最後の年の様子から、横の乱数で世界の確率に従って延ばす
function extend(h: Hero, last: WorldYear, after: number): WorldYear[] {
  const r2 = makeRng(hash(h.seed, 'after'));
  const t: Sim = { war: last.war ? 1 : 0, plague: 0, famine: 0, demonKing: last.demonKing };
  const later: WorldYear[] = [];
  for (let at = last.at + 1; at <= last.at + after; at++) { simYear(r2, h, t); later.push(yearOf(at, t)); }
  return later;
}

// 主人公が生きた年の世界の様子。年ごとの記録 (Hero.worldHist) があればそれを、古いセーブなら同じ設定で辿り直して得る
function livedYears(h: Hero): { start: number; hist: string } {
  const start = h.log[0]?.age ?? 0;
  if (h.worldHist && h.worldHist.length) return { start, hist: h.worldHist };
  const again = createHero({ ...h.setup, auto: true });
  LIVE.out(again, Math.max(0, h.age - again.age));
  return { start, hist: again.worldHist ?? '' };
}

const timelines = new WeakMap<Hero, { key: string; years: WorldYear[] }>();

// 主人公の一生の前後を含む、年ごとの世界の様子 (at は主人公の年齢、隙間なく並ぶ)。
// 生きた年は主人公の記録どおり。生まれる前と亡くなった後は、横の乱数で世界の確率から延ばす
export function worldTimeline(h: Hero, before = 60, after = 60): WorldYear[] {
  const { start, hist } = livedYears(h);
  const key = `${start}|${hist}|${before}|${after}`;
  const hit = timelines.get(h);
  if (hit?.key === key) return hit.years;
  const lived = [...hist].map((c, i) => decode(start + i, c));
  const first = lived[0] ?? decode(start, '0');
  if (h.lineage) {
    // 続けた主人公: 生まれる前は前の代までの記録 (系譜の hist。最初の主人公の年齢から、この主人公の年齢に直す)
    const L0 = h.lineage;
    const past = [...L0.hist].map((c, i) => decode(L0.histStart + i - L0.offset, c)).filter((y) => y.at < start);
    const years = [...past, ...lived, ...extend(h, lived[lived.length - 1] ?? first, after)];
    timelines.set(h, { key, years });
    return years;
  }
  // 生まれる前: 平時から before 年ぶん進め、最後の年を生まれた年の様子につなぐ (魔王が健在なら、その治世はしばらく前から)
  const r = makeRng(hash(h.seed, 'past'));
  const s: Sim = { war: 0, plague: 0, famine: 0, demonKing: false };
  const past: WorldYear[] = [];
  for (let at = start - before; at < start; at++) { simYear(r, h, s); past.push(yearOf(at, s)); }
  if (past.length) {
    const reign = first.demonKing ? 1 + Math.floor(r() * 12) : 1;
    for (let i = Math.max(0, past.length - reign); i < past.length; i++) past[i].demonKing = first.demonKing;
  }
  // 亡くなった後: 最後の年の様子から続ける
  const years = [...past, ...(lived.length ? lived : [first]), ...extend(h, lived[lived.length - 1] ?? first, after)];
  timelines.set(h, { key, years });
  return years;
}

// ---- ほかの人の一生 -----------------------------------------------------------

export interface LifeSpec {
  key: string;            // 't:<Tie.id>' か 'r:<番号>'
  seed: number;
  race: RaceId;
  sex: Sex;
  status: Status;
  bornAt: number;         // 生まれた時の主人公の年齢
  arriveAge?: number;     // 召喚・転移でこの世界に来た時のその人の年齢 (年表はこの年齢から。省略 = 0歳から)
  name?: string;
  cheat?: CheatId;
  arrival?: Arrival;
  past?: PastLife;
  anchors?: Omit<Anchors, 'bornAt' | 'worldYears'>;
  maxYears?: number;
}

// 汎用: 仕様と錨から、その人の一生を作る
export function lifeOfSpec(h: Hero, spec: LifeSpec): OtherLife {
  const o = otherHero(h, spec);
  return {
    key: spec.key, name: o.name, race: o.race, sex: o.sex, status: o.status, bornAt: spec.bornAt,
    ...(o.alive ? {} : { diedAt: spec.bornAt + o.age, ageAtDeath: o.age, death: o.death }),
    job: o.job, level: o.level, ...(o.gold !== undefined ? { gold: Math.round(o.gold) } : {}), ...(o.rank ? { rank: o.rank } : {}), ...(o.cheat ? { cheat: o.cheat } : {}), ...(o.past ? { past: o.past } : {}),
    log: o.log,
  };
}

// その人を主人公として最後まで生きた Hero (テストと、家族の顔ぶれを見たいとき用)
export function otherHero(h: Hero, spec: LifeSpec): Hero {
  const race = raceOf(spec.race);
  // その人の寿命の目安まで、世界の様子を延ばしておく
  // (錨の死やまだ生きている年が種族の上限を越えていれば、そこまで)
  const a = spec.anchors;
  const span = Math.min(spec.maxYears ?? 4000, Math.max(race.maxAge, (a?.deathAt?.age ?? 0) + 1, (a?.noDeathBefore ?? 0) + 1));
  const endAt = spec.bornAt + span;
  const heroEnd = (h.log[0]?.age ?? 0) + Math.max(0, (h.worldHist?.length ?? h.age + 1) - 1);
  const years = worldTimeline(h, Math.max(60, -spec.bornAt + 1), Math.max(60, endAt - heroEnd));
  const setup: Setup = {
    seed: spec.seed,
    world: { ...h.setup.world, preset: h.world.id },
    hero: {
      race: spec.race, sex: spec.sex, status: spec.status, cheat: spec.cheat ?? 'none', arrival: spec.arrival ?? 'native',
      ...(spec.arrival && spec.arrival !== 'native' ? {} : { memory: 'none' as const }),
      ...(spec.name ? { name: spec.name } : {}), traits: [], points: {}, startAge: 'birth',
    },
    auto: true,
    anchors: { ...spec.anchors, bornAt: spec.bornAt, worldYears: years, ...(spec.arriveAge ? { arriveAge: spec.arriveAge } : {}) },
  };
  const o = createHero(setup);
  if (spec.past) o.past = spec.past;
  return LIVE.out(o, span);
}

// 輪の人が生まれた時の主人公の年齢 (Tie.age はその人の今の年齢か、亡くなった時の年齢)
export const bornAtOf = (h: Hero, t: Tie) => (t.alive ? h.age : t.diedAt ?? h.age) - t.age;
// 主人公が x 歳の時の、その人の年齢
const ageAt = (h: Hero, t: Tie, x: number) => x - bornAtOf(h, t);
// 輪の人が亡くなった (か、主人公の今の) 主人公の年齢
const endOf = (h: Hero, t: Tie) => (t.alive ? undefined : t.diedAt);

// 亡くなった理由の文から死因の分類を読む (主人公の年表の死別の行と、人物像の fate)
export function hazardFromText(text: string, heqAtDeath: number): Hazard {
  if (/出産|childbirth/i.test(text)) return 'childbirth';
  if (/疫病|plague/i.test(text)) return 'plague';
  if (/飢|famine|starv/i.test(text)) return 'famine';
  if (/戦いで|戦に|戦場|in battle|in the war/i.test(text)) return 'war';
  if (/魔物|妖|ダンジョン|廃墟|monster|yokai|demon beast|dungeon|ruins/i.test(text)) return 'monster';
  if (/事故|accident/i.test(text)) return 'accident';
  if (/殺|襲われ|killed|murder/i.test(text)) return 'violence';
  if (/老い|old age/i.test(text) || heqAtDeath >= 60) return 'age';
  if (heqAtDeath < 3) return 'infant';
  return 'disease';
}

const lifeCache = new WeakMap<Hero, { key: string; lives: Map<number, OtherLife> }>();

// 輪の人の一生 (錨: 生年・家族・連れ合い・子・死・共有の出来事・職業)
export function lifeOfTie(h: Hero, tieId: number): OtherLife {
  const ck = `${h.age}|${h.log.length}|${h.alive}`;
  let c = lifeCache.get(h);
  if (!c || c.key !== ck) { c = { key: ck, lives: new Map() }; lifeCache.set(h, c); }
  const hit = c.lives.get(tieId);
  if (hit) return hit;
  const t = h.people.find((x) => x.id === tieId);
  if (!t) throw new Error(`no tie ${tieId}`);
  const life = lifeOfSpec(h, tieSpec(h, t));
  c.lives.set(tieId, life);
  return life;
}

export function tieSpec(h: Hero, t: Tie): LifeSpec {
  const bornAt = bornAtOf(h, t);
  const seed = hash(h.seed, 'tie', t.id);
  const r = makeRng(seed ^ 0x2545f491);
  const anchors: NonNullable<LifeSpec['anchors']> = {};
  const age = (x: number) => x - bornAt;
  const hp = (x: Tie) => ({ name: x.name, age: ageAt(h, x, bornAt), ...(endOf(h, x) !== undefined ? { diesAt: endOf(h, x)! - bornAt } : {}) });

  // 亡くなった年と死因
  if (!t.alive) {
    const rec = h.log.find((e) => e.age === t.diedAt && (e.leave?.includes(t.id) || e.who?.includes(t.id)) && e.kind === 'loss');
    const text = t.profile?.fate ?? rec?.text ?? '';
    const hz = hazardFromText(text, heq(t.age, raceOf(t.race)));
    anchors.deathAt = { age: t.age, hazard: hz, label: hazardName(hz), ...(t.profile?.fate ? { text: t.profile.fate } : {}) };
  } else {
    anchors.noDeathBefore = t.age; // 今 (か主人公が亡くなった時) 生きているので、それより前には死なない
  }

  // 家族と連れ合い
  const spouses = h.people.filter((x) => x.role === 'spouse');
  const heroChildren = h.people.filter((x) => x.role === 'child');
  const heroAsTie = { name: h.given, sex: h.sex, race: h.race };
  const married = h.log.find((e) => e.kind === 'love' && e.who?.includes(t.id) && /結婚|Married|married/.test(e.text));
  switch (t.role) {
    case 'spouse': {
      const at = married?.age ?? t.since;
      const end = t.until !== undefined ? { until: age(t.until), end: 'leave' as const } : !h.alive && t.alive ? { until: age(h.age), end: 'death' as const } : {};
      anchors.marry = { age: age(at), name: heroAsTie.name, sex: heroAsTie.sex, race: heroAsTie.race, ...end, withHero: true };
      // 主人公との子 (同じ名前・同じ生年)。その連れ合いのいた間に生まれた子
      anchors.children = heroChildren.filter((c) => { const b = bornAtOf(h, c); return b >= at && (t.alive || b <= (t.diedAt ?? b)); })
        .map((c) => ({ age: age(bornAtOf(h, c)), name: c.name, sex: c.sex, withHero: true }));
      break;
    }
    case 'child': {
      // 親は主人公と、その子が生まれた時の連れ合い
      const other = spouses.find((s) => bornAtOf(h, s) <= bornAt && (s.alive || (s.diedAt ?? 0) >= bornAt)) ?? spouses[0];
      const me = { name: h.given, age: bornAt, ...(h.alive ? {} : { diesAt: h.age - bornAt }) }; // 主人公はその子が生まれた時 bornAt 歳
      const [mom, dad] = h.sex === 'F' ? [me, other && hp(other)] : [other && hp(other), me];
      anchors.parents = { ...(mom ? { mother: mom } : {}), ...(dad ? { father: dad } : {}) };
      anchors.children = [];
      break;
    }
    case 'sibling': {
      const mom = h.people.find((x) => x.role === 'mother');
      const dad = h.people.find((x) => x.role === 'father');
      anchors.parents = { ...(mom ? { mother: hp(mom) } : {}), ...(dad ? { father: hp(dad) } : {}) };
      break;
    }
    case 'mother': case 'father': {
      // 主人公の親: その親は分からない。もう一方の親と、主人公と上のきょうだいの生まれる前に結婚している
      const partner = h.people.find((x) => x.role === (t.role === 'mother' ? 'father' : 'mother'));
      const kids = [{ name: h.given, sex: h.sex, at: 0 }, ...h.people.filter((x) => x.role === 'sibling').map((s) => ({ name: s.name, sex: s.sex, at: bornAtOf(h, s) }))];
      const firstKid = Math.min(...kids.map((k) => k.at));
      const adultAge = Math.max(raceOf(t.race).adult, 16);
      const wed = Math.max(adultAge, age(firstKid) - 1 - Math.floor(r() * 3));
      if (partner) {
        const pEnd = endOf(h, partner);
        anchors.marry = { age: Math.min(wed, age(firstKid)), name: partner.name, sex: partner.sex, race: partner.race, ...(pEnd !== undefined && pEnd >= bornAt ? { until: age(pEnd), end: 'death' as const } : {}) };
      }
      anchors.children = kids.filter((k) => age(k.at) >= 0).map((k) => ({ age: age(k.at), name: k.name, sex: k.sex, withHero: k.name === h.given }));
      anchors.noFamily = true;
      break;
    }
    default: {
      // 家族でない人: 人物像の結婚と子 (名は人物像に無いので、その人の乱数で作る)
      const story = t.profile?.story ?? [];
      const wedAt = story.find((s) => s.kind === 'marry')?.age;
      if (wedAt !== undefined) {
        const sex: Sex = t.sex === 'F' ? 'M' : 'F';
        anchors.marry = { age: age(wedAt), name: personName(r, h.world, sex, h.status).given, sex, race: t.race };
      }
      anchors.children = story.filter((s) => s.kind === 'child' && wedAt !== undefined && s.age >= wedAt)
        .map((s) => { const sex: Sex = r() < 0.5 ? 'F' : 'M'; return { age: age(s.age), name: personName(r, h.world, sex, h.status).given, sex }; });
    }
  }

  // 主人公と共有した出来事 (主人公の年表でその人が関わった行)。結婚と子の誕生は錨の行と重なるので入れない
  const anchorAges = new Set([anchors.marry?.age, ...(anchors.children ?? []).map((k) => k.age)].filter((x): x is number => x !== undefined));
  const shared: NonNullable<Anchors['shared']> = [];
  for (const e of h.log) {
    if (!e.who?.includes(t.id) && !e.join?.includes(t.id)) continue;
    const a = age(e.age);
    if (a < 0 || (anchors.deathAt && a > anchors.deathAt.age)) continue;
    if ((e.kind === 'love' || e.kind === 'family') && anchorAges.has(a)) continue;
    if (e.leave?.includes(t.id) && !t.alive) continue; // その人自身の死の行は、その人の死の記録が受け持つ
    shared.push({ age: a, text: L(`${h.given}と: ${e.text}`, `With ${h.given}: ${e.text}`), kind: e.kind === 'death' ? 'loss' : e.kind, who: 'hero' });
  }
  // 主人公の死 (その人が生きていれば)
  const heroDeath = h.alive ? undefined : h.log[h.log.length - 1];
  if (heroDeath && t.alive && t.until === undefined) shared.push({ age: age(h.age), text: L(`${h.given}が亡くなった。`, `${h.given} died.`), kind: 'loss', who: 'hero' });
  // その人自身の出来事 (人物像の story。結婚・子・死は錨が受け持つ)
  for (const s of t.profile?.story ?? []) {
    if (s.kind === 'marry' || s.kind === 'child' || s.kind === 'death') continue;
    const a = age(s.age);
    if (a >= 0 && (!anchors.deathAt || a <= anchors.deathAt.age)) shared.push({ age: a, text: s.text, kind: s.kind === 'leave' ? 'loss' : s.kind === 'injury' ? 'hard' : 'work' });
  }
  anchors.shared = shared;
  if (t.job) anchors.job = t.job as JobId;
  // 主人公と輪でつながっていた間 (離れた・亡くなった・主人公が亡くなった・今) は、職業と level を輪の人のカードのとおりに
  anchors.holdUntil = age(t.until ?? (t.alive ? h.age : t.diedAt ?? h.age));
  if (t.profile) anchors.level = t.profile.level;

  // 家族は主人公と同じ家 (同じ身分)。家族でない人の身分は分からないので、主人公と同じ暮らしの層に置く
  return { key: `t:${t.id}`, seed, race: t.race, sex: t.sex, status: h.status, bornAt, name: t.name, anchors };
}
