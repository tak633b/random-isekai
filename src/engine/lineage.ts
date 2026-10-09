// 系譜: 死亡記録から輪の人を選び、その人として続けて遊ぶ。
// 選んだ人の過去は、その人の錨の付いた一生 (others.ts の lifeOfTie / reincarnators.ts の reincarnatorLife) の、前の主人公が亡くなった翌年までの部分そのまま。
// そこから先はふつうの主人公として進む (乱数はその人の seed。前の主人公の seed と鍵から決まる)。
// 世界は同じ: 時間は最初の主人公の年齢 (root time) で数え、世界の様子・固有名・転生者の名簿・年代記が続く (Hero.lineage)
import type { Ancestor, Hero, Role, Tie } from './types';
import { otherHero, tieSpec, worldTimeline, type LifeSpec } from './others';
import { reincarnatorSpec, reincarnatorsOf } from './reincarnators';
import { chronicleOf } from './chronicle';
import { addTie } from './bonds';

// 前の主人公から見た役 → 選んだ人から見た前の主人公の役
function inverseRole(role: Role, prevSex: Hero['sex']): Role {
  switch (role) {
    case 'mother': case 'father': return 'child';
    case 'child': return prevSex === 'F' ? 'mother' : 'father';
    case 'mentor': return 'disciple';
    case 'disciple': return 'mentor';
    case 'master': return 'servant';
    case 'servant': return 'master';
    case 'familiar': return 'master';
    case 'fiance': case 'lover': return 'lover';
    default: return role; // sibling / spouse / friend / companion / rival / nemesis
  }
}

const rootOffset = (h: Hero) => h.lineage?.offset ?? 0;

// 続けられる人の鍵: 主人公の死の時点で生きていて、輪から離れていない人 (会った転生者もここに入る)
export function heirsOf(prev: Hero): string[] {
  if (prev.alive) return [];
  return prev.people.filter((t) => t.alive && t.until === undefined).map((t) => `t:${t.id}`);
}

// 前の主人公の一代の記録 (系譜と年代記に載せる)
function ancestorOf(prev: Hero): Ancestor {
  const off = rootOffset(prev);
  const deeds = chronicleOf(prev).filter((e) => e.kind === 'hero' && e.lived && e.at >= (prev.log[0]?.age ?? 0) && e.at <= prev.age && e.text.includes(prev.given))
    .map((e) => ({ at: e.at + off, text: e.text }));
  return {
    name: prev.name, given: prev.given, race: prev.race, sex: prev.sex, key: prev.lineage?.key ?? 'root',
    bornAt: off, diedAt: off + prev.age, ageAtDeath: prev.age, ...(prev.death ? { cause: prev.death.label } : {}), job: prev.job,
    ...(deeds.length ? { deeds } : {}),
  };
}

