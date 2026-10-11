// ひと息の問い (engine/reflect.ts)。人間換算の節目の年に1つ、この主人公の一生を、遊んでいる人の一生につなぐ問い。
// 置き換え: {name} 主人公の名 / {town} 町の名 / {spouse} 連れ合いの名。when に合う問いから seed で1つ選ぶ。
// 英語の側では主人公を代名詞で呼ばない (性別で文が割れないように、名で呼ぶか言い換える)
import type { Hero } from '../engine/types';

export interface ReflectQ {
  at: number;                  // 人間換算の節目 (5 / 15 / 30 / 50 / 70)
  when?: (h: Hero) => boolean; // この主人公に合うときだけ
  ja: string;
  en: string;
}

const alive = (h: Hero, role: string) => h.people.some((t) => t.role === role && t.alive && t.until === undefined);
const lost = (h: Hero) => h.people.some((t) => !t.alive);

export const REFLECT: ReflectQ[] = [
  // ---- 5 ----
  { at: 5, ja: '{name}は5歳。{town}の市場を初めて見て、目を丸くした年だ。あなたが5歳のころ、世界でいちばん大きく見えたものは？', en: "{name} is five, wide-eyed at the market in {town} for the first time. When you were five, what was the biggest thing in the world?" },
  { at: 5, ja: '{name}が最初に覚えたのは、この世界の言葉だった。あなたが今も覚えている、いちばん古い記憶は？', en: "The first words {name} learned were this world's words. What is the oldest memory you still have?" },
  { at: 5, ja: '5歳の{name}は、棒きれを剣にして見えない魔物と戦っている。あなたは5歳のころ、何になりたかった？', en: 'At five, {name} fights invisible monsters with a stick for a sword. What did you want to be when you were five?' },
  { at: 5, when: (h) => h.memoryAwake, ja: '{name}は5歳にして、前世の記憶を抱えている。あなたが小さいころ、大人に言えなかった秘密はあった？', en: '{name} is five and already carrying a whole past life. When you were small, was there a secret you could not tell the grown-ups?' },
  { at: 5, when: (h) => !alive(h, 'mother') && !alive(h, 'father'), ja: '{name}には、寝る前に名前を呼んでくれる親がいない。あなたが小さいころ、名前を呼んでくれたのは誰だった？', en: 'No parent calls out to {name} at bedtime. When you were small, who called your name?' },
  // ---- 15 ----
  { at: 15, ja: '{name}は15歳。この世界ではもう一人前に数えられる。あなたは15のころ、自分を大人だと思っていた？', en: "{name} is fifteen, nearly grown by this world's count. At fifteen, did you think of yourself as an adult?" },
  { at: 15, ja: '{name}の15歳の夏が過ぎていく。あなたの15の夏で、今も覚えている一日は？', en: "{name}'s fifteenth summer is slipping by. Is there one day from your own fifteenth summer that you still remember?" },
  { at: 15, ja: '15歳の{name}は、まわりと自分を比べてばかりいる。あなたは15のころ、誰と自分を比べていた？', en: 'At fifteen, {name} keeps measuring up against everyone nearby. Who did you measure yourself against at fifteen?' },
  { at: 15, when: (h) => h.flags.academy !== undefined, ja: '{name}は学び舎で、まだ名前も知らない誰かと机を並べている。15のころ、あなたの隣の席には誰がいた？', en: '{name} shares a desk at school with someone whose name is still new. At fifteen, who sat next to you?' },
  { at: 15, when: (h) => h.job !== null || h.flags.guild !== undefined || (!alive(h, 'mother') && !alive(h, 'father')), ja: '{name}は15で家を出た。あなたは15のとき、何を置いてきた？', en: '{name} left home at fifteen. What did you leave behind at fifteen?' },
  // ---- 30 ----
  { at: 30, ja: '30歳の{name}は、思い描いていたのとずいぶん違う道を歩いている。あなたの今は、15のころに想像した姿と似ている？', en: 'At thirty, {name} is walking a road nothing like the one first imagined. Does your life look like what you pictured at fifteen?' },
  { at: 30, when: (h) => h.world.magic >= 1, ja: '{name}は30になっても、まだ魔王を倒していない。あなたが「いつか」と言ったまま置いてあることは？', en: "{name} is thirty and still has not slain a single Demon Lord. What have you left sitting under 'someday'?" },
  { at: 30, ja: '30歳。{name}の剣は、少しだけ重くなった。あなたが最近、手放したものは何？', en: "Thirty. {name}'s sword feels a little heavier now. What have you put down lately?" },
  { at: 30, when: (h) => alive(h, 'spouse'), ja: '30歳の{name}の隣には、{spouse}がいる。あなたが30のとき (これから30になるなら、そのとき)、隣にいてほしい人は？', en: '{name} is thirty, with {spouse} close by. At thirty, or when you get there, who do you want beside you?' },
  { at: 30, when: (h) => alive(h, 'child'), ja: '{name}は、子の寝顔を見守る側になった。あなたを見守ってくれた人に、最後に礼を言ったのはいつ？', en: 'Now {name} is the one watching over a sleeping child. When did you last thank the people who watched over you?' },
  // ---- 50 ----
  { at: 50, ja: '{name}は50歳。若い冒険者に道を聞かれるようになった。若い誰かに一つだけ伝えるなら、あなたは何を選ぶ？', en: '{name} is fifty, and young adventurers stop to ask for directions now. If you could pass one thing on to someone younger, what would it be?' },
  { at: 50, ja: '50歳の{name}は、今さら新しい魔法を覚えようとしている。あなたが今からでも始めたいことは？', en: 'At fifty, {name} has decided to learn a new spell, of all things. What would you still like to start?' },
  { at: 50, ja: '{name}の髪に白いものが混じりはじめた。あなたが年を重ねて、かえって良くなったと思うことは？', en: "There is gray in {name}'s hair now. What has gotten better for you with the years?" },
  { at: 50, when: lost, ja: '{name}は50までに、何人もの人を見送った。あなたがもう一度だけ会えるなら、誰に会いたい？', en: 'By fifty, {name} has said goodbye to many people. If you could see one person again, just once, who would it be?' },
  // ---- 70 ----
  { at: 70, ja: '{name}は70歳。剣はもう重いが、話せる昔話はいくらでもある。あなたが誰かに話したい昔話は？', en: '{name} is seventy. The sword is too heavy now, but the stories never run out. Which story of yours would you tell someone?' },
  { at: 70, ja: '70歳の{name}は、縁側で{town}の夕焼けを見ている。あなたが最後に、夕日が沈みきるまで見ていたのはいつ？', en: 'At seventy, {name} watches the sunset over {town}. When did you last watch the sun go all the way down?' },
  { at: 70, ja: '{name}は、70年ぶんの持ち物を少しずつ人に分けている。あなたが最後まで手放したくないものは？', en: '{name} has been giving away seventy years of belongings, bit by bit. What would you hold on to until the very end?' },
  { at: 70, when: (h) => h.arrival !== 'native', ja: '{name}は、この世界に来てよかったと思っている。あなたにも、ここに生まれてよかったと思える日はある？', en: '{name} is glad to have come to this world. Are there days when you are glad you were born into yours?' },
];
