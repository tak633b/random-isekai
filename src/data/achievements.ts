// 実績。条件は meta/types.ts の Cond の形だけで書き、meta/achievements.ts が評価する。
// 世界・種族・特典ごとのものは engine の一覧から作る。チケットは小さく (0〜3、難しいものだけ 5 まで)。
import type { AchievementCategory, AchievementDef, Cond } from '../meta/types';
import type { CheatId, Hazard, RaceId, Text, WorldId } from '../engine/types';
import { WORLD_IDS, WORLDS, worldPlace } from '../engine/worlds';
import { RACE_IDS, RACES } from '../engine/races';
import { CHEAT_IDS, CHEATS } from '../engine/cheats';

const t = (ja: string, en: string): Text => ({ ja, en });

function a(
  category: AchievementCategory, name: string, nm: [string, string], desc: [string, string],
  cond: Cond, tickets = 0, hidden = false,
): AchievementDef {
  return {
    id: `a.${category}.${name}`, category, name: t(...nm), desc: t(...desc), cond,
    ...(tickets ? { tickets } : {}), ...(hidden ? { hidden: true } : {}),
  };
}

const flag = (id: string): Cond => ({ has: 'flags', id });
const world = (w: WorldId): Cond => ({ fact: 'world', eq: w });
const race = (r: RaceId): Cond => ({ fact: 'race', eq: r });
const cheat = (c: CheatId): Cond => ({ fact: 'cheat', eq: c });
const hazard = (h: Hazard): Cond => ({ fact: 'hazard', eq: h });
const death = (...ids: string[]): Cond => (ids.length === 1 ? { fact: 'deathId', eq: ids[0] } : { any: ids.map((id) => ({ fact: 'deathId', eq: id })) });
const ageGte = (n: number): Cond => ({ fact: 'age', gte: n });
const all = (...c: Cond[]): Cond => ({ all: c });
const long12: Cond = { fact: 'lifespanRatio', gte: 1.2 };

// ---- total 通算 ---------------------------------------------------------------

const LIVES: [number, string, string, number][] = [
  [1, 'はじめの一歩', 'First Step', 0], [5, '五つの生', 'Five Lives', 1], [10, '十の生', 'Ten Lives', 1],
  [25, '転生の常連', 'Regular Reincarnator', 2], [50, '五十の生', 'Fifty Lives', 2], [100, '百の生', 'A Hundred Lives', 3],
  [250, '魂の旅人', 'Soul Wanderer', 3], [500, '輪廻の主', 'Master of the Cycle', 4], [1000, '千の生', 'A Thousand Lives', 5],
];
const YEARS: [number, string, string, number][] = [
  [500, '五百年', 'Five Centuries', 1], [1000, '千年', 'A Millennium', 2],
  [5000, '五千年', 'Five Millennia', 2], [10000, '一万年', 'Ten Thousand Years', 3], [50000, '五万年', 'Fifty Thousand Years', 4],
  [100000, '十万年', 'A Hundred Thousand Years', 5],
];
const FOES: [number, string, string, number][] = [
  [1, '初勝利', 'First Victory', 0], [10, '十の勝ち', 'Ten Victories', 1], [50, '五十の勝ち', 'Fifty Victories', 1],
  [100, '百人斬り', 'A Hundred Felled', 2], [500, '歴戦', 'Battle-Hardened', 2], [1000, '千の勝ち', 'A Thousand Victories', 3],
  [5000, '戦の化身', 'War Incarnate', 4],
];
const TICKETS: [number, string, string, number][] = [
  [50, 'チケット50枚', 'Fifty Tickets', 1], [100, 'チケット100枚', 'A Hundred Tickets', 1],
  [500, 'チケット500枚', 'Five Hundred Tickets', 2], [1000, 'チケット1000枚', 'A Thousand Tickets', 3],
];
const REINC: [number, string, string, number][] = [
  [1, '同郷の人', 'Not the Only One', 0], [3, '三人の同郷', 'Three Fellow Reincarnators', 1], [5, '五人の同郷', 'Five Fellow Reincarnators', 1], [10, '転生者の知り合い', 'Reincarnator Network', 1],
  [25, '転生者の会', 'Reincarnators\' Club', 2], [50, '五十人の同郷', 'Fifty Fellow Reincarnators', 2], [100, '転生者を数える者', 'Census of Reincarnators', 3],
];
const RANDOM: [number, string, string, number][] = [
  [100, '運命の常連', 'Fate\'s Regular', 3], [500, '運命の申し子', 'Child of Fate', 4],
];

const TOTAL: AchievementDef[] = [
  ...LIVES.map(([n, ja, en, tk]) => a('total', `lives${n}`, [ja, en], [`通算で${n}回転生する`, `Reincarnate ${n} time${n > 1 ? 's' : ''} in total.`], { total: 'lives', gte: n }, tk)),
  ...RANDOM.map(([n, ja, en, tk]) => a('total', `random${n}`, [ja, en], [`おまかせ転生で通算${n}回の一生を送る`, `Live ${n} random-reincarnation li${n > 1 ? 'ves' : 'fe'} in total.`], { total: 'randomLives', gte: n }, tk)),
  ...YEARS.map(([n, ja, en, tk]) => a('total', `years${n}`, [ja, en], [`生きた年数の合計が${n}年に届く`, `Live ${n.toLocaleString('en')} years in total across all lives.`], { total: 'years', gte: n }, tk)),
  ...FOES.map(([n, ja, en, tk]) => a('total', `foes${n}`, [ja, en], [`通算で${n}体の敵を倒す`, `Defeat ${n.toLocaleString('en')} foe${n > 1 ? 's' : ''} in total.`], { total: 'foesDefeated', gte: n }, tk)),
  ...TICKETS.map(([n, ja, en, tk]) => a('total', `tickets${n}`, [ja, en], [`通算で${n}枚のチケットを手に入れる`, `Earn ${n.toLocaleString('en')} tickets in total.`], { total: 'ticketsEarned', gte: n }, tk)),
  ...REINC.map(([n, ja, en, tk]) => a('total', `reinc${n}`, [ja, en], [`通算で${n}人の転生者に会う`, `Meet ${n} reincarnator${n > 1 ? 's' : ''} in total.`], { total: 'reincMet', gte: n }, tk)),
];

// ---- feat 1つの人生の手柄 -------------------------------------------------------

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
const rankAtLeast = (r: (typeof RANKS)[number]): Cond => ({ any: RANKS.slice(RANKS.indexOf(r)).map((x) => ({ fact: 'rank', eq: x }) as Cond) });

