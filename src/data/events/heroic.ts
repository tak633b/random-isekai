// 英雄の筋。転生特典やスキル・加護を使った冒険と活躍の出来事。
// 段階のしるし (エンジンと共有): arc.notice → arc.first → guild → (昇格・依頼の繰り返し) → arc.deed → arc.saved → famous → arc.legend
// このファイルだけで連ねるしるし: arc.partner (仲間ができた)
// 特典なしの人生を変えないため、ほとんどの出来事は cheat / cheats / needs のどれかを条件にする。
// 根拠は docs/research/01・02 (特典の性格)、06 の 8節 (ギルドとランク)、07 (冒険者の死にやすさ)。
import type { CheatId, EventDef, Foe, Hazard } from '../../engine/types';

type Tag = 'fantasy' | 'japan' | 'cultivation' | 'industrial' | 'scifi' | 'modern' | 'ruin';
// [日本語, 英語, この1件だけ変える条件や効果]
type Line = [string, string, Partial<EventDef>?];
type Base = Omit<EventDef, 'id' | 'ja' | 'en'>;

// 世界の系統ごとに文を書き分ける。id は he.<名>.<系統>.<番号>
const perWorld = (name: string, base: Base, lines: Record<Tag, Line[]>): EventDef[] =>
  (Object.keys(lines) as Tag[]).flatMap((t) =>
    lines[t].map(([ja, en, x], i) => ({ ...base, id: `he.${name}.${t}.${i + 1}`, tags: [t], ja, en, ...x })));

// どの世界でも通じる文。id は he.<名>.<番号>
const plain = (name: string, base: Base, lines: Line[]): EventDef[] =>
  lines.map(([ja, en, x], i) => ({ ...base, id: `he.${name}.${i + 1}`, ja, en, ...x }));

// 竜や騎士が出る文は、剣と魔法・和風・仙侠の世界だけで
const NF: EventDef['not'] = ['scifi', 'modern', 'ruin', 'industrial'];

const fight = (hazard: Hazard, p: number, foe?: Foe): Partial<EventDef> =>
  ({ kind: 'battle', risk: { hazard, p }, ...(foe ? { foe } : {}) });

// 慎重と大胆の二択。慎重は引き返す余地を残し、大胆は危険と得が大きい
const boldOrSafe = (hazard: Hazard, safe: [string, string], bold: [string, string], p = 0.04): EventDef['choice'] => ({
  ja: 'どう動く?', en: 'What now?',
  options: [
    { ja: '慎重に、引き返す道を残す', en: 'Carefully, with a way to retreat', eff: { level: 1, fame: 2 }, risk: { hazard, p: p / 4 },
      log: { ja: safe[0], en: safe[1] } },
    { ja: '大胆に踏み込む', en: 'Boldly, all in', eff: { level: 3, fame: 7, wealth: 4 }, risk: { hazard, p },
      log: { ja: bold[0], en: bold[1] } },
  ],
});

// ======================================================================
// 1. 力に気づく (arc.notice)
// ======================================================================
const NOTICE = perWorld('notice', { stage: ['child', 'teen'], cheat: true, noFlag: 'arc.notice', set: 'arc.notice', w: 2, kind: 'power', eff: { mind: 2, happy: 2 } }, {
  fantasy: [
    ['森で迷った夜、{name}は〈{cheat}〉が自分の中で目を覚ますのを感じた。怖さより先に胸が高鳴った。',
      'Lost in the woods one night, {name} felt "{cheat}" stir awake inside {him}. Excitement came before fear.'],
    ['村祭りの腕比べで、{name}は大人を相手に一歩も引かなかった。〈{cheat}〉のことは、その晩ひとりで確かめた。',
      "At the village fair's contest of strength, {name} held firm against grown men, then spent the night alone testing what \"{cheat}\" could do."],
    ['{name}は教会の古い石板に手を触れ、そこに浮かんだ〈{cheat}〉の文字を誰にも見られないうちに消した。',
      'When {name} touched the old stone tablet in the chapel, the words "{cheat}" surfaced. {He} wiped them away before anyone saw.'],
  ],
  japan: [
    ['寺子屋の帰り道、{name}は鳥居の陰で〈{cheat}〉の手応えを初めて知った。誰にも言わずに家まで走った。',
      'Walking home from the temple school, {name} first felt the weight of "{cheat}" in the shadow of a shrine gate, and ran home without a word.'],
    ['道場の隅で木刀を握ったとき、{name}は〈{cheat}〉が手の内にあると分かった。師範が一度だけこちらを振り返った。',
      'Gripping a wooden sword in a corner of the dojo, {name} understood that "{cheat}" was right there in {his} hands. The master glanced back, just once.'],
  ],
  cultivation: [
    ['霊根を測る石が妙な光り方をした。{name}はその夜、〈{cheat}〉という言葉を胸の内でくり返した。',
      "The spirit-root stone glowed strangely at {name}'s testing. That night {he} repeated the word \"{cheat}\" silently, over and over."],
    ['瞑想の最中、{name}は気の流れの奥に〈{cheat}〉を見つけた。宗門の誰も、まだそれを知らない。',
      'Deep in meditation, {name} found "{cheat}" beneath the flow of qi. No one in the sect knew yet.'],
  ],
  industrial: [
    ['工場の煙突の下で、{name}は落ちてきた歯車を素手で止めた。〈{cheat}〉のせいだと、自分だけが知っていた。',
      'Beneath the factory chimneys, {name} caught a falling gear bare-handed. Only {he} knew it was "{cheat}".'],
    ['蒸気機関の唸りに混じって、{name}は〈{cheat}〉の呼ぶ声を聞いた気がした。翌朝から世界の見え方が少し変わった。',
      'Somewhere in the drone of the steam engines, {name} seemed to hear "{cheat}" calling. By morning the world looked slightly different.'],
  ],
  scifi: [
    ['学習端末の検査で、{name}の数値に一行だけ説明のつかない項目が出た。〈{cheat}〉だ、と{name}は思った。',
      "A routine scan on {name}'s learning terminal showed one line no one could explain. {He} knew it was \"{cheat}\"."],
    ['居住区が停電した夜、{name}は暗闇の中で〈{cheat}〉を初めて意識した。怖くはなかった。',
      'During a blackout in the habitat block, {name} became aware of "{cheat}" for the first time. It was not frightening.'],
  ],
  modern: [
    ['通学路にダンジョンの入口が開いた日、{name}だけが〈{cheat}〉の目覚めに気づいた。ニュースはまだ何も言っていなかった。',
      "The day a dungeon gate opened on the way to school, only {name} sensed \"{cheat}\" waking up. The news hadn't caught on yet."],
    ['部活の帰り道、{name}は自分の手のひらを見つめた。〈{cheat}〉は夢ではなかった。',
      'On the way home from club practice, {name} stared at {his} open palm. "{cheat}" was not a dream.'],
  ],
  ruin: [
    ['廃墟の地下で迷ったとき、{name}は〈{cheat}〉に導かれるように出口を見つけた。',
      'Lost beneath the ruins, {name} found the way out as if "{cheat}" were leading {him}.'],
    ['柵の外で変異獣と目が合った。{name}が〈{cheat}〉に気づいたのは、獣のほうが先に退いたときだった。',
      'Outside the fence, {name} locked eyes with a mutant beast. Only when the beast backed off first did {he} notice "{cheat}".'],
  ],
});

// ======================================================================
// 2. 初めて使う (arc.first)
// ======================================================================
const FIRST = perWorld('first', { stage: ['teen', 'adult'], cheat: true, flag: 'arc.notice', noFlag: 'arc.first', set: 'arc.first', w: 2, kind: 'adventure', eff: { power: 3, level: 1, fame: 1 } }, {
  fantasy: [
    ['村に{beast}が出た夜、{name}は初めて〈{cheat}〉を人前で使った。柵の外で、獣はもう動かなかった。',
      'The night the {beast} came into the village, {name} used "{cheat}" in front of others for the first time. Outside the fence, the creature lay still.', fight('monster', 0.01)],
    ['薬草を摘みに入った森で、{name}は〈{cheat}〉を頼りに崖下の友だちを助け出した。手が震えたのは全部終わってからだった。',
      'Gathering herbs in the forest, {name} relied on "{cheat}" to pull a friend up from below a cliff. The shaking only started afterward.', { risk: { hazard: 'accident', p: 0.005 } }],
  ],
  japan: [
    ['夜道で野盗に囲まれた。{name}は〈{cheat}〉で切り抜け、刀を一度も抜かずに家まで帰った。',
      'Surrounded by bandits on a night road, {name} got through with "{cheat}" and made it home without once drawing a blade.', fight('violence', 0.01, 'bandit')],
    ['妖が出ると噂の古井戸へ、{name}は〈{cheat}〉を試しに降りた。上がってきたとき、村の子らが手を叩いた。',
      'To test "{cheat}", {name} climbed down the old well where a yokai was said to live. The village children clapped when {he} came back up.', { risk: { hazard: 'monster', p: 0.01 } }],
  ],
  cultivation: [
    ['外門の手合わせで、{name}は初めて〈{cheat}〉を使った。相手が台から落ちるまで、ほんの一息だった。',
      'In an outer-sect sparring match, {name} used "{cheat}" for the first time. The opponent was off the platform in a single breath.', fight('violence', 0.005)],
    ['山の霊獣に追われた{name}は、〈{cheat}〉で崖を越えて逃げ切った。',
      'Chased by a spirit beast on the mountain, {name} cleared a cliff with "{cheat}" and got away.', { risk: { hazard: 'monster', p: 0.01 } }],
  ],
  industrial: [
    ['ボイラーが破裂しかけた工場で、{name}は〈{cheat}〉を使って逃げ遅れた子を連れ出した。',
      'When a boiler nearly blew at the factory, {name} used "{cheat}" to drag a stranded child out.', { risk: { hazard: 'accident', p: 0.01 } }],
    ['路地裏の強盗に、{name}は〈{cheat}〉で応じた。翌日の新聞の隅に小さな記事が載った。',
      "{name} answered a back-alley mugger with \"{cheat}\". A small notice ran in the corner of the next day's paper.", fight('violence', 0.01, 'bandit')],
  ],
  scifi: [
    ['警備ドローンが暴走した区画で、{name}は〈{cheat}〉を使って住民の避難路を開いた。',
      'When the security drones went haywire, {name} used "{cheat}" to open an evacuation route for the residents.', fight('violence', 0.01, 'machine')],
    ['貨物船の事故で漂流しかけた{name}は、〈{cheat}〉のおかげで救命艇までたどり着いた。',
      'Adrift after a cargo-ship accident, {name} made it to a lifeboat thanks to "{cheat}".', { risk: { hazard: 'accident', p: 0.01 } }],
  ],
  modern: [
    ['立ち入り禁止の浅い階層に迷い込み、{name}は〈{cheat}〉で魔物を一匹倒した。拾った魔石はまだ温かかった。',
      'Straying onto a restricted upper floor of the dungeon, {name} took down a monster with "{cheat}". The mana stone was still warm.', fight('monster', 0.01)],
    ['駅前に魔物があふれた日、{name}は〈{cheat}〉で逃げ遅れた人を守った。短い動画が少しだけ出回った。',
      'The day monsters spilled out in front of the station, {name} used "{cheat}" to shield the people left behind. A short clip went around online.', fight('monster', 0.01)],
  ],
  ruin: [
    ['略奪者が集落の水を狙ってきた夜、{name}は見張り台から〈{cheat}〉で追い返した。',
      "The night raiders came for the settlement's water, {name} drove them off from the watchtower with \"{cheat}\".", fight('violence', 0.01, 'bandit')],
    ['崩れた地下鉄の奥で、{name}は〈{cheat}〉を頼りに食料庫を見つけた。集落はその冬を越せた。',
      'Deep in a collapsed subway, {name} used "{cheat}" to find a food cache. The settlement made it through the winter.', { risk: { hazard: 'accident', p: 0.005 } }],
  ],
});

// ======================================================================
// 3. 登録 (guild)
// ======================================================================
const GUILD = perWorld('guild', { stage: ['teen', 'adult'], cheat: true, flag: 'arc.first', noFlag: 'guild', set: 'guild', w: 2, kind: 'adventure', big: true, eff: { fame: 2, wealth: 1 } }, {
  fantasy: [
    ['{name}は{guild}の受付で名前を書いた。新人の札は木でできていて、〈{cheat}〉のことは書かなかった。',
      'At the reception desk of {guild}, {name} signed the register. The rookie tag was plain wood, and "{cheat}" went unmentioned on the form.'],
    ['登録の試験で、{name}は試験官の木剣を弾き飛ばした。{guild}の古株たちがざわついた。',
      "In the entrance test, {name} knocked the examiner's practice sword clean away. The veterans of {guild} started murmuring."],
  ],
  japan: [
    ['{name}は{guild}の門を叩き、腕を見込まれて用心棒として名を連ねた。',
      'Knocking at the gate of {guild}, {name} was judged capable and taken on as a hired blade.'],
    ['藩の剣術指南役に腕を認められ、{name}は召し抱えの話を受けた。',
      "A domain's sword instructor took note of {name}, and an offer of service followed."],
  ],
  cultivation: [
    ['{name}は{guild}の石段を三日かけて登りきり、外門の弟子になった。',
      'It took {name} three days to climb the stone stairs of {guild}. At the top, {he} was accepted as an outer disciple.'],
    ['入門試験の幻陣を、{name}は〈{cheat}〉で誰より早く抜けた。長老が名を尋ねた。',
      'In the illusion array of the entrance trial, {name} used "{cheat}" to break out faster than anyone. An elder asked {his} name.'],
  ],
  industrial: [
    ['{name}は{guild}に登録し、蒸気列車の護衛の仕事を回してもらえるようになった。',
      'After registering with {guild}, {name} started getting jobs guarding steam trains.'],
    ['{name}は市の探偵組合に名を連ね、真鍮の徽章を胸に付けた。',
      "{name} joined the city's guild of investigators and pinned a brass badge to {his} coat."],
  ],
  scifi: [
    ['{name}は{guild}と契約し、識別番号と中古の防護服を受け取った。',
      '{name} signed with {guild} and received an ID number and a second-hand armor suit.'],
    ['{name}は辺境星の調査隊に登録した。適性検査の一項目で、測定器が上限を示した。',
      'When {name} enlisted with a frontier survey team, one line of the aptitude test maxed out the meter.'],
  ],
  modern: [
    ['{name}は探索者の資格試験に受かり、{guild}のカードを受け取った。写真写りは悪かった。',
      'Passing the explorer licensing exam got {name} a card from {guild}. The photo was terrible.'],
    ['講習の実技で、{name}は教官の想定より三分早く浅層を抜けた。{guild}の担当者が名刺を差し出した。',
      'In the practical session, {name} cleared the upper floor three minutes faster than planned. A rep from {guild} held out a business card.'],
  ],
  ruin: [
    ['{name}は集落の守り手に選ばれ、錆びた銃と見張りの順番を受け取った。',
      "Chosen as one of the settlement's guardians, {name} was handed a rusted rifle and a place on the watch roster."],
    ['{name}は{guild}に加わり、遠くの廃墟を回る探索の組に入った。',
      '{name} joined {guild} and was put on a crew that scavenged the far ruins.'],
  ],
});

