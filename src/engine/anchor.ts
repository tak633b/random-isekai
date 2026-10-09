// 錨: ほかの人の一生 (others.ts) を作るとき、エンジンに必ず合わせさせる点 (Setup.anchors)。
// 主人公の人生には anchors が無いので、ここの関数はどれも何もしない (主人公の乱数の並びと年表は変わらない)
import type { Anchors, EventDef, Hazard, Hero, WorldYear } from './types';
import { addTie, byRole, log, mourn, setKeepAlive } from './bonds';
import { heq } from './mortality';
import { raceOf } from './races';
import { L } from '../i18n';

export const anchorsOf = (h: Hero): Anchors | undefined => h.setup.anchors;

// 一生を最後まで進める関数 (life.ts の liveOut)。others.ts が life.ts を直接読むと
// life → reincarnators → others → life の輪になるので、life.ts がここに置き、others.ts はここから使う
export const LIVE: { out: (h: Hero, maxYears?: number) => Hero } = { out: () => { throw new Error('life.ts not loaded'); } };

// 錨の人 (連れ合い・子・親) は、錨の年まで年取りで死なない (親が亡くなる年は parents の diesAt で)
setKeepAlive((h, t) => !!anchorsOf(h) && (t.role === 'spouse' || t.role === 'child' || t.role === 'mother' || t.role === 'father'));

// 職業を錨のまま守る年か (主人公と輪でつながっていた間)
export function jobHeld(h: Hero): boolean {
  const a = anchorsOf(h);
  return !!a && a.holdUntil !== undefined && h.age <= a.holdUntil;
}

// level を錨に合わせる: 守る間は上限を超えず、守る期間の最後の年にはちょうどその値 (輪の人の人物像の level)
export function capLevel(h: Hero): void {
  const a = anchorsOf(h);
  if (!a || a.level === undefined || a.holdUntil === undefined || h.age > a.holdUntil) return;
  h.level = h.age === a.holdUntil ? a.level : Math.min(h.level, a.level);
}

// 死んではいけない年か (錨の死の年まで。その年の死は advanceYear の頭で錨の死因で起こすので、出来事の危険では死なない。
// noDeathBefore はその年齢より前)
export function deathBlocked(h: Hero): boolean {
  const a = anchorsOf(h);
  if (!a) return false;
  if (a.deathAt && h.age <= a.deathAt.age) return true;
  return h.age < (a.noDeathBefore ?? -1);
}

// この年が錨の死の年なら、その死因
export function anchoredDeath(h: Hero): Hazard | undefined {
  const d = anchorsOf(h)?.deathAt;
  return d && h.age >= d.age ? d.hazard : undefined;
}

// 錨の死の記録を、分かっている文に置き換える
export function dressDeath(h: Hero): void {
  const d = anchorsOf(h)?.deathAt;
  if (!d || !h.death) return;
  if (d.label) h.death.label = d.label;
  if (d.text) {
    h.death.text = d.text;
    const e = h.log[h.log.length - 1];
    if (e?.kind === 'death') e.text = d.text;
  }
}

// その年の世界の様子 (錨があれば、それに合わせる)。無い年は平時
export function anchoredWorld(h: Hero): WorldYear | null {
  const a = anchorsOf(h);
  if (!a?.worldYears) return null;
  // worldYears は at の順に隙間なく並ぶ (others.ts の worldTimeline)。範囲の外は平時
  const at = a.bornAt + h.age;
  const y = a.worldYears[at - (a.worldYears[0]?.at ?? 0)];
  return y && y.at === at ? y : { at, war: false, plague: false, famine: false, demonKing: false };
}

// 結婚と子は錨のとおりだけ (エンジンの結婚・出産と、出来事の結婚・出産を止める)
export const familyFixed = (h: Hero) => !!anchorsOf(h);
export function eventBlocked(h: Hero, d: EventDef): boolean {
  if (!familyFixed(h)) return false;
  return d.set === 'married' || d.birth === true || (!!d.tie?.new && (d.tie.role === 'spouse' || d.tie.role === 'child'));
}

