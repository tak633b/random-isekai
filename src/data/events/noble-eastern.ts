// 貴族社会・学園・悪役令嬢もの (nobility) と、和風・中華風/仙侠 (eastern) の出来事。全段階。
// 根拠は docs/research/06-society-and-powers.md 4-5節、03-world-types.md 2-4〜2-6、01-arrival-and-protagonists.md 6.1。
//
// このファイルで作ったしるし:
//   悪役令嬢の筋: ne.doomed (破滅が決まった役だと知っている) → ne.avoid → ne.path_land / ne.path_flee / ne.path_heroine
//                 ne.heroine (ヒロインが現れた) → ne.rivalreborn / ne.broken (婚約破棄された) → ne.cleared / ne.convent
//                 ne.refused (婚約を断った) ne.mob (モブに生まれた) ne.debut (社交界に出た) ne.elope (駆け落ちした)
//   仙侠の段階:  ne.rooted (霊根があった) ne.mortal / ne.stubborn (霊根が無かった) ne.sect (宗門に入った)
//                 ne.qi (練気) → ne.foundation (築基) → ne.core (結丹) → ne.nascent (元嬰) → ne.ascend (天劫を越えた)
//                 段階が上がるほど老いが遅くなる想定 (エンジンが読むなら aging の倍率に)
//   和風・中華:  ne.genpuku (元服) ne.ronin (浪人) ne.studied → ne.exam (科挙に受かった) ne.harem (後宮に入った)
import type { EventDef } from '../../engine/types';

const N: ['nobility'] = ['nobility'];
const E: ['eastern'] = ['eastern'];       // 和風と中華風の両方で起きる
const JP: ['japan'] = ['japan'];           // 和風だけ (侍・元服・寺子屋・陰陽師・妖怪・忍び・社)
const CU: ['cultivation'] = ['cultivation']; // 仙侠だけ (宗門・霊根・修行の段階・丹薬・天劫・後宮・科挙)