// ======================================================================
// 4. 昇格と小さな依頼 (繰り返し)
// ======================================================================
// 重み 0.5 (元は 2): 繰り返しの依頼が多すぎて英雄の記録が1人30件を超えたため (engine/events.ts の HERO_GAP の実測)
const WORK = perWorld('work', { stage: ['adult', 'middle'], cheat: true, flag: 'guild', w: 0.5, repeat: true, kind: 'adventure', eff: { level: 1, wealth: 2, fame: 1 } }, {
  fantasy: [
    ['街道に出た{beast}を、{name}は〈{cheat}〉で片付けた。依頼主の商隊は予定どおり{town}に着いた。',
      '{name} cleared the {beast} off the highway with "{cheat}". The merchant caravan reached {town} on schedule.', fight('monster', 0.015)],
    ['{name}のギルド証の色が一段上がった。受付の人が、少しだけ長く{name}の顔を見た。',
      "{name}'s guild card moved up a color. The receptionist looked at {him} a moment longer than usual.", { kind: 'fame', eff: { fame: 3, wealth: 2 } }],
    ['廃坑の調査で、{name}は〈{cheat}〉を使って崩れかけた坑道を先に見つけた。依頼主は報酬を上乗せした。',
      'Surveying an abandoned mine, {name} used "{cheat}" to spot a tunnel on the verge of collapse. The client paid extra.', { risk: { hazard: 'accident', p: 0.008 } }],
    ['{name}は夜通しの護衛を終え、盗賊の矢を三本、盾から抜いた。',
      'After an all-night escort, {name} pulled three bandit arrows out of {his} shield.', fight('violence', 0.012, 'bandit')],
    ['{name}は森の奥の{beast}の巣を焼き払い、近くの村から干し肉を山ほど贈られた。',
      '{name} burned out a {beast} nest deep in the forest. The nearby village sent a mountain of dried meat in thanks.', fight('monster', 0.015)],
  ],
  japan: [
    ['街道筋に出た{beast}を、{name}は〈{cheat}〉で退けた。宿場の主人が酒を一升持たせてくれた。',
      'With "{cheat}", {name} drove off the {beast} haunting the highway. The innkeeper at the post town sent {him} off with a jug of sake.', fight('monster', 0.015)],
    ['{name}は商家の荷の警固を務め、峠の山賊を追い散らした。',
      "Guarding a merchant house's cargo, {name} scattered the mountain bandits at the pass.", fight('violence', 0.012, 'bandit')],
    ['{name}の働きが認められ、扶持が少し増えた。母に新しい着物を一枚買った。',
      "{name}'s service was noted, and {his} stipend went up a little. It paid for a new kimono for {his} mother.", { kind: 'fame', eff: { fame: 2, wealth: 3, happy: 2 } }],
    ['陰陽師に頼まれ、{name}は〈{cheat}〉で祟りの元の祠を見つけ出した。',
      "At an onmyoji's request, {name} used \"{cheat}\" to track down the shrine at the root of a curse.", { risk: { hazard: 'magic', p: 0.006 } }],
    ['他流試合を挑まれ、{name}は三合で相手の木刀を落とした。',
      "Challenged by a swordsman of another school, {name} knocked the man's wooden sword from his hands in three exchanges.", fight('violence', 0.006)],
  ],
  cultivation: [
    ['{name}は宗門の任務で妖獣を討ち、内丹を持ち帰った。貢献点が少し増えた。',
      'On a sect mission, {name} slew a demonic beast and brought back its core. {His} merit points rose a little.', fight('monster', 0.015)],
    ['{name}は修行の段を一つ上がった。〈{cheat}〉の扱いが、前より滑らかになった。',
      '{name} broke through to the next stage of cultivation. "{cheat}" came more smoothly than before.', { kind: 'power', eff: { level: 2, mind: 2 } }],
    ['秘境の薬草採りで、{name}は〈{cheat}〉を使って毒霧の谷を抜けた。',
      'Gathering rare herbs in a secret realm, {name} used "{cheat}" to cross a valley of poison mist.', { risk: { hazard: 'accident', p: 0.008 } }],
    ['他宗の弟子に因縁をつけられ、{name}は一剣で黙らせた。',
      'A disciple from a rival sect picked a fight, and {name} silenced him with a single sword stroke.', fight('violence', 0.008)],
    ['{name}は内門への昇格を許され、新しい洞府を一つ与えられた。',
      '{name} was promoted to the inner sect and given a cave dwelling of {his} own.', { kind: 'fame', eff: { fame: 3, mind: 2 } }],
  ],
  industrial: [
    ['蒸気列車を狙う列車強盗を、{name}は〈{cheat}〉で客車の屋根から叩き落とした。',
      'With "{cheat}", {name} knocked a train robber off the roof of the passenger car.', fight('violence', 0.012, 'bandit')],
    ['{name}は暴走した自動人形を地下水路で止めた。依頼主の技師は何度も頭を下げた。',
      'Down in the sewers, {name} stopped a runaway automaton. The engineer who had hired {him} bowed again and again.', fight('accident', 0.01, 'machine')],
    ['{name}は組合の等級が上がり、飛行船の護衛を任されるようになった。',
      '{name} rose a grade in the guild, and airship escorts were added to {his} job list.', { kind: 'fame', eff: { fame: 3, wealth: 3 } }],
    ['霧の夜の連続失踪事件を、{name}は〈{cheat}〉で追い、倉庫街の地下で終わらせた。',
      'On a run of foggy-night disappearances, {name} followed the trail with "{cheat}" and ended it beneath the warehouse district.', fight('violence', 0.01)],
    ['{name}は炭鉱に出た地下の怪物を、坑夫たちと一緒に追い出した。',
      'With the miners at {his} side, {name} drove the creature from below out of the coal pit.', fight('monster', 0.012)],
  ],
  scifi: [
    ['{name}は輸送船団の護衛を務め、海賊船を一隻、〈{cheat}〉で航行不能にした。',
      "Escorting a convoy, {name} used \"{cheat}\" to cripple a pirate ship's engines.", fight('violence', 0.012, 'bandit')],
    ['{name}の契約等級が上がった。報酬の桁が一つ増えた。',
      "{name}'s contract tier went up. The pay gained a digit.", { kind: 'fame', eff: { fame: 3, wealth: 4 } }],
    ['廃棄された研究施設の調査で、{name}は〈{cheat}〉で警備機械をくぐり抜けた。',
      'Surveying an abandoned research station, {name} slipped past its security machines with "{cheat}".', fight('violence', 0.01, 'machine')],
    ['未知の惑星の地表で、{name}は原生生物の群れから隊を守りきった。',
      "On an uncharted planet's surface, {name} kept the team safe from a swarm of native creatures.", fight('monster', 0.015, 'beast')],
    ['{name}はステーションの暴動の鎮圧に呼ばれ、誰も撃たずに収めた。',
      'Called in to put down a riot on the station, {name} settled it without firing a shot.', { risk: { hazard: 'violence', p: 0.008 } }],
  ],
  modern: [
    ['{name}は中層の階層主を〈{cheat}〉で倒し、配信のコメント欄が一時止まった。',
      'When {name} took down a mid-level floor boss with "{cheat}", the stream chat froze for a moment.', fight('monster', 0.015)],
    ['{name}の探索者ランクが上がり、企業から装備の提供の話が来た。',
      '{name} rose a rank as an explorer, and a company offered to sponsor {his} gear.', { kind: 'fame', eff: { fame: 3, wealth: 4 } }],
    ['ダンジョンからあふれた魔物の掃討に、{name}は夜明けまで付き合った。',
      'When monsters overflowed a dungeon, {name} stayed on the cleanup line until dawn.', fight('monster', 0.012)],
    ['{name}は救助依頼で深層に潜り、取り残された新人を背負って戻った。',
      'On a rescue request, {name} went deep and came back carrying a stranded rookie.', { risk: { hazard: 'monster', p: 0.012 } }],
    ['{name}は〈{cheat}〉で隠し部屋を見つけ、ギルドの記録を一つ塗り替えた。',
      "With \"{cheat}\", {name} found a hidden chamber and rewrote one of the association's records.", { eff: { fame: 3, wealth: 3, level: 1 } }],
  ],
  ruin: [
    ['{name}は〈{cheat}〉で廃墟の屍の群れをかわし、薬を一箱持ち帰った。',
      'With "{cheat}", {name} slipped past a swarm of husks in the ruins and brought back a crate of medicine.', fight('monster', 0.015, 'undead')],
    ['{name}は略奪者の待ち伏せを先に見つけ、隊商を別の道へ回した。',
      '{name} spotted a raider ambush first and turned the caravan onto another road.', fight('violence', 0.01, 'bandit')],
    ['{name}は旧時代の発電機を動かし、集落に三日ぶりの明かりを戻した。',
      'Getting an old-world generator running again, {name} brought light back to the settlement after three dark days.', { eff: { fame: 2, charm: 2, wealth: 1 } }],
    ['{name}は鉄の獣を罠にかけ、その部品で見張り台を直した。',
      '{name} trapped an iron beast and used its parts to fix the watchtower.', fight('monster', 0.012, 'machine')],
    ['{name}の組は遠くの都市跡から燃料を運び帰り、{name}は分け前の多い役に上がった。',
      "{name}'s crew hauled fuel back from a distant city ruin, and {he} moved up to a bigger share.", { kind: 'fame', eff: { fame: 2, wealth: 3 } }],
  ],
});

// 仲間ができる (このあとの仲間との戦いの出来事のため)
const PARTNER = perWorld('partner', { stage: ['teen', 'adult', 'middle'], cheat: true, flag: 'guild', noFlag: 'arc.partner', set: 'arc.partner', w: 3, kind: 'adventure', eff: { happy: 3, charm: 1 }, tie: { role: 'companion', new: true, d: 15 } }, {
  fantasy: [['{name}は依頼の帰りに{companion}と組むことにした。〈{cheat}〉のことを話しても、{companion}は笑わなかった。',
    "On the way back from a job, {name} decided to team up with {companion}, who didn't laugh on hearing about \"{cheat}\"."]],
  japan: [['峠で同じ山賊を追っていた{companion}と、{name}は旅を共にすることになった。',
    '{name} and {companion} had been chasing the same mountain bandits, and after the pass they kept traveling together.']],
  cultivation: [['同じ年に入門した{companion}が、{name}に背中を預けると言った。',
    '{companion}, who had entered the sect the same year, said {he:companion} would trust {name} to guard {his:companion} back.']],
  industrial: [['{name}は腕のいい機械技師の{companion}を相棒にした。工具箱はいつも{name}が運んだ。',
    '{name} took on {companion}, a skilled machinist, as a partner. {He} always carried the toolbox.']],
  scifi: [['{name}は契約で組んだ操縦士の{companion}と、そのまま組み続けることにした。',
    '{name} and {companion}, a pilot met on a contract, decided to keep flying together.']],
  modern: [['{name}は同期の探索者の{companion}とパーティを組んだ。最初の打ち合わせはファミレスだった。',
    '{name} formed a party with {companion}, an explorer from the same licensing class. The first meeting was at a family diner.']],
  ruin: [['{name}は廃墟で拾った旅人の{companion}を、集落に連れ帰った。それから二人で探索に出るようになった。',
    '{name} brought {companion}, a wanderer found in the ruins, back to the settlement. After that, the two of them scavenged together.']],
});

