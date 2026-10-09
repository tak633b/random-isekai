// お金 (Unchosen の形を、異世界の16の世界に合わせたもの)。主人公は h.gold (コイン、借金ならマイナス) を持つ。
// 暮らし向き (stats.wealth) はお金から決まる: 暮らし向き 1 = COIN コイン (0〜100 に収める)。出来事の「暮らし向き +3」はコインを足すことになる。
// 1年: 職の稼ぎ (今までの暮らし向きの動きと同じ式) + ギルドの依頼の報酬 + 魔物の懸賞金 + 領地収入 − 暮らしの費用 − 借金の利息。
// 借金が大きくなると取り立て: 身分の低い人は借金奴隷に、高い人は家を失う (成り上がり・没落の仕組みへ)。
// 買い物 (武具・贅沢・賭け) と、病の治療は選択として出る。武具は戦いの死を少し減らし、治療は2年ぶん病の死を減らす。
// 世界ごとのお金の名前・値打ちのあるもの・治療・借り先は src/data/money.ts
import type { Decision, Hazard, Hero, Option, Tie, WorldId } from './types';
import { MONEY, type WorldMoney } from '../data/money';
import { addGold, COIN, log } from './bonds';
import { jobOf } from './jobs';
import { heq, heqOf, ADULT_HEQ } from './mortality';
import { standingOf, statusRank, STATUS_WEALTH } from './status';
import { setStanding } from './climb';
import { anchorsOf } from './anchor';
import { raceOf } from './races';
import { L, isEn } from '../i18n';

const INTEREST = 0.08;                    // 借金の年利
const DEFAULT_AT = -50 * COIN;            // これより借金が深いと取り立てが来る
export const TYCOON = 150 * COIN;            // 大富豪 (実績)
const INTEREST_MAX = 1.5 * COIN;          // 1年の利息の上限 (働けなくなった人の借金が、利息だけで際限なくふくらまないように)
const RANK_PAY = [0, 0.2, 0.5, 1, 1.6, 2.4, 3.5]; // ギルドのランク (F〜S) ごとの、1年の依頼の報酬 (暮らし向き)

const moneyOf = (w: WorldId): WorldMoney => MONEY[w] ?? MONEY.medieval;
const tx = ([ja, en]: [string, string]) => L(ja, en);

/** お金をその世界の言い方で (例: 3金貨25銀貨 / 5,000G / 借金 12両) */
export function formatGold(w: WorldId, coins: number): string {
  const m = moneyOf(w);
  const v = Math.round(Math.abs(coins) * m.rate);
  const neg = coins < 0 ? L('借金 ', 'debt ') : '';
  if (m.symbol) return `${neg}${v.toLocaleString('en-US')}${m.symbol}`;
  if (w === 'modern') return `${neg}${isEn ? `${v.toLocaleString('en-US')} yen` : v >= 10000 ? `${Math.floor(v / 10000).toLocaleString('ja-JP')}万円` : `${v}円`}`;
  const parts: string[] = [];
  let rest = v;
  for (const [ja, en, unit] of m.coins) {
    const n = Math.floor(rest / unit);
    if (n > 0 && parts.length < 2) { parts.push(isEn ? `${n.toLocaleString('en-US')} ${en}` : `${n.toLocaleString('ja-JP')}${ja}`); rest -= n * unit; }
  }
  return neg + (parts.join(isEn ? ', ' : '') || (isEn ? `0 ${m.coins.at(-1)?.[1] ?? ''}` : `0${m.coins.at(-1)?.[0] ?? ''}`));
}
export const moneyName = (w: WorldId): string => { const m = moneyOf(w); return m.symbol ?? (w === 'modern' ? L('円', 'yen') : tx(m.coins[0] ? [m.coins[0][0], m.coins[0][1]] : ['金', 'gold'])); };

export { addGold, COIN };

/** 生まれたときのお金 (身分の暮らし向きから) */
export function initGold(h: Hero): void {
  h.gold = h.stats.wealth * COIN;
}

// ---- 1年の出入り ------------------------------------------------------------------