const AGES: [number, string, string, number][] = [
  [100, '百寿', 'Centenarian', 2], [150, '百五十年', 'A Century and a Half', 2],
  [200, '二百年', 'Two Centuries', 2], [300, '三百年を生きた', 'Three Hundred Years', 3], [500, '五百年の生', 'Five Hundred Years', 4],
  [1000, '千年の生', 'A Thousand Years', 5],
];
const MARRY: [number, string, string, number][] = [
  [2, '二度目の誓い', 'Second Vows', 1], [3, '三度の誓い', 'Third Vows', 1], [5, '恋多き人', 'Many Loves', 2],
];
const KIDS: [number, string, string, number][] = [
  [8, '一族の祖', 'Founder of a Clan', 2], [12, '子沢山の極み', 'A Village of Children', 3],
];
const WINS: [number, string, string, number][] = [
  [10, '腕に覚えあり', 'Proven Fighter', 1], [20, '連戦連勝', 'Undefeated Streak', 1],
];
const ARC: [string, string, string, string, string, number][] = [
  ['arc.legend', 'legend', '伝説', 'Legend', '伝説になる', 3],
];
const ARC_EN: Record<string, string> = {
  notice: 'Notice the power of your cheat skill.', first: 'Use your cheat skill for the first time.',
  guild: 'Register with the Adventurers\' Guild, a sect, or a hunters\' association.',
  deed: 'Achieve a great deed, like clearing a dungeon or felling a great beast.', saved: 'Save a town or its people.',
  famous: 'Become famous.', legend: 'Become a legend.',
};

const FLAGS: [string, string, string, string, string, string, number][] = [
  ['hero', 'hero', '勇者', 'The Hero', '勇者に選ばれる', 'Be chosen as the Hero.', 2],
  ['saint', 'saint', '聖女', 'The Saint', '聖女(聖者)に選ばれる', 'Be named the Saintess (or Saint).', 2],
  ['demonKingSlain', 'demonking', '魔王討伐', 'Demon Lord Slain', '魔王を討つ', 'Slay the Demon Lord.', 5],
  ['knighted', 'knight', '叙任', 'Knighted', '騎士に叙される', 'Be knighted.', 1],
  ['lord', 'lord', '領主', 'Lord of the Land', '領地を持つ', 'Hold land of your own.', 1],
  ['exiled', 'exiled', '追放', 'Banished', '追放される', 'Get banished from your party, house, or land.', 0],
  ['zamaa', 'comeback', '返り咲き', 'Sweet Revenge', '追放されたあと、見返す', 'Get banished, then prove them all wrong.', 2],
  ['dragonSlayer', 'dragonslayer', '竜殺し', 'Dragonslayer', '竜を討つ', 'Slay a dragon.', 2],
  ['dragonPact', 'dragonpact', '竜との盟約', 'Dragon Pact', '竜と盟約を結ぶ', 'Make a pact with a dragon.', 2],
  ['generalSlain', 'general', '四天王討伐', 'General Felled', '魔王軍の将を討つ', 'Defeat one of the Demon Lord\'s generals.', 2],
  ['epithet', 'epithet', '二つ名', 'Epithet', '人々から二つ名で呼ばれる', 'Earn an epithet from the people.', 1],
  ['guildmaster', 'guildmaster', 'ギルドマスター', 'Guildmaster', 'ギルドの長になる', 'Become a guildmaster.', 2],
  ['courtMage', 'courtmage', '宮廷魔術師', 'Court Mage', '宮廷魔術師になる', 'Become a court mage.', 1],
  ['royalGuard', 'royalguard', '近衛', 'Royal Guard', '近衛に取り立てられる', 'Join the royal guard.', 1],
  ['commander', 'commander', '将軍', 'Commander', '軍を率いる立場になる', 'Rise to command an army.', 1],
  ['shop', 'shop', '一国一城', 'Shopkeeper', '自分の店を持つ', 'Open a shop of your own.', 1],
  ['revived', 'revived', 'もう一度', 'One More Time', '死を一度なかったことにする', 'Undo your own death once.', 1],
  ['awakened', 'bloom', '外れの覚醒', 'The Dud Awakens', '外れスキルを覚醒させる', 'Awaken your Dud Skill.', 2],
  ['memoir', 'memoir', '自伝', 'Memoirs', '自分の一生を書き残す', 'Write down the story of your life.', 1],
  ['grandparent', 'grandparent', '孫の顔', 'Grandparent', '孫の顔を見る', 'Live to see a grandchild.', 1],
  ['statue', 'statue', '銅像', 'Statue in the Square', '自分の像が建つ', 'Have a statue raised in your honor.', 2],
  ['freed', 'freed', '自由の身', 'Free at Last', '奴隷の身から自由になる', 'Win your freedom from slavery.', 2],
  ['cursed', 'cursed', '呪われし者', 'Cursed', '呪いを受ける', 'Fall under a curse.', 0],
  ['ne.sect', 'sect', '入門', 'Sect Disciple', '仙侠の宗門に入る', 'Join a cultivation sect.', 0],
  ['ne.core', 'core', '金丹', 'Golden Core', '金丹を結ぶ', 'Form a Golden Core.', 2],
  ['fu_streamer', 'streamer', '配信者', 'Streamer', 'ダンジョン配信を始める', 'Start streaming your dungeon runs.', 1],
];