// ======================================================================
// 5. 大きな手柄 (arc.deed)
// ======================================================================
const DEED_SAFE: [string, string] = ['{name}は時間をかけて最奥にたどり着き、誰も欠けずに戻った。', '{name} took the slow road to the deepest point and came back with no one lost.'];
const DEED_BOLD: [string, string] = ['{name}は誰よりも先に踏み込み、奥に棲むものを倒した。', '{name} went in first and brought down what lived at the bottom.'];
const DEED = perWorld('deed', { stage: ['adult', 'middle'], cheat: true, flag: 'guild', noFlag: 'arc.deed', set: 'arc.deed', w: 2, kind: 'adventure', big: true, eff: { fame: 6, level: 2 }, risk: { hazard: 'monster', p: 0.01 }, choice: boldOrSafe('monster', DEED_SAFE, DEED_BOLD) }, {
  fantasy: [
    ['誰も帰ってこなかった古いダンジョンの最下層へ、{name}は〈{cheat}〉を頼りに降りていった。',
      'Relying on "{cheat}", {name} headed down into the lowest level of an old dungeon from which no one had ever returned.'],
    ['山に棲みついた竜を討つため、{name}は〈{cheat}〉を胸に{town}を発った。',
      'With "{cheat}" as {his} only edge, {name} left {town} to slay the dragon that had nested in the mountains.', { foe: 'dragon' }],
  ],
  japan: [
    ['都を脅かす大妖の棲む山へ、{name}は〈{cheat}〉と一振りの刀を携えて入った。',
      '{name} went up the mountain where a great yokai that threatened the capital had its den, carrying "{cheat}" and a single sword.'],
    ['鬼の砦と呼ばれる島へ、{name}は小舟で渡った。〈{cheat}〉だけが頼りだった。',
      'With only "{cheat}" to rely on, {name} crossed by small boat to the island called the Oni Fortress.', { foe: 'demon' }],
  ],
  cultivation: [
    ['百年閉ざされていた古仙の洞府が開いた。{name}は〈{cheat}〉を頼りに最奥を目指した。',
      'The cave of an ancient immortal, sealed for a century, opened at last. {name} set out for its deepest chamber, trusting in "{cheat}".'],
    ['千年を生きた妖蛟が河を荒らしていた。{name}は〈{cheat}〉を携えて濁流の中へ向かった。',
      'A thousand-year flood dragon was ravaging the river, and {name} waded into the torrent with "{cheat}".', { foe: 'dragon' }],
  ],
  industrial: [
    ['地下に眠る旧帝国の工廠へ、{name}は〈{cheat}〉を頼りに潜った。',
      "{name} descended into the old empire's buried arsenal, trusting in \"{cheat}\".", { foe: 'machine', risk: { hazard: 'accident', p: 0.01 } }],
    ['都の空に浮かぶ海賊の大型飛行船へ、{name}は〈{cheat}〉ひとつで乗り込んだ。',
      "With nothing but \"{cheat}\", {name} boarded the pirates' great airship hanging over the capital.", { foe: 'bandit', risk: { hazard: 'violence', p: 0.01 } }],
  ],
  scifi: [
    ['漂流する異星の巨大艦の中枢へ、{name}は〈{cheat}〉を頼りに乗り込んだ。',
      'Trusting in "{cheat}", {name} boarded a drifting alien megaship and made for its core.', { foe: 'machine' }],
    ['反乱した戦闘AIが占拠した軌道要塞へ、{name}は少人数で突入した。〈{cheat}〉が切り札だった。',
      'With a small team, {name} stormed an orbital fortress seized by a rogue combat AI. "{cheat}" was the trump card.', { foe: 'machine', risk: { hazard: 'war', p: 0.01 } }],
  ],
  modern: [
    ['未踏の最深層へ、{name}は〈{cheat}〉を頼りに足を踏み入れた。生中継の視聴者数が跳ね上がった。',
      "Trusting in \"{cheat}\", {name} stepped onto the dungeon's unexplored deepest floor. The livestream viewer count spiked."],
    ['都市の真下に生まれた新しいダンジョンの核を壊すため、{name}は〈{cheat}〉を携えて潜った。',
      'A new dungeon had formed right under the city, and {name} went down with "{cheat}" to destroy its core.'],
  ],
  ruin: [
    ['崩壊の元になった地下研究所の最奥へ、{name}は〈{cheat}〉を頼りに降りた。',
      'Relying on "{cheat}", {name} descended to the deepest level of the underground lab where the collapse began.', { foe: 'machine' }],
    ['平原を支配する巨大な変異獣を討つため、{name}は〈{cheat}〉を携えて集落を出た。',
      'With "{cheat}", {name} left the settlement to bring down the giant mutant beast that ruled the plains.', { foe: 'beast' }],
  ],
});

// ======================================================================
// 6. 町や人々を救う (arc.saved)
// ======================================================================
const SAVED = perWorld('saved', { stage: ['adult', 'middle'], cheat: true, flag: 'arc.deed', noFlag: 'arc.saved', set: 'arc.saved', w: 2, kind: 'battle', big: true, eff: { fame: 8, charm: 3, level: 1 }, risk: { hazard: 'monster', p: 0.02 } }, {
  fantasy: [
    ['魔物の大群が{town}に押し寄せた。{name}は〈{cheat}〉で城門を最後まで守り抜き、町は一軒も焼けなかった。',
      'A great horde of monsters surged toward {town}. {name} held the gate to the end with "{cheat}", and not a single house burned.'],
    ['疫病と魔物に挟まれた村へ、{name}は〈{cheat}〉を携えて駆けつけ、冬を越すまでとどまった。',
      'A village was caught between plague and monsters. {name} rushed there with "{cheat}" and stayed until winter had passed.', { risk: { hazard: 'disease', p: 0.01 }, kind: 'adventure' }],
  ],
  japan: [
    ['城下を襲った百鬼の夜行を、{name}は〈{cheat}〉で夜明けまで食い止めた。',
      'When a night parade of a hundred demons swept through the castle town, {name} held it back with "{cheat}" until dawn.', { foe: 'demon' }],
    ['大水で孤立した村へ、{name}は〈{cheat}〉を頼りに米を運び続けた。',
      'A flood cut a village off, and {name} kept carrying rice to it, relying on "{cheat}".', { risk: { hazard: 'accident', p: 0.01 }, kind: 'adventure' }],
  ],
  cultivation: [
    ['魔道の宗門が麓の町を襲った。{name}は〈{cheat}〉で護山の陣を支え、町の人々を山へ逃がした。',
      'A demonic sect attacked the town at the foot of the mountain. {name} held up the protective array with "{cheat}" while the townspeople fled uphill.', { foe: 'demon', risk: { hazard: 'war', p: 0.02 } }],
    ['天災の雷が谷の村へ落ちかけた。{name}は〈{cheat}〉で雷を逸らし、焦げた衣のまま笑った。',
      'Heavenly lightning was about to strike a valley village. {name} turned it aside with "{cheat}", then laughed in scorched robes.', { risk: { hazard: 'magic', p: 0.02 }, kind: 'adventure' }],
  ],
  industrial: [
    ['工業区の大火で、{name}は〈{cheat}〉を使って崩れる工場から職工たちを運び出した。',
      'In the great fire of the industrial ward, {name} used "{cheat}" to carry the workers out of collapsing factories.', { risk: { hazard: 'accident', p: 0.02 }, kind: 'adventure' }],
    ['暴走した軍の巨大機械が都へ向かった。{name}は〈{cheat}〉で動力炉を止めた。',
      'A runaway military machine headed for the capital, and {name} shut down its reactor with "{cheat}".', { foe: 'machine', risk: { hazard: 'accident', p: 0.02 } }],
  ],
  scifi: [
    ['居住コロニーの外壁が破れた日、{name}は〈{cheat}〉で隔壁を閉じるまでの時間を稼いだ。',
      'The day the colony hull was breached, {name} used "{cheat}" to buy time until the bulkheads sealed.', { risk: { hazard: 'accident', p: 0.02 }, kind: 'adventure' }],
    ['侵略艦隊がステーションに迫った。{name}は〈{cheat}〉で敵の旗艦を止め、民間船を逃がした。',
      'An invasion fleet closed in on the station. {name} stopped the enemy flagship with "{cheat}" so the civilian ships could escape.', { foe: 'machine', risk: { hazard: 'war', p: 0.02 } }],
  ],
  modern: [
    ['大規模な魔物の氾濫で、{name}は〈{cheat}〉を使って避難所の前に立ち続けた。',
      'In a massive monster outbreak, {name} used "{cheat}" and stood in front of the evacuation shelter the whole time.'],
    ['崩れたダンジョンに閉じ込められた救助隊を、{name}は〈{cheat}〉で一人残らず連れ戻した。',
      'When a collapsing dungeon trapped a rescue team, {name} used "{cheat}" to bring back every last one of them.', { kind: 'adventure' }],
  ],
  ruin: [
    ['略奪者の大集団が集落を囲んだ。{name}は〈{cheat}〉で三日間門を守り、相手のほうが先に引いた。',
      'A huge raider band surrounded the settlement. {name} held the gate for three days with "{cheat}", and the raiders gave up first.', { foe: 'bandit', risk: { hazard: 'violence', p: 0.02 } }],
    ['汚れた雨が降り続いた年、{name}は〈{cheat}〉で遠くの浄水場を動かし、集落に水を引いた。',
      'In a year of poisoned rain, {name} used "{cheat}" to restart a distant water plant and pipe clean water home.', { risk: { hazard: 'accident', p: 0.015 }, kind: 'adventure' }],
  ],
});

// ======================================================================
// 7. 名声 (famous) とその後
// ======================================================================
const FAMOUS = perWorld('famous', { stage: ['adult', 'middle', 'elder'], cheat: true, flag: 'arc.saved', noFlag: 'famous', set: 'famous', w: 3, kind: 'fame', big: true, eff: { fame: 10, wealth: 4, happy: 3 } }, {
  fantasy: [
    ['{name}の名は吟遊詩人の歌になり、{town}の酒場で毎晩うたわれるようになった。',
      "{name} became the subject of a minstrel's song, sung every night in the taverns of {town}."],
    ['王都から使者が来て、{name}に勲章を渡した。{name}は式の間ずっと居心地が悪そうだった。',
      'An envoy from the royal capital came to present {name} with a medal. {He} looked uncomfortable through the whole ceremony.'],
  ],
  japan: [
    ['{name}の武勇は瓦版に刷られ、江戸の子らが真似をして遊ぶようになった。',
      "{name}'s exploits were printed in the broadsheets, and children began playing at being {name}."],
    ['将軍家から{name}に名刀が下された。{name}はそれを床の間に飾り、ふだんは古い刀を差した。',
      'The shogunate bestowed a famous blade on {name}, who set it in the alcove and kept wearing the old sword.'],
  ],
  cultivation: [
    ['{name}の名は諸宗に知れ渡り、門前に弟子入りを願う若者が列を作った。',
      'Word of {name} spread through every sect, and young hopefuls lined up at the gate to become {his} disciples.'],
    ['宗主が{name}を長老の席に招いた。{name}はまだ若いのに、と誰も言わなかった。',
      'The sect master invited {name} to take a seat among the elders. No one called {him} too young.'],
  ],
  industrial: [
    ['新聞の一面に{name}の写真が載った。街角で知らない人に帽子を取られるようになった。',
      "{name}'s photograph ran on the front page. Strangers began tipping their hats on the street."],
    ['{name}は議会に招かれ、市長から感謝状を受け取った。蒸気自動車での送り迎え付きだった。',
      'The council invited {name} to receive a letter of thanks from the mayor, with a steam car to take {him} there and back.'],
  ],
  scifi: [
    ['{name}の映像が星系中のネットワークに流れ、名前が検索の上位に並んだ。',
      "Footage of {name} spread across the system's networks, and {his} name topped the search rankings."],
    ['連邦政府が{name}に勲章を授けた。式典の映像は三つの惑星で同時に放送された。',
      'The federal government decorated {name}. The ceremony aired on three planets at once.'],
  ],
  modern: [
    ['{name}の配信の登録者数が百万を超え、街で写真を頼まれるようになった。',
      "{name}'s channel passed a million subscribers. People started asking for photos on the street."],
    ['政府が{name}を国内最高位の探索者に認定した。記者会見で{name}は一度だけ噛んだ。',
      'The government certified {name} as a top-tier explorer. At the press conference, {he} stumbled over a word exactly once.'],
  ],
  ruin: [
    ['{name}の名は荒野を行き交う商人の口から口へ伝わった。遠い集落でも{name}の話が出るようになった。',
      'Word of {name} passed from trader to trader across the wasteland. Even distant settlements told stories about {him}.'],
    ['いくつかの集落の長が集まり、{name}を荒野の守り手と呼ぶことに決めた。',
      'The heads of several settlements gathered and agreed to call {name} the Warden of the Wastes.'],
  ],
});

