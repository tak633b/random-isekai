// 転生特典。倍率は docs/research/02-cheats-and-skills.md の 10.1節の表から。
// 表の combat (戦闘・事故) は monster・violence・war・accident に、disease (病・疫病・産褥) は disease・plague・childbirth に写す。
// lifespan (+N年) は aging (老化の速さの倍率) に直す: 人間の成人後の残りおよそ50年に対して +5年 ≒ 0.9 倍の速さ
import type { Cheat, CheatId, Hazard, World } from './types';

type Mult = Partial<Record<Hazard, number>>;
const combat = (x: number): Mult => ({ monster: x, violence: x, war: x, accident: x });
const disease = (x: number): Mult => ({ disease: x, plague: x, childbirth: x });

interface Row {
  ja: string; en: string; dja: string; den: string;
  mult: Mult; aging?: number; attention: number; revive?: number;
  magic?: number; tech?: [number, number]; powers?: number;
  w: number; // 抽選の重み (10.2節: よくある 10、たまに 4、まれ 1)
}

const ROWS: Record<CheatId, Row> = {
  appraisal: { ja: '鑑定', en: 'Appraisal', dja: '見たものの名前と正体がわかる。毒も見抜ける', den: 'See the true name of anything, poisons included',
    mult: { ...combat(0.85), ...disease(0.95), violence: 0.8 }, attention: 0, w: 10 },
  item_box: { ja: 'アイテムボックス', en: 'Item Box', dja: '何でもしまえる見えない倉庫。飢えにくい', den: 'An invisible storehouse. Hard to starve',
    mult: { ...combat(0.95), ...disease(0.95), famine: 0.3 }, attention: 1, w: 10 },
  exp_boost: { ja: '経験値倍増', en: 'EXP Boost', dja: '鍛えたぶんの何倍も強くなる', den: 'Every lesson counts several times over',
    mult: combat(0.85), attention: 1, w: 10 },
  all_magic: { ja: '全属性魔法', en: 'All Elements', dja: 'すべての属性の魔法が使える', den: 'Command every element of magic',
    mult: { ...combat(0.7), magic: 1.2 }, attention: 2, magic: 2, w: 10 },
  infinite_mana: { ja: '無限の魔力', en: 'Infinite Mana', dja: '魔力が尽きない。暴走もしにくい', den: 'Mana that never runs dry, and rarely runs wild',
    mult: { ...combat(0.75), magic: 0.5 }, attention: 2, magic: 2, w: 10 },
  regeneration: { ja: '超再生', en: 'Regeneration', dja: '大きな傷もすぐに治る', den: 'Even grave wounds close in moments',
    mult: { ...combat(0.5), ...disease(0.8) }, aging: 0.83, attention: 1, w: 10 },
  immortal_body: { ja: '不死の体', en: 'Undying Body', dja: '老いず、死んでもよみがえる。封じられれば終わり', den: 'Never ages, rises again from death. Unless sealed away',
    mult: { ...combat(0.3), ...disease(0.1), infant: 0.3 }, aging: 0, attention: 3, revive: 5, w: 4 },
  return_by_death: { ja: '死に戻り', en: 'Return by Death', dja: '死ぬと少し前に戻る。回数には限りがある', den: 'Death rewinds time a little. Only a few times',
    mult: {}, attention: 0, revive: 3, w: 4 },
  creation: { ja: '創造', en: 'Creation', dja: '思い描いたものを作り出せる', den: 'Make whatever you can imagine',
    mult: { ...combat(0.8), ...disease(0.7), famine: 0.1 }, attention: 3, magic: 1, w: 4 },
  tamer: { ja: 'テイム', en: 'Taming', dja: '魔物を従えられる', den: 'Bind monsters to your side',
    mult: combat(0.75), attention: 1, w: 10 },
  growth: { ja: '成長促進', en: 'Rapid Growth', dja: '体も技もよく伸びる', den: 'Body and skill grow fast',
    mult: { ...combat(0.8), ...disease(0.95) }, attention: 1, w: 10 },
  hide_status: { ja: 'ステータス偽装', en: 'Status Disguise', dja: '本当の力を隠せる', den: 'Hide your true strength',
    mult: {}, attention: -2, w: 10 },
  skill_steal: { ja: 'スキル強奪', en: 'Skill Steal', dja: '倒した相手の力を奪う。恐れられる', den: 'Take the powers of those you defeat. Feared for it',
    mult: combat(0.6), attention: 3, w: 4 },
  gacha: { ja: 'ガチャ', en: 'Gacha', dja: '毎日なにかが当たる。当たり外れは大きい', den: 'A daily draw. Wildly uneven',
    mult: { ...combat(0.9), ...disease(0.9) }, attention: 1, w: 4 },
  online_shop: { ja: 'ネット通販', en: 'Online Shop', dja: '前の世界の品物が買える', den: 'Buy goods from your old world',
    mult: { ...combat(0.9), ...disease(0.6), famine: 0.2 }, aging: 0.91, attention: 2, w: 4 },
  modern_medicine: { ja: '医療の知識', en: 'Modern Medicine', dja: '前世の医学を覚えている', den: 'You remember medicine from your past life',
    mult: { ...combat(0.95), ...disease(0.5), infant: 0.8 }, aging: 0.91, attention: 1, w: 10 },
  agri_knowledge: { ja: '農業の知識', en: 'Farming Know-how', dja: '前世の農学で飢えを遠ざける', den: 'Old-world agronomy keeps hunger away',
    mult: { ...disease(0.9), famine: 0.2 }, aging: 0.96, attention: 1, tech: [0, 6], w: 10 },
  foresight: { ja: '原作知識', en: 'Foreknowledge', dja: 'この世界の筋書きを知っている', den: 'You know how this story goes',
    mult: { ...combat(0.7), ...disease(0.9) }, attention: 0, w: 10 },
  max_luck: { ja: '幸運MAX', en: 'Max Luck', dja: 'なぜか助かる', den: 'Somehow, you always get lucky',
    mult: { ...combat(0.7), ...disease(0.8), accident: 0.3 }, attention: 0, w: 4 },
  trash_skill: { ja: '外れスキル', en: 'Dud Skill', dja: '役に立たないと笑われる。いつか化ける', den: 'Laughed off as useless. Until it awakens',
    mult: {}, attention: 0, w: 10 }, // 覚醒の前は戦闘 1.3 倍、後は 0.6 倍 (mortality.ts)
  sword_saint: { ja: '剣聖', en: 'Sword Saint', dja: '剣を持てば誰にも負けない', den: 'Unbeatable with a blade in hand',
    mult: combat(0.7), attention: 1, w: 10 },
  holy_power: { ja: '聖なる力', en: 'Holy Power', dja: '癒やしと浄化の力。聖女と呼ばれうる', den: 'Healing and purifying light. The mark of a saint',
    mult: { ...combat(0.8), ...disease(0.6) }, attention: 2, magic: 1, w: 10 },
  charm_eyes: { ja: '魅了の瞳', en: 'Charming Eyes', dja: '目を合わせた人を惹きつける', den: 'Those who meet your eyes are drawn in',
    mult: combat(0.85), attention: 2, w: 4 },
  language: { ja: '言語理解', en: 'Tongues', dja: 'どんな言葉もわかる', den: 'Understand every language',
    mult: combat(0.95), attention: 0, w: 10 },
  map: { ja: 'マップと探知', en: 'Map and Sense', dja: '周りの地図と危険が見える', den: 'See the land and its dangers around you',
    mult: { ...combat(0.85), famine: 0.8 }, attention: 0, w: 10 },
  poison_immunity: { ja: '状態異常無効', en: 'Status Immunity', dja: '毒も呪いも効かない', den: 'Poison and curses slide right off',
    mult: { ...combat(0.9), ...disease(0.7), violence: 0.5, magic: 0.5 }, attention: 0, w: 4 },
  cooking: { ja: '料理', en: 'Cooking', dja: '何でもおいしく、体によく作れる', den: 'Make anything delicious and wholesome',
    mult: { ...combat(0.95), ...disease(0.85) }, aging: 0.95, attention: 1, w: 10 },
  hacking: { ja: 'ハッキング', en: 'Hacking', dja: 'どんな機械にも入り込める', den: 'Slip into any machine',
    mult: { ...combat(0.9), violence: 0.8 }, attention: 2, tech: [7, 10], w: 10 },
  psychic: { ja: '超能力', en: 'Psychic', dja: '念じるだけで物が動く。暴走することがある', den: 'Move things with a thought. Sometimes it runs wild',
    mult: { ...combat(0.75), magic: 1.5 }, attention: 2, powers: 1, w: 10 },
  stealth: { ja: '気配遮断', en: 'Stealth', dja: '誰にも気づかれない', den: 'No one notices you',
    mult: combat(0.75), attention: -1, w: 4 },
};

export const CHEAT_IDS = Object.keys(ROWS) as CheatId[];

export const CHEATS: Record<CheatId, Cheat> = Object.fromEntries(CHEAT_IDS.map((id) => {
  const r = ROWS[id];
  const c: Cheat = { id, name: { ja: r.ja, en: r.en }, desc: { ja: r.dja, en: r.den }, mult: r.mult, attention: r.attention };
  if (r.aging !== undefined) c.aging = r.aging;
  if (r.revive !== undefined) c.revive = r.revive;
  if (r.magic !== undefined) c.magic = r.magic;
  if (r.tech) c.tech = r.tech;
  if (r.powers !== undefined) c.powers = r.powers;
  return [id, c];
})) as Record<CheatId, Cheat>;

export const cheatWeight = (id: CheatId) => ROWS[id].w;

// その世界で選べる特典
export function availableCheats(world: World): Cheat[] {
  return CHEAT_IDS.map((id) => CHEATS[id]).filter((c) =>
    (c.magic === undefined || world.magic >= c.magic)
    && (c.powers === undefined || world.powers >= c.powers)
    && (!c.tech || (world.tech >= c.tech[0] && world.tech <= c.tech[1])));
}
