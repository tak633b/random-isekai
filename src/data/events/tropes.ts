// 異世界ものの定番ネタ (見本)。目録は docs ではなく作業メモ (isekai-tropes.md) の 1〜3節。
// 書き方: 短い平叙文で、オチは最後の一文で静かに落とす。選択肢はどちらを選んでも少し笑える結果に。
// 条件の例: pastCause (前世の死に方)、cheats (特典)、tags (世界)、flag (しるし)。id は tp.<分類>.<名>
// 書き足すときは分類ごとに別のファイル (tropes-entry.ts / tropes-system.ts / tropes-story.ts / tropes-jobs.ts) にして、id の頭を分ける
import type { EventDef } from '../../engine/types';

const GROWN: EventDef['stage'] = ['teen', 'adult', 'middle'];
const FANTASY: EventDef['tags'] = ['fantasy', 'japan', 'cultivation', 'eastern'];

export const EVENTS: EventDef[] = [
  // ---- 入口の型 ----------------------------------------------------------------
  {
    id: 'tp.entry.truck-wagon', stage: ['child', 'teen', 'adult'], pastCause: ['truck'], memory: true, w: 2, kind: 'hard',
    ja: '荷馬車の車輪の音が近づくたびに、{name}は振り返ってしまう。前世の最後の音に、少し似ているからだ。',
    en: 'Every time a wagon rattled close, {name} turned to look. It sounded a little too much like the last sound of the past life.',
    choice: { ja: '馬車の前に子どもが飛び出した。', en: 'A child darted in front of a wagon.', options: [
      { ja: '飛び込んで助ける', en: 'Dive in and save them', eff: { fame: 4, hp: -2 }, risk: { hazard: 'accident', p: 0.01 }, log: { ja: '子どもは無事で、{name}は転んだだけで済んだ。御者に「前にもこういうことが?」と聞かれた。', en: 'The child was fine. {name} only scraped a knee. The driver asked, "Has this happened to you before?"' } },
      { ja: '大声で止める', en: 'Shout a warning', eff: { charm: 2 }, log: { ja: '馬車は止まった。今度は、誰もはねられなかった。', en: 'The wagon stopped. This time, nobody got hit.' } },
    ] },
  },
  {
    id: 'tp.entry.overwork-dawn', stage: ['child', 'teen', 'adult'], pastCause: ['overwork'], memory: true, w: 2, kind: 'hard',
    ja: '毎朝、夜明け前に目が覚める。出勤しなくていいと体が分かるまで、三年かかった。',
    en: 'Every morning {name} woke before dawn. It took {his} body three years to accept that there was no office to go to.',
    eff: { happy: 2, hp: 1 },
  },
  {
    id: 'tp.entry.overwork-steward', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, w: 2, kind: 'work',
    ja: '領主に、代官の仕事を手伝ってほしいと頼まれた。',
    en: "The lord asked {name} to help with the steward's paperwork.",
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '引き受ける', en: 'Accept', eff: { wealth: 6, happy: -3, fame: 2 }, log: { ja: '気づけば、前世と同じ時刻まで書類を見ていた。ろうそくの減りが早い。', en: 'Before long {he} was reading ledgers until the same hour as in the past life. The candles burned down fast.' } },
      { ja: '「スローライフを送りたいので」と断る', en: '"I\'m going for a slow life," and decline', eff: { happy: 4 }, log: { ja: '翌日、隣の領地から同じ頼みが来た。', en: 'The next day, the neighboring domain asked the same thing.' } },
    ] },
  },
  {
    id: 'tp.entry.goddess-oops', stage: ['adult', 'middle', 'elder'], arrival: ['reborn'], cheat: true, w: 1, kind: 'power',
    ja: '夢に、転生のときの女神が出てきた。「あのときの件、上に報告しました」とだけ言って、頭を下げて消えた。',
    en: 'The goddess from the rebirth appeared in a dream. "About that incident back then. I\'ve reported it upstairs," she said, bowed, and vanished.',
    eff: { luck: 2 },
  },
  {
    id: 'tp.entry.baby-greeting', stage: ['infant'], arrival: ['reborn'], memory: true, w: 1.5, kind: 'child',
    ja: '一歳の{name}が初めて口にした言葉は「お疲れさまです」だった。母はその意味を知らない。',
    en: '{name}\'s first word, at one year old, was "Thanks for your hard work." {His} mother had no idea what it meant.',
    eff: { charm: 1 },
  },

  // ---- 仕組みの型 ----------------------------------------------------------------
  {
    id: 'tp.sys.status-nickname', stage: GROWN, memory: true, not: ['gamey'], w: 1, kind: 'hard',
    ja: '人前でうっかり「ステータスオープン」と言ってしまい、それから一年「開け」という渾名がついた。',
    en: 'Accidentally said "Status open" in public, and was nicknamed "Open Sesame" for a year.',
    eff: { charm: -1, happy: -1 },
  },
  {
    id: 'tp.sys.appraise-suitor', stage: ['teen', 'adult'], cheats: ['appraisal'], w: 2, kind: 'love',
    ja: '求婚してきた相手を、つい〈{cheat}〉で見てしまった。称号の欄に「借金 三件」とあった。',
    en: 'When someone proposed, {name} could not help checking them with "{cheat}". Under titles it said: "Debts: three."',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '借金ごと受け入れる', en: 'Accept, debts and all', eff: { wealth: -6, happy: 4 }, log: { ja: '三件のうち二件は、すでに返し終わっていた。相手は正直者だった。', en: 'Two of the three debts were already paid off. The suitor was honest, at least.' } },
      { ja: '丁寧に断る', en: 'Politely decline', eff: { luck: 2 }, log: { ja: '断った理由は、最後まで言わなかった。', en: '{He} never explained why.' } },
    ] },
  },
  {
    id: 'tp.sys.itembox-bread', stage: GROWN, cheats: ['item_box'], w: 2, kind: 'work',
    ja: '十年前にしまった焼きたてのパンを、ふと取り出した。まだ温かかった。',
    en: '{name} took out a loaf of bread stored ten years ago. It was still warm.',
    eff: { happy: 2 },
  },
  {
    id: 'tp.sys.itembox-mover', stage: ['adult', 'middle'], cheats: ['item_box'], w: 2, kind: 'work',
    ja: '引っ越しの手伝いを頼まれ続け、気づくと運送業を営んでいた。',
    en: 'People kept asking for help moving house. Before {he} knew it, {name} was running a delivery business.',
    eff: { wealth: 8, fame: 2 },
  },
  {
    id: 'tp.sys.skill-dishes', stage: ['adult', 'middle', 'elder'], tags: ['gamey'], w: 1.5, kind: 'work',
    ja: '毎朝皿を洗っていたら、十年目のある朝、天の声が〈食器洗い Lv.10〉を告げた。',
    en: 'After ten years of washing the dishes every morning, a heavenly voice announced: "Dishwashing Lv. 10."',
    eff: { happy: 3 },
  },

  // ---- 展開の型 ----------------------------------------------------------------
  {
    id: 'tp.story.did-i-do', stage: GROWN, cheat: true, magic: 1, w: 2, kind: 'power',
    ja: '初級の魔法を撃ったつもりが、山の形が少し変わった。周りの全員がこちらを見ている。',
    en: '{name} cast what was supposed to be a beginner spell, and the mountain changed shape a little. Everyone was staring.',
    choice: { ja: 'どうする?', en: 'What now?', options: [
      { ja: '「あれ、また何かやっちゃいました?」', en: '"Huh. Did I do something again?"', eff: { fame: 6, charm: -2 }, set: 'outed', log: { ja: '噂は三日で国じゅうに広まった。妬む人も、同じくらい増えた。', en: 'The rumor reached every corner of the kingdom in three days. So did the envy.' } },
      { ja: '黙ってその場を離れる', en: 'Say nothing and walk away', eff: { luck: 2 }, log: { ja: '山の形は、その後「ずっとそうだった」ことになった。', en: 'The mountain, it was later agreed, had always looked like that.' } },
    ] },
  },
  {
    id: 'tp.story.mayo-four', stage: GROWN, memory: true, tech: [0, 5], w: 1.5, kind: 'work',
    ja: 'マヨネーズを作って売り出した。その年のうちに、この国で四人目の「マヨネーズの発明者」になった。',
    en: '{name} made mayonnaise and started selling it. Within the year, {he} became the fourth "inventor of mayonnaise" in the kingdom.',
    eff: { wealth: 3, happy: 1 },
  },
  {
    id: 'tp.story.guild-bill', stage: ['teen', 'adult'], cheat: true, tags: FANTASY, flag: 'guild', w: 1.5, kind: 'adventure',
    ja: '登録の日、測定の水晶が割れた。翌月、ギルドから修理代の請求書が届いた。',
    en: 'The measuring crystal shattered on registration day. The next month, the guild sent a repair bill.',
    eff: { fame: 3, wealth: -4 },
  },
  {
    id: 'tp.story.demon-paperwork', stage: ['adult', 'middle'], tags: FANTASY, magic: 2, w: 0.6, kind: 'adventure',
    ja: '魔王城に乗り込むと、魔王は会議の資料を自分で作っていた。{name}は、気づけば誤字を直すのを手伝っていた。',
    en: 'Storming the Demon Lord\'s castle, {name} found the Demon Lord making slides for a meeting. Somehow {he} ended up helping fix the typos.',
    eff: { mind: 2, happy: 2 },
  },
  {
    id: 'tp.story.workstyle', stage: ['adult', 'middle'], pastCause: ['overwork'], memory: true, flag: 'guild', w: 1.5, kind: 'work',
    ja: 'ギルドに週休二日を提案した。受付の人から花束をもらった。',
    en: '{name} proposed a five-day work week to the guild. The receptionists gave {him} flowers.',
    eff: { charm: 4, fame: 2 },
  },
  {
    id: 'tp.story.dense', stage: ['teen', 'adult'], w: 0.6, kind: 'love',
    ja: '三人に告白されていたと気づいたのは、三人とも別の人と結婚した後だった。',
    en: '{name} realized that three people had confessed their feelings only after all three had married other people.',
    eff: { happy: -2, mind: 1 },
  },
];
