// 岐路 (「80억 분의 1」の、歴史が一人に届く形を異世界に): 戦の召集・疫病の年・魔王の時代が、その年の主人公の年齢で選択になって届く。
// ほかに、罪と前科 (酒場の決闘・飢饉のパン・牢の家族・ぬれぎぬ)、信仰の揺れ (遠のく・改宗・家族の反対と和解)、家族 (双子・養子・生みの親・きょうだいの命日)。
// 約束: 主人公の乱数 (h.rng) は引かない。引くのは seed と年齢から作る横の乱数だけ (同じ seed なら同じ一生。ほかの仕組みの乱数の並びも崩さない)。
// ほかの人の一生 (錨のある人生) では何も起こさない。選択は1年に1つまで
import type { Decision, Hero, Option, Tie } from './types';
import type { Die } from './events';
import { makeRng, pickWeighted, type Rng } from './rng';
import { addGold, addTie, bump, byRole, callName, COIN, log, shared } from './bonds';
import { ADULT_HEQ, ageOfHeq, heq, heqOf, isFantasy } from './mortality';
import { raceOf } from './races';
import { godName, personName, styleOf, worldNames } from './names';
import { anchorsOf } from './anchor';
import { formatGold } from './econ';
import { tacticFight } from './tactic';
import { fightOf, foeFor } from './fight';
import { alliesFor } from './people';
import { demonKingWorld } from './worlds';
import { L, cap, pron } from '../i18n';

type Kind = 'draft' | 'plague' | 'demon' | 'bread' | 'orphan' | 'jail' | 'accused' | 'duel' | 'convert' | 'roots';
const KINDS: Kind[] = ['draft', 'plague', 'demon', 'bread', 'orphan', 'jail', 'accused', 'duel', 'convert', 'roots'];

// ---- 横の乱数 ---------------------------------------------------------------

function mix(...n: number[]): number {
  let x = 0x811c9dc5;
  for (const v of n) { x = Math.imul(x ^ (v >>> 0), 0x01000193); x ^= x >>> 15; }
  return x >>> 0;
}
const K_YEAR = 0x7c01, K_APPLY = 0x7c40, K_GOD = 0xfa17;
const yearRng = (h: Hero): Rng => makeRng(mix(h.seed, h.age, K_YEAR));
// 選んだ後の結末の乱数 (保存から戻しても、自動で選んでも同じ結末)
const applyRng = (h: Hero, k: Kind): Rng => makeRng(mix(h.seed, h.age, K_APPLY + KINDS.indexOf(k)));
const clamp01 = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- 前科 -------------------------------------------------------------------

// 前科 (しるし record = 付いた年齢)。この年数で帳簿から消える。それまではギルドの昇格がしにくい (arc.ts の promote)
export const RECORD_YEARS = 6;
export const RECORD_DRAG = 0.25;
export const recordDrag = (h: Hero): number => (h.flags.record !== undefined ? RECORD_DRAG : 1);
function record(h: Hero): void { h.flags.record = h.age; }

// ---- 呼び名 -----------------------------------------------------------------

const g = (h: Hero, c: number) => formatGold(h.world.id, c);
const short = (h: Hero, c: number) => c > Math.max(0, h.gold ?? 0);
const tieOf = (h: Hero, id: number): Tie | undefined => h.people.find((t) => t.id === id);
const heqT = (t: Tie) => heq(t.age, raceOf(t.race));
function dkName(h: Hero): [string, string] {
  switch (styleOf(h.world)) {
    case 'wa': return ['鬼の王', 'the King of the Oni'];
    case 'zh': return ['魔尊', 'the Demon Sovereign'];
    default: return ['魔王', 'the Demon Lord'];
  }
}
const FOOD: Record<string, [string, string]> = { wa: ['握り飯', 'rice ball'], zh: ['饅頭', 'steamed bun'] };
const foodOf = (h: Hero): [string, string] => FOOD[styleOf(h.world)] ?? ['パン', 'loaf of bread'];
// 改宗の誘いの神 (その世界の神とは別の名)。seed から決まる
export function otherGod(h: Hero): string {
  const own = worldNames(h).god;
  const r = makeRng(mix(h.lineage?.rootSeed ?? h.seed, K_GOD));
  let n = godName(r, h.world);
  for (let i = 0; i < 6 && n === own; i++) n = godName(r, h.world);
  return n;
}

// ---- 選択 -------------------------------------------------------------------

function decide(h: Hero, kind: Kind, id: number, title: string, text: string, options: Option[], auto: (x: Hero, r: Rng) => number): Decision {
  return { title, text, ref: `xr:${kind}:${id}`, options: options.map((o) => (o.hint ? { ...o, hint: cap(o.hint) } : o)), auto: (x) => auto(x, makeRng(mix(x.seed, x.age, K_APPLY + 99))) };
}
const pickBy = (x: Hero, safe: number, brave: number, r: Rng, normal: number[]) =>
  (x.policy === 'careful' ? safe : x.policy === 'bold' ? brave : normal[Math.floor(r() * normal.length)]);

