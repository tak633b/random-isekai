// 鍛える道: 海と群島 (sea)・砂漠の遊牧の地 (desert)・獣人の森 (rural の獣人)・神話の時代 (myth、仙侠を除く)・辺境の開拓村 (rural, tech 4)。
// 書き方は paths.ts と同じ
import type { TrainMethod, TrainPath } from '../../engine/types';

type P = Omit<TrainPath, 'start' | 'fails' | 'lines' | 'name' | 'where'> & {
  name: [string, string]; where?: [string, string]; start: [string, string]; fails: [string, string][]; lines?: [string, string][];
};
type M = Omit<TrainMethod, 'name' | 'start' | 'steps' | 'fails' | 'done'> & {
  name: [string, string]; start: [string, string]; steps: [[string, string], [string, string]]; fails: [string, string][]; done: [string, string];
};
const t = ([ja, en]: [string, string]) => ({ ja, en });
const path = ({ where, lines, ...p }: P): TrainPath => ({
  ...p, name: t(p.name), ...(where ? { where: t(where) } : {}), start: t(p.start), fails: p.fails.map(t), ...(lines ? { lines: lines.map(t) } : {}),
});
const method = (m: M): TrainMethod => ({ ...m, name: t(m.name), start: t(m.start), steps: [t(m.steps[0]), t(m.steps[1])], fails: m.fails.map(t), done: t(m.done) });

const BEASTS: TrainPath['races'] = ['beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf'];

