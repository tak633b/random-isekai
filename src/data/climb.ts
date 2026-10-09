// 成り上がりの道 (engine/climb.ts)。「何を鍛える？」の見直しの年に、今の身分から上へ行ける道が1つ候補に出る。
// 数年かけて進み (speed、100 で果たす)、途中で失敗もする。果たすと身分が変わり、年表に「奴隷 → 平民」と残る。
// need は能力・しるし・職の条件。set は果たしたときに立てるしるし (knighted は騎士、lord は領主の職にもなる)
import type { ClimbRoute } from '../engine/types';

type R = Omit<ClimbRoute, 'name' | 'start' | 'steps' | 'fails' | 'done'> & {
  name: [string, string]; start: [string, string]; steps: [[string, string], [string, string]]; fails: [string, string][]; done: [string, string];
};
const t = ([ja, en]: [string, string]) => ({ ja, en });
const route = (r: R): ClimbRoute => ({ ...r, name: t(r.name), start: t(r.start), steps: [t(r.steps[0]), t(r.steps[1])], fails: r.fails.map(t), done: t(r.done) });

const OLD: ClimbRoute['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern', 'industrial'];

export const ROUTES: ClimbRoute[] = [
  // ---- 奴隷から ----------------------------------------------------------------
  route({ id: 'c.buy-freedom', from: ['slave'], to: 'poor', name: ['自分を買い戻す', 'Buy your own freedom'], speed: 18, failP: 0.15, heq: [12, 60],
    start: ['{name}は、わずかな駄賃を床板の下に貯め始めた。自分の値段まで、あと何年かかるだろう。', '{name} began hiding scraps of pay under a floorboard. How many years until it added up to {his} own price?'],
    steps: [['床下の金が、ようやく片手で持てない重さになった。', 'The hoard under the floor was finally too heavy to lift with one hand.'],
      ['主人に「最近よく働くな」と言われた。理由は言わなかった。', 'The master remarked that {name} had been working hard lately. {He} did not say why.']],
    fails: [['貯めた金をねずみが巣に使っていた。硬貨は無事だったが、数え直しに一晩かかった。', 'Mice had built a nest in the savings. The coins were fine, but recounting took all night.'],
      ['主人が値段を上げた。「腕が上がったからな」と褒められた。', 'The master raised {his} price. "You\'ve gotten more skilled," he said, as a compliment.']],
    done: ['最後の一枚を数え終え、{name}は自分を買い戻した。証文が燃える匂いを、一生覚えている。', '{name} counted out the last coin and bought {his} freedom. {He} remembered the smell of the burning contract forever.'] }),
  route({ id: 'c.win-freedom', from: ['slave'], to: 'poor', name: ['手柄で自由を勝ち取る', 'Win your freedom by a deed'], speed: 30, failP: 0.12, risk: { hazard: 'violence', p: 0.012 }, heq: [14, 50], need: { stat: ['power', 40] },
    start: ['闘技場の勝者は自由になれる、と聞いた。{name}は木の剣を手に取った。', 'Word was that champions of the arena could win their freedom. {name} picked up a wooden sword.'],
    steps: [['三回勝った。観客が{name}の名を覚え始めた。', 'Three wins. The crowd began to learn {name}\'s name.'],
      ['次で決勝だった。前の晩、眠れなかった。', 'The final was next. {He} did not sleep the night before.']],
    fails: [['入場のとき、かっこよく見えるように回ってみたら、目が回って負けた。', 'Spun around on entering the arena to look impressive. Got dizzy and lost.']],
    done: ['最後の相手が膝をついた。主人は渋い顔で、それでも証文を破った。', 'The last opponent went down on one knee. The master scowled, but tore up the contract.'] }),
  route({ id: 'c.favor', from: ['slave'], to: 'commoner', name: ['主人の信を得て解き放たれる', 'Earn the master\'s trust'], speed: 22, failP: 0.12, heq: [12, 70], need: { stat: ['charm', 50] },
    start: ['{name}は、誰よりも先に起き、誰よりも丁寧に働くことにした。', '{name} resolved to rise before everyone else and work more carefully than anyone.'],
    steps: [['主人の帳簿を任されるようになった。', 'Was trusted with the master\'s ledgers.'],
      ['主人の子どもたちに、読み書きを教えるようになった。', 'Began teaching the master\'s children to read.']],
    fails: [['主人の大事な壺を割った。とても正直に謝った。信用は少しだけ減った。', "Broke the master's prized vase. Apologized very honestly. Lost only a little trust."]],
    done: ['主人の遺言に、{name}を自由にすると書いてあった。家族も皆、うなずいた。', "The master's will set {name} free. The whole family nodded in agreement."] }),

  // ---- 孤児・貧しい生まれから ----------------------------------------------------------------
  route({ id: 'c.apprentice', from: ['orphan', 'poor'], to: 'commoner', name: ['職人の徒弟になる', 'Become an apprentice'], speed: 26, failP: 0.12, heq: [10, 22],
    start: ['{name}は工房の戸を毎朝叩いた。七日目に、親方が根負けした。', '{name} knocked on the workshop door every morning. On the seventh day the master gave in.'],
    steps: [['掃除だけの一年が終わり、初めて道具に触らせてもらえた。', 'After a year of nothing but sweeping, {he} was finally allowed to touch the tools.'],
      ['親方の作業の半分を任されるようになった。', 'Was trusted with half of the master\'s work.']],
    fails: [['親方の昼飯を、まちがえて食べた。三日、口をきいてもらえなかった。', "Ate the master's lunch by mistake. Got the silent treatment for three days."]],
    done: ['年季が明けた。親方は自分の古い道具一式をくれた。', 'The apprenticeship ended. The master handed over a full set of old tools.'] }),
  route({ id: 'c.adopted', from: ['orphan'], to: 'commoner', name: ['養子の口を探す', 'Find a family'], speed: 35, failP: 0.15, heq: [5, 14],
    start: ['孤児院の院長が、{name}の養い親を探し始めた。', 'The orphanage matron began looking for a family to take {name} in.'],
    steps: [['子どものいない夫婦が、二度会いに来た。', 'A childless couple came to visit, twice.'],
      ['週末だけ、その家で過ごすことになった。', '{He} started spending weekends at their house.']],
    fails: [['会いに来た夫婦の前で緊張しすぎて、ずっと敬礼していた。', 'Was so nervous meeting the couple that {he} saluted them the entire time.']],
    done: ['新しい家の表札に、{name}の名前が足された。', "{name}'s name was added to the nameplate of the new home."] }),
  route({ id: 'c.steady', from: ['poor'], to: 'commoner', name: ['堅い仕事で家を借りる', 'Steady work, a real home'], speed: 22, failP: 0.12, heq: [16, 60], need: { job: true },
    start: ['日雇いをやめ、毎日同じ場所で働くことにした。', '{name} gave up day labor and committed to working in one place every day.'],
    steps: [['初めて、月の終わりに金が残った。', 'For the first time, there was money left at the end of the month.'],
      ['大家に「あんたなら貸してもいい」と言われた。', 'A landlord said, "For you, I\'d rent."']],
    fails: [['給金の日に、全部を屋台の串焼きに使った。おいしかった。', 'Spent the whole payday on skewers from a food stall. They were delicious.']],
    done: ['小さいが、自分の名で借りた家に入った。', '{name} moved into a small house, rented in {his} own name.'] }),

  // ---- 平民から ----------------------------------------------------------------
  route({ id: 'c.fortune', from: ['commoner', 'poor'], to: 'merchant', name: ['商いで一財産を築く', 'Make a fortune in trade'], speed: 16, failP: 0.2, heq: [18, 65], need: { stat: ['wealth', 35] },
    start: ['{name}は有り金をはたいて、最初の荷車を買った。', '{name} spent everything on a first trading cart.'],
    steps: [['店を一軒持った。帳簿の数字が、夜に夢に出るようになった。', 'Opened a shop. Ledger numbers began appearing in {his} dreams.'],
      ['ほかの町にも支店を出した。商人組合から招待状が来た。', 'Opened a branch in another town. An invitation came from the merchants\' guild.']],
    fails: [['流行ると読んで仕入れた品が、全部大根だった。なぜ大根にしたのかは、本人にも分からない。', 'Bet everything on a trend that turned out to be radishes. Nobody, including {name}, knows why radishes.'],
      ['うまい儲け話に乗った。話した男は翌朝いなくなっていた。', 'Jumped on a great opportunity. The man who pitched it was gone by morning.']],
    done: ['組合の名簿に、{name}の店の名が太字で載った。', "{name}'s shop was listed in bold in the guild registry."] }),
  route({ id: 'c.knight', from: ['commoner', 'merchant', 'poor'], to: 'gentry', name: ['手柄を立てて騎士に取り立てられる', 'Be knighted for valor'], speed: 16, failP: 0.12, risk: { hazard: 'war', p: 0.012 }, heq: [16, 45], tags: OLD, need: { stat: ['power', 50] }, set: 'knighted',
    start: ['{name}は領主の兵に志願した。平民から騎士になった者もいる、と聞いたから。', '{name} volunteered for the lord\'s army. People said a commoner could become a knight.'],
    steps: [['小隊を任された。部下は全員、{name}より年上だった。', 'Was given command of a squad. Every soldier in it was older than {him}.'],
      ['戦場で、領主の旗を拾って守り抜いた。', 'On the battlefield, {he} picked up the fallen banner of the lord and defended it.']],
    fails: [['叙任の練習で、剣を肩に当てる役の人の足を踏んだ。', 'At knighting rehearsal, {he} stepped on the foot of the person holding the sword.']],
    done: ['剣が肩に置かれ、{name}は騎士になった。母が見ていたら何と言っただろう。', 'A blade touched {his} shoulder, and {name} became a knight. {He} wondered what Mother would have said.'] }),
  route({ id: 'c.scholar', from: ['commoner', 'poor', 'merchant'], to: 'gentry', name: ['特待生から官吏になる', 'Scholarship student to official'], speed: 16, failP: 0.14, heq: [12, 40], need: { stat: ['mind', 60] },
    start: ['平民でも成績次第で学院に入れる、と知った。{name}は夜明けまで机に向かった。', 'Learning that even commoners could enter the academy on merit, {name} studied until dawn.'],
    steps: [['特待生として入学した。貴族の子たちに、靴の古さを笑われた。', 'Entered on scholarship. The noble children laughed at {his} worn-out shoes.'],
      ['首席で卒業した。靴の古さを笑った子たちが、拍手していた。', 'Graduated at the top of the class. The children who had laughed at the shoes were applauding.']],
    fails: [['試験の前の晩に知恵熱を出した。答案には、自分の名前だけ書いた。', 'Ran a fever from overstudying the night before the exam. Wrote only {his} name on the paper.']],
    done: ['官吏の任官状が届いた。家の前に、近所の人が集まっていた。', 'The letter of appointment arrived. The neighbors gathered outside to see.'] }),

  // ---- 郷士・騎士から ----------------------------------------------------------------
  route({ id: 'c.land', from: ['gentry'], to: 'noble', name: ['功で領地を賜る', 'Be granted land'], speed: 12, failP: 0.15, heq: [22, 60], tags: OLD, need: { stat: ['fame', 35] }, set: 'lord',
    start: ['辺境の荒れ地を治める者を王が探している、と聞いた。{name}は名乗り出た。', 'The king was looking for someone to govern a wasteland on the frontier. {name} volunteered.'],
    steps: [['開拓村の人口が百を越え、全員の名前は覚えきれなくなった。', 'The settlement passed a hundred people. {He} could no longer remember every name.'],
      ['街道が通った。税の申告書を自分で書く日々が始まった。', 'A road came through. So did the days of filling out tax forms personally.']],
    fails: [['領民に税を下げると約束しすぎて、領主の館の屋根が一年直せなかった。', 'Promised too many tax cuts, and the manor roof went unrepaired for a year.']],
    done: ['王の使者が来て、{name}に家名と領地を与えた。', "The king's envoy arrived and granted {name} a family name and land."] }),
  route({ id: 'c.adopt-up', from: ['gentry', 'merchant'], to: 'noble', name: ['名家の養子に迎えられる', 'Be adopted into a great house'], speed: 14, failP: 0.12, heq: [16, 40], tags: ['fantasy', 'japan', 'eastern'], need: { stat: ['charm', 60] },
    start: ['跡取りのいない名家の当主に、{name}は気に入られた。', 'The head of a great house with no heir took a liking to {name}.'],
    steps: [['屋敷の晩餐に呼ばれるようになった。フォークの順番を三日で覚えた。', 'Began receiving dinner invitations to the mansion. Learned the order of the forks in three days.'],
      ['当主の親族に囲まれ、値踏みされた。笑顔で耐えた。', 'Was surrounded and appraised by the relatives. Smiled through it.']],
    fails: [['親族の前で、皿の料理を「これ何ですか」と聞いた。高級な茸だった。', 'Asked the relatives "What is this?" about the dish on {his} plate. It was a very expensive mushroom.']],
    done: ['縁組みの証文に判が押された。{name}は名家の跡取りになった。', "The adoption papers were sealed. {name} became heir to the great house."] }),

  // ---- 貴族から ----------------------------------------------------------------
  route({ id: 'c.gekokujo', from: ['noble'], to: 'royal', name: ['下剋上', 'Overthrow the throne'], speed: 9, failP: 0.25, risk: { hazard: 'execution', p: 0.03 }, heq: [25, 60], tags: ['fantasy', 'japan', 'eastern'], need: { stat: ['fame', 55] },
    start: ['王の悪政が続いていた。{name}は、旗を掲げることを考え始めた。', 'The king\'s misrule went on. {name} began to think about raising a banner.'],
    steps: [['味方の貴族が三家になった。夜の密談が増えた。', 'Three noble houses had joined. The midnight meetings multiplied.'],
      ['王都の門の前に、{name}の旗が並んだ。', "{name}'s banners lined up before the gates of the capital."]],
    fails: [['密談の場所を、まちがえて王の別荘にした。全員、全力で走って逃げた。', 'Accidentally held the secret meeting at the king\'s own summer house. Everyone ran for their lives.']],
    done: ['王冠が、{name}の頭に載せられた。思っていたより重かった。', 'The crown was placed on {name}\'s head. It was heavier than expected.'] }),

  // ---- 没落からの再興 ----------------------------------------------------------------
  route({ id: 'c.restore', from: ['poor', 'commoner'], to: 'gentry', name: ['家を再興する', 'Restore the family name'], speed: 16, failP: 0.15, heq: [16, 60], need: { flag: 'fallen' },
    start: ['手放した屋敷の前を通るたびに、{name}は立ち止まった。取り戻すと決めた。', 'Every time {name} passed the lost estate, {he} stopped. {He} decided to win it back.'],
    steps: [['昔の家臣が一人、また一人と戻ってきた。', 'One by one, the old retainers came back.'],
      ['屋敷の新しい持ち主が、売ってもいいと言った。', 'The new owner of the estate said they would be willing to sell.']],
    fails: [['再興の資金を集める宴を開いたら、宴の費用で赤字になった。', 'Threw a banquet to raise funds for the restoration. The banquet itself ran a deficit.']],
    done: ['屋敷の門に、家の紋がもう一度掛けられた。', 'The family crest hung once more over the gate of the estate.'] }),
];