const FEAT: AchievementDef[] = [
  ...(['S'] as const).map((r) => a('feat', `rank${r}`, [`ランク${r}`, `Rank ${r}`],
    [`ギルドのランク${r}以上で一生を終える`, `End a life at Rank ${r} or higher in the guild.`], rankAtLeast(r), r === 'S' ? 3 : r === 'A' ? 2 : r === 'B' ? 1 : 0)),
  ...ARC.map(([f, n, ja, en, dja, tk]) => a('feat', `arc.${n}`, [ja, en], [dja, ARC_EN[n]], flag(f), tk)),
  ...FLAGS.map(([f, n, ja, en, dja, den, tk]) => a('feat', n, [ja, en], [dja, den], flag(f), tk)),
  ...AGES.map(([n, ja, en, tk]) => a('feat', `age${n}`, [ja, en], [`${n}歳まで生きる`, `Live to ${n}.`], ageGte(n), tk)),
  ...MARRY.map(([n, ja, en, tk]) => a('feat', `marry${n}`, [ja, en], [`1つの人生で${n}回結婚する`, n === 1 ? 'Marry.' : `Marry ${n} times in one life.`], { fact: 'marriages', gte: n }, tk)),
  ...KIDS.map(([n, ja, en, tk]) => a('feat', `kids${n}`, [ja, en], [`1つの人生で子を${n}人もつ`, `Have ${n} child${n > 1 ? 'ren' : ''} in one life.`], { fact: 'children', gte: n }, tk)),
  ...WINS.map(([n, ja, en, tk]) => a('feat', `wins${n}`, [ja, en], [`1つの人生で${n}回戦いに勝つ`, `Win ${n} fight${n > 1 ? 's' : ''} in one life.`], { fact: 'foesWon', gte: n }, tk)),
  a('feat', 'newborn', ['短すぎた一生', 'Too Brief'], ['生まれたその年に亡くなる', 'Die in the year you were born.'], { fact: 'age', lte: 0 }),
  a('feat', 'firstQuest', ['最初で最後の冒険', 'First and Last Quest'], ['冒険に出たその年に亡くなる', 'Die in the same year you set out on your first adventure.'], { fact: 'firstYearAdventure', eq: true }),
  a('feat', 'rest', ['千年の眠り', 'A Thousand Years, Then Rest'], ['〈不死の体〉で千年を生き、永い眠りを選ぶ', 'Live a thousand years with the Undying Body, then choose to rest.'], all(cheat('immortal_body'), death('d.age-rest')), 5),
  a('feat', 'heq100', ['人の世の百年', 'A Human Century'], ['人間に換算して100歳まで生きる', 'Live to the human equivalent of 100.'], { fact: 'heq', gte: 100 }, 2),
  a('feat', 'beyond2', ['長すぎる余生', 'Overtime'], ['寿命の目安の1.5倍を生きる', 'Live one and a half times the expected lifespan.'], { fact: 'lifespanRatio', gte: 1.5 }, 2),
  a('feat', 'pacifist', ['剣を持たず', 'Never Drew a Blade'], ['一度も戦わずに60歳まで生きる', 'Reach 60 without a single fight.'], all({ fact: 'foesMet', eq: 0 }, ageGte(60)), 1),
  a('feat', 'scarred', ['二度目はなかった', 'No Second Rewind'], ['一度は死を取り消し、それでも老いる前に亡くなる', 'Undo your death once, and still die before old age.'], all(flag('revived'), { not: hazard('age') }), 1),
  // 作戦を一生変えずに通したもの (途中で変えると tactic は mixed)
  a('feat', 'safeLong', ['いのちだいじに', 'Safety First'], ['作戦「いのちだいじに」のまま、寿命の目安まで生きる', 'Keep "Play it safe" all life and reach the expected lifespan.'], all({ fact: 'tactic', eq: 'careful' }, { fact: 'lifespanRatio', gte: 1 }), 1),
  a('feat', 'allOut', ['ガンガンいこうぜ', 'All Out'], ['作戦「ガンガンいこうぜ」のまま、竜か魔王を討つ', 'Keep "Go all out" all life and slay a dragon or the Demon Lord.'], all({ fact: 'tactic', eq: 'bold' }, { any: [flag('dragonSlayer'), flag('demonKingSlain')] }), 2),
  a('feat', 'heroDemon', ['救世の勇者', 'Savior of the World'], ['勇者として魔王を討ち、老いて亡くなる', 'Slay the Demon Lord as the Hero and die of old age.'], all(flag('hero'), flag('demonKingSlain'), hazard('age')), 3),
  a('feat', 'orphanHero', ['孤児から勇者へ', 'From Orphan to Hero'], ['孤児として生まれ、勇者になる', 'Be born an orphan and become the Hero.'], all({ fact: 'status', eq: 'orphan' }, flag('hero')), 2),
  a('feat', 'slaveFame', ['鎖を越えて', 'Beyond the Chains'], ['奴隷として生まれ、名声を得る', 'Be born a slave and become famous.'], all({ fact: 'status', eq: 'slave' }, flag('famous')), 2),
  a('feat', 'royalS', ['王族の冒険者', 'Royal Adventurer'], ['王族に生まれ、ランクSになる', 'Be born royal and reach Rank S.'], all({ fact: 'status', eq: 'royal' }, { fact: 'rank', eq: 'S' }), 2),
  a('feat', 'poorLord', ['成り上がり', 'Rags to Riches'], ['貧しい家に生まれ、領主になる', 'Be born poor and become a lord.'], all({ fact: 'status', eq: 'poor' }, flag('lord')), 2),
  a('feat', 'nativeLegend', ['この世界の生まれ', 'Born of This World'], ['前世を持たずに生まれ、名声を得る', 'Become famous without any past life.'], all({ fact: 'arrival', eq: 'native' }, flag('famous')), 1),
  a('feat', 'summonedOld', ['帰らなかった', 'Never Went Home'], ['召喚された身で、その世界で老いて亡くなる', 'Be summoned to another world and die there of old age.'], all({ fact: 'arrival', eq: 'summoned' }, hazard('age')), 1),
  a('feat', 'noCheat', ['ただの人', 'Just a Person'], ['特典を持たずに名声を得る', 'Become famous with no cheat skill at all.'], all({ not: { any: CHEAT_IDS.map(cheat) } }, flag('famous')), 2),
];

// ---- world 世界ごと -------------------------------------------------------------

const WORLD: AchievementDef[] = [
  ...WORLD_IDS.flatMap((w) => {
    const n = WORLDS[w].name;
    const p = worldPlace(WORLDS[w]).en;
    return [
      a('world', `${w}.life`, [`${n.ja}の住人`, `Resident of ${n.en}`], [`${n.ja}で一生を終える`, `Live out a life in ${p}.`], world(w)),
      a('world', `${w}.long`, [`${n.ja}の長寿`, `Long Life in ${n.en}`], [`${n.ja}で寿命の目安の1.1倍を生きる`, `Live 1.1 times the expected lifespan in ${p}.`], all(world(w), { fact: 'lifespanRatio', gte: 1.1 }), 2),
      a('world', `${w}.rankS`, [`${n.ja}のランクS`, `Rank S in ${n.en}`], [`${n.ja}でランクSになる`, `Reach Rank S in ${p}.`], all(world(w), { fact: 'rank', eq: 'S' }), 2),
    ];
  }),
  a('world', 'distinct3', ['三つの世界', 'Three Worlds'], ['3つの世界で一生を送る', 'Live in 3 different worlds.'], { distinct: 'worlds', gte: 3 }),
  a('world', 'distinct8', ['八つの世界', 'Eight Worlds'], ['8つの世界で一生を送る', 'Live in 8 different worlds.'], { distinct: 'worlds', gte: 8 }, 1),
  a('world', 'distinct16', ['すべての世界', 'Every World'], ['16の世界すべてで一生を送る', 'Live in all 16 worlds.'], { distinct: 'worlds', gte: 16 }, 3),
  a('world', 'every60', ['どこでも還暦', 'Sixty Everywhere'], ['すべての世界で60歳まで生きる', 'Reach 60 in every world.'], { everyWorld: true, fact: 'age', gte: 60 }, 5),
];

// ---- race 種族ごと --------------------------------------------------------------

const RACE: AchievementDef[] = [
  ...RACE_IDS.flatMap((r) => {
    const n = RACES[r].name;
    return [
      a('race', `${r}.life`, [`${n.ja}として`, `Life as ${n.en}`], [`${n.ja}として一生を終える`, `Live out a life as a ${n.en.toLowerCase()}.`], race(r)),
      a('race', `${r}.long`, [`${n.ja}の長寿`, `Long-Lived ${n.en}`], [`${n.ja}として寿命の目安の1.2倍を生きる`, `Live 1.2 times the expected lifespan as a ${n.en.toLowerCase()}.`], all(race(r), long12), 1),
    ];
  }),
  a('race', 'distinct5', ['五つの姿', 'Five Forms'], ['5つの種族を遊ぶ', 'Play as 5 different races.'], { distinct: 'races', gte: 5 }),
  a('race', 'distinct10', ['十の姿', 'Ten Forms'], ['10の種族を遊ぶ', 'Play as 10 different races.'], { distinct: 'races', gte: 10 }, 1),
  a('race', 'distinct20', ['二十の姿', 'Twenty Forms'], ['20の種族を遊ぶ', 'Play as 20 different races.'], { distinct: 'races', gte: 20 }, 2),
  a('race', 'distinctAll', ['すべての姿', 'Every Form'], [`${RACE_IDS.length}の種族すべてを遊ぶ`, `Play as all ${RACE_IDS.length} races.`], { distinct: 'races', gte: RACE_IDS.length }, 3),
];

