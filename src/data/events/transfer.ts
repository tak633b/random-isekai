// 異世界転移した人 (arrival 'summoned') の出来事。元の世界の名前・仕事・持ち物のまま来た人だけに起きる。
// 条件に使えるしるし: tr.<来かた> (hero / caught / vanish / class / accident)、item.<持ち物> (phone / pen / lighter / umbrella / meds / snack / book / badge / calc / knife)、
// earth.<元の仕事> (student / office / nurse / cook / programmer / farmer / sdf / home / neet / teacher / accountant / …、src/data/transfer.ts)。
// 帰る選択肢は set: 'goHome' (その年に一生が終わる。死ではない)
import type { EventDef } from '../../engine/types';

const T: EventDef['arrival'] = ['summoned'];
const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];

export const EVENTS: EventDef[] = [
  // ---- 来てすぐ ----------------------------------------------------------------
  {
    id: 'tf.food', stage: GROWN, arrival: T, w: 3, kind: 'hard',
    ja: '最初に出された食事は、紫色に光るスープだった。{name}は覚悟を決めた。',
    en: 'The first meal {name} was served was a soup that glowed faintly purple. {He} steeled {himself}.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '一気に飲む', en: 'Down it in one go', eff: { hp: -2, charm: 3 }, log: { ja: '三日寝込んだ。宿の主人には「根性がある」と気に入られた。', en: 'Bedridden for three days. The innkeeper decided {he} had guts.' } },
      { ja: '丁寧に断って、パンだけもらう', en: 'Politely decline and ask for bread', eff: { hp: 1 }, log: { ja: 'パンは石のように硬かった。この世界の歯の強さを思い知った。', en: 'The bread was hard as stone. {He} gained a new respect for the teeth of this world.' } },
    ] },
  },
  {
    id: 'tf.nobody', stage: GROWN, arrival: T, w: 2, kind: 'hard',
    ja: '「日本という国から来た」と言っても、誰も信じなかった。地図に無い国の話をする変わった人、という扱いになった。',
    en: '{name} told people {he} came from a country called Japan. Nobody believed it. {He} became "that odd one who talks about a country not on any map".',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '電車やコンビニの話を毎晩する', en: 'Keep telling them about trains and convenience stores', eff: { charm: 2, fame: 2 }, log: { ja: '酒場で「おとぎ話の人」として人気者になった。誰も本当だとは思っていない。', en: 'Became a tavern favorite as "the storyteller". No one thought any of it was true.' } },
      { ja: '黙って、この世界の人として暮らす', en: 'Keep quiet and live as a local', eff: { happy: -2, luck: 2 }, log: { ja: '故郷の話をやめると、少しだけ楽になった。少しだけ寂しくなった。', en: 'Not talking about home made things a little easier. And a little lonelier.' } },
    ] },
  },
  {
    id: 'tf.status', stage: GROWN, arrival: T, not: ['gamey'], w: 2, kind: 'hard',
    ja: '誰もいない所で、{name}は小さく「ステータス・オープン」とつぶやいた。何も起きなかった。風だけが吹いた。',
    en: 'When no one was around, {name} whispered "Status open." Nothing happened. Only the wind answered.',
    eff: { happy: -1, mind: 1 },
  },
  {
    id: 'tf.status-yes', stage: GROWN, arrival: T, tags: ['gamey'], w: 2, kind: 'power',
    ja: '試しに「ステータス・オープン」と言ってみたら、本当に目の前に光る板が出た。{name}は思わず正座した。',
    en: '{name} tried saying "Status open" on a whim, and a glowing panel actually appeared. {He} sat down very formally in front of it.',
    eff: { mind: 2, happy: 3 },
  },
  {
    id: 'tf.mistaken', stage: GROWN, arrival: T, flag: 'tr.caught', w: 3, kind: 'fame',
    ja: '巻き込まれただけの{name}を、町の人々が「もう一人の勇者さま」と呼び始めた。',
    en: 'The townsfolk started calling {name}, who had only been caught up in the summoning, "the other Hero".',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: 'それっぽく振る舞う', en: 'Play the part', eff: { fame: 6, wealth: 3 }, risk: { hazard: 'monster', p: 0.02 }, log: { ja: '魔物退治を頼まれた。断れる雰囲気ではなかった。', en: 'Was asked to slay a monster. Saying no was not an option.' } },
      { ja: '「ただの巻き込まれです」と正直に言う', en: 'Admit to being a bystander', eff: { charm: 3 }, log: { ja: '正直さが気に入られ、パン屋の二階を貸してもらえた。', en: 'The honesty won someone over. {He} was offered the room above the bakery.' } },
    ] },
  },
  {
    id: 'tf.real-hero', stage: GROWN, arrival: T, flag: 'tr.caught', cheat: true, w: 1.5, kind: 'power', big: true,
    ja: '本物の勇者として呼ばれた高校生は、剣を振ると転んだ。巻き込まれた{name}の〈{cheat}〉の方が、どう見ても強かった。王宮に気まずい空気が流れた。',
    en: 'The high schooler summoned as the true Hero tripped every time they swung a sword. {name}, the bystander, was clearly stronger with "{cheat}". The palace went very quiet.',
    eff: { fame: 5, power: 3 },
  },
  {
    id: 'tf.class-reunion', stage: GROWN, arrival: T, flag: 'tr.class', w: 2, kind: 'love',
    ja: '一緒に転移したクラスメイトと、{town}の市場で再会した。向こうは今、公爵家の養子になっていた。',
    en: 'Ran into a classmate from the same transfer at the market in {town}. They had since been adopted by a duke.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '昔のように話しかける', en: 'Talk like old times', eff: { happy: 4, charm: 2 }, log: { ja: '二人で日本の給食の話をして、一時間笑った。', en: 'They spent an hour laughing about school lunches back home.' } },
      { ja: '気づかないふりをする', en: 'Pretend not to notice', eff: { happy: -2, luck: 1 }, log: { ja: '後で、向こうも気づかないふりをしていたと知った。', en: 'Later {he} learned they had been pretending not to notice too.' } },
    ] },
  },
  {
    id: 'tf.accident-master', stage: GROWN, arrival: T, flag: 'tr.accident', w: 3, kind: 'family',
    ja: '{name}を呼んでしまった見習い魔術師は、責任を取って面倒を見ると言い張った。毎朝、謝りながらお茶を淹れてくれる。',
    en: 'The apprentice mage who accidentally summoned {name} insisted on taking responsibility. Every morning, they brew tea while apologizing.',
    eff: { happy: 3, mind: 2 }, tie: { role: 'friend', new: true },
  },

  // ---- 持ち物 ----------------------------------------------------------------
  {
    id: 'tf.phone-dies', stage: GROWN, arrival: T, flag: 'item.phone', w: 4, kind: 'loss', set: 'phoneDead',
    ja: 'スマホの電池が、ついに切れた。最後に開いていたのは、家族の写真だった。',
    en: "The smartphone's battery finally died. The last thing open on the screen was a photo of {his} family.",
    eff: { happy: -5 },
  },
  {
    id: 'tf.phone-charge', stage: GROWN, arrival: T, flag: 'item.phone', noFlag: 'phoneDead', magic: 2, w: 2, kind: 'power', set: 'phoneDead',
    ja: '雷の魔法でスマホを充電しようとした。一瞬だけ画面が光り、それから煙が出た。',
    en: '{name} tried to charge the smartphone with lightning magic. The screen lit up for one glorious second. Then it smoked.',
    eff: { mind: 2, happy: -2 },
  },
  {
    id: 'tf.lighter', stage: GROWN, arrival: T, flag: 'item.lighter', w: 3, kind: 'work',
    ja: '百円ライターで火をつけたら、村人たちがひれ伏した。「火の神器だ」と言っている。',
    en: '{name} lit a fire with a disposable lighter, and the villagers fell to their knees. They were calling it "a sacred flame relic".',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '領主に高く売る', en: 'Sell it to the lord for a fortune', eff: { wealth: 12 }, log: { ja: '一年暮らせる金になった。ガスが切れる前に町を出た。', en: 'Enough money for a year. {He} left town before the gas ran out.' } },
      { ja: '村に寄付する', en: 'Give it to the village', eff: { charm: 5, fame: 3 }, log: { ja: '村の祭りの主役になった。ライターは祠に祀られている。', en: 'Became the star of the village festival. The lighter now sits in a shrine.' } },
    ] },
  },
  {
    id: 'tf.pen', stage: GROWN, arrival: T, flag: 'item.pen', w: 2, kind: 'work',
    ja: 'ボールペンで書いてみせると、書記たちが集まってきた。インクをつけずに書ける筆に、皆が目を丸くした。',
    en: '{name} wrote something with a ballpoint pen, and the scribes crowded around. A quill that never needs ink!',
    eff: { fame: 3, wealth: 3 },
  },
  {
    id: 'tf.snack', stage: GROWN, arrival: T, flag: 'item.snack', w: 3, kind: 'love',
    ja: 'とっておいたポテトチップスを、お世話になった人たちと分けた。一枚ずつしかなかったのに、皆が泣いた。',
    en: '{name} shared the last bag of potato chips with the people who had helped {him}. One chip each. Everyone cried.',
    eff: { charm: 4, happy: 3 },
  },
  {
    id: 'tf.umbrella', stage: GROWN, arrival: T, flag: 'item.umbrella', w: 2, kind: 'adventure',
    ja: '折りたたみ傘をばっと開いたら、襲ってきた魔物が驚いて逃げていった。',
    en: '{name} snapped open a folding umbrella, and the attacking monster fled in terror.',
    eff: { luck: 3 }, foe: 'monster',
  },
  {
    id: 'tf.badge', stage: GROWN, arrival: T, flag: 'item.badge', w: 2, kind: 'hard',
    ja: '社員証を見せたら、門番に「どこの国の通行証だ」と真剣に調べられた。結局、通してもらえた。',
    en: 'Showed {his} company ID card at the gate. The guard studied it seriously: "Which kingdom issued this pass?" In the end, they let {him} through.',
    eff: { luck: 2 },
  },

  // ---- 元の世界の知識 ----------------------------------------------------------------
  {
    id: 'tf.mayo', stage: GROWN, arrival: T, tech: [0, 5], w: 3, kind: 'work',
    ja: 'マヨネーズを作れば大儲けできる、と{name}は思いついた。異世界ものの定番だ。',
    en: 'Make mayonnaise and get rich, thought {name}. It was the classic move.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '店を出して売る', en: 'Open a stall and sell it', eff: { wealth: 8, fame: 3 }, risk: { hazard: 'disease', p: 0.01 }, log: { ja: '売れに売れた。生卵の衛生だけは、この世界では誰も気にしていなかった。', en: 'It sold like crazy. Nobody in this world worried about raw-egg hygiene, though.' } },
      { ja: '作り方を広めて、みんなで作る', en: 'Teach everyone the recipe', eff: { charm: 5, happy: 2 }, log: { ja: '三日で町じゅうがマヨネーズ臭くなった。儲けはなかったが、友だちが増えた。', en: 'Within three days the whole town smelled of mayonnaise. No profit, but plenty of new friends.' } },
    ] },
  },
  {
    id: 'tf.reversi', stage: GROWN, arrival: T, tech: [0, 6], w: 2, kind: 'work',
    ja: '木の板と石でリバーシを作ったら、酒場で大流行した。貴族まで遊びに来た。',
    en: '{name} made a reversi board out of wood and stones. It took the taverns by storm. Even nobles came to play.',
    eff: { wealth: 6, fame: 4 },
  },
  {
    id: 'tf.hygiene', stage: GROWN, arrival: T, tech: [0, 6], w: 2, kind: 'work',
    ja: '「手を洗えば病が減る」と医者たちに話した。最初は笑われたが、{name}の宿だけ冬に誰も寝込まなかった。',
    en: '{name} told the doctors that washing hands would stop disease. They laughed, until {his} inn was the only one where nobody fell ill all winter.',
    eff: { hp: 3, fame: 2 },
  },
  {
    id: 'tf.engine-fail', stage: GROWN, arrival: T, tech: [0, 5], w: 2, kind: 'hard',
    ja: '蒸気機関を作ろうとした。仕組みはよく知っているつもりだった。できたのは、よく鳴るやかんだった。',
    en: '{name} tried to build a steam engine, sure of how it worked. The result was a very loud kettle.',
    eff: { mind: 2, wealth: -3 },
  },
  {
    id: 'tf.nurse', stage: GROWN, arrival: T, flag: 'earth.nurse', w: 3, kind: 'work',
    ja: '看護師だったころの手つきで、けが人の手当てをした。治癒の魔法より早いと評判になった。',
    en: "With a nurse's practiced hands, {name} tended the wounded. Word spread that it was faster than healing magic.",
    eff: { fame: 4, charm: 3 },
  },
  {
    id: 'tf.programmer', stage: GROWN, arrival: T, flag: 'earth.programmer', w: 3, kind: 'hard',
    ja: 'パソコンの無い世界で、プログラマーにできることを考えた。とりあえず、宿屋の帳簿の無駄を全部見つけた。',
    en: 'What can a programmer do in a world with no computers? For a start, {name} found every inefficiency in the inn\'s ledger.',
    eff: { mind: 2, wealth: 3 },
  },
  {
    id: 'tf.neet', stage: GROWN, arrival: T, flag: 'earth.neet', w: 3, kind: 'hard',
    ja: '元の世界では部屋から出なかった{name}が、ここでは毎日畑に出ている。人生とは分からないものだ。',
    en: 'Back home, {name} never left {his} room. Here, {he} was out in the fields every day. Life is strange.',
    eff: { hp: 3, happy: 3 },
  },
  {
    id: 'tf.sdf', stage: GROWN, arrival: T, flag: 'earth.sdf', w: 3, kind: 'battle',
    ja: '自衛官の訓練で覚えた野営と応急手当が、旅の一行を何度も救った。',
    en: "The camping and first aid {name} had learned in the Self-Defense Forces saved the traveling party more than once.",
    eff: { power: 2, fame: 3 },
  },
  {
    id: 'tf.cook', stage: GROWN, arrival: T, flag: 'earth.cook', w: 3, kind: 'work',
    ja: '料理人だった腕で、市場の安い食材から定食を作った。昼どきに行列ができた。',
    en: "Using a cook's skill, {name} turned cheap market ingredients into set meals. A line formed every lunchtime.",
    eff: { wealth: 5, charm: 3 },
  },

  // ---- 故郷を想う ----------------------------------------------------------------
  {
    id: 'tf.homesick', stage: ['adult', 'middle', 'elder'], arrival: T, w: 2, repeat: true, kind: 'loss',
    ja: '夜、ふと白いご飯と味噌汁が食べたくなって、少し泣いた。',
    en: 'Late one night {name} suddenly craved plain white rice and miso soup, and cried a little.',
    eff: { happy: -3 },
  },
  {
    id: 'tf.return', stage: ['adult', 'middle', 'elder'], arrival: T, w: 0.12, kind: 'arrival', big: true,
    ja: 'ある晩、来たときと同じ光が足もとに浮かんだ。「帰りたいなら、今だけ」と声がした。',
    en: 'One night, the same light that had brought {name} here appeared underfoot. A voice said: "If you want to go home, it\'s now or never."',
    choice: { ja: 'どうする?', en: 'What will you do?', options: [
      { ja: 'この世界に残る', en: 'Stay in this world', eff: { happy: 6 }, set: 'stayed', log: { ja: '光はゆっくり消えた。ここが、もう自分の居場所だった。', en: 'The light slowly faded. This world was home now.' } },
      { ja: '元の世界へ帰る', en: 'Go home', set: 'goHome' },
    ] },
  },
];