// 重み 0.5 (元は 2): WORK と同じ理由
const RENOWN = perWorld('renown', { stage: ['adult', 'middle', 'elder'], cheat: true, flag: 'famous', w: 0.5, repeat: true, kind: 'fame', eff: { fame: 3, wealth: 2 } }, {
  fantasy: [
    ['{name}は名指しの依頼で{beast}を討ち、依頼主の領主から屋敷に招かれた。',
      '{name} slew the {beast} on a request that named {him} personally, and the lord who had asked invited {him} to the manor.', fight('monster', 0.012)],
    ['{name}に憧れて冒険者になったという若者が、{guild}に三人も現れた。',
      'Three young people showed up at {guild} saying they had become adventurers because of {name}.'],
    ['他国の騎士団から剣の稽古を頼まれ、{name}は一冬を異国で過ごした。',
      'A foreign order of knights asked {name} to train them, and {he} spent a winter abroad.', { eff: { fame: 3, wealth: 3, charm: 1 } }],
    ['{name}の名を騙る偽者が{town}に現れた。{name}が顔を出すと、偽者は窓から逃げた。',
      "An impostor using {name}'s name turned up in {town}. When the real {name} walked in, the fake fled through a window."],
    ['{name}は王の狩りに同行し、暴れ出した{beast}を一太刀で鎮めた。',
      "Accompanying the king's hunt, {name} brought down the rampaging {beast} with a single stroke.", fight('monster', 0.01)],
  ],
  japan: [
    ['{name}のもとに、遠国の大名から指南役の誘いが届いた。',
      'A daimyo from a far province sent {name} an invitation to serve as sword instructor.'],
    ['{name}は城下の剣術大会で審判を務め、勝った若者に自分の鍔を渡した。',
      "{name} judged the castle town's sword tournament and gave the winner the guard from {his} own sword."],
    ['{name}の噂を聞いた{beast}退治の依頼が、山の村々から続けて届いた。',
      'Having heard of {name}, one mountain village after another sent requests to deal with the {beast}.', fight('monster', 0.012)],
    ['{name}の旅姿が錦絵になり、版元の前に人だかりができた。',
      'A woodblock print of {name} in traveling clothes drew a crowd in front of the publisher.'],
    ['{name}は御前試合に呼ばれ、名のある剣客と引き分けた。',
      'Summoned to a match before the lord, {name} fought a renowned swordsman to a draw.', fight('violence', 0.008)],
  ],
  cultivation: [
    ['{name}は諸宗の会合で上座に座らされ、若い修士たちの手合わせを見届けた。',
      "At a gathering of the sects, {name} was seated at the head and watched over the young cultivators' duels."],
    ['{name}の名を聞いて挑んできた魔修を、{name}は三手で退けた。',
      'A demonic cultivator challenged {name} on reputation alone and was turned away in three moves.', fight('violence', 0.01, 'demon')],
    ['{name}が昔助けた村が、{name}のための小さな祠を建てた。',
      'A village {name} had once saved built a small shrine in {his} honor.'],
    ['{name}は秘境の封印を確かめる役を頼まれ、ひとりで千里を飛んだ。',
      'Asked to check the seal on a secret realm, {name} flew a thousand li alone.', { risk: { hazard: 'magic', p: 0.008 } }],
    ['{name}の名を出すと、どの茶店でも茶代を取られなくなった。',
      "Dropping {name}'s name was enough to get free tea at any teahouse.", { eff: { fame: 2, happy: 2 } }],
  ],
  industrial: [
    ['{name}の名を冠した蒸気機関車が走り始めた。{name}は初便に乗り、窓から手を振った。',
      'A steam locomotive named after {name} entered service. {He} rode the first run and waved from the window.'],
    ['{name}は大学に招かれて講演し、学生たちの質問に夜まで答えた。',
      'Invited to lecture at the university, {name} answered student questions late into the night.', { eff: { fame: 3, mind: 2 } }],
    ['{name}は警視庁の依頼で爆弾魔を追い、時計塔の上で取り押さえた。',
      "At the police commissioner's request, {name} hunted down a bomber and pinned him atop the clock tower.", fight('violence', 0.012)],
    ['{name}の冒険が連載小説になった。どれも話が盛られていた。',
      "{name}'s adventures became a serialized novel. Every episode was exaggerated."],
    ['{name}は暴走した軍の装甲列車を止める役を頼まれ、線路の上で迎え撃った。',
      'Asked to stop a runaway armored train, {name} met it head-on out on the tracks.', fight('accident', 0.012, 'machine')],
  ],
  scifi: [
    ['{name}のもとに、企業連合から護衛の指名依頼が殺到した。',
      'Corporate consortiums flooded {name} with requests for personal security contracts.', { eff: { wealth: 5, fame: 2 } }],
    ['{name}は士官学校に招かれ、若い操縦士たちに模擬戦で手本を見せた。',
      'Invited to the officer academy, {name} demonstrated for young pilots in a mock battle.', { eff: { fame: 3, charm: 2 } }],
    ['宇宙海賊の首領が、{name}の名を聞いて引き返したという噂が流れた。',
      'Rumor said a pirate warlord turned his fleet around on hearing that {name} was in the sector.'],
    ['{name}は人質を取った武装集団の船に単独で乗り込み、全員を無事に連れ出した。',
      "Boarding the hijackers' ship alone, {name} got every hostage out unharmed.", fight('violence', 0.012)],
    ['{name}の戦い方を真似た訓練プログラムが、軍の正式な教材になった。',
      "A training program modeled on {name}'s fighting style became official military curriculum."],
  ],
  modern: [
    ['{name}はテレビの討論番組に呼ばれ、ダンジョン政策について三分だけ話した。',
      'Invited onto a TV debate show, {name} spoke about dungeon policy for three minutes.'],
    ['{name}の名前の入った装備が発売され、すぐに売り切れた。',
      "Gear bearing {name}'s name went on sale and sold out at once.", { eff: { wealth: 5, fame: 2 } }],
    ['{name}は海外のダンジョンに招かれ、現地の探索者と最深記録を塗り替えた。',
      'Invited to a dungeon overseas, {name} set a new depth record with the local explorers.', fight('monster', 0.012)],
    ['{name}の配信を見て探索者を目指したという中学生から、手紙が届いた。',
      "A letter came from a middle-schooler who wanted to become an explorer after watching {name}'s streams.", { eff: { fame: 2, happy: 3 } }],
    ['{name}は合同訓練で自衛の部隊に指導を頼まれ、半日で予定の倍の内容を教えた。',
      'Asked to instruct a defense unit at a joint drill, {name} covered twice the planned material in half a day.'],
  ],
  ruin: [
    ['{name}の名を聞いた略奪者たちは、{name}の集落を避けて通るようになった。',
      "Raiders who heard {name}'s name began giving the settlement a wide berth."],
    ['遠くの集落から、{name}に変異獣退治の頼みが届いた。{name}は四日歩いて向かった。',
      'A distant settlement asked {name} to deal with a mutant beast. {He} walked four days to get there.', fight('monster', 0.012, 'beast')],
    ['子どもたちが{name}の真似をして、木の棒で見張りごっこをするようになった。',
      'Children began playing at keeping watch with sticks, pretending to be {name}.', { eff: { fame: 2, happy: 3 } }],
    ['{name}は旧時代の地図を読み解き、いくつもの集落を結ぶ交易路を開いた。',
      'Reading old-world maps, {name} opened a trade route linking several settlements.', { eff: { fame: 3, wealth: 4 } }],
    ['{name}は略奪者の頭目と一対一で向き合い、勝って武器を置かせた。',
      '{name} faced the raider chief one on one, won, and made the whole band lay down their weapons.', fight('violence', 0.015, 'bandit')],
  ],
});

// ======================================================================
// 8. 伝説になる (arc.legend)
// ======================================================================
const LEGEND = perWorld('legend', { stage: ['middle', 'elder'], cheat: true, flag: 'famous', noFlag: 'arc.legend', set: 'arc.legend', w: 2, kind: 'fame', big: true, eff: { fame: 12, happy: 4 } }, {
  fantasy: [
    ['{town}の広場に{name}の像が建った。{name}は除幕式の日、こっそり裏通りから像を見に行った。',
      'A statue of {name} went up in the square of {town}. On unveiling day, {he} slipped down a back street to look at it.'],
    ['{name}の旅は書物にまとめられ、王立の学院で教えられるようになった。〈{cheat}〉のくだりは、少しだけ違っていた。',
      "{name}'s journeys were compiled into a book and taught at the royal academy. The part about \"{cheat}\" was slightly off."],
  ],
  japan: [
    ['{name}の名は軍記物に書かれ、琵琶法師が辻で語るようになった。',
      '{name} was written into the war chronicles, and blind minstrels recited the tale at the crossroads.'],
    ['{name}が鎮めた山に、村人が{name}の名を付けた。{name}は少し照れた。',
      'The villagers named the mountain {name} had calmed after {him}. {He} was a little embarrassed.'],
  ],
  cultivation: [
    ['{name}の名は宗門の史書に刻まれ、後の弟子たちが修行の始まりに唱えるようになった。',
      "{name}'s name was carved into the sect's annals, and later disciples recited it at the start of their training."],
    ['{name}が剣で裂いた峡谷は、いつしか{name}の名で呼ばれるようになった。',
      'The canyon {name} had split with a sword came to bear {his} name.'],
  ],
  industrial: [
    ['{name}の功績を記念した記念碑が駅前に建ち、毎年その日に汽笛が三度鳴らされるようになった。',
      'A monument to {name} went up in front of the station, and every year on that day the trains sounded their whistles three times.'],
    ['{name}の伝記が出版され、どの書店の窓にも並んだ。表紙の顔は本人に似ていなかった。',
      "{name}'s biography came out and filled every bookshop window. The face on the cover looked nothing like {him}."],
  ],
  scifi: [
    ['新しく見つかった星系に{name}の名が付けられた。{name}は星図を見ながら長いこと黙っていた。',
      'A newly charted star system was named after {name}, who looked at the star map in silence for a long time.'],
    ['{name}の戦いの記録は、教育課程の歴史の単元に載るようになった。',
      "Records of {name}'s battles were added to the history unit of the standard curriculum."],
  ],
  modern: [
    ['{name}が踏破したダンジョンは{name}の名で呼ばれるようになり、教科書にも載った。',
      'The dungeon {name} had conquered was named after {him}, and it made it into the textbooks.'],
    ['{name}の半生が映画になった。試写会で{name}は、自分の役の俳優の背の高さに笑った。',
      "{name}'s life became a film. At the premiere, {name} laughed at how tall the lead actor was."],
  ],
  ruin: [
    ['集落の子どもたちは、寝る前に{name}の話をせがむようになった。話は聞くたびに少しずつ大きくなった。',
      "The settlement's children began begging for stories about {name} at bedtime. The stories grew a little each time."],
    ['荒野の道しるべに{name}の名が刻まれ、旅人はその前で足を止めるようになった。',
      "{name}'s name was carved into a wasteland signpost, and travelers began to stop before it."],
  ],
});

// ======================================================================
// 特典ごとの使い方 (CheatId ごとに3件以上)
// ======================================================================
const cheat = (c: CheatId, lines: Line[]): EventDef[] =>
  plain(`ch.${c}`, { stage: ['teen', 'adult', 'middle'], cheats: [c], w: 1.5, repeat: true, kind: 'adventure', eff: { level: 1, fame: 1 } }, lines);

