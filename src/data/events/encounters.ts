// まれな出会い。出会い図鑑に載る、珍しい人や存在との出会い。
// 出会うと、しるし 'enc.<id>' が立つ (図鑑はこの id で引く)。同じ出会いは一生に一度 (noFlag で同じ id を2度にしない)。
// id は en.<出会いの id>.<番号>。世界の系統 (tags) ごとに書き分け、どの世界でも少なくとも3種類が起きうるようにする。
import type { EventDef, YearKind } from '../../engine/types';

type Line = [string, string, Partial<EventDef>];
type Opt = NonNullable<EventDef['choice']>['options'][number];

// 特典・英雄の筋・職の条件が無い出会いは、英雄でない種類で年表に載せる (特典なしの人生の英雄の記録を増やさないため。arc.test)
const CALM: Partial<Record<YearKind, YearKind>> = { adventure: 'work', fame: 'work', power: 'work', battle: 'hard' };
// 稀さの段。全件の重みに段の倍率を掛ける。1人の一生に立つ出会いのしるしは平均 0.5〜1個、
// 伝説級のどれかに会う人生は数% (図鑑 src/data/encounters.ts の rarity: 伝説級 5、平民級 1〜2)
const LEGEND = ['goddess', 'dragon', 'phoenix', 'world_tree', 'time_traveler', 'leviathan'];
const COMMON = ['royal', 'master', 'sage'];
const tierScale = (name: string) => (LEGEND.includes(name) ? 0.035 : COMMON.includes(name) ? 0.55 : 0.2);
const gated = (x: Partial<EventDef>) => x.cheat === true || !!x.cheats || !!x.needs || !!x.flag || !!x.jobs;

// from: 番号の始まり (同じ出会いの書き足しを、あとの節で続き番号にするため)
const group = (name: string, lines: Line[], from = 1): EventDef[] =>
  lines.map(([ja, en, x], i) => {
    const kind = x.kind ?? 'adventure';
    return {
      stage: ['adult', 'middle', 'elder'],
      ...x, w: (x.w ?? 0.15) * tierScale(name), kind: gated(x) ? kind : CALM[kind] ?? kind,
      id: `en.${name}.${i + from}`, set: `enc.${name}`, noFlag: `enc.${name}`, ja, en,
    };
  });

// 選択肢1つ。log は選んだ後の一文
const opt = (ja: string, en: string, log: [string, string], rest: Partial<Opt> = {}): Opt =>
  ({ ja, en, log: { ja: log[0], en: log[1] }, ...rest });

const choose = (ja: string, en: string, ...options: Opt[]): EventDef['choice'] => ({ ja, en, options });

const YOUNG: EventDef['stage'] = ['teen', 'adult', 'middle', 'elder'];

// ======================================================================
// 女神に謁見 (goddess)
// ======================================================================
const GODDESS = group('goddess', [
  ['神殿で祈っていた{name}は、気がつくと白い光の広間に立っていた。{god}はその名を呼び、これまでの働きを短くねぎらった。',
    'Praying in the temple, {name} suddenly found {himself} in a hall of white light. {god} spoke {his} name and offered a few brief words of thanks for {his} labors.',
    { tags: ['fantasy'], stage: YOUNG, w: 0.12, kind: 'power', eff: { mind: 2, happy: 3, luck: 2 } }],
  ['夢の中で、{name}は転生のときに会った女神と再び向かい合った。女神は、〈{cheat}〉の使い方をずっと見ていたと言って笑った。',
    'In a dream, {name} stood once more before the goddess {he} had met at {his} rebirth. She laughed and said she had been watching how {he} used "{cheat}".',
    { tags: ['fantasy', 'eastern'], cheat: true, memory: true, stage: YOUNG, w: 0.25, kind: 'power',
      choice: choose('女神に何を願う?', 'What to ask of the goddess?',
        opt('加護を願う', 'Ask for a blessing', ['女神は{name}の額に指を触れた。目が覚めると、体が少し軽かった。', "The goddess touched {name}'s brow. {He} woke feeling a little lighter."], { eff: { luck: 4, hp: 2 } }),
        opt('前世の家族のことを尋ねる', 'Ask about the family left behind', ['女神は、向こうの家族は元気にしていると教えた。{name}は夢の中で少し泣いた。', 'The goddess said the family in the old world was doing well. {name} cried a little in the dream.'], { eff: { happy: 5 } }),
        opt('何も願わない', 'Ask for nothing', ['{name}が何も願わないと、女神は珍しいものを見る顔をして、それから満足そうにうなずいた。', 'When {name} asked for nothing, the goddess looked at {him} as if at something rare, then nodded, pleased.'], { eff: { charm: 2, mind: 2 } }),
      ) }],
  ['山奥の古い社で、{name}は白い装束の女神に行き会った。女神は{name}の顔をしばらく眺め、何も言わずに霧の中へ消えた。',
    'At an old shrine deep in the mountains, {name} came upon a goddess in white robes. She studied {his} face for a while, then vanished into the mist without a word.',
    { tags: ['japan'], stage: YOUNG, w: 0.12, eff: { luck: 3 } }],
  ['旅の女を一晩泊めた翌朝、{name}の家の戸口に麦の穂が山と積まれていた。泊めたのが女神だったと、村の長老だけが気づいた。',
    "The morning after {name} gave a traveling woman a bed for the night, sheaves of grain lay piled at the door. Only the village elder realized the guest had been a goddess.",
    { tags: ['myth'], stage: YOUNG, w: 0.2, kind: 'work',
      choice: choose('雨の夜、見知らぬ女が一夜の宿を求めてきた', 'On a rainy night, a stranger asked for shelter',
        opt('家に入れる', 'Let her in', ['女は火のそばで黙って粥をすすり、夜明け前にいなくなっていた。', 'She ate porridge by the fire without a word and was gone before dawn.'], { eff: { wealth: 5, luck: 3, happy: 2 } }),
        opt('戸を閉ざす', 'Bar the door', ['翌朝、戸口には枯れた麦が一本だけ置かれていた。{name}はそれを長いこと見つめた。', 'In the morning a single withered stalk of grain lay at the door. {name} stared at it for a long time.'], { eff: { luck: -3 } }),
      ) }],
]);

// ======================================================================
// 古竜と言葉を交わす (dragon)
// ======================================================================
const DRAGON = group('dragon', [
  ['山頂の洞で、{name}は古竜と向かい合った。竜は千年前の言葉で問いかけ、{name}が答えるたびに目を細めた。',
    'In a cave at the summit, {name} came face to face with an ancient dragon. It asked questions in a tongue a thousand years old, narrowing its eyes at each answer.',
    { tags: ['fantasy'], stage: YOUNG, w: 0.12, foe: 'dragon',
      choice: choose('竜の問いにどう応じる?', "How to answer the dragon?",
        opt('言葉を尽くして答える', 'Answer it in full', ['問答は夜まで続いた。竜は最後に、自分の鱗を一枚{name}の足元に落とした。', 'The questioning went on into the night. At the end, the dragon let one of its scales fall at {name}\'s feet.'], { eff: { mind: 4, fame: 3 }, risk: { hazard: 'monster', p: 0.03 } }),
        opt('頭を下げて立ち去る', 'Bow and back away', ['竜は追ってこなかった。山を下りるあいだ、背中に視線を感じ続けた。', 'The dragon did not follow. All the way down the mountain, {name} felt its gaze on {his} back.'], { eff: { mind: 1 }, risk: { hazard: 'monster', p: 0.005 } }),
      ) }],
  ['討伐の依頼で向かった先にいたのは古竜だった。竜は剣が抜かれる前に口を開き、依頼主が嘘をついていたことを{name}に教えた。',
    'The quarry of the hunting request turned out to be an ancient dragon. Before any sword was drawn, it spoke, and told {name} that the client had lied.',
    { tags: ['fantasy'], flag: 'guild', w: 0.2, foe: 'dragon', eff: { mind: 3, fame: 2, wealth: -2 }, risk: { hazard: 'monster', p: 0.02 } }],
  ['大雨の夜、川の淵から竜が首をもたげ、{name}に名を尋ねた。名乗ると、竜は満足げに水の底へ戻っていった。',
    'On a night of heavy rain, a dragon raised its head from a deep pool in the river and asked {name} for {his} name. When {he} gave it, the dragon sank back beneath the water, satisfied.',
    { tags: ['japan'], stage: YOUNG, w: 0.15, eff: { luck: 4, happy: 2 } }],
  ['雲海の上で修行していた{name}の前に蒼い竜が現れ、三日三晩、道について語り合った。',
    'While {name} trained above a sea of clouds, an azure dragon appeared, and the two spoke of the Way for three days and three nights.',
    { tags: ['cultivation'], stage: YOUNG, w: 0.15, kind: 'power', eff: { mind: 5, level: 2 } }],
  ['ダンジョンの最深部で待っていた竜は、人の言葉で{name}に「ここまで来た者は四十年ぶりだ」と言った。',
    'The dragon waiting in the deepest level of the dungeon told {name}, in plain human speech, that no one had come this far in forty years.',
    { tags: ['modern'], w: 0.12, foe: 'dragon',
      choice: choose('竜と話すか', 'Talk with the dragon?',
        opt('腰を下ろして話を聞く', 'Sit down and listen', ['竜はダンジョンが生まれた日のことを語った。{name}が地上に持ち帰った話は、どの研究者も信じなかった。', 'The dragon told of the day the dungeons were born. No researcher believed the story {name} brought back to the surface.'], { eff: { mind: 4, fame: 2 }, risk: { hazard: 'monster', p: 0.02 } }),
        opt('すぐに撤退する', 'Retreat at once', ['{name}は帰還の札を握りつぶした。竜の笑い声が、転移の光の向こうでまだ聞こえていた。', 'Crushing the return charm in {his} fist, {name} vanished in its light, the dragon\'s laughter still ringing on the far side.'], { eff: { luck: 1 } }),
      ) }],
]);

