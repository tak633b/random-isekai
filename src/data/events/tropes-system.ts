// 異世界ものの定番ネタ (system)。書き方と条件の例は tropes.ts の頭。読み込みは engine/events.ts が src/data/events/*.ts を全部集める
// 仕組みの型: ステータス画面・鑑定・熟練度と称号のアナウンス・外れスキル・隠しステータス・アイテムボックス・言語理解・スキルポイント・レベルアップ
import type { EventDef } from '../../engine/types';

const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const GAMEY: EventDef['tags'] = ['gamey'];
const FANTASY: EventDef['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern'];

export const EVENTS: EventDef[] = [
  // ---- ステータス画面 ----------------------------------------------------------------
  {
    id: 'tps.status-chores', stage: ['adult', 'middle'], tags: GAMEY, w: 1.5, kind: 'family',
    ja: 'ステータスに、見覚えのない項目が増えていた。「家事: 3」。{spouse}のを見せてもらうと、「家事: 87」だった。',
    en: 'A new line had appeared on {name}\'s Status screen: "Housework: 3." {spouse}\'s said "Housework: 87."',
    eff: { mind: 1, happy: 1 },
  },
  {
    id: 'tps.status-fifty', stage: ['middle'], tags: GAMEY, w: 1.5, kind: 'old',
    ja: '五十歳のステータスを開いた。筋力が下がり、知恵と忍耐が上がっていた。差し引きで、少し得をした気がする。',
    en: '{name} opened the Status screen at fifty. Strength was down; wisdom and patience were up. On balance, it felt like a small profit.',
    eff: { mind: 2, power: -1 },
  },
  {
    id: 'tps.status-provisional', stage: ['teen', 'adult'], tags: GAMEY, w: 1.5, kind: 'hard',
    ja: 'ステータスを開くと、職業の欄に「村人 (仮)」とあった。',
    en: 'On {name}\'s Status screen, the occupation line read: "Villager (provisional)."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「仮」の意味を神殿に聞きに行く', en: 'Ask the temple what "provisional" means', eff: { mind: 2 }, log: { ja: '神官にも分からなかった。神官の欄は「神官 (見習い) (仮)」だった。', en: 'The priest had no idea either. The priest\'s own line read "Priest (trainee) (provisional)."' } },
      { ja: '気にしない', en: 'Ignore it', eff: { happy: 2 }, log: { ja: '十年後のある朝、ふと見ると「(仮)」が取れていた。何が決め手だったのかは分からない。', en: 'One morning ten years later, the "(provisional)" was gone. Nobody ever found out what had decided it.' } },
    ] },
  },
  {
    id: 'tps.status-fate', stage: GROWN, tags: GAMEY, w: 1.2, kind: 'hard',
    ja: 'ステータスの一番下に、自分にしか見えない欄があると気づいた。「運命: ふつう」。{name}はなぜか、少し安心した。',
    en: 'At the very bottom of the Status screen, {name} found a line only {he} could see: "Destiny: average." For some reason, it was a relief.',
    eff: { happy: 2 },
  },
  {
    id: 'tps.status-share', stage: ['teen', 'adult'], tags: GAMEY, w: 1.2, kind: 'love',
    ja: '{friend}に、ステータスを見せ合おうと言われた。',
    en: '{friend} suggested they show each other their Status screens.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '見せる', en: 'Show it', eff: { charm: 2, happy: 2 }, log: { ja: '二人とも、運だけが異様に低かった。それで余計に仲良くなった。', en: 'Both had remarkably low luck. That made them even closer.' } },
      { ja: '断る', en: 'Decline', eff: { luck: 1 }, log: { ja: '{friend}は少しすねて、自分のだけ見せてくれた。運が異様に低かった。', en: '{friend} sulked a little and showed theirs anyway. Their luck was remarkably low.' } },
    ] },
  },

  // ---- 鑑定 ----------------------------------------------------------------
  {
    id: 'tps.appraise-self', stage: GROWN, cheats: ['appraisal'], arrival: ['reborn', 'awaken'], memory: true, w: 1.5, kind: 'power',
    ja: '鏡の前で、自分を〈{cheat}〉で見てみた。「転生者 (隠しきれていない)」と出た。',
    en: '{name} used "{cheat}" on {himself} in the mirror. It said: "Reincarnator (not hiding it well)."',
    eff: { mind: 1, happy: -1 },
  },
  {
    id: 'tps.appraise-scale', stage: GROWN, cheats: ['appraisal'], tags: FANTASY, w: 1.5, kind: 'work',
    ja: '市場で「竜の鱗」が売られていた。〈{cheat}〉で見ると「魚」と出た。',
    en: 'A market stall was selling "dragon scales." "{cheat}" said: "Fish."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '店主にそっと教える', en: 'Quietly tell the owner', eff: { charm: 2 }, log: { ja: '店主は礼を言い、翌日から札を「竜のような魚の鱗」に書き直した。', en: 'The owner thanked {him} and relabeled them "scales of a rather dragon-like fish" the next day.' } },
      { ja: '黙って通り過ぎる', en: 'Walk on without a word', eff: { luck: 1 }, log: { ja: '翌月、その店は王宮から「竜の鱗」の大口注文を受けた。{name}は今も黙っている。', en: 'The next month, the stall got a large order for "dragon scales" from the palace. {name} is still keeping quiet.' } },
    ] },
  },
  {
    id: 'tps.appraise-cat', stage: ['child', 'teen', 'adult', 'middle'], cheats: ['appraisal'], w: 1.5, kind: 'power',
    ja: '近所の猫を〈{cheat}〉で見たら、称号の欄に「この家の主」とあった。家の主人には言わないでおいた。',
    en: '{name} used "{cheat}" on a neighbor\'s cat. Under titles it said: "Master of This House." {name} did not tell the actual owner.',
    eff: { happy: 2 },
  },
  {
    id: 'tps.appraise-stew', stage: ['adult', 'middle'], cheats: ['appraisal'], w: 1.5, kind: 'family',
    ja: '{spouse}の手料理を〈{cheat}〉で見たら、「愛情: 大 / 塩分: 大」と出た。{name}は、後半だけ伝えた。',
    en: '{name} used "{cheat}" on a meal {spouse} had cooked. It read: "Love: high. Salt: high." {name} mentioned only the second part.',
    eff: { hp: 1, happy: 2 },
  },

  // ---- 熟練度と称号のアナウンス -------------------------------------------------------
  {
    id: 'tps.skill-nap', stage: ['adult', 'middle', 'elder'], tags: GAMEY, w: 1.5, kind: 'hard',
    ja: '昼寝の最中に、天の声が〈昼寝 Lv.10〉を告げた。その声で起こされた。',
    en: 'In the middle of a nap, a heavenly voice announced: "Napping Lv. 10." The announcement woke {name} up.',
    eff: { happy: 1, hp: 1 },
  },
  {
    id: 'tps.skill-apology', stage: ['adult', 'middle'], tags: GAMEY, memory: true, w: 1.2, kind: 'work',
    ja: '取引先に頭を下げ続けて二十年。天の声が〈謝罪 Lv.MAX〉を告げた。前世の分も入っている気がする。',
    en: 'After twenty years of bowing to clients, a heavenly voice announced: "Apology Lv. MAX." {name} suspected the past life had counted too.',
    eff: { charm: 2, wealth: 2 },
  },
  {
    id: 'tps.skill-patience', stage: ['middle'], tags: GAMEY, w: 1.5, kind: 'family',
    ja: '{child}を育てて二十年目、天の声が〈忍耐 MAX〉を告げた。手はかかったが、どの上司よりもかわいかった。',
    en: 'Twenty years into raising {child}, a heavenly voice announced: "Patience MAX." It had been hard work, but far cuter than any boss.',
    eff: { mind: 2, happy: 2 },
  },
  {
    id: 'tps.skill-nod', stage: GROWN, tags: GAMEY, w: 1.2, kind: 'hard',
    ja: '天の声が「スキル〈相づち〉を獲得しました」と告げた。それ以来、天の声にも相づちを打ってしまう。',
    en: 'A heavenly voice announced: "Skill acquired: Nodding Along." Ever since, {name} nods along to the heavenly voice too.',
    eff: { charm: 2 },
  },
  {
    id: 'tps.title-runner', stage: ['teen', 'adult'], tags: GAMEY, w: 1.5, kind: 'adventure',
    ja: '天の声が告げた。称号〈逃げ足の速い者〉を獲得しました。不名誉だが、生きている。',
    en: 'A heavenly voice announced: "Title acquired: Swift of Retreat." Not glorious, but {name} was alive.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '称号を隠す', en: 'Hide the title', eff: { luck: 2 }, log: { ja: '隠したまま、その後も何度も逃げ切った。', en: '{He} kept it hidden, and kept getting away, many more times.' } },
      { ja: '堂々と名乗る', en: 'Wear it proudly', eff: { charm: 2, wealth: 2 }, log: { ja: '逃げ方の指南を頼まれるようになった。月謝は前払いにした。', en: 'People started asking for lessons in running away. {name} made them pay in advance.' } },
    ] },
  },
  {
    id: 'tps.title-dragon', stage: ['adult', 'middle'], tags: GAMEY, w: 1.2, kind: 'fame',
    ja: '天の声が告げた。称号〈竜殺し〉を獲得しました。{name}は、竜を見たこともない。',
    en: 'A heavenly voice announced: "Title acquired: Dragonslayer." {name} had never even seen a dragon.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '黙って名乗っておく', en: 'Quietly keep it', eff: { fame: 5, luck: -1 }, log: { ja: '以来、竜の話を振られるたびに、話題を変えた。', en: 'From then on, whenever dragons came up, {name} changed the subject.' } },
      { ja: '天の声に問い合わせる', en: 'Query the heavenly voice', eff: { mind: 2 }, log: { ja: '三日後、称号は〈竜殺し (誤配)〉に変わった。', en: 'Three days later, the title changed to "Dragonslayer (misdelivered)."' } },
    ] },
  },
  {
    id: 'tps.title-firstlove', stage: ['teen', 'adult'], tags: GAMEY, w: 1, kind: 'love',
    ja: '誰にも言っていない称号がある。〈初恋に破れし者〉。消し方は、今も分からない。',
    en: '{name} has a title {he} has never told anyone about: "Defeated by First Love." {He} still has not found a way to remove it.',
    eff: { mind: 1, happy: -1 },
  },

  // ---- レベルアップとスキルポイント ----------------------------------------------------
  {
    id: 'tps.fanfare-night', stage: GROWN, tags: GAMEY, w: 1.5, kind: 'power',
    ja: '夜中にレベルが上がり、頭の中のファンファーレで目が覚めた。',
    en: '{name} leveled up in the middle of the night and was woken by the fanfare inside {his} head.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '起きて、記念に夜食を作る', en: 'Get up and make a celebratory snack', eff: { level: 1, happy: 2, hp: -1 }, log: { ja: 'それから、レベルが上がった夜は夜食の日になった。', en: 'From then on, every level-up night was snack night.' } },
      { ja: '寝直す', en: 'Go back to sleep', eff: { level: 1, hp: 1 }, log: { ja: '夢の中で、ファンファーレがもう一度鳴った。', en: 'In {his} dream, the fanfare played again.' } },
    ] },
  },
  {
    id: 'tps.fanfare-funeral', stage: ['adult', 'middle'], tags: GAMEY, w: 1, kind: 'hard',
    ja: '親戚の葬儀の最中に、頭の中でレベルアップのファンファーレが鳴った。{name}は必死に真顔を保った。',
    en: 'In the middle of a relative\'s funeral, the level-up fanfare went off inside {name}\'s head. {He} fought hard to keep a straight face.',
    eff: { level: 1, mind: 1 },
  },
  {
    id: 'tps.fanfare-elder', stage: ['elder'], tags: GAMEY, w: 1.5, kind: 'old',
    ja: '八十歳でレベルが上がった。ファンファーレは、若い頃より少しだけゆっくり鳴った気がした。',
    en: '{name} leveled up at eighty. The fanfare seemed to play just a little slower than it used to.',
    eff: { level: 1, happy: 2 },
  },
  {
    id: 'tps.points-spend', stage: ['teen', 'adult'], tags: GAMEY, w: 1.5, kind: 'power',
    ja: 'スキルポイントが三つ余っている。',
    en: '{name} had three unspent skill points.',
    choice: { ja: 'どこに振る?', en: 'Where to put them?', options: [
      { ja: '〈剣術〉', en: '"Swordsmanship"', eff: { power: 3 }, log: { ja: '素振りの音が変わった。', en: 'The sound of {his} practice swings changed.' } },
      { ja: '〈料理〉', en: '"Cooking"', eff: { happy: 2, charm: 2 }, log: { ja: '剣の腕は変わらなかった。仲間は、{name}が料理当番の日だけ文句を言わなくなった。', en: 'The sword arm stayed the same. But the party stopped complaining on the days {name} cooked.' } },
    ] },
  },
  {
    id: 'tps.points-whistle', stage: ['teen', 'adult'], tags: GAMEY, w: 1.2, kind: 'hard',
    ja: '寝ぼけたまま、貯めていたスキルポイントを全部〈口笛〉に振ってしまった。その年、{name}の口笛に、鳥が三羽本気で求愛してきた。',
    en: 'Half asleep, {name} put every saved skill point into "Whistling." That year, three birds courted {him} in earnest.',
    eff: { charm: 1, happy: 1, power: -1 },
  },
  {
    id: 'tps.points-reset', stage: ['adult', 'middle'], tags: GAMEY, w: 1, kind: 'work',
    ja: '神殿で、スキルポイントの振り直しができると聞いた。料金は金貨三百枚だった。',
    en: 'The temple offered to reset skill points. The fee was three hundred gold coins.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '払って振り直す', en: 'Pay and reset', eff: { wealth: -8, power: 2, mind: 2 }, log: { ja: '考え抜いて振り直したら、ほぼ同じ配分になった。', en: 'After much thought, {name} redistributed them into almost exactly the same build.' } },
      { ja: '今のままでいく', en: 'Keep things as they are', eff: { happy: 2 }, log: { ja: '振り間違いも、自分の歴史だと思うことにした。', en: '{name} decided that the misplaced points were part of {his} history too.' } },
    ] },
  },
  {
    id: 'tps.exp-plate', stage: ['child', 'teen', 'adult'], tags: GAMEY, cheats: ['exp_boost'], w: 1.5, kind: 'power',
    ja: '〈{cheat}〉のせいで、皿を一枚割っただけでレベルが上がった。母に叱られながら、ファンファーレを聞いた。',
    en: 'Thanks to "{cheat}", {name} leveled up just from breaking a plate. {He} heard the fanfare while being scolded.',
    eff: { level: 1, power: 1 },
  },

  // ---- 外れスキル ----------------------------------------------------------------
  {
    id: 'tps.trash-weeds', stage: GROWN, cheats: ['trash_skill'], w: 1.5, kind: 'power',
    ja: '〈{cheat}〉の中身は〈草むしり〉だった。毎日庭をむしっていたら、ある朝、むしりすぎて裏の森が一つ無くなっていた。',
    en: '"{cheat}" turned out to be "Weeding." {name} weeded the garden every day, until one morning {he} overdid it and the forest out back was gone.',
    eff: { power: 3, fame: 2 },
  },
  {
    id: 'tps.trash-seiza', stage: GROWN, cheats: ['trash_skill'], w: 1.2, kind: 'hard',
    ja: '〈{cheat}〉の中身は〈正座〉だった。最後まで外れのままだった。ただ、足は一度もしびれなかった。',
    en: '"{cheat}" turned out to be "Kneeling Politely." It stayed a dud to the end. But {his} legs never once fell asleep.',
    eff: { happy: 2, hp: 1 },
  },
  {
    id: 'tps.trash-jar', stage: ['adult', 'middle'], cheats: ['trash_skill'], w: 1.2, kind: 'work',
    ja: '笑われ続けた〈{cheat}〉の、本当の使い道を探すかどうか。',
    en: 'Should {name} go looking for the real use of the much-mocked "{cheat}"?',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '使い道を探す', en: 'Search for its use', eff: { mind: 2, wealth: 3 }, log: { ja: '十年探して見つかったのは、固い瓶のふたを開けることだった。町じゅうから瓶が届くようになった。', en: 'Ten years of searching revealed it: opening stuck jar lids. Jars started arriving from all over town.' } },
      { ja: '忘れて働く', en: 'Forget it and work', eff: { wealth: 4 }, log: { ja: '老いた頃、見知らぬ若者が「その力の使い道、知ってますよ」と訪ねてきた。瓶のふたを開けることだった。', en: 'In old age, a stranger came by: "I know what that power is for." It was opening stuck jar lids.' } },
    ] },
  },

  // ---- 隠しステータス ----------------------------------------------------------------
  {
    id: 'tps.hide-matchmaking', stage: ['teen', 'adult'], cheats: ['hide_status'], w: 1.5, kind: 'love',
    ja: '〈{cheat}〉で力を隠しすぎて、縁談の釣り書きに書くことが何もなかった。',
    en: '{name} had hidden so much with "{cheat}" that there was nothing to write on the marriage profile.',
    eff: { charm: -1, luck: 1 },
  },
  {
    id: 'tps.hide-too-low', stage: ['teen', 'adult'], cheats: ['hide_status'], tags: FANTASY, w: 1.5, kind: 'adventure',
    ja: 'ギルドの測定で手を抜いた。数値が低すぎて、別の意味で騒ぎになった。',
    en: '{name} held back at the guild\'s assessment. The numbers came out so low that it caused a different kind of commotion.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「体調が悪くて」と言う', en: '"I\'m not feeling well"', eff: { luck: 1 }, log: { ja: '翌週の測り直しでも手を抜き、「いつも体調が悪い人」として覚えられた。', en: '{He} held back again at the retest the following week, and became known as "the one who is always unwell."' } },
      { ja: '最下位から始める', en: 'Start from the bottom', eff: { happy: 2, power: 1 }, log: { ja: '最初の依頼は、薬草摘みと猫探しだった。{name}は意外と楽しんだ。', en: 'The first jobs were herb gathering and finding lost cats. {name} enjoyed them more than expected.' } },
    ] },
  },

  // ---- アイテムボックス ----------------------------------------------------------------
  {
    id: 'tps.box-umbrella', stage: GROWN, cheats: ['item_box'], w: 1.5, kind: 'work',
    ja: '収納の目録をつけるのをやめて数年。手を入れたら、知らない傘が出てきた。返す相手は分からない。',
    en: 'A few years after {name} stopped keeping an inventory, {he} reached in and pulled out an umbrella {he} had never seen. There was no one to return it to.',
    eff: { luck: 1, mind: -1 },
  },
  {
    id: 'tps.box-fish', stage: ['adult', 'middle'], cheats: ['item_box'], w: 1.5, kind: 'work',
    ja: '隣人に、獲れた魚をその収納で預かってほしいと頼まれた。',
    en: 'A neighbor asked {name} to keep some freshly caught fish in that storage space.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '預かる', en: 'Take them in', eff: { charm: 3, wealth: 2 }, log: { ja: '夏が終わる頃、収納の目録に「よその家の魚」という欄ができていた。', en: 'By the end of summer, the inventory had a whole section called "Other people\'s fish."' } },
      { ja: '断る', en: 'Decline', eff: { luck: 1 }, log: { ja: '代わりに、冷たい井戸の場所を教えた。冷やすだけなら、だいたいそれで足りた。', en: 'Instead, {name} pointed out the coldest well in town. For keeping things cool, that mostly did the job.' } },
    ] },
  },
  {
    id: 'tps.box-tea', stage: ['elder'], cheats: ['item_box'], w: 1.5, kind: 'old',
    ja: '若い頃に収納へ入れた淹れたての茶を、五十年ぶりに出して飲んだ。熱かった。少しやけどした。',
    en: '{name} took out a cup of tea brewed and stored fifty years earlier, and drank it. It was hot. {He} burned {his} tongue a little.',
    eff: { happy: 2 },
  },

  // ---- 言語理解 ----------------------------------------------------------------
  {
    id: 'tps.lang-hen', stage: ['child', 'teen', 'adult', 'middle'], cheats: ['language'], w: 1.5, kind: 'work',
    ja: '〈{cheat}〉は動物の言葉まで訳してくれる。今朝は鶏に「今日は卵を産みたくない」と言われた。',
    en: '"{cheat}" translated animals too. This morning, a hen told {name}, "I don\'t feel like laying today."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '休ませてやる', en: 'Give her the day off', eff: { happy: 2 }, log: { ja: '翌朝、鶏は卵を二つ産んだ。', en: 'The next morning, she laid two.' } },
      { ja: '頼み込む', en: 'Plead with her', eff: { charm: 1, wealth: 1 }, log: { ja: '交渉は一時間に及んだ。卵は一つ、条件つきだった。', en: 'The negotiation lasted an hour. One egg, with conditions.' } },
    ] },
  },
  {
    id: 'tps.lang-polite', stage: GROWN, cheats: ['language'], w: 1.5, kind: 'hard',
    ja: '〈{cheat}〉の訳し方が丁寧すぎた。ならず者の「てめえ、覚えてろよ」が、「またお会いしましょう」と聞こえた。{name}は笑顔で手を振った。',
    en: '"{cheat}" translated a little too politely. A thug\'s "You\'ll pay for this" came through as "I look forward to seeing you again." {name} smiled and waved.',
    eff: { charm: 1, luck: 1 },
  },
  {
    id: 'tps.lang-envoy', stage: ['adult', 'middle'], cheats: ['language'], w: 1.2, kind: 'work',
    ja: '通訳を頼まれた。相手国の使者の三十分にわたる口上が、〈{cheat}〉では「よろしく」の一言になった。',
    en: '{name} was asked to interpret. The foreign envoy\'s thirty-minute address came through "{cheat}" as a single word: "Greetings."',
    choice: { ja: 'どう訳す?', en: 'How to translate it?', options: [
      { ja: '「よろしく、とのことです」', en: '"They say: greetings."', eff: { charm: 2, fame: 2 }, log: { ja: '両国の大臣が、{name}に深く感謝した。', en: 'The ministers of both countries were deeply grateful to {name}.' } },
      { ja: '雰囲気で長めに訳す', en: 'Pad it out to match the mood', eff: { mind: 2 }, log: { ja: '口上はさらに長くなった。誰も気づかなかった。', en: 'The address got even longer. Nobody noticed.' } },
    ] },
  },

  // ---- そのほかの特典 ----------------------------------------------------------------
  {
    id: 'tps.gacha-sticks', stage: ['teen', 'adult', 'middle'], cheats: ['gacha'], w: 1.2, kind: 'power',
    ja: '〈{cheat}〉で十連を引いた。九つが〈木の棒〉で、一つが〈少し良い木の棒〉だった。',
    en: '{name} did a ten-pull with "{cheat}". Nine "Wooden Sticks" and one "Slightly Better Wooden Stick."',
    eff: { power: 1, happy: -1 },
  },
  {
    id: 'tps.luck-radish', stage: ['child', 'teen', 'adult', 'middle'], cheats: ['max_luck'], w: 1.2, kind: 'power',
    ja: '〈{cheat}〉のおかげで、祭りのくじは当たり続けた。賞品は、すべて大根だった。',
    en: 'Thanks to "{cheat}", {name} won every festival lottery. Every prize was a radish.',
    eff: { wealth: 1, hp: 1 },
  },
];
