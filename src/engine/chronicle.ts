// 年代記 (世界の歴史)。世界の年ごとの様子 (others.ts の worldTimeline)・ほかの転生者 (reincarnators.ts)・主人公自身の名高い手柄を、
// 年の順に1本に並べる。at は主人公の年齢 (負は生まれる前)。暦の呼び名は付けない (画面で「◯◯が生まれる12年前」のように出す)。
// 乱数は引かない (場所の言い回しだけ seed と年から決める)。何度作っても同じ
import type { ChronicleEntry, ChronicleKind, Hero } from './types';
import { worldTimeline } from './others';
import { courseOf, deedLine, demonWord, diedAtOf, reincarnatorsOf } from './reincarnators';
import { styleOf, worldNames } from './names';
import { isFantasy } from './mortality';
import { isEn, L, ordinal, pron } from '../i18n';

const PLACES: Record<ReturnType<typeof styleOf>, [string, string][]> = {
  west: [['北の国境', 'the northern border'], ['東の辺境', 'the eastern marches'], ['南の港町', 'the southern ports'], ['西の山あい', 'the western hills']],
  myth: [['北の国境', 'the northern border'], ['海の向こうの国', 'the land across the sea'], ['神殿の都', 'the temple city'], ['西の山あい', 'the western hills']],
  desert: [['北の水場', 'the northern wells'], ['東の隊商路', 'the eastern caravan road'], ['南の砂丘', 'the southern dunes'], ['オアシスの都', 'the oasis city']],
  wa: [['北の国境', 'the northern border'], ['東の国々', 'the eastern provinces'], ['西の国々', 'the western provinces'], ['南の海辺', 'the southern coast']],
  zh: [['北の長城', 'the northern wall'], ['東の諸州', 'the eastern provinces'], ['西の山門', 'the western mountain gates'], ['南の水郷', 'the southern waterlands']],
  modern: [['海の向こう', 'the lands across the sea'], ['大陸の国境', 'the continental border'], ['北の海峡', 'the northern strait']],
  scifi: [['外縁星域', 'the outer reaches'], ['隣の星系', 'a neighboring system'], ['軌道の上', 'the orbital lanes'], ['辺境の植民星', 'a frontier colony']],
  ruin: [['北の廃都', 'the dead city to the north'], ['東の荒野', 'the eastern wastes'], ['川沿いの集落', 'the river settlements']],
};

function hashAt(seed: number, at: number): number {
  let x = Math.imul((seed ^ 0xc4a0) >>> 0, 0x01000193) ^ (at >>> 0);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  return (x ^ (x >>> 12)) >>> 0;
}

const lowerFirst = (s: string) => (isEn ? s.charAt(0).toLowerCase() + s.slice(1) : s);
// 主語を付ける (日本語は「〜が」、英語は名の後に小文字で続ける)
const subj = (name: string, rest: string) => L(`${name}が${rest}`, `${name} ${lowerFirst(rest)}`);

// 年の中の並び (同じ年なら、世界の出来事 → 転生者 → 主人公)
const ORDER: Record<ChronicleKind, number> = { war: 0, plague: 1, famine: 2, demon: 3, realm: 4, reincarnator: 5, hero: 6 };