const CHEATS: EventDef[] = [
  ...cheat('appraisal', [
    ['〈{cheat}〉で床の石の一枚だけ名前が違うと分かり、{name}は仲間の足を止めた。その下は落とし穴だった。',
      '"{cheat}" showed {name} that one flagstone had a different name from the rest. {He} stopped the others, and beneath it was a pit trap.', { risk: { hazard: 'accident', p: 0.005 } }],
    ['依頼主が差し出した聖剣を、{name}は〈{cheat}〉で一目見て偽物だと見抜いた。依頼の裏にいた詐欺師はその日のうちに捕まった。',
      'One look with "{cheat}" told {name} the holy sword the client offered was a fake. The swindler behind the job was caught that same day.', { kind: 'power', eff: { mind: 2, fame: 2 } }],
    ['〈{cheat}〉で魔物の弱点が文字になって見えた。{name}はその一点だけを狙った。',
      "\"{cheat}\" spelled out the monster's weak point, and {name} aimed for that single spot.", fight('monster', 0.01)],
    ['宴の杯に毒が入っていると〈{cheat}〉が告げた。{name}は杯を倒したふりをして、王子の手から払い落とした。',
      "\"{cheat}\" warned {name} that the banquet cup was poisoned. Pretending to stumble, {he} knocked it from the prince's hand.", { kind: 'power', eff: { fame: 3, charm: 2 } }],
  ]),
  ...cheat('item_box', [
    ['包囲された砦に、{name}は〈{cheat}〉から一か月分の食料を出してみせた。兵たちは最初、手品だと思った。',
      'In the besieged fort, {name} drew a month of food out of "{cheat}". The soldiers thought it was a magic trick at first.', { kind: 'power', eff: { fame: 3, charm: 2 } }],
    ['{name}は〈{cheat}〉に予備の武器を二十本しまい、戦いの最中に次々と持ち替えた。',
      '{name} kept twenty spare weapons in "{cheat}" and swapped them out one after another mid-fight.', fight('monster', 0.01)],
    ['崩れる洞窟の中で、{name}は〈{cheat}〉に落ちてくる岩をしまい込み、出口までの道を空けた。',
      'As the cave collapsed, {name} stored the falling boulders in "{cheat}" and cleared a way out.', { risk: { hazard: 'accident', p: 0.008 } }],
  ]),
  ...cheat('exp_boost', [
    ['一度の討伐で、{name}は仲間の何倍も伸びた。〈{cheat}〉のことは、まだ誰にも言っていない。',
      'One hunt left {name} several times stronger than the rest of the party. No one knew about "{cheat}" yet.', { ...fight('monster', 0.01), eff: { level: 3, power: 2 } }],
    ['{name}は一年で、師が十年かけた技を覚えた。〈{cheat}〉の伸び方は、本人でさえ怖かった。',
      'In one year {name} learned what had taken the master ten. Even {he} found the growth from "{cheat}" a little frightening.', { kind: 'power', eff: { level: 3, mind: 2 } }],
    ['格上の相手に挑み、{name}は負けた。だが〈{cheat}〉のおかげで、次の月には勝てる気がした。',
      'Challenging a stronger opponent, {name} lost. But thanks to "{cheat}", {he} felt sure of winning by next month.', { ...fight('violence', 0.008), eff: { level: 2, hp: -3 } }],
  ]),
  ...cheat('all_magic', [
    ['炎の効かない魔物に、{name}は氷、次に雷を撃った。〈{cheat}〉の前では、効かない相手のほうが少なかった。',
      'Against a fire-proof monster, {name} cast ice, then lightning. With "{cheat}", few foes were immune to everything.', fight('monster', 0.01)],
    ['{name}は四つの属性を一つの術に束ね、城壁ほどの岩を砕いた。見ていた宮廷魔術師が杖を落とした。',
      "Binding four elements into one spell, {name} shattered a boulder the size of a castle wall. The watching court mage's staff clattered to the floor.", { kind: 'power', eff: { mind: 3, fame: 3 } }],
    ['干ばつの村で、{name}は〈{cheat}〉で雨雲を呼び、土を耕し、井戸を掘った。',
      'In a drought-stricken village, {name} used "{cheat}" to call rain clouds, till the soil, and dig a well.', { eff: { fame: 3, charm: 2 } }],
  ]),
  ...cheat('infinite_mana', [
    ['三日三晩続いた防衛戦で、魔術師たちが倒れていく中、{name}だけが〈{cheat}〉で結界を張り続けた。',
      'Through a three-day defense, as mage after mage collapsed, {name} alone kept the barrier up with "{cheat}".', fight('war', 0.012)],
    ['{name}は〈{cheat}〉にまかせて、町じゅうの街灯に一晩で魔力を込めた。',
      'Leaning on "{cheat}", {name} charged every street lamp in town with mana in a single night.', { kind: 'power', eff: { wealth: 3, fame: 2 } }],
    ['大魔法を十発続けて撃っても、{name}の息は乱れなかった。敵の陣が先に崩れた。',
      'Ten great spells in a row, and {name} was not even winded. The enemy line broke first.', fight('war', 0.012)],
  ]),
  ...cheat('regeneration', [
    ['腹を貫かれても、{name}は〈{cheat}〉で立ち上がり、相手の剣をつかんだまま押し返した。',
      'Run through the gut, {name} rose again with "{cheat}" and pushed back while still gripping the enemy blade.', { ...fight('violence', 0.012), eff: { hp: -4, level: 1 } }],
    ['{name}は仲間の盾になって魔物の牙を受け続けた。傷は〈{cheat}〉が片端から塞いだ。',
      "{name} took the monster's fangs again and again to shield the party. \"{cheat}\" closed every wound as it came.", fight('monster', 0.01)],
    ['崖から落ちた{name}は、骨が繋がるのを待ってから、自分の足で村へ帰った。',
      'After falling from a cliff, {name} waited for {his} bones to knit, then walked back to the village.', { risk: { hazard: 'accident', p: 0.006 } }],
  ]),
  ...cheat('immortal_body', [
    ['戦場で倒れた{name}は、夜明けに〈{cheat}〉で起き上がり、静かになった野を一人で歩いて帰った。',
      'Fallen on the battlefield, {name} rose again at dawn with "{cheat}" and walked home alone across the silent field.', fight('war', 0.008)],
    ['{name}は不死の体を盾に、毒の沼の奥に沈んだ聖遺物を拾い上げた。',
      'Using {his} undying body as a shield, {name} recovered a relic sunk deep in a poison swamp.', { eff: { fame: 3, wealth: 3 } }],
    ['封印の術者に追われた{name}は、三つの国境を越えて逃げ延びた。',
      'Hunted by a sealing sorcerer, {name} fled across three borders and got away.', { risk: { hazard: 'magic', p: 0.01 } }],
  ]),
  ...cheat('return_by_death', [
    ['同じ橋の上で、{name}は三度死んだ。四度目、〈{cheat}〉で覚えた矢の軌道をすべて避けて渡りきった。',
      'On the same bridge, {name} died three times. On the fourth pass, thanks to "{cheat}", {he} dodged every arrow from memory and made it across.', fight('violence', 0.01)],
    ['仲間が死ぬ場面を、{name}は〈{cheat}〉で何度もやり直した。最後には誰も死ななかった。',
      'With "{cheat}", {name} relived the moment a companion died again and again. In the end, no one died.', { kind: 'battle', risk: { hazard: 'monster', p: 0.01 }, eff: { happy: -2, mind: 2, level: 1 } }],
    ['ダンジョンの分かれ道で、{name}は前の死を思い出した。今度は右を選んだ。',
      'At a fork in the dungeon, {name} remembered the last death and chose the right-hand path this time.', { risk: { hazard: 'monster', p: 0.008 } }],
  ]),
  ...cheat('creation', [
    ['折れた剣の代わりに、{name}は〈{cheat}〉で戦いの最中に新しい剣を作り出した。',
      'When the sword snapped, {name} used "{cheat}" to make a new one mid-battle.', fight('monster', 0.01)],
    ['川に橋がなかった。{name}は〈{cheat}〉で一晩のうちに石の橋を架け、軍を渡した。',
      'There was no bridge over the river, so {name} raised a stone one overnight with "{cheat}" and the army crossed.', { kind: 'power', eff: { fame: 4 } }],
    ['{name}は〈{cheat}〉で前世の道具を作り、村の水汲みを一日仕事から一時間仕事にした。',
      "With \"{cheat}\", {name} recreated a tool from the past life, turning the village's day-long water haul into an hour's work.", { eff: { fame: 2, charm: 2, wealth: 2 } }],
  ]),
  ...cheat('tamer', [
    ['{name}が〈{cheat}〉で従えた大狼が、群れの仲間を連れて戻ってきた。',
      'The great wolf {name} had bound with "{cheat}" came back leading the rest of its pack.', { kind: 'power', eff: { power: 2, fame: 2 } }],
    ['討伐対象の魔物を、{name}は倒さずに〈{cheat}〉で従えた。依頼主はしばらく口を開けていた。',
      'Instead of killing the target monster, {name} tamed it with "{cheat}". The client just stood there, mouth hanging open.', fight('monster', 0.01)],
    ['空飛ぶ従魔の背に乗って、{name}は山の向こうの村へ薬を届けた。',
      'Riding a flying familiar, {name} carried medicine to a village beyond the mountains.', { eff: { fame: 2, charm: 2 } }],
  ]),
  ...cheat('growth', [
    ['{name}は半年で剣も魔法も一段ずつ伸び、ギルドの記録係に二度見された。',
      'Six months, and {name} had climbed a rank in both sword and spell. The guild recordkeeper looked twice.', { kind: 'power', eff: { level: 2, power: 2 } }],
    ['去年苦戦した{beast}を、{name}は今年は片手で倒した。',
      'This time, {name} beat the {beast} that had given {him} so much trouble last year with one hand.', fight('monster', 0.008)],
    ['〈{cheat}〉のおかげで、{name}の傷の治りも足の速さも、仲間の倍だった。',
      'Thanks to "{cheat}", {name} healed twice as fast and ran twice as quick as anyone else in the party.', { eff: { hp: 3, power: 2 } }],
  ]),
  ...cheat('hide_status', [
    ['盗賊団は{name}を弱い新人だと思って襲いかかった。〈{cheat}〉で隠していた力を見て、全員が武器を捨てた。',
      'The bandits took {name} for a weak rookie and attacked. When the strength hidden by "{cheat}" showed, they all dropped their weapons.', fight('violence', 0.01, 'bandit')],
    ['{name}は〈{cheat}〉で弱く見せたまま、敵国の砦に雑兵として潜り込んだ。',
      'Using "{cheat}" to look harmless, {name} slipped into an enemy fort as a common foot soldier.', { risk: { hazard: 'war', p: 0.01 } }],
    ['ギルドの能力検査で、{name}は〈{cheat}〉で平凡な数字を出した。おかげで面倒な勧誘は来なかった。',
      'At the guild aptitude check, {name} used "{cheat}" to post ordinary numbers. That kept the troublesome recruiters away.', { kind: 'power', eff: { happy: 2 } }],
  ]),
  ...cheat('skill_steal', [
    ['倒した魔術師から、{name}は〈{cheat}〉で炎の術を奪った。次の戦いで、さっそくそれを使った。',
      'With "{cheat}", {name} took the fire spell from a defeated sorcerer and put it to use in the very next fight.', fight('violence', 0.012)],
    ['{name}は〈{cheat}〉で奪った力を、もう誰にも使わせないために封じ込めた。',
      'After stealing a power with "{cheat}", {name} sealed it away so no one could use it again.', { kind: 'power', eff: { mind: 2 } }],
    ['魔獣の毒の牙を〈{cheat}〉で奪い、{name}は同じ牙で魔獣の群れを追い払った。',
      "{name} stole a beast's venom fang with \"{cheat}\" and used it to drive off the rest of the pack.", fight('monster', 0.012)],
  ]),
  ...cheat('gacha', [
    ['〈{cheat}〉で引いたのは、見たこともない伝説級の槍だった。{name}は試しに振って、岩を割った。',
      'The draw from "{cheat}" was a legendary spear {name} had never seen. One test swing split a boulder.', { kind: 'power', eff: { power: 4, luck: 2 } }],
    ['決戦の朝の〈{cheat}〉は外れだった。{name}は乾いたパンをかじりながら出陣した。',
      'On the morning of the decisive battle, "{cheat}" came up empty. {name} marched out chewing dry bread.', fight('war', 0.012)],
    ['{name}は〈{cheat}〉で当てた回復薬を仲間全員に配り、全滅しかけた戦いを持ち直した。',
      'Handing out the potions {he} had pulled from "{cheat}", {name} turned around a fight the party was about to lose.', fight('monster', 0.01)],
  ]),
  ...cheat('online_shop', [
    ['{name}は〈{cheat}〉で前世のヘッドライトを取り寄せ、真っ暗なダンジョンを昼間のように照らした。',
      '{name} ordered a headlamp from the old world through "{cheat}" and lit up the pitch-black dungeon like daytime.', { risk: { hazard: 'monster', p: 0.008 } }],
    ['遠征の夜、{name}が〈{cheat}〉で取り寄せた缶詰とカップ麺に、仲間たちは泣きそうになった。',
      'On the night of the expedition, the canned food and instant noodles {name} ordered through "{cheat}" nearly brought the party to tears.', { eff: { happy: 3, charm: 2 } }],
    ['{name}は〈{cheat}〉で消毒液と包帯を山ほど買い、砦の怪我人を救った。',
      'Buying piles of disinfectant and bandages through "{cheat}", {name} saved the wounded at the fort.', { eff: { fame: 3, wealth: -2 } }],
  ]),
  ...cheat('modern_medicine', [
    ['戦場の天幕で、{name}は〈{cheat}〉を頼りに、止まらない血を縫って止めた。',
      'In a battlefield tent, relying on "{cheat}", {name} stitched closed a wound that would not stop bleeding.', { eff: { fame: 3, charm: 2 } }],
    ['{name}は討伐隊の水を煮沸させ、遠征での腹下しをゼロにした。〈{cheat}〉の一番地味な使い方だった。',
      '{name} had the hunting party boil its water and not one of them got sick on the march. The plainest use of "{cheat}" yet.', { kind: 'power', eff: { mind: 2 } }],
    ['毒矢を受けた仲間を、{name}は〈{cheat}〉で見立て、間に合わせの道具で助けた。',
      'When a comrade took a poison arrow, {name} diagnosed it with "{cheat}" and saved them with improvised tools.', fight('violence', 0.008)],
  ]),
  ...cheat('agri_knowledge', [
    ['{name}は〈{cheat}〉で兵糧の芋を育て、籠城戦を一冬持ちこたえさせた。',
      'With "{cheat}", {name} grew potatoes for the garrison and the siege held out through winter.', { risk: { hazard: 'war', p: 0.008 }, eff: { fame: 3 } }],
    ['畑を荒らす{beast}を、{name}は前世の知恵で作った柵と罠で追い払った。',
      'Using fences and traps from old-world know-how, {name} drove off the {beast} ravaging the fields.', fight('monster', 0.008)],
    ['飢饉の噂が流れた年、{name}は〈{cheat}〉で三つの村に輪作を教えて回った。',
      'In a year of famine rumors, {name} went around three villages teaching crop rotation with "{cheat}".', { eff: { fame: 3, charm: 3 } }],
  ]),
  ...cheat('foresight', [
    ['〈{cheat}〉で、この峠で待ち伏せがあると知っていた。{name}は隊を一日早く通した。',
      '"{cheat}" told {name} there would be an ambush at this pass, so {he} led the group through a day early.', { risk: { hazard: 'violence', p: 0.006 } }],
    ['筋書きでは、この戦いで死ぬはずの若い騎士がいた。{name}はその騎士の前に立った。',
      'In the story {name} knew, a young knight was supposed to die in this battle. {name} stepped in front of him.', { ...fight('war', 0.012), not: NF }],
    ['{name}は〈{cheat}〉で、まだ誰も知らない隠しダンジョンの入口へ真っ先に向かった。',
      'With "{cheat}", {name} went straight to the entrance of a hidden dungeon no one else knew about yet.', { risk: { hazard: 'monster', p: 0.01 }, eff: { wealth: 4, level: 1 } }],
  ]),
  ...cheat('max_luck', [
    ['{name}が振り回した剣が、たまたま竜の逆鱗に当たった。',
      "{name}'s wild swing happened to land right on the dragon's one soft scale.", { ...fight('monster', 0.01, 'dragon'), not: NF }],
    ['崩れた天井の石は、なぜか全部{name}を避けて落ちた。',
      'For some reason every stone from the collapsing ceiling missed {name}.', { risk: { hazard: 'accident', p: 0.004 } }],
    ['{name}が道で拾った古い鍵が、ダンジョンの宝物庫の鍵だった。〈{cheat}〉はいつもこうだった。',
      'An old key {name} picked up on the road turned out to open the dungeon treasury. "{cheat}" was always like that.', { eff: { wealth: 5 } }],
  ]),
  ...cheat('trash_skill', [
    ['外れと笑われた〈{cheat}〉が、追い詰められた戦いの中でいきなり化けた。{name}自身がいちばん驚いた。',
      'The "{cheat}" everyone had laughed at suddenly evolved in a desperate fight. {name} was the most surprised of all.', { ...fight('monster', 0.012), eff: { level: 3, power: 3 } }],
    ['{name}は〈{cheat}〉の妙な使い道を見つけ、誰も開けられなかった遺跡の扉を開けた。',
      'Finding an odd use for "{cheat}", {name} opened a ruin door no one else could.', { eff: { fame: 3, mind: 2 } }],
    ['{name}を追い出したパーティが、助けを求めて戻ってきた。{name}は少しだけ迷ってから、手を貸した。',
      'The party that had kicked {name} out came back begging for help. After a moment of hesitation, {he} lent a hand.', { eff: { fame: 2, happy: 2 } }],
  ]),
  ...cheat('sword_saint', [
    ['十人の剣士に囲まれ、{name}は剣を一度鞘から抜いて、また納めた。十人とも膝をついていた。',
      'Surrounded by ten swordsmen, {name} drew once and sheathed again. All ten were on their knees.', fight('violence', 0.01)],
    ['{name}は〈{cheat}〉で、飛んでくる矢を一本残らず斬り落とした。',
      'With "{cheat}", {name} cut down every arrow in the air.', fight('war', 0.01)],
    ['{name}は岩の竜を一太刀で両断し、剣のほうが先に欠けた。',
      'One stroke from {name} split a rock dragon in two. The blade chipped before the dragon did.', { ...fight('monster', 0.012, 'dragon'), not: NF }],
  ]),
  ...cheat('holy_power', [
    ['屍の群れが村を囲んだ夜、{name}は〈{cheat}〉の光で一体残らず土に還した。',
      'The night a horde of the dead surrounded the village, {name} returned every one of them to the earth with the light of "{cheat}".', fight('monster', 0.01, 'undead')],
    ['{name}は〈{cheat}〉で、戦場の怪我人を夜通し癒やし続けた。翌朝、{name}の名を呼ぶ声が絶えなかった。',
      'All night long, {name} healed the wounded on the battlefield with "{cheat}". By morning, everyone was calling out {his} name.', { eff: { fame: 4, charm: 3, hp: -2 } }],
    ['呪われた森を、{name}は〈{cheat}〉で歩きながら浄めていった。',
      '{name} walked through a cursed forest, purifying it with "{cheat}" step by step.', { risk: { hazard: 'magic', p: 0.008 } }],
  ]),
  ...cheat('charm_eyes', [
    ['剣を向けてきた盗賊の頭目と目が合った。{name}が〈{cheat}〉で微笑むと、頭目は剣を下ろした。',
      'The bandit chief pointed a sword at {name} and met {his} gaze. One smile through "{cheat}", and the blade came down.', { risk: { hazard: 'violence', p: 0.008 } }],
    ['{name}は〈{cheat}〉で敵の将と目を合わせ、そのまま和議の席に着かせた。',
      'Locking eyes with the enemy general through "{cheat}", {name} brought him straight to the peace table.', { eff: { fame: 4, charm: 2 } }],
    ['暴れる魔獣も、{name}の瞳を見るとおとなしくなった。討伐の依頼は、保護の依頼に変わった。',
      "Even a rampaging beast calmed when it looked into {name}'s eyes. The hunting job turned into a rescue.", { risk: { hazard: 'monster', p: 0.008 } }],
  ]),
  ...cheat('language', [
    ['竜の言葉が分かったのは{name}だけだった。{name}は竜と話をつけ、戦いを一つ終わらせた。',
      "Only {name} could understand the dragon's speech. {He} struck a deal with it and ended a war before it began.", { eff: { fame: 5, mind: 2 }, not: NF }],
    ['古代の碑文を〈{cheat}〉で読み、{name}は遺跡の罠をすべて避けて最奥に着いた。',
      'Reading ancient inscriptions with "{cheat}", {name} avoided every trap and reached the heart of the ruin.', { risk: { hazard: 'accident', p: 0.006 } }],
    ['敵兵の囁きを{name}だけが聞き取り、夜襲の時刻を味方に伝えた。',
      "{name} alone understood the enemy soldiers' whispers and warned the camp of the night raid.", fight('war', 0.01)],
  ]),
  ...cheat('map', [
    ['〈{cheat}〉に赤い点が群れて見えた。{name}は隊を止め、魔物の待ち伏せを逆に囲んだ。',
      '"{cheat}" showed a cluster of red dots. {name} halted the party and surrounded the monster ambush instead.', fight('monster', 0.01)],
    ['迷宮で迷った他のパーティを、{name}は〈{cheat}〉で見つけて出口へ連れ出した。',
      'With "{cheat}", {name} found another party lost in the labyrinth and led them out.', { eff: { fame: 3, charm: 2 } }],
    ['{name}は〈{cheat}〉で誰も知らない抜け道を見つけ、敵の補給路を断った。',
      "{name} used \"{cheat}\" to find a path no one knew and cut the enemy's supply line.", fight('war', 0.01)],
  ]),
  ...cheat('poison_immunity', [
    ['毒の霧が立ちこめる沼を、{name}だけが平気な顔で渡り、向こう岸の村に薬を届けた。',
      'Only {name} could wade through the swamp of poison fog unharmed, carrying medicine to the village on the far shore.', { eff: { fame: 3 } }],
    ['呪いの魔眼に睨まれても、{name}は〈{cheat}〉で何も感じなかった。魔物のほうが戸惑った。',
      'Glared at by a cursed evil eye, {name} felt nothing thanks to "{cheat}". The monster was the one confused.', fight('monster', 0.01)],
    ['敵の毒見役を引き受け、{name}は出された料理を全部食べてから、毒を盛った者を指さした。',
      'Taking the role of food taster, {name} ate every dish, then pointed out the poisoner.', { kind: 'power', eff: { fame: 3 } }],
  ]),
  ...cheat('cooking', [
    ['{name}が〈{cheat}〉で作った野営の鍋で、疲れ切った兵たちが立ち上がった。',
      'The camp stew {name} made with "{cheat}" got exhausted soldiers back on their feet.', { eff: { charm: 3, fame: 2 } }],
    ['{name}は〈{cheat}〉で魔物の肉をごちそうに変え、飢えていた村の冬を救った。',
      "{name} turned monster meat into a feast with \"{cheat}\" and saved a starving village's winter.", { eff: { fame: 3, charm: 2 } }],
    ['{name}の料理の匂いにつられて出てきた{beast}を、仲間がその場で仕留めた。',
      "Lured out by the smell of {name}'s cooking, the {beast} was taken down by the party on the spot.", fight('monster', 0.008)],
  ]),
  ...cheat('hacking', [
    ['{name}は〈{cheat}〉で敵の防衛システムに入り込み、砲台の向きを全部変えた。',
      "With \"{cheat}\", {name} slipped into the enemy's defense grid and turned every turret around.", fight('war', 0.01, 'machine')],
    ['暴走した輸送機械を、{name}は〈{cheat}〉で止め、乗っていた人々を降ろした。',
      'Using "{cheat}", {name} halted a runaway transport and got everyone aboard off safely.', { risk: { hazard: 'accident', p: 0.008 } }],
    ['{name}は〈{cheat}〉で犯罪組織の帳簿を抜き取り、匿名で警察に送った。',
      'With "{cheat}", {name} pulled the books of a crime syndicate and sent them anonymously to the police.', { kind: 'power', eff: { fame: 2, wealth: 2 }, risk: { hazard: 'violence', p: 0.008 } }],
  ]),
  ...cheat('psychic', [
    ['{name}は〈{cheat}〉で崩れ落ちる橋を宙に支え、最後の一人が渡るまで離さなかった。',
      'With "{cheat}", {name} held a collapsing bridge in midair and did not let go until the last person had crossed.', { risk: { hazard: 'magic', p: 0.01 }, eff: { fame: 4 } }],
    ['飛んできた弾を、{name}は念じるだけで止め、相手の足元に落とした。',
      "With a single thought, {name} stopped the incoming bullets and dropped them at the shooter's feet.", fight('violence', 0.01)],
    ['{name}の〈{cheat}〉が戦いの最中に暴れかけた。{name}は歯を食いしばって、それを敵にだけ向けた。',
      '"{cheat}" nearly ran wild mid-fight. Teeth clenched, {name} forced it toward the enemy alone.', { ...fight('magic', 0.012), eff: { level: 2, hp: -3 } }],
  ]),
  ...cheat('stealth', [
    ['{name}は〈{cheat}〉で誰にも気づかれずに敵の陣へ入り、捕らわれていた仲間を連れ出した。',
      'With "{cheat}", {name} entered the enemy camp unseen and brought out the captured comrades.', { risk: { hazard: 'war', p: 0.01 } }],
    ['眠る竜の真横を、{name}は〈{cheat}〉ですり抜け、卵を一つも割らずに宝を持ち帰った。',
      'Slipping right past a sleeping dragon with "{cheat}", {name} brought back the treasure without cracking a single egg.', { risk: { hazard: 'monster', p: 0.01 }, eff: { wealth: 5 }, not: NF }],
    ['盗賊団の首領の背後に、{name}はいつの間にか立っていた。首領は振り向く前に気を失った。',
      'Somehow {name} was standing right behind the bandit leader. He passed out before he could turn around.', fight('violence', 0.008, 'bandit')],
  ]),
];

