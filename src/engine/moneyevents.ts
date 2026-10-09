// お金のハラハラ (Unchosen の形): 闇金の誘い・友の借金の頼み・身代金・持参金・うまい儲け話・徴税官。
// 大人の年に 7% で一つ (条件に合うものから)。結果の多くは数年後に出る (重みは選んだ時に引いて h.money に持つ。同じ seed は同じ結末)。
// 闇金の取り立ては、払えなければけがと家族への脅し、さらに深い借金は econ.ts の取り立て (借金奴隷・没落) へ
import type { Decision, Hero, Option, Tie } from './types';
import { MONEY, type WorldMoney } from '../data/money';
import { addGold, bump, COIN, log } from './bonds';
import { formatGold } from './econ';
import { ADULT_HEQ, heq, heqOf } from './mortality';
import { raceOf } from './races';
import { anchorsOf } from './anchor';
import { L } from '../i18n';

type T2 = [string, string];
const tx = ([ja, en]: T2) => L(ja, en);
const mo = (h: Hero): WorldMoney => MONEY[h.world.id] ?? MONEY.medieval;
const g = (h: Hero, c: number) => formatGold(h.world.id, c);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const near = (h: Hero) => h.people.filter((t) => t.alive && t.until === undefined);
const short = (h: Hero, c: number) => c > Math.max(0, h.gold ?? 0);
const borrowHint = (h: Hero, c: number) => (short(h, c) ? L(`足りない分は${tx(mo(h).lender)}から借りる`, `borrow the rest from ${tx(mo(h).lender)}`) : '');

export const EVENT_P = 0.07;
const SHADY = 20 * COIN, LEND = 10 * COIN, RANSOM = 25 * COIN, DOWRY = [15 * COIN, 5 * COIN];
type Kind = 'shady' | 'lend' | 'ransom' | 'dowry' | 'invest' | 'tax';

// 選んだ一人 (ref に id を入れて、保存から戻せるようにする)
const tieOf = (h: Hero, id: number): Tie | undefined => h.people.find((t) => t.id === id);

function decide(h: Hero, ref: string, title: string, text: string, options: Option[], auto: (x: Hero) => number): Decision {
  return { title, text, ref, options: options.map((o) => (o.hint ? { ...o, hint: cap(o.hint) } : o)), auto };
}