// 選んだ人として続ける。prev は亡くなった主人公、key は 't:<Tie.id>' か 'r:<転生者の番号>'
export function continueAs(prev: Hero, key: string): Hero {
  if (prev.alive) throw new Error('continueAs: the hero is still alive');
  const [kind, idText] = key.split(':');
  const id = Number(idText);
  let spec: LifeSpec;
  let tie: Tie | undefined;
  if (kind === 't') {
    tie = prev.people.find((t) => t.id === id);
    if (!tie || !tie.alive) throw new Error(`continueAs: ${key} is not alive`);
    spec = tieSpec(prev, tie);
  } else if (kind === 'r') {
    spec = reincarnatorSpec(prev, id);
  } else throw new Error(`continueAs: bad key ${key}`);

  // 前の主人公が亡くなった翌年のその人の年齢まで、錨の付いた一生を辿る (その年までは死なない)
  const startAge = prev.age + 1 - spec.bornAt;
  const from = spec.arriveAge ?? 0;
  if (startAge <= from) throw new Error(`continueAs: ${key} has not arrived yet`);
  const anchors = { ...spec.anchors };
  delete anchors.deathAt;
  anchors.noDeathBefore = Math.max(anchors.noDeathBefore ?? 0, startAge + 1);
  const h = otherHero(prev, { ...spec, anchors, maxYears: startAge - from });

  // ここからはふつうの主人公: 錨を外し、系譜を付ける
  const timeline = worldTimeline(prev).filter((y) => y.at <= prev.age);
  const off = rootOffset(prev);
  const hist = timeline.map((y) => ((y.war ? 1 : 0) | (y.plague ? 2 : 0) | (y.famine ? 4 : 0) | (y.demonKing ? 8 : 0)).toString(16)).join('');
  const root = prev.lineage?.root ?? { given: prev.given, race: prev.race, start: prev.log[0]?.age ?? 0 };
  h.setup = { ...h.setup, anchors: undefined, auto: prev.setup.auto };
  delete h.setup.anchors;
  h.auto = prev.auto;
  h.policy = prev.policy;
  h.lineage = {
    gen: (prev.lineage?.gen ?? 1) + 1,
    rootSeed: prev.lineage?.rootSeed ?? prev.seed,
    root, key, offset: off + spec.bornAt, startAge: h.age,
    histStart: (timeline[0]?.at ?? 0) + off, hist,
    ancestors: [...(prev.lineage?.ancestors ?? []), ancestorOf(prev)],
  };
  // 選んだ人が転生者 (r: の鍵か、会って輪に入った転生者) なら、名簿のその番号
  const self = kind === 'r' ? id : reincarnatorsOf(prev).find((q) => q.tieId === id)?.id;
  if (self !== undefined) h.lineage.self = self;
  // 職業・level・ランク・技は、輪の人のカード (人物像) から。職業と level は錨で既に合っている
  if (tie?.profile?.rank) h.rank = tie.profile.rank;
  if (tie?.profile?.skill && !h.traits.includes(tie.profile.skill)) h.traits = [...h.traits, tie.profile.skill];

  // 前の主人公を、選んだ人の輪に故人として正しい役で入れる (錨の一生で既に入っていれば、その人を故人にする)
  const role = tie ? inverseRole(tie.role, prev.sex) : 'friend';
  const diedAt = h.age - 1;
  let p = h.people.find((t) => t.name === prev.given && (t.role === role || t.role === 'spouse' || t.role === 'mother' || t.role === 'father'));
  if (!p) {
    p = addTie(h, { name: prev.given, role, race: prev.race, sex: prev.sex, age: prev.age, bond: tie?.bond ?? 60 });
    p.since = tie ? Math.max(0, tie.since - spec.bornAt) : diedAt;
  }
  p.role = role;
  p.age = prev.age;
  if (p.alive) { p.alive = false; p.diedAt = diedAt; }
  if (prev.job !== undefined) p.job = prev.job;
  return h;
}

// 系譜 (古い順、最後が今の主人公)。死亡記録・追悼館・年代記の表示用
export interface LineageEntry { gen: number; name: string; given: string; race: Hero['race']; sex: Hero['sex']; key: string; bornAt: number; diedAt?: number; ageAtDeath?: number; cause?: string; current: boolean }
export function lineageOf(h: Hero): LineageEntry[] {
  const anc = h.lineage?.ancestors ?? [];
  const out: LineageEntry[] = anc.map((a, i) => ({ gen: i + 1, name: a.name, given: a.given, race: a.race, sex: a.sex, key: a.key, bornAt: a.bornAt, diedAt: a.diedAt, ageAtDeath: a.ageAtDeath, ...(a.cause ? { cause: a.cause } : {}), current: false }));
  const off = rootOffset(h);
  out.push({ gen: h.lineage?.gen ?? 1, name: h.name, given: h.given, race: h.race, sex: h.sex, key: h.lineage?.key ?? 'root', bornAt: off,
    ...(h.alive ? {} : { diedAt: off + h.age, ageAtDeath: h.age, ...(h.death ? { cause: h.death.label } : {}) }), current: true });
  return out;
}
