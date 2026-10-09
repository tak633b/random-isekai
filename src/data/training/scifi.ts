// 鍛える道: 蒸気と魔導の都 (industrial)・ネオンの巨大都市 (scifi, tech 8〜9)・星々の帝国 (scifi, tech 10)・ダンジョンのある現代 (modern)・文明の後 (ruin)。
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

export const PATHS: TrainPath[] = [
  // ---- 蒸気と魔導の都 ----------------------------------------------------------------
  path({ id: 'tr.steam.engine', name: ['蒸気機関の徒弟', 'Steam engine apprentice'], where: ['煙突だらけの機関工房', 'an engine works full of smokestacks'], heq: [10, 65], tags: ['industrial'], talents: ['craft', 'wits'],
    stats: { mind: 1, power: 1, wealth: 1 }, traits: ['sk.machine', 'sk.build', 'sk.chem', 'sk.deft'], risk: { hazard: 'accident', p: 0.004 },
    start: ['{name}は機関工房の徒弟になった。最初の一年は、歯車の油さしだった。', '{name} became an apprentice at the engine works. The first year was oiling gears.'],
    fails: [['圧力計の針を見ていなかった。工房の屋根に、新しい天窓ができた。', 'Was not watching the pressure gauge. The workshop now has a brand-new skylight.'],
      ['自動で紅茶を淹れる機械を作った。淹れるのに三時間、片付けに三日かかった。', 'Built a machine that makes tea automatically. It took three hours to brew and three days to clean up.'],
      ['ゴーグルを額に上げたまま一年過ごした。一度も目に下ろさなかった。親方は「見た目は一人前だ」と言った。', 'Wore {his} goggles pushed up on {his} forehead all year and never once pulled them down. The foreman said {he} at least looked the part.']],
    lines: [['機関の音だけで、どの歯車が欠けているかわかるようになった。', 'Could tell which gear was chipped just by the sound of the engine.'],
      ['煤で顔が真っ黒になるのが、だんだん誇らしくなってきた。', 'Started to feel proud of the soot on {his} face.'],
      ['親方の設計図に、こっそり一本線を足した。機関の効率が上がった。親方は気づかないふりをした。', "Quietly added one line to the foreman's blueprint. The engine ran better. The foreman pretended not to notice."]] }),
  path({ id: 'tr.steam.airship', name: ['飛行船乗り', 'Airship crew'], where: ['港の係留塔', 'the mooring tower at the airship docks'], heq: [14, 55], tags: ['industrial'], talents: ['luck', 'might'],
    stats: { luck: 1, power: 1, happy: 1 }, traits: ['sk.pilot', 'sk.compass', 'sk.weather', 'sk.climb', 'sk.balance'], risk: { hazard: 'accident', p: 0.005 },
    start: ['{name}は飛行船の甲板員に雇われた。雲の上で食べる昼食は、思ったより寒かった。', '{name} signed on as airship deck crew. Lunch above the clouds was colder than expected.'],
    fails: [['錨を下ろす係だった。高度三千で下ろした。', 'Was in charge of dropping the anchor. Dropped it at ten thousand feet.'],
      ['気嚢に開いた穴をふさいだ。ふさいだのは自分の口だった。船は少し縮んだ。', 'Patched a leak in the gas envelope. With {his} own mouth. The ship shrank a little anyway.'],
      ['高いところが苦手だと気づいたのは、出航して二年目だった。', 'Realized {he} was afraid of heights in {his} second year aboard.']],
    lines: [['雲の流れで、明日の天気を言い当てるようになった。', 'Could call tomorrow\'s weather from how the clouds were moving.'],
      ['船長に舵を握らせてもらった。五分だけだった。一生忘れないと思った。', 'The captain let {him} take the wheel. Only for five minutes. {He} knew {he} would never forget it.'],
      ['ロープの結び方を二十通り覚えた。靴ひもまで船乗り結びになった。', 'Learned twenty different knots. Even {his} shoelaces were tied with sailor knots now.']] }),

  // ---- ネオンの巨大都市 ----------------------------------------------------------------
  path({ id: 'tr.cyber.netrun', name: ['路地裏のネットランナー', 'Back-alley netrunning'], where: ['雨漏りする雑居ビルの一室', 'a leaky room in a rundown tower block'], heq: [12, 50], tags: ['scifi'], tech: [8, 9], talents: ['wits'],
    stats: { mind: 2, luck: 1 }, traits: ['sk.hack', 'sk.code', 'sk.intel', 'sk.electronics'], cost: 1, risk: { hazard: 'violence', p: 0.004 },
    start: ['{name}は中古のデッキを買い、路地裏の先輩に回線のつなぎ方を習い始めた。', '{name} bought a secondhand deck and started learning how to jack in from an old hand in the back alleys.'],
    fails: [['企業の防壁を破った。中にあったのは、社員食堂の献立表だけだった。', "Broke through a corporate firewall. All that was inside was the staff cafeteria menu."],
      ['ハッキング中に母から通話が入り、全部の画面に母の顔が映った。', 'Mid-hack, {his} mother called. Her face popped up on every screen in the building.'],
      ['正体を隠すためのハンドルネームを考えるのに、一年かかった。', 'Spent the entire year picking a cool handle to hide {his} identity.']],
    lines: [['ネオンの明かりの下で、指が勝手にコードを打つようになった。', 'Under the neon glow, {his} fingers had started typing code on their own.'],
      ['自販機を説得して、ただで缶コーヒーを出させた。小さな勝利だった。', 'Talked a vending machine into a free can of coffee. A small victory.'],
      ['先輩に「お前、筋がいいな」と言われた。夜明けまで眠れなかった。', 'The old hand said {he} had a knack for it. {He} could not sleep until dawn.']] }),
  path({ id: 'tr.cyber.ripper', name: ['闇医者の助手', "A ripperdoc's assistant"], where: ['屋台街の奥の闇診療所', 'a back-street clinic behind the food stalls'], heq: [14, 70], tags: ['scifi'], tech: [8, 9], talents: ['craft', 'wits'],
    stats: { mind: 1, wealth: 1, hp: 1 }, traits: ['sk.surgery', 'sk.electronics', 'sk.firstaid', 'sk.deft'], risk: { hazard: 'violence', p: 0.003 },
    start: ['{name}は闇医者の診療所で、義体の部品を洗う仕事から始めた。', "{name} started at a ripperdoc's clinic, washing cybernetic parts."],
    fails: [['義手の配線を左右まちがえた。患者は右手で左のポケットを探るようになった。本人は気に入っていた。', 'Wired a prosthetic arm with left and right reversed. The patient now reaches into the left pocket with the right hand. The patient rather likes it.'],
      ['義眼の設定を誤り、患者の視界が一年間セピア色になった。患者は詩人になった。', "Misconfigured a cybereye, and the patient saw everything in sepia for a year. The patient became a poet."],
      ['先生が「ネジを取って」と言ったので、ネジを取った。先生の義手のネジだった。', 'The doc said, "Hand me a screw." {He} took one out of the doc\'s own prosthetic arm.']],
    lines: [['義体と生身の境目を、目を閉じても縫えるようになった。', "Could stitch the seam between flesh and chrome with {his} eyes closed."],
      ['先生は口が悪いが、患者が帰るときだけは必ず見送った。', 'The doc swore a lot, but always walked every patient to the door.'],
      ['払えない客から、代わりに温かい麺をもらった。それでよかった。', "A patient who couldn't pay brought hot noodles instead. That was fine by {him}."]] }),

  // ---- 星々の帝国 ----------------------------------------------------------------
  path({ id: 'tr.space.academy', name: ['帝国軍の士官学校', 'Imperial officer academy'], where: ['軌道上の士官学校', 'an officer academy in orbit'], heq: [14, 35], tags: ['scifi'], tech: [10, 10], talents: ['might', 'wits'],
    stats: { power: 1, mind: 1, fame: 1 }, traits: ['sk.pilot', 'sk.tactics', 'sk.leadership', 'sk.gun'], cost: 2, risk: { hazard: 'accident', p: 0.003 },
    start: ['{name}は士官学校の門をくぐった。最初の授業は、無重力でのお辞儀の仕方だった。', "{name} entered the officer academy. The first class was how to salute in zero gravity."],
    fails: [['模擬戦で艦隊を全滅させた。敵ではなく、味方のほうだった。', 'Wiped out an entire fleet in the simulator. {His} own.'],
      ['無重力訓練で回り始めて、止まり方を習うまで四十分かかった。', 'Started spinning during zero-g drills. It took forty minutes for someone to teach {him} how to stop.'],
      ['教官の訓示が長すぎて、立ったまま眠る技を先に身につけた。', "The instructor's speeches were so long that {he} learned to sleep standing up first."]],
    lines: [['星図を見ずに、跳躍の座標を言えるようになった。', 'Could recite jump coordinates without looking at the star chart.'],
      ['同期が初めて「艦長」と呼んできた。冗談だったが、悪い気はしなかった。', 'A classmate called {him} "Captain" for the first time. It was a joke, but it felt nice.'],
      ['窓の外を、知らない星が流れていった。家に手紙を書いた。', 'Unknown stars drifted past the window. {He} wrote a letter home.']] }),
  path({ id: 'tr.space.xeno', name: ['異星語と外交', 'Alien languages and diplomacy'], where: ['帝国の通訳院', 'the Imperial institute of interpreters'], heq: [10, 80], tags: ['scifi'], tech: [10, 10], talents: ['charm', 'wits'],
    stats: { charm: 2, mind: 1 }, traits: ['sk.tongues', 'sk.negotiate', 'sk.ear4lang', 'sk.empathy', 'sk.manners'], cost: 1,
    start: ['{name}は通訳院に入った。教本は百二十の言語で書かれ、うち三つは匂いだった。', '{name} joined the institute of interpreters. The textbook came in a hundred and twenty languages, three of them scents.'],
    fails: [['異星の大使に丁寧に挨拶した。相手の言葉では「お前の母は小惑星だ」だった。', 'Greeted an alien ambassador with great courtesy. In their language, it meant "your mother is an asteroid".'],
      ['握手の代わりに触手を三回振る作法を覚えた。地球人に会うたびにやってしまった。', 'Learned the custom of waving tentacles three times in place of a handshake. Kept doing it to humans.'],
      ['光で話す種族の授業で、一年間まばたきが止まらなくなった。', 'After a class on a species that speaks in light, {he} could not stop blinking for a year.']],
    lines: [['寝言が三か国語になった。', 'Now talked in {his} sleep in three languages.'],
      ['交渉の席で、相手の触角の揺れから本音がわかるようになった。', "At the negotiating table, {he} could read the truth in the sway of the other side's antennae."],
      ['異星人の友だちができた。好物は鉄だった。', 'Made an alien friend. Their favorite food was iron.']] }),

  // ---- ダンジョンのある現代 ----------------------------------------------------------------
  path({ id: 'tr.modern.stream', name: ['ダンジョン配信', 'Dungeon streaming'], where: ['駅前のダンジョンの入口', 'the dungeon gate by the station'], heq: [14, 45], tags: ['modern'], talents: ['charm', 'luck'],
    stats: { fame: 2, luck: 1 }, traits: ['sk.stream', 'sk.dangersense', 'sk.parkour', 'sk.speech'], risk: { hazard: 'monster', p: 0.005 },
    start: ['{name}はスマホを自撮り棒につけ、ダンジョン配信を始めた。最初の視聴者は母だった。', "{name} stuck a phone on a selfie stick and started streaming dungeon runs. The first viewer was {his} mother."],
    fails: [['ボス戦の山場で、カメラのふたが閉まったままだったと気づいた。', 'Realized at the climax of the boss fight that the lens cap had been on the whole time.'],
      ['視聴者のコメント通りに右へ進んだら、行き止まりで一晩過ごした。コメント欄は盛り上がった。', 'Followed chat\'s advice and turned right. Spent the night at a dead end. Chat had a great time.'],
      ['切り抜きでバズったのは、スライムに靴を取られる場面だけだった。', 'The only clip that went viral was the one where a slime stole {his} shoe.']],
    lines: [['登録者が千人を超えた。お祝いにコンビニのケーキを買った。', 'Passed a thousand subscribers. Celebrated with a convenience-store cake.'],
      ['ゴブリンにも「いつも見てます」と言われた気がした。', 'Was fairly sure a goblin said it watched every stream.'],
      ['探索者協会から「配信しながら潜らないでください」とお知らせが届いた。名指しだった。', 'The explorers\' association sent out a notice: "Please do not stream while diving." It named {him} specifically.']] }),
  path({ id: 'tr.modern.cram', name: ['塾と受験勉強', 'Cram school'], where: ['駅前の進学塾', 'a prep school by the station'], heq: [10, 20], tags: ['modern'], talents: ['wits'],
    stats: { mind: 2, happy: -1 }, traits: ['sk.memory', 'sk.speedread', 'sk.math', 'sk.tongues'], cost: 2,
    start: ['{name}は塾に通い始めた。夜十時の電車で帰るのが日常になった。', '{name} started cram school. Riding the ten o\'clock train home became normal.'],
    fails: [['暗記パンを作ろうとして、ただのパンを一年食べ続けた。', 'Tried to invent bread that would memorize things for {him}. Ended up just eating a lot of bread.'],
      ['模試の名前欄に「勇者」と書いた。前日にダンジョン配信を見すぎていた。', 'Wrote "Hero" in the name box on a practice exam. Had watched too many dungeon streams the night before.'],
      ['ダンジョン学の過去問を完璧に覚えた。出題範囲がその年から全部変わった。', 'Memorized every past question on Dungeon Studies. The syllabus changed completely that year.']],
    lines: [['単語帳を一冊まるごと覚えた。ぼろぼろになった表紙を捨てられなかった。', 'Memorized an entire vocabulary book. Could not bring {himself} to throw out its battered cover.'],
      ['塾の自習室で、いつも同じ席に座る子と目が合うようになった。', 'Kept catching the eye of the kid who always sat in the same seat in the study room.'],
      ['先生に「伸びしろしかない」と言われた。褒め言葉だと信じた。', 'The teacher said there was "nowhere to go but up". {He} chose to take it as praise.']] }),

  // ---- 文明の後 ----------------------------------------------------------------
  path({ id: 'tr.ruin.scav', name: ['廃墟漁りの師匠', 'Learning to scavenge'], where: ['崩れた高速道路の下の野営地', 'a camp under a collapsed highway'], heq: [8, 65], tags: ['ruin'], talents: ['luck', 'wits'],
    stats: { luck: 1, hp: 1, wealth: 1 }, traits: ['sk.scavenge', 'sk.survive', 'sk.trap', 'sk.radsense', 'sk.dangersense'], risk: { hazard: 'accident', p: 0.005 },
    start: ['{name}は片目の老人について、廃墟を漁るようになった。最初の教えは「光るものは食うな」だった。', '{name} began following a one-eyed old scavenger into the ruins. Lesson one: "Don\'t eat anything that glows."'],
    fails: [['宝の山だと思った倉庫は、前の文明のレシート置き場だった。', 'The warehouse {he} thought was a treasure trove turned out to be where the old world kept its receipts.'],
      ['謎の機械を一年かけて動かした。ただのトースターだった。パンが無かった。', 'Spent a year getting a mysterious machine running. It was a toaster. There was no bread.'],
      ['缶詰を見つけた。缶切りは見つからなかった。', 'Found a whole crate of canned food. Did not find a can opener.']],
    lines: [['瓦礫の崩れる音で、逃げる方向がわかるようになった。', 'Could tell which way to run from the sound of falling rubble.'],
      ['古い本を一冊拾った。読めなかったが、絵が好きだった。', 'Picked up an old book. Could not read it, but liked the pictures.'],
      ['師匠が「お前の勘は悪くない」と言った。師匠が人を褒めるのを初めて見た。', 'The old scavenger said {his} instincts were not bad. It was the first time anyone had heard the old man praise someone.']] }),
  path({ id: 'tr.ruin.water', name: ['水と修理の何でも屋', 'Water-finding and odd repairs'], where: ['荒野の給水塔の下', 'beneath a wasteland water tower'], heq: [10, 75], tags: ['ruin'], talents: ['craft', 'luck'],
    stats: { mind: 1, wealth: 1, charm: 1 }, traits: ['sk.dowsing', 'sk.craft', 'sk.build', 'sk.firstaid'],
    start: ['{name}は給水塔の番人に弟子入りした。荒野では、水と修理ができる者が一番えらかった。', "{name} apprenticed to the keeper of the water tower. Out in the wastes, whoever could find water and fix things was king."],
    fails: [['水脈を探して一年掘った。出てきたのは前の文明の噴水だった。水は出なかった。', 'Spent a year digging for water. Unearthed an old-world fountain. No water came out of it.'],
      ['ダクトテープで何でも直せると信じ、給水塔をダクトテープで直そうとした。半分は直った。', 'Believed duct tape could fix anything and tried it on the water tower. It fixed about half.'],
      ['ダウジングの棒が激しく反応した。足元に埋まっていたのは、誰かの水筒だった。', 'The dowsing rods went wild. Buried right underfoot was someone\'s canteen.']],
    lines: [['荒野の匂いで、近くに水があるかわかるようになった。', 'Could smell whether there was water nearby on the wasteland wind.'],
      ['直したポンプの水を、村の子どもたちが一番に飲みに来た。', 'The village kids lined up to be the first to drink from the pump {he} fixed.'],
      ['商隊に「腕のいい何でも屋がいる」と噂されるようになった。', 'Caravans began passing word of a handy fixer at the water tower.']] }),
];