// ---- cheat 特典ごと -------------------------------------------------------------

const CHEAT: AchievementDef[] = [
  ...CHEAT_IDS.flatMap((c) => {
    const n = CHEATS[c].name;
    return [
      a('cheat', `${c}.life`, [`〈${n.ja}〉の一生`, `${n.en} Life`], [`〈${n.ja}〉を持って一生を終える`, `Live out a life with the ${n.en} cheat skill.`], cheat(c)),
      a('cheat', `${c}.rankS`, [`〈${n.ja}〉でランクS`, `Rank S with ${n.en}`], [`〈${n.ja}〉を持ってランクSになる`, `Reach Rank S with the ${n.en} cheat skill.`], all(cheat(c), { fact: 'rank', eq: 'S' }), 1),
      a('cheat', `${c}.long`, [`〈${n.ja}〉と長寿`, `Long Life with ${n.en}`], [`〈${n.ja}〉を持って寿命の目安の1.2倍を生きる`, `Live 1.2 times the expected lifespan with the ${n.en} cheat skill.`], all(cheat(c), long12), 1),
    ];
  }),
  a('cheat', 'distinct5', ['五つの特典', 'Five Cheats'], ['5つの特典を試す', 'Try 5 different cheat skills.'], { distinct: 'cheats', gte: 5 }),
  a('cheat', 'distinct15', ['十五の特典', 'Fifteen Cheats'], ['15の特典を試す', 'Try 15 different cheat skills.'], { distinct: 'cheats', gte: 15 }, 1),
  a('cheat', 'distinctAll', ['すべての特典', 'Every Cheat'], [`${CHEAT_IDS.length}の特典すべてを試す`, `Try all ${CHEAT_IDS.length} cheat skills.`], { distinct: 'cheats', gte: CHEAT_IDS.length }, 3),
];

// ---- death 死に方 ---------------------------------------------------------------

const HAZARDS: [Hazard, string, string, string, string][] = [
  ['infant', '幼くして', 'Gone Too Soon', '乳幼児期の病や飢えで亡くなる', 'Die of an illness of infancy.'],
  ['disease', '病に伏す', 'Taken by Illness', '病で亡くなる', 'Die of disease.'],
  ['monster', '魔物の餌食', 'Monster Food', '魔物や獣に倒される', 'Fall to a monster or beast.'],
  ['violence', '凶刃', 'Foul Play', '賊・暗殺・決闘などで命を落とす', 'Die by robbery, assassination, or a duel.'],
  ['war', '戦に散る', 'Fallen in War', '戦争で亡くなる', 'Die in a war.'],
  ['accident', '不慮の事故', 'Freak Accident', '事故や災害で亡くなる', 'Die in an accident or disaster.'],
  ['childbirth', '命を繋いで', 'A Life for a Life', 'お産で亡くなる', 'Die in childbirth.'],
  ['magic', '力に呑まれて', 'Consumed by Power', '魔力の暴走や呪いで亡くなる', 'Die from runaway magic or a curse.'],
  ['execution', '断罪', 'Condemned', '処刑や断罪で命を落とす', 'Be executed.'],
  ['famine', '飢え', 'Starved', '飢饉で亡くなる', 'Die of famine.'],
  ['plague', '疫病', 'Plague-Stricken', '大疫病で亡くなる', 'Die in a great plague.'],
];

