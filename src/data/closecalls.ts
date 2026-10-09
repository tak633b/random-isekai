// 九死に一生 (engine/closecall.ts)。その年の死の引きが、死ぬ線のすぐ上に落ちた年の一文。
// 分類はその年いちばん危なかった死因。{name} などは出来事と同じ。世界に合わない言葉 (魔法・女神) は magic の条件つきの組へ
import type { Hazard } from '../engine/types';

type Line = [string, string];

// どの世界でも使える一文
export const CLOSE: Partial<Record<Hazard, Line[]>> = {
  infant: [['高い熱が三日続いた。母は一晩じゅう手を握っていた。四日目の朝、{name}は泣いて乳をねだった。', 'A high fever lasted three days. Mother held {his} hand through every night. On the fourth morning, {name} cried for milk.']],
  disease: [['熱で意識が遠のいた。遠くで誰かが名前を呼び続けていた。その声のほうへ、{name}は戻ってきた。', 'The fever pulled {name} under. Far away, someone kept calling {his} name. {He} followed the voice back.'],
    ['医者は家族を呼べと言った。その夜、熱がふっと下がった。医者は首をひねりながら帰っていった。', 'The doctor said to call the family. That night the fever broke. The doctor left, shaking {his} head in disbelief.']],
  plague: [['疫病の小屋で、隣の寝台が次々と空いていった。{name}の寝台だけが、最後まで空かなかった。', 'In the plague house, the beds around {name} emptied one by one. Only {his} stayed occupied to the end.']],
  monster: [['{beast}の牙が喉もとに届く寸前、足もとの地面が崩れて、{name}は谷へ転げ落ちた。助かったのは、その崖のおかげだった。', 'An inch before the {beast}\'s fangs reached {his} throat, the ground gave way and {name} tumbled into the ravine. The cliff saved {his} life.'],
    ['気がつくと、{beast}は倒れ、{name}も倒れていた。立ち上がれたのは、{name}の方だった。', 'When {name} came to, the {beast} was down, and so was {name}. Only one of them got back up.']],
  violence: [['背中を刺された。刃は、あとほんの指一本ぶん、心臓に届かなかった。', 'A blade went into {his} back. It stopped one finger\'s width short of the heart.'],
    ['暗い路地で囲まれた。叫び声を聞いた夜回りが、角を曲がってきた。あと一息遅ければ、と後で言われた。', 'Cornered in a dark alley. The night watch heard the shout and came around the corner. "Another breath later," they said afterward.']],
  war: [['矢が兜をかすめ、耳の先を持っていった。{name}は泥の中で、空を見上げて笑った。', 'An arrow grazed the helmet and took the tip of an ear. Lying in the mud, {name} looked up at the sky and laughed.'],
    ['倒れた{name}の上を、騎馬の列が走り抜けた。踏まれなかったのは、隣に倒れた馬の影にいたからだった。', 'A column of cavalry thundered over {name} where {he} lay. A fallen horse beside {him} was the only reason {he} wasn\'t trampled.']],
  accident: [['足場が崩れた。落ちる途中で、{name}の手が一本の縄をつかんだ。', 'The scaffolding gave way. Halfway down, {name}\'s hand caught a single rope.'],
    ['川に流された。下流の村の子どもが、竿を差し出してくれた。', 'Swept away by the river. A child in the village downstream held out a pole.']],
  childbirth: [['お産は二日かかった。産婆が「戻っておいで」と何度も呼んだ。{name}は戻ってきた。', 'The labor lasted two days. The midwife kept calling, "Come back." {name} came back.']],
  famine: [['飢えて道端に倒れた。通りがかった巡礼が、最後の干し肉を口に押し込んでくれた。', 'Collapsed by the road from hunger. A passing pilgrim pressed their last strip of dried meat into {his} mouth.']],
  execution: [['刑場に引き出された朝、恩赦の早馬が門を叩いた。', 'The morning {name} was led to the scaffold, a rider with a pardon came pounding at the gate.']],
  magic: [['暴れた魔力が体の内側を焼いた。三日目、ようやく静まった。指先にだけ、焦げた跡が残った。', 'Runaway mana burned {him} from the inside. On the third day it finally calmed. Only the fingertips stayed scorched.']],
  age: [['ある朝、胸が締めつけられて倒れた。目を開けると、家の者たちが泣きながら笑っていた。', 'One morning {his} chest seized and {he} fell. When {he} opened {his} eyes, the household was crying and laughing at once.']],
};

// 魔法のある世界だけ: 走馬灯・女神の声・仲間の回復魔法
export const CLOSE_MAGIC: Line[] = [
  ['走馬灯が回り始めたところで、どこかで聞いた声がした。「まだ早いです」。目を開けると、空が見えた。', 'The life-flashing-before-your-eyes had just begun when a familiar voice said, "It\'s too soon." {name} opened {his} eyes to the sky.'],
  ['仲間の回復魔法の光が、ぎりぎりで間に合った。「戻ってこい」と、震える声が聞こえた。', 'A companion\'s healing light arrived at the very last moment. "Come back," said a shaking voice.'],
];