// 特典の使い方を選ぶ出来事 (慎重と大胆)
// 重み 0.1 (元は 1.5): 選択肢つきは本文と選んだ後の文で2件の記録になり、8件で1人あたり約7件を占めたため
const CHEAT_CHOICES: EventDef[] = plain('ch-choice', { stage: ['adult', 'middle'], cheat: true, flag: 'guild', w: 0.1, kind: 'adventure' }, [
  ['崩れかけた遺跡の奥から、{name}を呼ぶような助けの声がした。〈{cheat}〉を使えば届くかもしれない。',
    'A cry for help came from deep inside a crumbling ruin. With "{cheat}", {name} might reach it.',
    { choice: boldOrSafe('accident', ['{name}は足場を確かめながら進み、声の主を背負って戻った。', '{name} tested every foothold on the way and came back carrying whoever had called.'],
      ['{name}は崩れる床を駆け抜け、声の主を抱えて飛び出した。', '{name} sprinted across the collapsing floor and burst out carrying whoever had called.']) }],
  ['討伐の最中、{name}は群れの奥に一回り大きい個体を見つけた。〈{cheat}〉ならあれも倒せるかもしれない。',
    'Mid-hunt, {name} spotted a much larger creature deep in the pack. "{cheat}" might be enough to bring it down too.',
    { foe: 'monster', choice: boldOrSafe('monster', ['{name}は群れを散らすだけにして、大物には手を出さずに引き返した。', '{name} scattered the pack and turned back without touching the big one.'],
      ['{name}は〈{cheat}〉で群れを割り、まっすぐ大物の喉元へ向かった。', "{name} split the pack with \"{cheat}\" and went straight for the big one's throat."]) }],
  ['依頼の途中で、{name}は別の隊が罠にかかっているのを見つけた。',
    'Partway through a job, {name} found another team caught in a trap.',
    { choice: boldOrSafe('violence', ['{name}は周りの安全を確かめてから、一人ずつ罠から外した。', '{name} made sure the area was clear, then freed them one at a time.'],
      ['{name}は罠を仕掛けた連中のねぐらへ、そのまま踏み込んだ。', '{name} charged straight into the hideout of the people who had set the trap.'], 0.03) }],
  ['〈{cheat}〉の限界を、{name}はまだ確かめたことがなかった。',
    '{name} had never tested the limits of "{cheat}".',
    { kind: 'power', choice: boldOrSafe('magic', ['{name}は少しずつ試し、限界の手前で止めることを覚えた。', '{name} tested it bit by bit and learned where to stop short of the limit.'],
      ['{name}は限界まで力を振り絞り、倒れる寸前で新しい段に届いた。', '{name} pushed to the very edge and, on the verge of collapse, reached a new level.'], 0.02) }],
  ['嵐の夜、遭難した一団の灯りが遠くに見えた。',
    'On a stormy night, the lights of a stranded group flickered in the distance.',
    { choice: boldOrSafe('accident', ['{name}は嵐が弱まるのを待ってから向かい、朝までに全員を連れ戻した。', '{name} waited for the storm to ease, then went out and had everyone back by morning.'],
      ['{name}は嵐の中へ飛び出し、〈{cheat}〉で道を切り開いた。', '{name} charged into the storm and cut a path with "{cheat}".'], 0.03) }],
  ['敵の砦に、捕らわれた人々がいると分かった。援軍は三日後だった。',
    'There were captives inside the enemy fort, and reinforcements were three days away.',
    { foe: 'soldier', choice: boldOrSafe('war', ['{name}は援軍を待ち、包囲が整ってから門を破った。', '{name} waited for reinforcements and broke the gate once the siege was in place.'],
      ['{name}は〈{cheat}〉を頼りに、その夜のうちに一人で忍び込んだ。', 'Relying on "{cheat}", {name} slipped in alone that very night.'], 0.04) }],
  ['宝の眠る部屋の前に、古い封印があった。〈{cheat}〉なら破れるかもしれない。',
    'An old seal guarded the treasure room. "{cheat}" might be able to break it.',
    { choice: boldOrSafe('magic', ['{name}は封印を調べるだけ調べ、手を出さずに引き返した。', '{name} studied the seal thoroughly, then turned back without touching it.'],
      ['{name}は封印を力ずくで破り、中の宝と、中の番人の両方に向き合った。', '{name} forced the seal and faced both the treasure and its guardian.'], 0.03) }],
  ['{name}の名を聞いた挑戦者が、果たし合いを申し込んできた。',
    'A challenger who had heard of {name} demanded a duel.',
    { foe: 'soldier', choice: boldOrSafe('violence', ['{name}は木剣での手合わせにとどめ、相手を引き下がらせた。', '{name} kept it to wooden swords and sent the challenger off.'],
      ['{name}は真剣での勝負を受け、相手の剣を折った。', "{name} accepted a duel with real blades and broke the challenger's sword."], 0.03) }],
]);

