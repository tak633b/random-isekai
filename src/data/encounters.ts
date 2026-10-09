// 出会い図鑑。まれな人や存在に会った人生を数える。
// しるしは 'enc.<id>' (出来事のデータ src/data/events/encounters.ts がこのしるしを立てる)。転生者は一生の筋 (reincFate) で数える
import type { EncounterDef } from '../meta/types';

type Row = [id: string, ja: string, en: string, rarity: number, fja: string, fen: string];

const FLAGGED: Row[] = [
  ['goddess', '女神に謁見', 'Audience with a Goddess', 5, '夢ではなかった。光の中で名を呼ばれた', 'It was no dream. A voice in the light spoke your name'],
  ['dragon', '古竜と言葉を交わす', 'Words with an Elder Dragon', 5, '千年を生きた竜は、思ったより退屈していた', 'The thousand-year dragon turned out to be rather bored'],
  ['royal', '王族と言葉を交わす', 'Words with Royalty', 2, '雲の上の人も、近くで見れば同じ人だった', 'Up close, even royalty was only human'],
  ['master', '伝説の師', 'A Legendary Master', 2, '名を聞けば誰もが知っている人に、教えを受けた', 'Taught by someone whose name everyone knows'],
  ['rare_familiar', '珍しい種の従魔', 'A Rare Familiar', 3, '図鑑にも載っていない生き物が、なぜか懐いた', 'A creature no book lists decided it liked you'],
  ['demon_lord', '魔王と対面', 'Face to Face with the Demon King', 4, '玉座の前に立った。思ったより静かな声だった', 'You stood before the throne. The voice was quieter than expected'],
  ['spirit_king', '精霊王', 'The Spirit King', 4, '森も風も、その人の前では息を潜めた', 'Forest and wind fell silent before it'],
  ['phoenix', '不死鳥', 'The Phoenix', 5, '燃え尽きて、灰の中からまた飛び立った', 'It burned away and rose again from the ash'],
  ['sage', '大賢者', 'The Great Sage', 2, '答えより先に、もっと良い問いを教えてくれた', 'Before any answer, it taught you a better question'],
  ['saintess', '聖女', 'The Saintess', 3, 'その手が触れると、痛みが引いた', 'Pain eased at her touch'],
  ['hero', '勇者', 'The Hero', 3, '人々が希望と呼ぶ人は、案外よく笑った', 'The one called hope laughed more than you expected'],
  ['ancient_ai', '古代の AI', 'An Ancient AI', 4, '何百年も誰かの問いを待っていた', 'It had waited centuries for someone to ask it something'],
  ['alien_envoy', '異星の使者', 'An Alien Envoy', 4, '言葉は通じなかったが、意図は伝わった', 'No shared words, but the meaning came through'],
  ['yokai_lord', '妖怪の総大将', 'Lord of the Yokai', 4, '百鬼夜行の先頭を歩く者と、酒を酌み交わした', 'You shared sake with the one who leads the night parade'],
  ['immortal', '仙人', 'An Immortal', 4, '霞を食べて生きているというのは本当だった', 'The tale that they live on mist was true'],
  ['vampire_lord', '吸血鬼の真祖', 'The Vampire Progenitor', 4, '千年前の舞踏会の話を、昨日のことのように語った', 'Spoke of a ball a thousand years ago as if it were yesterday'],
  ['lich', '不死の王', 'The Lich King', 4, '死を克服した者は、死を羨んでいた', 'The one who conquered death envied it'],
  ['leviathan', '海の大怪物', 'The Leviathan', 5, '島だと思っていたものが、目を開けた', 'What you took for an island opened its eye'],
  ['world_tree', '世界樹', 'The World Tree', 5, '根元に立つと、世界の音が聞こえた', 'At its roots you could hear the world'],
  ['time_traveler', '時を渡る者', 'A Time Traveler', 5, '「また会ったね」と言われた。初めて会ったはずなのに', '"Good to see you again," they said. You had never met'],
  ['past_friend', '前世の知り合い', 'A Friend from a Past Life', 4, 'あの癖、あの笑い方。向こうも同じ顔をしていた', 'That habit, that laugh. They wore the same look you did'],
];

const REINC: Row[] = [
  ['hero', '勇者になる転生者', 'A Reincarnated Hero', 3, '同じ世界から来た人が、この世界の希望になっていた', 'Someone from your old world had become this one\'s hope'],
  ['demonlord', '魔王になる転生者', 'A Reincarnated Demon Lord', 5, '同じ世界から来た人が、魔王を名乗った', 'Someone from your old world took the Demon King\'s name'],
  ['ruler', '国を治める転生者', 'A Reincarnated Ruler', 4, '前の世界の知恵で、国を一つ変えた人', 'Remade a whole realm with old-world know-how'],
  ['merchant', '大商人になる転生者', 'A Reincarnated Merchant', 3, '前の世界の品を真似て、大きな商会を作った', 'Built a great trading house on copies of old-world goods'],
  ['retired', '静かに暮らす転生者', 'A Quiet Reincarnator', 2, '力を持ちながら、田舎で畑を耕していた', 'Had power to spare and chose a farm in the country'],
  ['wanderer', '旅を続ける転生者', 'A Wandering Reincarnator', 2, 'どこにも留まらず、世界の端を見に行った', 'Never settled, always off to see the edge of the world'],
  ['villain', '悪名高い転生者', 'An Infamous Reincarnator', 4, '同じ力を、人を踏みにじるために使った', 'Used the same gifts to trample others'],
];

export const ENCOUNTER_FLAG = (id: string) => `enc.${id}`;

export const ENCOUNTERS: EncounterDef[] = [
  ...FLAGGED.map(([id, ja, en, rarity, fja, fen]) => ({ id, name: { ja, en }, flavor: { ja: fja, en: fen }, rarity, flag: ENCOUNTER_FLAG(id) })),
  ...REINC.map(([fate, ja, en, rarity, fja, fen]) => ({ id: `reinc_${fate}`, name: { ja, en }, flavor: { ja: fja, en: fen }, rarity, reincFate: fate })),
];
