// 異世界ものの定番ネタ (jobs)。書き方と条件の例は tropes.ts の頭。読み込みは engine/events.ts が src/data/events/*.ts を全部集める
// 異世界転移した人の元の仕事 (flags 'earth.<符号>'、src/data/transfer.ts の EARTH_JOBS) が効く話。1つの仕事に2本: 役に立つ話と、癖が空回りする話
import type { EventDef } from '../../engine/types';

const T: EventDef['arrival'] = ['summoned'];
const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const KINGDOM: EventDef['tags'] = ['fantasy', 'eastern']; // 王宮・神殿・ギルドのある世界
const LOW: EventDef['tech'] = [0, 6];                       // 地球の知恵が珍しい世界

export const EVENTS: EventDef[] = [
  // ---- 高校生 ----------------------------------------------------------------
  {
    id: 'tpj.student-flame', stage: GROWN, arrival: T, flag: 'earth.student', tech: LOW, w: 2, kind: 'fame',
    ja: '化学の授業で習った炎色反応を思い出した。祭りの花火に色がついて、{name}は町の人気者になった。',
    en: '{name} remembered flame tests from chemistry class. The festival fireworks burst in color, and {he} became the toast of the town.',
    eff: { fame: 4, charm: 2 },
  },
  {
    id: 'tpj.student-history', stage: GROWN, arrival: T, flag: 'earth.student', w: 2, kind: 'hard',
    ja: '歴史の授業を、もっと聞いておけばよかった。思い出せたのは年号の語呂合わせだけで、その年に何があったかは出てこない。',
    en: '{name} wished {he} had paid more attention in history class. A rhyme for remembering a date came back. What happened that year did not.',
    eff: { mind: 1, happy: -1 },
  },

  // ---- 大学生 ----------------------------------------------------------------
  {
    id: 'tpj.college-folklore', stage: GROWN, arrival: T, flag: 'earth.college', w: 2, kind: 'work',
    ja: '民俗学のゼミにいた{name}は、村の昔話が星の動きの記録だと気づいた。ゼミの教授に見せたかった。',
    en: 'Having taken a folklore seminar, {name} realized the village legends were a record of the stars. {He} wished {he} could show the professor.',
    eff: { mind: 3, fame: 2 },
  },
  {
    id: 'tpj.college-circle', stage: GROWN, arrival: T, flag: 'earth.college', tags: KINGDOM, w: 2, kind: 'work',
    ja: '「大学で何を学んだのか」と聞かれ、{name}は正直に「サークルの会計」と答えた。翌日から、ギルドの会計を任された。',
    en: 'Asked what {he} had studied at college, {name} honestly said, "I was treasurer of a club." The next day, {he} was put in charge of the guild\'s books.',
    eff: { wealth: 4, happy: 1 },
  },

  // ---- 会社員 ----------------------------------------------------------------
  {
    id: 'tpj.office-report', stage: GROWN, arrival: T, flag: 'earth.office', w: 2, kind: 'work',
    ja: '会社員だった{name}が、冒険者の一行に「報告・連絡・相談」を持ち込んだ。依頼の失敗は半分に減り、会議は倍に増えた。',
    en: '{name}, a former office worker, taught the adventuring party to report, update and consult. Failed quests were cut in half. Meetings doubled.',
    eff: { fame: 2, charm: 1 },
  },
  {
    id: 'tpj.office-meeting', stage: ['adult', 'middle'], arrival: T, flag: 'earth.office', tags: KINGDOM, w: 2, kind: 'work',
    ja: '領主の館の朝の会議に呼ばれた。',
    en: "{name} was called to the morning meeting at the lord's manor.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '前の職場の癖で、うなずき続ける', en: 'Keep nodding, out of old office habit', eff: { fame: 3, happy: -2 }, log: { ja: '気づくと、来年の祭りの責任者になっていた。', en: "Before {he} knew it, {he} was in charge of next year's festival." } },
      { ja: '「持ち帰って検討します」と言う', en: '"Let me take that back and think it over"', eff: { charm: 3, luck: 1 }, log: { ja: '領主はいたく感心した。この世界には、まだその技が無かった。', en: 'The lord was deeply impressed. No one in this world had discovered that technique yet.' } },
    ] },
  },

  // ---- 看護師 ----------------------------------------------------------------
  {
    id: 'tpj.nurse-triage', stage: GROWN, arrival: T, flag: 'earth.nurse', w: 2, kind: 'work',
    ja: 'けが人が一度に十人運ばれてきた。{name}は手当ての順番を決めて、色の札を配った。治癒術師たちは今もその札を使っている。',
    en: 'Ten wounded were carried in at once. {name} sorted them by urgency and handed out colored tags. The healers still use those tags today.',
    eff: { fame: 3, charm: 2 },
  },
  {
    id: 'tpj.nurse-saint', stage: GROWN, arrival: T, flag: 'earth.nurse', tags: KINGDOM, w: 2, kind: 'fame',
    ja: '熱を測って薬を飲ませていただけなのに、村の人が{name}を「聖女さま」と呼び始めた。',
    en: 'All {name} did was take temperatures and hand out medicine, but the villagers started calling {him} "the Saint".',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '訂正する', en: 'Correct them', eff: { charm: 2 }, log: { ja: '十通りの言い方で訂正した。今は「看護師という名の聖女さま」と呼ばれている。', en: 'Tried correcting them ten different ways. Now {he} is known as "the Saint called Nurse".' } },
      { ja: 'あきらめて受け入れる', en: 'Give up and accept it', eff: { fame: 4, happy: -1 }, log: { ja: '神殿から、聖女の衣装の寸法を聞く手紙が来た。', en: 'A letter came from the temple asking for {his} measurements for the Saint\'s robes.' } },
    ] },
  },

  // ---- 料理人 ----------------------------------------------------------------
  {
    id: 'tpj.cook-beast', stage: GROWN, arrival: T, flag: 'earth.cook', tags: KINGDOM, w: 2, kind: 'work',
    ja: '料理人だった{name}は、魔物の肉の下ごしらえを三日で覚えた。ギルドの食堂に「本日の{beast}」の札が下がるようになった。',
    en: 'As a former cook, {name} learned to prepare monster meat in three days. The guild cafeteria began posting a "{beast} of the Day".',
    eff: { wealth: 4, fame: 2 },
  },
  {
    id: 'tpj.cook-dashi', stage: GROWN, arrival: T, flag: 'earth.cook', w: 2, kind: 'hard',
    ja: 'だしを取るために、市場じゅうの干物を買い集めた。宿の部屋は三か月くさかった。だしは、よく出た。',
    en: 'To make proper soup stock, {name} bought up every dried fish in the market. The inn room smelled for three months. The stock was excellent.',
    eff: { happy: 2, charm: -1 },
  },

  // ---- プログラマー ----------------------------------------------------------------
  {
    id: 'tpj.programmer-refactor', stage: GROWN, arrival: T, flag: 'earth.programmer', magic: 2, w: 2, kind: 'power',
    ja: '魔法陣を眺めていた{name}は、同じ記号が三回くり返されているのに気づいた。まとめて書き直すと、詠唱が半分になった。',
    en: 'Studying a magic circle, {name} noticed the same symbol repeated three times. After rewriting it as one, the incantation was half as long.',
    eff: { mind: 3, fame: 2 },
  },
  {
    id: 'tpj.programmer-reboot', stage: GROWN, arrival: T, flag: 'earth.programmer', magic: 1, w: 2, kind: 'hard',
    ja: '詠唱をまちがえ続ける見習いに、{name}は「一回再起動してみて」と言った。見習いは一晩寝て起きた。本当に直った。',
    en: 'To an apprentice who kept botching a spell, {name} said, "Try rebooting." The apprentice slept on it. It actually worked.',
    eff: { charm: 2, happy: 1 },
  },

  // ---- 農家 ----------------------------------------------------------------
  {
    id: 'tpj.farmer-rotation', stage: ['adult', 'middle'], arrival: T, flag: 'earth.farmer', tech: LOW, w: 2, kind: 'work',
    ja: '農家だった{name}が、畑に植える順番を変えた。四年目の飢饉の年、この村の麦だけが実った。',
    en: '{name}, a former farmer, changed the order of what the fields were planted with. In the famine of the fourth year, this village alone had a harvest.',
    eff: { fame: 4, charm: 3 },
  },
  {
    id: 'tpj.farmer-soil', stage: GROWN, arrival: T, flag: 'earth.farmer', w: 2, kind: 'hard',
    ja: '土をひとつまみ口に入れて確かめていたら、「土を食べる人」と呼ばれるようになった。土の見立ては、毎回当たった。',
    en: '{name} tasted a pinch of soil to judge it, and was soon known as "the one who eats dirt". {His} judgment of the soil was never wrong.',
    eff: { mind: 2, charm: -1 },
  },

  // ---- 自衛官 ----------------------------------------------------------------
  {
    id: 'tpj.sdf-rollcall', stage: GROWN, arrival: T, flag: 'earth.sdf', tags: KINGDOM, w: 2, kind: 'battle',
    ja: '義勇兵の訓練を任された。{name}が最初に教えたのは、剣ではなく整列と点呼だった。その年、迷子になった兵は一人もいなかった。',
    en: 'Put in charge of training volunteers, {name} started not with swords but with lining up and roll call. That year, not a single soldier got lost.',
    eff: { fame: 3, power: 2 },
  },
  {
    id: 'tpj.sdf-bed', stage: GROWN, arrival: T, flag: 'earth.sdf', w: 2, kind: 'hard',
    ja: '毎朝六時に起きて、ベッドを角までぴしりと整える。宿のおかみは、{name}の部屋だけ掃除代を取らなくなった。',
    en: 'Up at six every morning, {name} made the bed with razor-sharp corners. The innkeeper stopped charging {him} for cleaning.',
    eff: { wealth: 2, hp: 1 },
  },

  // ---- 主婦・主夫 ----------------------------------------------------------------
  {
    id: 'tpj.home-preserves', stage: GROWN, arrival: T, flag: 'earth.home', w: 2, kind: 'family',
    ja: '冬の前に、{name}は干し野菜と漬物を家じゅうに並べた。大雪の年、近所の三軒が{name}の台所で冬を越した。',
    en: 'Before winter, {name} filled the house with dried vegetables and pickles. In the year of the great snow, three neighboring families got through winter in {his} kitchen.',
    eff: { charm: 4, happy: 2 },
  },
  {
    id: 'tpj.home-packing', stage: GROWN, arrival: T, flag: 'earth.home', w: 2, kind: 'adventure',
    ja: '旅の一行の荷物を見て、{name}は黙って全部たたみ直した。勇者は、自分の鞄にこんなに物が入ると初めて知った。',
    en: "Seeing the party's luggage, {name} silently refolded everything. The Hero had no idea that much could fit in one bag.",
    eff: { charm: 2, luck: 1 },
  },

  // ---- ニート ----------------------------------------------------------------
  {
    id: 'tpj.neet-genre', stage: GROWN, arrival: T, flag: 'earth.neet', w: 2, kind: 'power',
    ja: '部屋で異世界ものを百冊は読んでいた{name}には、次に何が起きるかだいたい分かった。だいたい当たった。',
    en: '{name} had read at least a hundred isekai novels in {his} room, so {he} could mostly guess what would happen next. {He} was mostly right.',
    eff: { luck: 3, mind: 1 },
  },
  {
    id: 'tpj.neet-form', stage: GROWN, arrival: T, flag: 'earth.neet', tags: KINGDOM, w: 2, kind: 'adventure',
    ja: 'ギルドの登録用紙に「前の仕事」の欄があった。',
    en: 'The guild registration form had a box for "Previous occupation".',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「自宅警備」と書く', en: 'Write "Home security"', eff: { fame: 1, power: 1 }, log: { ja: '町の警備隊から勧誘が来た。', en: 'The town watch tried to recruit {him}.' } },
      { ja: '空欄のまま出す', en: 'Leave it blank', eff: { luck: 2 }, log: { ja: '受付の人が小声で言った。「空欄の人は、大物が多いんですよ」。', en: 'The receptionist whispered, "The ones who leave it blank often turn out to be big names."' } },
    ] },
  },

  // ---- 教師 ----------------------------------------------------------------
  {
    id: 'tpj.teacher-chancellor', stage: ['middle', 'elder'], arrival: T, flag: 'earth.teacher', tags: KINGDOM, w: 2, kind: 'fame',
    ja: '{name}が開いた読み書きの塾から、宰相が出た。最初の授業で、ずっと鼻をほじっていた子だった。',
    en: 'One of the students from the reading school {name} had opened became chancellor. It was the kid who picked their nose through the entire first lesson.',
    eff: { fame: 4, happy: 3 },
  },
  {
    id: 'tpj.teacher-quiet', stage: GROWN, arrival: T, flag: 'earth.teacher', tags: KINGDOM, w: 2, kind: 'work',
    ja: '騒がしい騎士団の会議で、{name}は思わず「はい、静かになるまで三分かかりました」と言った。騎士団長が一番小さくなっていた。',
    en: 'At a rowdy knights\' council, {name} blurted out, "It took three minutes for everyone to be quiet." The knight commander shrank the most.',
    eff: { charm: 2, fame: 1 },
  },

  // ---- 経理 ----------------------------------------------------------------
  {
    id: 'tpj.accountant-ledger', stage: ['adult', 'middle'], arrival: T, flag: 'earth.accountant', tags: KINGDOM, w: 2, kind: 'work',
    ja: '複式簿記で領地の帳簿をつけ直した。三日目に代官の横領が見つかり、四日目に代官が菓子折りを持って謝りに来た。',
    en: "{name} redid the domain's books in double-entry. On day three, the steward's embezzlement came to light. On day four, the steward showed up with a box of sweets and an apology.",
    eff: { fame: 4, wealth: 3 },
  },
  {
    id: 'tpj.accountant-strong', stage: GROWN, arrival: T, flag: 'earth.accountant', tags: KINGDOM, w: 2, kind: 'work',
    ja: '王女に「異世界の方は、皆さんお強いのでしょう?」と聞かれた。',
    en: 'The princess asked, "People from other worlds are all very strong, aren\'t they?"',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「前は経理でした」と正直に言う', en: '"I used to be an accountant," honestly', eff: { charm: 2 }, log: { ja: '王女は経理が何か分からず、強そうな響きだと喜んだ。', en: 'The princess had no idea what an accountant was, but agreed it sounded very strong.' } },
      { ja: '「数字には強いです」と言う', en: '"I\'m strong with numbers"', eff: { wealth: 3, happy: -1 }, log: { ja: '翌日、王宮の予算書が三箱届いた。', en: 'The next day, three crates of royal budget reports arrived.' } },
    ] },
  },

  // ---- 配達員 ----------------------------------------------------------------
  {
    id: 'tpj.delivery-alleys', stage: GROWN, arrival: T, flag: 'earth.delivery', w: 2, kind: 'work',
    ja: '配達員だった{name}は、町じゅうの裏道を一か月で覚えた。{name}に頼んだ手紙は、早馬より早く届く。',
    en: 'A former delivery driver, {name} learned every back alley in town within a month. Letters sent through {name} arrived faster than the express riders.',
    eff: { wealth: 4, fame: 2 },
  },
  {
    id: 'tpj.delivery-sign', stage: GROWN, arrival: T, flag: 'earth.delivery', w: 2, kind: 'hard',
    ja: '荷物を渡すとき、{name}は今でも「こちらにサインを」と言ってしまう。受け取った人はみんな、少し誇らしげに名前を書く。',
    en: 'Handing over a package, {name} still says, "Sign here, please." Everyone signs their name with a little pride.',
    eff: { charm: 2 },
  },

  // ---- 研究者 ----------------------------------------------------------------
  {
    id: 'tpj.researcher-replicate', stage: GROWN, arrival: T, flag: 'earth.researcher', magic: 1, w: 2, kind: 'work',
    ja: '同じ魔法を百回ずつ唱えて、効き目を記録した。効く魔法と効かない魔法がはっきりして、{name}は学会から嫌われた。',
    en: '{name} cast each spell a hundred times and recorded the results. It became clear which spells worked and which did not, and the academy hated {him} for it.',
    eff: { mind: 4, fame: 1, charm: -1 },
  },
  {
    id: 'tpj.researcher-grant', stage: ['adult', 'middle'], arrival: T, flag: 'earth.researcher', tags: KINGDOM, w: 2, kind: 'work',
    ja: '研究費の申請書を書く癖が抜けない。領主に出した嘆願書は三十ページあり、最後に「今後の展望」の章があった。通った。',
    en: 'Old grant-writing habits died hard. The petition {name} sent the lord ran thirty pages and ended with a section on "Future Directions". It was approved.',
    eff: { wealth: 4, mind: 1 },
  },

  // ---- コンビニ店員 ----------------------------------------------------------------
  {
    id: 'tpj.clerk-shop', stage: ['adult', 'middle'], arrival: T, flag: 'earth.clerk', tech: LOW, w: 2, kind: 'work',
    ja: '何でも少しずつ置く小さな店を開いた。夜も開けておいたら、冒険者たちが毎晩寄るようになった。',
    en: '{name} opened a little shop that stocked a bit of everything. {He} kept it open at night, and adventurers started dropping by every evening.',
    eff: { wealth: 5, charm: 2 },
  },
  {
    id: 'tpj.clerk-greeting', stage: GROWN, arrival: T, flag: 'earth.clerk', w: 2, kind: 'hard',
    ja: '客が来るたび、体が勝手に「いらっしゃいませ、こんばんは」と言う。昼でも言う。いつのまにか、それが店の名前になった。',
    en: 'Every time a customer walked in, {name} said "Welcome, good evening!" on reflex. Even at noon. Eventually, that became the name of the shop.',
    eff: { charm: 2, happy: 1 },
  },

  // ---- 営業 ----------------------------------------------------------------
  {
    id: 'tpj.sales-haggle', stage: GROWN, arrival: T, flag: 'earth.sales', w: 2, kind: 'work',
    ja: '行商の値切り合戦で、{name}は一度も負けなかった。負けた商人たちが、営業のやり方を習いに来るようになった。',
    en: '{name} never once lost a haggling match with the traveling merchants. Soon the merchants were coming to {him} for sales lessons.',
    eff: { wealth: 5, fame: 2 },
  },
  {
    id: 'tpj.sales-card', stage: GROWN, arrival: T, flag: 'earth.sales', tags: KINGDOM, magic: 1, w: 2, kind: 'hard',
    ja: '魔王軍の使者が来たとき、{name}は反射で胸ポケットの名刺を探していた。無いと分かると、両手を添えて頭を下げた。使者も、つられて頭を下げた。',
    en: "When the Demon Lord's envoy arrived, {name} reached for a business card on reflex. Finding none, {he} bowed deeply. The envoy bowed back without thinking.",
    eff: { charm: 2, luck: 1 },
  },

  // ---- 保育士 ----------------------------------------------------------------
  {
    id: 'tpj.daycare-sleep', stage: GROWN, arrival: T, flag: 'earth.daycare', w: 2, kind: 'family',
    ja: '孤児院の夜泣きには、宮廷魔術師の眠りの魔法も効かなかった。{name}が背中をとんとんすると、五分で全員寝た。',
    en: "Not even the court mage's sleep spell could stop the orphanage's night crying. {name} patted a few backs, and in five minutes every child was asleep.",
    eff: { charm: 4, fame: 2 },
  },
  {
    id: 'tpj.daycare-potty', stage: GROWN, arrival: T, flag: 'earth.daycare', w: 2, kind: 'adventure',
    ja: '冒険者の一行と旅に出ると、{name}は出発前に全員へ「トイレ行った?」と聞いてしまう。引き返す回数が、目に見えて減った。',
    en: 'Traveling with an adventuring party, {name} always asked everyone, "Did you go to the bathroom?" before setting off. The party turned back far less often.',
    eff: { charm: 2, luck: 1 },
  },

  // ---- ゲーム実況者 ----------------------------------------------------------------
  {
    id: 'tpj.streamer-plaza', stage: GROWN, arrival: T, flag: 'earth.streamer', w: 2, kind: 'fame',
    ja: '冒険の話を、身ぶりつきの実況で聞かせた。広場は毎晩満員になり、投げ銭の代わりに野菜が飛んできた。',
    en: '{name} retold adventures as live commentary, gestures and all. The plaza filled up every night, and instead of tips, people threw vegetables.',
    eff: { fame: 4, wealth: 2 },
  },
  {
    id: 'tpj.streamer-chat', stage: GROWN, arrival: T, flag: 'earth.streamer', w: 2, kind: 'hard',
    ja: '危ない場面のたびに、{name}は誰もいない空に「みんな見てる?」と聞いてしまう。村では、そういう信心の人だと思われている。',
    en: 'Whenever things got dangerous, {name} asked the empty sky, "Is everyone watching?" The village assumed it was some kind of prayer.',
    eff: { mind: 1, charm: 1 },
  },

  // ---- 大工 ----------------------------------------------------------------
  {
    id: 'tpj.carpenter-level', stage: GROWN, arrival: T, flag: 'earth.carpenter', tech: LOW, w: 2, kind: 'work',
    ja: '水を入れた細い管で、水平器を作った。{name}の建てた家だけ、床に置いた卵が転がらない。町の大工たちが卵を持って見学に来た。',
    en: "{name} made a spirit level from a thin tube of water. In the houses {he} built, an egg set on the floor would not roll. The town's carpenters came to see, eggs in hand.",
    eff: { fame: 3, wealth: 3 },
  },
  {
    id: 'tpj.carpenter-castle', stage: ['adult', 'middle'], arrival: T, flag: 'earth.carpenter', tags: KINGDOM, w: 2, kind: 'work',
    ja: '領主から、城の修理を頼まれた。',
    en: 'The lord asked {name} to repair the castle.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '見積もりを正直に出す', en: 'Give an honest estimate', eff: { wealth: 4, charm: 2 }, log: { ja: '金額を見た領主が一度倒れた。直したら、雨漏りが二百年ぶりに止まった。', en: 'The lord fainted at the number. Once it was done, the roof stopped leaking for the first time in two hundred years.' } },
      { ja: '「とりあえず雨漏りだけ」と言う', en: '"Let\'s just fix the leak for now"', eff: { wealth: 2, luck: 1 }, log: { ja: '翌年、雨漏り以外の全部を頼まれた。', en: 'The next year, {he} was asked to fix everything except the leak.' } },
    ] },
  },

  // ---- 公務員 ----------------------------------------------------------------
  {
    id: 'tpj.civil-ticket', stage: GROWN, arrival: T, flag: 'earth.civil', tags: KINGDOM, w: 2, kind: 'work',
    ja: '役所の窓口に、番号札を入れた。行列のけんかが無くなり、衛兵が一人ひまになった。',
    en: '{name} introduced numbered tickets at the town office counter. The fights in line stopped, and one guard was left with nothing to do.',
    eff: { fame: 3, charm: 2 },
  },
  {
    id: 'tpj.civil-stamp', stage: GROWN, arrival: T, flag: 'earth.civil', tags: KINGDOM, w: 2, kind: 'work',
    ja: '勇者の届け出を受け付けるとき、{name}は「印鑑はお持ちですか」と聞いた。勇者は聖剣の柄頭を押しつけた。受理された。',
    en: 'Processing the Hero\'s registration, {name} asked, "Do you have your personal seal?" The Hero pressed the pommel of the holy sword onto the form. Approved.',
    eff: { charm: 2, happy: 1 },
  },
];