// ======================================================================
// trait を名指しする出来事 (needs)
// スキルは剣術から裁縫までいろいろなので、どの技でも通じる言い回しにする
// ======================================================================
const NEED_BASE: Base = { stage: ['teen', 'adult', 'middle'], w: 1.5, repeat: true, kind: 'adventure', eff: { level: 1, fame: 1 } };

const SKILL = plain('skill', { ...NEED_BASE, needs: ['skill'] }, [
  ['{name}は〈{skill}〉を活かして、誰も手を付けなかった厄介な依頼を片付けた。', '{name} put {skill} to work and cleared a nasty job nobody else would touch.', { eff: { wealth: 3, fame: 2 } }],
  ['囲まれた夜、{name}は〈{skill}〉で切り抜ける道を見つけ、仲間を先に逃がした。', 'Surrounded one night, {name} found a way out with {skill} and got the others clear first.', fight('violence', 0.01)],
  ['〈{skill}〉の腕を見込まれ、{name}は遠征隊に名指しで呼ばれた。', '{name} was personally invited to join an expedition on the strength of {skill}.', { kind: 'fame', eff: { fame: 3 } }],
  ['{name}は〈{skill}〉の稽古を一日も休まなかった。その年、腕が一段上がった。', '{name} did not skip a single day of practicing {skill}. That year it went up a level.', { kind: 'power', eff: { level: 2, power: 1 } }],
  ['〈{skill}〉がなければ越えられなかった難所を、{name}は越えた。', '{name} got through a stretch that would have been impossible without {skill}.', { risk: { hazard: 'accident', p: 0.006 } }],
  ['{name}は〈{skill}〉で敵の隙を作り、そのまま戦いを終わらせた。', "{name} used {skill} to open a gap in the enemy's guard and ended the fight there.", fight('monster', 0.01)],
  ['若い冒険者に〈{skill}〉の手ほどきを頼まれ、{name}は渋い顔のまま三日付き合った。', 'A young adventurer asked {name} for lessons in {skill}. {He} frowned the whole time but stuck with it for three days.', { kind: 'fame', eff: { charm: 2, fame: 1 } }],
  ['〈{skill}〉で稼いだ金で、{name}は新しい装備を一式そろえた。', 'With money earned from {skill}, {name} bought a whole new set of gear.', { kind: 'power', eff: { wealth: -2, power: 2 } }],
  ['{name}の〈{skill}〉が、思いがけない場面で隊の命を救った。', "{name}'s {skill} saved the whole team at a moment no one expected.", { risk: { hazard: 'monster', p: 0.01 }, eff: { fame: 3, charm: 2 } }],
  ['{name}は〈{skill}〉の名人と腕比べをして、僅差で負けた。悔しくて眠れなかった。', '{name} went head to head with a master of {skill} and lost by a hair, too frustrated to sleep that night.', { kind: 'power', eff: { level: 1, happy: -1, mind: 1 } }],
  ['{name}は〈{skill}〉を使って砦の守りの穴を見つけ、守備隊長に知らせた。', "Using {skill}, {name} found a weak spot in the fort's defenses and reported it to the captain.", { eff: { fame: 2, mind: 2 } }],
  ['盗賊の待ち伏せを、{name}は〈{skill}〉を活かして逆手に取った。', '{name} turned a bandit ambush around by making use of {skill}.', fight('violence', 0.01, 'bandit')],
  ['〈{skill}〉の評判が広まり、{name}のもとに指名の仕事が増えた。', "Word of {name}'s {skill} spread, and personal requests started piling up.", { kind: 'fame', eff: { fame: 3, wealth: 3 } }],
  ['ある依頼で、{name}は〈{skill}〉の新しい使い道を思いついた。', 'Partway through a job, {name} hit on a new way to use {skill}.', { kind: 'power', eff: { mind: 3 } }],
  ['魔物の群れの中で、{name}は〈{skill}〉だけを信じて前に出た。', 'In the middle of a monster swarm, {name} stepped forward trusting only in {skill}.',
    { foe: 'monster', choice: boldOrSafe('monster', ['{name}は群れの端を崩すにとどめ、仲間のところまで引き返した。', '{name} only broke the edge of the swarm, then fell back to the others.'],
      ['{name}は〈{skill}〉で群れの真ん中を割った。', '{name} split the swarm down the middle with {skill}.'], 0.03) }],
  ['〈{skill}〉の大会に出た{name}は、思いのほか勝ち進んだ。', '{name} entered a {skill} competition and went further than anyone expected.',
    { kind: 'fame', choice: boldOrSafe('violence', ['{name}は準決勝で無理をせず、手を挙げて降りた。', '{name} chose not to push in the semifinal and bowed out.'],
      ['{name}は最後まで勝ち抜き、優勝の旗を受け取った。', "{name} won through to the end and took home the winner's banner."], 0.01) }],
]);

const ABILITY = plain('ability', { ...NEED_BASE, needs: ['ability'] }, [
  ['生まれ持った〈{ability}〉のおかげで、{name}は誰より先に危険に気づいた。', 'Thanks to an inborn {ability}, {name} noticed the danger before anyone else.', { risk: { hazard: 'monster', p: 0.006 } }],
  ['{name}は〈{ability}〉で、闇に潜んでいた敵を見つけ出した。', '{name} used {ability} to find the enemy hiding in the dark.', fight('violence', 0.01)],
  ['〈{ability}〉がなければ、あの依頼は失敗していた。{name}は報酬を受け取りながら、そう思った。', 'Without {ability}, that job would have failed. {He} thought so while collecting the pay.', { eff: { wealth: 3 } }],
  ['{name}の〈{ability}〉に、熟練の冒険者たちが舌を巻いた。', "Veteran adventurers were floored by {name}'s {ability}.", { kind: 'fame', eff: { fame: 3 } }],
  ['{name}は〈{ability}〉を頼りに、迷った隊を出口まで導いた。', 'Relying on {ability}, {name} guided a lost party back to the exit.', { eff: { charm: 2, fame: 2 } }],
  ['強敵との戦いの最中、{name}の〈{ability}〉が勝負を分けた。', "In the middle of a hard fight, {name}'s {ability} tipped the balance.", fight('monster', 0.012)],
  ['{name}は〈{ability}〉を鍛え直し、前よりずっと遠くまで届くようにした。', '{name} retrained {ability} until it reached far further than before.', { kind: 'power', eff: { level: 1, mind: 2 } }],
  ['〈{ability}〉のことを知った軍から、{name}に誘いが来た。', "The army heard about {name}'s {ability} and sent an offer.", { kind: 'fame', eff: { fame: 2, wealth: 2 } }],
  ['{name}は〈{ability}〉で、隠された宝の部屋を見つけた。', '{name} found a hidden treasure room through {ability}.', { eff: { wealth: 5 } }],
  ['嵐の中の夜行軍で、{name}の〈{ability}〉が隊を崖から遠ざけた。', "On a night march through a storm, {name}'s {ability} kept the column away from the cliff edge.", { risk: { hazard: 'accident', p: 0.006 } }],
  ['盗賊の頭目の嘘を、{name}は〈{ability}〉で見破った。', "{name} saw through the bandit leader's bluff with {ability}.", fight('violence', 0.008, 'bandit')],
  ['{name}の〈{ability}〉を見て、子どもたちが真似をしたがった。', "Seeing {name}'s {ability}, the children all wanted to copy it.", { kind: 'fame', eff: { happy: 3, charm: 1 } }],
  ['{name}は〈{ability}〉を使って、狙われていた依頼主を守りきった。', 'Using {ability}, {name} kept a targeted client safe to the end.', fight('violence', 0.012)],
  ['〈{ability}〉が告げた嫌な予感を、{name}は信じるべきか迷った。', 'A bad feeling came through {ability}, and {name} wondered whether to trust it.',
    { choice: boldOrSafe('monster', ['{name}は予感に従って引き返し、あとで崩落の知らせを聞いた。', '{name} trusted the feeling and turned back, and later heard about the cave-in.'],
      ['{name}は予感を押して進み、崩れる寸前の奥で宝を手にした。', '{name} pushed past the feeling and grabbed the treasure just before the depths caved in.'], 0.03) }],
  ['強大な相手を前に、{name}は〈{ability}〉で勝ち筋を探った。', 'Facing a powerful foe, {name} searched for a way to win with {ability}.',
    { kind: 'battle', choice: boldOrSafe('violence', ['{name}は勝ち筋が見えないうちは手を出さず、退く道を選んだ。', '{name} saw no sure path to victory and chose to retreat.'],
      ['{name}は〈{ability}〉が示した一瞬に、全てを賭けた。', '{name} bet everything on the single opening {ability} revealed.'], 0.035) }],
]);

const BLESSING = plain('blessing', { ...NEED_BASE, needs: ['blessing'] }, [
  ['倒れたはずの一撃の後、{name}は立っていた。〈{blessing}〉が守ったのだと、誰もが言った。', 'After a blow that should have felled {him}, {name} was still standing. Everyone said {blessing} had been the shield.', fight('monster', 0.01)],
  ['{name}は〈{blessing}〉に感謝して、討伐の前に祈りを捧げた。その日の戦いは驚くほど楽だった。', '{name} gave thanks for {blessing} before the hunt. The fight that day went surprisingly easily.', fight('monster', 0.008)],
  ['〈{blessing}〉のしるしが、{name}の手の甲に淡く光った。周りの人々がひざまずいた。', "The mark of {blessing} glowed faintly on the back of {name}'s hand, and the people around knelt.", { kind: 'fame', eff: { fame: 4 } }],
  ['疫病の村へ向かった{name}は、〈{blessing}〉のおかげで一度も熱を出さなかった。', 'Heading into a plague village, {name} never once ran a fever, thanks to {blessing}.', { risk: { hazard: 'disease', p: 0.006 }, eff: { fame: 3, charm: 2 } }],
  ['{name}が掲げた〈{blessing}〉の光に、闇の魔物が後ずさった。', 'Creatures of darkness shrank back from the light of {blessing} that {name} held high.', fight('monster', 0.01, 'undead')],
  ['〈{blessing}〉を受けた者として、{name}は神殿から特別な任務を託された。', 'As the bearer of {blessing}, {name} was entrusted with a special mission by the temple.', { kind: 'fame', eff: { fame: 3 }, risk: { hazard: 'monster', p: 0.01 } }],
  ['夢の中で、{name}は〈{blessing}〉の主の声を聞いた。翌朝、迷っていた道を決めた。', 'In a dream {name} heard the voice behind {blessing}. By morning the uncertain path was settled.', { kind: 'power', eff: { mind: 2, happy: 2 } }],
  ['{name}は〈{blessing}〉の導きに従い、嵐の海を渡りきった。', 'Following the guidance of {blessing}, {name} made it across a stormy sea.', { risk: { hazard: 'accident', p: 0.008 } }],
  ['矢の雨の中、{name}に当たる矢は一本もなかった。〈{blessing}〉の噂が広まった。', 'In a hail of arrows, not one struck {name}. Talk of {blessing} spread.', fight('war', 0.01)],
  ['{name}は〈{blessing}〉に恥じないよう、困っている村の頼みを無償で引き受けた。', "To be worthy of {blessing}, {name} took on a struggling village's request for free.", { eff: { charm: 3, fame: 2, wealth: -1 } }],
  ['〈{blessing}〉を妬んだ者が、{name}に決闘を挑んできた。', 'Someone jealous of {blessing} challenged {name} to a duel.', fight('violence', 0.01)],
  ['{name}は〈{blessing}〉の力を借りて、呪われた仲間の呪いを解いた。', 'Borrowing the power of {blessing}, {name} broke the curse on a cursed comrade.', { kind: 'power', eff: { charm: 3 }, risk: { hazard: 'magic', p: 0.006 } }],
  ['〈{blessing}〉に守られて、{name}は崩れる城から最後に出てきた。', 'Shielded by {blessing}, {name} was the last one out of the collapsing castle.', { risk: { hazard: 'accident', p: 0.008 }, eff: { fame: 3 } }],
  ['祭りの日、{name}は〈{blessing}〉の主に捧げる舞の役を頼まれた。', 'On the festival day, {name} was asked to perform the dance offered to the giver of {blessing}.', { kind: 'fame', eff: { fame: 2, happy: 3 } }],
  ['〈{blessing}〉の力が、今なら試練の門を越えられると告げていた。', '{blessing} seemed to say that now was the time to pass the gate of trials.',
    { choice: boldOrSafe('magic', ['{name}は試練の門を一つだけくぐり、無事に戻った。', '{name} passed through only the first gate and returned safely.'],
      ['{name}は試練の門を最後まで越え、〈{blessing}〉の力が一段深まった。', '{name} passed every gate of the trial, and {blessing} deepened.'], 0.03) }],
]);

