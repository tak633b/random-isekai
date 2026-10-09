// 人の輪: 家族・仲間・師匠・宿敵・従魔をひとつの一覧 (Hero.people) で持つ。
// id と bond (近さ 0–100) を全員に持たせ、出来事を mem に積む。
// 輪の人の年取りと死だけが乱数を使う。ほかは乱数を使わない (保存・再開と同じ seed の人生を壊さないため)
import type { Hero, LogEntry, Memory, RaceId, Role, Sex, StatKey, Tie, YearKind } from './types';
import { clamp } from './rng';
import { lifeTableFor, qAt } from './mortality';
import { isEn, L, an } from '../i18n';
import { ensureProfile } from './people';

export const MEM_MAX = 12;

// ---- 年表と能力 (どのファイルからも使う小さな道具) ---------------------------

export function log(h: Hero, text: string, kind: YearKind, big = false, who?: number[], why?: string): LogEntry {
  // 英語の文は頭を大文字に (データや名前の組み合わせで小文字から始まることがある。why と同じ扱い)
  const e: LogEntry = { age: h.age, text: isEn && text ? an(text.charAt(0).toUpperCase() + text.slice(1)) : text, kind };
  if (big) e.big = true;
  if (who?.length) e.who = who;
  if (why) e.why = why;
  h.log.push(e);
  if (kind !== 'child' && kind !== 'work' && kind !== 'school') h.kinds[h.age] = kind; // その年の色は目立つ出来事が決める
  return e;
}

// 能力の伸び: 60 までは足したまま、そこから上は上に行くほど伸びにくい (伸びの倍率 (100 - 今) / 40。80 で 0.5、90 で 0.25)。
// 実測 (2026-10-09, おまかせ3000人): 40歳で 95 以上の人は 知恵と魔力 6%・名声 3%・ほかは 0% (前は 知恵と魔力 55%・強さ 20%・健康 21%)、平均は 70〜82
// 下がるときはそのまま。暮らし向き (wealth) は能力ではないので、そのまま足す
export const SOFT_FROM = 60;
const SOFT_K = 1;
export function grow(cur: number, v: number): number {
  if (v <= 0) return cur + v;
  let x = cur, left = v;
  while (left > 0 && x < 100) {
    const step = Math.min(1, left);
    x += step * (x < SOFT_FROM ? 1 : ((100 - x) / (100 - SOFT_FROM)) ** SOFT_K);
    left -= step;
  }
  return x;
}

export function bump(h: Hero, eff: Partial<Record<StatKey | 'level', number>>): void {
  for (const k in eff) {
    const v = eff[k as StatKey | 'level']!;
    if (k === 'level') h.level = Math.max(1, Math.round(h.level + v));
    else h.stats[k as StatKey] = Math.round(clamp(k === 'wealth' ? h.stats[k] + v : grow(h.stats[k as StatKey], v), 0, 100) * 10) / 10;
  }
}

// ---- 輪の人 -----------------------------------------------------------------

// 出会った時の近さ
export function initialBond(role: Role): number {
  switch (role) {
    case 'mother': return 72;
    case 'father': return 60;
    case 'sibling': return 58;
    case 'spouse': return 70;
    case 'child': return 78;
    case 'lover': case 'fiance': return 60;
    case 'friend': case 'companion': return 50;
    case 'mentor': return 48;
    case 'master': return 30;
    case 'servant': case 'disciple': return 45;
    case 'familiar': return 65;
    case 'rival': return 25;
    case 'nemesis': return 5;
  }
}

export interface NewTie { name: string; role: Role; race: RaceId; sex: Sex; age: number; bond?: number; job?: Tie['job'] }

export function addTie(h: Hero, t: NewTie): Tie {
  const tie: Tie = { id: h.nextId++, name: t.name, role: t.role, race: t.race, sex: t.sex, age: t.age, alive: true,
    bond: t.bond ?? initialBond(t.role), since: h.age, mem: [] };
  if (t.job !== undefined) tie.job = t.job;
  h.people.push(tie);
  ensureProfile(h, tie); // 人物像 (横の乱数だけを引く。h.rng は変えない)
  return tie;
}