export const METHODS: TrainMethod[] = [
  method({ id: 'm.scifi.chip', name: ['闇市の技能チップ', 'Black-market skill chip'], speed: 50, failP: 0.22, cost: 3, risk: { hazard: 'accident', p: 0.003 }, minHeq: 16, tags: ['scifi'],
    start: ['闇市で〈{target}〉の技能チップを買い、首の差し込み口に挿した。', 'Bought a "{target}" skill chip at the black market and slotted it into the port at the back of {his} neck.'],
    steps: [['チップの知識が、少しずつ自分の言葉になってきた。', "The chip's knowledge was slowly turning into {his} own words."],
      ['チップを抜いても、手が〈{target}〉の動きを覚えていた。', 'Even with the chip pulled, {his} hands remembered the motions of "{target}".']],
    fails: [['挿したチップは偽物で、一年間、知らない人の料理の好みだけが頭に入った。', "The chip was a fake. For a year, all {he} gained was a stranger's taste in food."],
      ['チップが広告つきの無料版だった。技を使うたびに頭の中で宣伝が流れた。', 'The chip was a free version with ads. Every time {he} used it, a commercial played inside {his} head.']],
    done: ['チップを抜いた。もう要らなかった。', 'Pulled the chip out. {He} no longer needed it.'] }),
  method({ id: 'm.modern.video', name: ['動画で独学', 'Learn from video tutorials'], speed: 24, failP: 0.22, tags: ['modern', 'scifi'],
    start: ['〈{target}〉の解説動画を、片っ端から二倍速で見ることにした。', 'Decided to learn "{target}" by watching every tutorial video out there at double speed.'],
    steps: [['再生リストの半分を見終えた。おすすめ欄が〈{target}〉で埋まった。', 'Halfway through the playlist. {His} recommendations were now nothing but "{target}".'],
      ['動画の人の口癖まで真似できるようになった。', "Could even imitate the video host's catchphrases."]],
    fails: [['関連動画を順に見ていたら、一年後には猫の動画にたどり着いていた。', 'Kept clicking on related videos. A year later, {he} was deep in cat videos.'],
      ['「初心者向け」と書かれた動画は、三本目から急に上級者向けになった。', 'The "for beginners" series suddenly became advanced material by the third video.']],
    done: ['動画を見なくても、体が先に動いた。お礼のコメントを書いた。', "{His} body moved before the video even started. {He} left a thank-you comment."] }),
];