// 体質は種類が広い (夜型・大食い・竜の血…) ので名指しせず、生まれ持った体として書く
const CONSTITUTION = plain('body', { ...NEED_BASE, needs: ['constitution'] }, [
  ['三日三晩の行軍で仲間が倒れていく中、{name}の体だけは音を上げなかった。〈{constitution}〉の体のつくりが違った。', "On a three-day march, the others dropped one by one, but {name}'s body held. {constitution} made the difference.", { risk: { hazard: 'accident', p: 0.006 } }],
  ['毒の霧の谷を、{name}は〈{constitution}〉のおかげで、仲間より長く歩けた。', 'In a valley of poison mist, {constitution} let {name} walk further than the others.', { risk: { hazard: 'disease', p: 0.006 } }],
  ['重い傷を負っても、{name}は人より早く床から起き上がった。', 'Even badly wounded, {name} was up off the cot sooner than anyone.', { ...fight('monster', 0.01), eff: { hp: 2, level: 1 } }],
  ['極寒の峠越えで、{name}の体が隊の盾になった。', "Crossing a frozen pass, {name}'s hardiness became the shield for the whole party.", { risk: { hazard: 'accident', p: 0.008 }, eff: { fame: 2 } }],
  ['{name}の〈{constitution}〉を知った医者は、こんな体は見たことがないと首を振った。', "A doctor who learned of {name}'s {constitution} shook his head and said he had never seen a body like it.", { kind: 'power', eff: { mind: 1, hp: 2 } }],
  ['{name}は自分の体の癖を逆手に取り、敵が油断した瞬間に動いた。', '{name} turned a quirk of {his} body to advantage and moved the instant the enemy relaxed.', fight('violence', 0.01)],
  ['砂漠の渡りで、{name}は持って生まれた体のおかげで水を半分しか使わなかった。', 'Crossing a desert, {name} needed only half the water anyone else did, thanks to the body {he} was born with.', { risk: { hazard: 'accident', p: 0.006 } }],
  ['疫病の砦に一人で残り、{name}は最後まで倒れずに怪我人の世話をした。', 'Alone in a plague-struck fort, {name} cared for the sick to the end without falling ill.', { risk: { hazard: 'plague', p: 0.008 }, eff: { fame: 3, charm: 2 } }],
  ['{name}の体は、限界を超えたところでもう一段だけ力を出した。', "Past its limit, {name}'s body found one more gear.", { ...fight('monster', 0.012), eff: { level: 2 } }],
  ['{name}は〈{constitution}〉に合った戦い方を、十年かけて組み上げた。', 'Over ten years, {name} built a fighting style suited to {constitution}.', { kind: 'power', eff: { power: 3, level: 1 } }],
  ['深い水の底で、{name}は仲間より長く息を保ち、沈んだ宝を引き上げた。', 'At the bottom of deep water, {name} held {his} breath longer than anyone and hauled up the sunken treasure.', { risk: { hazard: 'accident', p: 0.008 }, eff: { wealth: 4 } }],
  ['夜通しの見張りでも、{name}は朝まで目を凝らしていられた。夜襲は一度も成功しなかった。', 'Through an all-night watch, {name} stayed sharp until dawn. No night raid ever succeeded on that watch.', fight('violence', 0.008)],
  ['{name}の体の強さは、ギルドの医務室で語り草になった。', "The toughness of {name}'s body became a legend in the guild infirmary.", { kind: 'fame', eff: { fame: 2 } }],
  ['倒れた仲間を背負い、{name}は丸一日歩き続けた。足が止まることはなかった。', 'Carrying a fallen comrade, {name} walked an entire day without stopping.', { eff: { charm: 3, fame: 2 }, risk: { hazard: 'monster', p: 0.008 } }],
  ['体のことを知る仲間が、{name}に危険な役を頼んできた。', "Knowing about {name}'s constitution, a comrade asked {him} to take the dangerous role.",
    { choice: boldOrSafe('accident', ['{name}は役を半分だけ引き受け、残りは仲間と分けた。', '{name} took on half the role and shared the rest.'],
      ['{name}は役を一人で引き受け、自分の体を信じきった。', '{name} took the whole role alone, trusting {his} body completely.'], 0.03) }],
]);

// 種類を問わない trait。{trait} が埋まるよう、何かの needs を付ける
const ANY_TRAIT = plain('trait', { ...NEED_BASE, cheat: true }, [
  ['〈{cheat}〉と〈{trait}〉を組み合わせて、{name}は誰も考えなかった戦い方を見つけた。', 'Combining "{cheat}" with {trait}, {name} found a way of fighting no one had imagined.', { ...fight('monster', 0.01), needs: ['skill'] }],
  ['{name}の〈{trait}〉のことを聞きつけ、遠くの町から依頼が届いた。', "Word of {name}'s {trait} reached a distant town, and a request came from there.", { kind: 'fame', needs: ['skill'], eff: { fame: 3 } }],
  ['〈{trait}〉がなければ、{name}はあの谷で終わっていた。', 'Without {trait}, {name} would have ended in that valley.', { risk: { hazard: 'monster', p: 0.01 }, needs: ['ability'] }],
  ['{name}は仲間に〈{trait}〉の話をした。仲間は笑い、そして頼りにするようになった。', '{name} told the party about {trait}. They laughed, and then they started relying on it.', { needs: ['ability'], eff: { charm: 2 } }],
  ['〈{trait}〉が、{name}を戦いの真ん中から生きて帰した。', '{trait} brought {name} back alive from the middle of the fighting.', { ...fight('war', 0.012), needs: ['blessing'] }],
  ['{name}は〈{trait}〉を頼みに、誰も行かない北の果てへ向かった。', 'Counting on {trait}, {name} headed for the far north where no one went.', { risk: { hazard: 'accident', p: 0.01 }, needs: ['blessing'], eff: { wealth: 3, fame: 2 } }],
  ['〈{trait}〉のことを知る者は、{name}の周りにしかいなかった。それでよかった。', 'Only the people close to {name} knew about {trait}. That was fine.', { kind: 'power', needs: ['skill'], eff: { happy: 2 } }],
  ['{name}は〈{trait}〉を使って、弟子に危険の見分け方を教えた。', '{name} used {trait} to teach an apprentice how to read danger.', { stage: ['adult', 'middle', 'elder'], kind: 'fame', needs: ['skill'], eff: { charm: 2, fame: 1 } }],
  ['〈{trait}〉と〈{cheat}〉。その二つを持つ{name}を、敵は甘く見ていた。', '{trait} and "{cheat}". The enemy underestimated {name}, who had both.', { ...fight('violence', 0.01), needs: ['ability'] }],
  ['強い敵の前で、{name}は〈{trait}〉を信じて一歩踏み出した。', 'Facing a strong enemy, {name} trusted in {trait} and took one step forward.', { ...fight('monster', 0.012), needs: ['blessing'] }],
  ['年を重ねても、〈{trait}〉は{name}を裏切らなかった。', 'Even with the years, {trait} never let {name} down.', { stage: ['middle', 'elder'], kind: 'power', needs: ['skill'], eff: { happy: 2, hp: 1 } }],
]);

// ======================================================================
// 仲間と戦う ({companion})
// ======================================================================
const COMPANION = plain('comp', { stage: ['adult', 'middle'], cheat: true, flag: 'guild', w: 2, repeat: true, kind: 'battle', eff: { level: 1, fame: 1 }, tie: { role: 'companion', d: 5 }, risk: { hazard: 'monster', p: 0.01 } }, [
  ['{name}と{companion}は背中合わせで魔物の群れを迎え撃ち、最後の一体まで離れなかった。', '{name} and {companion} stood back to back against the swarm and did not separate until the last monster fell.'],
  ['{companion}が斬られかけた瞬間、{name}は〈{cheat}〉で割って入り、その一撃を受け止めた。', 'The instant {companion} was about to be cut down, {name} cut in with "{cheat}" and took the blow instead.', { eff: { hp: -3, level: 1 }, tie: { role: 'companion', d: 10 } }],
  ['{companion}が隙を作り、{name}が〈{cheat}〉で決めた。二人で何度も練習した連携だった。', '{companion} opened the gap and {name} finished it with "{cheat}". It was a combination the two had drilled over and over.'],
  ['崩れる足場で{name}が落ちかけたとき、{companion}が腕をつかんだ。', 'When {name} nearly fell from the crumbling ledge, {companion} grabbed {his} arm.', { risk: { hazard: 'accident', p: 0.008 }, kind: 'adventure', tie: { role: 'companion', d: 8 } }],
  ['{name}と{companion}は盗賊団のねぐらに二人だけで乗り込み、捕まっていた人々を連れ出した。', '{name} and {companion} raided the bandit hideout alone and brought out the captives.', { risk: { hazard: 'violence', p: 0.012 }, foe: 'bandit' }],
  ['{companion}の作戦どおりに、{name}は〈{cheat}〉で敵を一か所に集めた。', 'Just as {companion} planned, {name} used "{cheat}" to herd the enemy into one spot.'],
  ['夜の見張りの間、{companion}は{name}に故郷の話をした。翌日の戦いで、二人の息はぴったりだった。', "On night watch, {companion} told {name} about home. In the next day's fight, the two moved as one.", { tie: { role: 'companion', d: 8 } }],
  ['{companion}が毒を受けて倒れた。{name}は一人で敵を引きつけ、{companion}が起き上がるまで持ちこたえた。', '{companion} went down poisoned. {name} drew the enemy alone and held out until {companion} could stand again.', { risk: { hazard: 'monster', p: 0.015 }, tie: { role: 'companion', d: 10 } }],
  ['{name}と{companion}の合わせ技で、群れの頭が地に伏した。周りの冒険者たちが声を上げた。', 'A combined move from {name} and {companion} brought the pack leader down. The other adventurers cheered.', { eff: { level: 1, fame: 3 } }],
  ['撤退の殿を、{name}と{companion}が二人で引き受けた。', '{name} and {companion} took the rearguard together during the retreat.', { risk: { hazard: 'war', p: 0.015 }, foe: 'soldier' }],
  ['{companion}が放った一撃を、{name}の〈{cheat}〉が押し上げた。誰も見たことのない威力だった。', "{name} boosted {companion}'s strike with \"{cheat}\". No one had ever seen that kind of power."],
  ['{name}は{companion}をかばって矢を受けた。{companion}はその夜、黙って傷の手当てをした。', '{name} took an arrow shielding {companion}. That night {companion} tended the wound without a word.', { risk: { hazard: 'violence', p: 0.01 }, eff: { hp: -3 }, tie: { role: 'companion', d: 12 } }],
  ['{companion}が見つけた抜け道を、{name}が〈{cheat}〉で切り開いた。二人で一番に宝の間に着いた。', '{companion} found the shortcut and {name} forced it open with "{cheat}". The two of them reached the treasure room first.', { kind: 'adventure', eff: { wealth: 4 } }],
  ['{name}と{companion}は大物を前に目を合わせ、同時に飛び込んだ。', 'Facing the big one, {name} and {companion} locked eyes and leapt in together.', { risk: { hazard: 'monster', p: 0.015 } }],
  ['{companion}が囮になると言い出した。{name}は止めたが、{companion}は笑って走っていった。作戦は成功した。', '{companion} volunteered to be the decoy. {name} objected, but {companion} just laughed and ran off. The plan worked.', { tie: { role: 'companion', d: 6 } }],
  ['{name}が〈{cheat}〉で敵の動きを止め、{companion}が仕留めた。手柄は{companion}に譲った。', '{name} pinned the enemy with "{cheat}" and {companion} finished it. {name} let {companion} take the credit.', { tie: { role: 'companion', d: 8 } }],
  ['{companion}と並んで城壁に立ち、{name}は押し寄せる敵を夜明けまで退け続けた。', 'Side by side with {companion} on the wall, {name} kept the attackers back until dawn.', { risk: { hazard: 'war', p: 0.015 } }],
  ['{companion}が{name}の死角を、{name}が{companion}の死角を守った。言葉はいらなかった。', "{companion} watched {name}'s blind side, and {name} watched {companion}'s. No words were needed."],
  ['ダンジョンの奥で道を失い、{name}と{companion}は一つの毛布で寒さをしのいだ。翌朝、二人で出口を見つけた。', 'Lost deep in the dungeon, {name} and {companion} shared a blanket against the cold. In the morning they found the way out together.', { kind: 'adventure', risk: { hazard: 'accident', p: 0.006 }, tie: { role: 'companion', d: 10 } }],
  ['{companion}の新しい技を、{name}は〈{cheat}〉で見極め、どこを直せばいいか教えた。', "Studying {companion}'s new technique with \"{cheat}\", {name} pointed out exactly what to fix.", { kind: 'power', risk: undefined, eff: { level: 1 } }],
  ['強敵を前に、{companion}が{name}の肩に手を置いた。', "Facing a powerful enemy, {companion} put a hand on {name}'s shoulder.",
    { choice: boldOrSafe('monster', ['{name}と{companion}は相手の出方をうかがい、勝てないと見て引き返した。', "{name} and {companion} watched the enemy's moves, judged it unwinnable, and turned back."],
      ['{name}と{companion}は同時に踏み込み、二人の一撃で相手を沈めた。', '{name} and {companion} charged in together and brought the enemy down with a single combined blow.'], 0.035) }],
  ['{companion}が捕らわれた。{name}は迷わなかった。', '{companion} was captured. {name} did not hesitate.',
    { risk: undefined, choice: boldOrSafe('violence', ['{name}は仲間を集めて策を練り、三日後に{companion}を取り戻した。', '{name} gathered help, made a plan, and got {companion} back three days later.'],
      ['{name}はその夜のうちに一人で乗り込み、{companion}を背負って戻った。', '{name} went in alone that same night and came back carrying {companion}.'], 0.04) }],
]);

export const EVENTS: EventDef[] = [
  ...NOTICE, ...FIRST, ...GUILD, ...WORK, ...PARTNER, ...DEED, ...SAVED, ...FAMOUS, ...RENOWN, ...LEGEND,
  ...CHEATS, ...CHEAT_CHOICES, ...SKILL, ...ABILITY, ...BLESSING, ...CONSTITUTION, ...ANY_TRAIT, ...COMPANION,
];