// 年を取った後に、その年の錨を年表に入れる (結婚・連れ合いとの別れ・子の誕生・共有の出来事)
export function anchorYear(h: Hero): void {
  const a = anchorsOf(h);
  if (!a) return;
  const m = a.marry;
  if (m && h.age === m.age) {
    const t = addTie(h, { name: m.name, role: 'spouse', race: m.race, sex: m.sex, age: h.age, bond: 75 });
    h.flags.married = h.age;
    const me = log(h, L(`${m.name}と結婚した。`, `Married ${m.name}.`), 'love', true, [t.id]);
    me.join = [t.id];
    if (m.withHero) me.shared = true;
    // ほかの恋人・婚約者との仲は終わる (events.ts の endLovers と同じ。anchor.ts から events.ts は読めないので、ここにも書く)
    for (const x of h.people) if (x !== t && x.alive && x.until === undefined && (x.role === 'lover' || x.role === 'fiance')) {
      x.until = h.age;
      log(h, L(`結婚を機に、${x.name}との仲は終わった。`, `With the marriage, things ended with ${x.name}.`), 'loss', false, [x.id]).leave = [x.id];
    }
  }
  if (m?.until !== undefined && h.age === m.until) {
    const t = byRole(h, 'spouse');
    if (t) {
      if (m.end === 'leave') { const le = log(h, L(`${m.name}と別れた。`, `Parted from ${m.name}.`), 'loss', true, [t.id]); le.leave = [t.id]; if (m.withHero) le.shared = true; }
      else {
        mourn(h, t, -20);
        delete h.flags.married; h.flags.widowed = h.age;
        const de = log(h, L(`連れ合いの${m.name}が亡くなった。`, `${m.name}, ${h.sex === 'F' ? 'her' : 'his'} spouse, died.`), 'loss', true, [t.id]);
        de.leave = [t.id];
        if (m.withHero) de.shared = true;
      }
    }
  }
  for (const c of a.children ?? []) {
    if (c.age !== h.age) continue;
    const t = addTie(h, { name: c.name, role: 'child', race: h.race, sex: c.sex, age: 0, bond: 78 });
    const ce = log(h, L(`子の${c.name}が生まれた。`, `A child, ${c.name}, was born.`), 'family', true, [t.id]);
    ce.join = [t.id];
    if (c.withHero) ce.shared = true;
  }
  for (const role of ['mother', 'father'] as const) {
    const p = a.parents?.[role];
    const t = h.people.find((x) => x.role === role && x.alive);
    if (p?.diesAt === h.age && t) {
      mourn(h, t, -15);
      log(h, L(`${role === 'mother' ? '母' : '父'}が亡くなった。${t.age}歳だった。`, `${role === 'mother' ? 'Mother' : 'Father'} died at ${t.age}.`), 'loss', true, [t.id]).leave = [t.id];
    }
  }
  for (const s of a.shared ?? []) if (s.age === h.age) log(h, s.text, s.kind, false).shared = true; // 主人公と共有した行の印
}

// 生まれた時の家族を錨に合わせる (親の名と年齢。きょうだいは同じ親)
export function anchorFamily(h: Hero): void {
  const a = anchorsOf(h);
  if (!a) return;
  if (a.noFamily) { h.people = h.people.filter((t) => t.role !== 'mother' && t.role !== 'father' && t.role !== 'sibling'); return; }
  for (const role of ['mother', 'father'] as const) {
    const p = a.parents?.[role];
    const t = h.people.find((x) => x.role === role);
    if (p && t) { t.name = p.name; t.age = p.age; }
  }
}

// 子を産めるか: 産む側 (主人公か連れ合いの女性) が人間換算 45歳まで。老化の遅い特典では数えず、体の年齢 (種族の速さ) で見る
export const MAX_BEAR_HEQ = 45;
export function canBear(h: Hero): boolean {
  const sp = byRole(h, 'spouse');
  if (!sp) return false;
  if (h.sex === 'F') return heq(h.age, raceOf(h.race)) < MAX_BEAR_HEQ;
  return sp.sex === 'F' && heq(sp.age, raceOf(sp.race)) < MAX_BEAR_HEQ;
}