export const PATHS: TrainPath[] = [
  // ---- 海と群島 ----------------------------------------------------------------
  path({ id: 'tr.sea.dive', name: ['素潜りと真珠採り', 'Free diving for pearls'], where: ['入り江の海女小屋', 'the divers\' hut on the cove'], heq: [8, 60], tags: ['sea'], talents: ['might', 'luck'],
    stats: { hp: 2, wealth: 1 }, traits: ['sk.swim', 'sk.lungs', 'sk.gills', 'sk.deepeye', 'sk.fish'], risk: { hazard: 'accident', p: 0.004 },
    start: ['{name}は入り江で素潜りを習い始めた。最初は十数えるまで息が続かなかった。', '{name} started learning to free dive in the cove. At first {he} could not hold {his} breath for a count of ten.'],
    fails: [['大きな真珠を見つけた。人魚の子のおはじきだった。泣かれたので返した。', 'Found a huge pearl. It was a merfolk child\'s marble. The child cried, so {he} gave it back.'],
      ['息を止める練習に夢中になり、陸の上でも止めていた。家族に心配された。', 'Got so into holding {his} breath that {he} kept doing it on land. The family grew worried.'],
      ['一年かけて採った貝は、全部同じ一匹のヤドカリが住み替えていた。', "Every shell {he} collected that year had been the same hermit crab moving house."]],
    lines: [['海の底で見上げる光が好きになった。', 'Grew to love looking up at the light from the sea floor.'],
      ['魚の群れに混じって泳いでも、逃げられなくなった。', 'Could swim right into a school of fish without scattering it.'],
      ['採った真珠で、母に髪飾りを作った。', 'Made {his} mother a hair ornament from a pearl {he} brought up.']] }),
  path({ id: 'tr.sea.pirate', name: ['海賊船の見習い', 'Pirate ship cabin hand'], where: ['港に流れ着いた海賊船', 'a pirate ship drifting into port'], heq: [12, 50], tags: ['sea'], talents: ['might', 'luck'],
    stats: { power: 1, luck: 1, wealth: 1 }, traits: ['sk.sail', 'sk.sword', 'sk.throw', 'sk.nerve', 'sk.balance'], risk: { hazard: 'violence', p: 0.005 },
    start: ['{name}は海賊船の見習いになった。船長は片目に眼帯をしていたが、両目とも見えていた。', '{name} became a cabin hand on a pirate ship. The captain wore an eyepatch, though both eyes worked fine.'],
    fails: [['宝の地図を一年かけて解いた。印のところには「ここではない」と書かれた紙が埋まっていた。', 'Spent a year cracking a treasure map. At the X, someone had buried a note: "Not here."'],
      ['「帆を上げろ」と言われて、帆を高く掲げて歌った。違う意味だった。', 'Told to "raise the sails", {he} held one up high and sang to it. Wrong meaning.'],
      ['船長の肩のオウムに一年口げんかで負け続けた。オウムが新しい悪口を覚えた。', "Lost every argument with the captain's parrot for a whole year. The parrot learned some new insults from it."]],
    lines: [['揺れる甲板の上でも、紅茶をこぼさずに運べるようになった。', 'Could carry a cup of tea across a pitching deck without spilling a drop.'],
      ['嵐の夜、船長が「お前がいて助かった」とぼそっと言った。', 'On a stormy night, the captain muttered, "Glad you were here."'],
      ['海賊の歌を全部覚えた。半分は掃除の歌だった。', 'Learned every pirate shanty. Half of them were about cleaning.']] }),

  // ---- 砂漠の遊牧の地 ----------------------------------------------------------------
  path({ id: 'tr.desert.caravan', name: ['隊商と星読み', 'Caravans and star-reading'], where: ['オアシスの隊商宿', 'a caravanserai at the oasis'], heq: [10, 70], tags: ['desert'], talents: ['wits', 'luck', 'charm'],
    stats: { wealth: 1, luck: 1, mind: 1 }, traits: ['sk.compass', 'sk.negotiate', 'sk.appraise', 'sk.survive', 'sk.dowsing'], risk: { hazard: 'violence', p: 0.003 },
    start: ['{name}は隊商に加わり、夜は星を読んで道を探すことを習った。', '{name} joined a caravan and learned to find the way by reading the stars at night.'],
    fails: [['星を読んで隊商を導いた。三日後、出発したオアシスに戻ってきた。', 'Guided the caravan by the stars. Three days later, they arrived back at the oasis they had left.'],
      ['ラクダと値段の交渉をしてしまった。ラクダが勝った。', 'Somehow ended up haggling with a camel. The camel won.'],
      ['蜃気楼の町で商売をしようとして、一年分の荷を砂に並べた。', 'Set up shop in a mirage town and laid out a whole year\'s worth of goods on the sand.']],
    lines: [['砂の色で、明日の風がわかるようになった。', 'Could read tomorrow\'s wind from the color of the sand.'],
      ['市場で値切ると、商人たちが嫌な顔をするようになった。一人前の証だった。', 'Merchants started groaning when {he} came to haggle. A sign {he} had made it.'],
      ['ラクダの一頭が、{name}にだけ懐いた。名前をつけた。', 'One of the camels took to {name} and only {name}. {He} gave it a name.']] }),

  // ---- 獣人の森 ----------------------------------------------------------------
  path({ id: 'tr.beast.pack', name: ['群れで狩る', 'Hunting with the pack'], where: ['森の群れの長', 'the elder of the forest pack'], heq: [8, 60], tags: ['rural'], races: BEASTS, talents: ['might', 'luck'],
    stats: { power: 1, hp: 1, charm: 1 }, traits: ['sk.hunt', 'sk.track', 'sk.packbond', 'sk.scent', 'sk.swift'], risk: { hazard: 'monster', p: 0.004 },
    start: ['{name}は群れの狩りについて行くことを許された。まずは風下に立つことから教わった。', '{name} was allowed to join the pack hunt. Lesson one was standing downwind.'],
    fails: [['獲物の足跡を一日追った。自分の足跡だった。', 'Tracked prey for a whole day. They were {his} own footprints.'],
      ['獲物の前で尻尾を振ってしまい、毎回気づかれた。尻尾は言うことを聞かなかった。', 'Kept wagging {his} tail in front of the prey and getting spotted. The tail would not listen.'],
      ['遠吠えの練習をしたら、森じゅうの群れが集まってきた。全員に謝った。', 'Practiced howling and summoned every pack in the forest. Had to apologize to all of them.']],
    lines: [['風の匂いだけで、獲物のいる方角がわかるようになった。', 'Could tell where the prey was from the scent on the wind.'],
      ['仕留めた獲物を、一番に長老へ運んだ。群れの皆が耳を立てて見ていた。', 'Brought the first share of the kill to the elder. The whole pack watched with ears pricked.'],
      ['群れの子どもたちが、{name}の後ろをついて歩くようになった。', "The pack's young ones started trailing behind {name} everywhere."]] }),

  // ---- 神話の時代 ----------------------------------------------------------------
  path({ id: 'tr.myth.oracle', name: ['神託所の見習い', 'Apprentice at the oracle'], where: ['霧の立つ神託所', 'the misty oracle shrine'], heq: [8, 80], tags: ['myth'], not: ['cultivation'], talents: ['magic', 'charm'],
    stats: { mind: 1, luck: 1, charm: 1 }, traits: ['sk.divine', 'sk.dream', 'sk.prayer', 'sk.ritual', 'sk.intuition'],
    start: ['{name}は神託所の見習いになった。巫女は「神々は気まぐれだ」とだけ教えた。', '{name} became an apprentice at the oracle. The priestess offered one lesson: "The gods are fickle."'],
    fails: [['神託を受けた。「明日は晴れ」だった。大雨だった。', 'Received a divine prophecy: "Sunny tomorrow." It poured.'],
      ['煙で未来を占ったら、鍋が焦げているだけだった。', 'Read the future in the smoke. It was only the stew burning.'],
      ['神の声が聞こえたと思ったら、隣の山の羊飼いが叫んでいた。', 'Thought {he} heard a god speaking. It was a shepherd yelling on the next mountain over.']],
    lines: [['夢の中で、誰かに名前を呼ばれるようになった。', 'In {his} dreams, someone had begun calling {his} name.'],
      ['巫女の言う謎かけが、少しだけ解けるようになった。', "Began to make some sense of the priestess's riddles."],
      ['お告げを聞きに来た英雄に、道を教えた。英雄はお礼に林檎をくれた。', 'Gave directions to a hero who came for a prophecy. The hero gave {him} an apple in thanks.']] }),

  // ---- 辺境の開拓村 ----------------------------------------------------------------
  path({ id: 'tr.frontier.build', name: ['開拓と家づくり', 'Clearing land and building'], where: ['開拓村の大工', 'the frontier carpenter'], heq: [10, 70], tags: ['rural'], tech: [4, 4], talents: ['craft', 'might'],
    stats: { hp: 1, power: 1, wealth: 1 }, traits: ['sk.build', 'sk.fortify', 'sk.axe', 'sk.survive'], risk: { hazard: 'accident', p: 0.003 },
    start: ['{name}は開拓村の大工について、森を切り拓き始めた。', '{name} joined the frontier carpenter and began clearing the forest.'],
    fails: [['立派な小屋を建てた。扉を付け忘れ、窓から出入りした。', 'Built a fine cabin. Forgot the door. Came and went through the window.'],
      ['村を守る柵を作った。一年後、柵の内側に村が収まっていないと気づいた。', 'Built a fence to protect the village. A year later, noticed half the village was on the wrong side of it.'],
      ['倒す木の向きを見誤り、自分の家の上に倒した。また建て直せる、と大工は笑った。', "Misjudged which way a tree would fall. It fell on {his} own house. The carpenter laughed and said that was good practice."]],
    lines: [['自分で建てた家で眠る夜は、格別だった。', 'Nights spent sleeping in a house {he} built were something special.'],
      ['新しく来た家族のために、皆で一日で家を建てた。', 'The whole village raised a house in one day for a newly arrived family.'],
      ['斧を振るう音が、すっかり村の朝の音になった。', 'The sound of {his} axe had become part of every morning in the village.']] }),
];

