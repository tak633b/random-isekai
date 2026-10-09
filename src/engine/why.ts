// 「なぜ」の一行: その出来事を引き寄せた数字を書く。
// 死の why は、その世界の数字 (5歳までに亡くなる割合・その年齢まで生きる割合) と、
// その人に効いた倍率 (職業・身分・特典) を、平民と比べた何倍かで書く
import type { Hazard, Hero } from './types';
import { traitNotes } from './traits';
import { BLESSING, HAZARDS, hazards, lifeTableFor, lAt, maternalRisk, plagueH, famineH, warServeH, qAt, total, heqOf, type Hazards } from './mortality';
import { jobOf } from './jobs';
import { CHEATS } from './cheats';
import { statusBirth, statusName } from './status';
import { worldPlace } from './worlds';
import { raceOf } from './races';
import { L, T, an, cap, isEn } from '../i18n';

// 直前の出来事に why を付ける
export function because(h: Hero, why: string): void {
  const e = h.log[h.log.length - 1];
  if (e && why) e.why = why.charAt(0).toUpperCase() + why.slice(1);
}

export const pct = (x: number) => (x >= 0.1 ? Math.round(x * 100).toString() : (x * 100).toFixed(x >= 0.01 ? 1 : 2));
// 英語は文の頭を大文字に (部品は文の途中にも置けるよう小文字で書いてある)
export const joinWhy = (parts: (string | false | undefined | null)[]) => { const s = parts.filter(Boolean).join(L('。', '; ')); return isEn ? cap(s) : s; };
const times = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, ''));
const oneIn = (p: number) => Math.max(2, Math.round(1 / Math.max(p, 1e-6)));

// 平民で、特典も職業もない同じ人のハザード。倍率の効き目を比べる相手
function plainHazards(h: Hero): Hazards {
  const plain: Hero = { ...h, status: 'commoner', job: null, cheat: null, rank: undefined, flags: { ...h.flags }, stats: { ...h.stats } };
  delete plain.flags.hero; delete plain.flags.drafted; delete plain.flags.outed;
  return hazards(plain);
}

// 何がその死因を大きくしたか: 平民の何倍か。1.5倍以上なら、いちばん効いた要因の名を添える
function ratioWhy(h: Hero, hz: Hazard): string | null {
  const mine = hazards(h)[hz];
  const base = plainHazards(h)[hz];
  if (base <= 0 || mine / base < 1.5) return null;
  const j = jobOf(h.job);
  // 英語は何が効いたかで言い方を変える (職業は小文字、特典は名を引用、身分は born …)
  const [who, whoEn] = j && (j.risk[hz] ?? 1) > 1.2 || (j?.add?.[hz] ?? 0) > 0 ? [j!.ja, `as ${an(`a ${j!.en.toLowerCase()}`)}`]
    : h.cheat && (CHEATS[h.cheat].mult[hz] ?? 1) > 1 ? [CHEATS[h.cheat].name.ja, `with "${CHEATS[h.cheat].name.en}"`]
      : [statusName(h.status, h.world), `born ${statusBirth(h.status, h.world)}`];
  return L(`この人の${hazardName(hz)}の危険は、${who}だったことで平民の${times(mine / base)}倍だった`,
    `${whoEn}, the risk of ${hazardName(hz).toLowerCase()} was ${times(mine / base)}× that of a commoner`);
}

// 死因の分類の名 (集計と、死因の文が無いときの代わり)
const HAZARD_NAMES: Record<Hazard, [string, string]> = {
  infant: ['幼い日の病', 'Childhood illness'], disease: ['病', 'Illness'], monster: ['魔物', 'Monsters'], violence: ['暴力', 'Violence'],
  war: ['戦争', 'War'], accident: ['事故', 'Accident'], childbirth: ['出産', 'Childbirth'], magic: ['魔法の代償', 'Magic gone wrong'],
  execution: ['処刑', 'Execution'], famine: ['飢え', 'Famine'], plague: ['疫病', 'Plague'], age: ['老い', 'Old age'],
};
export const hazardName = (hz: Hazard) => L(...HAZARD_NAMES[hz]);

// 種族の名の複数形 (英語)。folk / kin と Oni はそのまま
function racePlural(r: string): string {
  if (/(?:folk|kin|Oni)$/.test(r)) return r;
  if (/us$/.test(r)) return r.replace(/us$/, 'i');
  if (/y$/.test(r)) return r.replace(/y$/, 'ies');
  return r.replace(/lf$/, 'lve').replace(/arf$/, 'arve') + 's';
}