const DEATH_IDS: [string, string[], string, string, string, string, number][] = [
  ['dragonfire', ['d.mon-dragon', 'd.mon-dragon-fight'], '竜の炎', 'Dragonfire', '竜に挑んで、あるいは焼かれて亡くなる', 'Be slain by a dragon.', 1],
  ['mimic', ['d.mon-mimic'], '宝箱の罠', 'It Was a Mimic', 'ミミックに食われる', 'Get eaten by a mimic.', 1],
  ['trap', ['d.mon-trap'], '罠', 'It\'s a Trap', 'ダンジョンの罠で命を落とす', 'Die to a dungeon trap.', 0],
  ['lost', ['d.mon-lost'], '迷宮の迷子', 'Lost in the Labyrinth', 'ダンジョンで迷って帰れない', 'Get lost in a dungeon for good.', 1],
  ['boss', ['d.mon-boss'], 'ボス部屋', 'Boss Room', 'ダンジョンの主に敗れる', 'Fall to a dungeon boss.', 1],
  ['goblins', ['d.mon-goblins'], 'ゴブリンの群れ', 'Goblin Horde', 'ゴブリンの群れに倒される', 'Be overrun by goblins.', 0],
  ['yokai', ['d.mon-yokai', 'd.mon-yokai-river'], '神隠し', 'Spirited Away', '妖怪に連れ去られる', 'Be taken by a yokai.', 1],
  ['undead', ['d.mon-undead'], '死者の列', 'Join the Dead', 'アンデッドに倒される', 'Fall to the undead.', 0],
  ['sea', ['d.mon-sea'], '海の底へ', 'To the Depths', '海の魔物に引きずり込まれる', 'Be dragged under by a sea monster.', 0],
  ['mutant', ['d.mon-mutant', 'd.mon-mutant-night'], '変異の夜', 'Mutant Night', '変異体に襲われる', 'Be killed by mutants.', 0],
  ['alien', ['d.mon-alien'], '未知の生物', 'Xenofauna', '異星の生き物に襲われる', 'Be killed by alien creatures.', 1],
  ['gate', ['d.mon-modern-gate'], 'ゲートの向こう', 'Through the Gate', '現代に開いたゲートの魔物に倒される', 'Fall to a monster from a dungeon gate.', 1],
  ['demonArmy', ['d.war-demon', 'd.war-demon-town'], '魔王軍の進撃', 'The Demon Army Marches', '魔王軍に倒される', 'Be killed by the Demon Lord\'s army.', 0],
  ['spaceWar', ['d.war-space', 'd.war-pilot'], '星の海に散る', 'Lost Among the Stars', '宇宙の戦いで艦と共に沈む', 'Go down with your ship in a space battle.', 1],
  ['trench', ['d.war-trench'], '塹壕', 'The Trenches', '塹壕の戦で亡くなる', 'Die in trench warfare.', 1],
  ['siege', ['d.war-siege', 'd.war-siege-hunger'], '落城', 'The Castle Falls', '籠城の末に亡くなる', 'Die in a siege.', 0],
  ['teleport', ['d.acc-teleport'], '転移事故', 'Teleport Mishap', '転移魔法の事故で亡くなる', 'Die in a teleportation accident.', 1],
  ['drunk', ['d.acc-drunk'], '飲みすぎ', 'One Too Many', '酔って事故に遭う', 'Die in a drunken accident.', 0],
  ['vehicle', ['d.acc-car', 'd.acc-rail', 'd.acc-flycar', 'd.acc-cart'], '乗り物の事故', 'Traffic Accident', '乗り物の事故で亡くなる', 'Die in a traffic accident.', 0],
  ['sandstorm', ['d.acc-sandstorm'], '砂嵐', 'Sandstorm', '砂嵐に呑まれる', 'Be swallowed by a sandstorm.', 0],
  ['tribulation', ['d.mag-tribulation', 'd.mag-deviation'], '天劫', 'Heavenly Tribulation', '天劫や走火入魔で命を落とす', 'Die to the Heavenly Tribulation or a cultivation deviation.', 1],
  ['divine', ['d.mag-divine', 'd.mag-divine-fantasy'], '神罰', 'Divine Wrath', '神罰を受けて亡くなる', 'Be struck down by divine wrath.', 1],
  ['stake', ['d.exe-witch', 'd.exe-heretic'], '火刑', 'Burned at the Stake', '魔女や異端として火刑に処される', 'Be burned as a witch or heretic.', 1],
  ['condemned', ['d.exe-condemned', 'd.exe-exile'], '婚約破棄の果て', 'After the Broken Engagement', '貴族社会で断罪され、命を落とす', 'Be condemned by noble society and die for it.', 1],
  ['disposed', ['d.exe-ai', 'd.exe-agency'], '処分', 'Disposed Of', '組織に処分される', 'Be eliminated by those in charge.', 1],
  ['heroSilenced', ['d.exe-hero'], '用済み', 'No Longer Needed', '勇者や聖女として口を封じられる', 'Be silenced as a Hero or Saintess.', 2],
  ['duel', ['d.vio-duel', 'd.vio-duel-warrior'], '決闘', 'Duel to the Death', '決闘に敗れる', 'Lose a duel.', 0],
  ['arena', ['d.vio-arena'], '闘技場', 'The Arena', '闘技場で倒れる', 'Fall in the arena.', 1],
  ['courtPoison', ['d.vio-poison', 'd.vio-poison-court'], '毒の杯', 'The Poisoned Cup', '毒を盛られる', 'Be poisoned.', 0],
  ['betrayed', ['d.vio-betrayed'], '裏切り', 'Backstabbed', '仲間に裏切られて亡くなる', 'Be betrayed by your own party.', 1],
  ['scurvy', ['d.dis-scurvy'], '壊血病', 'Scurvy', '長い航海で壊血病にかかる', 'Die of scurvy at sea.', 0],
  ['radiation', ['d.dis-space-radiation', 'd.dis-ruin-radiation', 'd.dis-ruin-soil'], '見えない毒', 'Invisible Poison', '放射線で体を壊す', 'Die of radiation.', 0],
  ['faded', ['d.age-elf', 'd.age-fairy', 'd.age-vampire', 'd.age-android', 'd.age-cultivator', 'd.age-slime'], '静かに消える', 'Faded Away', '長い生の終わりに、静かに消える', 'Fade away at the end of a long life.', 1],
];

// 出会った敵の姿と死因の組み合わせ (その人生で戦った姿があり、その分類で亡くなった)
const FOE_DEATHS: [string, Hazard, string, string, string, string][] = [
  ['goblin', 'monster', 'ゴブリンに', 'Goblin Slain', 'ゴブリンと戦い、魔物に倒れる', 'Fight goblins and fall to a monster.'],
  ['wolf', 'monster', '狼の牙', 'Wolf\'s Fang', '狼と戦い、魔物に倒れる', 'Fight wolves and fall to a beast.'],
  ['kraken', 'monster', 'クラーケン', 'Kraken', 'クラーケンと戦い、魔物に倒れる', 'Fight a kraken and fall to a monster.'],
  ['scorpion', 'monster', '砂の毒針', 'Sting in the Sand', '大サソリと戦い、魔物に倒れる', 'Fight a giant scorpion and fall to a monster.'],
  ['bandit', 'violence', '山賊の刃', 'Bandit\'s Blade', '山賊と戦い、凶刃に倒れる', 'Fight bandits and die by violence.'],
  ['pirate', 'violence', '海賊の刃', 'Pirate\'s Cutlass', '海賊と戦い、凶刃に倒れる', 'Fight pirates and die by violence.'],
];

const DEATH: AchievementDef[] = [
  ...HAZARDS.map(([h, ja, en, dja, den]) => a('death', h, [ja, en], [dja, den], hazard(h))),
  ...DEATH_IDS.map(([n, ids, ja, en, dja, den, tk]) => a('death', n, [ja, en], [dja, den], death(...ids), tk)),
  ...FOE_DEATHS.map(([k, h, ja, en, dja, den]) => a('death', `foe.${k}`, [ja, en], [dja, den], all({ has: 'foeKinds', id: k }, hazard(h)), 1)),
  a('death', 'distinct10', ['十の死に様', 'Ten Ways to Go'], ['10通りの死に方を見る', 'Die in 10 different ways.'], { distinct: 'deaths', gte: 10 }),
  a('death', 'distinct25', ['二十五の死に様', 'Twenty-Five Ways to Go'], ['25通りの死に方を見る', 'Die in 25 different ways.'], { distinct: 'deaths', gte: 25 }, 1),
  a('death', 'distinct50', ['五十の死に様', 'Fifty Ways to Go'], ['50通りの死に方を見る', 'Die in 50 different ways.'], { distinct: 'deaths', gte: 50 }, 2),
  a('death', 'distinct100', ['死の百科事典', 'Encyclopedia of Endings'], ['100通りの死に方を見る', 'Die in 100 different ways.'], { distinct: 'deaths', gte: 100 }, 3),
];

// ---- social 人の輪 ---------------------------------------------------------------

const SOCIAL: AchievementDef[] = [
  a('social', 'bond100', ['魂の片割れ', 'Other Half'], ['輪の誰かと近さ100に届く', 'Reach a bond of 100 with someone.'], { fact: 'maxBond', gte: 100 }, 2),
  a('social', 'outlived', ['最後のひとり', 'Last One Standing'], ['輪の全員より長く生きる', 'Outlive everyone in your circle.'], { fact: 'outlivedAll', eq: true }, 1),
  a('social', 'outlivedLong', ['置いていかれる側', 'The One Left Behind'], ['輪の全員より長く生き、200歳を越える', 'Outlive everyone in your circle and pass 200.'], all({ fact: 'outlivedAll', eq: true }, ageGte(200)), 2),
  a('social', 'reincFight', ['同郷との戦い', 'Reincarnator Clash'], ['転生者と戦う', 'Fight another reincarnator.'], { fact: 'reincFought', gte: 1 }, 1),
  a('social', 'reincFightOld', ['因縁の果てに', 'After the Feud'], ['転生者と戦い、それでも老いて亡くなる', 'Fight another reincarnator and still die of old age.'], all({ fact: 'reincFought', gte: 1 }, hazard('age')), 2),
  a('social', 'devoted', ['一途', 'Devoted'], ['一度だけ結婚し、近さ80の相手と老いて亡くなる', 'Marry once, keep a bond of 80, and die of old age.'], all({ fact: 'marriages', eq: 1 }, { fact: 'maxBond', gte: 80 }, hazard('age')), 1),
  a('social', 'partyLegend', ['仲間と伝説へ', 'Legend Together'], ['パーティに入り、伝説になる', 'Join a party and become a legend.'], all(flag('party'), flag('arc.legend')), 2),
  a('social', 'remarried', ['もう一度、誰かと', 'Love Again'], ['連れ合いを亡くしたあと、再び結婚する', 'Lose a spouse and marry again.'], flag('remarried'), 1),
];

