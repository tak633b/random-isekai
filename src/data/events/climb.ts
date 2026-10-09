// 成り上がりと没落の出来事 (engine/climb.ts)。standing は今の身分 (status は生まれの身分)。
// set: 'ruined' はその年に失脚して貧民に落ちる (しるし fallen が立ち、「家を再興する」道が開く)
import type { EventDef } from '../../engine/types';

const LOW: EventDef['standing'] = ['slave', 'orphan', 'poor'];
const OLD: EventDef['tags'] = ['fantasy', 'japan', 'eastern', 'cultivation'];

export const EVENTS: EventDef[] = [
  {
    id: 'cl.orphanage', stage: ['child'], status: ['orphan'], w: 2, kind: 'family',
    ja: '孤児院の夕食は、いつも誰かと半分こだった。{name}は一番小さい子に、自分の半分をあげる係だった。',
    en: 'Supper at the orphanage was always split in half with someone. {name} was the one who gave {his} half to the smallest child.',
    eff: { charm: 2, hp: -1 },
  },
  {
    id: 'cl.looked-down', stage: ['teen', 'adult'], standing: LOW, w: 2, kind: 'hard',
    ja: '「お前のような身分の者が」と、{name}は何度も言われた。言い返す代わりに、その言葉を数えることにした。',
    en: '"Someone of your station..." {name} heard it again and again. Instead of answering back, {he} started keeping count.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: 'いつか見返すと誓う', en: 'Swear to prove them wrong', eff: { power: 2, mind: 2, happy: -1 }, log: { ja: '数えた言葉は、三百を越えたところで、やる気に変わった。', en: 'Somewhere past three hundred, the count turned into fuel.' } },
      { ja: '笑って受け流す', en: 'Laugh it off', eff: { charm: 3, happy: 1 }, log: { ja: '言った側が、だんだん気まずそうになっていった。', en: 'The ones saying it grew steadily more awkward.' } },
    ] },
  },
  {
    id: 'cl.free-a-slave', stage: ['adult', 'middle'], standing: ['commoner', 'merchant', 'gentry', 'noble'], tags: OLD, w: 0.8, kind: 'love',
    ja: '奴隷市場の前で、{name}は足を止めた。鎖につながれた若者が、こちらを見ていた。',
    en: '{name} stopped in front of the slave market. A young person in chains was looking right at {him}.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '買い取って、その場で解き放つ', en: 'Buy them and set them free on the spot', eff: { wealth: -10, charm: 4, happy: 4 }, log: { ja: '解き放った若者は、なぜか{name}についてきた。「恩を返すまで」と言っている。', en: 'The freed youth followed {name} anyway. "Until I repay the debt," they said.' } },
      { ja: '目をそらして通り過ぎる', en: 'Look away and walk on', eff: { happy: -3 }, log: { ja: 'その晩、あの目を何度も思い出した。', en: 'That night, {he} kept remembering those eyes.' } },
    ] },
  },
  {
    id: 'cl.third-son', stage: ['teen', 'adult'], status: ['gentry', 'noble'], sex: 'M', tags: OLD, w: 1, kind: 'work',
    ja: '三男の{name}に回ってきたのは、家の領地のうち一番やせた、石だらけの村一つだった。',
    en: 'As the third son, {name} inherited the poorest scrap of the family lands: a single rocky village.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '前向きに領地経営を始める', en: 'Start running it properly', eff: { mind: 3, wealth: 3, fame: 2 }, log: { ja: '石を積んで段々畑にした。三年目、兄たちの領地より収穫が多かった。', en: 'Stacked the stones into terraced fields. In the third year, the harvest beat both older brothers\' lands.' } },
      { ja: '村は代官に任せて王都で遊ぶ', en: 'Leave it to a steward and enjoy the capital', eff: { happy: 4, wealth: -5 }, log: { ja: '代官が優秀で、村は勝手に栄えた。手柄は代官のものになった。', en: 'The steward was brilliant and the village thrived on its own. The credit went to the steward.' } },
    ] },
  },
  {
    id: 'cl.scholarship', stage: ['teen'], standing: ['poor', 'commoner', 'orphan'], tags: ['fantasy', 'japan', 'eastern'], magic: 1, w: 1, kind: 'school', set: 'academy',
    ja: '学院の入試で、平民の{name}が首席を取った。合格発表の前で、貴族の子たちがざわついた。',
    en: 'A commoner, {name}, took first place in the academy entrance exam. The noble children by the results board started whispering.',
    eff: { mind: 4, fame: 3 },
  },
  {
    id: 'cl.ex-party-envy', stage: ['adult', 'middle'], flag: 'exiled', standing: ['commoner', 'merchant', 'gentry', 'noble'], w: 2, kind: 'fame',
    ja: '昔、{name}を追い出したパーティの元仲間が、酒場の隅で{name}の噂話をしていた。今の{name}の身分を聞いて、黙った。',
    en: 'In the corner of a tavern, the old party that had kicked {name} out were gossiping about {him}. When they heard what {his} standing was now, they went quiet.',
    eff: { happy: 5 },
  },
  {
    id: 'cl.ruined-debt', stage: ['adult', 'middle'], standing: ['merchant', 'gentry', 'noble'], w: 0.5, kind: 'loss', big: true, set: 'ruined',
    ja: '頼まれて保証人になった親戚が、借金を残して消えた。差し押さえの役人は、礼儀正しく、容赦がなかった。',
    en: 'A relative {name} had co-signed for vanished, leaving the debt behind. The bailiffs were polite, and merciless.',
    eff: { wealth: -30 },
  },
  {
    id: 'cl.ruined-intrigue', stage: ['adult', 'middle'], standing: ['gentry', 'noble'], tags: OLD, w: 0.4, kind: 'loss', big: true, set: 'ruined',
    ja: '宮廷の政争で、{name}の家は負けた側についていた。一夜にして、屋敷の門に別の家の紋が掛かった。',
    en: "In a palace power struggle, {name}'s house backed the losing side. Overnight, another family's crest hung over the gate.",
    eff: { wealth: -25, fame: -5 },
  },
  {
    id: 'cl.fallen-life', stage: ['adult', 'middle', 'elder'], flag: 'fallen', standing: ['poor', 'commoner'], w: 2, kind: 'hard',
    ja: '没落してから、初めて自分で洗濯をした。思ったより楽しかった。',
    en: 'After the fall, {name} did {his} own laundry for the first time. It was more fun than expected.',
    eff: { happy: 2, hp: 1 },
  },
  {
    id: 'cl.top-view', stage: ['adult', 'middle', 'elder'], status: ['slave', 'orphan', 'poor'], standing: ['gentry', 'noble', 'royal'], w: 2, kind: 'fame',
    ja: '高い館の窓から町を見下ろした。昔、あの路地で寝ていた夜のことを、{name}はまだ覚えている。',
    en: 'From a high window of the manor, {name} looked down on the town. {He} still remembered the nights spent sleeping in those alleys.',
    eff: { happy: 3, charm: 1 },
  },
];