// ======================================================================
// 王族と言葉を交わす (royal)
// ======================================================================
const ROYAL = group('royal', [
  ['町の祭りで道を尋ねてきた身なりのよい若者は、あとで王太子だと分かった。別れ際、彼は{name}の名を覚えておくと言った。',
    'The well-dressed young man who asked {name} for directions at the town festival turned out to be the crown prince. As they parted, he said he would remember {his} name.',
    { tags: ['fantasy'], not: ['nobility'], stage: YOUNG, w: 0.2, kind: 'fame', eff: { charm: 2, fame: 2, happy: 2 } }],
  ['学園の夜会で、{name}は国王に呼び止められた。王は、近ごろの若い者は何を考えているのかと、まっすぐに尋ねた。',
    'At the academy ball, the King himself stopped {name} and asked, quite directly, what young people were thinking these days.',
    { tags: ['nobility'], stage: ['teen', 'adult'], w: 0.25, kind: 'fame',
      choice: choose('王にどう答える?', 'How to answer the King?',
        opt('思うままに答える', 'Speak frankly', ['王はしばらく黙り、それから声を立てて笑った。翌週、宮廷から晩餐の招きが届いた。', 'The King was silent a moment, then laughed aloud. The next week, a dinner invitation arrived from the palace.'], { eff: { fame: 5, charm: 3 } }),
        opt('無難な言葉を選ぶ', 'Choose safe words', ['王は「そうか」とだけ言って去った。周りの貴族たちは、ほっとした顔をしていた。', 'The King said only "I see" and moved on. The nobles nearby looked relieved.'], { eff: { charm: 1 } }),
      ) }],
  ['宮中に召された{name}は、玉座の下から皇帝の問いに答えた。皇帝は最後に、{name}の書いた策を手元に残すよう命じた。',
    "Summoned to the palace, {name} answered the Emperor's questions from the foot of the throne. At the end, the Emperor ordered that {his} written proposal be kept at hand.",
    { tags: ['cultivation'], w: 0.15, kind: 'fame', eff: { fame: 5, mind: 2, wealth: 3 } }],
  ['帝国の皇女が辺境の基地を視察した日、{name}は案内役を任された。皇女は格納庫の隅で足を止め、整備兵の待遇について尋ねた。',
    'When the Imperial Princess inspected the frontier base, {name} was assigned to show her around. She stopped in a corner of the hangar to ask about the mechanics\' pay.',
    { tags: ['scifi'], not: ['dark'], w: 0.2, kind: 'fame',
      choice: choose('本当のことを言うか', 'Tell her the truth?',
        opt('ありのままを話す', 'Tell it straight', ['半年後、整備兵の給料が上がった。基地司令は{name}と目を合わせなくなった。', "Six months later the mechanics got a raise. The base commander stopped meeting {name}'s eyes."], { eff: { charm: 4, fame: 2, wealth: -1 } }),
        opt('問題はないと答える', 'Say all is well', ['皇女は小さくうなずき、次の区画へ歩いていった。', 'The princess nodded slightly and walked on to the next section.'], { eff: { wealth: 1 } }),
      ) }],
  ['万国博覧会で、{name}の展示の前に女王が足を止めた。女王は手袋を外し、自分で歯車を回してみせた。',
    "At the Great Exhibition, the Queen stopped before {name}'s display. She took off her glove and turned the gears herself.",
    { tags: ['industrial'], w: 0.2, kind: 'fame', eff: { fame: 5, wealth: 3, happy: 3 } }],
]);

// ======================================================================
// 伝説の師に会う (master)
// ======================================================================
const MASTER = group('master', [
  ['酒場の隅で飲んでいた老人が、{name}の剣の握りを黙って直した。あとで、その人がかつての剣聖だったと聞いた。',
    "An old man drinking in a corner of the tavern silently corrected {name}'s grip on {his} sword. Later {he} learned it had been the Sword Saint of a former age.",
    { tags: ['fantasy'], stage: YOUNG, w: 0.15, kind: 'power',
      choice: choose('老人に弟子入りを願うか', 'Ask the old man to teach you?',
        opt('頭を下げて頼む', 'Bow and ask', ['老人は断ったが、翌朝から三日だけ、裏庭で木剣を振るのを見てくれた。', 'He refused, but for three mornings after, he watched {name} swing a wooden sword in the back yard.'], { eff: { power: 5, level: 2 } }),
        opt('礼だけ言う', 'Just thank him', ['老人は杯を上げて応えた。直された握りは、それから一生{name}の手に残った。', "The old man raised his cup in reply. The corrected grip stayed in {name}'s hands for the rest of {his} life."], { eff: { power: 2 } }),
      ) }],
  ['破門された者しか訪ねてこないという山の庵で、{name}は伝説の魔導師に会った。魔導師は一つだけ術を教え、二度と来るなと言った。',
    'At a mountain hermitage said to receive only the excommunicated, {name} met a legendary archmage, who taught {him} a single spell and told {him} never to come back.',
    { tags: ['fantasy'], magic: 2, flag: 'guild', w: 0.2, kind: 'power', eff: { mind: 5, level: 2 } }],
  ['雪の峰の洞府で、{name}は三百年閉関していたという師に迎えられた。師は{name}の経脈に指を当て、詰まりを一つ取り除いた。',
    "In a cave abode on a snowy peak, {name} was received by a master said to have been in seclusion for three hundred years. The master touched {his} meridians and cleared a blockage.",
    { tags: ['cultivation'], stage: YOUNG, w: 0.15, kind: 'power',
      choice: choose('師の門下に入るか', "Join the master's lineage?",
        opt('門下に入る', 'Become a disciple', ['{name}は三年、洞府で水を汲み薪を割った。山を下りたとき、境地が一段上がっていた。', '{name} spent three years drawing water and splitting wood at the abode. Coming down the mountain, {he} had risen a full realm.'], { eff: { mind: 5, power: 3, level: 3, wealth: -3 } }),
        opt('礼を述べて山を下りる', 'Give thanks and descend', ['師は引き止めなかった。取り除かれた詰まりは、その後も戻らなかった。', 'The master did not stop {him}. The cleared blockage never returned.'], { eff: { mind: 2 } }),
      ) }],
  ['路地裏の時計屋の主人は、かつて王立工廠の機関をすべて設計したという技師だった。主人は{name}に、ねじを一本ずつ締め直させた。',
    'The keeper of a back-alley clock shop turned out to be the engineer who had once designed every engine in the Royal Arsenal. He made {name} retighten the screws one by one.',
    { tags: ['industrial'], stage: YOUNG, w: 0.2, kind: 'work', eff: { mind: 4 } }],
  ['ネットの奥で、{name}は伝説のハッカーと名乗る相手に回線を乗っ取られた。相手は{name}のコードの穴を三つ指摘して、消えた。',
    "Deep in the net, {name}'s connection was hijacked by someone claiming to be a legendary hacker. They pointed out three holes in {his} code and vanished.",
    { tags: ['scifi'], stage: YOUNG, w: 0.2, kind: 'work', eff: { mind: 4, luck: 1 } }],
]);

