// 狙ったスキルへの近づき方 (engine/training.ts の goal)。{target} は狙うスキルの名。
// speed は1年の進み (100 で身につく)、failP はうまくいかない年の割合。書き足すときは別のファイルに `export const METHODS` を
import type { TrainMethod } from '../../engine/types';

type M = Omit<TrainMethod, 'name' | 'start' | 'steps' | 'fails' | 'done'> & {
  name: [string, string]; start: [string, string]; steps: [[string, string], [string, string]]; fails: [string, string][]; done: [string, string];
};
const t = ([ja, en]: [string, string]) => ({ ja, en });
const method = (m: M): TrainMethod => ({ ...m, name: t(m.name), start: t(m.start), steps: [t(m.steps[0]), t(m.steps[1])], fails: m.fails.map(t), done: t(m.done) });

export const METHODS: TrainMethod[] = [
  method({ id: 'm.master', name: ['名人に弟子入り', 'Apprentice to a master'], speed: 30, failP: 0.1, cost: 1,
    start: ['〈{target}〉の名人を訪ね、門の前で三日座り込んで弟子入りを許された。', 'Sat outside the gate of a "{target}" master for three days until they gave in and took {him} as an apprentice.'],
    steps: [['師匠に初めて「まあまあ」と言われた。〈{target}〉の入り口が見えてきた。', 'The master said "not bad" for the first time. The door to "{target}" was opening.'],
      ['師匠の癖まで似てきた。弟弟子にからかわれた。', "Started picking up the master's habits too. The junior disciples teased {him} for it."]],
    fails: [['一年間、師匠の家の薪割りしかさせてもらえなかった。たぶん修行だった。', "Spent the whole year splitting the master's firewood. Probably part of the training."],
      ['師匠が旅に出て、置き手紙に「自分で考えろ」とだけあった。', 'The master went traveling and left a note: "Figure it out."']],
    done: ['師匠が黙ってうなずいた。それで十分だった。', 'The master nodded once, silently. That was enough.'] }),
  method({ id: 'm.self', name: ['独学', 'Teach yourself'], speed: 18, failP: 0.25,
    start: ['〈{target}〉を独学で身につけると決めた。手本は古い教本一冊。', 'Decided to learn "{target}" alone, with one battered old manual.'],
    steps: [['教本の半分がわかった。残りの半分は、たぶん誤植だった。', 'Understood half the manual. The other half was probably typos.'],
      ['独学のくせが強くなった。誰にも真似できないが、誰にも教えられない。', 'Developed a very personal style. Nobody could copy it, and nobody could be taught it.']],
    fails: [['教本の大事なページを、ねずみにかじられていた。', 'A mouse had eaten the most important pages of the manual.'],
      ['一年かけて身につけたと思った技は、教本を逆さに読んでいたせいで全部逆だった。', 'Spent a year learning the technique backwards, because the manual was upside down.']],
    done: ['誰にも教わらずにやり遂げた。少し得意になった。', 'Did it without a teacher. Allowed {himself} to be a little smug.'] }),
  method({ id: 'm.tome', name: ['魔導書・教本を買う', 'Buy a grimoire'], speed: 35, failP: 0.15, cost: 4, magic: 1,
    start: ['なけなしの金で〈{target}〉の極意が書かれた本を買った。', 'Spent most of {his} savings on a book of the secrets of "{target}".'],
    steps: [['本の通りにやると、本当にできた。高かっただけはある。', 'Following the book actually worked. Worth the price, after all.'],
      ['巻末に「続きは第二巻で」とあった。第二巻も買った。', 'The last page said "Continued in Volume 2". {He} bought Volume 2.']],
    fails: [['買った本は表紙だけ本物で、中身は料理のレシピだった。おいしかった。', 'Only the cover was genuine. Inside were recipes. They were tasty, at least.']],
    done: ['最後のページを閉じたとき、もう本はいらなかった。', 'By the time {he} closed the last page, {he} no longer needed the book.'] }),
  method({ id: 'm.dungeon', name: ['ダンジョンで実戦', 'Learn in the dungeon'], speed: 45, failP: 0.12, risk: { hazard: 'monster', p: 0.012 }, minHeq: 15, tags: ['fantasy', 'japan', 'cultivation', 'eastern'],
    start: ['〈{target}〉は実戦で覚えるのが一番だと、ダンジョンに潜り始めた。', 'Decided the best way to learn "{target}" was the real thing, and started diving into the dungeon.'],
    steps: [['三層まで降りられるようになった。宝箱はまだ全部ミミックだった。', 'Could reach the third floor now. Every treasure chest so far had been a mimic.'],
      ['死にかけた回数を数えるのをやめた。手は確かに覚えていた。', 'Stopped counting the near-death moments. {His} hands remembered, though.']],
    fails: [['一年中、一層のスライムに負け続けた。スライムに顔を覚えられた。', 'Lost to the first-floor slimes all year. The slimes started to recognize {him}.']],
    done: ['ダンジョンの奥から戻ったとき、体が勝手に動いていた。', 'Coming back up from the depths, {his} body was moving on its own.'] }),
  method({ id: 'm.cheat', name: ['ズルをする (特典の力で)', 'Cheat (with your gift)'], speed: 55, failP: 0.2, cheat: true, minHeq: 12,
    start: ['〈{cheat}〉を使えば〈{target}〉も早いのでは、と思いついた。', 'Had a thought: maybe "{cheat}" could shortcut "{target}" too.'],
    steps: [['思ったより簡単に進んだ。罪悪感は少しだけあった。', 'It went far too smoothly. {He} felt only slightly guilty.'],
      ['周りの努力家たちの目が、少し冷たくなった。', 'The hard workers around {him} started giving {him} cold looks.']],
    fails: [['ズルがばれて、道場を出入り禁止になった。', 'Got caught cheating and was banned from the training hall.'],
      ['力を使いすぎて、三日間寝込んだ。得たものは無かった。', 'Pushed {his} cheat skill too hard and was bedridden for three days. Gained nothing.']],
    done: ['あっさり身についた。努力の話は、聞かれても黙っていることにした。', 'Picked it up just like that. Decided to keep quiet if anyone asked about the effort.'] }),
  method({ id: 'm.guild', name: ['ギルドの講習', 'Guild training course'], speed: 28, failP: 0.1, cost: 2, minHeq: 14, tags: ['fantasy', 'gamey'],
    start: ['{guild}の〈{target}〉講習に申し込んだ。受付の人に「初心者さんですね」と笑われた。', 'Signed up for the "{target}" course at {guild}. The receptionist smiled: "A beginner, then?"'],
    steps: [['講習の小テストで満点を取った。講師がメモを取っていた。', 'Aced the course quiz. The instructor took notes.'],
      ['修了まであと少し。同期の仲間とパーティを組む話が出た。', 'Almost done. The other trainees started talking about forming a party.']],
    fails: [['講習の日を一週間まちがえて、ずっと別の「薬草採り講習」に出ていた。', 'Got the date wrong and spent a week in the wrong class: "Herb Picking for Beginners".']],
    done: ['修了証をもらった。ギルドの掲示板に名前が貼り出された。', 'Received a certificate. {His} name went up on the guild board.'] }),
];