// 腕の立ち具合 (0.15〜0.9): 強さとレベル。作戦で挑む人ほど危うい
const prowess = (h: Hero) => clamp01(0.3 + h.stats.power / 220 + h.level / 130, 0.15, 0.9);

function build(h: Hero, kind: Kind, id: number, die: Die): Decision | null {
  const n = worldNames(h);
  const nm = h.given;
  switch (kind) {
    case 'draft': {
      const SUB = 12 * COIN;
      const ally = alliesFor(h)[0];
      const [wja, wen] = ally ? [`${ally.name}と並んで`, ` alongside ${ally.name}`] : ['', ''];
      return decide(h, kind, id, L('召集令状', 'Called to arms'),
        L(`戦の触れが村々に回り、${nm}の名も兵の名簿に載った。`, `The muster rolls went up in every village, and ${nm}'s name was on one.`), [
          { label: L('戦に出る', 'Go to war'), hint: L('戦の危険を負う', "you will carry the war's dangers"),
            apply: (x) => { log(x, L(`徴兵され、${wja}戦に出た。`, `Was conscripted and went to war${wen}.`), 'battle', true).fight = fightOf(x, foeFor(x, 'war', '')); } },
          { label: L('逃げる', 'Desert'), hint: L('見つかれば罪になる', 'a crime if caught'),
            apply: (x) => {
              delete x.flags.drafted;
              const r = applyRng(x, kind);
              if (r() < clamp01(0.5 - x.stats.luck / 250, 0.15, 0.5)) {
                record(x); bump(x, { fame: -5, happy: -8, hp: -4 });
                log(x, L('脱走は三日で見つかった。鞭の痕と、消えない記録が残った。', 'The desertion lasted three days. It ended with a flogging and a record that would not wash off.'), 'hard', true);
                if (r() < 0.03) die(x, 'execution');
              } else { bump(x, { happy: -5, charm: -2 }); log(x, L('夜のうちに荷をまとめ、山向こうの村に名を変えて潜り込んだ。', 'Slipped away by night and turned up over the hills under another name.'), 'hard', true); }
            } },
          { label: L('身代わりを雇う', 'Pay a substitute'), hint: short(h, SUB) ? L(`${g(h, SUB)}・足りない分は借りる`, `${g(h, SUB)}, borrowing the rest`) : g(h, SUB),
            apply: (x) => {
              delete x.flags.drafted; addGold(x, -SUB); bump(x, { happy: -4 });
              log(x, L(`${g(x, SUB)}で身代わりを雇った。名も知らない若者が、自分の名で戦に出ていった。`, `Paid ${g(x, SUB)} for a substitute. A young stranger marched off to war under ${pron(x.sex, 'his')} name.`), 'hard', true);
            } },
        ], (x, r) => pickBy(x, short(x, SUB) ? 0 : 2, 0, r, [0, 0, 0, short(x, SUB) ? 0 : 2]));
    }
    case 'plague': {
      const FLEE = 5 * COIN;
      return decide(h, kind, id, L('疫病の年', 'The plague year'),
        L(`${n.town}に大疫病が入ってきた。門が閉じられる前に、決めなければならない。`, `The great plague reached ${n.town}. The gates would close soon. A choice had to be made.`), [
          { label: L('町を逃げ出す', 'Flee the city'), hint: L(`${g(h, FLEE)}・道中も危ない`, `${g(h, FLEE)}, and the roads are not safe`),
            apply: (x) => {
              addGold(x, -FLEE); x.sick = { until: x.age + 1, k: Math.min(x.sick?.until !== undefined && x.sick.until > x.age ? x.sick.k : 1, 0.35) };
              log(x, L(`荷車に積めるだけ積んで、${n.town}を後にした。振り返ると、鐘が鳴りやまなかった。`, `Loaded what the cart could carry and left ${n.town}. Behind them, the bells would not stop ringing.`), 'hard', true);
              if (applyRng(x, kind)() < 0.02 * tacticFight(x, 'violence')) die(x, 'violence');
            } },
          { label: L('残って看病する', 'Stay and nurse the sick'), hint: L('命の危険は大きい。人望と名声', 'great danger; earns trust and renown'),
            apply: (x) => {
              const p = 0.05 * 1.3 ** ((50 - x.stats.hp) / 20);
              log(x, L(`残って、熱にうなされる人たちの額を拭いて回った。${n.god}の神殿の床は寝台で埋まった。`, `Stayed, going from bed to bed wiping fevered brows. The floor of ${n.god}'s temple vanished under cots.`), 'ill', true);
              if (applyRng(x, kind)() < p) { die(x, 'plague'); return; }
              bump(x, { charm: 6, fame: 5, happy: 3 });
            } },
          { label: L('戸を閉めて籠もる', 'Shut the door and wait'), hint: L('家族と籠もる。気が滅入る', 'hole up with the family; grim'),
            apply: (x) => {
              x.sick = { until: x.age + 1, k: Math.min(x.sick?.until !== undefined && x.sick.until > x.age ? x.sick.k : 1, 0.6) };
              bump(x, { happy: -6 });
              log(x, L('戸に板を打ちつけ、家族と息をひそめて季節をやり過ごした。', 'Boarded up the door and waited out the season with the family, barely breathing.'), 'ill');
            } },
        ], (x, r) => pickBy(x, short(x, FLEE) ? 2 : 0, 1, r, [0, 1, 2, 2]));
    }
    case 'demon': {
      const [dja, den] = dkName(h);
      return decide(h, kind, id, L(`${dja}の時代`, `The age of ${den}`),
        L(`${dja}の軍勢が国境を越えた。どの村も、身の振り方を迫られていた。`, `${cap(den)}'s armies crossed the border. Every village had to decide where it stood.`), [
          { label: L('抵抗軍に加わる', 'Join the resistance'), hint: L('戦いになる。強さがものを言う', 'it means fighting; strength matters'),
            apply: (x) => {
              const r = applyRng(x, kind), w = prowess(x);
              x.flags['xr.resist'] = x.age;
              if (r() < 0.06 * tacticFight(x, 'war') * (1 - w * 0.6)) { log(x, L('抵抗軍に加わった。', 'Joined the resistance.'), 'battle', true); die(x, 'war'); return; }
              if (r() < w) { bump(x, { fame: 8, level: 2 }); log(x, L(`抵抗軍に加わり、${dja}の砦をひとつ焼き落とした。`, `Joined the resistance and burned one of ${den}'s forts to the ground.`), 'battle', true).fight = fightOf(x, 'demon'); }
              else { bump(x, { hp: -10 }); log(x, L('抵抗軍に加わったが、最初の夜襲で手ひどくやられた。', 'Joined the resistance, and took a beating in the very first night raid.'), 'battle', true).fight = fightOf(x, 'demon', 'hurt'); }
            } },
          { label: L(`${dja}の軍に協力する`, `Work for ${den}'s army`), hint: L('暮らしは守れる。名は汚れる', 'keeps you fed; stains your name'),
            apply: (x) => {
              addGold(x, 8 * COIN); bump(x, { fame: -6, charm: -4 }); x.flags['xr.collab'] = x.age;
              log(x, L(`${dja}の軍の兵糧を運ぶ仕事を引き受けた。払いは良かった。村の人の目は冷たかった。`, `Took work hauling supplies for ${den}'s army. The pay was good. The village's stares were cold.`), 'hard', true);
            } },
          { label: L('遠い国へ逃れる', 'Flee to a distant land'), hint: L('お金と、故郷を失う', 'costs money, and home'),
            apply: (x) => {
              addGold(x, -6 * COIN); bump(x, { happy: -8 }); x.flags['xr.exile'] = x.age;
              log(x, L(`家財を売り、${dja}の影の届かない南の国へ渡った。異国の市場で故郷の言葉を聞くと、足が止まった。`, `Sold what could be sold and crossed to a southern land beyond ${den}'s shadow. A word in the old tongue in a foreign market could still stop ${pron(x.sex, 'him')} cold.`), 'loss', true);
            } },
          { label: L('頭を低くしてやり過ごす', 'Keep your head down'),
            apply: (x) => { bump(x, { happy: -3 }); log(x, L('畑を耕し、余計なことは言わずに暮らした。それも一つの戦い方だった。', 'Tended the fields and said nothing that did not need saying. That was a kind of fight too.'), 'hard'); } },
        ], (x, r) => pickBy(x, short(x, 6 * COIN) ? 3 : 2, 0, r, [0, 3, 3, 3, 1]));
    }
    case 'bread': {
      const [fja, fen] = foodOf(h);
      return decide(h, kind, id, L('ひもじい冬', 'A hungry winter'),
        L(`飢饉で、店の棚はほとんど空だった。腹の虫が、昨日から鳴きやまない。`, `The famine had emptied the shop shelves. ${cap(pron(h.sex, 'his'))} stomach had not stopped growling since yesterday.`), [
          { label: L(`${fja}を盗む`, `Steal a ${fen}`), hint: L('捕まるかもしれない', 'you might get caught'),
            apply: (x) => {
              const r = applyRng(x, kind);
              if (r() < clamp01(0.5 - x.stats.luck / 250 - (x.talent === 'luck' ? 0.1 : 0), 0.15, 0.6)) {
                record(x); bump(x, { hp: -3, happy: -6 });
                log(x, L(`${fja}をひとつ懐に入れたところで、手首をつかまれた。衛兵の詰所で一晩過ごした。`, `Got one ${fen} under the coat before a hand closed on ${pron(x.sex, 'his')} wrist. Spent the night in the guardhouse.`), 'hard', true);
              } else { x.flags['xr.stole'] = x.age; bump(x, { hp: 2, happy: -4 }); log(x, L(`${fja}をひとつ盗んで、路地裏で食べた。おいしかった。おいしかったのが、つらかった。`, `Stole a ${fen} and ate it in an alley. It tasted good. That was the worst part.`), 'hard'); }
            } },
          { label: L(`${n.god}の神殿の炊き出しに並ぶ`, `Line up at ${n.god}'s soup kitchen`), hint: L('長い列', 'a long line'),
            apply: (x) => { bump(x, { hp: -1 }); log(x, L(`${n.god}の神殿の炊き出しに、朝から並んだ。薄い粥でも、温かかった。`, `Lined up from dawn at ${n.god}'s soup kitchen. The gruel was thin, but warm.`), 'hard'); } },
          { label: L('耐える', 'Go without'), hint: L('体が弱る', 'your body will pay'),
            apply: (x) => {
              bump(x, { hp: -6 });
              log(x, x.memoryAwake ? L('水を飲んで早く寝た。夢の中で、前世のコンビニの自動ドアが開いた。', 'Drank water and went to bed early. In the dream, the automatic door of a convenience store from a past life slid open.')
                : L('水を飲んで、早く寝た。', 'Drank water and went to bed early.'), 'hard');
            } },
        ], (x, r) => pickBy(x, 1, 0, r, [0, 1, 1, 2]));
    }
    case 'orphan': {
      return decide(h, kind, id, L('戦災孤児', 'A war orphan'),
        L('戦で焼けた村から来た子が、家の軒先でうずくまっていた。親はもういないという。', 'A child from a village the war had burned was huddled under the eaves. No parents left, the child said.'), [
          { label: L('家に迎える', 'Take the child in'), hint: L('家族が一人増える', 'one more in the family'),
            apply: (x) => {
              const r = applyRng(x, kind);
              const race = pickWeighted(r, x.world.races, ([, w]) => w)[0];
              const sex = r() < 0.5 ? 'F' : 'M';
              const c = addTie(x, { name: personName(r, x.world, sex, 'poor', null).given, role: 'child', race, sex, age: Math.round(ageOfHeq(4 + Math.floor(r() * 6), raceOf(race))) });
              x.flags[`adopted.${c.id}`] = x.age; bump(x, { happy: 6 });
              shared(x, [c], L(`${c.name}を家に迎えた。最初の夜は、パンを両手で抱えたまま眠っていた。`, `Took ${c.name} in. The first night, the child fell asleep still holding a piece of bread in both hands.`), 'family', 10, true).join = [c.id];
            } },
          { label: L(`${n.god}の神殿に預ける`, `Bring the child to ${n.god}'s temple`), hint: g(h, COIN),
            apply: (x) => { addGold(x, -COIN); log(x, L(`${n.god}の神殿の孤児院に連れて行き、少しの寄進を置いてきた。`, `Brought the child to the orphanage at ${n.god}'s temple and left a small offering.`), 'family'); } },
          { label: L('見なかったことにする', 'Look away'),
            apply: (x) => { bump(x, { happy: -5 }); log(x, L('戸を閉めた。その夜は、軒先の物音がするたびに目が覚めた。', `Closed the door. That night, every sound from the eaves woke ${pron(x.sex, 'him')} again.`), 'loss'); } },
        ], (x, r) => pickBy(x, 1, 0, r, [0, 1, 1]));
    }
    case 'jail': {
      const t = tieOf(h, id);
      if (!t) return null;
      const BAIL = 8 * COIN;
      return decide(h, kind, id, L(`${t.name}が牢に`, `${t.name} in the dungeon`),
        L(`${t.name}が、${n.lord}の牢に入れられた。酒場の喧嘩で衛兵を殴ったらしい。`, `${t.name} had been thrown into ${n.lord}'s dungeon. Something about punching a guard in a tavern brawl.`), [
          { label: L('保釈金を払う', 'Pay the bail'), hint: short(h, BAIL) ? L(`${g(h, BAIL)}・足りない分は借りる`, `${g(h, BAIL)}, borrowing the rest`) : g(h, BAIL),
            apply: (x) => { addGold(x, -BAIL); const tt = tieOf(x, id); if (tt) shared(x, [tt], L(`${g(x, BAIL)}を払い、${t.name}を牢から出した。帰り道、二人とも何も言わなかった。`, `Paid ${g(x, BAIL)} and got ${t.name} out. Neither said a word on the walk home.`), 'family', 10); } },
          { label: L('領主に嘆願する', 'Petition the lord'), hint: L('人望しだい', 'depends on your standing'),
            apply: (x) => {
              const tt = tieOf(x, id); if (!tt) return;
              if (applyRng(x, kind)() < clamp01(0.25 + x.stats.charm / 200 + x.stats.fame / 300, 0.15, 0.85)) { bump(x, { fame: 1 }); shared(x, [tt], L(`嘆願書に、近所の人たちが名を連ねてくれた。${t.name}は十日で出てきた。`, `The neighbors signed the petition. ${t.name} was out in ten days.`), 'family', 12); }
              else shared(x, [tt], L(`嘆願は門前払いだった。${t.name}は一冬を牢で過ごした。`, `The petition went nowhere. ${t.name} spent the winter in a cell.`), 'hard', -5);
            } },
          { label: L('放っておく', 'Let them serve the time'),
            apply: (x) => { const tt = tieOf(x, id); if (tt) shared(x, [tt], L(`「頭を冷やせ」とだけ伝えた。${t.name}は一冬を牢で過ごした。`, `Sent only a message: "Cool your head." ${t.name} spent the winter in a cell.`), 'hard', -15); } },
        ], (x, r) => pickBy(x, short(x, BAIL) ? 1 : 0, 1, r, [0, 1, 2]));
    }
    case 'accused': {
      return decide(h, kind, id, L('ぬれぎぬ', 'Wrongly accused'),
        L(`市場で財布が消え、いちばん近くにいた${nm}が疑われた。衛兵の手が伸びてくる。`, `A purse vanished at the market, and ${nm} had been standing closest. A guard reached for ${pron(h.sex, 'his')} arm.`), [
          { label: L('身の潔白を訴える', 'Plead innocence'), hint: L('知恵と人望しだい', 'depends on your wits and standing'),
            apply: (x) => {
              const seer = x.cheat === 'appraisal';
              if (seer || applyRng(x, kind)() < clamp01(0.3 + x.stats.mind / 250 + x.stats.charm / 250, 0.2, 0.85)) {
                bump(x, { fame: 2 });
                log(x, seer ? L('〈鑑定〉を使うと、隣の男の懐に「盗品の財布」と出ていた。', `One look with "Appraisal" showed it: "Stolen purse," tucked in the coat of the man next to ${pron(x.sex, 'him')}.`)
                  : L('落ち着いて、自分の来た道と時刻を並べてみせた。真犯人は、隣でいちばん大きな声を出していた男だった。', 'Calmly laid out the route and the times. The real thief was the man shouting the loudest.'), 'hard');
              } else { record(x); bump(x, { hp: -5, happy: -8 }); log(x, L('訴えは聞いてもらえなかった。三日の牢と、身に覚えのない記録が残った。', 'No one listened. Three days in a cell, and a record for something never done.'), 'hard', true); }
            } },
          { label: L('逃げる', 'Run'),
            apply: (x) => { record(x); bump(x, { fame: -4 }); log(x, L('とっさに逃げた。それで、すっかり犯人ということになった。', 'Ran on instinct. That settled it: the thief had been found.'), 'hard', true); } },
          { label: L('黙って罰金を払う', 'Pay the fine quietly'), hint: g(h, 2 * COIN),
            apply: (x) => { record(x); addGold(x, -2 * COIN); log(x, L('言い争う気力もなく、罰金を払った。帳簿に、やっていない罪が一行増えた。', 'Too tired to argue, paid the fine. One more line in the ledger for a crime never committed.'), 'hard'); } },
        ], (x, r) => pickBy(x, 2, 0, r, [0, 0, 2]));
    }
    case 'duel': {
      return decide(h, kind, id, L('酒場の夜', 'A night at the tavern'),
        L(`${n.town}の酒場で、酔った騎士崩れと肩がぶつかった。「表へ出ろ」`, `In a tavern in ${n.town}, ${nm} bumped shoulders with a drunken ex-knight. "Outside. Now."`), [
          { label: L('剣を抜く', 'Draw steel'), hint: L('決闘は禁じられている', 'dueling is against the law'),
            apply: (x) => {
              const r = applyRng(x, kind), w = prowess(x);
              record(x);
              if (r() < 0.03 * tacticFight(x, 'violence') * (1 - w * 0.5)) { log(x, L('月明かりの下で、刃を交えた。', 'Steel crossed under the moon.'), 'battle', true).fight = fightOf(x, 'bandit'); die(x, 'violence'); return; }
              if (r() < w) { bump(x, { fame: 2 }); log(x, L('月明かりの下で三合。相手は石畳に伸びた。翌朝、衛兵が来た。', 'Three passes under the moon, and the man was flat on the cobbles. The guards came in the morning.'), 'battle', true).fight = fightOf(x, 'bandit'); }
              else { bump(x, { hp: -12 }); log(x, L('三合目で足が滑った。腫れた顔で朝を迎え、衛兵には決闘の罪で名を書かれた。', 'Slipped on the third pass. Woke with a swollen face, and the guards wrote down the name for dueling.'), 'battle', true).fight = fightOf(x, 'bandit', 'hurt'); }
            } },
          { label: L('頭を下げて一杯おごる', 'Apologize and buy him a drink'), hint: g(h, COIN / 2),
            apply: (x) => { addGold(x, -COIN / 2); bump(x, { charm: 2 }); log(x, L('頭を下げて一杯おごった。騎士崩れは泣きながら昔の武勇伝を語りだし、夜が明けた。', 'Apologized and bought him a drink. He wept through the story of his glory days until dawn.'), 'love'); } },
          { label: L('裏口から逃げる', 'Slip out the back'),
            apply: (x) => { log(x, L('裏口から逃げた。翌日、酒場の親父にツケを払いに戻る羽目になった。', 'Slipped out the back. Had to come back the next day anyway, to settle the tab.'), 'hard'); } },
        ], (x, r) => pickBy(x, 1, 0, r, [0, 1, 1, 2]));
    }
    case 'convert': {
      const other = otherGod(h);
      const parent = byRole(h, 'mother') ?? byRole(h, 'father');
      return decide(h, kind, id, L('辻の説教', 'A preacher at the crossroads'),
        L(`旅の説教師が、${other}の教えを説いていた。その言葉は、なぜか胸の空いたところにすっと入ってきた。`, `A traveling preacher spoke of ${other}. Somehow the words slipped right into an empty place in ${pron(h.sex, 'his')} chest.`), [
          { label: L(`${other}に改宗する`, `Convert to ${other}`), hint: parent ? L('家族が反対するかもしれない', 'the family may object') : undefined,
            apply: (x) => {
              x.flags['faith.other'] = x.age; delete x.flags['faith.drift']; bump(x, { happy: 6, mind: 2 });
              const p = byRole(x, 'mother') ?? byRole(x, 'father');
              if (p) {
                x.flags['faith.rift'] = x.age; x.flags['faith.riftWho'] = p.id;
                shared(x, [p], L(`${other}の印を首に下げるようになった。${callName(p)}は、口をきいてくれなくなった。`, `Began wearing the sign of ${other}. ${callName(p)} stopped speaking to ${pron(x.sex, 'him')}.`), 'power', -15, true);
              } else log(x, L(`${other}の印を首に下げるようになった。`, `Began wearing the sign of ${other}.`), 'power', true);
            } },
          { label: L('話だけ聞いて帰る', 'Listen, then go home'),
            apply: (x) => { bump(x, { mind: 2 }); log(x, L(`最後まで聞いて、銅貨を一枚置いて帰った。その夜の${worldNames(x).god}への祈りは、少しだけ長くなった。`, `Listened to the end, left a copper, and went home. That night's prayer to ${worldNames(x).god} ran a little longer.`), 'power'); } },
          { label: L('通り過ぎる', 'Walk on'),
            apply: (x) => { log(x, L('足を止めずに通り過ぎた。', 'Walked on without stopping.'), 'power'); } },
        ], (x, r) => pickBy(x, 1, 0, r, [1, 1, 2, 0]));
    }
    case 'roots': {
      const raised = h.flags.adopted !== undefined ? byRole(h, 'mother') ?? byRole(h, 'father') : undefined;
      const opts: Option[] = [
        { label: L('探しに行く', 'Go looking'),
          apply: (x) => {
            const r = applyRng(x, kind)();
            x.flags['xr.rootsFound'] = x.age;
            if (r < 0.3) { bump(x, { happy: 8 }); log(x, L('帳簿の名をたどった先に、白髪の女の人がいた。言葉は少なかった。帰りぎわ、手を握られた。', `The name in the ledger led to a gray-haired woman. Few words passed between them. At the door, she would not let go of ${pron(x.sex, 'his')} hand.`), 'family', true); }
            else if (r < 0.7) { bump(x, { happy: 2 }); log(x, L('たどり着いたのは、村はずれの小さな墓だった。花を置いて帰った。', 'It led to a small grave at the edge of a village. Left flowers, and went home.'), 'loss', true); }
            else { bump(x, { happy: -2 }); log(x, L('手がかりは、雨で滲んだ一行で途切れていた。', 'The trail ended at one rain-blurred line.'), 'hard'); }
          } },
      ];
      if (raised) opts.push({ label: L('育ての親に聞く', 'Ask the parent who raised you'),
        apply: (x) => { const p = tieOf(x, raised.id); if (p) shared(x, [p], L(`${callName(p)}は長いこと黙って、それから「あなたはうちの子よ」とだけ言った。それで十分だった。`, `${callName(p)} was quiet a long while, then said only, "You are our child." That was enough.`), 'family', 8, true); } });
      opts.push({ label: L('探さない', 'Let it be'), apply: (x) => { log(x, L('探さないことにした。今そばにいる人たちが、家族だった。', 'Decided not to look. The people here were family.'), 'family'); } });
      return decide(h, kind, id, L('生みの親', 'Birth parents'),
        L(`${nm}は、自分を産んだ人のことを何も知らない。${n.town}の古い孤児院の帳簿に、手がかりがあるかもしれない。`, `${nm} knew nothing of the people who had given ${pron(h.sex, 'him')} life. The old ledgers of the orphanage in ${n.town} might hold a clue.`),
        opts, (x, r) => pickBy(x, opts.length - 1, 0, r, [0, opts.length - 1, opts.length - 2]));
    }
  }
}

