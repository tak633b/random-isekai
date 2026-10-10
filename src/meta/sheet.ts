// ステータス画面に出す値 (ui/sheet.ts)。主人公 (Hero) から読むだけで、何も変えず、乱数も引かない。
// エンジンに無いもの (経験値・素早さ・装備) は作らない。HP と MP だけは、今ある能力・レベル・特典・trait から決まった式で出す (表示用)
import { levelOf } from '../engine/bonds';
import type { Hero, TraitDef } from '../engine/types';
import { CHEATS } from '../engine/cheats';
import { raceOf } from '../engine/races';
import { heqOf } from '../engine/mortality';
import { statusName } from '../engine/status';
import { traitOf } from '../engine/traits';
import { TACTIC_NAME } from '../engine/tactic';
import { itemName } from '../engine/transfer';
import { routeOf } from '../engine/climb';
import { allPaths } from '../engine/training';
import { formatGold } from '../engine/econ';
import { MONEY } from '../data/money';
import { foeKindOf, bestiaryEntry } from './bestiary';
import { climbText, jobName, titlesOf } from '../ui/labels';
import { L, T } from '../i18n';

export interface Kill { id: string; name: string; n: number; danger: number }
export interface Sheet {
  name: string; race: string; sex: 'F' | 'M'; age: number; heq: number;
  born: string; standing: string; climb: string;
  job: string; rank?: string; level: number;
  hp: { now: number; max: number };
  mp: { max: number | null } | null;        // 魔法の無い世界では出さない。null は尽きない (無限の魔力)
  attrs: { key: string; label: string; v: number }[];
  skills: { name: string; kind: TraitDef['kind']; learned: boolean; soul?: boolean }[]; // soul: 前世から魂に刻まれて引き継いだ技
  cheat?: { name: string; desc: string; soul?: boolean };
  blessing: boolean;
  titles: string[];
  tactic: string;
  kills: Kill[];                            // 倒した相手を姿ごとに (多い順)
  strongest?: Kill;                         // 倒した中でいちばん危険な相手
  battles: { won: number; hurt: number; lost: number };
  revives: { used: boolean; left: number };
  items: string[];                          // 異世界転移で持ってきた物
  companions: { name: string; role: string }[];
  training?: { label: string; prog?: number };
  money: { now: string; debt: boolean; inc?: string; exp?: string; gear?: string };
}

// HP: 健康 (0〜100) を今の割合として、最大はレベルと強さから。超再生・不死の体は多め
export function hpOf(h: Hero): { now: number; max: number } {
  const k = h.cheat === 'regeneration' || h.cheat === 'immortal_body' ? 1.5 : 1;
  const max = Math.round((30 + levelOf(h) * 6 + h.stats.power * 0.8 + h.stats.hp * 0.4) * k);
  return { now: h.alive ? Math.max(1, Math.round((max * h.stats.hp) / 100)) : 0, max };
}

// MP: 魔法のある世界だけ。知恵と魔力・レベルから。大魔力は 1.5倍、無限の魔力は尽きない
export function mpOf(h: Hero): { max: number | null } | null {
  if (h.world.magic < 1) return null;
  if (h.cheat === 'infinite_mana') return { max: null };
  const k = (h.traits.includes('sk.bigmana') ? 1.5 : 1) * (h.talent === 'magic' ? 1.2 : 1);
  return { max: Math.round((10 + levelOf(h) * 4 + h.stats.mind * 1.2) * k) };
}

/** 倒した相手 (勝った・傷を負って勝った戦い) を姿ごとに数える */
export function killsOf(h: Hero): { kills: Kill[]; battles: Sheet['battles'] } {
  const m = new Map<string, Kill>();
  const battles = { won: 0, hurt: 0, lost: 0 };
  for (const e of h.log) {
    if (!e.fight) continue;
    const r = e.fight.result;
    if (r === 'lose') { battles.lost++; continue; }
    if (r === 'hurt') battles.hurt++; else battles.won++;
    const id = foeKindOf(h, e);
    if (!id) continue;
    const b = bestiaryEntry(id);
    const k = m.get(id) ?? { id, name: b ? T(b.name) : id, n: 0, danger: b?.danger ?? 1 };
    m.set(id, { ...k, n: k.n + 1 });
  }
  return { kills: [...m.values()].sort((a, b) => b.n - a.n || b.danger - a.danger), battles };
}