function build(h: Hero, kind: Kind, id: number): Decision | null {
  const m = mo(h);
  const ref = `mev:${kind}:${id}`;
  const t = tieOf(h, id);
  switch (kind) {
    case 'shady': return decide(h, ref, L('うまい話', 'An easy offer'),
      L(`${tx(m.shady)}が近づいてきた。「今すぐ ${g(h, SHADY)} 貸そう。返すのは三年後でいい」`, `${cap(tx(m.shady))} approached. "I'll lend you ${g(h, SHADY)} right now. Pay me back in three years."`), [
        { label: L('借りる', 'Take it'), hint: L(`三年後に ${g(h, SHADY * 1.8)} を返す`, `repay ${g(h, SHADY * 1.8)} in three years`),
          apply: (x) => { addGold(x, SHADY); x.money = { ...x.money, shady: { amt: SHADY * 1.8, due: x.age + 3 } }; log(x, L(`${tx(m.shady)}から ${g(x, SHADY)} を借りた。証文には読めない小さな字が並んでいた。`, `Borrowed ${g(x, SHADY)} from ${tx(m.shady)}. The contract had very small print.`), 'hard'); } },
        { label: L('断る', 'Refuse'), apply: (x) => log(x, L('男は肩をすくめて去っていった。「気が変わったら、いつでも」', 'They shrugged and left. "If you change your mind, anytime."'), 'hard') },
      ], (x) => (x.policy === 'bold' ? 0 : x.policy === 'careful' ? 1 : Math.floor(x.rng() * 2)));
    case 'lend': return t ? decide(h, ref, L(`${t.name}の頼み`, `${t.name} asks a favor`),
      L(`${t.name}に、${g(h, LEND)} 貸してくれないかと頭を下げられた。`, `${t.name} bowed and asked to borrow ${g(h, LEND)}.`), [
        { label: L('貸す', 'Lend it'), hint: borrowHint(h, LEND),
          apply: (x) => {
            addGold(x, -LEND);
            const r = x.rng();
            const out = r < 0.45 ? 'repay' : r < 0.7 ? 'part' : 'gone';
            x.money = { ...x.money, lent: { tie: id, amt: LEND, due: x.age + 2 + (id % 3), out } };
            const tt = tieOf(x, id); if (tt) tt.bond = Math.min(100, tt.bond + 8);
            log(x, L(`${t.name}に ${g(x, LEND)} を貸した。`, `Lent ${t.name} ${g(x, LEND)}.`), 'love', false, [id]);
          } },
        { label: L('断る', 'Refuse'), hint: L('仲が冷える', 'it will cool things'),
          apply: (x) => { const tt = tieOf(x, id); if (tt) tt.bond = Math.max(0, tt.bond - 12); log(x, L(`${t.name}の頼みを断った。しばらく、目を合わせてもらえなかった。`, `Turned down ${t.name}. They avoided {name}'s eyes for a while.`).replace('{name}', x.given), 'hard', false, [id]); } },
      ], (x) => (x.policy === 'careful' ? 1 : x.policy === 'bold' ? 0 : short(x, LEND) ? 1 : Math.floor(x.rng() * 2))) : null;
    case 'ransom': return t ? decide(h, ref, L(`${t.name}がさらわれた`, `${t.name} has been taken`),
      L(`${tx(m.kidnap)}が${t.name}をさらい、${g(h, RANSOM)} を要求してきた。`, `${cap(tx(m.kidnap))} took ${t.name} and demanded ${g(h, RANSOM)}.`), [
        { label: L('払う', 'Pay'), hint: [g(h, RANSOM), borrowHint(h, RANSOM)].filter(Boolean).join(L('・', ' · ')),
          apply: (x) => { addGold(x, -RANSOM); log(x, L(`${g(x, RANSOM)} を払い、${t.name}は無事に帰ってきた。`, `Paid ${g(x, RANSOM)}. ${t.name} came home safe.`), 'family', true, [id]); } },
        { label: L('値切る', 'Haggle'), hint: L('半額で済むかもしれない', 'might cost only half'),
          apply: (x) => {
            if (x.rng() < 0.5) { addGold(x, -RANSOM / 2); log(x, L(`粘り強く交渉し、半額の ${g(x, RANSOM / 2)} で${t.name}を取り戻した。`, `Haggled hard and got ${t.name} back for half: ${g(x, RANSOM / 2)}.`), 'family', true, [id]); }
            else hostageLost(x, id, L(`交渉は決裂した。`, 'The talks broke down.'));
          } },
        { label: L('自分で助けに行く', 'Go and rescue them'), hint: L('戦いになる', 'it will come to a fight'),
          apply: (x) => {
            if (x.rng() < 0.4 + Math.min(0.4, x.level / 100)) { bump(x, { fame: 5 }); const tt = tieOf(x, id); if (tt) tt.bond = Math.min(100, tt.bond + 15); log(x, L(`夜明け前に隠れ家へ踏み込み、${t.name}を連れ帰った。`, `Stormed the hideout before dawn and brought ${t.name} home.`), 'battle', true, [id]).fight = { foe: 'bandit', result: 'win' }; }
            else { bump(x, { hp: -12 }); hostageLost(x, id, L('助けに行ったが、間に合わなかった。', 'The rescue came too late.')); }
          } },
      ], (x) => (x.policy === 'careful' ? 0 : x.policy === 'bold' ? 2 : short(x, RANSOM) ? 1 : 0)) : null;
    case 'dowry': return t ? decide(h, ref, L(`${t.name}の縁談`, `${t.name}'s marriage`),
      L(`${t.name}に縁談がまとまりかけている。支度にいくら出す?`, `A match for ${t.name} is nearly settled. How much will you give toward it?`), [
        { label: L('ふさわしい支度をする', 'A proper dowry'), hint: [g(h, DOWRY[0]), borrowHint(h, DOWRY[0])].filter(Boolean).join(L('・', ' · ')),
          apply: (x) => { addGold(x, -DOWRY[0]); bump(x, { fame: 3, charm: 2 }); const tt = tieOf(x, id); if (tt) tt.bond = Math.min(100, tt.bond + 10); log(x, L(`${t.name}を、恥ずかしくない支度で送り出した。`, `Sent ${t.name} off with a dowry to be proud of.`), 'family', true, [id]); } },
        { label: L('身の丈の支度', 'A modest one'), hint: g(h, DOWRY[1]),
          apply: (x) => { addGold(x, -DOWRY[1]); log(x, L(`身の丈の支度で、${t.name}は嫁いでいった。`, `${t.name} married with a modest dowry.`), 'family', false, [id]); } },
        { label: L('出さない', 'Give nothing'), hint: L('縁談が流れるかもしれない', 'the match may fall through'),
          apply: (x) => { const tt = tieOf(x, id); if (tt) tt.bond = Math.max(0, tt.bond - 15); log(x, L(`支度金が出せず、${t.name}の縁談は流れた。`, `With no dowry, ${t.name}'s match fell through.`), 'loss', false, [id]); } },
      ], (x) => (x.policy === 'bold' ? 0 : short(x, DOWRY[0]) ? (short(x, DOWRY[1]) ? 2 : 1) : x.policy === 'careful' ? 1 : 0)) : null;
    case 'invest': {
      const amt = id; // 額は出た年に決めて ref に持つ (その年のうちにお金が動いても、保存から同じ話で戻る)
      return decide(h, ref, L('うまい儲け話', 'A golden opportunity'),
        L(`${m.valuables.map(tx).join('や')}の取引で一山当てる話を持ちかけられた。手持ちの半分、${g(h, amt)} を出せば、三年後には数倍になるという。`,
          `Someone pitched a scheme in ${m.valuables.map(tx).join(' and ')}: put in half your savings, ${g(h, amt)}, and it will multiply in three years.`), [
          { label: L('出資する', 'Invest'), hint: L('当たれば数倍、外れれば無一文', 'big win or nothing'),
            apply: (x) => { const a = amt; addGold(x, -a); const r = x.rng(); x.money = { ...x.money, invest: { amt: a, due: x.age + 3, mult: r < 0.3 ? 3 : r < 0.7 ? 1.1 : 0 } }; log(x, L(`儲け話に ${g(x, a)} を出した。`, `Put ${g(x, a)} into the scheme.`), 'work'); } },
          { label: L('話に乗らない', 'Pass'), apply: (x) => log(x, L('儲け話には乗らなかった。', 'Passed on the scheme.'), 'work') },
        ], (x) => (x.policy === 'bold' ? 0 : x.policy === 'careful' ? 1 : Math.floor(x.rng() * 2)));
    }
    case 'tax': {
      const amt = id;
      return decide(h, ref, L('徴税官が来た', 'The tax collector'),
        L(`税の重い年。徴税官が ${g(h, amt)} を取り立てに来た。`, `A heavy tax year. The collector came for ${g(h, amt)}.`), [
          { label: L('払う', 'Pay'), apply: (x) => { addGold(x, -amt); log(x, L(`税を ${g(x, amt)} 払った。`, `Paid ${g(x, amt)} in taxes.`), 'hard'); } },
          { label: L('財産を隠す', 'Hide your wealth'), hint: L('見つかれば倍の罰金', 'double fine if caught'),
            apply: (x) => { if (x.rng() < 0.3) { addGold(x, -amt * 2); bump(x, { fame: -3 }); x.flags.taxCaught = x.age; log(x, L(`隠し財産が見つかり、倍の罰金を取られた。`, 'The hidden wealth was found. The fine was double.'), 'hard', true); } else log(x, L('床下の財産は見つからなかった。', 'The money under the floor went unnoticed.'), 'hard'); } },
          { label: L('夜逃げする', 'Flee by night'), hint: L('家を捨てる', 'leave home behind'),
            apply: (x) => { addGold(x, -amt * 0.3); bump(x, { happy: -8, charm: -2 }); log(x, L('荷物をまとめて、夜のうちに町を出た。', 'Packed up and left town in the night.'), 'loss', true); } },
        ], (x) => (x.policy === 'careful' ? 0 : x.policy === 'bold' ? 1 : Math.floor(x.rng() * 2)));
    }
  }
}