export function crossroadsByRef(h: Hero, ref: string, die: Die): Decision | null {
  const [, kind, id] = ref.split(':');
  return KINDS.includes(kind as Kind) ? build(h, kind as Kind, Number(id), die) : null;
}

// ---- 1年 -------------------------------------------------------------------

// その年の岐路 (選択は1つまで) と、選択にならない小さな出来事 (双子・養子・前科が消える・信仰・命日)
export function crossroads(h: Hero, die: Die): Decision | null {
  if (!h.alive || anchorsOf(h)) return null;
  const e = heqOf(h);
  quiet(h, e);
  const pick = choiceOf(h, e);
  return pick ? build(h, pick[0], pick[1], die) : null;
}

const fantasy = (h: Hero) => isFantasy(h.world);
const once = (h: Hero, k: string) => h.flags[k] === undefined;

function choiceOf(h: Hero, e: number): [Kind, number] | null {
  const s = h.state;
  // 召集は必ず (life.ts の draft が立てる)。人の手で決める
  if (h.flags.draftCall === h.age) { delete h.flags.draftCall; return ['draft', 0]; }
  const r = yearRng(h);
  const adult = e >= ADULT_HEQ;
  // 疫病の選択は12年あけて (疫病の多い世界で毎回にならないように)
  if (s.plague > 0 && e >= 12 && e < 75 && (h.flags['xr.plague'] === undefined || h.age - h.flags['xr.plague'] >= 12) && r() < 0.6) { h.flags['xr.plague'] = h.age; return ['plague', 0]; }
  if (s.demonKing && adult && e < 60 && once(h, 'xr.demon') && h.flags.hero === undefined && h.flags.saint === undefined && demonKingWorld(h.world) && r() < 0.15) { h.flags['xr.demon'] = h.age; return ['demon', 0]; }
  if (s.famine > 0 && e >= 10 && h.stats.wealth < 30 && fantasy(h) && r() < 0.35) return ['bread', 0];
  if (s.war > 0 && e >= 25 && e < 60 && once(h, 'xr.orphan') && r() < 0.05) { h.flags['xr.orphan'] = h.age; return ['orphan', 0]; }
  if (!adult) return null;
  const x = r();
  if (fantasy(h) && once(h, 'xr.jail') && e >= 25 && x < 0.004) {
    const t = h.people.find((p) => (p.role === 'sibling' || p.role === 'child') && p.alive && p.until === undefined && heqT(p) >= 18);
    if (t) { h.flags['xr.jail'] = h.age; return ['jail', t.id]; }
  }
  if (fantasy(h) && once(h, 'xr.accused') && e < 60 && x >= 0.004 && x < 0.004 + 0.002 + 0.0004 * (10 - h.world.law)) { h.flags['xr.accused'] = h.age; return ['accused', 0]; }
  if (fantasy(h) && e < 45 && (h.flags['xr.duel'] === undefined || h.age - h.flags['xr.duel'] >= 10) && x >= 0.02 && x < 0.028) { h.flags['xr.duel'] = h.age; return ['duel', 0]; }
  if (fantasy(h) && once(h, 'xr.convert') && e < 50 && x >= 0.03 && x < 0.0335) { h.flags['xr.convert'] = h.age; return ['convert', 0]; }
  const orphanBorn = h.status === 'orphan' && h.arrival !== 'summoned';
  if (orphanBorn && once(h, 'xr.roots') && e >= 18 && e < 40 && x >= 0.05 && x < 0.1) { h.flags['xr.roots'] = h.age; return ['roots', 0]; }
  return null;
}