// 能力の短い呼び名 (375px の幅で1行に収まるように)
const SHORT: Record<'power' | 'mind' | 'hp' | 'charm' | 'luck' | 'fame' | 'wealth', [string, string]> = {
  power: ['強さ', 'Power'], mind: ['知力', 'Mind'], hp: ['健康', 'Health'], charm: ['人望', 'Charm'], luck: ['運', 'Luck'], fame: ['名声', 'Fame'], wealth: ['暮らし', 'Wealth'],
};

const WITH = new Set(['companion', 'familiar', 'master', 'disciple', 'servant', 'spouse']);
const ROLE: Record<string, [string, string]> = {
  companion: ['仲間', 'Companion'], familiar: ['従魔', 'Familiar'], master: ['師匠', 'Master'], disciple: ['弟子', 'Disciple'], servant: ['従者', 'Servant'], spouse: ['連れ合い', 'Spouse'],
};

export function sheetOf(h: Hero): Sheet {
  const { kills, battles } = killsOf(h);
  const strongest = kills.reduce<Kill | undefined>((b, k) => (!b || k.danger > b.danger ? k : b), undefined);
  const t = h.train;
  const training = t && !t.done && t.kind !== 'rest'
    ? t.kind === 'path' ? { label: T(allPaths().find((p) => p.id === t.id)?.name ?? { ja: t.id, en: t.id }) }
      : t.kind === 'goal' ? { label: L(`〈${T(traitOf(t.id)?.name ?? { ja: t.id, en: t.id })}〉を目指している`, `Aiming for "${T(traitOf(t.id)?.name ?? { ja: t.id, en: t.id })}"`), prog: Math.round(t.prog) }
        : { label: L(`成り上がり: ${T(routeOf(t.id)?.name ?? { ja: t.id, en: t.id })}`, `Rising: ${T(routeOf(t.id)?.name ?? { ja: t.id, en: t.id })}`), prog: Math.round(t.prog) }
    : undefined;
  return {
    name: h.name, race: T(raceOf(h.race).name), sex: h.sex, age: h.age, heq: Math.round(heqOf(h)),
    born: statusName(h.status, h.world), standing: statusName(h.standing ?? h.status, h.world), climb: climbText(h),
    job: jobName(h.job), ...(h.rank ? { rank: h.rank } : {}), level: levelOf(h),
    hp: hpOf(h), mp: mpOf(h),
    // 健康は HP の今の割合として出しているので、亡くなった人には出さない (HP 0 と食い違わないように)
    attrs: (['power', 'mind', 'hp', 'charm', 'luck', 'fame', 'wealth'] as const).filter((k) => h.alive || k !== 'hp').map((k) => ({ key: k, label: L(...SHORT[k]), v: Math.round(h.stats[k]) })),
    skills: h.traits.map((id) => traitOf(id)).filter((x): x is TraitDef => !!x).map((x) => ({ name: T(x.name), kind: x.kind, learned: !!h.learned?.includes(x.id), ...(h.soul?.traits.includes(x.id) ? { soul: true } : {}) })),
    ...(h.cheat ? { cheat: { name: T(CHEATS[h.cheat].name), desc: T(CHEATS[h.cheat].desc), ...(h.soul?.cheat === h.cheat ? { soul: true } : {}) } } : {}),
    blessing: h.blessing,
    titles: titlesOf(h),
    tactic: TACTIC_NAME[h.policy],
    kills, ...(strongest ? { strongest } : {}), battles,
    revives: { used: h.flags.revived !== undefined, left: h.revives },
    items: h.transfer?.items.map(itemName) ?? [],
    companions: h.people.filter((p) => p.alive && p.until === undefined && WITH.has(p.role)).map((p) => ({ name: p.name, role: L(...ROLE[p.role]) })),
    ...(training ? { training } : {}),
    money: {
      now: formatGold(h.world.id, h.gold ?? h.stats.wealth * 100), debt: (h.gold ?? 0) < 0,
      ...(h.ledger && h.ledger.age >= h.age - 1 ? { inc: formatGold(h.world.id, h.ledger.inc), exp: formatGold(h.world.id, h.ledger.exp) } : {}),
      ...(h.gear ? { gear: T({ ja: MONEY[h.world.id].gear[h.gear - 1][0], en: MONEY[h.world.id].gear[h.gear - 1][1] }) } : {}),
    },
  };
}