/** 毎年 (能力の変化のところで)。乱数は取り立ての年だけ引く */
export function econYear(h: Hero): void {
  if (h.gold === undefined) initGold(h);
  const j = jobOf(h.job);
  const working = !!j && h.flags.retired === undefined;
  if (working) {
    // 職の稼ぎと暮らしの費用: 今までの「暮らし向きが職の目安へ毎年1割ずつ近づく」と同じ式を、お金で
    addGold(h, j.wealth * COIN * 0.1);
    addGold(h, -0.1 * Math.max(0, h.gold!));
    if (h.rank && h.flags.guild !== undefined) addGold(h, RANK_PAY['FEDCBAS'.indexOf(h.rank)] * COIN);
  }
  // 魔物の懸賞金 (その年に勝った戦い。竜・魔族は10倍)
  for (let i = h.log.length - 1; i >= 0 && h.log[i].age === h.age; i--) {
    const f = h.log[i].fight;
    if (f && f.result !== 'lose' && (f.foe === 'monster' || f.foe === 'beast' || f.foe === 'dragon' || f.foe === 'demon' || f.foe === 'undead')) addGold(h, (f.foe === 'dragon' || f.foe === 'demon' ? 10 : 1) * 0.5 * COIN);
  }
  // 領地収入
  const st = standingOf(h);
  if (st === 'noble' || st === 'royal') addGold(h, (st === 'royal' ? 6 : 2.5) * COIN);
  // 借金の利息と取り立て
  if (h.gold! < 0) {
    addGold(h, Math.max(-INTEREST_MAX, h.gold! * INTEREST));
    if (h.gold! < DEFAULT_AT && !anchorsOf(h) && h.rng() < 0.35) collect(h);
  }
  inherit(h);
  // 実績のしるし: 借金をした / 返し終えた / 大富豪
  if (h.gold! < 0) h.flags.inDebt ??= h.age;
  else if (h.flags.inDebt !== undefined && h.flags.debtFree === undefined) { h.flags.debtFree = h.age; log(h, L('借金を、ついに返し終えた。', 'Finally paid off the last of the debt.'), 'work', true); }
  if (h.gold! >= TYCOON) h.flags.tycoon ??= h.age;
}

function collect(h: Hero): void {
  const m = moneyOf(h.world.id);
  const low = statusRank(standingOf(h)) <= statusRank('commoner');
  h.flags.defaulted = h.age;
  if (low && standingOf(h) !== 'slave') {
    h.flags.debtSlave = h.age;
    addGold(h, -h.gold!);
    setStanding(h, 'slave', L(`${tx(m.lender)}への借金が返せず、借金奴隷として売られた。`, `Unable to repay ${tx(m.lender)}, {name} was sold into debt slavery.`).replace('{name}', h.given));
  } else {
    addGold(h, -h.gold! * 0.5);
    h.flags.ruined = h.age; // 次の身分の見直しで没落 (climb.ts の fortuneYear)
    log(h, L(`取り立てが屋敷に来て、家財を運び出していった。`, 'The debt collectors came to the house and carried off the furniture.'), 'loss', true);
  }
}

// ---- 輪の人のお金と、遺産 ------------------------------------------------------------

/** 輪の人のお金 (表示と遺産用)。家の身分・年齢と seed から決まる。乱数は引かない */
export function tieGold(h: Hero, t: Tie): number {
  // 職 (people.ts が横の乱数で決める) は使わない: 輪の人の一生の仕組みを切っても、主人公の人生が同じになるように
  const base = STATUS_WEALTH[t.role === 'mother' || t.role === 'father' || t.role === 'sibling' || t.role === 'spouse' || t.role === 'child' ? h.status : 'commoner'];
  const e = heq(t.age, raceOf(t.race));
  const ageK = e < 16 ? 0.1 : e < 25 ? 0.5 : e < 60 ? 1 : 1.2;
  const r = ((h.seed * 2654435761 + t.id * 40503) >>> 0) / 4294967296;
  return Math.round(base * COIN * ageK * (0.5 + r));
}