// 選択にならない小さな出来事。乱数は要るときだけ作る
function quiet(h: Hero, e: number): void {
  const n = worldNames(h);
  // 双子: 主人公 (1歳の年に、同じ揺りかごのきょうだいとして) と、この年に生まれた子
  if (h.age === 1 && h.arrival !== 'summoned' && h.status !== 'orphan' && byRole(h, 'mother')) {
    const r = makeRng(mix(h.seed, 0x7a1));
    if (r() < TWIN_P) {
      const sex = r() < 0.5 ? 'F' : 'M';
      const t = addTie(h, { name: freshName(h, r, sex), role: 'sibling', race: h.race, sex, age: h.age, bond: 75 });
      h.flags.twin = h.age;
      shared(h, [t], L(`${h.given}には双子の${t.name}がいた。揺りかごは、いつも二人ぶん揺れていた。`, `${h.given} had a twin, ${t.name}. The cradle always rocked for two.`), 'family', 0, true).join = [t.id];
    }
  }
  const last = h.people[h.people.length - 1];
  if (last && last.role === 'child' && last.since === h.age && last.age === 0 && h.flags['xr.twinkid'] !== h.age) {
    if (makeRng(mix(h.seed, h.age, 0x7a2))() < TWIN_P) {
      h.flags['xr.twinkid'] = h.age;
      const r = makeRng(mix(h.seed, h.age, 0x7a3));
      const sex = r() < 0.5 ? 'F' : 'M';
      const t = addTie(h, { name: freshName(h, r, sex), role: 'child', race: last.race, sex, age: 0 });
      bump(h, { happy: 4 });
      shared(h, [t], L(`双子だった。少し遅れて、${t.name}も生まれた。`, `Twins. A little behind, ${t.name} arrived too.`), 'family', 0, true).join = [t.id];
    }
  }
  // 孤児の主人公が引き取られる (人間換算12歳まで)。生みの親のきょうだいがいる子は、引き取る家ときょうだいの親が食い違うので除く (others.ts の錨)
  if (h.status === 'orphan' && h.arrival !== 'summoned' && e < 12 && once(h, 'adopted') && !h.people.some((t) => t.role === 'mother' || t.role === 'father' || t.role === 'sibling') && makeRng(mix(h.seed, h.age, 0x7a4))() < 0.08) {
    const r = makeRng(mix(h.seed, h.age, 0x7a5));
    const race = pickWeighted(r, h.world.races, ([, w]) => w)[0];
    const rc = raceOf(race);
    const m = addTie(h, { name: freshName(h, r, 'F'), role: 'mother', race, sex: 'F', age: Math.round(ageOfHeq(e + 24 + r() * 10, rc)), bond: 60 });
    const f = addTie(h, { name: freshName(h, r, 'M'), role: 'father', race, sex: 'M', age: Math.round(ageOfHeq(e + 26 + r() * 10, rc)), bond: 55 });
    h.flags.adopted = h.age;
    shared(h, [m, f], L(`子のいない${m.name}と${f.name}の夫婦に引き取られた。その家の食卓には、ちょうど一つ椅子が余っていた。`, `A childless couple, ${m.name} and ${f.name}, took ${pron(h.sex, 'him')} in. Their table had exactly one chair to spare.`), 'family', 0, true).join = [m.id, f.id];
  }
  if (e < ADULT_HEQ) return;
  // 前科は年月で消える
  if (h.flags.record !== undefined && h.age - h.flags.record >= RECORD_YEARS) {
    delete h.flags.record;
    log(h, L('あの件の記録は、ようやく古い帳簿の山に埋もれた。', 'The old record was finally buried in a pile of dusty ledgers.'), 'work');
  }
  // 魔王の軍に協力した人は、魔王が倒れると名を晒される (罪は割に合わない)
  if (h.flags['xr.collab'] !== undefined && !h.state.demonKing) {
    const [dja, den] = dkName(h);
    delete h.flags['xr.collab'];
    record(h); bump(h, { fame: -8, happy: -6 });
    log(h, L(`${dja}が倒れると、協力した者の名が広場に張り出された。${h.given}の名も、そこにあった。`, `When ${den} fell, the names of collaborators were posted in the square. ${h.given}'s was among them.`), 'hard', true);
  }
  if (fantasy(h)) faith(h, e, n.god);
  // きょうだいの命日: 亡くなって 8〜14年たった年に一度だけ (年は id で決める)
  for (const t of h.people) {
    if (t.role !== 'sibling' || t.alive || t.diedAt === undefined || h.age - t.diedAt !== 8 + (t.id % 7)) continue;
    const yrs = h.age - t.diedAt;
    log(h, L(`ふと、${t.name}の好きだった歌を口ずさんでいた。${t.name}が亡くなって、もう${yrs}年になる。`, `Caught ${pron(h.sex, 'himself')} humming the song ${t.name} used to love. ${yrs} years now since ${t.name} died.`), 'family', false, [t.id]);
  }
}