// ---- generation 家系 ---------------------------------------------------------------

const GEN: AchievementDef[] = [
  ...([[2, '二代目', 'Second Generation', 0], [3, '三代目', 'Third Generation', 1], [5, '五代続く家', 'Five Generations', 2], [10, '十代の系譜', 'Ten Generations', 3], [20, '永き血筋', 'Unbroken Line', 5]] as const)
    .map(([n, ja, en, tk]) => a('generation', `gen${n}`, [ja, en], [`1つの家系で${n}代目まで続ける`, `Carry one family line to generation ${n}.`], { fact: 'gen', gte: n }, tk)),
  a('generation', 'gen3old', ['三代の大往生', 'Three Generations Grown Old'], ['3代目以降で老いて亡くなる', 'Die of old age in the third generation or later.'], all({ fact: 'gen', gte: 3 }, hazard('age')), 1),
  a('generation', 'gen2lord', ['家を継ぐ', 'The Heir'], ['2代目以降で領主になる', 'Become a lord in the second generation or later.'], all({ fact: 'gen', gte: 2 }, flag('lord')), 1),
  a('generation', 'gen5old', ['老舗の家', 'Old House'], ['5代目以降で老いて亡くなる', 'Die of old age in the fifth generation or later.'], all({ fact: 'gen', gte: 5 }, hazard('age')), 2),
];

// ---- collection 図鑑 ---------------------------------------------------------------

const ENCOUNTERS: [string, string, string][] = [
  ['goddess', '女神', 'the Goddess'], ['dragon', '古き竜', 'an ancient dragon'], ['royal', '王族', 'royalty'], ['master', '師', 'a master'],
  ['rare_familiar', '珍しい使い魔', 'a rare familiar'], ['demon_lord', '魔王', 'the Demon Lord'], ['spirit_king', '精霊王', 'the Spirit King'],
  ['phoenix', '不死鳥', 'a phoenix'], ['sage', '賢者', 'a sage'], ['saintess', '聖女', 'the Saintess'], ['hero', '勇者', 'the Hero'],
  ['ancient_ai', '古代のAI', 'an ancient AI'], ['alien_envoy', '異星の使者', 'an alien envoy'], ['yokai_lord', '妖怪の主', 'a yokai lord'],
  ['immortal', '仙人', 'an immortal'], ['vampire_lord', '吸血鬼の真祖', 'a vampire lord'], ['lich', 'リッチ', 'a lich'],
  ['leviathan', 'リヴァイアサン', 'Leviathan'], ['world_tree', '世界樹', 'the World Tree'], ['time_traveler', '時の旅人', 'a time traveler'],
  ['past_friend', '前世の友', 'a friend from your past life'],
  ['reinc_hero', '勇者になった転生者', 'a reincarnator who became a Hero'], ['reinc_demonlord', '魔王になった転生者', 'a reincarnator who became a Demon Lord'],
  ['reinc_ruler', '国を治める転生者', 'a reincarnator who rules a nation'], ['reinc_merchant', '商人の転生者', 'a reincarnator merchant'],
  ['reinc_retired', 'スローライフの転生者', 'a reincarnator living the slow life'],
];
const PCTS = [25, 50, 75, 100] as const;
const ENC_PCTS = [50, 75, 100] as const;
// 1件ずつの実績にするのは、まれな出会いだけ (よく起きる出会いは図鑑の割合で数える)
const RARE_MEETS = ['dragon', 'demon_lord', 'phoenix', 'yokai_lord', 'vampire_lord', 'lich', 'leviathan', 'time_traveler', 'reinc_demonlord', 'reinc_ruler'];
const pctTk = (p: number) => (p >= 100 ? 5 : p >= 75 ? 3 : p >= 50 ? 2 : p >= 25 ? 1 : 0);

const COLLECTION: AchievementDef[] = [
  ...ENCOUNTERS.filter(([id]) => RARE_MEETS.includes(id)).map(([id, ja, en]) => a('collection', `meet.${id}`, [`${ja}に会う`, `Met ${en}`], [`${ja}に出会う`, `Meet ${en}.`], { has: 'encounters', id }, 1)),
  ...PCTS.map((p) => a('collection', `bestiary${p}`, [`魔物図鑑 ${p}%`, `Bestiary ${p}%`], [`魔物図鑑を${p}%埋める`, `Fill ${p}% of the bestiary.`], { collection: 'bestiary', pct: p }, pctTk(p))),
  ...PCTS.map((p) => a('collection', `won${p}`, [`討伐記録 ${p}%`, `Victories ${p}%`], [`図鑑の敵の${p}%に勝つ`, `Defeat ${p}% of the bestiary's foes.`], { collection: 'bestiaryWon', pct: p }, pctTk(p))),
  ...ENC_PCTS.map((p) => a('collection', `encounters${p}`, [`出会い図鑑 ${p}%`, `Encounters ${p}%`], [`出会い図鑑を${p}%埋める`, `Fill ${p}% of the encounter log.`], { collection: 'encounters', pct: p }, pctTk(p))),
  ...PCTS.map((p) => a('collection', `unlocks${p}`, [p === 100 ? 'すべて解放' : `解放 ${p}%`, p === 100 ? 'Everything Unlocked' : `Unlocks ${p}%`], [`解放できるものの${p}%を解放する`, `Unlock ${p}% of everything.`], { collection: 'unlocks', pct: p }, pctTk(p))),
  ...PCTS.map((p) => a('collection', `achievements${p}`, [p === 100 ? '完全制覇' : `実績 ${p}%`, p === 100 ? 'Completionist' : `Achievements ${p}%`], [`実績の${p}%を解除する`, `Earn ${p}% of all achievements.`], { collection: 'achievements', pct: p }, p >= 100 ? 0 : pctTk(p))),
  a('collection', 'foes10', ['十種の敵', 'Ten Kinds of Foe'], ['10種類の敵に出会う', 'Meet 10 kinds of foe.'], { distinct: 'foeKinds', gte: 10 }),
  a('collection', 'foes30', ['三十種の敵', 'Thirty Kinds of Foe'], ['30種類の敵に出会う', 'Meet 30 kinds of foe.'], { distinct: 'foeKinds', gte: 30 }, 1),
  a('collection', 'meet8', ['縁の多い魂', 'Well-Met Soul'], ['8種類のまれな出会いを果たす', 'Have 8 kinds of rare encounter.'], { distinct: 'encounters', gte: 8 }, 1),
  a('collection', 'meet15', ['出会いの達人', 'Fateful Meetings'], ['15種類のまれな出会いを果たす', 'Have 15 kinds of rare encounter.'], { distinct: 'encounters', gte: 15 }, 2),
];

