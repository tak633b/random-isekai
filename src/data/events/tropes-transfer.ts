// 異世界ものの定番ネタ (transfer)。書き方と条件の例は tropes.ts の頭。読み込みは engine/events.ts が src/data/events/*.ts を全部集める
// 異世界転移した人 (arrival 'summoned') だけの小話: 来かた (tr.<来かた>)、地球の体のまま、持ち物 (item.<持ち物>)、帰り道のしるし。transfer.ts と重ならない角度で
import type { EventDef } from '../../engine/types';

const T: EventDef['arrival'] = ['summoned'];
const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const LATER: EventDef['stage'] = ['adult', 'middle', 'elder'];
const KINGDOM: EventDef['tags'] = ['fantasy', 'eastern']; // 王宮・神殿・ギルドのある世界
const LOW: EventDef['tech'] = [0, 6];                       // 地球の物が珍しい世界

export const EVENTS: EventDef[] = [
  // ---- 来かた ----------------------------------------------------------------
  {
    id: 'tpx.princess-tears', stage: GROWN, arrival: T, flag: 'tr.hero', tags: KINGDOM, w: 2, kind: 'hard',
    ja: '王女は涙ながらに「どうか国を救って」と言った。帰る方法はあるのかと聞くと、王女は目をそらした。',
    en: 'The princess begged {name}, in tears, to save the kingdom. When {name} asked if there was a way home, she looked away.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「では、まず休みの規定を見せてください」', en: '"Then first, show me the vacation policy"', eff: { wealth: 3, charm: -1 }, log: { ja: 'この国で初めて、勇者の雇用契約書が作られた。三十条あった。', en: "The kingdom drew up its first ever Hero's employment contract. It had thirty clauses." } },
      { ja: '黙ってうなずく', en: 'Nod quietly', eff: { fame: 3, happy: -2 }, log: { ja: '王女は小さく「ごめんなさい」と言った。その一言で、少しだけ許せた。', en: 'The princess whispered, "I\'m sorry." That alone made it a little easier to forgive.' } },
    ] },
  },
  {
    id: 'tpx.summon-budget', stage: GROWN, arrival: T, flag: 'tr.hero', tags: KINGDOM, w: 2, kind: 'work',
    ja: '召喚の儀の費用で、国庫が傾いていた。勇者{name}の最初の仕事は、節約案を書くことだった。',
    en: 'The summoning ritual had nearly emptied the treasury. The first task of the Hero {name} was writing a cost-cutting plan.',
    eff: { mind: 2, fame: 1 },
  },
  {
    id: 'tpx.hidden-agenda', stage: ['adult', 'middle'], arrival: T, flag: 'tr.hero', tags: KINGDOM, w: 1.2, kind: 'hard', big: true,
    ja: '隣国の古い記録を読んだ。戦を始めたのは、{name}を召喚したこちらの国の方だった。',
    en: "{name} read the neighboring kingdom's old records. The war had been started by the very kingdom that summoned {him}.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '王に問いただす', en: 'Confront the king', eff: { fame: 4, charm: 2 }, risk: { hazard: 'violence', p: 0.02 }, log: { ja: '王は長い言い訳をした。翌朝、部屋の前の見張りが二人に増えていた。', en: 'The king gave a long excuse. The next morning, the guards outside {his} door had doubled.' } },
      { ja: '隣国へ、こっそり和平の手紙を書く', en: 'Secretly write to the other kingdom about peace', eff: { charm: 4, happy: 2 }, log: { ja: '返事は一行だった。「ようやく話の通じる人が来た」。', en: 'The reply was one line: "Finally, someone we can talk to."' } },
    ] },
  },
  {
    id: 'tpx.caught-meeting', stage: GROWN, arrival: T, flag: 'tr.caught', w: 2, kind: 'hard',
    ja: '召喚陣から出てきた人数が、一人多かった。神官たちは長い会議を開き、「とりあえず城の外へ」と決めた。',
    en: 'One more person had come out of the summoning circle than planned. The priests held a long meeting and decided: "Outside the castle, for now."',
    eff: { luck: 2, happy: -1 },
  },
  {
    id: 'tpx.caught-taxes', stage: ['adult', 'middle'], arrival: T, flag: 'tr.caught', w: 2, kind: 'work',
    ja: '勇者の方は、毎年のように英雄譚に載った。{name}の方は、毎年きちんと税を納めた。',
    en: 'Every year, the real Hero appeared in another ballad. Every year, {name} paid taxes on time.',
    eff: { wealth: 2, happy: 1 },
  },
  {
    id: 'tpx.caught-letter', stage: ['middle', 'elder'], arrival: T, flag: 'tr.caught', w: 1.5, kind: 'love',
    ja: '年老いた勇者から手紙が届いた。「あの日、隣にいたのが君で心強かった」。字は高校生のころのままだった。',
    en: 'A letter came from the aging Hero. "I was glad it was you standing next to me that day." The handwriting had not changed since high school.',
    eff: { happy: 5 },
  },
  {
    id: 'tpx.class-expedition', stage: GROWN, arrival: T, flag: 'tr.class', w: 2, kind: 'adventure',
    ja: 'クラスの中心だった同級生が、勇者として遠征に誘ってきた。',
    en: 'The classmate who had always been at the center of things, now the Hero, invited {name} on an expedition.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: 'ついて行く', en: 'Go along', eff: { power: 3, fame: 2 }, risk: { hazard: 'monster', p: 0.02 }, log: { ja: '荷物持ちの係になった。行列の順番は、教室の席順とまったく同じだった。', en: 'Was put in charge of the luggage. The marching order matched the old classroom seating chart exactly.' } },
      { ja: '断って、町に残る', en: 'Decline and stay in town', eff: { happy: 3, wealth: 2 }, log: { ja: '宿で皿洗いを始めた。三年後、遠征隊はその宿で打ち上げをした。', en: 'Started washing dishes at an inn. Three years later, the expedition held its victory party at that same inn.' } },
    ] },
  },
  {
    id: 'tpx.class-reunion-party', stage: ['adult', 'middle'], arrival: T, flag: 'tr.class', w: 1.5, kind: 'love',
    ja: '異世界で同窓会を開いた。出席は十一人。乾杯の音頭は、一緒に呼ばれていた担任がとった。',
    en: 'They held a class reunion in another world. Eleven came. The homeroom teacher, summoned along with them, led the toast.',
    eff: { happy: 4, charm: 1 },
  },
  {
    id: 'tpx.class-enemy', stage: GROWN, arrival: T, flag: 'tr.class', tags: KINGDOM, w: 1.2, kind: 'battle',
    ja: '戦場の向こう、敵の陣に、同じクラスだった顔があった。向こうの国に呼ばれていたらしい。',
    en: 'Across the battlefield, in the enemy ranks, was a face from {his} old class. They had been summoned by the other kingdom.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '白旗を振って呼びかける', en: 'Wave a white flag and call out', eff: { charm: 3, fame: 2 }, log: { ja: '二人で将軍たちを説得し、その日の戦は「雨天中止」になった。よく晴れていた。', en: 'Together they talked the generals around, and the battle was "canceled due to rain". It was a sunny day.' } },
      { ja: '見なかったことにする', en: 'Pretend not to have seen', eff: { happy: -3, luck: 1 }, log: { ja: 'その夜、向こうから矢文が届いた。「お互い、見なかったことにしよう」。', en: 'That night an arrow brought a note from the other side: "Let\'s both pretend we didn\'t see each other."' } },
    ] },
  },
  {
    id: 'tpx.accident-contract', stage: GROWN, arrival: T, flag: 'tr.accident', w: 2, kind: 'hard',
    ja: '使い魔の契約書に、{name}の名前が書かれていた。見習い魔術師は「本当にすみません。更新は年に一度です」と言った。',
    en: '{name} found {his} own name on a familiar contract. The apprentice mage said, "I\'m so sorry. It renews once a year."',
    eff: { charm: 2, happy: 1 },
  },
  {
    id: 'tpx.accident-exam', stage: GROWN, arrival: T, flag: 'tr.accident', w: 1.5, kind: 'family',
    ja: '見習い魔術師の昇級試験の日が来た。課題は「呼び出した使い魔を連れてくること」だった。',
    en: 'The apprentice mage\'s promotion exam arrived. The task: "Bring the familiar you summoned."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '使い魔として付き添う', en: 'Go along as the familiar', eff: { charm: 4, happy: 2 }, log: { ja: '試験官は{name}を長いこと見つめてから、「……合格」と言った。', en: 'The examiner stared at {name} for a long time, then said, "...Pass."' } },
      { ja: 'さすがに断る', en: 'Draw the line and refuse', eff: { luck: 1 }, log: { ja: '見習いは近所の猫を連れて行った。猫の方が行儀がよく、受かった。', en: 'The apprentice brought a neighborhood cat instead. The cat behaved better, and passed.' } },
    ] },
  },
  {
    id: 'tpx.vanish-corner', stage: LATER, arrival: T, flag: 'tr.vanish', w: 1.5, kind: 'loss',
    ja: '{name}は今でも、曲がり角の手前で一度立ち止まる。向こうが家の前かもしれないからだ。',
    en: '{name} still stops for a moment before turning any corner. The other side might be home.',
    eff: { happy: -1, mind: 1 },
  },

  // ---- 地球の体のまま ----------------------------------------------------------------
  {
    id: 'tpx.glasses', stage: GROWN, arrival: T, tags: KINGDOM, tech: LOW, w: 1.5, kind: 'hard',
    ja: '眼鏡のつるが折れた。町一番の職人が、レンズの代わりに水晶を磨いてくれた。それから世界が少しだけ虹色に見える。',
    en: '{His} glasses snapped at the hinge. The best craftsman in town polished crystal to replace the lenses. Ever since, the world has looked faintly rainbow-colored.',
    eff: { happy: 2, wealth: -2 },
  },
  {
    id: 'tpx.cavity', stage: GROWN, arrival: T, magic: 1, tech: LOW, w: 1.5, kind: 'ill',
    ja: '奥歯が痛みだした。この町に歯医者はいない。',
    en: 'A back tooth started to ache. There were no dentists in this town.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '治癒術師に頼む', en: 'Ask a healer', eff: { hp: 2, wealth: -3 }, log: { ja: '虫歯は治った。ついでに親知らずが生えてきた。', en: 'The cavity healed. A wisdom tooth came in as a bonus.' } },
      { ja: '鍛冶屋のやっとこで抜く', en: "Have it pulled with the blacksmith's tongs", eff: { hp: -2, power: 1 }, log: { ja: '抜いた歯は鍛冶屋の壁に飾られた。町で一番の勇気の証だそうだ。', en: "The tooth now hangs on the smithy wall. It is said to be the town's greatest proof of courage." } },
    ] },
  },
  {
    id: 'tpx.pollen', stage: GROWN, arrival: T, tags: KINGDOM, w: 1.5, kind: 'ill',
    ja: '春になると、{name}だけくしゃみが止まらない。神殿の人が三人来て呪いを祓って帰った。くしゃみは止まらなかった。',
    en: 'Every spring, {name} alone could not stop sneezing. Three priests came, lifted the curse, and left. The sneezing did not stop.',
    eff: { hp: -1, charm: 1 },
  },
  {
    id: 'tpx.stamina', stage: GROWN, arrival: T, tech: LOW, w: 1.5, kind: 'adventure',
    ja: '旅の初日、{name}は昼前に歩けなくなった。半年後には一行で一番の健脚になった。荷運びのロバだけが、前の{name}を覚えている。',
    en: 'On the first day of the journey, {name} could not walk another step before noon. Six months later, {he} was the strongest walker in the party. Only the pack donkey remembers how it started.',
    eff: { power: 2, hp: 1 },
  },
  {
    id: 'tpx.immunity', stage: GROWN, arrival: T, w: 1.5, kind: 'ill',
    ja: '町じゅうが寝込んだ冬の熱病に、{name}だけかからなかった。代わりに、町の誰もかからない夏風邪に一人でかかった。',
    en: 'When winter fever laid the whole town low, {name} alone stayed well. Then {he} alone caught a summer cold nobody in town had ever heard of.',
    eff: { hp: -1, luck: 2 },
  },

  // ---- 持ち物 ----------------------------------------------------------------
  {
    id: 'tpx.meds', stage: GROWN, arrival: T, flag: 'item.meds', w: 2, kind: 'hard',
    ja: '胃薬が、最後の一包になった。宿の主人がお腹を押さえてうずくまっている。',
    en: 'Only one packet of stomach medicine was left. The innkeeper was doubled over, clutching their stomach.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '主人に飲ませる', en: 'Give it to the innkeeper', eff: { charm: 4, happy: 2 }, log: { ja: '主人は治った。それから{name}の宿代は、いつも少しだけ安い。', en: 'The innkeeper recovered. Ever since, {name} has gotten a small discount on the room.' } },
      { ja: '自分のためにとっておく', en: 'Save it for yourself', eff: { hp: 2 }, log: { ja: '翌週、この世界の料理に{name}の胃が音を上げた。とっておいてよかった。', en: "The next week, {name}'s stomach gave up on the local cooking. Good thing {he} saved it." } },
    ] },
  },
  {
    id: 'tpx.meds-alchemist', stage: GROWN, arrival: T, flag: 'item.meds', magic: 1, tech: LOW, w: 1.5, kind: 'work',
    ja: '錬金術師が胃薬の空き袋を三年かけて調べ、そっくりな薬を作った。袋の裏の「食後に」だけは、今も謎の呪文だと思われている。',
    en: 'An alchemist spent three years studying the empty medicine packet and made a perfect copy. The words "after meals" on the back are still believed to be a secret incantation.',
    eff: { fame: 2, wealth: 3 },
  },
  {
    id: 'tpx.book', stage: GROWN, arrival: T, flag: 'item.book', w: 2, kind: 'work',
    ja: '持ってきた文庫本を、もう何十回も読み返した。',
    en: '{name} had read the paperback brought from home dozens of times.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '訳して写本を作る', en: 'Translate it and make copies', eff: { fame: 4, wealth: 2 }, log: { ja: '写本はよく売れた。作者は{name}だと思われている。違うと言っても、誰も聞かない。', en: 'The copies sold well. Everyone thinks {name} wrote it. Nobody listens when {he} says otherwise.' } },
      { ja: '一人で大事に読む', en: 'Keep it to yourself', eff: { happy: 3, mind: 2 }, log: { ja: '五十回目で、最後の一行の意味がやっと分かった。', en: 'On the fiftieth reading, the last line finally made sense.' } },
    ] },
  },
  {
    id: 'tpx.calc', stage: GROWN, arrival: T, flag: 'item.calc', tags: KINGDOM, tech: LOW, w: 2, kind: 'work',
    ja: '電卓で税の計算をしてみせると、王宮の算術官たちが青ざめた。',
    en: 'When {name} worked out the taxes on a calculator, the royal accountants went pale.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '算術官に貸してあげる', en: 'Lend it to the accountants', eff: { wealth: 5, charm: 2 }, log: { ja: '算術官たちは毎朝、光る板に一礼してから計算を始めるようになった。', en: 'Every morning, the accountants now bow to the glowing tablet before starting work.' } },
      { ja: '王に献上する', en: 'Present it to the king', eff: { fame: 5, wealth: 3 }, log: { ja: '電卓は宝物庫に納められた。太陽電池なので、暗い宝物庫では二度と光らない。', en: 'The calculator was placed in the treasury vault. It was solar-powered, so in the dark vault it never lit up again.' } },
    ] },
  },
  {
    id: 'tpx.knife', stage: GROWN, arrival: T, flag: 'item.knife', tech: LOW, w: 2, kind: 'work',
    ja: '十徳ナイフを見た鍛冶屋の親方が、弟子にしてくれと頼んできた。{name}が教えられたのは、栓抜きの使い方だけだった。',
    en: 'A master blacksmith saw the Swiss army knife and begged to become {his} apprentice. All {name} could teach was how to use the bottle opener.',
    eff: { charm: 2, fame: 2 },
  },
  {
    id: 'tpx.knife-bangs', stage: GROWN, arrival: T, flag: 'item.knife', w: 1.5, kind: 'adventure',
    ja: '旅のあいだ、十徳ナイフは毎日なにかの役に立った。一番使ったのは、小さなハサミで前髪を切るときだった。',
    en: 'On the road, the Swiss army knife came in handy every day. Mostly, though, it was the tiny scissors, for trimming {his} bangs.',
    eff: { happy: 2 },
  },
  {
    id: 'tpx.phone-photo', stage: GROWN, arrival: T, flag: 'item.phone', noFlag: 'phoneDead', tech: LOW, w: 2, kind: 'love',
    ja: '村の子どもたちをスマホで撮って見せた。子どもたちは画面の中の自分に名前をつけて、毎日話しかけに来るようになった。',
    en: '{name} took photos of the village children with the smartphone. They gave names to the children on the screen and came to talk to them every day.',
    eff: { charm: 3, happy: 2 },
  },
  {
    id: 'tpx.umbrella-paper', stage: GROWN, arrival: T, flag: 'item.umbrella', magic: 1, tech: LOW, w: 1.5, kind: 'work',
    ja: '折りたたみ傘は、魔術師たちのあいだで「一瞬で開く盾」として論文になった。著者の欄に{name}の名前は無かった。',
    en: 'Among the mages, the folding umbrella became the subject of a paper: "A Shield That Opens in an Instant". {name} was not listed as an author.',
    eff: { mind: 1, fame: 1 },
  },
  {
    id: 'tpx.badge-photo', stage: GROWN, arrival: T, flag: 'item.badge', w: 1.5, kind: 'hard',
    ja: '社員証の写真を見た宿の娘が、「この人だれ?」と聞いた。三年前の{name}だと言っても、信じてもらえなかった。',
    en: 'The innkeeper\'s daughter looked at the photo on the company ID card and asked, "Who\'s this?" She refused to believe it was {name} three years ago.',
    eff: { hp: 1, happy: 1 },
  },
  {
    id: 'tpx.pen-last', stage: GROWN, arrival: T, flag: 'item.pen', w: 1.5, kind: 'loss',
    ja: 'ボールペンのインクが、とうとう出なくなった。最後に書いた字は、買い物のメモの「たまご」だった。',
    en: 'The ballpoint pen finally ran dry. The last word it ever wrote was "eggs", on a shopping list.',
    eff: { happy: -1 },
  },

  // ---- 文化のちがい・食べ物 ----------------------------------------------------------------
  {
    id: 'tpx.noble-teeth', stage: GROWN, arrival: T, tags: KINGDOM, tech: LOW, w: 2, kind: 'fame',
    ja: '毎朝歯を磨く{name}を見て、宿の人々は「どこかの貴族のお忍びだ」と噂した。',
    en: 'Seeing {name} brush {his} teeth every morning, the people at the inn whispered that {he} must be a noble in disguise.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: 'ちがうと言う', en: 'Deny it', eff: { charm: 2 }, log: { ja: '否定するほど「やはり」と言われた。三か月後、本物の貴族に会釈された。', en: 'The more {he} denied it, the more they nodded knowingly. Three months later, a real noble bowed to {him}.' } },
      { ja: '何も言わない', en: 'Say nothing', eff: { wealth: 3, luck: 1 }, log: { ja: '宿代がなぜか毎回まけてもらえた。歯磨きは、ますますやめられなくなった。', en: 'Somehow the room always came at a discount. Now {he} could never stop brushing.' } },
    ] },
  },
  {
    id: 'tpx.weather-god', stage: GROWN, arrival: T, tech: [0, 5], w: 1.5, kind: 'fame',
    ja: '嵐の夜、{name}は「すぐ止みますよ。前線が抜けるので」と言った。本当に止んだ。翌朝から、{name}は天気の神さまの使いになった。',
    en: 'During a storm, {name} said, "It\'ll stop soon. The front is passing." It did. By morning, {name} was the messenger of the weather god.',
    eff: { fame: 3, charm: 2 },
  },
  {
    id: 'tpx.rice', stage: GROWN, arrival: T, tech: LOW, w: 2, kind: 'hard',
    ja: '米によく似た穀物を見つけた。家畜のえさだった。',
    en: '{name} found a grain that looked just like rice. It was livestock feed.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '炊いてみる', en: 'Cook it anyway', eff: { happy: 5, charm: -1 }, log: { ja: '涙が出るほどうまかった。厩舎の馬が、少し悲しそうにこちらを見ていた。', en: 'It was so good {he} cried. A horse in the stable watched {him} with mild sorrow.' } },
      { ja: 'がまんする', en: 'Resist', eff: { happy: -2, luck: 1 }, log: { ja: '三年後、その穀物は「異国の人の好物」として人間用に売られるようになった。', en: 'Three years later, the grain was being sold for people, as "the foreigners\' favorite".' } },
    ] },
  },
  {
    id: 'tpx.stars', stage: LATER, arrival: T, w: 1.5, kind: 'loss',
    ja: '夜空に、知っている星座がひとつも無い。{name}は自分で線を引いて、星座を十二個作った。ひとつは「コンビニ」という名前だ。',
    en: 'Not a single familiar constellation in the night sky. So {name} drew lines and made twelve new ones. One of them is called "Convenience Store".',
    eff: { happy: 2, mind: 1 },
  },

  // ---- 帰り道のしるし ----------------------------------------------------------------
  {
    id: 'tpx.home-map', stage: ['adult', 'middle'], arrival: T, tags: KINGDOM, w: 1.5, kind: 'hard',
    ja: '市場で「異界へ帰る扉の地図」を買った。三軒先の店でも同じ地図を売っていた。そっちの方が安かった。',
    en: 'At the market, {name} bought "A Map to the Door Between Worlds". Three stalls down, someone was selling the same map. Cheaper.',
    eff: { wealth: -3, happy: 1 },
  },
  {
    id: 'tpx.home-graffiti', stage: ['adult', 'middle'], arrival: T, w: 0.8, kind: 'adventure',
    ja: '古い遺跡の壁に、日本語の落書きがあった。「ここから帰れる。たぶん」。',
    en: 'On the wall of an old ruin, {name} found graffiti in Japanese: "You can get home from here. Probably."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '続きを探す', en: 'Look for more', eff: { mind: 3, happy: 2 }, log: { ja: '続きは壁の裏にあった。「やっぱり無理だった。でもこの町、いいとこ」。', en: 'The rest was on the other side of the wall: "Turns out I couldn\'t. But this town\'s nice."' } },
      { ja: '下に一行書き足す', en: 'Add a line underneath', eff: { charm: 1, happy: 3 }, log: { ja: '「同じく」と書いた。十年後、その下にもう一行増えていた。', en: '{He} wrote "Same here." Ten years later, someone had added another line below.' } },
    ] },
  },
];