export const METHODS: TrainMethod[] = [
  method({ id: 'm.arena', name: ['闘技場で賭け試合', 'Prize fights in the arena'], speed: 42, failP: 0.15, risk: { hazard: 'violence', p: 0.01 }, minHeq: 16, tags: ['fantasy', 'myth'],
    start: ['〈{target}〉は修羅場で磨くと決め、闘技場の賭け試合に名前を書いた。', 'Decided "{target}" was best honed in the heat of battle, and signed up for prize fights at the arena.'],
    steps: [['三連勝した。賭け屋が{name}に賭け始めた。', 'Won three in a row. The bookmakers started betting on {name}.'],
      ['観客が{name}の名前を叫ぶようになった。〈{target}〉が体に馴染んできた。', 'The crowd began chanting {name}\'s name. "{target}" was starting to feel natural.']],
    fails: [['入場の決めポーズを考えるのに夢中で、試合が始まったことに気づかなかった。', 'Was so busy working on {his} entrance pose that {he} missed the start of the match.'],
      ['自分に全財産を賭けた。その日の相手は、去年のチャンピオンだった。', 'Bet everything on {himself}. That day, {he} drew last year\'s champion.']],
    done: ['最後の試合のあと、観客が総立ちで拍手した。賭け金は全部、宿代に消えた。', 'After the final bout, the whole arena stood and cheered. The winnings all went on rent.'] }),
];