function hostageLost(h: Hero, id: number, why: string): void {
  const t = tieOf(h, id);
  if (!t) return;
  // 半分は帰ってくるが深い傷を負い、半分は帰らない (重みは選んだ年の乱数)
  if (h.rng() < 0.5) { t.bond = Math.max(0, t.bond - 10); log(h, L(`${why}${t.name}は数か月後、ひどく痩せて帰ってきた。`, `${why} ${t.name} came back months later, gaunt and shaken.`), 'loss', true, [id]); return; }
  t.alive = false; t.diedAt = h.age;
  bump(h, { happy: -15 * (0.5 + t.bond / 100) });
  const e = log(h, L(`${why}${t.name}は帰らなかった。`, `${why} ${t.name} never came home.`), 'loss', true, [id]);
  e.leave = [id];
}

/** その年のお金の出来事 (7%、大人)。候補から一つ */
export function moneyEvent(h: Hero): Decision | null {
  if (anchorsOf(h) || !h.alive || heqOf(h) < ADULT_HEQ || h.rng() >= EVENT_P) return null;
  const ppl = near(h);
  const kinds: [Kind, number][] = [];
  if (h.stats.wealth < 25 || (h.sick && h.sick.until >= h.age)) if (!h.money?.shady) kinds.push(['shady', 0]);
  const friend = ppl.find((t) => (t.role === 'friend' || t.role === 'sibling' || t.role === 'companion') && heq(t.age, raceOf(t.race)) >= ADULT_HEQ);
  if (friend && !h.money?.lent) kinds.push(['lend', friend.id]);
  const kin = ppl.find((t) => t.role === 'spouse' || t.role === 'child');
  if (kin && h.world.danger >= 3) kinds.push(['ransom', kin.id]);
  const kid = ppl.find((t) => t.role === 'child' && heq(t.age, raceOf(t.race)) >= 17 && heq(t.age, raceOf(t.race)) <= 30 && h.flags[`dowry.${t.id}`] === undefined);
  if (kid) kinds.push(['dowry', kid.id]);
  if ((h.gold ?? 0) >= 20 * COIN && !h.money?.invest) kinds.push(['invest', Math.round(h.gold! * 0.5)]);
  kinds.push(['tax', Math.round(Math.max(2 * COIN, (h.gold ?? 0) * 0.15))]);
  const [kind, id] = kinds[Math.floor(h.rng() * kinds.length)];
  if (kind === 'dowry') h.flags[`dowry.${id}`] = h.age;
  return build(h, kind, id);
}

