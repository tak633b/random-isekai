// 鍛える道 (engine/training.ts)。数年ごとの「この数年、何を鍛える？」に、世界・種族・職業・特典に合うものが出る。
// traits はその道で身につきうる trait (src/data/traits/*.ts の id)。その世界で選べないものは自動で外れる。
// 文の置き換えは出来事と同じ ({name} {town} {he} …)。fails は笑える失敗の年、lines はふつうの年の一文。
// 書き足すときは、別のファイル (src/data/training/<分類>.ts) に `export const PATHS` を足せば読み込まれる
import type { TrainPath } from '../../engine/types';

type P = Omit<TrainPath, 'start' | 'fails' | 'lines' | 'name' | 'where'> & {
  name: [string, string]; where?: [string, string]; start: [string, string]; fails: [string, string][]; lines?: [string, string][];
};
const t = ([ja, en]: [string, string]) => ({ ja, en });
const path = ({ where, lines, ...p }: P): TrainPath => ({
  ...p, name: t(p.name), ...(where ? { where: t(where) } : {}), start: t(p.start), fails: p.fails.map(t), ...(lines ? { lines: lines.map(t) } : {}),
});

const FANTASY: TrainPath['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern'];
const MODERN: TrainPath['tags'] = ['modern', 'scifi', 'industrial'];

