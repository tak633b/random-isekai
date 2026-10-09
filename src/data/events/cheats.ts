// 転生特典の迷いどころ。特典ごとの一文は src/data/cheatuse.ts、スキル強奪で技を奪う仕組みは engine/cheatuse.ts
import type { EventDef } from '../../engine/types';

const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];

export const EVENTS: EventDef[] = [
  {
    id: 'ch.steal-person', stage: GROWN, cheats: ['skill_steal'], w: 1.5, kind: 'hard',
    ja: '町の老いた剣術師範が、見事な型を見せていた。〈{cheat}〉を使えば、あの技は今夜にも自分のものになる。',
    en: 'An old fencing master in town was showing a beautiful form. With "{cheat}," that technique could be {name}\'s by tonight.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '奪う', en: 'Take it', eff: { power: 3, happy: -5 }, set: 'stoleFromPerson', log: { ja: '翌日、師範は木剣を握ったまま首をかしげていた。{name}は目を合わせられなかった。', en: 'The next day, the master stood holding a wooden sword, puzzled. {name} could not meet their eyes.' } },
      { ja: '弟子入りして、時間をかけて学ぶ', en: 'Apprentice and learn it the long way', eff: { power: 1, charm: 3, happy: 2 }, log: { ja: '三年かかった。師範は最後の日、「よく我慢した」とだけ言った。', en: 'It took three years. On the last day, the master only said, "You were patient."' } },
    ] },
  },
  {
    id: 'ch.steal-backfire', stage: GROWN, cheats: ['skill_steal'], flag: 'stoleFromPerson', w: 2, kind: 'hard', big: true,
    ja: '奪った技が、ある朝、暴れた。体が勝手に、元の持ち主の癖で動く。{name}は一日じゅう、知らない人の歩き方で歩いた。',
    en: 'One morning, a stolen skill rebelled. {name}\'s body moved with its original owner\'s habits, and {he} walked all day in a stranger\'s gait.',
    eff: { happy: -4, mind: 1 },
  },
  {
    id: 'ch.steal-demon', stage: ['adult', 'middle'], cheats: ['skill_steal'], magic: 2, tags: ['fantasy'], w: 0.8, kind: 'battle', big: true,
    ja: '魔族の将の技を奪おうとして、逆に魔力の奔流に呑まれかけた。〈{cheat}〉には、奪えないものもある。',
    en: 'Trying to steal a demon general\'s power, {name} was nearly swept away by its torrent of mana. Some things "{cheat}" cannot take.',
    risk: { hazard: 'magic', p: 0.03 }, eff: { mind: 2 },
  },
  {
    id: 'ch.gacha-pull', stage: GROWN, cheats: ['gacha'], w: 2, repeat: true, kind: 'power',
    ja: '〈{cheat}〉の回数が一回ぶん貯まった。',
    en: 'One more pull of "{cheat}" was ready.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '今すぐ回す', en: 'Pull now', eff: { luck: 1, wealth: 2 }, log: { ja: '虹色の光。中身は……やや良い盾だった。', en: 'Rainbow light. Inside: a moderately good shield.' } },
      { ja: '貯めて十連にする', en: 'Save up for a ten-pull', eff: { happy: 1 }, log: { ja: '十連の日を楽しみに、一年をがんばった。', en: 'Worked hard all year, looking forward to the ten-pull.' } },
    ] },
  },
];