export const EVENTS: EventDef[] = [
  // ======================================================================
  // 貴族社会・学園・悪役令嬢 (nobility)
  // ======================================================================

  // ---- 乳幼児 ----
  {
    id: 'ne.n.cradle-crest', stage: ['infant'], tags: N, status: ['noble', 'royal'], w: 2, kind: 'child',
    ja: '{name}の揺りかごには家の紋章が刺繍されていた。最初に握ったのは、その金糸の端だった。',
    en: "{name}'s cradle was embroidered with the family crest. The first thing {name} ever grabbed was a loose end of its gold thread.",
    eff: { happy: 2 },
  },
  {
    id: 'ne.n.wetnurse', stage: ['infant'], age: [0, 2], tags: N, status: ['noble', 'royal', 'gentry'], w: 2, kind: 'child',
    ja: '{name}は{mother}ではなく乳母の腕で眠ることを覚えた。乳母は夜ごと、領地の古い歌を歌った。',
    en: "{name} learned to fall asleep in a wet nurse's arms rather than a mother's. Every night she sang old songs from the estate.",
    eff: { happy: 2 }, tie: { role: 'servant', new: true, d: 10 },
  },
  {
    id: 'ne.n.reborn-villainess', stage: ['infant', 'child'], tags: N, arrival: ['reborn'], memory: true, sex: 'F',
    status: ['noble', 'royal'], noFlag: 'ne.doomed', w: 3, kind: 'arrival', big: true,
    ja: '鏡に映った幼い顔を見て、{name}は息をのんだ。前世で遊んだ恋愛ゲームで、最後に断罪される悪役令嬢の顔だった。',
    en: "Seeing her small face in the mirror, {name} froze. It was the face of the villainess from a dating game she had played in her past life, the one who is condemned in the final act.",
    set: 'ne.doomed', eff: { mind: 3, happy: -3 },
    why: { ja: '前世の記憶を持ったまま、物語の悪役の家に生まれた', en: 'Reborn with past-life memories into the family of a story villain' },
  },

  // ---- 子ども ----
  {
    id: 'ne.n.awaken-villainess', stage: ['child', 'teen'], tags: N, arrival: ['awaken'], memory: true, sex: 'F',
    status: ['noble', 'royal'], noFlag: 'ne.doomed', w: 3, kind: 'arrival', big: true,
    ja: '庭で転んで頭を打った{name}は、前世の記憶を取り戻した。ここは恋愛ゲームの世界で、自分は破滅する悪役令嬢だった。',
    en: "{name} fell in the garden, hit her head, and woke with her past life's memories. This world was a dating game, and she was the villainess fated for ruin.",
    set: 'ne.doomed', eff: { mind: 4, happy: -2 },
    why: { ja: '思い出した記憶が、この先の筋書きまで含んでいた', en: 'The returning memories included how the story was meant to end' },
  },
  {
    id: 'ne.n.villain-son', stage: ['child', 'teen'], tags: N, arrival: ['reborn', 'awaken'], memory: true, sex: 'M',
    status: ['noble', 'royal'], noFlag: 'ne.doomed', w: 2, kind: 'arrival', big: true,
    ja: '{name}は自分の名前に聞き覚えがあった。前世で読んだ物語の、ヒロインに嫌がらせをして最後に処刑される貴族の息子の名だ。',
    en: "{name}'s own name sounded familiar. It belonged to the spoiled noble son in a story from his past life, the one who torments the heroine and is executed at the end.",
    set: 'ne.doomed', eff: { mind: 3, happy: -3 },
  },
  {
    id: 'ne.n.mob-relief', stage: ['child', 'teen'], tags: N, memory: true, arrival: ['reborn', 'awaken'],
    status: ['gentry', 'merchant', 'commoner'], noFlag: 'ne.doomed', w: 1.5, kind: 'arrival',
    ja: '{name}はこの国が前世のゲームの舞台だと気づいたが、自分の名前はどこにも出てこなかった。名もない脇役なら、断罪とは無縁だ。',
    en: "{name} realized this kingdom was the setting of a game from a past life, but {name}'s own name never appeared in it. A nameless extra is safe from the climactic trial.",
    set: 'ne.mob', eff: { happy: 4 },
  },
  {
    id: 'ne.n.betrothal', stage: ['child'], tags: N, status: ['noble', 'royal'], noFlag: 'engaged', w: 2, kind: 'family', big: true,
    ja: '{father}の書斎に呼ばれた{name}は、会ったこともない相手との婚約が決まったと告げられた。家同士の取り決めだった。',
    en: "Called into {father}'s study, {name} was told of an engagement to someone {name} had never met. It had been settled between the two houses.",
    set: 'engaged', tie: { role: 'fiance', new: true, d: 0 },
    why: { ja: '貴族の婚約は幼いうちに家同士で決まる', en: 'Noble engagements are arranged between houses while the children are young' },
  },
  {
    id: 'ne.n.doomed-betrothal', stage: ['child'], tags: N, flag: 'ne.doomed', noFlag: 'engaged', w: 4, kind: 'family',
    ja: '筋書きどおり、王子との婚約の話が{name}の家に届いた。この婚約こそが、破滅への最初の一歩だった。',
    en: "Right on schedule, a proposal of engagement to the prince reached {name}'s house. In the story, this engagement was the first step toward ruin.",
    choice: {
      ja: 'この婚約をどうする?', en: 'What will you do about the engagement?',
      options: [
        { ja: '受ける。近くにいれば筋書きを変えられる', en: 'Accept it. Staying close is the only way to change the story', set: 'engaged',
          log: { ja: '{name}は婚約を受け、筋書きの内側から戦うことにした。', en: '{name} accepted, choosing to fight the story from the inside.' } },
        { ja: '熱を装って顔合わせを逃げる', en: 'Fake a fever and skip the meeting', set: 'ne.refused', eff: { charm: -2, happy: 3 },
          log: { ja: '{name}の仮病は三度続き、話は立ち消えになった。', en: "{name}'s fever recurred three times, and the proposal quietly died." } },
      ],
    },
  },
  {
    id: 'ne.n.tutor', stage: ['child'], tags: N, status: ['noble', 'royal', 'gentry'], w: 2, kind: 'school',
    ja: '{name}に家庭教師が付いた。{mentor}は歴史と算術と、嘘をつく大人の見分け方を教えた。',
    en: '{name} was given a private tutor. {mentor} taught history, arithmetic, and how to tell when an adult was lying.',
    eff: { mind: 4 }, tie: { role: 'mentor', new: true, d: 8 },
  },
  {
    id: 'ne.n.etiquette', stage: ['child'], tags: N, status: ['noble', 'royal', 'gentry'], w: 2, kind: 'school',
    ja: '本を頭に載せて廊下を歩く稽古が始まった。{name}が端まで落とさずに歩けたのは、ひと冬が過ぎてからだった。',
    en: "Etiquette lessons began with walking the hall with a book balanced on the head. {name} made it to the end without dropping it only after a whole winter.",
    eff: { charm: 3 },
  },
  {
    id: 'ne.n.avoid-plan', stage: ['child', 'teen'], tags: N, flag: 'ne.doomed', noFlag: 'ne.avoid', w: 5, kind: 'power',
    ja: '{name}は前世の文字で、破滅を避けるための計画をノートに書き出した。この国の誰にも読めない字だ。',
    en: "{name} wrote out a plan to avoid ruin in a notebook, using the script of a past life that no one in this kingdom could read.",
    set: 'ne.avoid', eff: { mind: 2 },
    choice: {
      ja: 'どの道で破滅を避ける?', en: 'Which way out of the bad ending?',
      options: [
        { ja: '領地経営を覚え、身ひとつでも生きられるようにする', en: 'Learn to run the estate so you can survive on your own', set: 'ne.path_land', eff: { mind: 2 } },
        { ja: '国外へ逃げる準備を少しずつ進める', en: 'Quietly prepare to flee the country', set: 'ne.path_flee', eff: { luck: 2 } },
        { ja: 'ヒロインと先に仲良くなっておく', en: 'Befriend the heroine before the story starts', set: 'ne.path_heroine', eff: { charm: 2 } },
      ],
    },
  },
  {
    id: 'ne.n.path-land', stage: ['teen', 'adult'], tags: N, flag: 'ne.path_land', w: 4, kind: 'work',
    ja: '{name}は前世の簿記を思い出して領地の帳簿を直し、執事が十年気づかなかった着服を見つけた。',
    en: "Drawing on bookkeeping from a past life, {name} reorganized the estate ledgers and found an embezzlement the steward had missed for ten years.",
    eff: { mind: 3, wealth: 4, fame: 2 },
  },
  {
    id: 'ne.n.path-flee', stage: ['teen', 'adult'], tags: N, flag: 'ne.path_flee', w: 4, kind: 'hard',
    ja: '{name}は贈られた宝石をひとつずつ換金し、隣国の銀行に偽名の口座を作った。逃げ道は少しずつ太くなった。',
    en: "{name} sold gifted jewels one at a time and opened an account under a false name at a bank across the border. The escape route grew a little wider each month.",
    eff: { wealth: 3, luck: 2 },
  },
  {
    id: 'ne.n.path-heroine', stage: ['teen'], tags: N, flag: 'ne.path_heroine', w: 4, kind: 'love',
    ja: '入学式の朝、{name}は道に迷っていた少女に先に声をかけた。物語のヒロイン、{rival}だった。',
    en: "On the morning of the entrance ceremony, {name} spoke first to a lost-looking girl. It was {rival}, the heroine of the story.",
    set: 'ne.heroine', eff: { charm: 2, happy: 2 }, tie: { role: 'rival', new: true, d: 20 },
  },
  {
    id: 'ne.n.sibling-compare', stage: ['child', 'teen'], tags: N, status: ['noble', 'royal'], w: 1.5, kind: 'family',
    ja: '客の前でいつも{name}と比べられるのは、出来のいい兄弟の方だった。帰りの馬車で、二人とも黙っていた。',
    en: "In front of guests, {name} was always measured against a more accomplished sibling. On the carriage ride home, neither of them said a word.",
    eff: { happy: -2, mind: 1 }, tie: { role: 'sibling', d: -3 },
  },
  {
    id: 'ne.n.scullery', stage: ['child', 'teen'], tags: N, status: ['poor', 'commoner', 'orphan'], w: 2, kind: 'work',
    ja: '{name}は口減らしで貴族の屋敷の下働きに出された。最初の仕事は、銀の燭台を夜明けまで磨くことだった。',
    en: "To ease the family's burden, {name} was sent to work as a scullery hand in a noble manor. The first task was polishing silver candlesticks until dawn.",
    eff: { power: 1, happy: -2, wealth: 1 },
  },
  {
    id: 'ne.n.manor-garden', stage: ['child'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1.5, kind: 'child',
    ja: '{name}は温室の奥に、庭師も知らない小さな隠れ場所を作った。そこでは誰の娘でも息子でもなかった。',
    en: "{name} made a hiding place deep in the greenhouse that even the gardener didn't know about. In there, {name} was nobody's heir.",
    eff: { happy: 3 },
  },
  {
    id: 'ne.n.poison-taster', stage: ['child', 'teen'], tags: N, status: ['noble', 'royal'], w: 0.8, kind: 'hard',
    ja: '晩餐の前、{name}の皿を毒見した召使いが崩れ落ちた。誰が仕込んだのかは、最後まで分からなかった。',
    en: "Before dinner, the servant who tasted {name}'s plate collapsed. Who had poisoned it was never discovered.",
    eff: { happy: -4, mind: 1 }, risk: { hazard: 'violence', p: 0.02 },
    why: { ja: '跡継ぎの座を狙う者が屋敷の中にいた', en: 'Someone inside the house wanted the line of succession to change' },
  },
  {
    id: 'ne.n.mana-test', stage: ['child'], tags: N, status: ['noble', 'royal'], magic: 1, w: 1.5, kind: 'power',
    ja: '魔力の測定で、{name}の水晶は家の誰よりも暗くしか光らなかった。{father}は何も言わずに部屋を出た。',
    en: "At the mana test, {name}'s crystal glowed dimmer than anyone else's in the family. {father} left the room without a word.",
    tie: { role: 'father', d: -4 },
    eff: { happy: -4, mind: 1 },
    why: { ja: 'この国では魔力の強さが家格と結びついている', en: "Here, the strength of one's magic is tied to the family's rank" },
  },

  // ---- 十代 ----
  {
    id: 'ne.n.academy-entry', stage: ['teen'], tags: N, status: ['noble', 'royal', 'gentry'], noFlag: 'academy', w: 4, kind: 'school', big: true,
    ja: '{name}は王立学園に入学した。時計塔の下で、隣の席になった{friend}と同じ方向に迷った。',
    en: '{name} entered the Royal Academy. Under the clock tower, {name} and {friend}, assigned to neighboring seats, got lost in the same direction.',
    set: 'academy', eff: { mind: 3 }, tie: { role: 'friend', new: true, d: 10 },
  },
  {
    id: 'ne.n.scholarship', stage: ['teen'], tags: N, status: ['poor', 'commoner', 'merchant'], noFlag: 'academy', w: 1.5, kind: 'school', big: true,
    ja: '{name}は平民でただ一人の特待生として学園に入った。初日に制服の古さを笑ったのは、伯爵家の{rival}だった。',
    en: "{name} entered the academy as the only commoner on scholarship. On the first day, {rival} of an earl's house laughed at {name}'s secondhand uniform.",
    set: 'academy', eff: { mind: 4, fame: 2, happy: -1 }, tie: { role: 'rival', new: true, d: -10 },
  },
  {
    id: 'ne.n.bottom-class', stage: ['teen'], tags: N, flag: 'academy', w: 2, kind: 'school',
    ja: 'クラス分けで{name}は最下位の組に入れられた。教室は北向きで、窓が一枚割れていた。',
    en: "{name} was placed in the lowest-ranked class. The classroom faced north, and one of its windows was cracked.",
    eff: { happy: -2, power: 1 },
  },
  {
    id: 'ne.n.academy-duel', stage: ['teen'], tags: N, flag: 'academy', w: 1.5, kind: 'battle',
    ja: '中庭で、上級生が{name}の足元に手袋を投げた。決闘の申し込みだった。',
    en: 'In the courtyard, an upperclassman threw a glove at {name}\'s feet. It was a challenge to a duel.',
    choice: {
      ja: '決闘を受ける?', en: 'Accept the duel?',
      options: [
        { ja: '受ける', en: 'Accept', eff: { power: 3, fame: 3 }, risk: { hazard: 'violence', p: 0.01 },
          log: { ja: '{name}は模擬剣で相手の剣を弾き飛ばし、翌日から廊下で道を譲られるようになった。', en: '{name} knocked the practice sword from the challenger\'s hand, and from the next day people stepped aside in the halls.' } },
        { ja: '笑って手袋を拾い、返す', en: 'Laugh, pick up the glove, and hand it back', eff: { charm: 2, fame: -1 },
          log: { ja: '手袋を返された上級生は、怒るきっかけを失った。', en: 'Handed back his own glove, the upperclassman lost his chance to be angry.' } },
      ],
    },
  },
  {
    id: 'ne.n.heroine-appears', stage: ['teen'], tags: N, flag: 'ne.doomed', noFlag: 'ne.heroine', w: 5, kind: 'love', big: true,
    ja: '入学式の壇上に、ゲームの表紙で見た少女が立っていた。ヒロインの{rival}だ。{name}の胃が冷たくなった。',
    en: "The girl on the stage at the entrance ceremony was the one from the game's cover art: the heroine, {rival}. {name}'s stomach went cold.",
    set: 'ne.heroine', tie: { role: 'rival', new: true, d: 0 },
  },
  {
    id: 'ne.n.stair-frame', stage: ['teen'], tags: N, flag: 'ne.heroine', w: 3, kind: 'hard',
    ja: '階段の下で{rival}が泣いていた。「{name}様に突き落とされた」と。周りの生徒の目が一斉に向いた。',
    en: 'At the foot of the stairs, {rival} was in tears, saying {name} had pushed her. Every student nearby turned to look.',
    tie: { role: 'rival', d: -10 },
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: 'その場で冷静に弁明する', en: 'Calmly explain yourself on the spot', eff: { charm: 1, fame: -2 } },
        { ja: '見ていた者を探して証言を集める', en: 'Find witnesses and gather statements', eff: { mind: 2, fame: 1 }, set: 'ne.evidence',
          log: { ja: '{name}は図書室の窓から見ていた司書を見つけ、その証言を書き留めてもらった。', en: "{name} found a librarian who had watched from the window and had the testimony written down." } },
        { ja: '何も言わずに去る', en: 'Walk away without a word', eff: { happy: -3, fame: -3 } },
      ],
    },
  },
  {
    id: 'ne.n.heroine-reborn', stage: ['teen', 'adult'], tags: N, flag: 'ne.heroine', noFlag: 'ne.rivalreborn', w: 2, kind: 'hard',
    ja: '{rival}が「隠しルートが出ない」と小声でつぶやくのを、{name}は聞いた。ヒロインもまた、筋書きを知る転生者だった。',
    en: '{name} overheard {rival} mutter that the hidden route was not unlocking. The heroine was a reincarnated player too, and knew the script.',
    set: 'ne.rivalreborn', eff: { mind: 2 }, tie: { role: 'rival', d: -10 },
  },
  {
    id: 'ne.n.fiance-drift', stage: ['teen'], tags: N, flag: 'engaged', status: ['noble', 'royal'], w: 2, kind: 'love',
    ja: '婚約者は、昼休みを別の令嬢と中庭で過ごすようになった。{name}は窓の内側からそれを見ていた。',
    en: "{name}'s fiance began spending lunch breaks in the courtyard with another young lady. {name} watched from behind the window.",
    eff: { happy: -3 }, tie: { role: 'fiance', d: -10 },
  },
  {
    id: 'ne.n.tea-party', stage: ['teen', 'adult', 'middle'], tags: N, status: ['noble', 'royal', 'gentry'], w: 2, repeat: true, kind: 'fame',
    ja: '{name}は公爵夫人のお茶会に招かれた。誰がどの席に座るかで、その季節の派閥が分かった。',
    en: "{name} was invited to a duchess's tea party. The seating chart alone revealed which factions held sway that season.",
    eff: { charm: 1, fame: 1 },
  },
  {
    id: 'ne.n.tea-insult', stage: ['teen', 'adult'], tags: N, status: ['noble', 'royal', 'gentry'], sex: 'F', w: 1.5, kind: 'fame',
    ja: 'お茶会で、ある令嬢が{name}のドレスを「去年の流行ですのね」と褒めた。周りの扇が一斉に口元を隠した。',
    en: "At a tea party, a young lady complimented {name}'s gown as being so last season. Every fan at the table rose to hide a smile.",
    choice: {
      ja: 'どう返す?', en: 'How do you respond?',
      options: [
        { ja: '倍にして返す', en: 'Return the insult twice over', eff: { fame: 2, charm: -2 },
          log: { ja: '{name}の切り返しは、翌週には三つの茶会で引用されていた。', en: "By the next week, {name}'s comeback was being quoted at three other tea parties." } },
        { ja: 'にこやかに礼を言う', en: 'Smile and thank her', eff: { charm: 2 } },
      ],
    },
  },
  {
    id: 'ne.n.debut', stage: ['teen'], tags: N, status: ['noble', 'royal', 'gentry'], noFlag: 'ne.debut', w: 4, kind: 'fame', big: true,
    ja: '{name}は社交界にデビューした。大広間の階段を下りる間、何百もの視線の重さを数えないようにした。',
    en: '{name} made a debut in society. Descending the grand staircase of the ballroom, {name} tried not to count the hundreds of eyes.',
    set: 'ne.debut', eff: { charm: 3, fame: 3 },
  },
  {
    id: 'ne.n.ball-dance', stage: ['teen', 'adult'], tags: N, flag: 'ne.debut', w: 2, kind: 'love',
    ja: '舞踏会で三曲続けて同じ相手と踊るのは、作法では「本気」の意味だった。{name}は{lover}と四曲踊った。',
    en: "By ballroom etiquette, three dances in a row with the same partner meant something serious. {name} danced four with {lover}.",
    eff: { happy: 4, fame: 1 }, tie: { role: 'lover', new: true, d: 15 },
  },
  {
    id: 'ne.n.broken-engagement', stage: ['teen', 'adult'], tags: N, flag: 'engaged', sex: 'F', status: ['noble', 'royal'],
    noFlag: 'ne.broken', w: 1.5, kind: 'loss', big: true,
    ja: '卒業パーティの最中、婚約者が楽団を止めさせ、皆の前で{name}との婚約破棄を宣言した。',
    en: "In the middle of the graduation ball, {name}'s fiance stopped the orchestra and announced, before everyone, that the engagement was broken.",
    set: 'ne.broken', eff: { happy: -6, fame: -4 }, tie: { role: 'fiance', d: -30 },
    why: { ja: '公の場での婚約破棄は、相手の家の名誉を最も深く傷つける', en: 'A public breakup is the deepest wound to the honor of the other house' },
  },
  {
    id: 'ne.n.doomed-ball', stage: ['teen', 'adult'], tags: N, flag: 'ne.doomed', noFlag: 'ne.broken', w: 4, kind: 'hard', big: true,
    ja: '卒業パーティ。王子が{name}を指さし、筋書きと一字一句同じ台詞で婚約破棄と罪状を読み上げ始めた。',
    en: "The graduation ball. The prince pointed at {name} and began reading out the broken engagement and the charges, word for word from the script.",
    set: 'ne.broken', eff: { happy: -4 },
    choice: {
      ja: 'この断罪の場で、どうする?', en: 'How do you face the trial?',
      options: [
        { ja: '集めておいた証拠を出す', en: 'Produce the evidence you gathered', set: 'ne.cleared', eff: { fame: 6, mind: 2 },
          log: { ja: '{name}が差し出した証言の束に、広間は静まり返った。', en: 'The bundle of testimonies {name} produced left the ballroom in silence.' } },
        { ja: '頭を下げて、静かに去る', en: 'Bow, and leave quietly', set: 'exiled', eff: { fame: -4, happy: -2 },
          log: { ja: '{name}は一礼して広間を出た。翌朝には国外追放の書状が届いた。', en: 'With one bow, {name} left the hall. By morning, a writ of exile had arrived.' } },
        { ja: '王子の不実を、皆の前で言い返す', en: "Call out the prince's own faults before everyone", eff: { fame: 3 }, risk: { hazard: 'execution', p: 0.08 },
          log: { ja: '{name}の反論は喝采と怒号を同時に浴びた。', en: "{name}'s rebuttal drew cheers and roars of outrage in equal measure." } },
      ],
    },
  },
  {
    id: 'ne.n.condemnation', stage: ['teen', 'adult'], tags: N, flag: 'ne.broken', w: 3, kind: 'hard', big: true,
    ja: '{name}は覚えのない罪で裁きの場に引き出された。判決文は、裁判が始まる前から書き上がっていたらしい。',
    en: '{name} was hauled before a tribunal on charges {name} knew nothing of. The verdict, it seemed, had been written before the hearing began.',
    choice: {
      ja: '判決にどう向き合う?', en: 'How do you meet the verdict?',
      options: [
        { ja: '罪を認めて修道院に入る', en: 'Admit guilt and enter a convent', set: 'ne.convent', eff: { fame: -3, happy: -2 } },
        { ja: '国外追放を受け入れる', en: 'Accept exile from the kingdom', set: 'exiled', eff: { wealth: -6 } },
        { ja: '最後まで無実を訴える', en: 'Insist on your innocence to the end', eff: { fame: 3 }, risk: { hazard: 'execution', p: 0.15 },
          log: { ja: '{name}は一度も目を伏せなかった。', en: '{name} never once lowered their eyes.' } },
      ],
    },
    why: { ja: '断罪は名誉の問題として裁かれ、身分が高いほど見せしめになる', en: 'Condemnation is judged as a matter of honor, and the higher the rank the greater the example' },
  },
  {
    id: 'ne.n.cleared', stage: ['teen', 'adult'], tags: N, flag: 'ne.cleared', w: 4, kind: 'fame',
    ja: '冤罪の証拠が王の手に渡り、謹慎を命じられたのは王子の側だった。{name}への詫び状が三通届いた。',
    en: "The proof of the false charges reached the king, and it was the prince who was confined to his rooms. {name} received three letters of apology.",
    eff: { fame: 4, happy: 5 },
  },
  {
    id: 'ne.n.exile-bloom', stage: ['teen', 'adult'], tags: N, flag: 'exiled', w: 3, kind: 'love',
    ja: '追放先の隣国で、{name}は小さな薬草園を開いた。毎朝それを買いに来る{lover}が、実はこの国の王族だと知ったのは秋だった。',
    en: "In exile across the border, {name} opened a small herb garden. Only in autumn did {name} learn that {lover}, who came by every morning, was of that country's royal family.",
    eff: { happy: 6, wealth: 2 }, tie: { role: 'lover', new: true, d: 20 },
    why: { ja: '追放の後の方が自由になる、というのはこの手の筋書きの定番の裏返しだ', en: 'Being freer after exile is the classic twist of this kind of story' },
  },
  {
    id: 'ne.n.convent', stage: ['teen', 'adult', 'middle'], tags: N, flag: 'ne.convent', w: 3, kind: 'old',
    ja: '修道院の朝は鐘で始まり、鐘で終わった。{name}は写本の余白に、誰にも読めない前世の字で日記をつけた。',
    en: "Mornings at the convent began and ended with bells. In the margins of the manuscripts {name} copied, {name} kept a diary in a script no one there could read.",
    eff: { happy: 2, mind: 2 },
  },
  {
    id: 'ne.n.villain-son-duel', stage: ['teen'], tags: N, flag: 'ne.doomed', sex: 'M', w: 3, kind: 'battle',
    ja: '筋書きでは、{name}は学園の決闘で主人公に負け、そこから転げ落ちていく。その決闘の日が近づいていた。',
    en: "In the script, {name} loses a duel at the academy to the protagonist and goes downhill from there. That day was getting close.",
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: '毎朝、誰より早く剣を振る', en: 'Train with the sword before anyone else every morning', eff: { power: 5 },
          log: { ja: '決闘の日、{name}は筋書きにない一太刀で引き分けに持ち込んだ。', en: "On the day, {name} forced a draw with a stroke that was nowhere in the script." } },
        { ja: '主人公に先に頭を下げ、決闘の理由をなくす', en: 'Apologize to the protagonist first and leave no reason to fight', eff: { charm: 3, fame: -1 } },
      ],
    },
  },

  // ---- 大人 ----
  {
    id: 'ne.n.political-marriage', stage: ['adult'], tags: N, status: ['noble', 'royal'], noFlag: 'married', w: 2, kind: 'family', big: true,
    ja: '敵対していた派閥との和解のしるしとして、{name}は{spouse}と結婚した。式で二人が交わした言葉は、誓いの文句だけだった。',
    en: 'As a token of peace with a rival faction, {name} married {spouse}. The only words they exchanged at the ceremony were the vows.',
    set: 'married', eff: { wealth: 3, happy: -1 }, tie: { role: 'spouse', new: true, d: 0 },
    why: { ja: '家と家の結びつきが、本人の気持ちより先に来る', en: 'The bond between houses comes before the feelings of the two people' },
  },
  {
    id: 'ne.n.elope', stage: ['adult'], tags: N, status: ['noble', 'royal', 'gentry'], noFlag: 'married', w: 1.2, kind: 'love',
    ja: '家が選んだ縁談の日取りが決まった夜、{lover}が窓の下に馬を二頭つないで待っていた。',
    en: 'The night the date of the arranged match was set, {lover} waited beneath the window with two horses saddled.',
    tie: { role: 'lover', d: 5 },
    choice: {
      ja: '窓を開ける?', en: 'Open the window?',
      options: [
        { ja: '降りて、一緒に逃げる', en: 'Climb down and run away together', set: 'ne.elope', eff: { happy: 6, wealth: -6, fame: -3 } },
        { ja: '窓を閉め、カーテンを引く', en: 'Close the window and draw the curtains', eff: { happy: -5, wealth: 2 } },
      ],
    },
  },
  {
    id: 'ne.n.elope-life', stage: ['adult', 'middle'], tags: N, flag: 'ne.elope', w: 3, kind: 'family',
    ja: '名前を変えて港町で暮らす{name}は、初めて自分でパンを焼いた。焦げていたが、二人で全部食べた。',
    en: 'Living under a new name in a port town, {name} baked bread for the first time. It was burnt, and the two of them ate every bit.',
    eff: { happy: 4, wealth: -1 },
  },
  {
    id: 'ne.n.foreign-court', stage: ['adult'], tags: N, status: ['royal'], sex: 'F', w: 1.5, kind: 'family',
    ja: '{name}に、海の向こうの王家へ嫁ぐ話が来た。言葉も神も違う国だった。',
    en: '{name} was offered in marriage to a royal house across the sea, in a country with a different language and different gods.',
    eff: { mind: 2, happy: -2, fame: 3 },
  },
  {
    id: 'ne.n.succession', stage: ['adult', 'middle'], tags: N, status: ['noble', 'royal'], w: 1.5, kind: 'hard',
    ja: '{father}が倒れると、屋敷は二つに割れた。{name}を推す者と、{name}の兄弟を推す者に。',
    en: "When {father} fell ill, the household split in two: those who backed {name}, and those who backed {name}'s sibling.",
    tie: { role: 'sibling', d: -10 },
    choice: {
      ja: '家督をどうする?', en: 'What about the succession?',
      options: [
        { ja: '兄弟に譲る', en: 'Yield to your sibling', eff: { happy: 1, wealth: -3, charm: 2 } },
        { ja: '争って取る', en: 'Fight for it', set: 'lord', eff: { wealth: 4, fame: 2, happy: -3 }, risk: { hazard: 'violence', p: 0.05 },
          log: { ja: '家督は{name}のものになった。兄弟は二度と同じ食卓に着かなかった。', en: '{name} became head of the house. The two siblings never shared a table again.' } },
      ],
    },
    why: { ja: '継承争いでは毒や事故に見せかけた死がつきまとう', en: 'Succession disputes are shadowed by poisonings and convenient accidents' },
  },
  {
    id: 'ne.n.inherit', stage: ['adult', 'middle'], tags: N, status: ['noble', 'gentry'], noFlag: 'lord', w: 1.5, kind: 'loss', big: true,
    ja: '{father}の葬儀の翌日、{name}は当主の指輪をはめた。指には少し大きかった。',
    en: "The day after {father}'s funeral, {name} put on the signet ring of the head of the house. It was a little too big.",
    tie: { role: 'father', d: 0, dies: true },
    set: 'lord', eff: { wealth: 5, fame: 3, happy: -3 },
  },
  {
    id: 'ne.n.harvest-ledger', stage: ['adult', 'middle', 'elder'], tags: N, flag: 'lord', w: 2, repeat: true, kind: 'work',
    ja: '{name}は収穫の報告書を村ごとに読み比べ、一つの村だけ毎年数字が同じなのに気づいた。',
    en: "{name} compared the harvest reports village by village, and noticed one village reported the exact same figures every year.",
    eff: { mind: 1, wealth: 2 },
  },
  {
    id: 'ne.n.levee', stage: ['adult', 'middle'], tags: N, flag: 'lord', w: 2, kind: 'work',
    ja: '春の長雨で、領地の川があと少しで堤を越えそうになった。',
    en: "The long spring rains brought the river on {name}'s land within inches of breaching its banks.",
    choice: {
      ja: '堤の工事をどうする?', en: 'What about repairing the levee?',
      options: [
        { ja: '家の金で今すぐ工事する', en: 'Pay for repairs from the family coffers now', eff: { wealth: -5, charm: 4, fame: 2 } },
        { ja: '商会から借りて工事する', en: 'Borrow from a merchant house to pay for it', eff: { wealth: -2, charm: 2 } },
        { ja: '晴れるのを待つ', en: 'Wait for the rain to stop', eff: { wealth: 1 }, risk: { hazard: 'accident', p: 0.01 },
          log: { ja: '川は下流の三つの村を呑んだ。{name}の名は長く恨みとともに語られた。', en: "The river swallowed three villages downstream, and {name}'s name was spoken with bitterness for years." } },
      ],
    },
  },
  {
    id: 'ne.n.petition', stage: ['adult', 'middle'], tags: N, flag: 'lord', w: 1.5, kind: 'work',
    ja: '凶作の年、村の代表たちが帽子を握りしめて{name}の屋敷の門の前に並んだ。年貢を減らしてほしいという。',
    en: "In a year of poor harvest, village elders lined up at {name}'s gate, caps clutched in their hands, asking for lower taxes.",
    choice: {
      ja: '年貢をどうする?', en: 'What about the taxes?',
      options: [
        { ja: '半分にする', en: 'Halve them', eff: { wealth: -4, charm: 5 } },
        { ja: 'そのまま取り立てる', en: 'Collect them in full', eff: { wealth: 3, charm: -5 }, risk: { hazard: 'violence', p: 0.01 } },
      ],
    },
  },
  {
    id: 'ne.n.butler', stage: ['adult'], tags: N, status: ['noble', 'royal'], w: 1.5, kind: 'work',
    ja: '先代から仕える老執事が引退し、新しい執事が来た。初日に{name}の紅茶の好みを、何も聞かずに当てた。',
    en: "The old butler who had served the previous head retired, and a new one arrived. On the first day, he guessed exactly how {name} took tea without asking.",
    eff: { happy: 2 }, tie: { role: 'servant', new: true, d: 8 },
  },
  {
    id: 'ne.n.maid-poison', stage: ['teen', 'adult', 'middle'], tags: N, status: ['noble', 'royal'], w: 1, kind: 'hard',
    ja: '侍女が{name}の手から茶器を払い落とした。茶の香りがいつもと違う、と。床の茶は銀の匙を黒く変えた。',
    en: "{name}'s maid knocked the teacup out of {name}'s hand, saying the tea smelled wrong. The spilled tea turned a silver spoon black.",
    eff: { hp: -1, happy: -2 }, tie: { role: 'servant', d: 15 },
    why: { ja: '貴族の死因として毒は剣より多い', en: 'Among nobles, poison kills more often than the sword' },
  },
  {
    id: 'ne.n.maid-wedding', stage: ['adult', 'middle'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1, kind: 'family',
    ja: '長く仕えてくれた侍女が結婚することになった。{name}は持参金を出し、式では少しだけ泣いた。',
    en: "The maid who had served {name} for years was getting married. {name} paid her dowry, and cried a little at the ceremony.",
    eff: { happy: 2, wealth: -2 }, tie: { role: 'servant', d: 10 },
  },
  {
    id: 'ne.n.servant-gala', stage: ['teen', 'adult', 'middle'], tags: N, jobs: ['servant'], w: 2, repeat: true, kind: 'work',
    ja: '主家の夜会の準備で、{name}は三日ほとんど眠らなかった。客は誰も、蝋燭を替えた者の顔を見なかった。',
    en: "Preparing for the master's soiree, {name} barely slept for three days. None of the guests ever looked at the face of whoever changed the candles.",
    eff: { hp: -1, wealth: 1 },
  },
  {
    id: 'ne.n.servant-letter', stage: ['teen', 'adult'], tags: N, jobs: ['servant'], w: 1.5, kind: 'hard',
    ja: '書斎を掃除していた{name}は、主人が敵対派閥に宛てた密書を見てしまった。',
    en: "While cleaning the study, {name} saw a secret letter from the master to a rival faction.",
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: '何も見なかったことにする', en: 'Pretend you saw nothing', eff: { happy: -1 } },
        { ja: '相手の派閥に売る', en: 'Sell it to the other faction', eff: { wealth: 6 }, risk: { hazard: 'violence', p: 0.04 },
          log: { ja: '{name}の懐は重くなったが、それから夜道を一人で歩かなくなった。', en: "{name}'s purse grew heavy, and {name} stopped walking alone at night." } },
      ],
    },
  },
  {
    id: 'ne.n.head-servant', stage: ['middle'], tags: N, jobs: ['servant'], w: 2, kind: 'work',
    ja: '{name}は屋敷の使用人頭になった。鍵束が重くなり、名前を覚える新入りが毎年増えた。',
    en: "{name} became head of the household staff. The ring of keys got heavier, and every year there were more new faces to learn.",
    eff: { wealth: 3, fame: 1 },
  },
  {
    id: 'ne.n.guard-knight', stage: ['adult'], tags: N, jobs: ['knight'], w: 2, kind: 'work',
    ja: '{name}は公爵家の令嬢の護衛騎士に任じられた。最初の命令は「後ろを歩くな、横を歩け」だった。',
    en: "{name} was appointed guard knight to a duke's daughter. Her first order: walk beside me, not behind me.",
    eff: { fame: 2, charm: 1 },
  },
  {
    id: 'ne.n.knight-oath', stage: ['teen', 'adult'], tags: N, jobs: ['knight'], w: 2, kind: 'work', big: true,
    ja: '{name}は{master}の前にひざまずき、剣を捧げた。肩に置かれた刃は、思っていたよりずっと冷たかった。',
    en: "{name} knelt before {master} and pledged a sword. The blade laid on {name}'s shoulder was much colder than expected.",
    eff: { fame: 3 }, tie: { role: 'master', new: true, d: 10 },
  },
  {
    id: 'ne.n.knighted', stage: ['adult', 'middle'], tags: N, status: ['commoner', 'merchant', 'poor'], noFlag: 'knighted', w: 0.8, kind: 'fame', big: true,
    ja: '王都の大火で子どもたちを運び出した功で、{name}は平民から騎士爵を授かった。社交界はその話で一季節もった。',
    en: "For carrying children out of the great fire in the capital, {name} was raised from commoner to knight. Society talked of nothing else for a season.",
    set: 'knighted', eff: { fame: 6, wealth: 3 },
  },
  {
    id: 'ne.n.purveyor', stage: ['adult', 'middle'], tags: N, jobs: ['merchant'], w: 1.5, kind: 'work',
    ja: '{name}の商会が王家御用達になった。看板に紋章を掲げた日、向かいの店の主人が祝いの酒を持ってきた。顔は笑っていなかった。',
    en: "{name}'s firm was granted a royal warrant. The day the crest went up on the sign, the owner across the street brought a bottle in congratulations. He was not smiling.",
    eff: { wealth: 5, fame: 3 },
  },
  {
    id: 'ne.n.court-chaplain', stage: ['adult', 'middle'], tags: N, jobs: ['priest'], w: 1.5, kind: 'work',
    ja: '{name}は宮廷の礼拝堂付きの司祭になった。懺悔室では、昼の舞踏会よりも多くの秘密を聞いた。',
    en: "{name} became chaplain of the palace chapel. In the confessional, {name} heard more secrets than any ballroom ever could.",
    eff: { mind: 2, fame: 2 },
  },
  {
    id: 'ne.n.noble-pupil', stage: ['adult', 'middle'], tags: N, jobs: ['scholar'], w: 1.5, kind: 'work',
    ja: '{name}は伯爵家の子の家庭教師になった。{disciple}は授業の半分を窓の外を見て過ごし、残りの半分で鋭い質問をした。',
    en: "{name} became tutor to an earl's child. {disciple} spent half of each lesson staring out the window, and the other half asking sharp questions.",
    eff: { wealth: 2, mind: 1 }, tie: { role: 'disciple', new: true, d: 10 },
  },
  {
    id: 'ne.n.salon', stage: ['adult', 'middle'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1, kind: 'fame',
    ja: '{name}は月に一度、屋敷でサロンを開くようになった。詩人と学者と軍人が、同じ長椅子で言い争った。',
    en: "{name} began hosting a salon once a month. Poets, scholars, and officers argued on the same settee.",
    eff: { fame: 4, charm: 2, wealth: -1 },
  },
  {
    id: 'ne.n.faction', stage: ['adult', 'middle'], tags: N, status: ['noble', 'royal'], w: 1.5, kind: 'hard',
    ja: '王が中央の権限を強める勅令を出し、貴族たちは王党派と貴族派に分かれた。{name}の家にも、両方から使者が来た。',
    en: "The king issued a decree centralizing power, and the nobility split into royalists and the lords' faction. Envoys from both sides came to {name}'s house.",
    choice: {
      ja: 'どちらに付く?', en: 'Which side do you take?',
      options: [
        { ja: '王党派', en: 'The royalists', eff: { fame: 2, wealth: 1 } },
        { ja: '貴族派', en: "The lords' faction", eff: { charm: 2 }, risk: { hazard: 'execution', p: 0.02 } },
        { ja: 'どちらにも返事をしない', en: 'Answer neither', eff: { luck: 1, fame: -1 } },
      ],
    },
  },
  {
    id: 'ne.n.attainder', stage: ['adult', 'middle'], tags: N, status: ['noble', 'royal'], w: 0.6, kind: 'hard',
    ja: '遠い親族が反逆の罪で捕らえられ、{name}の家にも連座の疑いがかかった。夜明け前に衛兵が門を叩いた。',
    en: "A distant relative was arrested for treason, and suspicion of complicity fell on {name}'s house. Guards pounded on the gate before dawn.",
    eff: { happy: -5, wealth: -3 }, risk: { hazard: 'execution', p: 0.05 },
    why: { ja: '反逆罪は一族ごと裁かれることがある', en: 'Treason can be punished across an entire bloodline' },
  },
  {
    id: 'ne.n.child-match', stage: ['middle'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1.5, kind: 'family',
    ja: '{name}は{child}の婚約話をまとめた。かつて自分が座らされた椅子に、今度は我が子を座らせていた。',
    en: "{name} arranged an engagement for {child}, seating the child in the very chair {name} had once been made to sit in.",
    eff: { wealth: 2, happy: -1 }, tie: { role: 'child', d: -3 },
  },
  {
    id: 'ne.n.honor-duel', stage: ['adult', 'middle'], tags: N, status: ['noble', 'gentry'], sex: 'M', flag: 'married', w: 1, kind: 'battle',
    ja: '夜会で妻を侮辱された{name}は、相手の頬を手袋で打った。翌朝の決闘の場所が告げられた。',
    en: "When his wife was insulted at a soiree, {name} struck the man's cheek with a glove. The place for the dawn duel was named.",
    choice: {
      ja: '夜明けの決闘に行く?', en: 'Go to the duel at dawn?',
      options: [
        { ja: '行く', en: 'Go', eff: { fame: 4 }, risk: { hazard: 'violence', p: 0.08 } },
        { ja: '介添人を通じて詫び状で収める', en: 'Settle it with a letter through the seconds', eff: { fame: -3, happy: 1 } },
      ],
    },
  },
  {
    id: 'ne.n.fall-of-house', stage: ['adult', 'middle'], tags: N, status: ['noble', 'gentry'], w: 0.8, kind: 'loss',
    ja: '父の代からの借財が表に出て、{name}の家は屋敷を手放した。肖像画だけは、馬車に積めるだけ持ち出した。',
    en: "Debts going back to father's time came to light, and {name}'s family had to give up the manor. They took as many of the portraits as the carriage would hold.",
    eff: { wealth: -8, happy: -4, fame: -2 },
  },
  {
    id: 'ne.n.heroine-after', stage: ['adult', 'middle'], tags: N, flag: 'ne.heroine', w: 2, kind: 'love',
    ja: '何年もたって、{name}は{rival}と街角の茶房で再会した。どちらも、あの頃の筋書きの話はしなかった。',
    en: "Years later, {name} ran into {rival} at a tea house on a street corner. Neither of them mentioned the script from back then.",
    eff: { happy: 3 }, tie: { role: 'rival', d: 15 },
  },

  // ---- 中年・老年 ----
  {
    id: 'ne.n.king-dies', stage: ['middle', 'elder'], tags: N, status: ['noble', 'royal'], w: 0.8, kind: 'hard',
    ja: '王が世継ぎを定めないまま崩御し、王都の門が閉ざされた。{name}は家の者に、しばらく外へ出るなと言った。',
    en: "The king died without naming an heir, and the gates of the capital were shut. {name} told the household not to go out for a while.",
    eff: { happy: -2 }, risk: { hazard: 'war', p: 0.02 },
  },
  {
    id: 'ne.n.child-academy', stage: ['middle'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1.5, kind: 'family',
    ja: '{child}が学園へ旅立った。{name}は馬車が見えなくなるまで門の前に立ち、それから自分の入学式を思い出した。',
    en: "{child} left for the academy. {name} stood at the gate until the carriage was out of sight, then remembered an entrance ceremony from long ago.",
    eff: { happy: 1 }, tie: { role: 'child', d: 5 },
  },
  {
    id: 'ne.n.past-the-end', stage: ['adult', 'middle'], tags: N, flag: 'ne.doomed', w: 3, kind: 'old',
    ja: '筋書きで{name}が破滅するはずだった年が、何事もなく過ぎた。その夜、{name}は前世のノートを暖炉にくべた。',
    en: "The year {name} was supposed to meet ruin came and went without incident. That night, {name} fed the old notebook to the fire.",
    eff: { happy: 6 },
    why: { ja: 'ゲームの筋書きは、卒業の年から先を描いていなかった', en: 'The game script never covered anything past graduation' },
  },
  {
    id: 'ne.n.dowager', stage: ['elder'], tags: N, status: ['noble', 'royal'], w: 2, kind: 'old',
    ja: '家督を譲った{name}は、屋敷の東の棟に移った。若い当主は困ると、決まって午後の茶の時間に相談に来た。',
    en: "Having handed over the house, {name} moved into the east wing. Whenever the young head of the family was in trouble, they turned up at afternoon tea.",
    set: 'retired', eff: { happy: 3 },
  },
  {
    id: 'ne.n.memoir', stage: ['elder'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1.2, kind: 'old',
    ja: '{name}は回想録を書き始めた。名前を伏せても、宮廷の誰の話かは誰にでも分かった。',
    en: "{name} began writing a memoir. Even with names withheld, everyone at court could tell exactly who each story was about.",
    eff: { fame: 3, mind: 1 },
  },
  {
    id: 'ne.n.old-servant', stage: ['elder'], tags: N, w: 2, kind: 'old',
    ja: '若い頃から仕えてくれた者も、もう腰が曲がっていた。{name}は初めて、その人のために茶を淹れた。',
    en: "The one who had served {name} since youth was now stooped with age. For the first time, {name} poured the tea.",
    eff: { happy: 3 }, tie: { role: 'servant', d: 10 },
  },
  {
    id: 'ne.n.grandchild-debut', stage: ['elder'], tags: N, status: ['noble', 'royal', 'gentry'], w: 1.2, kind: 'family',
    ja: '孫の社交界デビューの夜、{name}は広間の隅の椅子から、階段を下りる小さな背中を見ていた。',
    en: "On the night of a grandchild's debut, {name} watched the small figure descend the staircase from a chair in the corner of the ballroom.",
    eff: { happy: 4 },
  },
  {
    id: 'ne.n.mob-watch', stage: ['teen', 'adult'], tags: N, flag: 'ne.mob', w: 3, kind: 'fame',
    ja: '卒業パーティで婚約破棄の騒ぎが起きた。前世で何度も見た場面を、{name}は壁際の席から最後まで見届けた。',
    en: "A broken engagement erupted at the graduation ball. From a seat by the wall, {name} watched the scene play out, just as it had on screen many times in a past life.",
    eff: { happy: 2, mind: 1 },
  },

  // ======================================================================
  // 和風・中華風/仙侠 (eastern)
  // ======================================================================

  // ---- 乳幼児 ----
  {
    id: 'ne.e.first-shrine', stage: ['infant'], age: [0, 0], tags: JP, w: 2, kind: 'child',
    ja: '生まれて間もない{name}は、村はずれの社に連れて行かれた。神主の振る鈴の音で、ぴたりと泣きやんだ。',
    en: "Soon after birth, {name} was carried to the shrine at the edge of the village. At the sound of the priest's bells, {name} stopped crying at once.",
    eff: { luck: 2 },
  },
  {
    id: 'ne.e.fox-cradle', stage: ['infant'], tags: E, magic: 1, w: 1, kind: 'child',
    ja: '夜中、{name}の寝床を白い狐がのぞき込んでいた。{mother}が灯りを持って来たときには、もういなかった。',
    en: "In the night, a white fox peered into {name}'s bed. By the time {mother} brought a lamp, it was gone.",
    tie: { role: 'mother', d: 0 },
    eff: { luck: 3 },
  },
  {
    id: 'ne.e.smallpox', stage: ['infant', 'child'], tags: JP, w: 1.2, kind: 'ill',
    ja: '村に疱瘡が流行り、{name}も高い熱を出した。{mother}は赤い紙の人形を枕元に吊るして、夜通し祈った。',
    en: "Smallpox swept through the village and {name} burned with fever. {mother} hung a red paper charm by the pillow and prayed all night.",
    tie: { role: 'mother', d: 3 },
    eff: { hp: -4 }, risk: { hazard: 'disease', p: 0.04 },
    why: { ja: '疱瘡や麻疹は、この時代の子どもの死因の大きな一つ', en: 'Smallpox and measles were among the great killers of children in this era' },
  },

  // ---- 子ども ----
  {
    id: 'ne.e.terakoya', stage: ['child'], tags: JP, status: ['poor', 'commoner', 'merchant'], w: 2, kind: 'school',
    ja: '{name}は寺の手習い所に通い始めた。墨で顔まで黒くして帰り、{mother}に笑われた。',
    en: "{name} started at the temple writing school, where children learned to read and write. {name} came home with ink all over the face, and {mother} laughed.",
    tie: { role: 'mother', d: 1 },
    eff: { mind: 3 },
  },
  {
    id: 'ne.e.spirit-root', stage: ['child'], tags: CU, magic: 2, noFlag: 'ne.rooted', w: 2, kind: 'power', big: true,
    ja: '仙門の使者が村に来て、子どもたちに測霊石を握らせた。{name}の手の中で、石が淡い緑に光った。霊根がある。',
    en: "Envoys from an immortal sect came to the village and had each child hold a spirit-testing stone. In {name}'s hand it glowed pale green: a spiritual root, the inborn aptitude for cultivation.",
    set: 'ne.rooted', eff: { mind: 3, fame: 2 },
    why: { ja: '修行の資質は生まれで決まり、それが人生を二つに分ける', en: 'Aptitude for cultivation is decided at birth, and it splits lives in two' },
  },
  {
    id: 'ne.e.no-root', stage: ['child'], tags: CU, magic: 2, noFlag: 'ne.rooted', w: 1.5, kind: 'hard',
    ja: '測霊石は{name}の手の中で、ただの冷たい石のままだった。隣の子の石は、まぶしいほど光っていた。',
    en: "In {name}'s hand, the spirit-testing stone stayed just a cold stone. The child next in line made it shine dazzlingly bright.",
    eff: { happy: -3 },
    choice: {
      ja: 'それから、どうする?', en: 'What now?',
      options: [
        { ja: '凡人として生きると決める', en: 'Decide to live an ordinary life', set: 'ne.mortal', eff: { happy: 1 } },
        { ja: 'それでも山門を叩く', en: "Go knock on the sect's gate anyway", set: 'ne.stubborn', eff: { power: 2 } },
      ],
    },
  },
  {
    id: 'ne.e.sect-gate', stage: ['child', 'teen'], tags: CU, flag: 'ne.rooted', noFlag: 'ne.sect', w: 4, kind: 'school', big: true,
    ja: '入門の試験は、雲の上の山門まで続く九千段の石段だった。日が落ちる頃、{name}は膝を震わせながら最後の段に手をついた。',
    en: "The entrance trial was a stairway of nine thousand stone steps up to a sect's gate above the clouds. At sunset, knees shaking, {name} laid a hand on the last step.",
    set: 'ne.sect', eff: { power: 3, fame: 1 }, tie: { role: 'friend', new: true, d: 8 },
  },
  {
    id: 'ne.e.stubborn-gate', stage: ['child', 'teen'], tags: CU, flag: 'ne.stubborn', w: 3, kind: 'hard',
    ja: '霊根のない{name}は、山門の前に三日三晩座り続けた。四日目の朝、通りがかった老人が「水汲みならさせてやる」と言った。',
    en: "With no spiritual root, {name} sat before the sect's gate for three days and nights. On the fourth morning, a passing old man said {name} could at least haul water.",
    set: 'ne.sect', eff: { power: 2, hp: -2 }, tie: { role: 'mentor', new: true, d: 5 },
  },
  {
    id: 'ne.e.mortal-path', stage: ['teen', 'adult'], tags: CU, flag: 'ne.mortal', w: 2, kind: 'work',
    ja: '空を剣に乗って渡る修行者たちを、{name}は鍬を止めて見上げた。それから、また畑に目を戻した。',
    en: "{name} paused the hoe to watch cultivators fly overhead on their swords, then turned back to the field.",
    eff: { happy: 1, hp: 1 },
  },
  {
    id: 'ne.e.shizun', stage: ['child', 'teen'], tags: CU, flag: 'ne.sect', w: 3, kind: 'school', big: true,
    ja: '弟子選びの日、壇上の長老たちの中で、ただ一人{mentor}だけが{name}を指さした。その日から{mentor}は{name}の師尊になった。',
    en: "On the day disciples were chosen, of all the elders on the dais only {mentor} pointed at {name}. From then on, {mentor} was {name}'s master in the sect.",
    eff: { mind: 2, happy: 3 }, tie: { role: 'mentor', new: true, d: 15 },
  },
  {
    id: 'ne.e.outer-chores', stage: ['child', 'teen'], tags: CU, flag: 'ne.sect', w: 2, kind: 'work',
    ja: '外門弟子の{name}の一日は、谷の泉から山頂の厨房まで水桶を運ぶことで終わった。修行の時間は、残っていなかった。',
    en: "As an outer disciple, {name} spent each day carrying water buckets from the valley spring to the kitchens on the peak. No time was left for cultivation.",
    eff: { power: 2, happy: -1 },
  },
  {
    id: 'ne.e.ninja-village', stage: ['child'], tags: JP, status: ['orphan', 'poor'], w: 1, kind: 'school',
    ja: '身寄りのない{name}は、山奥の忍びの里に引き取られた。{mentor}は最初に、足音を立てずに板の間を歩く方法を教えた。',
    en: "Orphaned, {name} was taken in by a hidden ninja village deep in the mountains. The first thing {mentor} taught was how to cross a wooden floor without a sound.",
    eff: { power: 2, luck: 1 }, tie: { role: 'mentor', new: true, d: 8 },
  },
  {
    id: 'ne.e.kappa', stage: ['child'], tags: JP, magic: 1, w: 1, kind: 'adventure',
    ja: '川で泳いでいた{name}の足を、水の中から何かが引いた。きゅうりを投げると、手はすっと離れた。',
    en: "While {name} was swimming in the river, something pulled at {name}'s leg from below. When {name} threw it a cucumber, the hand let go. It was a kappa, the river imp.",
    eff: { luck: 2 }, risk: { hazard: 'accident', p: 0.02 },
  },
  {
    id: 'ne.e.yokai-road', stage: ['child', 'teen'], tags: JP, magic: 1, w: 1.5, kind: 'adventure',
    ja: '夕暮れの帰り道、{name}の前を提灯がひとつ、持ち手もなく漂っていった。',
    en: "Walking home at dusk, {name} saw a paper lantern drift down the road ahead with no one carrying it.",
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: '走って逃げる', en: 'Run', eff: { hp: -1 } },
        { ja: '後をついて行く', en: 'Follow it', eff: { mind: 3, luck: 1 }, risk: { hazard: 'monster', p: 0.03 },
          log: { ja: '提灯は竹林の奥の、誰も知らない祠の前で消えた。', en: 'The lantern went out before a forgotten shrine deep in the bamboo grove.' } },
        { ja: '「こんばんは」と声をかける', en: 'Say good evening to it', eff: { charm: 2, luck: 2 },
          log: { ja: '提灯は少し揺れて、会釈したように見えた。', en: 'The lantern bobbed a little, almost like a bow.' } },
      ],
    },
  },
  {
    id: 'ne.e.prodigy', stage: ['child'], tags: E, memory: true, arrival: ['reborn', 'awaken'], w: 2, kind: 'power',
    ja: '{name}は前世の算数で、商人の算盤より早く勘定を合わせた。町では「神童」と噂され、大人たちは少し気味悪がった。',
    en: "Using arithmetic from a past life, {name} totaled accounts faster than a merchant's abacus. The town called {name} a prodigy, and the adults were a little unsettled.",
    eff: { mind: 3, fame: 2 },
  },

  // ---- 十代 ----
  {
    id: 'ne.e.genpuku', stage: ['teen'], tags: JP, sex: 'M', status: ['gentry', 'noble', 'royal'], noFlag: 'ne.genpuku', w: 3, kind: 'family', big: true,
    ja: '{name}は元服した。前髪を落とし、大人の名を与えられた。鏡の中の顔は、まだ子どものままだった。',
    en: "{name} came of age in the samurai coming-of-age rite: the boyish forelock was shaved off and an adult name given. The face in the mirror still looked like a child's.",
    set: 'ne.genpuku', eff: { fame: 2, power: 1 },
  },
  {
    id: 'ne.e.qi-refining', stage: ['teen', 'adult'], tags: CU, flag: 'ne.sect', noFlag: 'ne.qi', w: 3, kind: 'power', big: true,
    ja: '冷たい滝に打たれて百日目、{name}は丹田に小さな熱が灯るのを感じた。気を練る、最初の段に足をかけた。',
    en: "On the hundredth day of meditating under an icy waterfall, {name} felt a small warmth kindle in the belly. It was the first stage of cultivation: refining qi, the body's vital energy.",
    set: 'ne.qi', eff: { level: 2, mind: 2, power: 2 }, risk: { hazard: 'magic', p: 0.01 },
  },
  {
    id: 'ne.e.sect-tourney', stage: ['teen', 'adult'], tags: CU, flag: 'ne.sect', w: 2, kind: 'battle',
    ja: '宗門の大比で、{name}は同期の{rival}と当たった。三十手めで、二人とも剣を落とした。',
    en: "At the sect's grand tournament, {name} drew {rival}, a disciple from the same intake. On the thirtieth exchange, both of them dropped their swords.",
    eff: { power: 2, fame: 2 }, tie: { role: 'rival', new: true, d: 5 }, risk: { hazard: 'violence', p: 0.005 },
  },
  {
    id: 'ne.e.mentor-sword', stage: ['teen', 'adult'], tags: CU, flag: 'ne.sect', w: 2, kind: 'power',
    ja: '{mentor}は何も言わずに、古い剣を{name}に放ってよこした。鞘の内側に、{mentor}の若い頃の名が刻まれていた。',
    en: "Without a word, {mentor} tossed {name} an old sword. Inside the scabbard was carved the name {mentor} had used when young.",
    eff: { power: 2, happy: 3 }, tie: { role: 'mentor', d: 10 },
  },
  {
    id: 'ne.e.tengu', stage: ['teen'], tags: JP, magic: 2, w: 0.8, kind: 'adventure',
    ja: '山で迷った{name}に、赤い顔の大男が「剣を握る手がなっておらん」と言った。それから七晩、{mentor}は山の上で剣を教えた。',
    en: "When {name} got lost in the mountains, a towering red-faced figure, a tengu of mountain lore, grumbled that {name} held a sword all wrong. For seven nights after, {mentor} taught swordplay on the peak.",
    eff: { power: 4 }, tie: { role: 'mentor', new: true, d: 10 },
  },
  {
    id: 'ne.e.festival', stage: ['child', 'teen', 'adult', 'middle', 'elder'], tags: JP, w: 1.5, repeat: true, kind: 'child',
    ja: '夏の祭りの夜、川に灯籠が流れた。{name}はそれが角を曲がって見えなくなるまで、橋の上から見送った。',
    en: "On the night of the summer festival, paper lanterns floated down the river. From the bridge, {name} watched them until they rounded the bend and vanished.",
    eff: { happy: 3 },
  },
  {
    id: 'ne.e.festival-love', stage: ['teen', 'adult'], tags: JP, w: 1.5, kind: 'love',
    ja: '祭りの人混みで、{name}は{lover}とはぐれないように袖をつかんだ。花火が終わっても、その手は離さなかった。',
    en: "In the festival crowd, {name} held onto {lover}'s sleeve so as not to get separated. When the fireworks ended, {name} still did not let go.",
    eff: { happy: 5 }, tie: { role: 'lover', new: true, d: 15 },
  },
  {
    id: 'ne.e.exam-study', stage: ['teen', 'adult'], tags: CU, status: ['gentry', 'merchant', 'commoner'], noFlag: 'ne.studied', w: 1.5, kind: 'school',
    ja: '{name}は官吏登用の試験、科挙を受けると決めた。四書五経を、一字も違えず書けるまで覚えなければならない。',
    en: "{name} decided to sit the imperial civil service examination. It meant memorizing the classic texts until they could be written out without a single wrong character.",
    choice: {
      ja: 'どれだけ打ち込む?', en: 'How hard will you study?',
      options: [
        { ja: '灯火のもとで、毎晩夜明けまで', en: 'By lamplight, every night until dawn', set: 'ne.studied', eff: { mind: 5, hp: -3 } },
        { ja: '昼に学び、夜は眠る', en: 'Study by day, sleep at night', set: 'ne.studied', eff: { mind: 3 } },
      ],
    },
  },
  {
    id: 'ne.e.harem-entry', stage: ['teen'], tags: CU, sex: 'F', status: ['gentry', 'noble', 'merchant', 'commoner'], noFlag: 'ne.harem', w: 0.8, kind: 'family', big: true,
    ja: '{name}は宮中の選びに名を挙げられ、後宮に入った。高い朱塗りの壁の内側では、序列がすべてだった。',
    en: "{name} was chosen in the palace selection and entered the imperial harem, the inner court of consorts. Behind its high vermilion walls, rank was everything.",
    set: 'ne.harem', eff: { fame: 3, happy: -2, wealth: 3 },
  },

  // ---- 大人 ----
  {
    id: 'ne.e.foundation', stage: ['teen', 'adult', 'middle'], tags: CU, flag: 'ne.qi', noFlag: 'ne.foundation', w: 3, kind: 'power', big: true,
    ja: '{name}の体に溜まった気が、器の縁までせり上がってきた。築基、修行の土台を築く関門だ。越えれば寿命が延び、しくじれば命はない。',
    en: "The qi pooled in {name}'s body rose to the brim. It was the threshold of Foundation Establishment: pass it and one's lifespan lengthens; fail and one dies.",
    choice: {
      ja: 'どう関門に挑む?', en: 'How do you attempt the breakthrough?',
      options: [
        { ja: '築基丹の力を借りる', en: 'Take a Foundation pill to help', set: 'ne.foundation', eff: { level: 3, wealth: -4 }, risk: { hazard: 'magic', p: 0.04 },
          log: { ja: '丹薬の熱が背骨を駆け上がり、{name}は築基を果たした。', en: "The pill's heat raced up {name}'s spine, and the foundation was laid." } },
        { ja: '己の力だけで突き破る', en: 'Break through on your own strength', set: 'ne.foundation', eff: { level: 4, power: 2 }, risk: { hazard: 'magic', p: 0.1 },
          log: { ja: '七日七晩の座禅の果てに、{name}の中で何かが固まった。', en: 'After seven days and nights of meditation, something inside {name} set solid.' } },
        { ja: 'まだ早い。気をもっと練る', en: 'Not yet. Refine more qi first', eff: { mind: 2 } },
      ],
    },
    why: { ja: '仙侠では修行の段が上がるごとに寿命の上限が延びる', en: 'In cultivation worlds, each realm reached raises the limit of a lifespan' },
  },
  {
    id: 'ne.e.golden-core', stage: ['adult', 'middle'], tags: CU, flag: 'ne.foundation', noFlag: 'ne.core', w: 2, kind: 'power', big: true,
    ja: '{name}は洞府に籠もり、気を一点に押し固めて金丹を結ぼうとした。',
    en: "{name} sealed themselves in a mountain cave to compress all their qi into a single point and form a Golden Core.",
    choice: {
      ja: '結丹を急ぐ?', en: 'Rush the Golden Core?',
      options: [
        { ja: '今、結ぶ', en: 'Form it now', set: 'ne.core', eff: { level: 4, mind: 2 }, risk: { hazard: 'magic', p: 0.12 },
          log: { ja: '三年後、洞府から出てきた{name}の目には、金の光が宿っていた。', en: "Three years later, {name} emerged from the cave with a glint of gold in the eyes." } },
        { ja: 'あと十年、土台を磨く', en: 'Polish the foundation for another ten years', eff: { level: 1, mind: 1 } },
      ],
    },
  },
  {
    id: 'ne.e.nascent-soul', stage: ['middle', 'elder'], tags: CU, flag: 'ne.core', noFlag: 'ne.nascent', w: 2, kind: 'power', big: true,
    ja: '金丹が砕け、その中から小さな{name}の姿が生まれた。元嬰、魂そのものが形を持つ段だ。',
    en: "The Golden Core cracked, and from within it emerged a tiny figure of {name}: the Nascent Soul, the stage where the spirit itself takes form.",
    set: 'ne.nascent', eff: { level: 5, mind: 4 }, risk: { hazard: 'magic', p: 0.15 },
  },
  {
    id: 'ne.e.tribulation', stage: ['adult', 'middle', 'elder'], tags: CU, flag: 'ne.core', noFlag: 'ne.ascend', w: 2, kind: 'battle', big: true,
    ja: '{name}の頭上に黒雲が渦を巻いた。修行者が一段を越えるたびに天が下す、雷の試し、天劫だ。',
    en: "Black clouds swirled above {name}. It was a Heavenly Tribulation, the trial of lightning heaven sends whenever a cultivator rises too far.",
    choice: {
      ja: '天劫をどう受ける?', en: 'How do you face the Tribulation?',
      options: [
        { ja: '身ひとつで雷を受ける', en: 'Take the lightning bare-handed', set: 'ne.ascend', eff: { level: 5, fame: 5 }, risk: { hazard: 'magic', p: 0.2 },
          log: { ja: '九つめの雷が落ちたあと、{name}はまだ立っていた。', en: 'When the ninth bolt had fallen, {name} was still standing.' } },
        { ja: '法宝を盾にして逸らす', en: 'Deflect it with a magic treasure', set: 'ne.ascend', eff: { level: 3, wealth: -6 }, risk: { hazard: 'magic', p: 0.08 } },
        { ja: '逃げて、身を隠す', en: 'Flee and hide', eff: { happy: -3, mind: -1 } },
      ],
    },
  },
  {
    id: 'ne.e.qi-deviation', stage: ['teen', 'adult', 'middle'], tags: CU, flag: 'ne.qi', w: 1, repeat: true, kind: 'ill',
    ja: '修行中、{name}の気が逆流した。目の前が赤く染まり、気がつくと吐いた血で衣が濡れていた。',
    en: "During meditation, {name}'s qi flowed backward, the dreaded qi deviation. The world turned red, and {name} came to with robes soaked in coughed-up blood.",
    eff: { hp: -5, mind: -2 }, risk: { hazard: 'magic', p: 0.03 },
    why: { ja: '気の流れを誤ると、修行者は自分の力に焼かれる', en: 'Misdirected qi lets a cultivator be burned by their own power' },
  },
  {
    id: 'ne.e.pill', stage: ['adult', 'middle'], tags: CU, flag: 'ne.sect', w: 1.5, kind: 'work',
    ja: '{name}は七日七晩炉の火を守り、ようやく一粒の丹薬を練り上げた。かすかに桃の香りがした。',
    en: "{name} tended the alchemy furnace for seven days and nights and finally refined a single elixir pill. It smelled faintly of peaches.",
    choice: {
      ja: '丹薬をどうする?', en: 'What do you do with the pill?',
      options: [
        { ja: '自分で飲む', en: 'Swallow it yourself', eff: { level: 2, hp: 2 } },
        { ja: '売る', en: 'Sell it', eff: { wealth: 6 } },
        { ja: '師に献じる', en: 'Offer it to your master', eff: { charm: 3 } },
      ],
    },
  },
  {
    id: 'ne.e.sect-war', stage: ['adult', 'middle'], tags: CU, flag: 'ne.sect', w: 1.2, kind: 'battle',
    ja: '隣の山の門派が、霊脈の境をめぐって攻めてきた。剣の光が夜空を何度も横切った。',
    en: "A rival sect from the neighboring mountain attacked over the boundary of a spirit vein, a seam of earthly energy. Sword light streaked across the night sky again and again.",
    tie: { role: 'nemesis', new: true, d: -15 },
    choice: {
      ja: '前に出る?', en: 'Go to the front?',
      options: [
        { ja: '前に出て戦う', en: 'Fight on the front line', eff: { power: 3, fame: 3 }, risk: { hazard: 'war', p: 0.06 } },
        { ja: '後ろで傷ついた弟子を手当てする', en: 'Tend the wounded disciples in the rear', eff: { charm: 3 }, risk: { hazard: 'war', p: 0.01 } },
      ],
    },
  },
  {
    id: 'ne.e.secret-realm', stage: ['teen', 'adult', 'middle'], tags: CU, flag: 'ne.qi', w: 1.5, kind: 'adventure',
    ja: '百年に一度だけ開く秘境の門が開いた。{name}は霊草を三株と、帰り道の傷をいくつか持ち帰った。',
    en: "The gate to a secret realm that opens once a century swung wide. {name} came back with three spirit herbs and a few wounds from the way out.",
    eff: { level: 2, hp: -2, wealth: 2 }, risk: { hazard: 'accident', p: 0.04 },
  },
  {
    id: 'ne.e.take-disciple', stage: ['adult', 'middle', 'elder'], tags: CU, flag: 'ne.foundation', w: 2, kind: 'work',
    ja: '弟子選びの日、{name}は誰も選ばなかった痩せた子を指さした。その子、{disciple}は一晩中泣いた。',
    en: "On the day disciples were chosen, {name} pointed at a skinny child no one else had picked. That child, {disciple}, cried all night.",
    eff: { happy: 3 }, tie: { role: 'disciple', new: true, d: 15 },
  },
  {
    id: 'ne.e.disciple-betray', stage: ['adult', 'middle', 'elder'], tags: CU, w: 0.8, kind: 'hard',
    ja: '{disciple}が、{name}の秘伝の書を持って敵の門派に走ったと知らせが来た。',
    en: "Word came that {disciple} had fled to a rival sect, taking {name}'s secret manual.",
    tie: { role: 'disciple', d: -30 },
    choice: {
      ja: '追う?', en: 'Go after them?',
      options: [
        { ja: '追って連れ戻す', en: 'Chase them down and bring them back', eff: { power: 1, happy: -2 }, risk: { hazard: 'violence', p: 0.04 } },
        { ja: '行かせる', en: 'Let them go', eff: { happy: -4, mind: 2 },
          log: { ja: '{name}は書の写しを火にくべた。教えたことは、誰にも盗めない。', en: '{name} burned the copy of the manual. What had been taught could not be stolen.' } },
      ],
    },
  },
  {
    id: 'ne.e.mortal-family', stage: ['adult', 'middle'], tags: CU, flag: 'ne.qi', w: 1.5, kind: 'family',
    ja: '二十年ぶりに山を下りた{name}は、家の前で腰の曲がった老人に会った。それが自分の弟だと分かるまで、少しかかった。',
    en: "Coming down the mountain after twenty years, {name} met a stooped old man outside the family home. It took a moment to recognize him as {name}'s younger brother.",
    eff: { happy: -4 },
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: 'しばらく村に留まる', en: 'Stay in the village for a while', eff: { happy: 3 } },
        { ja: '山へ戻る', en: 'Go back up the mountain', eff: { level: 1, happy: -2 } },
      ],
    },
  },
  {
    id: 'ne.e.shizun-seclusion', stage: ['adult', 'middle', 'elder'], tags: CU, flag: 'ne.sect', w: 1, kind: 'loss',
    ja: '閉関すると言って洞府に入った{mentor}は、百日が過ぎても出てこなかった。{name}は毎朝、洞府の前に茶を置いた。',
    en: "{mentor} entered a cave for secluded meditation and had not come out after a hundred days. Every morning, {name} left tea at the entrance.",
    eff: { happy: -3 }, tie: { role: 'mentor', d: 5 },
  },
  {
    id: 'ne.e.outlive', stage: ['elder'], tags: CU, flag: 'ne.core', w: 3, kind: 'old',
    ja: '{name}は、子どもの頃に一緒に川で遊んだ{friend}の葬儀に出た。{name}の髪は、まだ黒いままだった。',
    en: "{name} attended the funeral of {friend}, a childhood playmate from the river. {name}'s hair was still black.",
    eff: { happy: -4, mind: 1 }, tie: { role: 'friend', d: 5 },
    why: { ja: '修行者は凡人の友より何十年も長く生きる', en: 'Cultivators outlive their mortal friends by decades' },
  },
  {
    id: 'ne.e.uncounted', stage: ['elder'], tags: CU, flag: 'ne.nascent', w: 3, kind: 'old',
    ja: '{name}は自分の年を数えるのをやめた。山の麓の村は、三度名前が変わっていた。',
    en: "{name} stopped counting the years. The village at the foot of the mountain had changed its name three times.",
    eff: { mind: 3, happy: 1 },
  },
  {
    id: 'ne.e.cultivator-stones', stage: ['teen', 'adult', 'middle', 'elder'], tags: CU, jobs: ['cultivator'], w: 2, repeat: true, kind: 'work',
    ja: '{name}は宗門の任務で妖獣を退け、報酬の霊石を袋に数えた。修行は、何より霊石を食う。',
    en: "{name} drove off a demon beast on a sect mission and counted out the spirit stones paid in reward. Cultivation eats spirit stones faster than anything.",
    eff: { wealth: 2, level: 1 }, risk: { hazard: 'monster', p: 0.02 },
  },
  {
    id: 'ne.e.memory-novel', stage: ['teen', 'adult'], tags: CU, flag: 'ne.sect', memory: true, w: 2, kind: 'power',
    ja: '{name}は前世で読んだ修仙小説を思い出し、崖の下に宝が隠れていると信じて飛び降りた。下には、何もなかった。',
    en: "Remembering cultivation novels from a past life, {name} jumped off a cliff sure that treasure would be hidden at the bottom. There was nothing there.",
    eff: { hp: -3, happy: -1 }, risk: { hazard: 'accident', p: 0.01 },
  },
  {
    id: 'ne.e.exam-pass', stage: ['teen', 'adult', 'middle'], tags: CU, flag: 'ne.studied', noFlag: 'ne.exam', w: 1.5, kind: 'fame', big: true,
    ja: '合格者の名を記した掲示に、{name}の名があった。帰郷の日、村の入口で太鼓が鳴らされた。',
    en: "{name}'s name was on the posted list of those who passed the imperial examination. On the day {name} returned home, drums sounded at the village gate.",
    set: 'ne.exam', eff: { fame: 6, wealth: 3, happy: 4 },
  },
  {
    id: 'ne.e.exam-fail', stage: ['teen', 'adult', 'middle'], tags: CU, flag: 'ne.studied', noFlag: 'ne.exam', w: 1.5, repeat: true, kind: 'hard',
    ja: '掲示の端から端まで探しても、{name}の名はなかった。次の試験は三年後だ。',
    en: "{name} searched the examination list from end to end, but the name was not there. The next exam was three years away.",
    eff: { happy: -4, mind: 1 },
  },
  {
    id: 'ne.e.magistrate', stage: ['adult', 'middle'], tags: CU, flag: 'ne.exam', w: 2, kind: 'work',
    ja: '{name}は地方の知県として赴任した。最初の訴えは、隣家の鶏が自分の庭で卵を産んだのはどちらの物か、だった。',
    en: "{name} took up a post as a county magistrate. The first case: when a neighbor's hen lays an egg in your yard, whose egg is it?",
    eff: { wealth: 3, fame: 2, mind: 1 },
  },
  {
    id: 'ne.e.harem-poison', stage: ['teen', 'adult'], tags: CU, flag: 'ne.harem', w: 2, kind: 'hard',
    ja: '贈られた香の箱から、かすかに苦い匂いがした。贈り主は、同じ位の妃の{rival}だった。',
    en: "A gift box of incense gave off a faint bitter smell. It came from {rival}, a consort of the same rank.",
    tie: { role: 'rival', new: true, d: -15 },
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: '皇后に訴え出る', en: 'Bring it before the empress', eff: { fame: 2 }, risk: { hazard: 'execution', p: 0.03 } },
        { ja: '黙って捨て、借りは覚えておく', en: 'Discard it quietly and remember the debt', eff: { mind: 2 } },
        { ja: '知らずに焚く', en: 'Burn it without suspicion', eff: { hp: -4 }, risk: { hazard: 'violence', p: 0.06 } },
      ],
    },
    why: { ja: '後宮では毒と陰謀が、剣よりも多く人を殺す', en: 'In the inner palace, poison and intrigue kill more than any blade' },
  },
  {
    id: 'ne.e.harem-favor', stage: ['teen', 'adult'], tags: CU, flag: 'ne.harem', w: 1.5, kind: 'love',
    ja: '月の夜、{name}の部屋の前に皇帝の輿が止まった。翌朝から、宮女たちの{name}への挨拶が一段深くなった。',
    en: "On a moonlit night, the emperor's palanquin stopped before {name}'s quarters. From the next morning, the palace maids bowed a little lower to {name}.",
    eff: { fame: 3, wealth: 2, happy: 1 }, tie: { role: 'lover', new: true, d: 5 },
  },
  {
    id: 'ne.e.harem-rank', stage: ['adult', 'middle'], tags: CU, flag: 'ne.harem', w: 1.5, kind: 'fame',
    ja: '{name}は一つ上の位に上げられ、住まいが南向きの殿舎に移った。日当たりの良さは、そのまま寵愛の量だった。',
    en: "{name} was promoted one rank and moved to a south-facing hall. In the palace, sunlight was a measure of the emperor's favor.",
    eff: { fame: 3, wealth: 3 },
  },
  {
    id: 'ne.e.samurai-lord', stage: ['teen', 'adult'], tags: JP, jobs: ['samurai'], w: 3, kind: 'work', big: true,
    ja: '{name}は{master}に仕えることになった。初めての目通りで、{master}は{name}の刀より草鞋の減り方を見ていた。',
    en: "{name} entered the service of {master}, the feudal lord. At their first audience, {master} looked less at {name}'s sword than at how worn {name}'s sandals were.",
    eff: { fame: 2, wealth: 2 }, tie: { role: 'master', new: true, d: 10 },
  },
  {
    id: 'ne.e.envoy', stage: ['adult', 'middle'], tags: JP, jobs: ['samurai'], w: 1.5, kind: 'adventure',
    ja: '{master}の命で、{name}は敵方の城への使者に立った。帰り道、峠で矢が一本、笠をかすめた。',
    en: "On {master}'s orders, {name} went as envoy to an enemy castle. On the way back, an arrow grazed {name}'s straw hat at the mountain pass.",
    eff: { fame: 2 }, tie: { role: 'master', d: 5 }, risk: { hazard: 'violence', p: 0.02 },
  },
  {
    id: 'ne.e.remonstrate', stage: ['adult', 'middle'], tags: JP, jobs: ['samurai'], w: 1, kind: 'hard',
    ja: '{master}が無理な戦を起こそうとしていた。それを止められる立場にいるのは、{name}だけだった。',
    en: "{master} was set on starting a reckless war, and {name} was the only retainer in a position to stop it.",
    tie: { role: 'master', d: -5 },
    choice: {
      ja: 'どうする?', en: 'What do you do?',
      options: [
        { ja: '命をかけて諫める', en: 'Remonstrate, at the risk of your life', eff: { fame: 4 }, risk: { hazard: 'execution', p: 0.12 },
          log: { ja: '{name}の言葉に、{master}は長いあいだ黙っていた。', en: '{master} said nothing for a long time after hearing {name} out.' } },
        { ja: '黙って従う', en: 'Obey in silence', eff: { happy: -3 }, risk: { hazard: 'war', p: 0.03 } },
        { ja: '刀を置き、浪人になる', en: 'Lay down your sword and become a ronin, a masterless samurai', set: 'ne.ronin', eff: { wealth: -5, happy: 1 } },
      ],
    },
  },
  {
    id: 'ne.e.ronin', stage: ['adult', 'middle'], tags: JP, flag: 'ne.ronin', w: 3, kind: 'work',
    ja: '浪人になった{name}は、長屋で傘張りの内職をした。刀は押し入れの奥で、一度も抜かれなかった。',
    en: "Now masterless, {name} glued paper umbrellas for piecework in a tenement. The sword stayed at the back of a cupboard, never once drawn.",
    eff: { wealth: -1, happy: 1, mind: 1 },
  },
  {
    id: 'ne.e.battle', stage: ['teen', 'adult', 'middle'], tags: JP, jobs: ['samurai'], w: 1.5, repeat: true, kind: 'battle',
    ja: '合戦の朝、霧の向こうで法螺貝が鳴った。{name}は槍を握り直し、前の者の背中だけを見て走った。',
    en: "On the morning of battle, a conch-shell horn sounded through the fog. {name} tightened a grip on the spear and ran, eyes on nothing but the back ahead.",
    eff: { power: 2, fame: 2 }, risk: { hazard: 'war', p: 0.06 },
  },
  {
    id: 'ne.e.samurai-duel', stage: ['adult', 'middle'], tags: JP, jobs: ['samurai'], w: 1, kind: 'battle',
    ja: '父の仇を名乗る若い侍が、{name}に果たし状を送ってきた。日時は満月の夜、場所は河原。',
    en: "A young samurai claiming {name} had killed his father sent a formal challenge: the night of the full moon, on the riverbank.",
    choice: {
      ja: '河原へ行く?', en: 'Go to the riverbank?',
      options: [
        { ja: '行く', en: 'Go', eff: { fame: 3, power: 1 }, risk: { hazard: 'violence', p: 0.08 } },
        { ja: '行かずに、事情を書いた文を送る', en: 'Stay away and send a letter explaining what really happened', eff: { mind: 2, fame: -2 } },
      ],
    },
  },
  {
    id: 'ne.e.shikigami', stage: ['teen', 'adult'], tags: JP, jobs: ['onmyoji'], w: 3, kind: 'power', big: true,
    ja: '{name}が折った紙の鳥が、息を吹きかけると羽ばたいた。初めての式神、{familiar}だった。',
    en: "The paper bird {name} folded flapped its wings when breathed upon. It was {name}'s first shikigami, a summoned spirit servant: {familiar}.",
    eff: { mind: 3, level: 1 }, tie: { role: 'familiar', new: true, d: 15 },
  },
  {
    id: 'ne.e.exorcism', stage: ['adult', 'middle'], tags: JP, jobs: ['onmyoji'], w: 2, kind: 'adventure',
    ja: '長者の屋敷に夜ごと女の泣き声がすると、{name}が呼ばれた。声は、蔵の床下から聞こえていた。',
    en: "A rich man's mansion echoed every night with a woman's weeping, and {name} was called in as onmyoji, a diviner and exorcist. The voice came from beneath the storehouse floor.",
    choice: {
      ja: 'どう向き合う?', en: 'How do you handle the spirit?',
      options: [
        { ja: '呪符で祓う', en: 'Banish it with talismans', eff: { fame: 3, wealth: 3 }, risk: { hazard: 'magic', p: 0.04 } },
        { ja: '話を聞いて鎮める', en: 'Listen to its story and lay it to rest', eff: { mind: 2, charm: 2 }, risk: { hazard: 'magic', p: 0.01 },
          log: { ja: '床下から古い櫛が出てきた。供養のあと、泣き声はやんだ。', en: 'An old comb was found beneath the floor. After a memorial rite, the weeping stopped.' } },
      ],
    },
  },
  {
    id: 'ne.e.divination', stage: ['adult', 'middle', 'elder'], tags: JP, jobs: ['onmyoji'], w: 2, repeat: true, kind: 'work',
    ja: '{name}は星を読み、殿の出陣の日取りを占った。吉と出た日は、たまたま雨だった。',
    en: "{name} read the stars to divine an auspicious day for the lord's campaign. The lucky day turned out to be rainy.",
    eff: { mind: 1, wealth: 1 },
  },
  {
    id: 'ne.e.fox-spouse', stage: ['adult'], tags: JP, magic: 1, w: 0.8, kind: 'love',
    ja: '天気雨の日に軒先で出会った{lover}の影は、障子に映ると、尾が九本あった。',
    en: "{name} met {lover} sheltering under the eaves in a sunshower. When the shadow fell across the paper screen, it had nine tails. {lover} was a fox spirit.",
    tie: { role: 'lover', new: true, d: 15 },
    choice: {
      ja: '気づいたことを言う?', en: 'Say what you saw?',
      options: [
        { ja: '黙って、そばにいる', en: 'Say nothing and stay', eff: { happy: 5, luck: 2 } },
        { ja: '正体を問いただす', en: 'Demand the truth', eff: { mind: 2, happy: -3 },
          log: { ja: '翌朝、{lover}の寝床には狐の毛が一本だけ残っていた。', en: "The next morning, all that was left in {lover}'s bed was a single fox hair." } },
      ],
    },
  },
  {
    id: 'ne.e.famine', stage: ['child', 'teen', 'adult', 'middle', 'elder'], tags: E, status: ['poor', 'commoner', 'slave', 'orphan'], w: 1, kind: 'hard',
    ja: '冷たい夏で稲が実らなかった。{name}の家では、冬の終わりに木の皮を煮て食べた。',
    en: "A cold summer left the rice unripened. By the end of winter, {name}'s family was boiling tree bark to eat.",
    eff: { hp: -5, happy: -4 }, risk: { hazard: 'famine', p: 0.05 },
  },
  {
    id: 'ne.e.uprising', stage: ['adult', 'middle'], tags: JP, status: ['poor', 'commoner'], w: 1, kind: 'hard',
    ja: '重い年貢に耐えかねた村々が、筵旗を掲げて代官所へ向かうことになった。{name}の家にも、誘いが来た。',
    en: "Unable to bear the crushing taxes any longer, the villages planned to march on the magistrate's office under straw-mat banners in a peasant uprising. The call came to {name}'s door too.",
    choice: {
      ja: '加わる?', en: 'Join them?',
      options: [
        { ja: '加わる', en: 'Join', eff: { charm: 3, fame: 2 }, risk: { hazard: 'execution', p: 0.08 } },
        { ja: '戸を閉めて家にいる', en: 'Shut the door and stay home', eff: { charm: -2 } },
      ],
    },
  },
  {
    id: 'ne.e.ninja-mission', stage: ['teen', 'adult', 'middle'], tags: JP, jobs: ['ninja'], w: 2, repeat: true, kind: 'adventure',
    ja: '{name}は新月の夜、敵方の城の天井裏に忍び込んだ。床下から聞こえる軍議を、一字残らず覚えた。',
    en: "On a moonless night, {name} slipped into the rafters of an enemy castle and memorized every word of the war council below.",
    eff: { mind: 2, wealth: 2 }, risk: { hazard: 'violence', p: 0.05 },
  },
  {
    id: 'ne.e.ninja-disguise', stage: ['adult', 'middle'], tags: JP, jobs: ['ninja'], w: 1.5, kind: 'work',
    ja: '{name}は薬売りに化けて、敵の城下で三年暮らした。近所の子どもたちには、飴をくれる優しいおじさんで通っていた。',
    en: "{name} lived three years in an enemy castle town disguised as a medicine peddler. To the neighborhood children, {name} was just the kind one who handed out candy.",
    eff: { charm: 2, mind: 2 },
  },
  {
    id: 'ne.e.great-fire', stage: ['child', 'teen', 'adult', 'middle', 'elder'], tags: E, w: 0.8, kind: 'hard',
    ja: '冬の乾いた風の夜、町に火が出た。{name}は持てるだけの物を背負って川べりまで逃げた。翌朝、通りは三本まるごと消えていた。',
    en: "On a night of dry winter wind, fire broke out in town. {name} fled to the riverbank with whatever could be carried. By morning, three entire streets were gone.",
    eff: { wealth: -5, happy: -3 }, risk: { hazard: 'accident', p: 0.02 },
  },
  {
    id: 'ne.e.rice-market', stage: ['adult', 'middle'], tags: E, jobs: ['merchant'], w: 1.5, kind: 'work',
    ja: '{name}は空を見て、今年は不作になると読んだ。蔵いっぱいに米を買い込んだ。',
    en: "Reading the sky, {name} predicted a poor harvest and filled the warehouse with rice.",
    eff: { wealth: 5, charm: -1 },
  },
  {
    id: 'ne.e.escort-agency', stage: ['adult', 'middle'], tags: CU, jobs: ['merchant', 'none', 'samurai'], w: 1, kind: 'adventure',
    ja: '{name}は護送屋の一行に加わり、絹の荷を山向こうの町まで運んだ。峠で山賊が待っていた。',
    en: "{name} joined a convoy of armed escorts carrying bolts of silk over the mountains. Bandits were waiting at the pass.",
    eff: { power: 2, wealth: 2 }, risk: { hazard: 'violence', p: 0.03 },
  },
  {
    id: 'ne.e.jianghu-friend', stage: ['adult', 'middle'], tags: CU, noFlag: 'ne.sect', w: 1.5, kind: 'love',
    ja: '宿場の酒楼で、{name}は見知らぬ剣客と同じ卓になった。夜が明ける頃には、二人は兄弟の契りを結んでいた。それが{friend}だった。',
    en: "At an inn's tavern, {name} ended up sharing a table with a wandering swordsman. By dawn they had sworn to be brothers. That was {friend}.",
    eff: { happy: 4, charm: 1 }, tie: { role: 'friend', new: true, d: 20 },
  },
  {
    id: 'ne.e.shrine-rite', stage: ['adult', 'middle'], tags: JP, jobs: ['priest'], w: 1.5, kind: 'work',
    ja: '{name}は年に一度の神事を務めた。舞の途中で、境内の風がぴたりとやんだ。',
    en: "{name} officiated at the year's great shrine rite. In the middle of the sacred dance, the wind in the grounds stopped dead.",
    eff: { fame: 2, mind: 1 },
  },
  {
    id: 'ne.e.arranged-match', stage: ['adult'], tags: JP, noFlag: 'married', w: 1.5, kind: 'family',
    ja: '仲人が{name}の家に縁談を持ってきた。婚礼の日、{name}は綿帽子の下の{spouse}の顔を初めて見た。',
    en: "A matchmaker brought a marriage proposal to {name}'s family. On the wedding day, {name} saw {spouse}'s face for the first time, beneath the white bridal hood.",
    set: 'married', eff: { happy: 2 }, tie: { role: 'spouse', new: true, d: 5 },
  },
  {
    id: 'ne.e.adopt-heir', stage: ['middle', 'elder'], tags: E, status: ['gentry', 'noble', 'merchant'], w: 1, kind: 'family',
    ja: '家を継ぐ者がいなかった{name}は、遠縁の子を養子に迎えた。{child}は最初の晩、出された膳に手をつけなかった。',
    en: "With no one to carry on the house, {name} adopted a child from a distant branch of the family. On the first night, {child} would not touch the meal set out.",
    eff: { happy: 2 }, tie: { role: 'child', new: true, d: 5 },
    why: { ja: '家は血より名で続く', en: 'A house continues by its name more than by its blood' },
  },
  {
    id: 'ne.e.pilgrimage', stage: ['middle', 'elder'], tags: JP, w: 1.2, kind: 'adventure',
    ja: '{name}は白装束で、遠い霊山への巡礼に出た。杖の鈴が鳴るたびに、来た道のことを一つずつ忘れた。',
    en: "Dressed in pilgrim's white, {name} set out for a distant sacred mountain. With every chime of the staff's bell, {name} let go of one more memory of the road behind.",
    eff: { happy: 3, hp: -1, mind: 1 },
  },
  {
    id: 'ne.e.take-vows', stage: ['elder'], tags: E, w: 1.2, kind: 'old',
    ja: '家督を譲った{name}は、頭を丸めて寺に入った。朝の掃き掃除が、一日でいちばん好きな時間になった。',
    en: "Having handed down the family headship, {name} shaved their head and entered a temple. Sweeping the grounds in the morning became the best part of each day.",
    set: 'retired', eff: { happy: 4 },
  },
  {
    id: 'ne.e.death-poem', stage: ['elder'], tags: JP, w: 1.5, kind: 'old',
    ja: '{name}は辞世の歌を書いて、文箱にしまった。使う日が来るまで、毎年少しずつ書き直した。',
    en: "{name} wrote a death poem, a final verse for the end of life, and tucked it in a letter box. Until the day came, {name} revised it a little every year.",
    eff: { mind: 2, happy: 1 },
  },
  {
    id: 'ne.e.palace-maid', stage: ['teen', 'adult'], tags: CU, status: ['poor', 'slave', 'orphan'], w: 1, kind: 'work',
    ja: '{name}は宮中の下働きに売られた。洗い場の冷たい水で、冬には指がひび割れた。',
    en: "{name} was sold into service in the imperial palace. In winter, the icy water of the washhouse split {name}'s fingers.",
    eff: { hp: -2, wealth: 1, happy: -2 },
  },
];
