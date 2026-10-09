// 異世界ものの定番ネタ (entry)。書き方と条件の例は tropes.ts の頭。読み込みは engine/events.ts が src/data/events/*.ts を全部集める
// 入口の型: トラック・過労の前世、女神と神様面談、赤ちゃんスタート、途中で思い出す、人外に生まれたほかの転生者の噂
import type { EventDef } from '../../engine/types';

const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const BORN: EventDef['arrival'] = ['reborn', 'awaken'];
const FANTASY: EventDef['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern'];

export const EVENTS: EventDef[] = [
  // ---- 前世の死に方 ----------------------------------------------------------------
  {
    id: 'tpe.truck-driver', stage: ['infant', 'child'], age: [0, 8], pastCause: ['truck'], memory: true, w: 2, kind: 'child',
    ja: '生まれ変わって最初にはっきり考えたのは、「トラックの運転手さん、大丈夫かな」だった。',
    en: 'The first clear thought {name} had in the new life was: "I hope the truck driver is okay."',
    eff: { charm: 1, mind: 1 },
  },
  {
    id: 'tpe.truck-carter', stage: ['adult', 'middle'], pastCause: ['truck'], memory: true, w: 1.5, kind: 'work',
    ja: '{town}の運送屋の親父は、前世でトラックの運転手だったらしい。{name}は前世でトラックにはねられた。二人とも気づいているが、その話はしない。今年も親父は、{name}の荷物だけ妙に丁寧に運んだ。',
    en: 'The old carter in {town} had been a truck driver in a past life. {name} had been hit by a truck in one. Both of them knew. Neither brought it up. This year, too, the carter handled {name}\'s parcels with unusual care.',
    eff: { happy: 2, luck: 1 },
  },
  {
    id: 'tpe.truck-meetup', stage: ['adult', 'middle'], arrival: BORN, memory: true, w: 1.2, kind: 'love',
    ja: '前世の記憶を持つ者の集まりがあると聞いて、行ってみた。全員が、トラックの話をしていた。',
    en: '{name} heard about a gathering of people who remembered their past lives, and went. Everyone was talking about trucks.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '自分の死因を正直に話す', en: 'Share your own story', eff: { happy: 3, charm: 2 }, log: { ja: 'トラックでなくても、拍手が起きた。その夜から{name}は会の幹事になった。', en: 'It was applauded, truck or no truck. From that night on, {name} was in charge of organizing the meetings.' } },
      { ja: '黙って果実水を飲む', en: 'Sip fruit juice in silence', eff: { mind: 1, luck: 1 }, log: { ja: '隣の人も黙っていた。帰り道、その人の死因も聞かなかった。それで十分に気が合った。', en: 'The person next to {him} was quiet too. On the way home, neither asked the other. That was enough to become friends.' } },
    ] },
  },
  {
    id: 'tpe.truck-elder', stage: ['elder'], pastCause: ['truck'], memory: true, w: 1.5, kind: 'old',
    ja: '孫に「どうして馬車の後ろを歩くとき、二歩下がるの」と聞かれた。説明すると長くなるので、「昔、いろいろあってな」とだけ答えた。',
    en: 'A grandchild asked why {name} always stepped two paces back behind a wagon. It was a long story, so {he} only said, "Things happened, long ago."',
    eff: { happy: 2 },
  },
  {
    id: 'tpe.overwork-why-rest', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, w: 1.5, kind: 'family',
    ja: '{child}に「どうして休むのに理由を探すの」と聞かれた。{name}は答えられず、その日は理由なしで昼寝をした。',
    en: '{child} asked {name}, "Why do you need a reason to rest?" {name} had no answer, and took a nap that day for no reason at all.',
    eff: { happy: 3, hp: 1 },
  },
  {
    id: 'tpe.past-age-cake', stage: ['adult', 'middle'], memory: true, arrival: BORN, w: 1.2, kind: 'hard',
    ja: '前世で死んだ歳を越えた朝、{name}は誰にも言わずに、一人でケーキを買った。',
    en: 'On the morning {name} outlived the age of the past life, {he} bought a cake and ate it alone, without telling anyone why.',
    eff: { happy: 3 },
  },
  {
    id: 'tpe.illness-hill', stage: ['child', 'teen'], pastCause: ['illness'], memory: true, w: 1.5, kind: 'child',
    ja: '前世では、ずっと病院の窓から外を見ていた。この世界で初めて丘を駆け下りた日、{name}は息が切れても止まらなかった。',
    en: 'In the past life, {name} had spent years watching the world through a hospital window. The first time {he} ran down a hill in this one, {he} did not stop even when {his} breath ran out.',
    eff: { hp: 2, happy: 4 },
  },
  {
    id: 'tpe.old-lecture', stage: ['child'], pastCause: ['old'], memory: true, w: 1.5, kind: 'child',
    ja: '前世は九十歳で大往生だった。同い年の子に「おまえ、説教くさい」と言われた。',
    en: 'In the past life, {name} had died peacefully at ninety. Now a child of the same age said, "You lecture like a grandpa."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '説教を控える', en: 'Hold back the lectures', eff: { charm: 2 }, log: { ja: '黙っていたら、今度は「大人っぽい」と言われるようになった。', en: 'Once {he} kept quiet, they started calling {him} "mature" instead.' } },
      { ja: '説教を続ける', en: 'Keep lecturing', eff: { mind: 2, charm: -1 }, log: { ja: '二十年後、その子が「あのときの説教、効いたよ」と言いに来た。', en: 'Twenty years later, that child came back to say, "Those lectures of yours actually worked."' } },
    ] },
  },
  {
    id: 'tpe.unknown-banana', stage: ['child', 'teen', 'adult'], pastCause: ['unknown'], memory: true, w: 1.5, kind: 'hard',
    ja: '前世の死に方を、{name}はどうしても思い出せない。夢で女神に聞いたら「知らない方がいいです」と言われた。それ以来、果物の皮だけは必ずよけて歩く。',
    en: '{name} could never remember how the past life ended. When {he} asked the goddess in a dream, she said, "Better not to know." Ever since, {he} has stepped carefully around every piece of fruit peel.',
    eff: { luck: 2 },
  },

  // ---- 女神と神様面談 ----------------------------------------------------------------
  {
    id: 'tpe.goddess-ah', stage: ['child', 'teen'], arrival: BORN, cheat: true, memory: true, w: 1.5, kind: 'power',
    ja: '前世の終わりで覚えているのは、白い場所のことだけだ。女神は書類をめくり、小さく「あ」と言った。それから何も説明せずに〈{cheat}〉をくれた。あの「あ」の意味を、{name}は今も考えている。',
    en: 'All {name} remembered of the end of the past life was a white place. The goddess flipped through some papers and said, very quietly, "Oh." Then she handed over "{cheat}" without a word of explanation. {name} still wonders about that "Oh."',
    eff: { luck: 1, mind: 1 },
  },
  {
    id: 'tpe.goddess-catalog', stage: GROWN, arrival: BORN, cheat: true, memory: true, w: 1.2, kind: 'power',
    ja: '夢の中で、あの日の神様面談をやり直していた。特典の一覧は巻物で四十巻。残り時間は三分。',
    en: 'In a dream, {name} was back at the interview with the goddess. The list of cheat skills filled forty scrolls. Three minutes remained.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '一巻目から真面目に読む', en: 'Read carefully from scroll one', eff: { mind: 2 }, log: { ja: '十巻目で目が覚めた。たぶん、また〈{cheat}〉を選んでいた。', en: '{He} woke up at scroll ten. {He} would probably have picked "{cheat}" again anyway.' } },
      { ja: '一番上のものを押す', en: 'Tap the first one', eff: { luck: 2 }, log: { ja: '夢の中でも、{name}は〈{cheat}〉を選んだ。我ながら迷いがない。', en: 'Even in the dream, {name} picked "{cheat}". No hesitation at all.' } },
    ] },
  },
  {
    id: 'tpe.goddess-exchange', stage: ['adult', 'middle'], arrival: BORN, cheat: true, memory: true, w: 1.2, kind: 'power',
    ja: '夢に女神が出てきて、申し訳なさそうに言った。「あのときの〈{cheat}〉、実は今なら取り替えられます」',
    en: 'The goddess appeared in a dream, looking apologetic. "About the \'{cheat}\' I gave you. I can actually exchange it now."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '一覧を見せてもらう', en: 'Ask to see the list', eff: { luck: 2 }, log: { ja: '女神が一覧を広げたところで、鶏が鳴いて目が覚めた。', en: 'Just as the goddess unrolled the list, a rooster crowed and {name} woke up.' } },
      { ja: '「もう慣れたので」と断る', en: '"I\'m used to it now," and decline', eff: { happy: 3, charm: 1 }, log: { ja: '女神は少しだけ寂しそうに、一覧を巻き直した。', en: 'The goddess rolled the list back up, looking a little lonely.' } },
    ] },
  },
  {
    id: 'tpe.goddess-ordinary', stage: ['child', 'teen'], arrival: BORN, cheat: false, memory: true, w: 1.5, kind: 'child',
    ja: '女神に「強さ・長生き・普通の暮らし」の三つから選べと言われ、普通の暮らしを選んだ。女神は珍しそうに、それを書き留めていた。',
    en: 'The goddess had offered three choices: strength, a long life, or an ordinary life. {name} chose the ordinary one. The goddess wrote it down with a curious look.',
    eff: { happy: 3 },
  },
  {
    id: 'tpe.goddess-everything', stage: ['child', 'teen'], arrival: BORN, cheat: false, memory: true, w: 1.2, kind: 'child',
    ja: '神様面談で、欲張って「全部」と答えた。本当に全部が入っていた。どれも、ほんの少しずつだった。',
    en: 'At the interview with the goddess, {name} greedily answered, "All of them." {He} really did get all of them. Just a tiny bit of each.',
    eff: { hp: 1, power: 1, mind: 1, charm: 1, luck: 1 },
  },
  {
    id: 'tpe.goddess-survey', stage: ['adult', 'middle'], arrival: BORN, memory: true, w: 1.2, kind: 'hard',
    ja: '夢に女神が出てきて、紙を一枚差し出した。「転生後のご満足度についての、簡単なアンケートです」',
    en: 'The goddess appeared in a dream and held out a sheet of paper. "Just a short survey about your satisfaction since rebirth."',
    choice: { ja: 'どう書く?', en: 'How to fill it in?', options: [
      { ja: '全部に満点をつける', en: 'Top marks on everything', eff: { luck: 3 }, log: { ja: '翌年は、少しだけ運が良かった気がする。', en: 'The following year felt slightly luckier.' } },
      { ja: '欄外まで正直に書く', en: 'Write honestly, margins and all', eff: { mind: 2 }, log: { ja: '女神は最後まで読み、「参考にします」と言った。次の転生者からは、説明が少し丁寧になったらしい。', en: 'The goddess read every line and said, "Noted." Apparently the reincarnators after {name} got a slightly better explanation.' } },
    ] },
  },
  {
    id: 'tpe.goddess-letter', stage: ['adult', 'middle', 'elder'], arrival: BORN, cheat: true, memory: true, w: 1, kind: 'power',
    ja: '女神に宛てて感謝の手紙を書き、燃やした。その夜、夢に返事が届いた。字が汚かった。',
    en: '{name} wrote a thank-you letter to the goddess and burned it. That night, a reply arrived in a dream. The handwriting was terrible.',
    eff: { happy: 2, luck: 1 },
  },
  {
    id: 'tpe.goddess-statue', stage: ['child', 'teen', 'adult'], arrival: ['reborn'], cheat: true, magic: 1, w: 1, kind: 'power',
    ja: '神殿の女神像が、{name}にだけ小さく手を振った気がした。',
    en: 'The statue of the goddess in the temple seemed to give {name}, and only {name}, a tiny wave.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: 'こっそり振り返す', en: 'Wave back discreetly', eff: { luck: 2 }, log: { ja: '隣で祈っていた神官が、二度見した。', en: 'The priest praying beside {him} did a double take.' } },
      { ja: '見なかったことにする', en: 'Pretend not to notice', eff: { mind: 1 }, log: { ja: '翌日の女神像は、少しすねた顔に見えた。', en: 'The next day, the statue looked a little sulky.' } },
    ] },
  },
  {
    id: 'tpe.goddess-swapped', stage: GROWN, cheats: ['sword_saint', 'all_magic', 'infinite_mana', 'holy_power', 'exp_boost'], tags: FANTASY, magic: 1, w: 1, kind: 'fame',
    ja: '隣国の勇者は、〈料理〉の特典で魔王軍を餌付けし、戦を終わらせたらしい。風の噂では、{name}の〈{cheat}〉は本来その勇者の分で、女神の手違いで入れ替わっていたという。どちらも、今の方が向いている。',
    en: 'The Hero of the neighboring kingdom had reportedly ended a war by feeding the Demon Lord\'s army with the "Cooking" cheat skill. Rumor said {name}\'s "{cheat}" had been meant for that Hero, and the goddess had mixed the two up. Both of them suited the mistake better.',
    eff: { happy: 2, fame: 1 },
  },
  {
    id: 'tpe.goddess-next', stage: ['elder'], arrival: BORN, memory: true, w: 1.2, kind: 'old',
    ja: '夢に女神が来て、帳面を開いた。「そろそろ、次のご希望をうかがっておこうかと」',
    en: 'The goddess came in a dream and opened a ledger. "I thought I\'d ask about your wishes for next time, while there\'s a chance."',
    choice: { ja: '何と答える?', en: 'What to say?', options: [
      { ja: '「またこの世界で」', en: '"This world again, please"', eff: { happy: 4 }, log: { ja: '女神は「人気なんですよ、ここ」と言って書き留めた。', en: 'The goddess wrote it down. "This one\'s popular, you know."' } },
      { ja: '「次は特典なしで」', en: '"No cheat skill next time"', eff: { mind: 2, happy: 2 }, log: { ja: '女神は筆を止めて、「それ、いちばん難しいやつです」と笑った。', en: 'The goddess paused her pen and laughed. "That\'s the hardest one there is."' } },
    ] },
  },

  // ---- 赤ちゃんスタート・途中で思い出す --------------------------------------------------
  {
    id: 'tpe.baby-roll', stage: ['infant'], age: [0, 3], arrival: ['reborn'], memory: true, magic: 1, w: 1.5, kind: 'child',
    ja: '寝返りの練習を、魔力の鍛錬だと信じて毎日続けた。ただの寝返りだった。',
    en: '{name} practiced rolling over every day, convinced it was mana training. It was just rolling over.',
    eff: { hp: 1 },
  },
  {
    id: 'tpe.baby-ceiling', stage: ['infant'], age: [0, 2], arrival: ['reborn'], memory: true, w: 1.5, kind: 'child',
    ja: '生まれて三か月で、この家の天井の木目を全部覚えた。ほかにすることが無かった。',
    en: 'By three months old, {name} had memorized every knot in the ceiling. There was nothing else to do.',
    eff: { mind: 1 },
  },
  {
    id: 'tpe.baby-reply', stage: ['infant'], age: [0, 3], arrival: ['reborn'], memory: true, w: 1.5, kind: 'child',
    ja: '揺りかごの上で交わされる大人の会話に、うっかり返事をしそうになった。',
    en: 'The grown-ups were chatting over the cradle, and {name} almost answered them.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「あー」とだけ言う', en: 'Just say "Aah"', eff: { luck: 1, charm: 1 }, log: { ja: '大人たちは「この子は聞き上手ね」と喜んだ。', en: 'The grown-ups were delighted. "Such a good listener."' } },
      { ja: 'はっきり返事をする', en: 'Answer properly', eff: { mind: 2, fame: 3 }, log: { ja: '神童だと騒がれ、次の日から知らない大人が毎日のぞきに来た。', en: 'Word spread that {name} was a prodigy. From the next day on, strangers came to peek every single day.' } },
    ] },
  },
  {
    id: 'tpe.baby-mana', stage: ['infant', 'child'], age: [0, 4], arrival: ['reborn'], memory: true, magic: 1, w: 1.5, kind: 'child',
    ja: '揺りかごの中で、魔力を空になるまで使えば伸びる、という前世の読み物の話を思い出した。',
    en: 'In the cradle, {name} remembered a story from the past life: use up all your mana as a baby, and it grows.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '毎晩、空になるまで使う', en: 'Drain it every night', eff: { mind: 3, hp: -1 }, log: { ja: '毎晩、気を失うように眠った。母は「よく寝る子」と喜んだ。', en: 'Every night {he} passed out cold. {His} mother was pleased to have such a good sleeper.' } },
      { ja: '普通の赤ちゃんとして寝る', en: 'Sleep like a normal baby', eff: { hp: 2, happy: 1 }, log: { ja: 'よく寝て、よく育った。それも一つの鍛錬だった。', en: '{He} slept well and grew well. That was training of a kind too.' } },
    ] },
  },
  {
    id: 'tpe.awaken-homework', stage: ['child', 'teen'], arrival: ['awaken'], memory: true, w: 2, kind: 'child',
    ja: '頭を打った拍子に、前世を思い出した。最初に浮かんだのは「宿題やってない」だった。もう出さなくていい宿題だった。',
    en: 'A bump on the head brought the past life back. {name}\'s first thought was, "I didn\'t do my homework." It was homework nobody would ever collect.',
    eff: { mind: 1, happy: 1 },
  },
  {
    id: 'tpe.awaken-notes', stage: ['child', 'teen'], arrival: ['awaken'], memory: true, w: 1.5, kind: 'child',
    ja: '前世を思い出した夜、忘れないうちにと全部書き留めた。翌朝読み返すと、半分は前世の好物の話だった。',
    en: 'The night the past life came back, {name} wrote everything down before it could fade. Reading it the next morning, half of it was about favorite foods.',
    eff: { mind: 1, happy: 1 },
  },

  // ---- 人外に生まれたほかの転生者 ----------------------------------------------------------
  {
    id: 'tpe.other-slime', stage: GROWN, memory: true, tags: FANTASY, magic: 1, w: 1, kind: 'work',
    ja: '旅の商人から、スライムに生まれた転生者の話を聞いた。剣を百本食べるうちに、剣の味の違いが分かるようになったという。今は鍛冶屋の組合で、品評の仕事をしているらしい。',
    en: 'A traveling merchant told {name} about a reincarnator who had been reborn as a slime. After eating a hundred swords, it could taste the difference between them. It now works as a judge for the blacksmiths\' guild.',
    eff: { mind: 1, happy: 1 },
  },
  {
    id: 'tpe.other-vending', stage: ['adult', 'middle', 'elder'], memory: true, w: 1, kind: 'hard',
    ja: '人づてに、自動販売機に生まれた転生者の話を聞いた。誰も金を入れない年が何十年も続いたという。ある冬、迷子の子どもが一人、その灯りの前で夜を越した。それで十分だったと、話は終わっていた。',
    en: '{name} heard secondhand about a reincarnator reborn as a vending machine. For decades, no one put in a single coin. One winter, a lost child spent the night beside its light. That was enough, the story ended.',
    eff: { happy: 2, mind: 1 },
  },
  {
    id: 'tpe.other-spring', stage: GROWN, memory: true, magic: 1, w: 1, kind: 'hard',
    ja: '山の温泉は、元は転生者だという噂がある。入ると腰痛が治るらしい。{name}も肩まで浸かった。',
    en: 'Rumor had it that the hot spring in the mountains used to be a reincarnator. Bathing in it cured back pain. {name} sank in up to the shoulders.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '温泉に話しかけてみる', en: 'Try talking to the spring', eff: { happy: 3 }, log: { ja: '湯気の向こうから「腰、どうですか」と聞き返された。', en: 'From somewhere in the steam came the question, "How\'s your back?"' } },
      { ja: '黙って浸かる', en: 'Soak in silence', eff: { hp: 3 }, log: { ja: '腰痛は本当に治った。帰り際、湯が少し温かくなった気がした。', en: 'The back pain really did go away. As {he} left, the water seemed to warm up a little.' } },
    ] },
  },
  {
    id: 'tpe.other-sword', stage: GROWN, memory: true, tags: FANTASY, magic: 1, w: 1, kind: 'adventure',
    ja: '古道具屋の剣が、{name}にだけ話しかけてきた。前世は会社員で、今は剣だという。',
    en: 'A sword in a junk shop spoke to {name}, and only to {name}. It said it had been an office worker in a past life, and was now a sword.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '買う', en: 'Buy it', eff: { power: 3, wealth: -3 }, log: { ja: '剣は毎朝、天気と相場の話をした。切れ味は確かだった。', en: 'Every morning the sword talked about the weather and market prices. It cut very well.' } },
      { ja: '置いていく', en: 'Leave it', eff: { luck: 1 }, log: { ja: '店を出るとき、背中に「ですよね」と聞こえた。', en: 'On the way out, {name} heard a small voice behind {him}: "Yeah, figured."' } },
    ] },
  },
  {
    id: 'tpe.other-dungeon', stage: ['adult', 'middle'], memory: true, tags: FANTASY, magic: 1, w: 0.8, kind: 'adventure',
    ja: 'ダンジョンの最奥で、ダンジョンそのものが話しかけてきた。前世は日本の会社員で、来客は久しぶりだという。',
    en: 'In the deepest chamber, the dungeon itself spoke to {name}. It had been an office worker in Japan in its past life, and said it had not had visitors in a long time.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '宝箱を受け取って帰る', en: 'Take the treasure and go', eff: { wealth: 6 }, log: { ja: '宝箱は一つ多めに出てきた。帰り際、背後で「またどうぞ」と聞こえた。', en: 'It gave {him} one extra chest. On the way out, {he} heard "Come again" from behind.' } },
      { ja: '世間話をしていく', en: 'Stay and chat', eff: { happy: 3, mind: 1 }, log: { ja: 'ダンジョンは三時間しゃべり続けた。帰り道の罠は、全部止めてくれていた。', en: 'The dungeon talked for three hours straight. Every trap on the way out had been switched off.' } },
    ] },
  },
];