// ---- secret 秘密 -------------------------------------------------------------------

const S = (name: string, nm: [string, string], desc: [string, string], cond: Cond, tickets = 1) => a('secret', name, nm, desc, cond, tickets, true);

const SECRET: AchievementDef[] = [
  S('undyingSealed', ['不死とは', 'So Much for Undying'], ['〈不死の体〉を持ちながら、30歳までに処刑や呪いで封じられる', 'Be sealed away by execution or a curse before 31, despite your Undying Body.'], all(cheat('immortal_body'), { fact: 'age', lte: 30 }, { any: [hazard('execution'), hazard('magic')] }), 2),
  S('unluckyLuck', ['運の尽き', 'Luck Ran Out'], ['〈幸運MAX〉なのに事故で亡くなる', 'Die in an accident despite Max Luck.'], all(cheat('max_luck'), hazard('accident')), 2),
  S('hungryCook', ['腕の振るいどころ', 'Nothing to Cook'], ['〈料理〉の特典を持ちながら飢えて亡くなる', 'Starve to death with the Cooking cheat skill.'], all(cheat('cooking'), hazard('famine')), 2),
  S('emptyBox', ['倉庫は空だった', 'The Box Was Empty'], ['〈アイテムボックス〉を持ちながら飢えて亡くなる', 'Starve to death with an Item Box.'], all(cheat('item_box'), hazard('famine')), 2),
  S('farmerFamine', ['実らなかった知識', 'Barren Knowledge'], ['〈農業の知識〉を持ちながら飢えて亡くなる', 'Starve to death despite your farming know-how.'], all(cheat('agri_knowledge'), hazard('famine')), 2),
  S('creationFamine', ['何でも作れたのに', 'Could Have Made Bread'], ['〈創造〉を持ちながら飢えて亡くなる', 'Starve to death with the power of Creation.'], all(cheat('creation'), hazard('famine')), 2),
  S('shopFamine', ['配送遅延', 'Delivery Delayed'], ['〈ネット通販〉を持ちながら飢えて亡くなる', 'Starve to death with an Online Shop.'], all(cheat('online_shop'), hazard('famine')), 2),
  S('doctorSick', ['医者の不養生', 'Physician, Heal Thyself'], ['〈医療の知識〉を持ちながら病で亡くなる', 'Die of disease with Modern Medicine.'], all(cheat('modern_medicine'), { any: [hazard('disease'), hazard('plague')] })),
  S('regenSick', ['治らない傷もある', 'Not That Kind of Wound'], ['〈超再生〉を持ちながら病で亡くなる', 'Die of disease despite Regeneration.'], all(cheat('regeneration'), hazard('disease'))),
  S('appraisalShroom', ['鑑定し忘れ', 'Forgot to Appraise'], ['〈鑑定〉を持ちながら毒きのこで亡くなる', 'Die from a bad mushroom despite Appraisal.'], all(cheat('appraisal'), death('d.acc-mushroom')), 2),
  S('mapLost', ['地図はあった', 'Had a Map, Though'], ['〈マップと探知〉を持ちながら迷宮で迷って亡くなる', 'Get lost in a dungeon with Map and Sense.'], all(cheat('map'), death('d.mon-lost')), 2),
  S('poisonImmune', ['効かないはずの毒', 'Supposedly Immune'], ['〈状態異常無効〉を持ちながら毒殺される', 'Be poisoned despite Status Immunity.'], all(cheat('poison_immunity'), death('d.vio-poison', 'd.vio-poison-court')), 2),
  S('foresightDoom', ['知っていたのに', 'Saw It Coming'], ['〈原作知識〉を持ちながら断罪される', 'Be executed despite your Foreknowledge.'], all(cheat('foresight'), hazard('execution')), 2),
  S('unusedReturn', ['戻る必要がなかった', 'Never Needed It'], ['〈死に戻り〉を一度も使わずに老いて亡くなる', 'Die of old age without once using Return by Death.'], all(cheat('return_by_death'), { not: flag('revived') }, hazard('age'))),
  S('tamerBitten', ['飼い犬に手を噛まれる', 'Bitten by the Hand You Fed'], ['〈テイム〉を持ちながら魔物に倒される', 'Be killed by a monster with the Taming cheat skill.'], all(cheat('tamer'), death('d.mon-tamer')), 2),
  S('swordSaintDuel', ['上には上が', 'Always Someone Better'], ['〈剣聖〉なのに決闘で敗れる', 'Lose a duel as a Sword Saint.'], all(cheat('sword_saint'), death('d.vio-duel', 'd.vio-duel-warrior')), 2),
  S('holyWrath', ['神様の手違い', 'Divine Clerical Error'], ['〈聖なる力〉を持ちながら神罰で亡くなる', 'Be struck down by divine wrath while wielding Holy Power.'], all(cheat('holy_power'), death('d.mag-divine', 'd.mag-divine-fantasy')), 2),
  S('manaOverload', ['無限にも限度', 'Infinity Has Limits'], ['〈無限の魔力〉を持ちながら力の暴走で亡くなる', 'Die from runaway power with Infinite Mana.'], all(cheat('infinite_mana'), hazard('magic')), 2),
  S('psychicBurn', ['頭が焼ける', 'Brain Burn'], ['〈超能力〉の使いすぎで亡くなる', 'Burn out from overusing your Psychic powers.'], all(cheat('psychic'), death('d.mag-psychic-burn'))),
  S('hackerHacked', ['逆探知', 'Traced Back'], ['〈ハッキング〉の最中に亡くなる', 'Die mid-hack with the Hacking cheat skill.'], all(cheat('hacking'), death('d.mag-hacker'))),
  S('stealthFame', ['目立ってしまった', 'Too Conspicuous'], ['〈気配遮断〉を持ちながら名声を得る', 'Become famous despite Stealth.'], all(cheat('stealth'), flag('famous'))),
  S('hiddenFame', ['隠しきれない', 'Couldn\'t Hide It'], ['〈ステータス偽装〉を持ちながら名声を得る', 'Become famous despite Status Disguise.'], all(cheat('hide_status'), flag('famous'))),
  S('dudLegend', ['外れが当たり', 'The Dud Was a Jackpot'], ['〈外れスキル〉で伝説になる', 'Become a legend with a Dud Skill.'], all(cheat('trash_skill'), flag('arc.legend')), 2),
  S('gachaLegend', ['大当たり', 'Jackpot'], ['〈ガチャ〉で伝説になる', 'Become a legend with Gacha.'], all(cheat('gacha'), flag('arc.legend')), 2),
  S('expRush', ['経験値が入る前に', 'No EXP Gained'], ['〈経験値倍増〉を持ちながら冒険に出たその年に亡くなる', 'Die in your first year of adventuring with EXP Boost.'], all(cheat('exp_boost'), { fact: 'firstYearAdventure', eq: true })),
  S('heroYoung', ['早すぎた勇者', 'Hero for a Day'], ['勇者になり、19歳になる前に亡くなる', 'Become the Hero and die before 19.'], all(flag('hero'), { fact: 'age', lte: 18 }), 2),
  S('heroExecuted', ['恩を仇で', 'Thanks for Nothing'], ['魔王を討ったのに処刑される', 'Slay the Demon Lord, then get executed.'], all(flag('demonKingSlain'), hazard('execution')), 3),
  S('slimeSlime', ['共食い', 'Slime on Slime'], ['スライムに生まれ、スライムに倒される', 'Be born a slime and be defeated by a slime.'], all(race('slime'), death('d.mon-slime')), 3),
  S('dragonDragon', ['同族の炎', 'Kin\'s Fire'], ['竜人に生まれ、竜に倒される', 'Be born dragonkin and be slain by a dragon.'], all(race('dragonkin'), death('d.mon-dragon', 'd.mon-dragon-fight')), 2),
  S('elfInfant', ['千年のうちの数年', 'A Few Years of a Thousand'], ['千年を生きるはずのエルフとして、幼い日の病で亡くなる', 'Die of a childhood illness as an elf, born to live a thousand years.'], all(race('elf'), hazard('infant')), 2),
  S('oldGoblin', ['ゴブリンの長老', 'Goblin Elder'], ['ゴブリンとして40歳まで生きる', 'Reach 40 as a goblin.'], all(race('goblin'), ageGte(40)), 3),
  S('oldFairy', ['妖精の古老', 'Ancient Fairy'], ['妖精として50歳まで生きる', 'Reach 50 as a fairy.'], all(race('fairy'), ageGte(50)), 2),
  S('oldVampire', ['朝日を知らない', 'Never Saw the Sun'], ['吸血鬼として300歳まで生きる', 'Live to 300 as a vampire.'], all(race('vampire'), ageGte(300)), 2),
  S('royalStarve', ['王冠では食べられない', 'Can\'t Eat a Crown'], ['王族に生まれ、飢えて亡くなる', 'Be born royal and starve to death.'], all({ fact: 'status', eq: 'royal' }, hazard('famine')), 2),
  S('blessedNewborn', ['加護は間に合わず', 'Blessing Too Late'], ['女神の加護を受けながら、生まれた年に亡くなる', 'Die in the year of your birth despite the goddess\'s blessing.'], all({ fact: 'blessing', eq: true }, { fact: 'age', lte: 0 })),
  S('childless', ['三度目の正直ならず', 'Third Time Unlucky'], ['3回結婚して子をもたない', 'Marry three times and have no children.'], all({ fact: 'marriages', gte: 3 }, { fact: 'children', eq: 0 })),
  S('exiledHero', ['追放された勇者', 'The Banished Hero'], ['追放され、それでも勇者になる', 'Get banished and still become the Hero.'], all(flag('exiled'), flag('hero')), 2),
  S('lich', ['器に魂を', 'Phylactery'], ['自分の魂を器に移す', 'Move your own soul into a phylactery.'], flag('lich'), 2),
  S('uploaded', ['クラウドの向こう', 'Into the Cloud'], ['自分の心をアップロードする', 'Upload your own mind.'], flag('fu_uploaded'), 2),
  S('ascend', ['天劫に挑む', 'Facing the Heavens'], ['仙侠の世界で天劫に臨む', 'Face the Heavenly Tribulation in the Cultivation Realm.'], flag('ne.ascend'), 2),
  S('lonelyElder', ['ひとり残る', 'The Last Witness'], ['輪の全員より長く生き、300歳を越える', 'Outlive everyone in your circle and pass 300.'], all({ fact: 'outlivedAll', eq: true }, ageGte(300)), 3),
  S('drunkHero', ['祝杯の果て', 'One Toast Too Many'], ['名声を得たあと、酔って事故で亡くなる', 'Become famous, then die in a drunken accident.'], all(flag('famous'), death('d.acc-drunk')), 2),
  S('newbornLord', ['生まれながらの', 'Born to It'], ['王族に生まれ、生まれた年に亡くなる', 'Be born royal and die in your first year.'], all({ fact: 'status', eq: 'royal' }, { fact: 'age', lte: 0 })),
];