// 年代記。古い順。同じ年は世界・転生者・主人公の順
export function chronicleOf(h: Hero): ChronicleEntry[] {
  const years = worldTimeline(h);
  if (!years.length) return [];
  const first = years[0].at, last = years[years.length - 1].at;
  const start = h.log[0]?.age ?? 0;
  const out: ChronicleEntry[] = [];
  const add = (at: number, text: string, kind: ChronicleKind, who?: string[]) => {
    if (at < first || at > last) return;
    // 英語は文の頭を大文字に (「the Hero ◯◯ slew…」のように小文字の語で始まる組み合わせがある)
    const e: ChronicleEntry = { at, text: isEn && text ? text.charAt(0).toUpperCase() + text.slice(1) : text, kind };
    if (who?.length) e.who = who;
    if (at >= start && at <= h.age) e.lived = true;
    out.push(e);
  };
  // 同じ種類の出来事は言い回しを替える。種類ごとに主人公の seed で決まる順に使い、使い切ったら「◯度目」を添える (同じ文を2度出さない)
  const counts = new Map<string, number>();
  const vary = (cat: string, lines: [string, string][]): string => {
    const k = counts.get(cat) ?? 0;
    counts.set(cat, k + 1);
    const n = lines.length;
    const [ja, en] = lines[(hashAt(h.seed, cat.length * 977 + n) + k) % n];
    return k < n ? L(ja, en) : L(`${ja}(この時代${k + 1}度目)`, `${en} (The ${ordinal(k + 1)} time in this age.)`);
  };
  const roster = reincarnatorsOf(h).map((p) => ({ p, c: courseOf(h, p) }));
  const [dj, de] = demonWord(h.world);
  const heroName = isFantasy(h.world) ? L('勇者', 'the Hero ') : L('英雄', 'the hero ');

  // ---- 世界 ----
  const style = styleOf(h.world);
  const warWord = style === 'modern' || style === 'scifi' ? L('戦争', 'war') : L('戦', 'war');
  const [cj, ce] = CROP[style];
  years.forEach((y, i) => {
    const prev = i > 0 ? years[i - 1] : undefined;
    const runOf = (k: 'war' | 'famine') => { let n = 0; while (years[i + n]?.[k]) n++; return n; };
    if (y.war && !prev?.war) {
      const pl = PLACES[style];
      const [pj, pe] = pl[hashAt(h.seed, y.at) % pl.length];
      add(y.at, vary('war+', [
        [`${pj}で${warWord}が始まった。`, `War broke out in ${pe}.`],
        [`${pj}をめぐって国々が兵を挙げ、${warWord}が始まった。`, `Kingdoms raised armies over ${pe}, and war began.`],
        [`${pj}の国境の小競り合いから、${warWord}が始まった。`, `A skirmish near ${pe} grew into war.`],
        [`${pj}に敵の旗が立ち、${warWord}が始まった。`, `Enemy banners rose over ${pe}. The war had begun.`],
      ]), 'war');
    }
    if (!y.war && prev?.war) {
      let n = 0; while (years[i - 1 - n]?.war) n++;
      add(y.at, n >= 2 ? vary('war-long', [
        [`${warWord}が終わった。${n}年に及んだ。`, `The war ended, after ${n} years.`],
        [`${n}年続いた${warWord}が、ようやく和議で終わった。`, `After ${n} years, the war finally ended in a truce.`],
        [`${n}年の${warWord}が終わり、兵たちが村へ帰ってきた。`, `The ${n}-year war ended, and the soldiers came home to their villages.`],
        [`勝ち負けのはっきりしないまま、${n}年の${warWord}が終わった。`, `The ${n}-year war ended with no clear victor.`],
      ]) : vary('war-short', [
        [`${warWord}が終わった。`, 'The war ended.'],
        [`${warWord}はひと冬で終わった。`, 'The war was over within a winter.'],
        [`短い${warWord}が、和議で収まった。`, 'A short war ended in a truce.'],
      ]), 'war');
    }
    if (y.plague && !prev?.plague) add(y.at, vary('plague', [
      ['大疫病が広がった。', 'A great plague spread across the land.'],
      ['港から入った疫病が、町から町へ広がった。', 'A sickness that came in through the ports spread from town to town.'],
      ['疫病の年。弔いの鐘が毎日鳴った。', 'A plague year. The funeral bells rang every day.'],
      ['疫病で人の行き来が止まり、市が閉ざされた。', 'Plague halted all travel, and the markets were shut.'],
    ]), 'plague');
    if (y.famine && !prev?.famine) {
      const n = runOf('famine');
      add(y.at, n >= 2 ? vary('famine-long', [
        [`飢饉が${n}年続いた。`, `Famine, lasting ${n} years.`],
        [`${n}年続けて${cj}が実らず、穀物の値が三倍になった。`, `For ${n} years running the ${ce} failed, and grain prices tripled.`],
        [`日照りで${cj}が枯れ、${n}年の飢饉になった。流民が都へ押し寄せた。`, `Drought withered the ${ce}, and ${n} years of famine followed. Refugees flooded the capital.`],
        [`冷たい夏が${n}年続いて飢饉になり、村々で一揆が起きた。`, `${n} cold summers in a row brought famine, and the villages rose in revolt.`],
      ]) : vary('famine-short', [
        ['飢饉の年だった。', 'A year of famine.'],
        [`長雨で${cj}が腐り、冬を越せない家が出た。`, `Endless rain rotted the ${ce}, and some households did not survive the winter.`],
        [`虫の害で${cj}が実らず、穀物の値が上がった。`, `Pests ruined the ${ce}, and grain prices rose.`],
      ]), 'famine');
    }
    if (y.demonKing && !prev?.demonKing && prev) add(y.at, vary('demon+', [
      [`${dj}が現れた。`, `The ${de} arose.`],
      [`北の果てに${dj}の城が現れた。`, `The ${de}'s castle appeared at the northern edge of the world.`],
      [`${dj}の軍勢が辺境の村を焼いた。`, `The ${de}'s armies burned the frontier villages.`],
    ]), 'demon');
    if (!y.demonKing && prev?.demonKing) {
      if (h.flags.demonKingSlain === y.at) add(y.at, subj(h.given, L(`${dj}を討ち果たした。`, `Slew the ${de}.`)), 'hero');
      else {
        // 名高い勇者の転生者がそのころ生きていれば、その人の手柄に
        const slayer = roster.find(({ p, c }) => p.fate === 'hero' && c.deedAt !== undefined && c.deedAt <= y.at && diedAtOf(h, p, c) > y.at);
        if (slayer) {
          // 同じ勇者が何度も魔王を討つことがある。2度目からは「ふたたび」の文に (同じ文を2度出さない)
          const k = counts.get(`slayer${slayer.p.id}`) ?? 0;
          counts.set(`slayer${slayer.p.id}`, k + 1);
          const text = k === 0 ? L(`${heroName}${slayer.p.name}が${dj}を討った。`, `${heroName}${slayer.p.name} slew the ${de}.`)
            : L(`${heroName}${slayer.p.name}が、${k + 1}度目に現れた${dj}を討った。`, `${heroName}${slayer.p.name} slew the ${de} for the ${k + 1 === 2 ? 'second' : k + 1 === 3 ? 'third' : `${k + 1}th`} time.`);
          add(y.at, text, 'demon', [`r:${slayer.p.id}`]);
        }
        else add(y.at, vary('demon-', [
          [`${dj}が討たれた。`, `The ${de} was slain.`],
          [`${dj}の城が落ち、軍勢は散り散りになった。`, `The ${de}'s castle fell, and the armies scattered.`],
          [`名もない一行が${dj}を討ったという。`, `Word came that a nameless band had slain the ${de}.`],
        ]), 'demon');
      }
    }
  });

  // ---- 前の代 (続けて遊んだ主人公の系譜) ----
  for (const a of h.lineage?.ancestors ?? []) {
    const off = h.lineage!.offset;
    for (const d of a.deeds ?? []) add(d.at - off, d.text, 'hero');
    add(a.diedAt - off, L(`${a.given}が世を去った。${a.ageAtDeath}歳だった。`, `${a.given} passed away, at ${a.ageAtDeath}.`), 'hero');
  }

  // 主人公が魔王を討ったのが出来事のしるし (heroic.ts など) だけで、世界の様子に魔王の終わりが無い年も、手柄として入れる
  const slain = h.flags.demonKingSlain;
  if (slain !== undefined && !out.some((e) => e.at === slain && e.kind === 'hero')) add(slain, subj(h.given, L(`${dj}を討ち果たした。`, `Slew the ${de}.`)), 'hero');

  // ---- ほかの転生者 ----
  for (const { p, c } of roster) {
    const who = [`r:${p.id}`, ...(p.tieId !== undefined ? [`t:${p.tieId}`] : [])];
    const died = diedAtOf(h, p, c);
    const notable = c.deedAt !== undefined || c.riseAt !== undefined;
    if (p.arrival === 'summoned') add(p.bornAt, L(`異世界から${p.name}が召喚された。`, `${p.name} was summoned from another world.`), 'reincarnator', who);
    else if (notable || p.tieId !== undefined) {
      add(p.bornAt, p.arrival === 'reborn' ? L(`${p.name}が生まれた。前世の記憶を持つ子だった。`, `${p.name} was born, with memories of a past life.`)
        : L(`${p.name}が生まれた。のちに前世を思い出す子だった。`, `${p.name} was born. In time, a past life would come back to ${pron(p.sex, 'him')}.`), 'reincarnator', who);
    }
    if (c.deedAt !== undefined && c.deedAt < died) {
      const kind: ChronicleKind = p.fate === 'hero' ? 'hero' : p.fate === 'villain' || p.fate === 'retired' || p.fate === 'wanderer' ? 'reincarnator' : 'realm';
      add(c.deedAt, subj(p.name, deedLine(h, p)), kind, who);
    }
    if (c.riseAt !== undefined && c.riseAt < died) add(c.riseAt, L(`${p.name}が${dj}を名乗った。`, `${p.name} declared ${pron(p.sex, 'himself')} ${de}.`), 'demon', who);
    if (p.tieId !== undefined) {
      const t = h.people.find((x) => x.id === p.tieId);
      if (t) add(t.since, L(`${h.given}が${p.name}と出会った。`, `${h.given} met ${p.name}.`), 'reincarnator', who);
    }
    if (!notable && p.tieId === undefined) continue;
    if (died !== c.diedAt) add(died, L(`${p.name}が亡くなった。`, `${p.name} died.`), 'reincarnator', who);
    else if (p.fate === 'demonlord') add(died, L(`${dj}を名乗った${p.name}が討たれた。`, `${p.name}, who had claimed to be the ${de}, was struck down.`), 'demon', who);
    else if (p.fate === 'villain') add(died, L(`お尋ね者の${p.name}が捕らえられ、処刑された。`, `The outlaw ${p.name} was captured and executed.`), 'realm', who);
    else if (p.fate === 'hero') add(died, L(`${heroName}${p.name}が世を去った。`, `${heroName}${p.name} passed away.`), 'hero', who);
    else if (p.fate === 'early') add(died, L(`${p.name}が若くして世を去った。`, `${p.name} died young.`), 'reincarnator', who);
    else add(died, L(`${p.name}が世を去った。`, `${p.name} passed away.`), p.fate === 'ruler' || p.fate === 'merchant' ? 'realm' : 'reincarnator', who);
  }

  // ---- 主人公の名高い手柄 ----
  heroDeeds(h, add);

  return out.map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.at - b.e.at || ORDER[a.e.kind] - ORDER[b.e.kind] || a.i - b.i)
    .map(({ e }) => e);
}

