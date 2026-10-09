// 鍛える道: 和の国 (japan) と仙侠の大陸 (cultivation)。書き方は paths.ts と同じ
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

export const PATHS: TrainPath[] = [
  // ---- 和の国 ----------------------------------------------------------------
  path({ id: 'tr.wa.ninja', name: ['忍びの里', 'The hidden village'], where: ['山奥の忍びの里', 'a hidden village deep in the mountains'], heq: [8, 45], tags: ['japan'], talents: ['luck', 'might'],
    stats: { luck: 1, power: 1 }, traits: ['sk.ninjutsu', 'sk.stealth', 'sk.throw', 'sk.climb'], risk: { hazard: 'violence', p: 0.003 },
    start: ['{name}は忍びの里に入った。最初の課題は、屋根の上で一晩じっとしていることだった。', '{name} entered the hidden village. The first task was to sit still on a rooftop all night.'],
    fails: [['手裏剣の練習で、的より先に師匠の干し柿を全部落とした。', "Practiced with throwing stars and knocked down every one of the master's drying persimmons before hitting a single target."],
      ['変わり身の術で丸太と入れ替わった。戻り方を習っていなかった。', 'Swapped places with a log using the substitution technique. Had not yet learned how to swap back.'],
      ['煙玉を投げて姿を消した。煙が晴れると、{name}だけがまだむせていた。', 'Threw a smoke bomb and vanished. When the smoke cleared, {name} was the only one still coughing.']],
    lines: [['屋根から屋根へ跳べるようになった。猫に一目置かれた。', 'Could leap from roof to roof now. The cats began to show {him} some respect.'],
      ['里の子どもたちと隠れんぼをしたら、三日見つけてもらえなかった。', 'Played hide-and-seek with the village kids. Nobody found {him} for three days.'],
      ['足音を消すのに慣れすぎて、家族によく驚かれるようになった。', 'Got so used to silent steps that the family kept jumping when {he} walked in.']] }),
  path({ id: 'tr.wa.iai', name: ['居合の道場', 'The iaido hall'], where: ['城下の居合道場', 'an iaido hall below the castle'], heq: [10, 70], tags: ['japan'], talents: ['might'],
    stats: { power: 2, mind: 1 }, traits: ['sk.iai', 'sk.sword', 'sk.nerve'], cost: 1, risk: { hazard: 'accident', p: 0.002 },
    start: ['{name}は居合の道場に通い始めた。一年目は、刀を抜かずに座る稽古だった。', '{name} began attending an iaido hall. The first year was all about sitting with the sword still sheathed.'],
    fails: [['抜く速さだけを鍛えすぎて、刀が鞘ごと飛んでいった。', 'Trained the draw so hard that the sword flew off, sheath and all.'],
      ['正座の稽古で足がしびれ、立ち上がった瞬間に師範へ倒れ込んだ。師範は「隙あり」と言った。', 'Legs went numb during the kneeling drill. Stood up and toppled straight into the master, who said, "Opening spotted."'],
      ['一年かけて見事な納刀を覚えた。抜刀はまだだった。', 'Spent a year perfecting how to sheathe the sword. Drawing it was still on the list.']],
    lines: [['師範の前で一太刀。蝋燭の火だけが消えた。', 'One stroke in front of the master. Only the candle flame went out.'],
      ['刀を抜く前に勝負が決まる、という意味が少しわかった。', 'Began to understand what they meant by "the fight ends before the blade leaves the sheath."'],
      ['道場の床の木目を、すべて覚えてしまった。', 'Had memorized every grain in the dojo floorboards.']] }),
  path({ id: 'tr.wa.terakoya', name: ['寺子屋', 'Temple school'], where: ['町はずれの寺子屋', 'the temple school at the edge of {town}'], heq: [7, 16], tags: ['japan'], talents: ['wits'],
    stats: { mind: 2, charm: 1 }, traits: ['sk.letters', 'sk.math', 'sk.calc', 'sk.speedread'],
    start: ['{name}は寺子屋に通い始めた。机は自分で背負って行くものだった。', '{name} started at the temple school. Students carried their own desks there on their backs.'],
    fails: [['手習いの墨を顔じゅうにつけて帰り、母に狸と間違えられた。', 'Came home with ink all over {his} face. {His} mother mistook {him} for a tanuki.'],
      ['そろばんの珠をはじきすぎて、珠が一つ縁側の下へ逃げた。一年探した。', 'Flicked the abacus beads so hard that one escaped under the veranda. Spent the year looking for it.'],
      ['和尚の昼寝の数を数えて、算術の答えとして出した。合っていた。', "Counted the priest's naps and handed it in as {his} arithmetic answer. It was correct."]],
    lines: [['いろは歌を逆から言えるようになった。誰も頼んでいなかった。', 'Learned to recite the iroha poem backwards. Nobody had asked.'],
      ['和尚に「字に人柄が出る」と言われた。字はとても丸かった。', 'The priest said "your character shows in your handwriting". The handwriting was very round.'],
      ['年下の子に読み書きを教える番が回ってきた。', 'It became {his} turn to teach the younger kids their letters.']] }),

  // ---- 仙侠の大陸 ----------------------------------------------------------------
  path({ id: 'tr.xianxia.seclusion', name: ['洞府で閉関', 'Secluded cultivation'], where: ['霊気の濃い山の洞府', 'a cave abode rich in spiritual energy'], heq: [12, 90], tags: ['cultivation'], talents: ['magic'],
    stats: { mind: 2, hp: 1 }, traits: ['sk.qigong', 'sk.bigmana', 'sk.lightfoot', 'sk.manasense'], risk: { hazard: 'magic', p: 0.004 },
    start: ['{name}は洞府の入口を岩でふさぎ、閉関に入った。', '{name} sealed the cave entrance with a boulder and entered secluded cultivation.'],
    fails: [['三年閉関するつもりが、腹が減って三日で出てきた。', 'Meant to stay in seclusion for three years. Hunger brought {him} out in three days.'],
      ['突破の直前にくしゃみをして、気が全部抜けた。', 'Sneezed right on the verge of a breakthrough. All the qi went out with it.'],
      ['入口の岩が重すぎて、出られなくなった。結局、弟弟子に掘り出してもらった。', 'The boulder at the entrance turned out to be too heavy to move. A junior disciple had to dig {him} out.']],
    lines: [['丹田に小さな温かさが灯った。気のせいではなかった。', 'A small warmth lit up in {his} dantian. It was not {his} imagination.'],
      ['瞑想を終えると、一年が過ぎていた。髪がずいぶん伸びた。', 'Opened {his} eyes from meditation to find a year had passed. The hair had grown quite long.'],
      ['洞府の外で鳥が巣を作っていた。邪魔をしないよう、もう少し座った。', 'Birds had built a nest by the entrance. {He} sat a while longer so as not to disturb them.']] }),
  path({ id: 'tr.xianxia.pill', name: ['丹炉の番', 'Tending the pill furnace'], where: ['宗門の丹房', "the sect's alchemy chamber"], heq: [10, 90], tags: ['cultivation'], talents: ['craft', 'wits'],
    stats: { mind: 1, wealth: 1, hp: 1 }, traits: ['sk.alchemy_e', 'sk.brew', 'sk.poisoneye', 'sk.palate'], cost: 2, risk: { hazard: 'accident', p: 0.004 },
    start: ['{name}は丹房で、炉の火の番を任された。弱すぎても強すぎても叱られた。', "{name} was put in charge of the alchemy furnace's fire. Too weak or too strong, {he} got scolded either way."],
    fails: [['丹炉を爆発させた。師匠の眉毛がなくなった。師匠は「二度目だ」と言った。', 'Blew up the pill furnace. The master lost both eyebrows and remarked, "That makes twice."'],
      ['築基丹を練ったつもりが、つやつやの団子ができた。宗門で大人気になった。', 'Set out to refine a Foundation pill and made a glossy dumpling instead. It became a hit across the sect.'],
      ['炉の前で居眠りし、霊草を炭にした。いい匂いだけが残った。', 'Dozed off at the furnace and turned the spirit herbs to charcoal. Only the nice smell remained.']],
    lines: [['丸薬の色だけで出来がわかるようになった。', 'Could tell a pill\'s quality from its color alone.'],
      ['丹房の煙で、{name}の服はいつも薬草の匂いがした。', "Thanks to the furnace smoke, {name}'s clothes always smelled of herbs."],
      ['初めて丹紋が浮かんだ。丹房じゅうの人が見に来た。', 'For the first time, pill patterns appeared on the surface. The whole chamber came to look.']] }),
  path({ id: 'tr.xianxia.sect', name: ['宗門の外門弟子', 'Outer disciple of a sect'], where: ['山の上の剣宗', 'a sword sect on the mountaintop'], heq: [10, 45], tags: ['cultivation'], talents: ['might', 'magic'],
    stats: { power: 2, hp: 1 }, traits: ['sk.swordqi', 'sk.sword', 'sk.formation', 'sk.lightfoot'], risk: { hazard: 'violence', p: 0.003 },
    start: ['{name}は宗門の外門弟子になった。最初の仕事は、九千九百九十九段の石段を掃くことだった。', '{name} became an outer disciple of the sect. The first job was sweeping the nine thousand nine hundred and ninety-nine stone steps.'],
    fails: [['内門の天才に「お前ごとき」と言われた。相手は九歳だった。', 'An inner-sect prodigy sneered, "The likes of you?" The prodigy was nine years old.'],
      ['剣に乗って飛ぶ練習をした。剣だけが飛んでいった。', 'Practiced flying on a sword. Only the sword flew.'],
      ['石段を掃き終えた頃には、一段目にまた落ち葉が積もっていた。', 'By the time {he} finished sweeping the steps, the first one was covered in leaves again.']],
    lines: [['石段を掃くうちに、足腰が驚くほど強くなっていた。たぶんそれが狙いだった。', 'All that sweeping had made {his} legs remarkably strong. That was probably the point.'],
      ['宗門の大会で三回戦まで進んだ。外門では初めてだった。', 'Made it to the third round of the sect tournament. A first for an outer disciple.'],
      ['剣を振ると、刃の先がかすかに光った。', 'When {he} swung the sword, the tip gave off a faint glow.']] }),
];