// 親・連れ合いが亡くなった年に、遺産を受け継ぐ (親はきょうだいと分ける)。同じ人から二度は受け取らない
function inherit(h: Hero): void {
  for (const t of h.people) {
    if (t.alive || t.diedAt !== h.age || (t.role !== 'mother' && t.role !== 'father' && t.role !== 'spouse') || h.flags[`inh.${t.id}`] !== undefined) continue;
    h.flags[`inh.${t.id}`] = h.age;
    const sibs = t.role === 'spouse' ? 0 : h.people.filter((x) => x.role === 'sibling' && x.alive).length;
    const v = Math.round(tieGold(h, t) / (1 + sibs));
    if (v <= 0) continue;
    addGold(h, v);
    log(h, L(`${t.name}の遺したものから、${formatGold(h.world.id, v)}を受け継いだ。`, `Inherited ${formatGold(h.world.id, v)} from what ${t.name} left behind.`), 'family', false, [t.id]);
  }
}

// ---- 選択: 買い物と治療 -------------------------------------------------------------

const GEAR_COST = [5, 12, 25];             // 武具の3段の値段 (暮らし向き)

const pay = (h: Hero, cost: number) => addGold(h, -cost);
const short = (h: Hero, cost: number) => cost > Math.max(0, h.gold ?? 0);
const borrowHint = (h: Hero, cost: number) => (short(h, cost) ? L(`足りない分は${tx(moneyOf(h.world.id).lender)}から借りる`, `borrow the rest from ${tx(moneyOf(h.world.id).lender)}`) : '');

type ShopOpt = 'gear' | 'luxury' | 'gamble' | 'save';
function shopDecision(h: Hero, ref: string, opts: ShopOpt[]): Decision {
  const m = moneyOf(h.world.id), w = h.world.id;
  const tier = Math.min(2, h.gear ?? 0);
  const cost = { gear: GEAR_COST[tier] * COIN, luxury: 15 * COIN, gamble: 3 * COIN, save: 0 };
  const label: Record<ShopOpt, string> = {
    gear: L(`${tx(m.gear[tier])}を買う`, `Buy ${tx(m.gear[tier])}`),
    luxury: L(`${tx(m.luxury)}を手に入れる`, `Get ${tx(m.luxury)}`),
    gamble: L(`${tx(m.gamble)}に賭ける`, `Bet on ${tx(m.gamble)}`),
    save: L('買わずに貯めておく', 'Save the money'),
  };
  const options: Option[] = opts.map((k) => {
    const c = cost[k];
    const hint = [c ? formatGold(w, c) : '', k === 'gamble' ? '' : borrowHint(h, c)].filter(Boolean).join(L('・', ' · '));
    return {
      label: label[k], ...(hint ? { hint: cap(hint) } : {}),
      apply: (x: Hero) => {
        if (k === 'gear') { pay(x, c); x.gear = tier + 1; log(x, L(`${tx(m.gear[tier])}を手に入れた。身を守る備えが一段上がった。`, `Acquired ${tx(m.gear[tier])}. Better protected now.`), 'work'); }
        if (k === 'luxury') { pay(x, c); bumpHappy(x, 8); log(x, L(`${tx(m.luxury)}を手に入れた。少し胸を張って歩くようになった。`, `Acquired ${tx(m.luxury)}. Walked a little taller after that.`), 'family'); }
        if (k === 'gamble') {
          const win = x.rng() < (x.policy === 'bold' ? 0.42 : 0.45);
          addGold(x, win ? c * 1.5 : -c);
          log(x, win ? L(`${tx(m.gamble)}で大勝ちした。${formatGold(w, c * 1.5)}になった。`, `Won big at ${tx(m.gamble)}: ${formatGold(w, c * 1.5)}.`)
            : L(`${tx(m.gamble)}で${formatGold(w, c)}すった。`, `Lost ${formatGold(w, c)} at ${tx(m.gamble)}.`), 'hard');
        }
      },
    };
  });
  return {
    title: L('市の立つ日', 'Market day'),
    text: L(`手もとには ${formatGold(w, h.gold ?? 0)}。この世界で値打ちがあるのは${m.valuables.map(tx).join('や')}。`, `You have ${formatGold(w, h.gold ?? 0)}. Here, ${m.valuables.map(tx).join(' and ')} are what people value.`),
    ref, options,
    // 作戦: いのちだいじには貯める、ガンガンいこうぜは借りてでも武具か賭け、バランスはくじ
    auto: (x) => {
      if (x.policy === 'careful') return opts.indexOf('save');
      if (x.policy === 'bold') { const g = opts.indexOf('gear'); return g >= 0 ? g : Math.max(0, opts.indexOf('gamble')); }
      // バランスよく: 手持ちで買えるものの中からくじ (借りてまでは買わない)
      const ok = opts.map((k, i) => [k, i] as const).filter(([k]) => cost[k] <= Math.max(0, x.gold ?? 0));
      return ok[Math.floor(x.rng() * ok.length)][1];
    },
  };
}
function bumpHappy(h: Hero, v: number): void { h.stats.happy = Math.min(100, h.stats.happy + v); }