type Add = (at: number, text: string, kind: ChronicleKind, who?: string[]) => void;

// 飢饉の文に出る作物 (世界の系統で)
const CROP: Record<ReturnType<typeof styleOf>, [string, string]> = {
  west: ['麦', 'wheat'], myth: ['麦', 'barley'], desert: ['なつめやし', 'date palms'], wa: ['稲', 'rice'], zh: ['稲', 'rice'],
  modern: ['作物', 'crops'], scifi: ['培養作物', 'vat crops'], ruin: ['畑の芋', 'potatoes'],
};

// 主人公の手柄: 英雄の筋 (arc.deed・arc.saved・famous・arc.legend)、勇者・聖女、名が知られた後の名声の記録
function heroDeeds(h: Hero, add: Add): void {
  const f = h.flags, g = h.given;
  const [dj, de] = demonWord(h.world);
  const flagged = new Set<number>();
  const at = (k: string, text: string) => { const a = f[k]; if (a === undefined) return; flagged.add(a); add(a, text, 'hero'); };
  at('hero', subj(g, L(`${dj}を討つ者に選ばれた。`, `Was chosen to slay the ${de}.`)));
  at('saint', subj(g, h.sex === 'M' ? L('聖者に選ばれた。', 'Was named the Saint.') : L('聖女に選ばれた。', 'Was named the Saintess.')));
  at('arc.deed', subj(g, L('大きな手柄を立て、名を上げた。', 'Won renown with a great deed.')));
  at('arc.saved', subj(g, L(`${worldNames(h).town}を魔物の群れから守り抜いた。`, `Held ${worldNames(h).town} against a horde of monsters.`)));
  at('famous', L(`${g}の名が、遠くの町でも語られるようになった。`, `${g}'s name was told in faraway towns.`));
  at('arc.legend', L(`${g}の歌が作られ、伝説になった。`, `Songs were sung of ${g}, and the songs became legend.`));
  if (f.demonKingSlain !== undefined) flagged.add(f.demonKingSlain); // 魔王の討伐は世界の欄で書く
  const famous = f.famous;
  if (famous === undefined) return;
  // 名が知られた後の名声の記録 (主人公自身のもの。輪の人や転生者の行は who を持つので外れる)
  for (const e of h.log) {
    if (e.age < famous || e.kind !== 'fame' || !e.big || e.who?.length || flagged.has(e.age)) continue;
    add(e.age, L(`${g}は、${e.text}`, e.text.startsWith(g) ? e.text : `${g}: ${e.text}`), 'hero');
  }
}