export const METHODS: TrainMethod[] = [
  method({ id: 'm.eastern.hermit', name: ['仙人の洞窟で百日', 'A hundred days with a hermit'], speed: 40, failP: 0.15, risk: { hazard: 'magic', p: 0.004 }, minHeq: 14, tags: ['cultivation', 'eastern'],
    start: ['〈{target}〉の極意を求め、山奥の仙人の洞窟を訪ねた。百日いろと言われた。', 'Sought the secret of "{target}" at a hermit\'s cave deep in the mountains. Was told to stay a hundred days.'],
    steps: [['仙人は何も教えなかった。ただ、一緒に雲を眺めた。〈{target}〉が少し近づいた気がした。', 'The hermit taught nothing. They just watched the clouds together. "{target}" felt a little closer somehow.'],
      ['百日のうち九十日が過ぎた。仙人が初めて名前を呼んでくれた。', 'Ninety of the hundred days had passed. The hermit finally called {him} by name.']],
    fails: [['百日数えていたら、九十九日目で数をまちがえた。最初からやり直しになった。', 'Lost count on day ninety-nine. Had to start the hundred days over.'],
      ['仙人だと思って仕えていた相手は、山で迷っていたただのお爺さんだった。とても感謝された。', 'The hermit {he} had been serving turned out to be an ordinary old man lost in the mountains. He was very grateful.']],
    done: ['百日目の朝、仙人はもういなかった。岩に「よし」とだけ彫ってあった。', 'On the morning of the hundredth day, the hermit was gone. A single word was carved into the rock: "Good."'] }),
];