// 入口の実績はチケット0枚 (「設定して転生」が1人目で開かないように。2026-10-09 meta の担当)。
// おまかせの人生を5人続けたプレイヤー20人のうち、2人以上が解放した実績 (チケットが付いていたもの)
const ENTRY: ReadonlySet<string> = new Set([
  'a.feat.rankS',
  'a.feat.knight',
  'a.feat.grandparent',
  'a.feat.marry2',
  'a.feat.marry3',
  'a.world.academy.rankS',
  'a.total.foes10',
  'a.total.lives5',
  'a.total.reinc3',
  'a.feat.arc.legend',
  'a.feat.dragonpact',
  'a.feat.shop',
  'a.feat.memoir',
  'a.feat.summonedOld',
  'a.world.frontier.long',
  'a.race.human.long',
  'a.cheat.foresight.long',
  'a.world.wa.rankS',
  'a.social.bond100',
  'a.social.devoted',
  'a.world.desert.long',
  'a.feat.age100',
  'a.feat.wins10',
  'a.secret.uploaded',
  'a.world.wa.long',
  'a.feat.beyond2',
  'a.world.medieval.long',
  'a.collection.meet.vampire_lord',
  'a.collection.meet8',
  'a.world.postapoc.long',
  'a.death.boss',
  'a.feat.kids8',
  'a.world.xianxia.rankS',
  'a.cheat.all_magic.rankS',
  'a.feat.bloom',
  'a.feat.age150',
  'a.feat.age200',
  'a.feat.age300',
  'a.feat.wins20',
  'a.world.space.rankS',
  'a.secret.dudLegend',
  'a.death.foe.goblin',
  'a.collection.meet.reinc_ruler',
  'a.world.dark.long',
  'a.world.dark.rankS',
  'a.social.partyLegend',
  'a.world.beast.long',
  'a.cheat.language.long',
  'a.feat.revived',
  'a.social.outlived',
  'a.world.modern.rankS',
  'a.cheat.immortal_body.rankS',
  'a.cheat.immortal_body.long',
]);
const noEntryTickets = (a: AchievementDef): AchievementDef => {
  if (!ENTRY.has(a.id) || !a.tickets) return a;
  const { tickets: _drop, ...rest } = a;
  return rest;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  ...TOTAL, ...FEAT, ...WORLD, ...RACE, ...CHEAT, ...DEATH, ...SOCIAL, ...GEN, ...COLLECTION, ...SECRET,
].map(noEntryTickets);