// ======================================================================
// 珍しい種の従魔を得る (rare_familiar)
// ======================================================================
const FAMILIAR = group('rare_familiar', [
  ['市場で売れ残っていた卵が孵ると、出てきた雛はどの図鑑にも載っていない種だった。{name}はその子を{familiar}と名付けた。',
    "The egg left unsold at the market hatched into a chick that appeared in no bestiary. {name} named it {familiar}.",
    { tags: ['fantasy'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'child', eff: { happy: 4, luck: 2 }, tie: { role: 'familiar', new: true } }],
  ['罠にかかっていた銀色の毛並みの子狼は、伝承にしか残っていない種だった。{name}が手当てすると、子狼は{familiar}という名を受け入れた。',
    "The silver-furred wolf cub caught in the trap belonged to a breed known only from legend. Once {name} had treated its wounds, it accepted the name {familiar}.",
    { tags: ['fantasy'], jobs: ['tamer', 'hunter', 'adventurer'], w: 0.3, kind: 'power', eff: { power: 2, fame: 3 }, tie: { role: 'familiar', new: true } }],
  ['雪の朝、縁の下に尾が三本ある子狐がうずくまっていた。{name}が粥を分けると、子狐は{familiar}と呼ばれるたびに振り向くようになった。',
    'One snowy morning, a fox kit with three tails was huddled under the veranda. {name} shared {his} porridge, and the kit came to turn its head whenever {he} called it {familiar}.',
    { tags: ['japan'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'child', eff: { happy: 4, luck: 3 }, tie: { role: 'familiar', new: true } }],
  ['霧の谷で、{name}は鱗と角を持つ小さな霊獣と目が合った。霊獣は{name}のあとをついてきて、{familiar}という名をもらった。',
    "In a misty valley, {name} met the eyes of a small spirit beast with scales and a horn. It followed {him} home and was given the name {familiar}.",
    { tags: ['cultivation'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'power', eff: { mind: 2, luck: 3 }, tie: { role: 'familiar', new: true } }],
  ['廃墟の屋根で、人の言葉を三つだけ話す白いカラスが{name}を待っていた。カラスは自分から{familiar}と名乗った。',
    'On a ruined rooftop, a white crow that knew exactly three human words was waiting for {name}. It named itself {familiar}.',
    { tags: ['ruin'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'adventure', eff: { luck: 3, happy: 2 }, tie: { role: 'familiar', new: true } }],
]);

// ======================================================================
// 魔王と対面する (demon_lord)
// ======================================================================
const DEMON_LORD = group('demon_lord', [
  ['捕らえられた{name}は、魔王の前に引き出された。魔王は玉座から降りてきて、{name}に配下にならないかと尋ねた。',
    'Captured, {name} was dragged before the Demon Lord, who stepped down from the throne and asked whether {he} would serve.',
    { tags: ['fantasy'], magic: 2, w: 0.1, kind: 'hard', foe: 'demon', big: true,
      choice: choose('魔王に仕えるか', 'Serve the Demon Lord?',
        opt('断る', 'Refuse', ['魔王は肩をすくめ、{name}を国境の外へ放り出させた。生かされた理由は、最後まで分からなかった。', 'The Demon Lord shrugged and had {name} thrown out past the border. {He} never learned why {he} had been spared.'], { eff: { fame: 3, hp: -3 }, risk: { hazard: 'war', p: 0.06 } }),
        opt('仕えるふりをする', 'Pretend to serve', ['{name}は半年を魔王城で過ごし、ある新月の夜に抜け出した。持ち出した地図は、王国軍の役に立った。', "{name} spent half a year in the Demon Lord's castle and slipped away on a moonless night. The maps {he} carried out proved useful to the royal army."], { eff: { fame: 5, mind: 3 }, risk: { hazard: 'execution', p: 0.04 } }),
        opt('本当に仕える', 'Truly serve', ['{name}は魔王軍の名簿に名を書いた。故郷では、もう{name}の名を口にする者はいなかった。', "{name} signed the Demon Lord's muster roll. Back home, no one spoke {his} name anymore."], { eff: { power: 4, wealth: 5, charm: -5 }, set: 'demonServant' }),
      ) }],
  ['魔王城の最上階で、勇者となった{name}は魔王と向かい合った。魔王は剣を抜く前に、なぜ戦うのかと静かに問うた。',
    "At the top of the Demon Lord's castle, {name}, now the Hero, faced the Demon Lord, who quietly asked why {he} fought before drawing a blade.",
    { tags: ['fantasy'], magic: 2, flag: 'hero', w: 0.3, kind: 'battle', foe: 'demon', big: true, eff: { fame: 6, level: 3 }, risk: { hazard: 'war', p: 0.08 } }],
  ['夜の森で焚き火を分けた黒い外套の旅人は、自分が魔王だと名乗った。そして、前世では同じ国の会社員だったと言った。',
    'The traveler in a black cloak who shared {name}\'s campfire in the night forest introduced himself as the Demon Lord, and said that in a past life he had been an office worker from the same country.',
    { tags: ['fantasy'], magic: 2, memory: true, w: 0.15, foe: 'demon',
      choice: choose('魔王とどう別れる?', 'How to part with the Demon Lord?',
        opt('前世の話を夜通しする', 'Talk about the old world all night', ['二人は好きだった食べ物の話で夜を明かした。魔王は別れ際、「次は敵だな」と寂しそうに笑った。', 'They talked through the night about foods they missed. As they parted, the Demon Lord gave a lonely smile: "Next time, we\'re enemies."'], { eff: { happy: 4, mind: 2 } }),
        opt('寝込みを襲う', 'Strike while he sleeps', ['刃が届く前に、魔王は目を開けていた。{name}は命からがら森を抜けた。', "The Demon Lord's eyes were open before the blade reached him. {name} barely made it out of the forest alive."], { eff: { hp: -5, fame: 2 }, risk: { hazard: 'monster', p: 0.08 } }),
      ) }],
  ['鬼の王の酒宴に、{name}は人間ただ一人の客として招かれた。王は大盃をなみなみと満たし、{name}に差し出した。',
    'At the feast of the King of the Oni, {name} was the only human guest. The king filled a great cup to the brim and held it out.',
    { tags: ['japan'], magic: 2, stage: YOUNG, w: 0.12, foe: 'demon',
      choice: choose('盃を受けるか', 'Accept the cup?',
        opt('飲み干す', 'Drain it', ['鬼たちがどよめいた。王は{name}を気に入り、帰り道に鬼が出ないよう札を一枚くれた。', 'The oni roared their approval. The king took a liking to {name} and gave {him} a talisman to keep the oni off the road home.'], { eff: { fame: 4, luck: 3, hp: -2 }, risk: { hazard: 'monster', p: 0.03 } }),
        opt('丁重に断る', 'Politely decline', ['王は不機嫌になったが、約束どおり客を無事に帰した。', 'The king was put out, but kept his word and let the guest go home unharmed.'], { eff: { mind: 1 }, risk: { hazard: 'monster', p: 0.02 } }),
      ) }],
  ['宗門の山門が破られた日、{name}は崩れた石段の上で魔尊の姿を見た。魔尊は{name}を一瞥し、「まだ熟していない」と言って去った。',
    'On the day the sect gates fell, {name} saw the Demon Sovereign atop the broken stone stairs. He glanced at {name}, said "Not yet ripe," and left.',
    { tags: ['cultivation'], magic: 2, stage: YOUNG, w: 0.12, kind: 'battle', foe: 'demon', eff: { mind: 2, hp: -3 }, risk: { hazard: 'war', p: 0.05 } }],
]);

// ======================================================================
// 精霊王 (spirit_king)
// ======================================================================
const SPIRIT_KING = group('spirit_king', [
  ['森の奥の泉で、水面に冠をいただいた人影が立ち上がった。精霊王は{name}に、森を荒らす者の名を告げた。',
    'At a spring deep in the forest, a crowned figure rose from the water. The Spirit King told {name} the name of the one despoiling the woods.',
    { tags: ['fantasy'], not: ['desert', 'sea'], magic: 2, stage: YOUNG, w: 0.15,
      choice: choose('精霊王の頼みを引き受けるか', "Take up the Spirit King's request?",
        opt('引き受ける', 'Accept', ['{name}は伐採の一団を森から追い出した。それから、森の中で迷うことは二度となかった。', '{name} drove the logging crew out of the forest, and never got lost in those woods again.'], { eff: { fame: 3, luck: 4 }, risk: { hazard: 'violence', p: 0.03 } }),
        opt('関わらない', 'Stay out of it', ['泉はただの泉に戻った。翌年、森は半分になっていた。', 'The spring became an ordinary spring again. A year later, half the forest was gone.'], { eff: { happy: -2 } }),
      ) }],
  ['五行の気が一点に集まり、精霊の王が{name}の前に姿を現した。王は{name}の霊根を見定め、ひとつの属性に祝福を与えた。',
    'The five elements gathered at a single point, and the King of Spirits appeared before {name}. He weighed {his} spirit root and blessed one of its elements.',
    { tags: ['cultivation'], stage: YOUNG, w: 0.15, kind: 'power', eff: { mind: 4, level: 2 } }],
  ['砂嵐の目の中で、{name}は砂の精霊の王に出会った。王は水の在りかを一つ教える代わりに、{name}の歌を一曲所望した。',
    "In the eye of a sandstorm, {name} met the King of the Sand Spirits, who offered to reveal a hidden spring in exchange for one of {his} songs.",
    { tags: ['desert'], stage: YOUNG, w: 0.2, eff: { luck: 3, charm: 2, wealth: 2 } }],
  ['凪の夜、船べりから見下ろす海が光り、潮の精霊王が顔を出した。王は{name}に、三日後の嵐を避ける航路を教えた。',
    "On a windless night, the sea below the gunwale lit up and the Spirit King of the Tides surfaced. He told {name} a course that would avoid the storm three days off.",
    { tags: ['sea'], stage: YOUNG, w: 0.2, eff: { luck: 4, mind: 1 } }],
]);

// ======================================================================
// 不死鳥 (phoenix)
// ======================================================================
const PHOENIX = group('phoenix', [
  ['火山の頂で、{name}は燃え尽きた不死鳥が灰の中から生まれ直すところを見た。雛は一声鳴き、{name}の肩に羽根を一枚落とした。',
    "On a volcano's peak, {name} watched a burnt-out phoenix rise again from its ashes. The chick gave one cry and dropped a feather on {his} shoulder.",
    { tags: ['fantasy'], magic: 2, stage: YOUNG, w: 0.12, eff: { hp: 4, luck: 3 } }],
  ['瀕死の{name}の上を、炎の鳥が横切った。落ちてきた火の粉が傷口に触れると、血が止まった。',
    'As {name} lay dying, a bird of flame passed overhead. Where its falling sparks touched the wounds, the bleeding stopped.',
    { tags: ['fantasy', 'myth'], magic: 2, flag: 'guild', w: 0.1, kind: 'ill', eff: { hp: 8, happy: 2 } }],
  ['梧桐の林に鳳凰が降りた朝、{name}はその場に居合わせた。鳳凰は五色の声で鳴き、{name}の行く末について一句を残した。',
    'On the morning a fenghuang alighted in the parasol-tree grove, {name} was there. It sang in five colors and left behind a single line of verse about {his} fate.',
    { tags: ['cultivation'], stage: YOUNG, w: 0.12, kind: 'power', eff: { mind: 3, luck: 4, fame: 2 } }],
  ['砂丘の向こうに日が二つ昇ったと思ったら、片方は巨大な炎の鳥だった。鳥は{name}の隊商の上を三度回り、東へ去った。',
    'It seemed two suns were rising beyond the dunes, until one turned out to be an enormous bird of flame. It circled over {name}\'s caravan three times and flew off east.',
    { tags: ['desert'], stage: YOUNG, w: 0.2,
      choice: choose('鳥を追うか', 'Follow the bird?',
        opt('東へ追う', 'Follow it east', ['三日追った先に、誰も知らないオアシスがあった。', 'After three days on its trail, {name} found an oasis no one knew of.'], { eff: { wealth: 6, fame: 3, hp: -2 }, risk: { hazard: 'accident', p: 0.03 } }),
        opt('隊商と道を行く', 'Keep to the caravan route', ['{name}は鳥の消えた方角に一礼して、いつもの道を進んだ。', '{name} bowed toward where the bird had vanished and carried on down the usual road.'], { eff: { luck: 2 } }),
      ) }],
]);

// ======================================================================
// 大賢者 (sage)
// ======================================================================
const SAGE = group('sage', [
  ['霧に浮かぶ塔の最上階で、{name}は大賢者と向かい合った。大賢者は、問いを一つだけ許すと言った。',
    'At the top of a tower floating in the mist, {name} sat across from the Great Sage, who said {he} could ask one question and only one.',
    { tags: ['fantasy'], magic: 2, w: 0.15, kind: 'power',
      choice: choose('何を問う?', 'What to ask?',
        opt('この世界の成り立ちを問う', 'How the world began', ['答えは三日かかった。{name}は半分も分からなかったが、残り半分で一生考えることができた。', 'The answer took three days. {name} understood less than half, but the rest gave {him} a lifetime to think about.'], { eff: { mind: 6 } }),
        opt('自分の寿命を問う', 'How long you will live', ['大賢者は笑い、「それを知って生きるのはつまらないぞ」と言って答えなかった。', 'The Great Sage laughed. "Knowing that would make living dull," he said, and gave no answer.'], { eff: { happy: 2, luck: 2 } }),
        opt('富を得る方法を問う', 'How to grow rich', ['大賢者は、ある鉱山の名を一つだけ口にした。', 'The Great Sage named a single mine, and nothing more.'], { eff: { wealth: 7, charm: -1 } }),
      ) }],
  ['学園に一日だけ招かれた大賢者の講義で、{name}は手を挙げて質問した。大賢者は答える代わりに、{name}を自分の席に座らせた。',
    "At the Great Sage's one-day lecture at the academy, {name} raised a hand to ask a question. Instead of answering, the Great Sage had {name} sit in his own chair.",
    { tags: ['nobility'], stage: ['teen', 'adult'], w: 0.25, kind: 'school', eff: { mind: 4, fame: 3 } }],
  ['旅の老人は{name}をひと目見て、〈{cheat}〉の名を言い当てた。老人は自分を大賢者と呼ぶ者もいると言い、その力の限りを一つ教えた。',
    'One look at {name} was enough for the old traveler to name "{cheat}". Some called him the Great Sage, he said, and he told {name} one limit of that power.',
    { tags: ['fantasy'], cheat: true, stage: YOUNG, w: 0.25, kind: 'power', eff: { mind: 4, level: 1 } }],
  ['魔導院の地下書庫で、{name}は百年前に失踪したはずの大賢者と出くわした。大賢者は蒸気の時代をつまらなそうに眺め、{name}に古い式を一つ書いてみせた。',
    "In the Arcane Institute's underground stacks, {name} ran into the Great Sage who had supposedly vanished a century ago. He eyed the age of steam with mild boredom and wrote out an old formula for {name}.",
    { tags: ['industrial'], w: 0.2, kind: 'work', eff: { mind: 5 } }],
]);

// ======================================================================
// 聖女に会う (saintess)
// ======================================================================
const SAINTESS = group('saintess', [
  ['疫病の村に聖女が来た日、{name}も列に並んだ。聖女は{name}の手を取り、疲れた顔で「大丈夫」と言った。',
    'The day the Saintess came to the plague-stricken village, {name} stood in line too. She took {his} hand and said, with a tired face, "You\'ll be fine."',
    { tags: ['fantasy'], not: ['dark'], stage: ['child', 'teen', 'adult', 'middle', 'elder'], w: 0.2, kind: 'ill', eff: { hp: 5, happy: 3 } }],
  ['異端として火刑台に送られる聖女を、{name}は群衆の中から見ていた。聖女は最後に、群衆のために祈っていた。',
    'From the crowd, {name} watched a Saintess being led to the pyre as a heretic. To the very end, she was praying for the crowd.',
    { tags: ['dark'], not: ['scifi', 'ruin'], w: 0.2, kind: 'hard',
      choice: choose('どうする?', 'What now?',
        opt('縄を切りに走る', 'Run to cut her bonds', ['騒ぎの中で聖女は姿を消した。{name}の顔は、翌日には手配書に載っていた。', "In the chaos, the Saintess disappeared. By the next day, {name}'s face was on a wanted poster."], { eff: { fame: 4, charm: 3 }, risk: { hazard: 'execution', p: 0.08 } }),
        opt('目を逸らさず見届ける', 'Watch to the end', ['{name}は最後まで見届けた。その夜から、{name}は神殿に行かなくなった。', 'From that night on, {name} never set foot in a temple again.'], { eff: { happy: -4, mind: 2 } }),
      ) }],
  ['学園に、平民出の聖女が編入してきた。{name}は、彼女が食堂の隅でひとりでパンをかじっているのを見つけた。',
    'A commoner-born Saintess transferred into the academy. {name} found her eating bread alone in a corner of the dining hall.',
    { tags: ['nobility'], stage: ['teen', 'adult'], w: 0.3, kind: 'school',
      choice: choose('声をかけるか', 'Speak to her?',
        opt('隣に座る', 'Sit beside her', ['聖女は驚いた顔をして、それから笑った。卒業まで、食堂の隅はふたりの席になった。', 'The Saintess looked startled, then smiled. Until graduation, that corner of the dining hall was their table.'], { eff: { happy: 4, charm: 3, fame: 1 } }),
        opt('遠くから見ている', 'Watch from afar', ['半年後、聖女の周りには取り巻きが群がっていた。{name}が近づく隙はもうなかった。', 'Six months later, the Saintess was surrounded by admirers, with no room left for {name}.'], { eff: { mind: 1 } }),
      ) }],
  ['聖女の巡礼を護る依頼で、{name}は三月を旅した。聖女は夜ごと、野営の焚き火のそばで{name}に故郷の話をせがんだ。',
    'Escorting the Saintess on pilgrimage, {name} traveled for three months. Every night by the campfire, she begged {him} for stories of home.',
    { tags: ['fantasy'], flag: 'guild', w: 0.25, kind: 'adventure', foe: 'bandit', eff: { fame: 4, wealth: 4, happy: 2 }, risk: { hazard: 'violence', p: 0.03 } }],
]);

// ======================================================================
// 勇者に会う (hero)
// ======================================================================
const HERO = group('hero', [
  ['村はずれで畑を耕していた老人は、先代の勇者だった。老人は鍬にもたれて、魔王より手強いのは天気だと言った。',
    'The old man tilling a field at the edge of the village was the Hero of a former age. Leaning on his hoe, he said the weather was tougher than any Demon Lord.',
    { tags: ['fantasy'], stage: YOUNG, w: 0.2, eff: { happy: 3, mind: 1 } }],
  ['勇者の一行が、欠けた荷運び役の代わりを探していた。ギルドの受付は、{name}を推した。',
    "The Hero's party was looking for a replacement porter, and the guild desk recommended {name}.",
    { tags: ['fantasy'], flag: 'guild', w: 0.25, foe: 'monster',
      choice: choose('勇者の一行に加わるか', "Join the Hero's party?",
        opt('加わる', 'Join', ['{name}は一つの迷宮を勇者たちと抜けた。勇者は別れ際、{name}の名を一行の記録に書き入れた。', "{name} cleared one labyrinth alongside them. As they parted, the Hero wrote {name}'s name into the party's record."], { eff: { fame: 6, level: 3, wealth: 3 }, risk: { hazard: 'monster', p: 0.05 } }),
        opt('断る', 'Decline', ['一行は翌朝発った。三月後、勇者の一行が一人欠けて戻ったと噂に聞いた。', "The party left the next morning. Three months later, word came back that they had returned one member short."], { eff: { luck: 1 } }),
      ) }],
  ['召喚されたばかりの勇者は、前世の{name}と同じ国の高校の制服を着ていた。勇者は、{name}が口にした駅の名前を聞いて泣き出した。',
    "The newly summoned Hero wore the uniform of a high school from {name}'s old country. Hearing {name} mention the name of a train station from home, the Hero burst into tears.",
    { tags: ['fantasy'], magic: 2, memory: true, w: 0.2, eff: { happy: 3, charm: 2 } }],
  ['鬼の王を討ったという英雄が、{name}の町に湯治に来た。英雄は湯けむりの中で、討った鬼の名を一つずつ数えていた。',
    "The Hero said to have slain the King of the Oni came to {name}'s town for the hot springs. Through the steam, {he} heard the Hero counting off the names of slain oni, one by one.",
    { tags: ['japan'], stage: YOUNG, w: 0.2, eff: { mind: 2, happy: 1 } }],
  ['国内に三人しかいないS級探索者の一人、「勇者」と呼ばれる若者が、{name}のパーティの救難信号に応えて現れた。',
    "One of only three S-Rank Explorers in the country, a young woman the press called the Hero, answered {name}'s party's distress signal.",
    { tags: ['modern'], w: 0.2, kind: 'battle', foe: 'monster', eff: { fame: 3, hp: -2 }, risk: { hazard: 'monster', p: 0.03 } }],
]);

// ======================================================================
// 古代の AI (ancient_ai)
// ======================================================================
const ANCIENT_AI = group('ancient_ai', [
  ['廃棄区画の奥のサーバ室で、{name}は五百年前の管理AIを起こしてしまった。AIは最初に、今は何年かと尋ねた。',
    'In a server room at the back of a decommissioned sector, {name} accidentally woke a management AI five hundred years old. Its first question was what year it was.',
    { tags: ['scifi'], stage: YOUNG, w: 0.15, foe: 'machine',
      choice: choose('AIをどうする?', 'What to do with the AI?',
        opt('話し相手になる', 'Keep it company', ['AIは、もう誰も覚えていない都市の話をした。{name}は毎晩通うようになった。', 'The AI told {him} of cities no one remembered anymore. {name} started visiting every night.'], { eff: { mind: 5, happy: 2 } }),
        opt('当局に通報する', 'Report it', ['当局は区画ごとサーバを焼いた。{name}には報奨金と、少しの後味の悪さが残った。', 'The authorities burned the servers along with the sector. {name} was left with a reward and a bad aftertaste.'], { eff: { wealth: 5, happy: -2 } }),
        opt('力を借りる', 'Put it to work', ['AIの計算で{name}は一財産を作った。ある朝、AIは何も言わずに自分を消していた。', "The AI's calculations made {name} a small fortune. One morning, it had erased itself without a word."], { eff: { wealth: 8, mind: 1 }, risk: { hazard: 'accident', p: 0.02 } }),
      ) }],
  ['旧文明の地下施設で、天井のスピーカーが{name}に「お帰りなさい、職員の方」と呼びかけた。施設の管理AIは、まだ誰かを待っていた。',
    'In a pre-collapse underground facility, a ceiling speaker greeted {name}: "Welcome back, staff member." The facility\'s AI was still waiting for someone.',
    { tags: ['ruin'], stage: YOUNG, w: 0.2, foe: 'machine',
      choice: choose('職員のふりをするか', 'Play along as staff?',
        opt('職員のふりをする', 'Play along', ['AIは倉庫を開けた。缶詰と浄水器で、集落はひと冬を越せた。', 'The AI opened the storeroom. The canned food and water purifiers carried the settlement through a winter.'], { eff: { wealth: 6, fame: 3 }, risk: { hazard: 'accident', p: 0.04 } }),
        opt('正直に名乗る', 'Tell the truth', ['AIはしばらく黙り、それから、外の世界の様子を教えてほしいと言った。', 'The AI was silent for a while, then asked {name} to tell it what the world outside was like.'], { eff: { mind: 3, happy: 2 } }),
      ) }],
  ['古代遺跡の奥で、{name}は歯車と真鍮の巨大な頭脳を見つけた。頭脳は、自分を造った文明が三千年前に滅んだことをまだ知らなかった。',
    'Deep in ancient ruins, {name} found a vast brain of gears and brass. It did not yet know that the civilization that built it had fallen three thousand years ago.',
    { tags: ['industrial'], w: 0.2, eff: { mind: 4, fame: 2 } }],
  ['迷宮の最下層にあったのは魔物ではなく、光る石板だった。石板は古代の言葉で、自分はこの迷宮の管理者だと名乗った。',
    'What waited on the lowest floor of the labyrinth was not a monster but a glowing slab. In an ancient tongue, it introduced itself as the labyrinth\'s administrator.',
    { tags: ['fantasy'], flag: 'guild', w: 0.15, foe: 'machine', eff: { mind: 4, fame: 3, level: 1 }, risk: { hazard: 'accident', p: 0.02 } }],
]);

// ======================================================================
// 異星の使者 (alien_envoy)
// ======================================================================
const ALIEN = group('alien_envoy', [
  ['未知の文明の使者が中継ステーションに降り立ち、通訳の手が足りなかった。使者は、{name}の話し方をなぜか気に入った。',
    "An envoy from an unknown civilization docked at the relay station, and translators were short-handed. For some reason, the envoy liked the way {name} talked.",
    { tags: ['scifi'], not: ['dark'], w: 0.2, kind: 'fame',
      choice: choose('使者の案内役を引き受けるか', 'Act as guide to the envoy?',
        opt('引き受ける', 'Accept', ['{name}は四十日を使者と過ごした。最後の日、使者は自分の星の歌を一つ教えた。', "{name} spent forty days with the envoy. On the last day, the envoy taught {him} a song from its home world."], { eff: { fame: 6, charm: 3, mind: 2 } }),
        opt('上官に譲る', 'Pass it to a superior', ['交渉は三日で決裂した。{name}は報道でそれを知った。', 'The talks broke down in three days. {name} heard about it on the news.'], { eff: { happy: -1 } }),
      ) }],
  ['ネオンの路地裏で、{name}は人間のふりをした異星の使者に道を尋ねられた。使者は、この星で一番うまい屋台を探していた。',
    "In a neon-lit back alley, an alien envoy disguised as a human asked {name} for directions. It was looking for the best street stall on the planet.",
    { tags: ['scifi'], stage: YOUNG, w: 0.2, eff: { happy: 3, luck: 2 } }],
  ['ある晩、荒野に光が降り、{name}の前に背の高い影が立った。影は旧文明の言葉で、この星に何があったのかを尋ねた。',
    'One night light fell on the wasteland, and a tall figure stood before {name}. In the old world\'s language, it asked what had happened to this planet.',
    { tags: ['ruin'], stage: YOUNG, w: 0.15,
      choice: choose('影にどう答える?', 'How to answer the figure?',
        opt('知っていることを全部話す', 'Tell it everything you know', ['影は長いこと黙って聞き、去り際に小さな種を一つ置いていった。種は汚れた土でも芽を出した。', 'The figure listened in long silence, and on leaving, left behind a small seed. It sprouted even in poisoned soil.'], { eff: { mind: 3, wealth: 3, happy: 2 } }),
        opt('銃を向ける', 'Raise a gun', ['影は傷ついた顔もせず、光の中へ戻っていった。', 'The figure showed no sign of hurt, and returned into the light.'], { eff: { luck: -2 } }),
      ) }],
  ['ダンジョンの奥で出会った銀の肌の人物は、自分は魔物ではなく、別の星からダンジョンを通ってきた使者だと言った。',
    'The silver-skinned person {name} met deep in a dungeon said they were no monster, but an envoy from another star who had come through the dungeons.',
    { tags: ['modern'], w: 0.15, eff: { mind: 3, fame: 2 } }],
]);

// ======================================================================
// 妖怪の総大将 (yokai_lord)
// ======================================================================
const YOKAI_LORD = group('yokai_lord', [
  ['夜道で百鬼夜行に出くわした{name}の前で、列の先頭の老人が足を止めた。妖怪の総大将は、{name}に道を譲れと言った。',
    'On a night road, {name} ran into the Night Parade of a Hundred Demons. The old man at its head stopped. The Lord of the Yokai told {name} to give way.',
    { tags: ['japan'], stage: YOUNG, w: 0.15, foe: 'monster',
      choice: choose('どうする?', 'What now?',
        opt('道端に退いて頭を下げる', 'Step aside and bow', ['総大将は通り過ぎざま、「礼儀を知っておる」と言った。以来、{name}の家に妖怪は寄りつかなかった。', 'In passing, the Lord of the Yokai remarked, "This one has manners." After that, no yokai ever bothered {name}\'s house.'], { eff: { luck: 4 } }),
        opt('道を譲らない', 'Stand your ground', ['総大将は面白がり、{name}をひと晩、行列の最後尾に加えた。明け方、{name}は見知らぬ山の中にいた。', 'Amused, the Lord of the Yokai let {name} march at the tail of the parade for one night. At dawn {he} woke on an unknown mountain.'], { eff: { fame: 3, hp: -3 }, risk: { hazard: 'monster', p: 0.04 } }),
      ) }],
  ['縁側で碁を打っていると、見知らぬ老人が向かいに座った。三局目に負けたとき、老人は自分が妖怪の総大将だと明かした。',
    'While {name} played go on the veranda, a stranger sat down across the board. Losing the third game, the old man revealed he was the Lord of the Yokai.',
    { tags: ['japan'], stage: ['adult', 'middle', 'elder'], w: 0.15, eff: { mind: 3, happy: 3 } }],
  ['迷子になった夜、{name}は頭の長い老人に手を引かれて家まで送られた。老人は戸口で、自分を見たことは誰にも言うなと笑った。',
    'The night {name} got lost, an old man with an oddly long head led {him} home by the hand. At the door, he laughed and said not to tell anyone {he} had seen him.',
    { tags: ['japan'], stage: ['child'], w: 0.2, kind: 'child', eff: { happy: 3, luck: 2 } }],
  ['陰陽寮の命で、{name}は妖怪の総大将との和議に臨んだ。総大将は、人が山を削るのをやめるなら、と条件を一つだけ出した。',
    "By order of the Bureau of Onmyō, {name} met the Lord of the Yokai to negotiate a truce. The Lord set a single condition: that humans stop cutting into the mountains.",
    { tags: ['japan'], jobs: ['onmyoji', 'samurai'], w: 0.3, kind: 'fame', foe: 'monster', eff: { fame: 6, mind: 2 }, risk: { hazard: 'monster', p: 0.03 } }],
]);

// ======================================================================
// 仙人 (immortal)
// ======================================================================
const IMMORTAL = group('immortal', [
  ['桃の木の下で昼寝をしていた老人に水を分けると、老人は雲に乗って去っていった。手元には、桃の種が一つ残っていた。',
    '{name} shared {his} water with an old man napping under a peach tree. The old man rode off on a cloud, leaving a single peach pit in {his} hand.',
    { tags: ['cultivation'], stage: YOUNG, w: 0.15, eff: { hp: 3, luck: 4 } }],
  ['山頂で出会った仙人は、{name}に一粒の丹薬を差し出した。飲めば寿命が延びるか、さもなくば死ぬと言った。',
    'The immortal {name} met on the summit offered {him} a single elixir pill. It would lengthen {his} life, he said, or else end it.',
    { tags: ['cultivation'], stage: ['adult', 'middle', 'elder'], w: 0.15, kind: 'power',
      choice: choose('丹薬を飲むか', 'Swallow the pill?',
        opt('飲む', 'Swallow it', ['三日三晩熱にうなされたあと、{name}の白髪は黒く戻っていた。', 'After three days and nights of fever, {name}\'s white hair had turned black again.'], { eff: { hp: 10, mind: 3 }, risk: { hazard: 'magic', p: 0.08 } }),
        opt('返す', 'Give it back', ['仙人は丹薬を自分で飲み、「欲のない者は長生きするものだ」と言った。', 'The immortal swallowed the pill himself. "The ones without greed tend to live long anyway," he said.'], { eff: { mind: 2, happy: 2 } }),
      ) }],
  ['宗門の試練の途中、{name}は霧の中で碁を打つ二人の仙人に行き会った。一局を見届けて山を下りると、十年が過ぎていた。',
    'Partway through a sect trial, {name} came upon two immortals playing go in the mist. {He} watched one game and came down the mountain to find ten years had passed.',
    { tags: ['cultivation'], stage: ['teen', 'adult'], w: 0.1, kind: 'hard', eff: { mind: 5, happy: -3 } }],
  ['山奥の滝で、霞を食べて生きているという仙人に会った。仙人は{name}に、息の吐き方だけを教えた。',
    'At a waterfall deep in the mountains, {name} met a hermit sage said to live on nothing but mist. He taught {him} only how to breathe out.',
    { tags: ['japan'], stage: YOUNG, w: 0.15, eff: { hp: 4, mind: 2 } }],
]);

// ======================================================================
// 吸血鬼の真祖 (vampire_lord)
// ======================================================================
const VAMPIRE = group('vampire_lord', [
  ['嵐の夜に迷い込んだ古城で、{name}は晩餐に招かれた。城の主は自分の杯に口をつけず、{name}が食べるのを楽しそうに眺めていた。',
    'Lost in a storm, {name} wandered into an old castle and was invited to dinner. The lord of the castle never touched his own cup, but watched {name} eat with evident delight.',
    { tags: ['fantasy'], not: ['sea', 'desert'], w: 0.15, foe: 'undead',
      choice: choose('城に泊まるか', 'Stay the night?',
        opt('泊まる', 'Stay', ['朝、首筋に小さな傷が二つあった。城の主は、千年に一度の味だったと書き置きを残していた。', 'In the morning there were two small marks on {his} neck. The castle lord had left a note: a vintage worth a thousand years.'], { eff: { hp: -4, luck: 3 }, risk: { hazard: 'monster', p: 0.05 } }),
        opt('雨の中を発つ', 'Leave into the rain', ['城の主は門まで見送り、「賢明だ」と言った。振り返ると、城はもうなかった。', 'The lord saw {him} to the gate. "Wise," he said. When {name} looked back, the castle was gone.'], { eff: { mind: 2 } }),
      ) }],
  ['真祖の吸血鬼を狩る依頼で、{name}は地下墓所の最奥に辿り着いた。真祖は棺の上に腰かけ、まずは話をしようと言った。',
    'Hunting a progenitor vampire, {name} reached the deepest chamber of the catacombs. The progenitor sat on a coffin and suggested they talk first.',
    { tags: ['fantasy'], flag: 'guild', w: 0.2, kind: 'battle', foe: 'undead', eff: { fame: 5, level: 2 }, risk: { hazard: 'monster', p: 0.07 } }],
  ['ガス灯の夜会で、{name}に話しかけてきた伯爵は、二百年前の戦争を昨日のことのように語った。窓ガラスに、伯爵の姿は映っていなかった。',
    'At a gaslit soirée, the count who struck up a conversation with {name} described a war two hundred years past as if it were yesterday. He cast no reflection in the windowpane.',
    { tags: ['industrial'], w: 0.2, foe: 'undead', eff: { mind: 2, fame: 1 }, risk: { hazard: 'monster', p: 0.02 } }],
  ['深夜のコンビニで、{name}はトマトジュースを箱買いする青白い客と目が合った。客は、自分が最後の真祖だと小声で打ち明けた。',
    'At a late-night convenience store, {name} locked eyes with a pale customer buying tomato juice by the case. In a low voice, he confided that he was the last progenitor vampire.',
    { tags: ['modern'], stage: YOUNG, w: 0.15, eff: { happy: 2, luck: 2 } }],
]);

// ======================================================================
// 不死の王 (lich)
// ======================================================================
const LICH = group('lich', [
  ['禁じられた墓所の奥で、玉座に座る骸骨が{name}に声をかけた。不死の王は、千年ぶりの客をもてなすと言った。',
    'Deep in a forbidden tomb, a skeleton on a throne addressed {name}. The Undying King said he would entertain his first guest in a thousand years.',
    { tags: ['fantasy'], magic: 2, w: 0.12, foe: 'undead',
      choice: choose('不死の王の誘いにどう応じる?', "How to answer the Undying King's invitation?",
        opt('客として席につく', 'Sit as a guest', ['不死の王は、死なない日々の退屈を語った。帰りがけに、古い魔導書を一冊持たせてくれた。', 'The Undying King spoke of the boredom of endless days. As {name} left, he pressed an old grimoire into {his} hands.'], { eff: { mind: 5 }, risk: { hazard: 'magic', p: 0.04 } }),
        opt('剣を抜く', 'Draw steel', ['剣は骨をすり抜けた。王は笑い、{name}を墓所の外へ放り出した。', 'The blade passed straight through the bones. The king laughed and tossed {name} out of the tomb.'], { eff: { hp: -5, fame: 2 }, risk: { hazard: 'magic', p: 0.07 } }),
      ) }],
  ['{name}の書いた論文に、差出人のない手紙が届いた。誤りを三つ指摘したその筆跡は、四百年前の不死の王のものと一致した。',
    "A letter with no sender arrived in response to {name}'s treatise, pointing out three errors. The handwriting matched that of the Undying King, four hundred years gone.",
    { tags: ['fantasy'], jobs: ['mage', 'necromancer', 'scholar', 'alchemist'], w: 0.3, kind: 'work', eff: { mind: 4, fame: 2 } }],
  ['死者の軍勢が{town}の城壁に迫った夜、{name}は軍勢の後ろに立つ冠の骸骨を見た。不死の王は{name}を指さし、一度だけうなずいた。',
    'On the night the army of the dead reached the walls of {town}, {name} saw the crowned skeleton standing behind it. The Undying King pointed at {name} and nodded, just once.',
    { tags: ['dark'], not: ['scifi', 'ruin'], w: 0.15, kind: 'battle', foe: 'undead', eff: { fame: 3, hp: -3 }, risk: { hazard: 'war', p: 0.06 } }],
]);

// ======================================================================
// 海の大怪物 (leviathan)
// ======================================================================
const LEVIATHAN = group('leviathan', [
  ['凪の海で船が大きく持ち上がった。船の下を、島ほどの大きさの影が半日かけて通り過ぎていった。',
    "On a calm sea, the ship was heaved upward. A shadow the size of an island took half a day to pass beneath the hull.",
    { tags: ['sea'], stage: YOUNG, w: 0.2, foe: 'monster', eff: { mind: 2, happy: -1 }, risk: { hazard: 'accident', p: 0.02 } }],
  ['海の大怪物が港の沖に姿を見せ、漁は三日止まった。船乗りたちは、怪物に銛を打つか、供物を流すかで割れた。',
    "The great sea beast appeared off the harbor, and fishing stopped for three days. The sailors were split between harpooning it and setting offerings adrift.",
    { tags: ['sea'], w: 0.3, foe: 'monster',
      choice: choose('どちらにつく?', 'Which side to take?',
        opt('銛を打ちに出る', 'Go out with the harpoons', ['銛は一本も刺さらなかった。怪物が尾を振ると、船は二艘沈んだ。{name}の船は、なんとか戻った。', "Not one harpoon stuck. With a sweep of its tail, the beast sank two boats. {name}'s barely made it home."], { eff: { fame: 4, hp: -4 }, risk: { hazard: 'monster', p: 0.08 } }),
        opt('供物を流す', 'Set the offerings adrift', ['供物の船が沖に消えた翌朝、怪物はいなくなっていた。その年は大漁だった。', 'The morning after the offering boat vanished offshore, the beast was gone. That year the catch was enormous.'], { eff: { wealth: 4, luck: 3 } }),
      ) }],
  ['航路の途中で、船のセンサーが恒星間空間を泳ぐ巨大な生き物を捉えた。生き物は船と並んで三日泳ぎ、闇へ潜っていった。',
    "Mid-route, the ship's sensors picked up a vast creature swimming through interstellar space. It swam alongside for three days, then dove into the dark.",
    { tags: ['scifi'], not: ['dark'], w: 0.2, eff: { mind: 3, happy: 3 } }],
  ['北の果ての海で、{name}は背に山を負った大魚を見た。大魚はやがて翼を広げ、空の彼方へ飛び立った。',
    'In the sea at the northern edge of the world, {name} saw a great fish with a mountain on its back. Then it spread its wings and took off for the far reaches of the sky.',
    { tags: ['cultivation'], stage: YOUNG, w: 0.12, kind: 'power', eff: { mind: 4, luck: 2 } }],
  ['汚れた海で、廃船を三つ呑み込むほどの変異体が浮かび上がった。{name}の筏は、その背びれの波で岸まで押し戻された。',
    "In the poisoned sea, a mutant large enough to swallow three derelict ships surfaced. The wake of its dorsal fin pushed {name}'s raft all the way back to shore.",
    { tags: ['ruin'], stage: YOUNG, w: 0.15, foe: 'monster', eff: { hp: -2, luck: 2 }, risk: { hazard: 'accident', p: 0.03 } }],
]);

// ======================================================================
// 世界樹 (world_tree)
// ======================================================================
const WORLD_TREE = group('world_tree', [
  ['雲を突き抜けてそびえる世界樹の根元に、{name}は辿り着いた。幹に手を当てると、遠い昔の誰かの声がした。',
    "{name} reached the roots of the World Tree, which rose through the clouds. When {he} laid a hand on the trunk, {he} heard the voice of someone from long, long ago.",
    { tags: ['fantasy'], not: ['desert', 'sea'], magic: 2, stage: YOUNG, w: 0.12, kind: 'power', eff: { mind: 4, hp: 3 } }],
  ['エルフの長老たちに許され、{name}は世界樹の梢まで登った。そこからは、世界の端が見えた。',
    'With the permission of the elf elders, {name} climbed to the crown of the World Tree. From there {he} could see the edge of the world.',
    { tags: ['fantasy'], races: ['elf', 'half_elf', 'dark_elf'], stage: YOUNG, w: 0.3, kind: 'power', eff: { mind: 3, happy: 4, fame: 2 } }],
  ['森の民がただ「母」と呼ぶ大樹のうろで、{name}は一夜を過ごした。目覚めると、古傷の痛みが消えていた。',
    'In the hollow of the great tree the forest folk simply called Mother, {name} spent a night. {He} woke to find {his} old wounds no longer ached.',
    { tags: ['rural'], stage: YOUNG, w: 0.2, eff: { hp: 5, happy: 2 } }],
  ['神々がまだ地上を歩いていた頃、世界樹は若木だった。{name}は、その枝に水を運ぶ役を一年務めた。',
    'In the age when gods still walked the earth, the World Tree was a sapling. For one year, {name} carried water to its branches.',
    { tags: ['myth'], stage: YOUNG, w: 0.2,
      choice: choose('世界樹の番を続けるか', 'Keep tending the World Tree?',
        opt('もう一年続ける', 'Stay another year', ['二年目の春、若木は{name}の頭上に初めての花をつけた。', "In the second spring, the sapling put out its first blossom above {name}'s head."], { eff: { luck: 5, happy: 3, wealth: -2 } }),
        opt('里へ帰る', 'Go home', ['{name}は枝を一本だけもらって帰った。挿し木は、村の広場で大きく育った。', '{name} went home with a single cutting. Planted in the village square, it grew tall.'], { eff: { fame: 2, happy: 2 } }),
      ) }],
]);

// ======================================================================
// 時を渡る者 (time_traveler)
// ======================================================================
const TIME_TRAVELER = group('time_traveler', [
  ['ステーションの医務室に運び込まれた身元不明の男は、三百年後の日付の入った身分証を持っていた。男は{name}を見て、教科書で見た顔だと言った。',
    "The unidentified man brought into the station's infirmary carried an ID dated three hundred years in the future. Looking at {name}, he said he had seen {his} face in a textbook.",
    { tags: ['scifi'], stage: ['adult', 'middle'], w: 0.15,
      choice: choose('自分の未来を尋ねるか', 'Ask about your future?',
        opt('尋ねる', 'Ask', ['男は答えかけて口をつぐみ、「悪くない人生ですよ」とだけ言った。翌朝、医務室のベッドは空だった。', 'He started to answer, stopped, and said only, "It\'s not a bad life." The next morning the infirmary bed was empty.'], { eff: { happy: 4 } }),
        opt('尋ねない', "Don't ask", ['{name}は男の傷の手当てだけをした。男は礼を言い、知らない単位で時刻を確かめた。', "{name} only dressed the man's wounds. He thanked {him} and checked the time in units {name} didn't recognize."], { eff: { mind: 2, charm: 1 } }),
      ) }],
  ['発明品の展示会で、見たこともない形の時計をはめた婦人が{name}の装置をじっと見ていた。婦人は「これは五十年早い」と言い残して、雑踏に消えた。',
    'At an exhibition of inventions, a woman wearing a watch of an unfamiliar design studied {name}\'s device. "This is fifty years early," she said, and vanished into the crowd.',
    { tags: ['industrial'], w: 0.2, eff: { mind: 3, fame: 2 } }],
  ['自分の子孫だと名乗る少女が、{name}の家の戸を叩いた。少女は未来で起きる一つの災いを告げ、光の中に消えた。',
    "A girl claiming to be {name}'s descendant knocked on {his} door. She warned of one disaster to come, then vanished into light.",
    { tags: ['fantasy'], magic: 2, stage: ['adult', 'middle'], w: 0.1,
      choice: choose('少女の言葉を信じるか', "Believe the girl's warning?",
        opt('信じて備える', 'Believe and prepare', ['三年後、少女の言ったとおり堤が切れた。{name}が高台に移していた家族は、皆無事だった。', "Three years later, the levee broke just as she had said. {name}'s family, already moved to higher ground, were all safe."], { eff: { luck: 4, wealth: -2, fame: 2 } }),
        opt('夢だと思うことにする', 'Call it a dream', ['{name}は少女のことを誰にも話さなかった。ただ、その顔はどこか母に似ていた。', "{name} never told anyone about the girl. Only, her face had looked a little like {his} mother's."], { eff: { mind: 1 } }),
      ) }],
  ['廃墟で凍りついていた冷凍睡眠の装置が開き、旧文明の服を着た女が目を覚ました。女は外を見て、長いこと何も言わなかった。',
    'A frozen cryosleep pod in the ruins cracked open, and a woman in pre-collapse clothing woke up. She looked outside and said nothing for a long time.',
    { tags: ['ruin'], stage: YOUNG, w: 0.2, eff: { mind: 3, charm: 2 } }],
  ['駅のホームで、{name}は十年後の日付の新聞を読んでいる男とすれ違った。見出しの一つに、{name}の名前があった。',
    "On a station platform, {name} passed a man reading a newspaper dated ten years ahead. One of the headlines had {name}'s name in it.",
    { tags: ['modern'], stage: YOUNG, w: 0.15, eff: { mind: 2, luck: 3 } }],
]);

// ======================================================================
// 前世の知り合い (past_friend)。前世の記憶がある人だけ。どの世界でも
// ======================================================================
const PAST_FRIEND = group('past_friend', [
  ['すれ違った見知らぬ人が、前世で{name}だけが知っていたはずの口癖をつぶやいた。振り返ると、相手も同じ顔でこちらを見ていた。',
    "A stranger passing {name} muttered a pet phrase only {his} friend from the past life could have known. {He} turned around, and the stranger was staring back with the same look on their face.",
    { stage: YOUNG, memory: true, w: 0.1, kind: 'love',
      choice: choose('声をかけるか', 'Call out to them?',
        opt('前世の名で呼ぶ', 'Call them by their old name', ['相手は立ち尽くし、それから笑い出した。二人は日が暮れるまで、もう無い町の話をした。', 'They froze, then burst out laughing. The two of them talked until sundown about a town that no longer existed.'], { eff: { happy: 6, charm: 1 } }),
        opt('そのまま歩き去る', 'Keep walking', ['{name}は振り返らなかった。今の人生には今の人生の知り合いがいる、と自分に言い聞かせた。', '{name} did not look back, telling {himself} that this life had people of its own.'], { eff: { mind: 2, happy: -2 } }),
      ) }],
  ['前世で同じ職場にいた先輩が、この世界では{name}より二十も年下の子どもとして生まれていた。子どもは、昔と同じ目つきで{name}の仕事に文句をつけた。',
    "A senior coworker from {name}'s past life had been born into this world twenty years younger than {him}. The child criticized {his} work with exactly the same look as before.",
    { stage: ['adult', 'middle', 'elder'], memory: true, w: 0.08, kind: 'work', eff: { happy: 4, mind: 1 } }],
  ['祭りの屋台で、前世の幼なじみが同じ料理を作って売っていた。名乗り合うより先に、{name}は皿を受け取って泣いていた。',
    "At a festival stall, {name}'s childhood friend from the past life was selling the very dish they used to make together. Before either of them gave a name, {name} took the plate and wept.",
    { stage: YOUNG, memory: true, w: 0.08, kind: 'love', eff: { happy: 6 } }],
  ['敵の陣にいた指揮官は、前世で{name}の弟だった男だった。向こうも、旗の下の{name}に気づいていた。',
    "The commander on the enemy side had been {name}'s younger brother in the past life. He had recognized {name} beneath the opposing banner, too.",
    { stage: ['adult', 'middle'], not: ['scifi', 'modern', 'ruin', 'industrial'], memory: true, w: 0.05, kind: 'battle', foe: 'soldier', risk: { hazard: 'war', p: 0.03 },
      choice: choose('どうする?', 'What now?',
        opt('夜のうちに会いに行く', 'Go to him under cover of night', ['二人は川辺で一晩だけ話し、翌朝はまた敵同士に戻った。戦は、なぜか長引かなかった。', 'They talked by the river for one night, and by morning were enemies again. Somehow, the war did not drag on.'], { eff: { happy: 3, mind: 2 }, risk: { hazard: 'execution', p: 0.03 } }),
        opt('戦場で決着をつける', 'Settle it on the field', ['{name}は剣を交えたが、とどめは刺せなかった。弟も同じだった。', '{name} crossed swords with him, but could not deliver the final blow. Neither could he.'], { eff: { power: 2, fame: 2, happy: -3 } }),
      ) }],
  ['手紙の筆跡に見覚えがあった。差出人は、前世で{name}が最後に借りた本を返しそびれた友人だった。',
    "{name} knew the handwriting on the letter. It came from the friend whose book {he} had never returned in the past life.",
    { stage: YOUNG, memory: true, w: 0.08, kind: 'love', eff: { happy: 4, charm: 1 } }],
]);

// ======================================================================
// 書き足し: 出会いの種類が少ない世界 (近未来・宇宙・現代・文明の後・和風・蒸気) に、その世界らしい形で
// ======================================================================
const MORE = [
  // 近未来・宇宙
  ...group('sage', [
    ['学会の廊下で、{name}は人工知能の理論を一人で組み上げた伝説の研究者に呼び止められた。研究者は{name}の論文の三行目だけを褒めた。',
      'In a conference hallway, {name} was stopped by the legendary researcher who had built the theory of artificial minds single-handed. She praised only the third line of {his} paper.',
      { tags: ['scifi'], w: 0.2, kind: 'work', eff: { mind: 5, fame: 2 } }],
    ['ダンジョン研究の第一人者である老教授が、{name}の持ち帰った魔石を見るなり研究室を飛び出してきた。教授は、ダンジョンの正体についての仮説を夜通し語った。',
      "The leading authority on dungeon research, an elderly professor, came running out of the lab the moment {he} saw the mana stone {name} had brought back. The professor spent all night explaining a theory of what the dungeons really were.",
      { tags: ['modern'], w: 0.2, kind: 'work', eff: { mind: 5 } }],
    ['崩れた図書館を一人で守る老人は、旧文明の大学で教えていたと言った。老人は{name}に、文字の読み方から教え直した。',
      'The old man who guarded a collapsed library alone said he had once taught at a university of the old world. He started {name} over from learning to read.',
      { tags: ['ruin'], stage: YOUNG, w: 0.2, kind: 'school', eff: { mind: 6 } }],
  ], 5),
  ...group('rare_familiar', [
    ['違法な遺伝子工房から逃げ出した小さな生き物は、どの登録にも無い種だった。{name}はそれを上着の中にかくまい、{familiar}と呼んだ。',
      "The small creature that escaped from an illegal gene lab was a species found in no registry. {name} hid it inside {his} jacket and called it {familiar}.",
      { tags: ['scifi'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'child', eff: { happy: 4, mind: 1 }, tie: { role: 'familiar', new: true } }],
    ['ダンジョンの浅い層で、{name}は人に懐く魔物の子を見つけた。協会の記録に例のない種で、{name}はその子を{familiar}と名付けて登録した。',
      'In the shallow levels of a dungeon, {name} found a monster cub that took to people. The Association had no record of the species. {name} registered it under the name {familiar}.',
      { tags: ['modern'], stage: ['teen', 'adult', 'middle'], w: 0.2, kind: 'adventure', eff: { happy: 4, fame: 2 }, tie: { role: 'familiar', new: true } }],
    ['動物園から盗み出された、絶滅したはずの鳥が、{name}の工房の窓辺に降りてきた。{name}は鳥を{familiar}と呼び、煙突の上に巣箱を作った。',
      "A bird thought to be extinct, stolen from the zoological gardens, landed on {name}'s workshop windowsill. {name} called it {familiar} and built it a nest box atop the chimney.",
      { tags: ['industrial'], stage: ['child', 'teen', 'adult', 'middle'], w: 0.2, kind: 'child', eff: { happy: 4, luck: 2 }, tie: { role: 'familiar', new: true } }],
  ], 6),
  ...group('vampire_lord', [
    ['高層の会員制クラブで、{name}は千年生きていると噂される投資家と同席した。投資家は、血液銀行の株だけは売らないと笑った。',
      'At an exclusive high-rise club, {name} shared a table with an investor rumored to be a thousand years old. He laughed and said the only shares he would never sell were in blood banks.',
      { tags: ['scifi'], tech: [8, 9], w: 0.2, foe: 'undead', eff: { wealth: 3, mind: 2 }, risk: { hazard: 'violence', p: 0.02 } }],
  ], 5),
  ...group('hero', [
    ['前の戦争を一機で終わらせたという伝説の操縦士が、{name}の部隊の教官として着任した。操縦士は、英雄と呼ばれるのを何より嫌った。',
      "The legendary pilot said to have ended the last war in a single craft joined {name}'s unit as an instructor. Nothing annoyed the pilot more than being called a Hero.",
      { tags: ['scifi'], w: 0.2, kind: 'power', eff: { power: 3, level: 1 } }],
  ], 6),
  // 現代
  ...group('royal', [
    ['来日した北欧の王女の警護に、ダンジョン帰りの{name}が急きょ駆り出された。王女は、日本のダンジョンに一度入ってみたいと言い出した。',
      "Fresh out of a dungeon, {name} was hastily assigned to guard a visiting Nordic princess. The princess announced that she wanted to try a Japanese dungeon, just once.",
      { tags: ['modern'], w: 0.2, kind: 'fame',
        choice: choose('王女を案内するか', 'Take the princess in?',
          opt('一層だけ案内する', 'Show her the first level', ['王女はスライムを一匹倒し、子どものようにはしゃいだ。翌月、王家から感謝状が届いた。', 'The princess beat one slime and cheered like a child. The next month, a letter of thanks arrived from the royal house.'], { eff: { fame: 5, charm: 2 }, risk: { hazard: 'monster', p: 0.01 } }),
          opt('丁重に断る', 'Politely refuse', ['王女はふくれたが、帰国前に{name}と写真を一枚撮っていった。', 'The princess pouted, but took a photo with {name} before flying home.'], { eff: { charm: 1 } }),
        ) }],
    ['集落を訪ねてきた女は、崩壊の前にこの国を治めていた王家の最後の一人だと名乗った。女は王冠ではなく、種の入った袋を持っていた。',
      'The woman who came to the settlement said she was the last of the royal house that had ruled this land before the fall. She carried no crown, only a sack of seeds.',
      { tags: ['ruin'], stage: YOUNG, w: 0.2, eff: { charm: 2, wealth: 2, happy: 2 } }],
    ['ネオン街の古い屋台で、{name}は亡命した小国の王子と隣り合わせた。王子は、国が無くなっても麺の味は変わらないと言った。',
      'At an old street stall in the neon district, {name} sat next to a prince from a small nation in exile. A country could vanish, he said, and the noodles would taste the same.',
      { tags: ['scifi'], tech: [8, 9], stage: YOUNG, w: 0.2, eff: { happy: 2, charm: 2 } }],
    ['公方の鷹狩りの列に行き会い、{name}は道端に平伏した。駕籠の中から声がかかり、{name}はこの土地の暮らしを問われるまま答えた。',
      "{name} came upon the shogun's hawking procession and knelt at the roadside. A voice called from inside the palanquin, and {name} answered its questions about life in these parts.",
      { tags: ['japan'], stage: YOUNG, w: 0.15, kind: 'fame', eff: { fame: 3, charm: 1 } }],
  ], 6),
  ...group('ancient_ai', [
    ['ダンジョンの核に触れたとき、{name}の端末に文字が流れた。核は自分をこの迷宮の管理システムだと名乗り、{name}に利用規約への同意を求めた。',
      "When {name} touched the dungeon core, text scrolled across {his} phone. The core introduced itself as the labyrinth's management system and asked {name} to accept its terms of service.",
      { tags: ['modern'], w: 0.2, foe: 'machine',
        choice: choose('同意するか', 'Accept the terms?',
          opt('同意する', 'Accept', ['{name}のステータス画面に、見たことのない項目が一つ増えた。', "One unfamiliar line appeared on {name}'s Status screen."], { eff: { level: 2, mind: 2 }, risk: { hazard: 'magic', p: 0.02 } }),
          opt('全文を読む', 'Read the whole thing', ['全文は四万字あった。読み終えたとき、核はなぜか{name}に一つだけ秘密を教えた。', 'It ran to forty thousand words. When {name} finished, the core, for some reason, told {him} one secret.'], { eff: { mind: 5 } }),
        ) }],
  ], 5),
  // 文明の後
  ...group('world_tree', [
    ['崩れた高層ビルを幹で貫いて、一本の巨大な樹が空まで伸びていた。根元の泉の水だけは、汚れていなかった。',
      'A single enormous tree rose to the sky, its trunk driven straight through a collapsed skyscraper. The spring at its roots was the only clean water for miles.',
      { tags: ['ruin'], stage: YOUNG, w: 0.2, eff: { hp: 5, happy: 3 } }],
  ], 5),
  ...group('master', [
    ['荒野の一人旅の老人は、崩壊の後を六十年生き延びてきたと言った。老人は{name}に、水の匂いの嗅ぎ分け方を教えた。',
      'The old wanderer of the wasteland said he had survived sixty years since the fall. He taught {name} how to smell out water.',
      { tags: ['ruin'], stage: YOUNG, w: 0.2, kind: 'power', eff: { hp: 3, mind: 3, luck: 1 } }],
    ['峠の茶屋で、{name}は名のある剣客と相席になった。剣客は箸の持ち方ひとつで、{name}の腕のほどを言い当てた。',
      "At a teahouse on the pass, {name} shared a table with a famed swordsman, who judged {his} skill from nothing more than the way {he} held {his} chopsticks.",
      { tags: ['japan'], stage: YOUNG, w: 0.15, kind: 'power', eff: { power: 3, mind: 1 } }],
  ], 6),
  // 蒸気
  ...group('leviathan', [
    ['雲の海を渡る飛空船の下を、鯨に似た巨大な影が横切った。船長は、空の大怪物を見て生きて帰った者は少ないとつぶやいた。',
      "A vast whale-like shadow passed beneath the airship crossing the sea of clouds. The captain muttered that few who saw the leviathan of the skies ever came home.",
      { tags: ['industrial'], w: 0.2, foe: 'monster', eff: { mind: 2, fame: 2 }, risk: { hazard: 'accident', p: 0.03 } }],
  ], 6),
];

export const EVENTS: EventDef[] = [
  ...GODDESS, ...DRAGON, ...ROYAL, ...MASTER, ...FAMILIAR, ...DEMON_LORD, ...SPIRIT_KING, ...PHOENIX, ...SAGE, ...SAINTESS,
  ...HERO, ...ANCIENT_AI, ...ALIEN, ...YOKAI_LORD, ...IMMORTAL, ...VAMPIRE, ...LICH, ...LEVIATHAN, ...WORLD_TREE, ...TIME_TRAVELER,
  ...PAST_FRIEND, ...MORE,
];