// 信仰: 静かに遠のく → いつか戻る。改宗で親と仲違いしたら、和解するか、和解できないまま別れる
function faith(h: Hero, e: number, god: string): void {
  if (h.flags['faith.rift'] !== undefined) {
    const p = tieOf(h, h.flags['faith.riftWho']);
    if (!p || !p.alive) {
      delete h.flags['faith.rift'];
      if (p) log(h, L(`${callName(p)}とは、祈りの言葉を揃えられないまま別れた。墓には、両方の神の印を刻んだ。`, `${callName(p)} died before their prayers ever matched again. Both gods' signs went on the gravestone.`), 'loss', false, [p.id]);
    } else if (makeRng(mix(h.seed, h.age, 0x7a6))() < 0.12) {
      delete h.flags['faith.rift'];
      shared(h, [p], L(`${callName(p)}が、${otherGod(h)}への祈りの言葉を覚えてきた。「どっちの神様でもいい。あなたが無事なら」`, `${callName(p)} had learned a prayer to ${otherGod(h)}. "Whichever god it is. As long as you are safe."`), 'family', 18, true);
    }
  }
  if (h.flags['faith.drift'] !== undefined) {
    if (h.age - h.flags['faith.drift'] >= 6 && makeRng(mix(h.seed, h.age, 0x7a7))() < 0.06) {
      delete h.flags['faith.drift']; bump(h, { happy: 4 });
      log(h, L(`久しぶりに${god}の神殿の鐘を聞いた。気がつくと、昔のように手を合わせていた。`, `Heard the bell of ${god}'s temple after many years, and found ${pron(h.sex, 'his')} hands folded the old way.`), 'power');
    }
  } else if (e >= 25 && e < 60 && once(h, 'faith.drifted') && once(h, 'faith.other') && makeRng(mix(h.seed, h.age, 0x7a8))() < 0.012) {
    h.flags['faith.drift'] = h.age; h.flags['faith.drifted'] = h.age;
    log(h, L(`いつからか、${god}の神殿に足が向かなくなった。祈りの言葉は、まだ全部覚えている。`, `Somewhere along the way, the visits to ${god}'s temple stopped. The prayers were all still there, word for word.`), 'power');
  }
}

export const TWIN_P = 0.015;

// 輪の人と名が重ならないように (8回まで引き直す)
function freshName(h: Hero, r: Rng, sex: 'F' | 'M'): string {
  const taken = new Set([h.given, ...h.people.map((t) => t.name)]);
  let nm = personName(r, h.world, sex, h.status, null).given;
  for (let i = 0; i < 8 && taken.has(nm); i++) nm = personName(r, h.world, sex, h.status, null).given;
  return nm;
}