// 亡くなったときの why
export function deathWhy(h: Hero, hz: Hazard): string {
  const t = lifeTableFor(h.world, h.race);
  const w = T(h.world.name);
  const age = h.age;
  const race = T(raceOf(h.race).name);
  const reach = L(`この世界で生まれた${race}のうち、${age}歳まで生きるのは約${pct(lAt(t, age))}%`,
    `of ${racePlural(race)} born in this world, about ${pct(lAt(t, age))}% live to ${age}`);
  const parts: (string | null | false)[] = [];
  switch (hz) {
    case 'infant':
      parts.push(L(`${w}では、生まれた子のおよそ${oneIn(1 - lAt(t, 5))}人に1人が5歳までに亡くなる`, `In ${T(worldPlace(h.world))}, about 1 child in ${oneIn(1 - lAt(t, 5))} dies before turning 5`));
      break;
    case 'war':
      parts.push(L(`この世界の戦で従軍した者は、1年でおよそ${pct(1 - Math.exp(-warServeH(h.world)))}%が亡くなる`, `in this world's wars, about ${pct(1 - Math.exp(-warServeH(h.world)))}% of those who serve die each year`));
      break;
    case 'plague':
      parts.push(L(`大疫病の年は、1年でおよそ${pct(1 - Math.exp(-plagueH(h.world)))}%が亡くなる`, `in a plague year, about ${pct(1 - Math.exp(-plagueH(h.world)))}% die within the year`));
      break;
    case 'famine':
      parts.push(L(`飢饉の年は、1年でおよそ${pct(1 - Math.exp(-famineH()))}%が飢えで亡くなる。幼子と年寄りはその倍`, `in a famine year, about ${pct(1 - Math.exp(-famineH()))}% starve, and twice that among the very young and old`));
      break;
    case 'childbirth':
      parts.push(L(`この世界では出産のたびに、およそ${oneIn(maternalRisk(h.world))}人に1人の母親が亡くなる`, `in this world, about 1 mother in ${oneIn(maternalRisk(h.world))} dies with each birth`));
      break;
    case 'age':
      parts.push(reach);
      if (heqOf(h) >= h.world.max - 1) parts.push(L('この世界で人が生きられる年の限りに届いた', 'reached the farthest age anyone lives in this world'));
      break;
    default:
      parts.push(reach, L(`${age}歳の1年で亡くなる確率は約${pct(qAt(t, age))}%`, `at ${age}, the chance of dying within a year is about ${pct(qAt(t, age))}%`));
  }
  if (hz !== 'age' && hz !== 'infant') parts.push(ratioWhy(h, hz));
  parts.push(...traitNotes(h, hz, hazardName(hz)));
  if (h.blessing && heqOf(h) < 16 && (hz === 'infant' || hz === 'disease' || hz === 'monster' || hz === 'accident')) {
    parts.push(L(`女神の加護があった (幼い日の死 ${BLESSING}倍) が、それでも`, `even with the goddess's blessing (childhood deaths ×${BLESSING})`));
  }
  if (h.state.war > 0 && (hz === 'violence' || hz === 'famine')) parts.push(L('戦争の最中だった', 'a war was raging'));
  return joinWhy(parts);
}

// 死の取り消し (死に戻り・不死の体)
export function reviveWhy(h: Hero): string {
  return h.cheat ? L(`${T(CHEATS[h.cheat].name)}の力。残りは${h.revives}回`, `Saved by "${T(CHEATS[h.cheat].name)}" (${h.revives === 1 ? '1 use' : `${h.revives} uses`} left)`) : '';
}

// その年の危険の内訳 (画面の「危険の内訳」用): 大きい順に、割合つき
// notes: その死因に効いている trait と加護 (「頑健な体: 病の死 0.7倍」)
export function riskBreakdown(h: Hero): { hazard: Hazard; label: string; p: number; notes: string[] }[] {
  const z = hazards(h);
  const sum = total(z);
  const young = h.blessing && heqOf(h) < 16;
  return HAZARDS.filter((k) => z[k] > 0).map((k) => {
    const label = hazardName(k);
    const notes = traitNotes(h, k, label);
    if (young && (k === 'infant' || k === 'disease' || k === 'monster' || k === 'accident')) notes.push(L(`女神の加護: ${label}の死 ${BLESSING}倍`, `Goddess's blessing: ${label.toLowerCase()} deaths ×${BLESSING}`));
    return { hazard: k, label, p: sum > 0 ? z[k] / sum : 0, notes };
  }).sort((a, b) => b.p - a.p);
}
