// 異世界ものの定番ネタ (story)。書き方と条件の例は tropes.ts の頭。読み込みは engine/events.ts が src/data/events/*.ts を全部集める
import type { EventDef } from '../../engine/types';

const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const FANTASY: EventDef['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern'];
const FRONTIER: EventDef['tags'] = ['rural'];
const BEASTFOLK: EventDef['races'] = ['beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf'];
const LOW: EventDef['status'] = ['slave', 'orphan', 'poor'];

export const EVENTS: EventDef[] = [
  // ---- 現代知識 (うまくいかない方も) ----------------------------------------------------------------
  {
    id: 'tpt.know.reversi-kanji', stage: GROWN, memory: true, tech: [0, 6], w: 1.5, kind: 'work',
    ja: 'リバーシを売り込みに商会へ行くと、番頭が棚から同じものを出してきた。箱の裏の考案者の名は、漢字で書かれていた。',
    en: 'When {name} brought a reversi board to a trading house, the clerk pulled the same game off the shelf. The inventor\'s name on the back of the box was written in kanji.',
    eff: { happy: -1, mind: 1 },
  },
  {
    id: 'tpt.know.pudding', stage: GROWN, memory: true, tech: [0, 5], w: 1.5, kind: 'work',
    ja: 'プリンを作ろうとして、卵と砂糖の値段を知った。砂糖は、ひとさじで銀貨が要る。',
    en: '{name} set out to make pudding, then learned what eggs and sugar cost here. One spoonful of sugar took a silver coin.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '貴族向けに一つ金貨で売る', en: 'Sell it to nobles at a gold coin each', eff: { wealth: 6, charm: -1 }, log: { ja: '食べた伯爵が泣いて、領地の名物にすると言った。三年後、「元祖」を名乗る店が五軒できていた。', en: 'The count who tasted it wept and declared it a regional specialty. Three years later, five shops claimed to be the original.' } },
      { ja: '甘くない茶碗蒸しに切り替える', en: 'Switch to savory egg custard', eff: { happy: 2, charm: 2 }, log: { ja: 'こちらも評判になった。誰もプリンを知らないので、比べる人もいなかった。', en: 'That was a hit too. Nobody here knew what pudding was, so nobody could compare.' } },
    ] },
  },
  {
    id: 'tpt.know.gunpowder', stage: GROWN, memory: true, tech: [0, 4], w: 1, kind: 'hard',
    ja: '前世の知識で火薬を作ろうとして、まず硝石の採り方を知らないことに気づいた。三年調べ回った末に、町の花火職人の弟子になっていた。',
    en: '{name} tried to make gunpowder from past-life knowledge, then realized {he} had no idea where saltpeter came from. Three years of digging later, {he} was apprenticed to the town fireworks maker.',
    eff: { mind: 2, happy: 2 },
  },
  {
    id: 'tpt.know.paper-plane', stage: GROWN, memory: true, magic: 1, tech: [0, 5], w: 1, kind: 'work',
    ja: '暇つぶしに紙飛行機を折って飛ばした。それを見た魔術師たちが、三日間の会議を開いた。議題は「浮遊の術式を使っていない理由」だった。',
    en: 'Out of boredom, {name} folded a paper plane and threw it. The mages who saw it held a three-day meeting. The agenda: "Why no levitation spell was used."',
    eff: { fame: 2, mind: 1 },
  },
  {
    id: 'tpt.know.curry-color', stage: GROWN, memory: true, not: ['eastern'], w: 1, kind: 'work',
    ja: 'カレーを作ろうとした。香辛料の名前は知っていても、どれが何色かを知らなかった。三十回目の鍋で、ようやく茶色になった。',
    en: '{name} tried to make curry. {He} knew the names of the spices, but not which one was which color. On the thirtieth pot, it finally turned brown.',
    eff: { happy: 3 },
  },
  {
    id: 'tpt.know.stars', stage: GROWN, memory: true, tags: FANTASY, magic: 1, w: 1, kind: 'work',
    ja: '町の学者たちが、空が地上の周りを回っていると教えていた。',
    en: 'The scholars in town taught that the sky turned around the world.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '前世の天文学を話す', en: 'Explain past-life astronomy', eff: { mind: 2, fame: 1 }, log: { ja: '学者たちは丁寧に聞き、丁寧に反論し、夕食をおごってくれた。この世界では、空の方が本当に回っていた。', en: 'The scholars listened politely, argued politely, and bought {him} dinner. In this world, it turned out, the sky really did move.' } },
      { ja: '黙って星を数える', en: 'Keep quiet and count the stars', eff: { mind: 1, luck: 1 }, log: { ja: '星の数は前世より三つ多かった。数え直しても、三つ多かった。', en: 'There were three more stars than in the old world. {He} counted again. Still three more.' } },
    ] },
  },

  // ---- スローライフ ----------------------------------------------------------------
  {
    id: 'tpt.slow.busy', stage: ['adult', 'middle'], memory: true, w: 1.5, kind: 'work',
    ja: 'のんびり暮らすつもりで小さな店を開いた。評判を聞いた客で、朝から晩まで忙しい。',
    en: '{name} opened a little shop to live a slow life. Word got around, and now it was busy from dawn to dusk.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '休みの日を決める', en: 'Set a day off', eff: { happy: 4, wealth: -2 }, log: { ja: '休みの日にも客は来て、戸の前で静かに待っていた。', en: 'Customers came on the day off anyway and waited quietly outside the door.' } },
      { ja: '人を雇う', en: 'Hire help', eff: { wealth: 4, charm: 2 }, log: { ja: '雇った二人もスローライフがしたいと言い出し、三人で交代して昼寝をすることになった。', en: 'Both new hires also wanted a slow life. The three of them ended up taking turns napping.' } },
    ] },
  },
  {
    id: 'tpt.slow.nothing', stage: ['adult', 'middle', 'elder'], memory: true, alone: true, w: 1, kind: 'old',
    ja: '何も起きない一年だった。前世では一度も無かったことなので、{name}は一年かけてそれを味わった。',
    en: 'Nothing happened all year. That had never once happened in the past life, so {name} spent the whole year savoring it.',
    eff: { happy: 3, hp: 1 },
  },
  {
    id: 'tpt.slow.chicken', stage: ['adult', 'middle'], tags: ['fantasy'], w: 1, kind: 'work',
    ja: '鶏を三羽飼い始めた。そのうち一羽が、村に出た{beast}を追い払った。のんびり暮らすのは、鶏の方が上手だった。',
    en: '{name} started keeping three chickens. One of them chased off the {beast} that wandered into the village. The chickens were better at peaceful living than {he} was.',
    eff: { happy: 2, luck: 1 },
  },
  {
    id: 'tpt.slow.border', stage: ['adult', 'middle'], memory: true, w: 1, kind: 'hard',
    ja: '村の寄り合いで「これからはのんびり暮らしたい」と言った。翌日、隣の領地との境で揉め事が起き、{name}は鍬を持ったまま呼び出された。',
    en: 'At the village meeting, {name} announced a plan to take it easy from now on. The next day a dispute broke out at the border, and {he} was called in still holding a hoe.',
    eff: { happy: -2, fame: 1 },
  },

  // ---- 辺境開拓 ----------------------------------------------------------------
  {
    id: 'tpt.frontier.names', stage: ['adult', 'middle'], tags: FRONTIER, flag: 'lord', w: 1.5, kind: 'fame',
    ja: '開拓村の人が百人を越えた日、{name}は全員の名前を覚えるのをあきらめた。かわりに、全員が{name}の名前を覚えていた。',
    en: 'The day the frontier village passed a hundred people, {name} gave up on remembering every name. Every one of them, though, remembered {his}.',
    eff: { charm: 3 },
  },
  {
    id: 'tpt.frontier.tax-road', stage: ['adult', 'middle'], flag: 'lord', w: 1.5, kind: 'work',
    ja: '領地の暮らしに、少しだけ余裕ができた。',
    en: 'The domain finally had a little to spare.',
    choice: { ja: '何に使う?', en: 'What to spend it on?', options: [
      { ja: '税を下げる', en: 'Lower taxes', eff: { charm: 5, wealth: -4 }, log: { ja: '隣の領地から人が引っ越してきた。払う人が増えて、税の入りは前より多くなった。', en: 'People moved in from the neighboring domain. With more people paying, the tax take ended up higher than before.' } },
      { ja: '道を作る', en: 'Build a road', eff: { wealth: 3, fame: 3 }, log: { ja: '新しい道を最初に通ったのは徴税官だった。二番目は行商人で、こちらは塩を安く売っていった。', en: 'The first one down the new road was a tax collector. The second was a peddler, who sold salt cheap.' } },
    ] },
  },
  {
    id: 'tpt.frontier.sign', stage: ['adult', 'middle'], tags: FRONTIER, tech: [0, 5], w: 1, kind: 'work',
    ja: '村の入口に看板を立てた。字を読めるのが{name}しかいなかったので、毎朝{name}が看板の前で読み上げた。',
    en: '{name} put up a sign at the village gate. Nobody else could read, so every morning {he} stood beside it and read it aloud.',
    eff: { charm: 2, mind: 1 },
  },
  {
    id: 'tpt.frontier.dragon', stage: ['adult', 'middle'], tags: FRONTIER, magic: 2, w: 0.8, kind: 'adventure',
    ja: '開拓地の裏山に、竜が住んでいることが分かった。',
    en: 'It turned out a dragon lived on the mountain behind the new settlement.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '干し肉を持って挨拶に行く', en: 'Visit with a gift of jerky', eff: { fame: 4, luck: 2 }, log: { ja: '竜は干し肉を受け取った。境は向こうの尾の先まで、と決まった。それから村に盗賊が来ない。', en: 'The dragon accepted the jerky. The border was set at the tip of its tail. No bandits came to the village after that.' } },
      { ja: '見なかったことにする', en: 'Pretend not to have seen it', eff: { happy: -1, luck: 1 }, log: { ja: '竜の方も、見なかったことにしてくれた。お互い、それで五十年うまくやった。', en: 'The dragon pretended not to have seen them either. Both sides got along fine that way for fifty years.' } },
    ] },
  },

  // ---- 冒険者ギルド ----------------------------------------------------------------
  {
    id: 'tpt.guild.big-guy', stage: ['teen', 'adult'], tags: FANTASY, jobs: ['adventurer'], noFlag: 'rankC', w: 1.5, kind: 'adventure',
    ja: '登録の日、酒場にいた大男に「新入りか」と絡まれた。',
    en: 'On registration day, a huge man in the tavern loomed over {name}. "New, are you?"',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '受けて立つ', en: 'Stand up to him', eff: { power: 2, hp: -2 }, log: { ja: '負けた。大男は「根性がある」と笑って一杯おごり、後に一番の飲み仲間になった。', en: 'Lost. The big man laughed, said {he} had guts, bought {him} a drink, and later became {his} best drinking buddy.' } },
      { ja: '受付に助けを求める', en: 'Ask the receptionist for help', eff: { charm: 1, luck: 1 }, log: { ja: '受付の人が帳簿の角で大男の頭を叩いた。このギルドで一番強いのは、受付だった。', en: 'The receptionist whacked the big man on the head with the corner of a ledger. The strongest person in the guild worked the front desk.' } },
    ] },
  },
  {
    id: 'tpt.guild.this-year', stage: ['adult'], tags: FANTASY, jobs: ['adventurer'], noFlag: 'rankC', w: 1, kind: 'work',
    ja: '受付の人に毎年「今年こそ昇格ですね」と言われ続けて、九年目になった。九年目、受付の人の方が先に昇進した。',
    en: 'Every year the receptionist said, "This is your year for a promotion." In the ninth year, the receptionist got promoted first.',
    eff: { happy: 1, charm: 1 },
  },
  {
    id: 'tpt.guild.no-ordinary', stage: ['teen', 'adult'], tags: FANTASY, flag: 'guild', w: 1, kind: 'work',
    ja: '受付の人に「あなた、ただ者じゃありませんね」と言われて、少しうれしかった。後ろに並んでいた全員が、同じことを言われていた。',
    en: 'The receptionist told {name}, "You are no ordinary person," and {he} felt a little proud. Everyone behind {him} in line got told the same thing.',
    eff: { happy: 1 },
  },
  {
    id: 'tpt.guild.zero', stage: ['teen', 'adult'], tags: FANTASY, cheat: true, flag: 'guild', w: 1, kind: 'power',
    ja: '魔力の測定で、目立たないように手を抜いた。数値は「零」。水晶が割れたときより大騒ぎになった。',
    en: 'At the mana test, {name} held back so as not to stand out. The reading was zero. It caused more of a stir than a shattered crystal would have.',
    eff: { fame: 2, luck: -1 },
  },
  {
    id: 'tpt.guild.herbs', stage: ['teen', 'adult'], tags: FANTASY, jobs: ['adventurer'], noFlag: 'rankC', w: 1.5, kind: 'adventure',
    ja: '新人の仕事は、薬草採りばかりだ。',
    en: 'New adventurers got nothing but herb-gathering jobs.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '黙々と採り続ける', en: 'Keep picking herbs', eff: { mind: 2, wealth: 2 }, log: { ja: '三年で、薬草の目利きでは{guild}で一番になった。剣は、まだ一度も抜いていない。', en: 'In three years {name} became the best herb judge at {guild}. {His} sword had yet to leave its sheath.' } },
      { ja: '背伸びして討伐依頼を受ける', en: 'Take a hunting job above your level', eff: { power: 3, hp: -3 }, risk: { hazard: 'monster', p: 0.01 }, log: { ja: '生きて帰った。ズボンの尻が、半分なかった。', en: 'Came back alive. Half the seat of {his} trousers did not.' } },
    ] },
  },

  // ---- 魔王が実はいい人 ----------------------------------------------------------------
  {
    id: 'tpt.demon.daughter', stage: ['teen'], tags: FANTASY, flag: 'academy', magic: 1, w: 1, kind: 'school',
    ja: '魔王の娘が、人間の学園に留学してきた。誰も近づこうとしない。',
    en: "The Demon Lord's daughter came to study at the human academy. Nobody would go near her.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '案内役を引き受ける', en: 'Volunteer as her guide', eff: { charm: 3, happy: 2 }, log: { ja: '娘は学食の揚げパンを気に入り、国に帰ってから城の献立に入れた。魔王軍の士気が上がったらしい。', en: "She fell in love with the cafeteria's fried bread and put it on the castle menu when she went home. The Demon Lord's army reportedly had better morale after that." } },
      { ja: '遠くから見守る', en: 'Watch from a distance', eff: { mind: 1, luck: 1 }, log: { ja: '話し相手のいない娘は、図書室の本を全部読んだ。卒業式の答辞は、どの生徒のものより長かった。', en: 'With no one to talk to, she read every book in the library. Her graduation speech was longer than any student\'s before her.' } },
    ] },
  },
  {
    id: 'tpt.demon.greeting', stage: ['adult', 'middle', 'elder'], tags: FANTASY, magic: 2, w: 0.6, kind: 'fame',
    ja: '魔王から、季節の挨拶状が届いた。字がとても丁寧だった。返事を出すと、翌年から干し柿が届くようになった。',
    en: 'A seasonal greeting card arrived from the Demon Lord. The handwriting was very neat. {name} wrote back, and from the next year on, dried persimmons started arriving.',
    eff: { happy: 2, luck: 1 },
  },
  {
    id: 'tpt.demon.burnout', stage: ['adult', 'middle'], tags: FANTASY, memory: true, magic: 2, w: 0.8, kind: 'hard',
    ja: '旅の宿で、魔王軍の幹部と相部屋になった。顔色が、前世の自分とまったく同じだった。',
    en: "At an inn, {name} ended up sharing a room with one of the Demon Lord's generals. The general had exactly the same complexion {name} had in the past life.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '温泉と昼寝を勧める', en: 'Recommend hot springs and naps', eff: { charm: 3, happy: 2 }, log: { ja: '幹部は三日寝て、四日目に辞表を書いた。翌年、国境で温泉宿を開いた。', en: 'The general slept for three days and wrote a resignation letter on the fourth. The next year, they opened a hot-spring inn on the border.' } },
      { ja: '残業の減らし方を教える', en: 'Teach ways to cut overtime', eff: { mind: 2, fame: 1 }, log: { ja: '魔王軍の残業が減ったという噂が流れた。攻めてくる時刻が、毎回夕方五時までになった。', en: "Rumor had it that overtime in the Demon Lord's army went down. From then on, every attack ended by five in the evening." } },
    ] },
  },

  // ---- 勇者パーティの内情 ----------------------------------------------------------------
  {
    id: 'tpt.party.books', stage: ['adult'], tags: FANTASY, flag: 'party', w: 1, kind: 'adventure',
    ja: '荷物の三分の一は、仲間の魔術師の本だった。読む時間はない、と本人も言っていた。',
    en: "A third of the party's luggage was the mage's books. The mage admitted there was no time to read any of them.",
    eff: { power: 2, happy: -1 },
  },
  {
    id: 'tpt.party.split', stage: ['adult'], tags: FANTASY, flag: 'party', w: 1.5, kind: 'adventure',
    ja: 'パーティの宿代の割り勘で、また揉めている。',
    en: 'The party was arguing over how to split the inn bill again.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '帳簿をつけると申し出る', en: 'Offer to keep the books', eff: { mind: 2, charm: 2 }, log: { ja: '半年後、一番金がかかっているのは剣士の剣の手入れ代だと分かった。剣士は少し静かになった。', en: "Six months later, the biggest expense turned out to be the swordsman's blade maintenance. The swordsman got a little quieter." } },
      { ja: '黙って自分が払う', en: 'Quietly pay for it', eff: { wealth: -5, charm: 3 }, log: { ja: '旅が終わるころ、パーティで一番貧しいのは{name}で、一番好かれているのも{name}だった。', en: 'By the end of the journey, {name} was the poorest member of the party, and the best loved.' } },
    ] },
  },
  {
    id: 'tpt.party.snore', stage: ['adult'], tags: FANTASY, flag: 'party', w: 1, kind: 'adventure',
    ja: 'パーティのリーダーは、いびきがひどかった。おかげで野営の夜に魔物が一度も寄ってこなかった。',
    en: 'The party leader snored terribly. Thanks to that, no monster ever came near their camp at night.',
    eff: { luck: 2, happy: -1 },
  },
  {
    id: 'tpt.party.stone', stage: ['elder'], tags: FANTASY, flag: 'party', w: 1, kind: 'old',
    ja: '解散から四十年。四人の名を刻んだ石碑の前で、生き残った二人が会った。誰が一番役に立っていなかったか、で日が暮れるまで揉めた。',
    en: 'Forty years after the party broke up, the two who were still alive met at the monument carved with four names. They argued until sunset over who had been the most useless.',
    eff: { happy: 4 },
  },

  // ---- 学園 ----------------------------------------------------------------
  {
    id: 'tpt.school.hearth', stage: ['teen'], cheat: true, magic: 1, flag: 'academy', w: 1, kind: 'school',
    ja: '入学試験の実技で、遠慮して小さな火を出した。試験官は合格の印を押し、横に「暖炉係」と書き添えた。三年間、寮の暖炉は{name}の担当だった。',
    en: 'At the entrance exam, {name} held back and made only a small flame. The examiner stamped "Pass" and wrote "Fireplace duty" beside it. For three years, the dormitory fireplace was {his} job.',
    eff: { charm: 2, happy: 1 },
  },
  {
    id: 'tpt.school.duel', stage: ['teen'], status: ['commoner', 'poor', 'orphan', 'merchant'], flag: 'academy', w: 1.5, kind: 'school',
    ja: '貴族の生徒に決闘を申し込まれた。理由は「平民のくせに成績がいい」だった。',
    en: 'A noble student challenged {name} to a duel. The reason: "Your grades are too good for a commoner."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '受ける', en: 'Accept', eff: { power: 2, fame: 3 }, log: { ja: '勝った。翌朝から、相手は毎朝勉強を聞きに来るようになった。', en: 'Won. From the next morning on, the noble came by every day to ask for help with homework.' } },
      { ja: '「筆記で勝負しましょう」と言う', en: '"Let\'s settle it with a written test"', eff: { mind: 3 }, log: { ja: '相手はその夜から猛勉強を始め、次の試験で{name}を抜いた。決闘で負けるより悔しかった。', en: 'The noble started studying that very night and beat {name} on the next exam. It stung more than losing a duel would have.' } },
    ] },
  },
  {
    id: 'tpt.school.curry-friday', stage: ['teen'], memory: true, flag: 'academy', w: 1, kind: 'school',
    ja: '学食の献立に、前世の給食を元にした案を出した。翌月から、金曜日はカレーの日になった。卒業から三十年たっても、金曜日はカレーの日のままだった。',
    en: "{name} submitted cafeteria menu ideas based on the school lunches of the past life. From the next month, Friday became curry day. Thirty years after graduation, Friday was still curry day.",
    eff: { charm: 3, fame: 1 },
  },
  {
    id: 'tpt.school.middle', stage: ['teen'], cheat: true, flag: 'academy', w: 1, kind: 'school',
    ja: '試験の順位表で、{name}は毎回ちょうど真ん中にいた。目立たないように点を調整していたのだが、調整していることは、教師全員にばれていた。',
    en: 'On every exam ranking, {name} landed exactly in the middle. {He} had been adjusting {his} scores to stay unnoticed. Every teacher had noticed.',
    eff: { mind: 1, charm: 1 },
  },

  // ---- 婚約破棄と悪役令嬢 (外から見る) ----------------------------------------------------------------
  {
    id: 'tpt.villain.three', stage: ['teen'], tags: ['nobility'], flag: 'academy', w: 1, kind: 'school',
    ja: '卒業パーティで婚約破棄の騒ぎが起きた。ただ、同じ学年に悪役令嬢が三人いたので、どの騒ぎなのか分かるまで少しかかった。',
    en: 'A broken-engagement scene erupted at the graduation party. There were three villainess types in that class, though, so it took a while to figure out which scene this was.',
    eff: { happy: 1 },
  },
  {
    id: 'tpt.villain.waiter', stage: ['teen', 'adult'], tags: ['nobility'], status: ['commoner', 'poor', 'orphan', 'merchant'], w: 1, kind: 'work',
    ja: '給仕として、学園の卒業パーティに雇われた。料理を運んでいると、王子が楽団を止めさせた。',
    en: 'Hired as a server for the academy graduation party, {name} was carrying dishes when the prince ordered the musicians to stop.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '料理を下げずに待つ', en: 'Hold the dishes and wait', eff: { wealth: 2 }, log: { ja: '断罪は一時間続き、料理はすべて冷めた。一番損をしたのは料理長だった。', en: 'The denunciation went on for an hour, and every dish went cold. The head chef lost the most that night.' } },
      { ja: '令嬢に水を一杯持っていく', en: 'Bring the accused lady a glass of water', eff: { charm: 4 }, log: { ja: '令嬢は水を飲み干し、「辺境に行ったら手紙を書くわ」と言った。本当に届いた。薬草の話が十枚あった。', en: 'The lady drained it and said, "I\'ll write to you from the frontier." She really did. Ten pages, all about herbs.' } },
    ] },
  },
  {
    id: 'tpt.villain.news', stage: ['teen', 'adult'], tags: ['nobility'], status: ['gentry', 'noble', 'royal'], noFlag: 'engaged', w: 0.8, kind: 'love',
    ja: '大広間で、婚約破棄を言い渡された。婚約していたことを、その場で初めて知った。',
    en: 'In the great hall, {name} was told {his} engagement was over. It was the first {he} had heard of being engaged at all.',
    eff: { happy: 1, luck: 1 },
  },
  {
    id: 'tpt.villain.both', stage: ['teen'], tags: ['nobility'], memory: true, flag: 'academy', w: 1, kind: 'school',
    ja: '前世で遊んだゲームの、ヒロインの側に生まれていたと気づいた。廊下ですれ違った悪役令嬢も、こちらを見て同じ顔をしていた。',
    en: "{name} realized {he} had been born on the heroine's side of a game from the past life. The villainess passing in the hallway looked back with the exact same expression.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '手を組む', en: 'Team up', eff: { charm: 3, happy: 3 }, log: { ja: '二人で筋書きを全部外した。王子は最後まで、何が起きたのか分かっていなかった。', en: 'Together they derailed the entire plot. The prince never did figure out what had happened.' } },
      { ja: '筋書きどおりに進める', en: 'Follow the script', eff: { fame: 4, happy: -2 }, log: { ja: '断罪の場で、令嬢は台詞を一字一句違えずに言った。終わったあと、楽屋の役者のように二人で頭を下げ合った。', en: 'At the denunciation, the villainess delivered every line word for word. Afterward, the two of them bowed to each other like actors backstage.' } },
    ] },
  },

  // ---- 料理で胃袋をつかむ ----------------------------------------------------------------
  {
    id: 'tpt.food.karaage', stage: GROWN, memory: true, tags: ['fantasy', 'nobility'], w: 1, kind: 'work',
    ja: '唐揚げを作って近所に配った日、騎士団の半分が{name}の家の前に並んだ。残りの半分が夜番を代わっていた。翌週は、その半分が並んだ。',
    en: 'The day {name} handed out fried chicken, half the knights lined up outside {his} house while the other half covered the night watch. The next week, the other half lined up.',
    eff: { fame: 3, charm: 2 },
  },
  {
    id: 'tpt.food.siege-curry', stage: ['adult', 'middle'], tags: FANTASY, cheats: ['cooking'], w: 1.5, kind: 'battle',
    ja: '包囲された砦の炊き出しで、カレーを作った。翌朝、向こうの陣から兵が三人、匂いにつられて降伏してきた。',
    en: "{name} cooked curry for the soldiers in a besieged fort. The next morning, three enemy soldiers surrendered, drawn by the smell.",
    eff: { fame: 4, charm: 2 },
  },
  {
    id: 'tpt.food.soy', stage: ['adult', 'middle', 'elder'], memory: true, tags: ['fantasy'], not: ['eastern'], w: 1, kind: 'work',
    ja: '東から来た行商人の荷から、醤油の匂いがした。',
    en: "A whiff of soy sauce drifted from a peddler's pack, a peddler from the far east.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '有り金を全部出す', en: 'Offer every coin you have', eff: { wealth: -8, happy: 8 }, log: { ja: '小瓶が一本。何十年ぶりかの匂いに、少し泣いた。米が無いので、卵かけご飯はあきらめた。', en: 'One small bottle. The first smell of it in decades made {him} cry a little. There was no rice, so egg on rice would have to wait.' } },
      { ja: '作り方を聞き出す', en: 'Ask how it is made', eff: { mind: 3, happy: 2 }, log: { ja: '麹の育て方を三年かけて覚えた。できた醤油は前世のよりしょっぱかったが、毎日使った。', en: 'It took three years to learn to grow the mold. {His} soy sauce was saltier than the old one, but {he} used it every day.' } },
    ] },
  },

  // ---- 元社畜の働き方改革 ----------------------------------------------------------------
  {
    id: 'tpt.work.horenso', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, w: 1.5, kind: 'work',
    ja: '「報告・連絡・相談」を職場に広めた。評判が王都まで届き、王国の会議が倍の長さになった。',
    en: 'At work, {name} introduced the habit of "report, contact, consult". The idea spread all the way to the capital, and royal meetings doubled in length.',
    eff: { mind: 1, fame: 2 },
  },
  {
    id: 'tpt.work.boss-voice', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, jobs: ['merchant', 'cook', 'smith', 'alchemist', 'lord'], w: 1.5, kind: 'work',
    ja: '部下に「今日中に頼む」と言った瞬間、自分の声が前世の上司の声と重なった。',
    en: 'The moment {name} told a worker, "I need this by end of day," {his} voice overlapped with the voice of {his} old boss.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '翌朝、謝る', en: 'Apologize the next morning', eff: { charm: 4 }, log: { ja: '部下はきょとんとしていた。この世界の「今日中」は、日が沈むまでのことだった。', en: 'The worker just looked puzzled. In this world, "end of day" meant sundown, and that was that.' } },
      { ja: '終業の鐘を作る', en: 'Install a quitting-time bell', eff: { happy: 3, wealth: -2 }, log: { ja: '鐘が鳴ると皆が帰るようになった。最後まで残っているのは、いつも{name}だった。', en: 'When the bell rang, everyone went home. The last one still there was always {name}.' } },
    ] },
  },
  {
    id: 'tpt.work.ordered-rest', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, w: 1, kind: 'ill',
    ja: '領主に「休め」と命じられた。休んだら、三日間寝込んだ。体が休み方を忘れていた。',
    en: 'The lord ordered {name} to rest. {He} rested, and was bedridden for three days. {His} body had forgotten how.',
    eff: { hp: 2, happy: 1 },
  },

  // ---- 鈍感 ----------------------------------------------------------------
  {
    id: 'tpt.dense.what', stage: ['teen', 'adult'], w: 0.6, kind: 'love',
    ja: '三人から「鈍感だ」と言われた。何に鈍感なのか聞いたら、三人とも黙って帰っていった。',
    en: 'Three different people called {name} oblivious. When {he} asked oblivious to what, all three silently went home.',
    eff: { charm: 1, mind: -1 },
  },
  {
    id: 'tpt.dense.fireworks', stage: ['teen'], not: ['ruin', 'scifi'], w: 0.8, kind: 'love',
    ja: '祭りの夜、幼なじみに「二人で花火を見たい」と言われた。',
    en: 'On the night of the festival, a childhood friend said, "I want to watch the fireworks with you. Just us."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「みんなで見た方が楽しいよ」', en: '"It\'s more fun with everyone!"', eff: { charm: 1, happy: -1 }, log: { ja: '十二人で見た花火は、とてもきれいだった。幼なじみの顔だけ、ずっと怖かった。', en: 'Twelve of them watched the fireworks together. They were beautiful. The childhood friend\'s face was not.' } },
      { ja: '「二人で?」と聞き返す', en: '"Just the two of us?"', eff: { happy: 4 }, log: { ja: '聞き返したことを、{name}はその後四十年からかわれ続けた。', en: '{name} got teased about asking that for the next forty years.' } },
    ] },
  },

  // ---- 獣耳の仲間 ----------------------------------------------------------------
  {
    id: 'tpt.beast.ears', stage: ['teen', 'adult'], tags: ['fantasy'], w: 1, kind: 'love',
    ja: '獣人の友に耳を触っていいかと聞いたら、三年待てと言われた。四年目に許された。思ったより、ずっと温かかった。',
    en: 'When {name} asked a beastfolk friend if {he} could touch their ears, the answer was "Wait three years." Permission came in the fourth. They were much warmer than expected.',
    eff: { happy: 3, charm: 1 }, tie: { role: 'friend', new: true },
  },
  {
    id: 'tpt.beast.tail', stage: ['teen', 'adult'], tags: ['fantasy'], w: 1, kind: 'love',
    ja: '仲間の獣人の尻尾は、嘘をつくと揺れる。今、すごく揺れている。',
    en: "A beastfolk companion's tail wagged whenever they lied. Right now, it was wagging like mad.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '指摘する', en: 'Point it out', eff: { luck: 1, charm: -1 }, log: { ja: '仲間は尻尾を両手で押さえて「揺れてない」と言った。揺れていた。', en: 'The companion clamped the tail with both hands and said, "It is not wagging." It was.' } },
      { ja: '気づかないふりをする', en: 'Pretend not to notice', eff: { charm: 3, happy: 2 }, log: { ja: '隠していたのは、{name}の誕生日の準備だった。当日も、尻尾はずっと揺れていた。', en: "What they were hiding was a birthday party for {name}. On the day itself, the tail never stopped wagging." } },
    ] },
  },
  {
    id: 'tpt.beast.seventh', stage: ['teen', 'adult'], races: BEASTFOLK, w: 1, kind: 'hard',
    ja: '人間の転生者に「耳を触ってもいいですか」と聞かれた。これで七人目だった。転生者は、皆同じ顔で聞いてくる。',
    en: 'A human reincarnator asked {name}, "May I touch your ears?" That made seven. Reincarnators all asked with the same face.',
    eff: { charm: 1, happy: 1 },
  },

  // ---- 奴隷解放 ----------------------------------------------------------------
  {
    id: 'tpt.slave.price', stage: ['adult', 'middle'], tags: ['fantasy'], noFlag: 'slave', w: 0.8, kind: 'hard',
    ja: '奴隷商の前で足を止め、{name}は全員の値段を聞いた。払えるのは一人分だった。',
    en: "{name} stopped in front of a slave trader's stall and asked the price of every person there. {He} could afford one.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '一人を自由にする', en: 'Free one person', eff: { wealth: -10, charm: 3, happy: 2 }, log: { ja: '書類にその人の名を書き、首の輪を外した。その人は礼も言わずに走って行き、十年後、商会の主になって礼を言いに来た。', en: 'Wrote the name on the papers and removed the collar. The person ran off without a word of thanks, and came back ten years later as the head of a trading house to say it.' } },
      { ja: '奴隷商を訴える', en: 'Take the trader to court', eff: { fame: 3, wealth: -3 }, risk: { hazard: 'violence', p: 0.01 }, log: { ja: '裁判は五年かかった。終わったとき、その町の奴隷市は閉じていた。', en: 'The case took five years. By the time it ended, the slave market in that town had closed.' } },
    ] },
  },
  {
    id: 'tpt.slave.first-name', stage: ['teen', 'adult'], flag: 'freed', w: 2, kind: 'fame',
    ja: '自由になって最初の朝、{name}は自分の名前を自分の手で書いた。三回書いて、三回とも綴りが違った。どれも、自分の名前だった。',
    en: 'On the first morning of freedom, {name} wrote {his} own name in {his} own hand. {He} wrote it three times and spelled it three different ways. Every one was {his} name.',
    eff: { happy: 5, mind: 1 },
  },

  // ---- 追放する側・された側 ----------------------------------------------------------------
  {
    id: 'tpt.exile.regret', stage: ['adult'], tags: FANTASY, jobs: ['adventurer'], flag: 'party', noFlag: 'exiled', w: 0.8, kind: 'adventure',
    ja: '「役に立たない」と荷物持ちをパーティから外した。翌月、誰も野営の火を起こせないことが分かった。',
    en: 'The party had kicked out its porter for being useless. The next month, they found out none of them could start a campfire.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '謝りに行く', en: 'Go and apologize', eff: { charm: 3, wealth: -3 }, log: { ja: '元荷物持ちは、別のパーティで副長になっていた。「火の起こし方なら教える」と言って、紙に書いてくれた。', en: 'The old porter was now second-in-command of another party. "I can teach you how to make a fire," they said, and wrote it down.' } },
      { ja: '自分たちで覚える', en: 'Learn it themselves', eff: { mind: 2, hp: -2 }, log: { ja: '三か月で火は起きるようになった。そのころには、荷物持ちがほかに何をしていたかも分かった。四十七項目あった。', en: 'In three months they could start a fire. By then they also knew everything else the porter had been doing. Forty-seven items.' } },
    ] },
  },
  {
    id: 'tpt.exile.letters', stage: ['adult', 'middle'], tags: FANTASY, flag: 'exiled', w: 1, kind: 'fame',
    ja: '追い出された元のパーティから「戻ってきてくれ」と手紙が来た。三通目は報酬の額が書き直してあり、四通目はリーダーの母親からだった。',
    en: 'Letters came from the party that had thrown {name} out: "Please come back." The third one had a higher fee written in. The fourth was from the leader\'s mother.',
    eff: { happy: 2, fame: 1 },
  },

  // ---- 不遇からの小さな一歩 ----------------------------------------------------------------
  {
    id: 'tpt.rise.shoes', stage: ['teen', 'adult'], status: LOW, w: 1.5, kind: 'work',
    ja: '初めて自分の稼ぎで靴を買った。左右で大きさが少し違ったが、どちらも自分のものだった。',
    en: "For the first time, {name} bought shoes with {his} own wages. The left and right were not quite the same size, but both of them were {his}.",
    eff: { happy: 4 },
  },
  {
    id: 'tpt.rise.name', stage: ['teen', 'adult'], status: LOW, w: 1.5, kind: 'work',
    ja: '市場の人が、{name}の名前を覚えてくれた。「おい」でも「そこの」でもなく、名前で呼ばれた。その日は遠回りして帰った。',
    en: 'A vendor at the market remembered {name}\'s name. Not "hey" or "you there", but {his} actual name. {He} took the long way home that day.',
    eff: { happy: 3, charm: 1 },
  },
];