export function moneyEventByRef(h: Hero, ref: string): Decision | null {
  const [, kind, id] = ref.split(':');
  return build(h, kind as Kind, Number(id));
}

/** 毎年: 何年か後に出る結末 (闇金の返済・貸した金・儲け話) */
export function moneyDue(h: Hero): void {
  const mny = h.money;
  if (!mny) return;
  const m = mo(h);
  if (mny.shady && h.age >= mny.shady.due) {
    const amt = mny.shady.amt;
    h.money = { ...h.money, shady: undefined };
    addGold(h, -amt);
    if ((h.gold ?? 0) < 0) {
      // 払いきれない: 取り立て屋が来る (けがと、家族への脅し)。借金はそのまま残り、深ければ econ.ts の取り立てへ
      bump(h, { hp: -10, happy: -8 });
      for (const t of near(h)) if (t.role === 'spouse' || t.role === 'child') t.bond = Math.max(0, t.bond - 5);
      h.flags.shadyBeaten = h.age;
      log(h, L(`${tx(m.shady)}の取り立て屋が来た。払えない分は、殴られて、家族の前で証文を突きつけられた。`, `${cap(tx(m.shady))}'s collectors came. What couldn't be paid was taken out in blows, in front of the family.`), 'hard', true);
    } else log(h, L(`${tx(m.shady)}に ${g(h, amt)} を返し終えた。二度と借りないと決めた。`, `Paid ${tx(m.shady)} back ${g(h, amt)}. Never again.`), 'hard');
  }
  const ln = h.money?.lent;
  if (ln && h.age >= ln.due) {
    h.money = { ...h.money, lent: undefined };
    const t = tieOf(h, ln.tie);
    const nm = t?.name ?? L('あの人', 'they');
    if (ln.out === 'repay') { addGold(h, ln.amt * 1.2); log(h, L(`${nm}が、礼を添えて ${g(h, ln.amt * 1.2)} を返しに来た。`, `${nm} came to repay ${g(h, ln.amt * 1.2)}, with thanks.`), 'love', false, t ? [t.id] : undefined); }
    else if (ln.out === 'part') { addGold(h, ln.amt * 0.4); log(h, L(`${nm}は、半分も返せないと詫びた。${g(h, ln.amt * 0.4)} だけ受け取った。`, `${nm} apologized, unable to repay even half. {name} took ${g(h, ln.amt * 0.4)}.`).replace('{name}', h.given), 'hard', false, t ? [t.id] : undefined); }
    else if (t && t.alive) { t.until = h.age; t.bond = Math.max(0, t.bond - 30); const e = log(h, L(`${nm}は、借りた金を返さないまま町から姿を消した。`, `${nm} vanished from town without repaying a coin.`), 'loss', true, [t.id]); e.leave = [t.id]; }
  }
  const iv = h.money?.invest;
  if (iv && h.age >= iv.due) {
    h.money = { ...h.money, invest: undefined };
    const back = Math.round(iv.amt * iv.mult);
    if (back > 0) addGold(h, back);
    log(h, iv.mult >= 3 ? L(`儲け話が大当たりした。${g(h, back)} が戻ってきた。`, `The scheme hit big: ${g(h, back)} came back.`)
      : iv.mult > 0 ? L(`儲け話は、まあまあだった。${g(h, back)} が戻ってきた。`, `The scheme did all right: ${g(h, back)} came back.`)
        : L('儲け話の男は、出資金ごと姿を消していた。', 'The man behind the scheme had vanished with the money.'), iv.mult >= 3 ? 'fame' : 'hard', iv.mult >= 3 || iv.mult === 0);
  }
}