export function remember(h: Hero, t: Tie, text: string, d: number): void {
  t.bond = Math.round(clamp(t.bond + d, 0, 100) * 10) / 10;
  const m: Memory = { age: h.age, text, d };
  t.mem = [...t.mem, m].slice(-MEM_MAX);
}

// 人の出てくる出来事: log に who を付け、関わった人の mem に積む
export function shared(h: Hero, ties: Tie[], text: string, kind: YearKind, d = 0, big = false, why?: string): LogEntry {
  const e = log(h, text, kind, big, ties.map((t) => t.id), why);
  for (const t of ties) remember(h, t, text, d);
  return e;
}

// 死別。近かった人ほど幸せが大きく落ちる (bond 50 で元の重さ、90 で 1.4倍、20 で 0.7倍)
export function mourn(h: Hero, t: Tie, happy: number): void {
  t.alive = false;
  t.diedAt = h.age;
  bump(h, { happy: happy * (0.5 + t.bond / 100) });
}

// 今そばにいる人 (生きていて、離れていない)
export const around = (h: Hero) => h.people.filter((t) => t.alive && t.until === undefined);

// その役の人のうち、いちばん近い人
export function byRole(h: Hero, role: Role): Tie | undefined {
  let best: Tie | undefined;
  for (const t of h.people) if (t.role === role && t.alive && t.until === undefined && (!best || t.bond > best.bond)) best = t;
  return best;
}

// 最後にそばにいた人: 生きていて今も連絡のある人を近い順に。宿敵は入れない
export function closest(h: Hero, n = 3): Tie[] {
  return around(h).filter((t) => t.role !== 'nemesis' && t.role !== 'rival' && t.bond >= 20)
    .sort((a, b) => b.bond - a.bond || a.id - b.id)
    .slice(0, n);
}

// 文の中での呼び方
export function callName(t: Tie): string {
  const n = t.name;
  const ja: Record<Role, string> = {
    mother: '母', father: '父', sibling: `きょうだいの${n}`, spouse: `連れ合いの${n}`, child: `子の${n}`, lover: `恋人の${n}`, fiance: `婚約者の${n}`,
    friend: `友の${n}`, companion: `仲間の${n}`, mentor: `師の${n}`, rival: `好敵手の${n}`, nemesis: `宿敵の${n}`, familiar: `従魔の${n}`,
    master: `主人の${n}`, servant: `従者の${n}`, disciple: `弟子の${n}`,
  };
  const en = t.role === 'mother' ? 'Mother' : t.role === 'father' ? 'Father' : n;
  return L(ja[t.role], en);
}

// ---- 年取りと死 -------------------------------------------------------------

// 輪の全員が1年年を取り、それぞれの種族の生命表で亡くなることがある。
// 主人公の年齢はもう1つ進んだ後に呼ぶ (diedAt は主人公の今の年齢)
// ほかの人の一生 (anchor.ts) で、錨の人 (連れ合い・子・親) を年取りの死から外す。主人公には何もしない (乱数は今までどおり引く)
let keepAlive: (h: Hero, t: Tie) => boolean = () => false;
export const setKeepAlive = (f: (h: Hero, t: Tie) => boolean) => { keepAlive = f; };

export function agePeople(h: Hero): Tie[] {
  const died: Tie[] = [];
  for (const t of h.people) {
    if (!t.alive) continue;
    const q = qAt(lifeTableFor(h.world, t.race), Math.max(0, t.age));
    t.age++;
    if (h.rng() < q && !keepAlive(h, t)) died.push(t);
  }
  for (const t of died) {
    const near = t.until === undefined && t.role !== 'nemesis' && t.role !== 'rival';
    mourn(h, t, near ? -18 : -2);
    if (t.role === 'spouse') { delete h.flags.married; h.flags.widowed = h.age; }
    if (near || t.bond >= 40) log(h, L(`${callName(t)}が亡くなった。${t.age}歳だった。`, `${callName(t)} died at ${t.age}.`), 'loss', t.bond >= 50, [t.id]).leave = [t.id];
  }
  return died;
}