export const PATHS: TrainPath[] = [
  // ---- 武 ----------------------------------------------------------------
  path({ id: 'tr.sword', name: ['剣の稽古', 'Sword practice'], where: ['町の剣術道場', 'the town fencing hall'], heq: [8, 50], talents: ['might'],
    stats: { power: 2, hp: 1 }, traits: ['sk.sword', 'sk.dual', 'sk.shield', 'sk.iai'], got: { ja: '一万回目の素振りの朝、師範が黙って真剣を渡してくれた。〈{target}〉を身につけた！', en: 'On the morning of the ten-thousandth swing, the master silently handed over a real blade. Learned "{target}"!' }, cost: 1, risk: { hazard: 'accident', p: 0.002 }, not: MODERN,
    start: ['{name}は木剣を握り、毎朝の素振りを始めた。', '{name} picked up a wooden sword and began swinging it every morning.'],
    fails: [['素振りに熱が入りすぎて、師範の盆栽を斬った。一週間、草むしりになった。', "Got so into the drills that {he} cut the master's bonsai in half. A week of weeding followed."],
      ['かっこいい構えを考えるのに一年を使った。強くはならなかった。', 'Spent the whole year inventing a cool stance. Did not get any stronger.']],
    lines: [['師範に「筋は悪くない」と言われた。生まれて初めて褒められた気がした。', 'The master said {his} form "wasn\'t bad". It felt like the first praise of {his} life.']] }),
  path({ id: 'tr.bow', name: ['弓と狩り', 'Bow and hunting'], where: ['森の狩人のところ', "a forest hunter's lodge"], heq: [8, 55], talents: ['might', 'luck'],
    stats: { power: 1, luck: 1 }, traits: ['sk.bow', 'sk.hunt', 'sk.track', 'sk.hawkeye', 'sk.throw'], risk: { hazard: 'monster', p: 0.003 },
    start: ['{name}は狩人について森に入るようになった。', '{name} started following a hunter into the woods.'],
    fails: [['獲物を待つうちに寝てしまい、起きたら鹿に顔をなめられていた。', 'Fell asleep waiting for game and woke up with a deer licking {his} face.'],
      ['的の中心を射抜いた。隣の人の的だった。', "Hit the bullseye dead center. It was the next person's target."]] }),
  path({ id: 'tr.body', name: ['体を鍛える', 'Body training'], heq: [8, 60], talents: ['might'],
    stats: { hp: 2, power: 1 }, traits: ['sk.martial', 'sk.might', 'sk.swift', 'sk.climb', 'sk.swim', 'sk.reflex', 'sk.boost'],
    start: ['{name}は走り込みと腕立てを毎日の決まりにした。', '{name} made running and push-ups a daily rule.'],
    fails: [['筋肉痛で一週間、階段を後ろ向きに下りた。', 'Sore for a week. Took stairs backwards the whole time.'],
      ['重い岩を持ち上げようとして、腰を痛めた。岩は今もそこにある。', 'Tried to lift a huge boulder and threw out {his} back. The boulder is still there.']] }),
  path({ id: 'tr.guard', name: ['兵の訓練', 'Military drill'], where: ['領主の兵舎', "the lord's barracks"], heq: [15, 45], talents: ['might'],
    stats: { power: 2, hp: 1 }, traits: ['sk.spear', 'sk.shield', 'sk.tactics', 'sk.leadership', 'sk.mounted'], risk: { hazard: 'violence', p: 0.003 }, not: MODERN,
    start: ['{name}は兵舎の門をくぐった。最初に教わったのは、まっすぐ立つことだった。', '{name} walked through the barracks gate. The first lesson was how to stand up straight.'],
    fails: [['行進の右と左を一年間まちがえ続け、ついに隊が{name}に合わせ始めた。', 'Mixed up left and right on the march all year, until the whole squad started following {him} instead.']] }),

  // ---- 魔法 ----------------------------------------------------------------
  path({ id: 'tr.fire', name: ['火の魔法', 'Fire magic'], where: ['魔術師の塔', "a mage's tower"], heq: [8, 60], talents: ['magic'], magic: 2,
    stats: { mind: 2 }, traits: ['sk.fire', 'sk.quickcast', 'sk.manasense'], cost: 2, risk: { hazard: 'magic', p: 0.003 },
    start: ['{name}は手のひらに小さな火を灯す練習を始めた。', '{name} began practicing how to light a small flame in {his} palm.'],
    fails: [['前髪を三回燃やした。四回目からは眉毛だった。', 'Burned {his} bangs three times. The fourth time, it was the eyebrows.'],
      ['火球を撃とうとして、ぽふっと煙だけ出た。見ていた子どもに拍手された。', 'Tried to cast a fireball. Out came a sad puff of smoke. A watching child applauded anyway.']] }),
  path({ id: 'tr.water', name: ['水と氷の魔法', 'Water and ice magic'], where: ['湖のほとりの魔女', 'the witch by the lake'], heq: [8, 60], talents: ['magic'], magic: 2,
    stats: { mind: 2 }, traits: ['sk.water', 'sk.ice', 'sk.manasense'], cost: 1,
    start: ['{name}は桶の水を宙に浮かせる練習を始めた。', '{name} started practicing lifting water out of a bucket.'],
    fails: [['水を浮かせるのには成功した。自分の頭の上だった。', 'Succeeded in levitating the water. Directly over {his} own head.'],
      ['氷を作ろうとして、師匠のお茶を凍らせた。師匠は笑わなかった。', "Tried to make ice and froze the teacher's tea solid. The teacher did not laugh."]] }),
  path({ id: 'tr.wind', name: ['風と雷の魔法', 'Wind and lightning magic'], where: ['山の上の魔術師', 'a mage on the mountain'], heq: [10, 60], talents: ['magic'], magic: 2,
    stats: { mind: 2, luck: 1 }, traits: ['sk.wind', 'sk.thunder', 'sk.silent'], cost: 1, risk: { hazard: 'magic', p: 0.003 },
    start: ['{name}は風の声を聞く修行に入った。最初の一年は、ただ聞くだけだった。', '{name} began learning to listen to the wind. The first year was nothing but listening.'],
    fails: [['雷を呼んだら、自分に落ちた。髪が一か月ふわふわだった。', 'Called down lightning. It hit {him}. {His} hair stayed fluffy for a month.']] }),
  path({ id: 'tr.earth', name: ['土と結界の魔法', 'Earth and ward magic'], heq: [10, 65], talents: ['magic', 'craft'], magic: 2,
    stats: { mind: 1, hp: 1 }, traits: ['sk.earth', 'sk.barrier', 'sk.golem', 'sk.rune'], cost: 1,
    start: ['{name}は土に手を当て、石を一つ動かすところから始めた。', '{name} put a hand on the earth and started by trying to move one stone.'],
    fails: [['ゴーレムを作った。座ったきり、二度と立たなかった。今は庭の椅子になっている。', 'Built a golem. It sat down and never stood up again. It is now a garden bench.']] }),
  path({ id: 'tr.heal', name: ['癒やしの術', 'Healing arts'], where: ['神殿の施療院', 'the temple infirmary'], heq: [10, 70], talents: ['magic', 'charm'], magic: 1,
    stats: { mind: 1, charm: 1 }, traits: ['sk.heal', 'sk.purify', 'sk.firstaid', 'sk.medic'],
    start: ['{name}は施療院で、けが人の手当てを手伝い始めた。', '{name} began helping tend the wounded at the infirmary.'],
    fails: [['治癒の光で、患者の水虫だけが治った。本人はとても喜んだ。', "{His} healing light cured only the patient's athlete's foot. The patient was delighted."]] }),
  path({ id: 'tr.dark', name: ['闇の書を読む', 'Reading forbidden books'], where: ['古書店の奥の棚', 'the back shelf of a used bookshop'], heq: [13, 70], talents: ['magic', 'wits'], magic: 2,
    stats: { mind: 2, happy: -1 }, traits: ['sk.dark', 'sk.curse', 'sk.necro', 'sk.illusion'], risk: { hazard: 'magic', p: 0.004 },
    start: ['{name}は人目を避けて、黒い表紙の本を開いた。', '{name} opened a black-bound book, away from prying eyes.'],
    fails: [['悪魔を呼び出す儀式をした。来たのは近所の猫だった。', 'Performed a ritual to summon a demon. The neighbor\'s cat showed up.'],
      ['呪いの言葉を三か月練習した。唯一効いたのは、自分のしゃっくりだった。', 'Practiced a curse for three months. The only thing it ever worked on was {his} own hiccups.']] }),
  path({ id: 'tr.mana', name: ['魔力の制御', 'Mana control'], heq: [7, 50], talents: ['magic'], magic: 1,
    stats: { mind: 2 }, traits: ['sk.manasense', 'sk.bigmana', 'sk.manacircuit', 'sk.quickcast'],
    start: ['{name}は寝る前に、体の中の魔力を数える癖をつけた。', '{name} got into the habit of counting the mana in {his} body before sleep.'],
    fails: [['魔力を練りすぎて、夜中に家じゅうのランプが点いた。家族に叱られた。', "Overcharged {his} mana and every lamp in the house lit up at midnight. The family was not pleased."]] }),
  path({ id: 'tr.spirit', name: ['精霊と話す', 'Talking to spirits'], heq: [7, 70], magic: 2, races: ['elf', 'half_elf', 'dark_elf', 'beast_fox', 'halfling', 'human'],
    stats: { mind: 1, luck: 1 }, traits: ['sk.spiritmagic', 'sk.spiritsight', 'sk.forestkin'],
    start: ['{name}は森の奥で、毎日精霊に話しかけるようになった。', '{name} began talking to the spirits deep in the woods every day.'],
    fails: [['一年話しかけ続けた相手は、ただの切り株だった。', 'Spent a whole year talking to what turned out to be a tree stump.']] }),

  // ---- 仙・和 ----------------------------------------------------------------
  path({ id: 'tr.qi', name: ['気の修行', 'Qi cultivation'], where: ['山奥の老師', 'an old master deep in the mountains'], heq: [8, 70], tags: ['cultivation', 'eastern'],
    stats: { hp: 1, mind: 1, power: 1 }, traits: ['sk.qigong', 'sk.lightfoot', 'sk.swordqi', 'sk.alchemy_e'], risk: { hazard: 'accident', p: 0.003 },
    start: ['{name}は山の老師に弟子入りし、まず水汲みを三年と言われた。', '{name} became the disciple of an old mountain master, who began with: "Carry water for three years."'],
    fails: [['滝に打たれて悟りを開くはずが、風邪をひいた。', 'Meditated under a waterfall for enlightenment. Got a cold instead.'],
      ['老師の言う「心の目」を開こうとして、ずっと寄り目になっていた。', 'Tried to open the "inner eye" the master spoke of and only managed to go cross-eyed.']] }),
  path({ id: 'tr.onmyo', name: ['陰陽の術', 'Onmyodo'], where: ['陰陽寮', 'the Bureau of Divination'], heq: [10, 70], tags: ['japan'], talents: ['magic', 'wits'],
    stats: { mind: 2 }, traits: ['sk.onmyo', 'sk.exorcise', 'sk.divine', 'sk.ghostsight'],
    start: ['{name}は札の書き方から習い始めた。字が汚いと三度書き直させられた。', '{name} started by learning to write talismans. {His} handwriting got sent back three times.'],
    fails: [['式神を呼んだら、ただの紙人形が机の上で一日ぼんやりしていた。', 'Summoned a shikigami. It was a paper doll that spent the day lazing on the desk.']] }),

  // ---- 影 ----------------------------------------------------------------
  path({ id: 'tr.shadow', name: ['影の技', 'Shadow skills'], where: ['路地裏の師匠', 'a teacher in the back alleys'], heq: [10, 50], talents: ['luck', 'wits'],
    stats: { luck: 2 }, traits: ['sk.stealth', 'sk.lockpick', 'sk.disguise', 'sk.dagger', 'sk.unseen'], risk: { hazard: 'violence', p: 0.003 },
    start: ['{name}は足音を立てずに歩く練習を始めた。', '{name} began practicing how to walk without a sound.'],
    fails: [['完璧に気配を消せた。そのせいで誕生日を家族に忘れられた。', 'Mastered hiding {his} presence perfectly. So perfectly that the family forgot {his} birthday.'],
      ['鍵開けの練習中に自分の家の鍵を壊し、一晩外で寝た。', 'Broke the lock on {his} own house while practicing lockpicking, and slept outside.']] }),

  // ---- 手の技 ----------------------------------------------------------------
  path({ id: 'tr.smith', name: ['鍛冶修業', 'Blacksmithing'], where: ['鍛冶屋の親方', 'the master smith'], heq: [10, 65], talents: ['craft', 'might'], not: ['scifi'],
    stats: { power: 1, wealth: 1 }, traits: ['sk.smith', 'sk.craft', 'sk.mine', 'sk.oresight', 'sk.forgelore'], risk: { hazard: 'accident', p: 0.002 },
    start: ['{name}は鍛冶場で炭を運ぶ仕事から始めた。', '{name} started at the smithy by hauling charcoal.'],
    fails: [['伝説の剣を打つつもりで、とても立派なスプーンができた。', 'Set out to forge a legendary sword. Produced a very fine spoon.']] }),
  path({ id: 'tr.alchemy', name: ['錬金術と調合', 'Alchemy and potions'], where: ['薬屋の工房', "the apothecary's workshop"], heq: [10, 70], talents: ['wits', 'craft'], magic: 1,
    stats: { mind: 2 }, traits: ['sk.alchemy', 'sk.brew', 'sk.poison', 'sk.poisoneye', 'sk.enchant'], cost: 1, risk: { hazard: 'accident', p: 0.003 },
    start: ['{name}は乳鉢で薬草をすりつぶすところから始めた。', '{name} began by grinding herbs in a mortar.'],
    fails: [['回復薬を作ったつもりが、虹色に光るスープができた。飲んだ人は三日間笑い続けた。', 'Meant to brew a healing potion; made a soup that glowed rainbow. Whoever drank it laughed for three days.'],
      ['工房を一回、爆発させた。親方は「二回までは普通」と言った。', 'Blew up the workshop once. The master said "twice is normal".']] }),
  path({ id: 'tr.cook', name: ['料理修業', 'Cooking'], where: ['酒場の厨房', 'the tavern kitchen'], heq: [8, 75], talents: ['craft', 'charm'],
    stats: { charm: 1, happy: 1, wealth: 1 }, traits: ['sk.cook', 'sk.palate', 'sk.brewer', 'sk.forage'], got: { ja: '料理長が{name}の皿を黙って全部食べた。〈{target}〉を身につけた！', en: 'The head chef silently ate every bite on {name}\'s plate. Learned "{target}"!' },
    start: ['{name}は厨房でじゃがいもの皮むきを始めた。山のようにあった。', '{name} started peeling potatoes in the kitchen. There were mountains of them.'],
    fails: [['塩と砂糖を一年間まちがえ続けた。なぜか常連が増えた。', 'Mixed up salt and sugar all year. Somehow got more regulars.'],
      ['ドラゴンの肉の煮込みに挑戦した。材料費で一年が終わった。', 'Attempted a dragon-meat stew. The cost of ingredients ate the whole year.']] }),
  path({ id: 'tr.farm', name: ['畑と家畜', 'Farming and livestock'], heq: [7, 80], talents: ['craft'], not: ['scifi'],
    stats: { hp: 1, wealth: 1, happy: 1 }, traits: ['sk.farm', 'sk.herd', 'sk.greenthumb', 'sk.weather', 'sk.animals'],
    start: ['{name}は畑の一角を任された。最初に育てたのは大根だった。', '{name} was given a corner of the field. The first crop was radishes.'],
    fails: [['かかしに名前をつけて話しかけていたら、鳥たちに完全になめられた。', 'Named the scarecrow and chatted with it daily. The birds lost all respect.']] }),
  path({ id: 'tr.sea', name: ['海と船', 'The sea and ships'], heq: [10, 60], tags: ['fantasy', 'japan', 'industrial', 'eastern'],
    stats: { power: 1, luck: 1 }, traits: ['sk.sail', 'sk.swim', 'sk.fish', 'sk.compass', 'sk.weather'], risk: { hazard: 'accident', p: 0.004 },
    start: ['{name}は港で船の雑用に雇われた。', '{name} took on odd jobs aboard ships at the harbor.'],
    fails: [['一年中、船酔いしていた。海は好きだった。', 'Seasick the entire year. Still loved the sea.']] }),

  // ---- 頭と口 ----------------------------------------------------------------
  path({ id: 'tr.study', name: ['学問', 'Scholarship'], where: ['学院の図書室', 'the academy library'], heq: [8, 80], talents: ['wits'],
    stats: { mind: 2 }, traits: ['sk.letters', 'sk.math', 'sk.law', 'sk.tongues', 'sk.speedread', 'sk.memory', 'sk.teach'], cost: 1,
    start: ['{name}は本を山ほど借りて、片っ端から読み始めた。', '{name} borrowed a mountain of books and started reading them all.'],
    fails: [['一年かけて書いた論文の結論が「よくわからない」だった。正直さは評価された。', 'Spent a year on a thesis whose conclusion was "unclear". The honesty was appreciated.']] }),
  path({ id: 'tr.trade', name: ['商いの修業', 'Merchant apprenticeship'], where: ['大店の帳場', "a big merchant house's counting room"], heq: [10, 70], talents: ['wits', 'charm', 'luck'],
    stats: { wealth: 2, charm: 1 }, traits: ['sk.math', 'sk.negotiate', 'sk.appraise', 'sk.calc'],
    start: ['{name}はそろばんを渡され、帳簿の付け方を習い始めた。', '{name} was handed an abacus and started learning to keep the books.'],
    fails: [['値切りの練習をしていたら、店の品を原価の半分で売っていた。', 'Practiced haggling so hard that {he} sold the stock at half the cost price.']] }),
  path({ id: 'tr.manners', name: ['礼儀作法と社交', 'Etiquette and society'], where: ['貴族の家庭教師', 'a noble tutor'], heq: [8, 60], talents: ['charm'], tags: ['nobility', 'fantasy', 'japan', 'eastern'],
    stats: { charm: 2, fame: 1 }, traits: ['sk.manners', 'sk.speech', 'sk.dance', 'sk.tea', 'sk.faces'], cost: 2,
    start: ['{name}は本を頭に載せて歩く練習から始めた。', '{name} began by practicing walking with a book balanced on {his} head.'],
    fails: [['舞踏会で完璧なお辞儀をした。相手は柱だった。', 'Made a flawless bow at the ball. To a pillar.']] }),
  path({ id: 'tr.music', name: ['歌と楽器', 'Music and song'], heq: [7, 80], talents: ['charm'],
    stats: { charm: 1, happy: 2 }, traits: ['sk.music', 'sk.sing', 'sk.dance', 'sk.pitch', 'sk.voice'],
    start: ['{name}は古いリュートをもらい、毎晩弾くようになった。', '{name} was given an old lute and started playing every night.'],
    fails: [['広場で一年歌い続けた。集まったのは鳩だけだった。鳩は満足そうだった。', 'Sang in the square for a whole year. Only pigeons came. The pigeons seemed satisfied.']] }),
  path({ id: 'tr.faith', name: ['祈りと信仰', 'Prayer and faith'], where: ['{god}の神殿', 'the temple of {god}'], heq: [8, 90], talents: ['charm'],
    stats: { mind: 1, happy: 1 }, traits: ['sk.prayer', 'sk.purify', 'sk.heal', 'sk.empathy'],
    start: ['{name}は毎朝、神殿で祈るようになった。', '{name} began praying at the temple every morning.'],
    fails: [['祈りに集中しすぎて、神殿に閉じ込められて一晩明かした。', 'Prayed so intently {he} got locked inside the temple overnight.']] }),
  path({ id: 'tr.beast', name: ['獣を手なずける', 'Taming beasts'], heq: [8, 70], talents: ['charm', 'luck'],
    stats: { charm: 1, luck: 1 }, traits: ['sk.tame', 'sk.animals', 'sk.beastspeak', 'sk.beastfriend', 'sk.ride'], risk: { hazard: 'monster', p: 0.003 },
    start: ['{name}は傷ついた子狼を拾い、育て始めた。', '{name} found a wounded wolf pup and started raising it.'],
    fails: [['一年かけて手なずけたのは、近所の気難しいニワトリだった。今では毎朝起こしに来る。', 'A year of taming produced one result: the grumpy neighborhood rooster, who now wakes {him} every morning.']] }),

  // ---- 今の世界 ----------------------------------------------------------------
  path({ id: 'tr.code', name: ['プログラミング', 'Programming'], heq: [10, 70], talents: ['wits'], tech: [7, 10],
    stats: { mind: 2, wealth: 1 }, traits: ['sk.code', 'sk.hack', 'sk.electronics', 'sk.compute'],
    start: ['{name}は古い端末で、最初の一行を書いた。', '{name} typed {his} first line of code on an old terminal.'],
    fails: [['三か月かけたプログラムが、セミコロン一つで動かなかった。', 'Three months of code failed to run because of one semicolon.']] }),
  path({ id: 'tr.machine', name: ['機械いじり', 'Tinkering'], heq: [8, 75], talents: ['craft', 'wits'], tech: [5, 10],
    stats: { mind: 1, wealth: 1 }, traits: ['sk.machine', 'sk.electronics', 'sk.drive', 'sk.pilot', 'sk.drone'], risk: { hazard: 'accident', p: 0.002 },
    start: ['{name}は壊れた機械を拾ってきては、分解するようになった。', '{name} started bringing home broken machines and taking them apart.'],
    fails: [['分解したトースターを組み立て直したら、ねじが七本余った。トースターは前より調子がいい。', 'Reassembled a toaster with seven screws left over. It works better than before.']] }),
];
