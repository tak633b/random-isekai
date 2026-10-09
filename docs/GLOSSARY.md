# English glossary

One idea, one English term. The English side of every `L(ja, en)` / `{ ja, en }` pair follows this list.
The tone follows the usual conventions of English light-novel and web-novel translations of isekai stories:
plain past-tense narration, short sentences, game terms capitalized the way a Status screen would show them.

`src/english-scan.test.ts` checks the English output for leftover Japanese and for the grammar slips listed at the end.

## Arrival and the other world

| Japanese | English | Notes |
|---|---|---|
| 異世界 | another world | "from another world", "the old world" for the world left behind |
| 転生 (赤ちゃんから) | reborn, reincarnated | Arrival label: "Reborn as a baby" |
| 途中で思い出す | awakened | Arrival label: "Awakened later". "the past life came back" in prose |
| 召喚 | summoned | "was summoned to …", "the summoned" |
| 現地の生まれ | native-born | |
| 転生者 (ほかの転生者・召喚者・目覚めた者) | reincarnator | List tab: "Reincarnators". Never "reincarnated soul" |
| 前世 | past life | "In a past life, a 22-year-old programmer who was hit by a truck." |
| 女神 | the goddess | the goddess's own name comes from `worldNames().god` |
| 女神の加護 | the goddess's blessing | |

## Powers

| Japanese | English | Notes |
|---|---|---|
| 転生特典 / 特典 / チート | cheat skill (cheat) | UI label "Cheat skill". Names are quoted in prose: wielded "Appraisal" |
| スキル | Skill | trait kind |
| 能力 | Ability | trait kind |
| 加護 | Blessing | trait kind |
| 体質 | Constitution | trait kind |
| 弱点 | Weakness | trait kind |
| 鑑定 | Appraisal | |
| ステータス | Status screen | |
| レベル | level ("reached level 12") | Label "Level" |
| 魔力 | mana (in the body), magic (as a craft) | |
| 魔石 | mana stone | |
| 外れスキル | dud skill | the cheat itself is "Dud Skill" |

## People and roles

| Japanese | English | Notes |
|---|---|---|
| 人の輪 | the people around you; panel "People" | "circle" only for the circle of people in prose |
| 仲間 | companion | "party" for the group on a quest |
| 従魔 | familiar | |
| 師 | mentor | |
| 弟子 | disciple | |
| 好敵手 | rival | |
| 宿敵 | nemesis | |
| 連れ合い | spouse | |
| 恋人 / 婚約者 | lover / fiancé(e) | |
| きょうだい | sibling; brother / sister when the sex is known | |
| 主人 / 従者 | master / servant | |

## Titles and the world

| Japanese | English | Notes |
|---|---|---|
| 勇者 | Hero | capitalized as a title: "was chosen as the Hero" |
| 聖女 / 聖者 | Saintess / Saint | by sex. The job label is "Saint" |
| 魔王 | Demon Lord | never "Demon King" |
| 鬼の王 | King of the Oni | the Demon Lord of the Japanese-style world |
| 魔尊 | Demon Sovereign | the Demon Lord of the cultivation world |
| 冒険者ギルド | Adventurers' Guild | each guild has a name: "the Silver Hawk Guild" |
| ランク | Rank | "Rank F", "promoted to Rank C". Grade (wa / zh / ruin), Tier (sci-fi), "C-Rank Explorer" (modern) |
| 年代記 | chronicle | tab "Chronicle" |
| 第N代 / 代 | Generation N / generation | "Generation 3" on the death record and in the memorial |
| 系譜 | lineage | the chain Generation 1 → Generation 2 → … |
| 継ぐ人 (この人で続ける) | heir; button "Continue as them" | the person you go on as after a death |
| 宗門 | sect | cultivation world |
| 魔物 | monster | a world's own beasts come from `beastName()` |
| 妖 | yokai | Japanese-style world |

## Names

Every name on the English screen is in Latin letters.

- Japanese-style names (the Japanese-style world, the modern world, and summoned people from Earth) are romanized in Hepburn with macrons: Matsuda Renma, Ōno Yūto, Tarō. Family name first.
- Chinese-style names (the cultivation world) are in pinyin without tone marks: Li Yunfeng. Family name first.
- Other worlds put the given name first: Elruric Helheart.

## Grammar the scanner checks

- No CJK characters, including full-width punctuation 「」〈〉。、・.
- a / an match the next word (`an()` in `src/i18n.ts` fixes inserted words).
- Singular and plural agree with numbers: 1 year / 2 years, 1 child / 2 children.
- People whose sex is known are "she" or "he". "they" only for someone whose sex is unknown, or for a group.
  Event text uses `{he} {him} {his} {himself} {He} {His}` for the main character, filled from their sex.
- Sentences start with a capital letter. A name ending in s takes 's (Marcus's).
- The life log is in the past tense.
- No double spaces, no "..", no space before a comma or period, no doubled words ("giant giant spider").
- Groups of monsters use the plural: `{beasts}` gives "a horde of giant spiders".