function sickDecision(h: Hero, ref: string, hz: Hazard): Decision {
  const m = moneyOf(h.world.id), w = h.world.id;
  const good = 8 * COIN, cheap = 2 * COIN;
  const sick = hz === 'plague' ? L('疫病', 'the plague') : L('重い病', 'a serious illness');
  const mk = (label: string, c: number, k: number, text: string, hint: string): Option => ({
    label, ...(hint ? { hint: cap(hint) } : {}),
    apply: (x) => { pay(x, c); x.sick = { until: x.age + 2, k }; log(x, text, 'ill', c > cheap); },
  });
  const options = [
    mk(L(`${tx(m.healers[1])}を受ける`, `Get ${tx(m.healers[1])}`), good, 0.5, L(`${tx(m.healers[1])}で、病は峠を越えた。`, `${cap(tx(m.healers[1]))} pulled {name} through.`).replace('{name}', h.given), [formatGold(w, good), borrowHint(h, good)].filter(Boolean).join(L('・', ' · '))),
    mk(L(`${tx(m.healers[0])}でしのぐ`, `Make do with ${tx(m.healers[0])}`), cheap, 0.8, L(`${tx(m.healers[0])}でしのいだ。長く患った。`, `Got by on ${tx(m.healers[0])}. The illness dragged on.`), formatGold(w, cheap)),
    mk(L('何もせず寝て治す', 'Rest and hope'), 0, 1.3, L('寝て治そうとした。なかなか治らなかった。', 'Tried to sleep it off. It did not go away.'), L('治りにくい', 'slow to heal')),
  ];
  return {
    title: L(`${sick}にかかった`, `Fell ill with ${sick}`), text: L(`手もとには ${formatGold(w, h.gold ?? 0)}。`, `You have ${formatGold(w, h.gold ?? 0)}.`), ref, options,
    // いのちだいじには借りてでも良い治療、ガンガンいこうぜは寝て治す、バランスは払えるなら良い治療
    auto: (x) => (x.policy === 'careful' ? 0 : x.policy === 'bold' ? 2 : short(x, good) ? 1 : 0),
  };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SHOP_GAP = 7;
/** その年に出す選択 (市の立つ日・病)。乱数は病の引き1回と、市の日の候補の並びに使う */
export function econDecisions(h: Hero): Decision[] {
  if (anchorsOf(h) || !h.alive) return [];
  const out: Decision[] = [];
  const e = heqOf(h);
  // 病: 成人の年に 4% (ほかの人の一生は除く)
  if (e >= 5 && h.rng() < 0.04) {
    const hz: Hazard = h.state.plague > 0 ? 'plague' : 'disease';
    out.push(sickDecision(h, `sick:${hz}`, hz));
  }
  // 市の立つ日: 大人になってから SHOP_GAP 年ごと (seed でずらす)
  if (e >= ADULT_HEQ && (h.age + h.seed) % SHOP_GAP === 0) {
    const opts: ShopOpt[] = [...((h.gear ?? 0) < 3 ? ['gear' as const] : []), 'luxury', 'gamble', 'save'];
    out.push(shopDecision(h, `shop:${opts.join(',')}`, opts));
  }
  return out;
}

/** 保存から戻すとき */
export function econByRef(h: Hero, ref: string): Decision | null {
  const [k, v] = ref.split(':');
  if (k === 'sick') return sickDecision(h, ref, v as Hazard);
  if (k === 'shop') return shopDecision(h, ref, v.split(',') as ShopOpt[]);
  return null;
}

