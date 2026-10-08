// 剣と魔法の世界の 大人・中年・老年の出来事。
// 根拠は docs/research/07-life-events-and-deaths.md 2.4–2.7、05 (職業・ギルド)、06 (魔王・勇者・聖女・貴族・ダンジョン)。
// このファイルだけで連ねるしるし: rankC rankB rankA epithet dragonSlayer dragonPact betrayed royalGuard courtMage
// forbidden heretic generalSlain demonPeace guildmaster commander teacher count company lich legend maimed captured
// hunted defector branded poisoner zamaa party2 strayDisciple remarried conscripted grandparent memoir statue
// graveChosen grimoire lastAdventure
import type { EventDef } from '../../engine/types';

const F: EventDef['tags'] = ['fantasy'];
// sea・desert などは剣と魔法以外の世界も持つので、近未来・現代・文明の後・産業では起こさない
const NF: EventDef['not'] = ['scifi', 'modern', 'ruin', 'industrial'];
// 獣人の世界は WorldTag を持たないので、種族で絞る
const BEASTFOLK: EventDef['races'] = ['beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf'];
const FIGHTERS: EventDef['jobs'] = ['adventurer', 'knight', 'soldier', 'mercenary', 'hero', 'hunter'];

export const EVENTS: EventDef[] = [
  // ======================================================================
  // 大人 (adult)
  // ======================================================================

  // ---- 冒険者ギルド ------------------------------------------------------
  {
    id: 'fa.party-formed', stage: ['adult'], tags: F, jobs: ['adventurer'], noFlag: 'party', w: 2, kind: 'adventure',
    ja: '{name}は酒場で声をかけてきた{companion}と組み、二人だけのパーティを作った。名前はまだ決まっていない。',
    en: '{name} teamed up with {companion}, who had struck up a conversation at the tavern. The two-person party still had no name.',
    eff: { happy: 4, charm: 2 }, set: 'party', tie: { role: 'companion', new: true, d: 15 },
  },
  {
    id: 'fa.herb-request', stage: ['adult'], tags: F, jobs: ['adventurer'], w: 2, repeat: true, kind: 'work',
    ja: '薬草採取の依頼で一日森を歩き、{name}は籠を半分だけ埋めて帰った。報酬は宿代に消えた。',
    en: '{name} spent a whole day in the forest on an herb-gathering job and came back with the basket half full. The pay went to the inn.',
    eff: { wealth: 1, mind: 1 },
  },
  {
    id: 'fa.goblin-nest', stage: ['adult'], tags: F, jobs: ['adventurer'], w: 1, kind: 'adventure',
    ja: 'ゴブリンの巣を潰す依頼だった。中にいた数は報告の三倍で、{name}は松明を振り回しながら出口まで下がった。',
    en: 'The job was to clear a goblin nest. There were three times as many as reported, and {name} backed out to the entrance swinging a torch.',
    eff: { level: 1, hp: -3, power: 2 }, risk: { hazard: 'monster', p: 0.02 },
    why: { ja: '駆け出しが死ぬいちばん多い型は、弱い相手の数を見誤ること', en: 'Most beginners die by underestimating the numbers of a weak enemy' },
  },
  {
    id: 'fa.rank-c', stage: ['adult'], tags: F, jobs: ['adventurer'], flag: 'guild', noFlag: 'rankC', w: 1, kind: 'fame',
    ja: '{name}のギルド証が銀色のものに替わった。受付の人の口調が少しだけ丁寧になった。',
    en: "{name}'s guild card was replaced with a silver one. The receptionist's tone became a little more polite.",
    eff: { fame: 3, wealth: 3, level: 1 }, set: 'rankC',
    why: { ja: 'Cランクは一人前の壁。多くの冒険者はここで一生を終える', en: 'C rank is the wall of competence. Most adventurers end their careers here' },
  },
  {
    id: 'fa.rank-b-exam', stage: ['adult', 'middle'], tags: F, jobs: ['adventurer'], flag: 'rankC', noFlag: 'rankB', w: 0.5, kind: 'adventure',
    ja: 'Bランクの昇格試験の実技は、街道を荒らす本物の盗賊団の討伐だと告げられた。',
    en: "{name} was told the practical part of the B-rank exam would be taking down a real gang of highway bandits.",
    choice: {
      ja: '試験を受けるか', en: 'Take the exam?',
      options: [
        { ja: '受ける', en: 'Take it', eff: { fame: 6, level: 2, wealth: 3 }, set: 'rankB', risk: { hazard: 'violence', p: 0.04 },
          log: { ja: '{name}は盗賊の頭目を縛り上げて戻り、金色のギルド証を受け取った。', en: '{name} returned with the bandit leader tied up and received a gold guild card.' } },
        { ja: '来年に回す', en: 'Wait a year', eff: { happy: -1 },
          log: { ja: '{name}は受付に断りを入れ、いつもの討伐依頼の紙を剥がした。', en: '{name} told the desk no, and pulled down the usual hunting notice instead.' } },
      ],
    },
  },
  {
    id: 'fa.rank-a', stage: ['adult', 'middle'], tags: F, jobs: ['adventurer'], flag: 'rankB', noFlag: 'rankA', w: 0.15, kind: 'fame', big: true,
    ja: '{name}はAランクに上がった。それからは、王都から封蝋つきの指名依頼が届くようになった。',
    en: '{name} reached A rank. After that, named requests began arriving from the capital under wax seals.',
    eff: { fame: 8, wealth: 6, level: 3 }, set: 'rankA',
    why: { ja: 'Aランクは国の切り札で、地方に数人しかいない', en: "A rank is a nation's trump card; only a handful exist in any region" },
  },
  {
    id: 'fa.epithet', stage: ['adult'], tags: F, jobs: ['adventurer', 'mercenary'], flag: 'rankC', noFlag: 'epithet', w: 0.7, kind: 'fame',
    ja: '酒場で、{name}に二つ名がついていると聞かされた。本人はあまり気に入っていない。',
    en: 'At the tavern, {name} learned they had been given an epithet. They did not much care for it.',
    eff: { fame: 5 }, set: 'epithet',
  },
  {
    id: 'fa.escort', stage: ['adult'], tags: F, jobs: ['adventurer', 'mercenary'], w: 1.2, repeat: true, kind: 'work',
    ja: '隊商の護衛で{name}は峠道の手前に来た。峠を越えれば二日早いが、盗賊が出るという噂がある。',
    en: "Escorting a caravan, {name} reached the foot of a mountain pass. Crossing it would save two days, but there were rumors of bandits.",
    choice: {
      ja: 'どちらを通るか', en: 'Which way?',
      options: [
        { ja: '峠を越える', en: 'Take the pass', eff: { wealth: 5 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '峠では矢が二本飛んできただけで済み、隊商主は上乗せの銀貨をくれた。', en: 'Only two arrows came at them in the pass, and the caravan master paid a silver bonus.' } },
        { ja: '遠回りする', en: 'Go around', eff: { wealth: 2, hp: -1 },
          log: { ja: '遠回りの道は泥だらけで、{name}の靴は一足だめになった。', en: 'The long road was all mud, and {name} ruined a pair of boots.' } },
      ],
    },
  },
  {
    id: 'fa.bandit-ambush', stage: ['adult'], tags: F, jobs: ['adventurer'], w: 0.6, kind: 'battle',
    ja: '依頼帰りの街道で、{name}は冒険者狩りに待ち伏せされた。報酬の袋を投げて、その隙に走った。',
    en: 'On the road back from a job, {name} was ambushed by adventurer hunters, threw the reward pouch at them, and ran.',
    eff: { wealth: -4, hp: -2 }, risk: { hazard: 'violence', p: 0.03 },
  },
  {
    id: 'fa.emergency-call', stage: ['adult', 'middle'], tags: F, jobs: ['adventurer'], w: 0.6, repeat: true, kind: 'battle',
    ja: '{guild}から緊急招集の鐘が鳴った。森の奥で魔物の群れが膨らんでいるという。',
    en: 'The emergency bell rang at {guild}. A swarm of monsters was swelling deep in the forest.',
    choice: {
      ja: '招集に応じるか', en: 'Answer the call?',
      options: [
        { ja: '応じる', en: 'Answer', eff: { fame: 4, charm: 2, level: 1 }, risk: { hazard: 'monster', p: 0.04 },
          log: { ja: '{name}は二晩、森の際の柵を守った。', en: '{name} held the fence at the forest edge for two nights.' } },
        { ja: '町を離れる', en: 'Leave town', eff: { charm: -3, fame: -2 },
          log: { ja: '{name}は夜のうちに隣町へ移った。戻った時、ギルドの掲示板に自分の名前が書かれていた。', en: '{name} slipped off to the next town overnight. On returning, their name was posted on the guild board.' } },
      ],
    },
  },
  {
    id: 'fa.boss-floor', stage: ['adult'], tags: F, jobs: ['adventurer', 'hero'], w: 0.8, kind: 'adventure',
    ja: '迷宮の十階、階層主の扉の前で、{name}の手持ちのポーションは残り二本だった。',
    en: "On the tenth floor of the labyrinth, before the floor guardian's door, {name} had two potions left.",
    choice: {
      ja: '扉を開けるか', en: 'Open the door?',
      options: [
        { ja: '挑む', en: 'Challenge it', eff: { level: 3, fame: 5, wealth: 5 }, risk: { hazard: 'monster', p: 0.06 },
          log: { ja: '階層主の魔石は両手でやっと持てる大きさだった。', en: "The guardian's mana stone took both hands to carry." } },
        { ja: '引き返す', en: 'Turn back', eff: { mind: 1 },
          log: { ja: '{name}は印をつけて引き返した。扉は来年もそこにある。', en: '{name} marked the spot and turned back. The door would still be there next year.' } },
      ],
    },
  },
  {
    id: 'fa.dungeon-lost', stage: ['adult'], tags: F, jobs: ['adventurer', 'thief'], w: 0.6, kind: 'hard',
    ja: '転移の罠で{name}は仲間とはぐれ、地下で四日を過ごした。水袋の最後の一口を何度も数えた。',
    en: '{name} was separated from the party by a teleport trap and spent four days underground, counting the last mouthful in the waterskin again and again.',
    eff: { hp: -5, mind: 2 }, risk: { hazard: 'accident', p: 0.03 },
  },
  {
    id: 'fa.new-dungeon', stage: ['adult'], tags: F, jobs: ['adventurer', 'hunter', 'miner'], w: 0.4, kind: 'adventure',
    ja: '崖崩れの跡に、地図にない石の階段が口を開けていた。見つけたのは{name}だけだった。',
    en: 'Where a cliff had collapsed, a stone staircase that was on no map had opened up. Only {name} had seen it.',
    choice: {
      ja: 'どうするか', en: 'What now?',
      options: [
        { ja: 'ギルドに報告する', en: 'Report it to the guild', eff: { fame: 3, wealth: 2 },
          log: { ja: '発見者として{name}の名が台帳に残った。', en: "{name}'s name was entered in the ledger as the discoverer." } },
        { ja: '黙って先に潜る', en: 'Go in first, quietly', eff: { wealth: 8, level: 2 }, risk: { hazard: 'monster', p: 0.05 },
          log: { ja: '最初の部屋の宝箱は、誰も開けたことのない重さだった。', en: 'The chest in the first room had the weight of something no one had ever opened.' } },
      ],
    },
  },
  {
    id: 'fa.cursed-ring', stage: ['adult', 'middle'], tags: F, jobs: ['adventurer', 'thief', 'mage'], noFlag: 'cursed', w: 0.4, kind: 'hard',
    ja: '宝箱から出た指輪を{name}は何の気なしにはめた。それきり外れなくなった。',
    en: '{name} slipped on a ring from a treasure chest without thinking. It never came off again.',
    eff: { luck: -5, power: 2 }, set: 'cursed',
  },
  {
    id: 'fa.relic', stage: ['adult'], tags: F, jobs: ['adventurer', 'mage', 'scholar'], w: 0.5, kind: 'adventure',
    ja: '崩れた遺跡の床下から、{name}は誰にも読めない文字が刻まれた石の円盤を拾った。',
    en: 'From beneath the floor of a ruined temple, {name} picked up a stone disc carved with letters no one could read.',
    eff: { mind: 4, wealth: 3 },
  },
  {
    id: 'fa.companion-wounded', stage: ['adult', 'middle'], tags: F, jobs: ['adventurer'], w: 0.5, kind: 'loss',
    ja: '{companion}が魔物の爪で深手を負った。傷が塞がると、冒険者をやめて故郷へ帰ると言った。',
    en: "{companion} took a deep wound from a monster's claws. Once it closed, they said they were quitting and going home.",
    eff: { happy: -5 }, tie: { role: 'companion', d: -5 },
  },
  {
    id: 'fa.betrayed', stage: ['adult'], tags: F, jobs: ['adventurer', 'mercenary', 'thief'], noFlag: 'betrayed', w: 0.4, kind: 'hard',
    ja: '報酬の分け方で揉めた夜、{companion}は共同の財布ごと姿を消した。',
    en: 'The night after an argument over splitting the reward, {companion} vanished along with the shared purse.',
    eff: { wealth: -6, happy: -4 }, set: 'betrayed', tie: { role: 'companion', d: -50 },
  },
  {
    id: 'fa.party-rescue', stage: ['adult'], tags: F, jobs: ['adventurer'], flag: 'party', w: 0.6, kind: 'adventure',
    ja: '崩れた天井の下から、{name}は半日かけて{companion}を掘り出した。二人とも笑うしかなかった。',
    en: '{name} spent half a day digging {companion} out from under a collapsed ceiling. There was nothing to do but laugh.',
    eff: { hp: -2, happy: 3 }, tie: { role: 'companion', d: 15 },
  },

  // ---- 追放とざまぁ ------------------------------------------------------
  {
    id: 'fa.exiled', stage: ['adult'], tags: F, jobs: ['adventurer'], flag: 'party', noFlag: 'exiled', w: 0.5, kind: 'hard', big: true,
    ja: 'パーティの会議で、{name}は「足手まといだ」と告げられた。分け前を机に置いて出ていくよう言われた。',
    en: 'At a party meeting, {name} was told they were dead weight, and asked to leave their share on the table and go.',
    eff: { happy: -8, wealth: -3 }, set: 'exiled', tie: { role: 'companion', d: -40 },
    why: { ja: '目立たない支援役ほど、いなくなるまで働きが見えない', en: "The quieter a support role, the less anyone sees the work until it's gone" },
  },
  {
    id: 'fa.exile-awakening', stage: ['adult'], tags: F, flag: 'exiled', w: 0.8, kind: 'power',
    ja: '一人で潜るようになって、{name}は自分の技がずっと仲間に合わせて抑えられていたことに気づいた。',
    en: "Diving alone now, {name} realized their skills had always been held back to match the party's.",
    eff: { power: 6, level: 3 },
  },
  {
    id: 'fa.exile-new-party', stage: ['adult'], tags: F, flag: 'exiled', noFlag: 'party2', w: 1, kind: 'adventure',
    ja: '追放された次の季節、{name}は同じく行き場のなかった{companion}と組み直した。今度は分け前を最初に紙に書いた。',
    en: 'The season after being cast out, {name} teamed up with {companion}, who also had nowhere to go. This time they wrote the split down first.',
    eff: { happy: 5, charm: 2 }, set: 'party2', tie: { role: 'companion', new: true, d: 20 },
  },
  {
    id: 'fa.zamaa', stage: ['adult', 'middle'], tags: F, flag: 'exiled', noFlag: 'zamaa', w: 0.7, kind: 'fame',
    ja: '{name}を追い出したパーティが、荷物の管理も罠の見張りもないまま依頼に失敗し、解散したと噂で聞いた。',
    en: 'Word reached {name} that the party that had thrown them out failed a job with no one minding supplies or traps, and had broken up.',
    eff: { happy: 5, fame: 2 }, set: 'zamaa',
  },
  {
    id: 'fa.zamaa-plea', stage: ['adult', 'middle'], tags: F, flag: 'zamaa', w: 0.6, kind: 'hard',
    ja: '昔の仲間の一人が、戻ってきてほしいと{name}の宿の前で頭を下げた。',
    en: "One of the old party members bowed outside {name}'s inn and asked them to come back.",
    choice: {
      ja: 'どう答えるか', en: 'How to answer?',
      options: [
        { ja: '断る', en: 'Refuse', eff: { happy: 3 },
          log: { ja: '{name}は扉を閉めた。その夜はよく眠れた。', en: '{name} closed the door. They slept well that night.' } },
        { ja: '一度だけ手を貸す', en: 'Help them once', eff: { charm: 4, wealth: 2 }, risk: { hazard: 'monster', p: 0.02 },
          log: { ja: '一度きりの依頼を片づけ、{name}は分け前を受け取らずに帰った。', en: '{name} finished the one job and left without taking a share.' } },
      ],
    },
  },

  // ---- スタンピード・竜 --------------------------------------------------
  {
    id: 'fa.stampede', stage: ['adult', 'middle'], tags: F, magic: 1, w: 0.3, kind: 'battle', big: true,
    ja: '{town}の外れのダンジョンから魔物があふれ出した。{name}も槍を渡され、三日三晩城壁の上に立った。',
    en: "Monsters poured out of the dungeon on the edge of {town}. {name} was handed a spear and stood on the wall for three days and nights.",
    eff: { fame: 3, hp: -3, level: 1 }, risk: { hazard: 'monster', p: 0.05 },
    why: { ja: 'ダンジョンの多い土地では、十年から三十年に一度氾濫が起きる', en: 'In dungeon country, an overflow comes once every ten to thirty years' },
  },
  {
    id: 'fa.dragon', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['adventurer', 'knight', 'hero', 'hunter', 'tamer'], w: 0.2, kind: 'adventure', big: true,
    ja: '山の向こうから竜が降りてきて、{name}たちの野営地の真上で旋回を始めた。',
    en: "A dragon came down from beyond the mountains and began circling directly over {name}'s camp.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '剣を抜く', en: 'Draw your sword', eff: { fame: 10, wealth: 8, level: 5 }, set: 'dragonSlayer', risk: { hazard: 'monster', p: 0.12 },
          log: { ja: '夜明けまでかかった。竜の鱗は一枚で家が一軒買えた。', en: 'It took until dawn. A single dragon scale could buy a house.' } },
        { ja: '語りかける', en: 'Speak to it', eff: { mind: 5, fame: 4 }, set: 'dragonPact', risk: { hazard: 'magic', p: 0.03 },
          log: { ja: '竜は長いあいだ{name}を見下ろし、それから低い声で名前を訊いた。', en: 'The dragon looked down at {name} for a long time, then asked their name in a low voice.' } },
        { ja: '伏せて待つ', en: 'Lie low and wait', eff: { happy: -1 },
          log: { ja: '竜は羊を二頭さらって去った。', en: 'The dragon carried off two sheep and left.' } },
      ],
    },
  },
  {
    id: 'fa.dragon-pact-ride', stage: ['adult', 'middle', 'elder'], tags: F, flag: 'dragonPact', w: 0.6, kind: 'power',
    ja: '約束の夜、竜は{name}を背に乗せ、雲の上から{town}の灯りを見せた。',
    en: 'On the promised night, the dragon took {name} on its back and showed them the lights of {town} from above the clouds.',
    eff: { happy: 8, mind: 3 },
  },

  // ---- 騎士・兵士・傭兵 --------------------------------------------------
  {
    id: 'fa.knighted', stage: ['adult', 'middle'], tags: F, jobs: ['soldier', 'mercenary', 'adventurer', 'servant'], noFlag: 'knighted', w: 0.25, kind: 'fame', big: true,
    ja: '戦の後の式で、{name}の肩に剣の平が置かれた。騎士の位を賜った。',
    en: "At the ceremony after the war, the flat of a sword was laid on {name}'s shoulder. They were made a knight.",
    eff: { fame: 8, wealth: 4, charm: 3 }, set: 'knighted',
    why: { ja: '平民が貴族の端に入る数少ない道は、戦場の手柄', en: 'One of the few ways a commoner reaches the edge of nobility is merit on the battlefield' },
  },
  {
    id: 'fa.knight-duel', stage: ['adult'], tags: F, jobs: ['knight'], w: 0.6, kind: 'battle',
    ja: '宮廷の廊下で、{rival}に家の名を侮られた。周りの者たちが黙って{name}を見た。',
    en: "In a palace corridor, {rival} insulted {name}'s family name. Everyone nearby turned silently to look at {name}.",
    tie: { role: 'rival', new: true, d: -10 },
    choice: {
      ja: '決闘を申し込むか', en: 'Challenge them to a duel?',
      options: [
        { ja: '申し込む', en: 'Challenge', eff: { fame: 5, power: 2 }, risk: { hazard: 'violence', p: 0.04 },
          log: { ja: '決闘は三合で終わった。{rival}は膝をつき、それから二度と目を合わせなかった。', en: 'The duel ended in three exchanges. {rival} went to one knee and never met their eyes again.' } },
        { ja: '笑って流す', en: 'Laugh it off', eff: { charm: 2, fame: -1 },
          log: { ja: '{name}は笑って通り過ぎた。陰口は一週間で止んだ。', en: '{name} laughed and walked on. The whispers stopped within a week.' } },
      ],
    },
  },
  {
    id: 'fa.royal-guard', stage: ['adult', 'middle'], tags: F, jobs: ['knight'], flag: 'knighted', noFlag: 'royalGuard', w: 0.4, kind: 'work',
    ja: '{name}は王宮騎士団に配された。最初の一年は、門の前で立っているのが仕事だった。',
    en: "{name} was assigned to the royal knights. For the first year, the job was standing in front of a gate.",
    eff: { fame: 4, wealth: 3 }, set: 'royalGuard',
  },
  {
    id: 'fa.knight-escort', stage: ['adult'], tags: F, jobs: ['knight'], w: 0.8, repeat: true, kind: 'work',
    ja: '{lord}の娘の輿入れの行列を護衛した。道中、{name}は一度も花嫁の顔を見なかった。',
    en: "{name} guarded the wedding procession of {lord}'s daughter and never once saw the bride's face on the way.",
    eff: { wealth: 2, charm: 1 },
  },
  {
    id: 'fa.conscripted', stage: ['adult'], tags: F, jobs: ['farmer', 'miner', 'servant', 'cook', 'none'], w: 0.4, kind: 'battle',
    ja: '徴兵の触れが{town}に回った。{name}も槍を一本渡されて隊列に加わった。',
    en: 'The conscription notice went around {town}. {name} was handed a spear and put in the ranks.',
    eff: { happy: -5, power: 2 }, risk: { hazard: 'war', p: 0.03 }, set: 'drafted',
  },
  {
    id: 'fa.soldier-rout', stage: ['adult'], tags: F, jobs: ['soldier', 'mercenary'], w: 0.6, kind: 'battle',
    ja: '{name}の隊は敗走した。三日歩いて味方の陣に着いた時、隊は半分になっていた。',
    en: "{name}'s unit was routed. When they reached friendly lines after three days on foot, half of them were gone.",
    eff: { hp: -4, happy: -6 }, risk: { hazard: 'war', p: 0.05 },
  },
  {
    id: 'fa.soldier-captured', stage: ['adult', 'middle'], tags: F, jobs: ['soldier', 'knight', 'mercenary'], noFlag: 'captured', w: 0.3, kind: 'hard',
    ja: '{name}は捕虜になり、身代金が届くまでの八か月を敵の砦の地下で過ごした。',
    en: "{name} was taken prisoner and spent eight months in the cellar of an enemy fort until the ransom arrived.",
    eff: { hp: -5, happy: -5, wealth: -4 }, set: 'captured', risk: { hazard: 'violence', p: 0.02 },
  },
  {
    id: 'fa.lost-arm', stage: ['adult', 'middle'], tags: F, jobs: ['soldier', 'knight', 'mercenary', 'adventurer'], noFlag: 'maimed', w: 0.2, kind: 'ill', big: true,
    ja: '矢を受けた左腕は膿み、軍医の判断で肘から先を落とされた。',
    en: "The arrow wound in {name}'s left arm festered, and the army surgeon took it off below the elbow.",
    eff: { hp: -10, power: -6 }, set: 'maimed',
    why: { ja: '前近代の戦場では、傷そのものより化膿で亡くなる者が多い', en: 'On premodern battlefields, infection killed more than the wounds themselves' },
  },
  {
    id: 'fa.soldier-valor', stage: ['adult'], tags: F, jobs: ['soldier', 'knight'], w: 0.7, kind: 'battle',
    ja: '敵の陣に穴があいた。隊長が、突撃する者は前に出よと叫んだ。',
    en: "A gap opened in the enemy line. The captain shouted for volunteers to charge.",
    choice: {
      ja: '前に出るか', en: 'Step forward?',
      options: [
        { ja: '前に出る', en: 'Step forward', eff: { fame: 8, level: 2, wealth: 3 }, risk: { hazard: 'war', p: 0.08 },
          log: { ja: '{name}は敵の旗を持ち帰った。旗の端には誰かの血がついていた。', en: "{name} brought back the enemy banner. Someone's blood was on its edge." } },
        { ja: '隊列に残る', en: 'Hold the line', eff: { hp: 0 },
          log: { ja: '{name}は隊列を守った。突撃した十人のうち、戻ったのは四人だった。', en: '{name} held the line. Of the ten who charged, four came back.' } },
      ],
    },
  },
  {
    id: 'fa.merc-turncoat', stage: ['adult', 'middle'], tags: F, jobs: ['mercenary'], w: 0.7, kind: 'battle',
    ja: '開戦の前夜、敵方の使者が{name}の天幕に倍の報酬を持ってきた。',
    en: "On the eve of battle, an envoy from the other side came to {name}'s tent offering double pay.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '寝返る', en: 'Switch sides', eff: { wealth: 8, charm: -5 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '{name}の旗は翌朝、反対の丘に立っていた。', en: "The next morning, {name}'s banner stood on the opposite hill." } },
        { ja: '契約を守る', en: 'Keep the contract', eff: { charm: 3, fame: 2 },
          log: { ja: '{name}は使者を縛って雇い主に引き渡した。', en: '{name} tied up the envoy and handed them to the employer.' } },
      ],
    },
  },
  {
    id: 'fa.merc-unpaid', stage: ['adult'], tags: F, jobs: ['mercenary'], w: 0.8, repeat: true, kind: 'hard',
    ja: '戦が終わると、雇い主の伯爵は払いを渋った。{name}たちは城門の前に十日座り込んだ。',
    en: "When the war ended, the count who had hired them balked at paying. {name}'s company sat outside the castle gate for ten days.",
    eff: { wealth: -3, happy: -2 },
  },
  {
    id: 'fa.arena', stage: ['adult'], tags: F, jobs: ['mercenary', 'adventurer', 'soldier'], w: 0.5, kind: 'battle',
    ja: '{town}の闘技場で、腕試しの出場者を募る札が出ていた。優勝者には金貨百枚。',
    en: 'A notice at the {town} arena called for challengers. A hundred gold coins to the champion.',
    choice: {
      ja: '出場するか', en: 'Enter?',
      options: [
        { ja: '出る', en: 'Enter', eff: { wealth: 6, fame: 4, level: 1 }, risk: { hazard: 'violence', p: 0.04 },
          log: { ja: '{name}は準決勝まで勝ち進み、観客に名前を覚えられた。', en: '{name} made it to the semifinals, and the crowd learned their name.' } },
        { ja: '観客席で見る', en: 'Watch from the stands', eff: { happy: 2 },
          log: { ja: '{name}は干し肉をかじりながら、他人の血が砂に吸われるのを見ていた。', en: "{name} chewed jerky and watched other people's blood soak into the sand." } },
      ],
    },
  },

  // ---- 魔法使い・神官・死霊術師 ------------------------------------------
  {
    id: 'fa.court-mage', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['mage'], noFlag: 'courtMage', w: 0.25, kind: 'fame', big: true,
    ja: '{name}は宮廷魔術師に任じられた。新しい部屋には、前任者の焦げ跡が床に残っていた。',
    en: "{name} was appointed court mage. The new room still had the previous holder's scorch marks on the floor.",
    eff: { fame: 6, wealth: 5, mind: 2 }, set: 'courtMage',
  },
  {
    id: 'fa.forbidden-book', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['mage', 'necromancer', 'alchemist'], noFlag: 'forbidden', w: 0.5, kind: 'power',
    ja: '古書市で買った本の裏表紙の下に、もう一冊、鎖で綴じた薄い禁書が隠されていた。',
    en: 'Under the back cover of a book bought at the old-book market was another, thinner one: a forbidden text bound with chain.',
    choice: {
      ja: '鎖を外すか', en: 'Remove the chain?',
      options: [
        { ja: '開く', en: 'Open it', eff: { mind: 8, power: 3 }, set: 'forbidden', risk: { hazard: 'magic', p: 0.06 },
          log: { ja: '一頁目を読み終えた時、部屋の蝋燭が全部同じ方向に傾いていた。', en: 'When {name} finished the first page, every candle in the room was leaning the same way.' } },
        { ja: '封をして返す', en: 'Seal it and return it', eff: { mind: 1, luck: 2 },
          log: { ja: '{name}は禁書を蝋で封じ、教会の窓口に置いてきた。', en: '{name} sealed the text in wax and left it at the church window.' } },
      ],
    },
  },
  {
    id: 'fa.mana-backlash', stage: ['adult'], tags: F, magic: 2, jobs: ['mage'], w: 0.6, repeat: true, kind: 'ill',
    ja: '詠唱の途中で魔力が逆流し、{name}の右手の爪が三枚黒く変わった。',
    en: "Mana surged backward mid-chant, and three of {name}'s right fingernails turned black.",
    eff: { hp: -3, mind: 2 }, risk: { hazard: 'magic', p: 0.02 },
  },
  {
    id: 'fa.priest-plague', stage: ['adult', 'middle'], tags: F, jobs: ['priest', 'saint', 'herbalist'], w: 0.6, kind: 'work',
    ja: '谷向こうの村で熱病が広がり、教会は誰かを送らねばならなかった。名前を呼ばれたのは{name}だった。',
    en: "A fever was spreading in the village across the valley, and the church had to send someone. The name called was {name}'s.",
    choice: {
      ja: '村に入るか', en: 'Go into the village?',
      options: [
        { ja: '入って残る', en: 'Go and stay', eff: { charm: 6, fame: 4, mind: 2 }, risk: { hazard: 'disease', p: 0.06 },
          log: { ja: '{name}は二か月村に留まった。最後の病人が起き上がった日、鐘を一つだけ鳴らした。', en: 'For two months {name} stayed. On the day the last patient sat up, they rang the bell once.' } },
        { ja: '薬と祈りを送る', en: 'Send medicine and prayers', eff: { charm: -2 },
          log: { ja: '{name}は薬箱を荷車に積み、村の境で引き返した。', en: '{name} loaded the medicine onto a cart and turned back at the village boundary.' } },
      ],
    },
  },
  {
    id: 'fa.heresy', stage: ['adult', 'middle'], tags: F, jobs: ['priest', 'mage', 'alchemist', 'herbalist'], noFlag: 'heretic', w: 0.25, kind: 'hard',
    ja: '{name}の唱えた説が{god}の教えに背くとして、異端審問所に呼び出された。',
    en: "{name} was summoned before the inquisition, accused of teaching against the word of {god}.",
    choice: {
      ja: '説を撤回するか', en: 'Recant?',
      options: [
        { ja: '撤回する', en: 'Recant', eff: { happy: -4, fame: -2 },
          log: { ja: '{name}は署名し、その晩、自分の書いたものを炉で燃やした。', en: '{name} signed, and that night burned their own writings in the stove.' } },
        { ja: '撤回しない', en: 'Refuse', eff: { fame: 5, mind: 3 }, set: 'heretic', risk: { hazard: 'execution', p: 0.05 },
          log: { ja: '{name}は首を振った。審問官は何も言わずに羽根ペンを置いた。', en: '{name} shook their head. The inquisitor set down the quill without a word.' } },
      ],
    },
  },
  {
    id: 'fa.priest-funerals', stage: ['adult', 'middle'], tags: F, jobs: ['priest'], w: 1, repeat: true, kind: 'work',
    ja: '{name}はその年、四十二人の葬儀で祈りを読んだ。名前は全部覚えている。',
    en: "That year {name} read the prayers at forty-two funerals. They remember every name.",
    eff: { mind: 1, happy: -1, charm: 1 },
  },
  {
    id: 'fa.necro-battlefield', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['necromancer'], w: 0.8, kind: 'power',
    ja: '戦の後の野で、{name}の足元の土がかすかに鳴った。呼べば、骨は応えるだろう。',
    en: "On the field after the battle, the earth at {name}'s feet stirred faintly. If called, the bones would answer.",
    choice: {
      ja: '呼ぶか', en: 'Call them?',
      options: [
        { ja: '起こす', en: 'Raise them', eff: { power: 5, charm: -4, level: 1 }, risk: { hazard: 'magic', p: 0.04 },
          log: { ja: '三十の骸骨が立ち上がり、{name}のあとを黙ってついてきた。', en: 'Thirty skeletons rose and followed {name} in silence.' } },
        { ja: '弔う', en: 'Lay them to rest', eff: { mind: 1, charm: 2 },
          log: { ja: '{name}は野に塩を撒き、名もない兵のために短く唱えた。', en: '{name} scattered salt over the field and said a short chant for the nameless soldiers.' } },
      ],
    },
  },
  {
    id: 'fa.necro-flee', stage: ['adult', 'middle'], tags: F, jobs: ['necromancer'], w: 0.6, kind: 'hard',
    ja: '教会の審問官が{town}に着いた。{name}は荷物をまとめ、夜明け前に町を出た。',
    en: 'Church inquisitors arrived in {town}. {name} packed up and left before dawn.',
    eff: { wealth: -4, happy: -3 }, risk: { hazard: 'execution', p: 0.03 },
  },

  // ---- 商人・鍛冶師・料理人・錬金術師・薬師 ------------------------------
  {
    id: 'fa.shop-open', stage: ['adult', 'middle'], tags: F, jobs: ['merchant', 'smith', 'cook', 'alchemist', 'herbalist', 'adventurer'], noFlag: 'shop', w: 0.6, kind: 'work', big: true,
    ja: '{name}は{town}の裏通りに小さな店を借りた。看板の文字は自分で描いた。',
    en: '{name} rented a small shop on a back street in {town} and painted the sign themselves.',
    eff: { wealth: -4, happy: 6 }, set: 'shop',
  },
  {
    id: 'fa.desert-caravan', stage: ['adult', 'middle'], tags: ['fantasy', 'desert'], not: NF, jobs: ['merchant'], w: 0.6, kind: 'work',
    ja: '砂漠を越える隊商に荷を預ければ、塩は向こうで十倍で売れる。ただし三回に一回は、隊商ごと戻らない。',
    en: 'Send goods with the caravan across the desert and salt sells for ten times as much. But one caravan in three never comes back.',
    choice: {
      ja: '荷を預けるか', en: 'Send the goods?',
      options: [
        { ja: '全部預ける', en: 'Send everything', eff: { wealth: 9 }, risk: { hazard: 'accident', p: 0.03 },
          log: { ja: '自分も駱駝に乗った。四十日後、{name}は空の荷袋と重い金袋を持って帰った。', en: '{name} rode along. Forty days later they came home with empty sacks and a heavy purse.' } },
        { ja: '近場で売る', en: 'Sell close to home', eff: { wealth: 2 },
          log: { ja: '{name}は市場の端で塩を量り売りした。', en: '{name} sold salt by weight at the edge of the market.' } },
      ],
    },
  },
  {
    id: 'fa.rival-shop', stage: ['adult', 'middle'], tags: F, jobs: ['merchant', 'cook', 'smith'], flag: 'shop', w: 0.6, kind: 'hard',
    ja: '大商会の{rival}が、{name}の店の真向かいに支店を出した。値札はどれも{name}の店より一割安かった。',
    en: "{rival} of a great trading house opened a branch right across from {name}'s shop, with every price ten percent lower.",
    eff: { wealth: -3 }, tie: { role: 'rival', new: true, d: -15 },
  },
  {
    id: 'fa.soap-spreads', stage: ['adult', 'middle'], tags: F, jobs: ['merchant', 'alchemist'], memory: true, w: 0.5, kind: 'fame',
    ja: '前の世界の記憶をたよりに{name}が売り出した石鹸が、隣の国の市場にまで並ぶようになった。',
    en: '{name} had started selling soap from memories of a former life. Now it lined the market stalls of the neighboring country.',
    eff: { wealth: 8, fame: 4 },
    why: { ja: 'この世界にない品の作り方を知っていた', en: 'They knew how to make something this world did not have' },
  },
  {
    id: 'fa.smith-masterwork', stage: ['adult', 'middle'], tags: F, jobs: ['smith'], w: 0.8, kind: 'work',
    ja: '{name}が三か月かけて打った剣を、名の知れた剣士が言い値で買っていった。',
    en: 'A renowned swordsman paid the asking price for a blade {name} had spent three months forging.',
    eff: { wealth: 5, fame: 3, mind: 1 },
  },
  {
    id: 'fa.smith-burn', stage: ['adult', 'middle'], tags: F, jobs: ['smith'], w: 0.6, repeat: true, kind: 'ill',
    ja: '跳ねた鉄の粒が{name}の前腕に落ちた。痕は硬貨ほどの大きさで、もう消えない。',
    en: "A spatter of molten iron landed on {name}'s forearm. The scar is the size of a coin and will not fade.",
    eff: { hp: -3 }, risk: { hazard: 'accident', p: 0.01 },
  },
  {
    id: 'fa.cook-banquet', stage: ['adult', 'middle'], tags: F, jobs: ['cook'], w: 0.7, kind: 'work',
    ja: '{lord}の館の宴の料理を任された。客の一人が、皿の端まで指で拭って食べていた。',
    en: "{name} was put in charge of the feast at {lord}'s manor. One guest wiped the plate clean with a finger.",
    eff: { fame: 3, wealth: 3, happy: 2 },
  },
  {
    id: 'fa.cook-monster-meat', stage: ['adult'], tags: F, jobs: ['cook', 'hunter', 'adventurer'], w: 0.6, kind: 'work',
    ja: 'ギルドが買い取らなかった魔物の肉が、{name}の前に山になっていた。誰も食べたことのない肉だった。',
    en: 'Monster meat the guild would not buy sat piled in front of {name}. No one had ever eaten it.',
    choice: {
      ja: '料理するか', en: 'Cook it?',
      options: [
        { ja: '煮込んでみる', en: 'Try stewing it', eff: { fame: 5, wealth: 3 }, risk: { hazard: 'disease', p: 0.02 },
          log: { ja: '一晩煮込むと、肉は驚くほど柔らかくなった。翌月から店の名物になった。', en: 'After stewing overnight, it turned surprisingly tender. It became the house specialty the next month.' } },
        { ja: '捨てる', en: 'Throw it out', eff: { happy: -1 },
          log: { ja: '{name}は肉を裏の穴に埋めた。野良犬が三日間そこを掘っていた。', en: '{name} buried it out back. Stray dogs dug at the spot for three days.' } },
      ],
    },
  },
  {
    id: 'fa.alchemy-blast', stage: ['adult', 'middle'], tags: F, jobs: ['alchemist'], w: 0.7, repeat: true, kind: 'hard',
    ja: '釜が吹いて工房の屋根に穴があいた。{name}の眉は半年生えてこなかった。',
    en: "The cauldron blew a hole in the workshop roof. {name}'s eyebrows took half a year to grow back.",
    eff: { wealth: -4, hp: -3 }, risk: { hazard: 'accident', p: 0.02 },
  },
  {
    id: 'fa.alchemy-elixir', stage: ['adult', 'middle'], tags: F, magic: 1, jobs: ['alchemist'], w: 0.6, kind: 'power',
    ja: '七年目の配合で、瓶の中身がようやく澄んだ金色になった。',
    en: 'In the seventh year of trying, the liquid in the flask finally turned a clear gold.',
    choice: {
      ja: '誰で試すか', en: 'Who tests it?',
      options: [
        { ja: '自分で飲む', en: 'Drink it yourself', eff: { hp: 6, mind: 4 }, risk: { hazard: 'magic', p: 0.05 },
          log: { ja: '一晩高い熱にうなされ、朝には古い膝の痛みが消えていた。', en: 'A high fever all night, and by morning an old ache in the knee was gone.' } },
        { ja: '鼠で試す', en: 'Test it on a rat', eff: { mind: 2 },
          log: { ja: '鼠はそれから四年生きた。{name}は記録をつけ続けた。', en: 'The rat lived four more years. {name} kept notes the whole time.' } },
      ],
    },
  },
  {
    id: 'fa.herbal-cure', stage: ['adult', 'middle'], tags: F, jobs: ['herbalist', 'alchemist', 'priest'], w: 0.4, kind: 'fame', big: true,
    ja: '{name}は、毎冬子どもを連れていく咳の病に効く煎じ方を見つけた。',
    en: '{name} found a decoction that worked against the cough that took children every winter.',
    eff: { fame: 6, charm: 4, mind: 3 },
  },
  {
    id: 'fa.herbal-poison-order', stage: ['adult', 'middle'], tags: F, jobs: ['herbalist', 'alchemist'], noFlag: 'poisoner', w: 0.5, kind: 'hard',
    ja: '身なりのいい客が頼んだ「眠り薬」の材料は、どう組み合わせても毒にしかならなかった。',
    en: 'A well-dressed customer ordered a "sleeping draught," but the ingredients could only ever make poison.',
    choice: {
      ja: '作るか', en: 'Make it?',
      options: [
        { ja: '断る', en: 'Refuse', eff: { charm: 2, wealth: -1 },
          log: { ja: '客は舌打ちして出ていった。{name}はその夜、店の鍵を二重にかけた。', en: 'The customer clicked their tongue and left. That night {name} double-locked the door.' } },
        { ja: '作る', en: 'Make it', eff: { wealth: 7, happy: -4 }, set: 'poisoner', risk: { hazard: 'execution', p: 0.02 },
          log: { ja: '翌月、ある子爵の葬儀の鐘を、{name}は店の奥で聞いた。', en: "The next month, {name} heard a viscount's funeral bells from the back of the shop." } },
      ],
    },
  },

  // ---- 農民・狩人・テイマー・船乗り・鉱夫 --------------------------------
  {
    id: 'fa.harvest', stage: ['adult', 'middle'], tags: ['fantasy', 'rural'], jobs: ['farmer'], w: 2, repeat: true, kind: 'work',
    ja: '麦がよく実った年だった。{name}は最後の束を納屋に入れ、扉に寄りかかって息をついた。',
    en: 'The wheat came in heavy that year. {name} put the last sheaf in the barn and leaned against the door to catch their breath.',
    eff: { happy: 2, wealth: 2 },
  },
  {
    id: 'fa.drought', stage: ['adult', 'middle', 'elder'], tags: ['fantasy', 'rural'], jobs: ['farmer'], w: 0.8, repeat: true, kind: 'hard',
    ja: '夏じゅう雨が降らず、{name}の畑の豆は実をつける前に茶色くなった。',
    en: "No rain all summer. The beans in {name}'s field browned before they could set.",
    eff: { wealth: -4, hp: -2 },
  },
  {
    id: 'fa.field-monster', stage: ['adult', 'middle'], tags: ['fantasy', 'rural'], not: NF, jobs: ['farmer'], w: 0.8, kind: 'hard',
    ja: '夜ごと何かが畑を荒らしていた。足跡は犬よりずっと大きかった。',
    en: 'Something was tearing up the field every night. The tracks were much larger than a dog\'s.',
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '自分で追い払う', en: 'Drive it off yourself', eff: { wealth: 2, power: 2 }, risk: { hazard: 'monster', p: 0.03 },
          log: { ja: '{name}は鋤を構えて夜通し待ち、明け方に影が森へ逃げるのを見た。', en: '{name} waited all night with a hoe and, near dawn, watched a shape flee into the woods.' } },
        { ja: 'ギルドに頼む', en: 'Hire the guild', eff: { wealth: -3 },
          log: { ja: '来たのは若い冒険者二人で、三日後に牙を一本見せて報酬を受け取った。', en: 'Two young adventurers came, and after three days showed a single fang and took their pay.' } },
      ],
    },
  },
  {
    id: 'fa.crop-rotation', stage: ['adult', 'middle'], tags: ['fantasy', 'rural'], jobs: ['farmer', 'lord'], memory: true, w: 0.5, kind: 'work',
    ja: '前の世界で覚えた畑の回し方を試すと、三年目の収穫が隣の家の倍になった。村の年寄りたちが見に来た。',
    en: "{name} tried a crop rotation remembered from a former life. By the third year the harvest was double the neighbors'. The village elders came to look.",
    eff: { wealth: 5, fame: 2, charm: 2 },
  },
  {
    id: 'fa.hunt-big', stage: ['adult', 'middle'], tags: F, jobs: ['hunter'], w: 0.8, kind: 'adventure',
    ja: '血の跡は沢を越えて続いていた。手負いの大鹿で、角だけでひと冬は食べられる。',
    en: 'The blood trail ran on across the stream: a wounded great stag. The antlers alone would feed a winter.',
    choice: {
      ja: '追うか', en: 'Follow it?',
      options: [
        { ja: '追う', en: 'Follow', eff: { wealth: 5, fame: 2 }, risk: { hazard: 'monster', p: 0.04 },
          log: { ja: '日が落ちる前に追いついた。帰りは鹿を背負い、星を頼りに歩いた。', en: '{name} caught up before sunset and walked home under the stars with the stag on their back.' } },
        { ja: '見送る', en: 'Let it go', eff: { mind: 1 },
          log: { ja: '{name}は沢の手前で弓を下ろした。森の奥はもう暗かった。', en: '{name} lowered the bow at the water. The deep woods were already dark.' } },
      ],
    },
  },
  {
    id: 'fa.hunter-winter', stage: ['adult', 'middle'], tags: F, jobs: ['hunter'], w: 0.8, repeat: true, kind: 'hard',
    ja: '冬の山で四日獲物がなく、{name}は最後の干し肉を半分に割って食べた。',
    en: 'Four days on the winter mountain with no game. {name} broke the last strip of jerky in half and ate it.',
    eff: { hp: -2, wealth: -2 },
  },
  {
    id: 'fa.tamer-bond', stage: ['adult'], tags: F, jobs: ['tamer', 'hunter'], w: 1.2, kind: 'adventure',
    ja: '罠にかかって弱っていた{beast}の子を、{name}は連れて帰った。名前は{familiar}にした。',
    en: '{name} brought home a {beast} cub found weak in a snare, and named it {familiar}.',
    eff: { happy: 5 }, tie: { role: 'familiar', new: true, d: 25 },
  },
  {
    id: 'fa.familiar-grows', stage: ['adult', 'middle'], tags: F, jobs: ['tamer'], w: 0.8, kind: 'power',
    ja: '{familiar}の背丈が{name}を越えた。それでも寝る時は、{name}の足元で丸くなろうとする。',
    en: '{familiar} grew taller than {name}, yet at night it still tried to curl up at their feet.',
    eff: { power: 3, happy: 3 }, tie: { role: 'familiar', d: 10 },
  },
  {
    id: 'fa.tamer-turned-away', stage: ['adult', 'middle'], tags: F, jobs: ['tamer'], w: 0.7, repeat: true, kind: 'hard',
    ja: '{familiar}を連れていると、{town}の宿はどこも空きがないと言った。{name}は町の外で野営した。',
    en: 'With {familiar} along, every inn in {town} claimed to be full. {name} camped outside the walls.',
    eff: { happy: -2 }, tie: { role: 'familiar', d: 3 },
  },
  {
    id: 'fa.storm-at-sea', stage: ['adult', 'middle'], tags: ['sea'], not: NF, jobs: ['sailor'], w: 0.8, repeat: true, kind: 'hard',
    ja: '嵐で帆柱が折れ、{name}たちは三日間、壊れた船で波を数えて過ごした。',
    en: "A storm snapped the mast, and {name}'s crew spent three days on the broken ship counting waves.",
    eff: { hp: -3, happy: -2 }, risk: { hazard: 'accident', p: 0.04 },
  },
  {
    id: 'fa.sea-serpent', stage: ['adult', 'middle'], tags: ['sea'], not: NF, magic: 1, jobs: ['sailor'], w: 0.5, kind: 'battle',
    ja: '船の脇に、樽より太い鱗の背が浮かんだ。海蛇は船の周りをゆっくり一周した。',
    en: 'A scaled back thicker than a barrel surfaced beside the ship. The sea serpent circled them slowly once.',
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '銛を構える', en: 'Ready the harpoon', eff: { fame: 6, wealth: 4, level: 2 }, risk: { hazard: 'monster', p: 0.06 },
          log: { ja: '銛は首の付け根に入った。港では一週間、海蛇の肉が売られた。', en: 'The harpoon struck at the base of its neck. Serpent meat was sold at the harbor for a week.' } },
        { ja: '舵を切って逃げる', en: 'Turn and run', eff: { wealth: -2 },
          log: { ja: '積み荷を半分捨てて船を軽くし、{name}たちは風下へ逃げた。', en: 'They dumped half the cargo to lighten the ship and fled downwind.' } },
      ],
    },
  },
  {
    id: 'fa.unknown-isle', stage: ['adult'], tags: ['sea'], not: NF, jobs: ['sailor', 'adventurer'], w: 0.5, kind: 'adventure',
    ja: '地図にない島に寄港した。島の子どもたちは、{name}の言葉を一つも知らなかった。',
    en: "They put in at an island that was on no chart. The island's children did not know a single word of {name}'s language.",
    eff: { mind: 2, happy: 3 },
  },
  {
    id: 'fa.cave-in', stage: ['adult', 'middle'], tags: F, jobs: ['miner'], w: 0.6, repeat: true, kind: 'hard',
    ja: '坑道の奥で落盤があった。{name}は崩れた岩の向こう側で、ランプの油が切れるまで掘り続けた。',
    en: "There was a cave-in deep in the tunnel. {name} kept digging on the far side of the fallen rock until the lamp oil ran out.",
    eff: { hp: -4 }, risk: { hazard: 'accident', p: 0.04 },
  },
  {
    id: 'fa.mithril-vein', stage: ['adult', 'middle'], tags: F, magic: 1, jobs: ['miner'], w: 0.4, kind: 'work',
    ja: 'つるはしの先で、青白く光る筋が岩に走った。ミスリルの鉱脈だった。',
    en: 'At the tip of the pick, a pale blue gleam ran through the rock. A vein of mithril.',
    choice: {
      ja: '誰に言うか', en: 'Who do you tell?',
      options: [
        { ja: '親方に報告する', en: 'Report it to the foreman', eff: { wealth: 2, charm: 3 },
          log: { ja: '親方は{name}の肩を叩き、その月だけ給金を倍にした。', en: "The foreman clapped {name}'s shoulder and doubled their pay that month." } },
        { ja: '隠して自分で掘る', en: 'Hide it and dig it yourself', eff: { wealth: 8 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '夜ごと少しずつ削り出した。半年後、誰かが{name}の寝床を探った跡があった。', en: "{name} chipped it out a little each night. Half a year later, someone had searched their bed." } },
      ],
    },
  },
  {
    id: 'fa.mine-breach', stage: ['adult', 'middle'], tags: F, magic: 1, jobs: ['miner'], w: 0.4, kind: 'battle',
    ja: '掘り進めた坑道の壁が抜け、向こうにダンジョンの通路が現れた。冷たい風が吹いてきた。',
    en: 'The tunnel wall gave way onto a dungeon corridor. A cold wind blew out of it.',
    eff: { hp: -3, level: 1 }, risk: { hazard: 'monster', p: 0.03 },
  },

  // ---- 吟遊詩人・盗賊・暗殺者・従者 --------------------------------------
  {
    id: 'fa.song-spreads', stage: ['adult', 'middle'], tags: F, jobs: ['bard'], w: 0.7, kind: 'fame',
    ja: '{name}の作った歌が、行ったこともない町の酒場で歌われていた。歌詞が一行違っていた。',
    en: "A song {name} had written was being sung in a tavern in a town they had never visited. One line was wrong.",
    eff: { fame: 5, happy: 3 },
  },
  {
    id: 'fa.bard-scandal', stage: ['adult', 'middle'], tags: F, jobs: ['bard'], w: 0.6, kind: 'hard',
    ja: '{lord}の醜聞を、{name}は旅の途中で詳しく聞いてしまった。歌にすれば、どの酒場でも受ける。',
    en: "On the road, {name} heard every detail of a scandal involving {lord}. As a song, it would bring down any tavern.",
    choice: {
      ja: '歌うか', en: 'Sing it?',
      options: [
        { ja: '歌う', en: 'Sing it', eff: { fame: 6, wealth: 3 }, risk: { hazard: 'violence', p: 0.04 },
          log: { ja: '三つ目の町で、黒い外套の男たちが{name}の宿を訪ねてきた。裏の窓から逃げた。', en: 'In the third town, men in black cloaks came to the inn. {name} left through the back window.' } },
        { ja: '歌わない', en: 'Keep quiet', eff: { mind: 1 },
          log: { ja: '{name}はその話を、誰にも聞かれない古い羊皮紙にだけ書いた。', en: '{name} wrote it down only on an old scrap of parchment no one would read.' } },
      ],
    },
  },
  {
    id: 'fa.thief-big-job', stage: ['adult', 'middle'], tags: F, jobs: ['thief'], w: 0.8, kind: 'work',
    ja: '盗賊ギルドから、伯爵の屋敷の金庫を開ける仕事が回ってきた。分け前は三年分の稼ぎになる。',
    en: "The thieves' guild offered {name} a job cracking a count's vault. The share would equal three years' earnings.",
    choice: {
      ja: '受けるか', en: 'Take the job?',
      options: [
        { ja: '受ける', en: 'Take it', eff: { wealth: 9, level: 1 }, risk: { hazard: 'execution', p: 0.04 },
          log: { ja: '金庫は四つ目の鍵で開いた。夜警が角を曲がってきたのは、扉を閉めた直後だった。', en: 'The vault opened on the fourth lock. The night watch rounded the corner just after the door shut.' } },
        { ja: '断る', en: 'Turn it down', eff: { charm: -1 },
          log: { ja: '仕事を受けた別の者が、翌月広場で吊るされた。', en: 'The one who took the job instead was hanged in the square the next month.' } },
      ],
    },
  },
  {
    id: 'fa.thief-caught', stage: ['adult'], tags: F, jobs: ['thief'], noFlag: 'branded', w: 0.5, kind: 'hard',
    ja: '市場で財布に手を入れたところを掴まれた。{name}の肩には焼き印が残った。',
    en: "{name} was caught with a hand in someone's purse at the market. A brand was burned into their shoulder.",
    eff: { hp: -3, charm: -4 }, set: 'branded', risk: { hazard: 'execution', p: 0.02 },
  },
  {
    id: 'fa.thief-scout', stage: ['adult'], tags: F, jobs: ['thief'], w: 0.7, kind: 'adventure',
    ja: '罠の見える目を買われ、{name}は{companion}のパーティに斥候として雇われた。',
    en: "Hired for an eye that could spot traps, {name} joined {companion}'s party as a scout.",
    eff: { wealth: 3, level: 1 }, tie: { role: 'companion', new: true, d: 10 },
  },
  {
    id: 'fa.assassin-target', stage: ['adult', 'middle'], tags: F, jobs: ['assassin'], noFlag: 'defector', w: 0.8, kind: 'hard',
    ja: '渡された標的の似顔絵は、毎朝パンを買いに来る、あの小柄な写本師だった。',
    en: 'The sketch of the target was the small copyist who came to buy bread every morning.',
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '仕事をする', en: 'Do the job', eff: { wealth: 8, happy: -6, level: 1 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '{name}はそれからあのパン屋に行かなくなった。', en: '{name} stopped going to that bakery.' } },
        { ja: '逃がす', en: 'Let them go', eff: { happy: 3, charm: 2 }, set: 'defector', risk: { hazard: 'violence', p: 0.06 },
          log: { ja: '夜のうちに写本師を荷馬車に乗せ、国境の方へ送った。組織にはまだ知られていない。', en: 'Overnight, {name} put the copyist on a cart bound for the border. The guild does not know yet.' } },
      ],
    },
  },
  {
    id: 'fa.assassin-hunted', stage: ['adult', 'middle'], tags: F, jobs: ['assassin', 'thief'], noFlag: 'hunted', w: 0.4, kind: 'hard',
    ja: '同じ組織の{nemesis}が、{name}を消せという命令を受けたと聞いた。',
    en: '{name} heard that {nemesis}, from the same guild, had been ordered to get rid of them.',
    eff: { happy: -5 }, set: 'hunted', tie: { role: 'nemesis', new: true, d: -30 }, risk: { hazard: 'violence', p: 0.03 },
  },
  {
    id: 'fa.servant-house', stage: ['adult'], tags: F, jobs: ['servant'], w: 1, kind: 'work',
    ja: '{name}は{master}の屋敷に住み込みで仕えることになった。屋根裏の部屋は狭いが、窓から海が見えた。',
    en: "{name} went into live-in service at {master}'s house. The attic room was small, but the window looked out on the sea.",
    eff: { wealth: 2 }, tie: { role: 'master', new: true, d: 5 },
  },
  {
    id: 'fa.servant-secret', stage: ['adult', 'middle'], tags: F, jobs: ['servant'], w: 0.6, kind: 'hard',
    ja: '書斎の片づけの途中で、{name}は{master}が領民の税を誤魔化している帳簿を見てしまった。',
    en: "Tidying the study, {name} saw a ledger showing {master} skimming the villagers' taxes.",
    tie: { role: 'master', d: -10 },
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '黙っている', en: 'Say nothing', eff: { wealth: 3, happy: -2 },
          log: { ja: '翌週、{name}の給金が少しだけ上がった。', en: "The next week, {name}'s wages rose a little." } },
        { ja: '代官に告げる', en: 'Tell the magistrate', eff: { fame: 3, charm: 4 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '{name}は屋敷を追われたが、村の者が代わる代わる食べ物を持ってきた。', en: '{name} was thrown out of the house, but the villagers took turns bringing food.' } },
      ],
    },
  },

  // ---- 勇者・聖女・魔王軍 ------------------------------------------------
  {
    id: 'fa.hero-chosen', stage: ['adult'], tags: F, magic: 2, noFlag: 'hero', w: 0.04, kind: 'fame', big: true,
    ja: '{god}の神託が下り、{name}は勇者として名を呼ばれた。その日から、知らない人に名前で呼ばれるようになった。',
    en: "An oracle of {god} came down, and {name} was named the hero. From that day on, strangers called them by name.",
    eff: { fame: 10, power: 4, happy: -2 }, set: 'hero',
    why: { ja: '魔王のいる時代、神は人の中から一人を選ぶ', en: 'In an age with a demon king, the gods choose one among the people' },
  },
  {
    id: 'fa.hero-party', stage: ['adult'], tags: F, jobs: ['hero'], w: 1.5, kind: 'adventure',
    ja: '王都で勇者の仲間を選ぶ試合が開かれた。{name}は、負けた側にいた{companion}を選んだ。',
    en: "A tournament was held in the capital to choose the hero's companions. {name} chose {companion}, from the losing side.",
    eff: { charm: 3 }, tie: { role: 'companion', new: true, d: 20 },
  },
  {
    id: 'fa.join-hero-party', stage: ['adult'], tags: F, magic: 2, jobs: ['adventurer', 'mage', 'priest', 'knight'], noFlag: 'hero', flag: 'rankC', w: 0.2, kind: 'fame', big: true,
    ja: '{name}は勇者の一行に加えられた。出発の朝、母親たちが沿道で泣いていた。',
    en: "{name} was added to the hero's party. On the morning they set out, mothers wept along the road.",
    eff: { fame: 6, level: 2, happy: -2 }, risk: { hazard: 'monster', p: 0.03 },
  },
  {
    id: 'fa.demon-general', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['hero', 'knight'], noFlag: 'generalSlain', w: 0.6, kind: 'battle',
    ja: '魔王軍の四将の一人が、国境の砦に陣を敷いた。砦の裏には、まだ逃げ遅れた村が二つある。',
    en: "One of the demon king's four generals made camp at the border fortress. Behind it, two villages had not yet fled.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '砦に斬り込む', en: 'Storm the fortress', eff: { fame: 10, level: 5 }, set: 'generalSlain', risk: { hazard: 'war', p: 0.1 },
          log: { ja: '夜明けに砦の旗が落ちた。{name}は将の角を一本、王に届けた。', en: "At dawn the fortress banner fell. {name} sent one of the general's horns to the king." } },
        { ja: '村の避難を先にする', en: 'Evacuate the villages first', eff: { charm: 6, fame: 3 },
          log: { ja: '二つの村の三百人を、{name}は一人も欠けずに川の向こうへ渡した。', en: 'All three hundred people from the two villages crossed the river with {name}, not one lost.' } },
      ],
    },
  },
  {
    id: 'fa.demon-king-slain', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['hero'], flag: 'generalSlain', noFlag: 'demonKingSlain', w: 0.5, kind: 'battle', big: true,
    ja: '玉座の間での戦いは丸一日続いた。最後に{name}の剣が魔王の胸に届いた。',
    en: "The battle in the throne room lasted a full day. In the end, {name}'s sword reached the demon king's heart.",
    eff: { fame: 10, level: 5, happy: 4, hp: -6 }, set: 'demonKingSlain', risk: { hazard: 'magic', p: 0.1 },
  },
  {
    id: 'fa.demon-king-peace', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['hero', 'lord', 'priest'], noFlag: 'demonKingSlain', w: 0.1, kind: 'fame', big: true,
    ja: '{name}は剣を置いて魔王と同じ卓につき、三日かけて国境の線を引き直した。',
    en: "{name} set down their sword, sat at the same table as the demon king, and spent three days redrawing the border.",
    eff: { fame: 8, charm: 5, mind: 3 }, set: 'demonPeace',
  },
  {
    id: 'fa.hero-aftermath', stage: ['adult', 'middle'], tags: F, flag: 'demonKingSlain', w: 0.8, kind: 'hard',
    ja: '魔王がいなくなると、王宮は勇者をどう扱うかで揉め始めた。{name}への手紙が届かなくなった。',
    en: "With the demon king gone, the court began quarreling over what to do with the hero. {name}'s letters stopped arriving.",
    eff: { happy: -4, fame: 2 },
  },
  {
    id: 'fa.saint-recognized', stage: ['adult'], tags: F, magic: 2, jobs: ['priest', 'herbalist'], noFlag: 'saint', w: 0.08, kind: 'fame', big: true,
    ja: '{name}の手が触れた病人の傷が、目の前で塞がった。翌月、教会は{name}を聖女と認めた。',
    en: "A sick man's wound closed under {name}'s hand in front of witnesses. The next month, the church declared {name} a saint.",
    eff: { fame: 9, charm: 5 }, set: 'saint',
  },
  {
    id: 'fa.fake-saint', stage: ['adult', 'middle'], tags: F, jobs: ['saint'], noFlag: 'exiled', w: 0.3, kind: 'hard', big: true,
    ja: '新しく来た聖女の方が本物だと、司教たちは言った。{name}は偽りの聖女として国を出るよう命じられた。',
    en: 'The bishops said the newly arrived saint was the true one. {name} was declared false and ordered to leave the country.',
    eff: { fame: -5, happy: -6, wealth: -5 }, set: 'exiled',
    why: { ja: '聖女の座は祈りより政治で決まることがある', en: "Sometimes a saint's seat is decided by politics, not prayer" },
  },
  {
    id: 'fa.saint-barrier', stage: ['adult', 'middle'], tags: F, magic: 2, jobs: ['saint'], w: 0.8, repeat: true, kind: 'work',
    ja: '国境の結界を張り直す儀式で、{name}は三日間眠らずに祈った。終わった時、髪がひと房白くなっていた。',
    en: '{name} prayed for three days without sleep to renew the border ward. When it was done, a lock of their hair had gone white.',
    eff: { hp: -4, fame: 3, mind: 2 }, risk: { hazard: 'magic', p: 0.01 },
  },

  // ---- 領主・叙爵の後 ----------------------------------------------------
  {
    id: 'fa.lord-granted', stage: ['adult', 'middle'], tags: F, flag: 'knighted', noFlag: 'lord', w: 0.4, kind: 'fame', big: true,
    ja: '{name}は辺境の小さな領地を賜った。村が三つ、それに壊れかけの砦が一つ。',
    en: '{name} was granted a small fief on the frontier: three villages and one half-ruined fort.',
    eff: { fame: 5, wealth: 5 }, set: 'lord',
  },
  {
    id: 'fa.lord-first-tax', stage: ['adult', 'middle'], tags: F, flag: 'lord', w: 0.8, kind: 'work',
    ja: '最初の秋、村長たちが年貢の麦を運んできた。{name}は帳簿をつけながら、去年より少ない理由を一人ずつ聞いた。',
    en: 'In the first autumn, the village heads brought the grain tax. {name} kept the ledger and asked each one why it was less than last year.',
    eff: { mind: 2, charm: 2, wealth: 2 },
  },

  // ---- 恋・家族 ----------------------------------------------------------
  {
    id: 'fa.marriage', stage: ['adult'], tags: F, noFlag: 'married', w: 1, kind: 'love', big: true,
    ja: '{name}は{town}の小さな礼拝堂で{spouse}と結婚した。祝いの席には、町の顔なじみが全員来た。',
    en: "{name} married {spouse} in a small chapel in {town}. Every familiar face in town came to the feast.",
    eff: { happy: 8, charm: 2 }, set: 'married', tie: { role: 'spouse', new: true, d: 30 },
  },
  {
    id: 'fa.marry-across-race', stage: ['adult', 'middle'], tags: F, noFlag: 'married', w: 0.3, kind: 'love',
    ja: '寿命の違う相手との結婚に、両方の親族が顔をしかめた。{name}と{spouse}は、川の中州で二人だけで誓いを立てた。',
    en: "Both families frowned at a marriage between two different lifespans. {name} and {spouse} made their vows alone on a sandbar in the river.",
    eff: { happy: 7, charm: -2 }, set: 'married', tie: { role: 'spouse', new: true, d: 35 },
  },
  {
    id: 'fa.child-born', stage: ['adult', 'middle'], tags: F, flag: 'married', w: 0.5, repeat: true, kind: 'family', big: true,
    ja: '{name}に子が生まれ、{child}と名付けた。夜泣きの声で、隣の家の犬まで起きた。',
    en: "{name} had a child and named them {child}. The crying at night woke even the neighbor's dog.",
    eff: { happy: 7, wealth: -2 }, tie: { role: 'child', new: true, d: 40 },
  },
  {
    id: 'fa.lover-on-road', stage: ['adult'], tags: F, jobs: ['adventurer', 'bard', 'mercenary', 'sailor'], noFlag: 'married', w: 0.7, kind: 'love',
    ja: '港町の宿で、{name}は{lover}と三晩続けて朝まで話した。四日目の朝、船は出た。',
    en: 'At an inn in a port town, {name} talked with {lover} until dawn three nights running. On the fourth morning, the ship sailed.',
    eff: { happy: 5 }, tie: { role: 'lover', new: true, d: 20 },
  },
  {
    id: 'fa.mentor-last-lesson', stage: ['adult'], tags: F, w: 0.6, kind: 'loss',
    ja: '{mentor}が床に伏せった。最後の稽古は、寝台の上で指を動かしてみせるだけだった。',
    en: "{mentor} took to their bed. The last lesson was only the movement of a few fingers above the blanket.",
    eff: { mind: 3, happy: -5 }, tie: { role: 'mentor', d: 10 },
  },
  {
    id: 'fa.mentor-avenged', stage: ['adult', 'middle'], tags: F, jobs: FIGHTERS, w: 0.3, kind: 'battle',
    ja: '{mentor}の片目を奪った男の居場所を、{name}はついに突き止めた。',
    en: "{name} finally tracked down the man who had taken one of {mentor}'s eyes.",
    tie: { role: 'mentor', d: 5 },
    choice: {
      ja: '仇を討つか', en: 'Take revenge?',
      options: [
        { ja: '討つ', en: 'Take it', eff: { power: 3, happy: 2, fame: 3 }, risk: { hazard: 'violence', p: 0.05 },
          log: { ja: '果たした後、{name}は思っていたほど何も感じなかった。', en: 'Afterward, {name} felt far less than they had expected.' } },
        { ja: '役人に引き渡す', en: 'Hand him to the law', eff: { charm: 3, mind: 2 },
          log: { ja: '男は裁かれ、鉱山送りになった。{name}は判決の日、{mentor}の墓に花を置いた。', en: "The man was tried and sent to the mines. On the day of the verdict, {name} left flowers at {mentor}'s grave." } },
      ],
    },
  },
  {
    id: 'fa.nemesis-rises', stage: ['adult'], tags: F, jobs: FIGHTERS, w: 0.4, kind: 'hard',
    ja: '{name}が討ち損じた盗賊の頭が、{nemesis}と名乗って別の土地で勢力を広げていると聞いた。',
    en: 'The bandit chief {name} had failed to finish off was now calling themself {nemesis} and gathering power in another land.',
    eff: { happy: -3 }, tie: { role: 'nemesis', new: true, d: -20 },
  },
  {
    id: 'fa.nemesis-showdown', stage: ['adult', 'middle'], tags: F, jobs: FIGHTERS, w: 0.4, kind: 'battle', big: true,
    ja: '{nemesis}と、ついに同じ谷で向き合った。どちらも長い年月の分だけ年を取っていた。',
    en: 'At last {name} and {nemesis} faced each other in the same valley. Both had aged by all the years between.',
    tie: { role: 'nemesis', d: 0 },
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '決着をつける', en: 'Settle it', eff: { fame: 7, level: 3 }, risk: { hazard: 'violence', p: 0.08 },
          log: { ja: '谷に風が戻った時、立っていたのは{name}だった。', en: 'When the wind returned to the valley, it was {name} left standing.' } },
        { ja: '剣を収める', en: 'Sheathe your sword', eff: { mind: 3, happy: 2 },
          log: { ja: '{name}は背を向けた。{nemesis}は斬りかからなかった。', en: '{name} turned their back. {nemesis} did not strike.' } },
      ],
    },
  },
  {
    id: 'fa.rival-arena-final', stage: ['adult'], tags: F, jobs: FIGHTERS, w: 0.4, kind: 'battle',
    ja: '武闘大会の決勝の相手は{rival}だった。前の晩、二人は同じ酒場の端と端に座っていた。',
    en: 'The opponent in the tournament final was {rival}. The night before, the two had sat at opposite ends of the same tavern.',
    eff: { fame: 5, power: 2 }, tie: { role: 'rival', d: 8 },
  },
  {
    id: 'fa.gamey-skill', stage: ['adult', 'middle'], tags: ['gamey'], not: NF, w: 0.8, repeat: true, kind: 'power',
    ja: '目の前に浮かんだ文字が、新しい技能を覚えたと告げた。{name}は名前の読み方がわからなかった。',
    en: 'Letters floated before {name}, announcing a new skill. {name} could not tell how to pronounce its name.',
    eff: { level: 2, mind: 1 },
  },
  {
    id: 'fa.dark-curfew', stage: ['adult', 'middle'], tags: ['dark'], not: NF, w: 0.8, repeat: true, kind: 'hard',
    ja: '日が落ちると{town}の門は閉ざされ、外から扉を叩く声には誰も応えない。{name}も窓を開けなかった。',
    en: 'After sunset the gates of {town} were shut, and no one answered the knocking from outside. {name} did not open the window either.',
    eff: { happy: -3, mind: 1 },
  },
  {
    id: 'fa.myth-shrine', stage: ['adult', 'middle'], tags: ['myth'], not: NF, w: 0.6, kind: 'power',
    ja: '山頂の祠で一晩を明かした{name}の夢に、{god}が鹿の姿で立った。',
    en: '{name} spent a night at a mountaintop shrine, and {god} stood in their dream in the shape of a deer.',
    eff: { luck: 4, mind: 2 },
  },
  {
    id: 'fa.beast-moon-market', stage: ['adult'], tags: F, races: BEASTFOLK, w: 0.6, kind: 'work',
    ja: '満月の市で、{name}は耳の形の違う商人たちと、毛皮と塩を交換した。言葉より尻尾の振り方で値が決まった。',
    en: 'At the full-moon market, {name} traded furs for salt with merchants whose ears were shaped differently. Prices were set less by words than by the swish of tails.',
    eff: { wealth: 3, charm: 2 },
  },
  {
    id: 'fa.desert-oasis', stage: ['adult', 'middle'], tags: ['desert'], not: NF, w: 0.6, kind: 'adventure',
    ja: '砂嵐で道を失った{name}は、星の位置だけを頼りに二晩歩き、枯れかけの泉にたどり着いた。',
    en: 'Lost in a sandstorm, {name} walked two nights by the stars alone and reached a spring that was nearly dry.',
    eff: { hp: -4, mind: 2 }, risk: { hazard: 'accident', p: 0.02 },
  },

  // ======================================================================
  // 中年 (middle)
  // ======================================================================
  {
    id: 'fa.guildmaster', stage: ['middle'], tags: F, jobs: ['adventurer'], flag: 'rankB', noFlag: 'guildmaster', w: 0.5, kind: 'fame', big: true,
    ja: '{name}は{guild}のギルドマスターに推された。最初の仕事は、雨漏りする屋根の修理費をひねり出すことだった。',
    en: "{name} was chosen as master of {guild}. The first task was scraping together money to fix the leaking roof.",
    eff: { fame: 5, wealth: 3, charm: 3 }, set: 'guildmaster',
  },
  {
    id: 'fa.adventurer-retire', stage: ['middle'], tags: F, jobs: ['adventurer', 'mercenary'], noFlag: 'retired', w: 1, kind: 'old',
    ja: '朝起きると、膝が階段を一段ずつしか許さなくなっていた。{name}は剣を磨きながら、これからのことを考えた。',
    en: "One morning {name}'s knees would only allow the stairs one at a time. Polishing the sword, they thought about what came next.",
    choice: {
      ja: '引退するか', en: 'Retire?',
      options: [
        { ja: '引退して宿を開く', en: 'Retire and open an inn', eff: { happy: 5, wealth: 2 }, set: 'retired',
          log: { ja: '{name}は街道沿いに宿を開いた。若い冒険者の話を聞くのが仕事になった。', en: '{name} opened an inn by the highway. Listening to young adventurers became the job.' } },
        { ja: '現役を続ける', en: 'Keep going', eff: { fame: 2, hp: -2 }, risk: { hazard: 'monster', p: 0.03 },
          log: { ja: '{name}はもう一度依頼の掲示板の前に立った。', en: '{name} stood in front of the job board once more.' } },
      ],
    },
  },
  {
    id: 'fa.old-wound', stage: ['middle', 'elder'], tags: F, jobs: FIGHTERS, w: 1.2, repeat: true, kind: 'ill',
    ja: '雨の前になると、若い頃に受けた脇腹の古傷が疼く。{name}の天気の読みは、もう外れない。',
    en: "Before rain, the old wound in {name}'s side aches. Their weather forecasts are never wrong anymore.",
    eff: { hp: -2 },
  },
  {
    id: 'fa.take-disciple', stage: ['middle'], tags: F, jobs: ['smith', 'mage', 'knight', 'adventurer', 'herbalist', 'alchemist', 'cook', 'bard', 'hunter', 'priest'], noFlag: 'teacher', w: 1, kind: 'work',
    ja: '弟子にしてほしいと、{disciple}が三日続けて{name}の戸口に座っていた。四日目に、{name}は戸を開けた。',
    en: "{disciple} sat on {name}'s doorstep three days running, asking to be taken on. On the fourth, {name} opened the door.",
    eff: { happy: 3, charm: 2 }, set: 'teacher', tie: { role: 'disciple', new: true, d: 20 },
  },
  {
    id: 'fa.disciple-surpass', stage: ['middle', 'elder'], tags: F, flag: 'teacher', w: 0.6, kind: 'family',
    ja: '稽古の最中、{disciple}の一撃が初めて{name}に届いた。{disciple}の方が驚いた顔をしていた。',
    en: "During practice, {disciple}'s strike landed on {name} for the first time. {disciple} looked more surprised than anyone.",
    eff: { happy: 5 }, tie: { role: 'disciple', d: 10 },
  },
  {
    id: 'fa.disciple-independent', stage: ['middle', 'elder'], tags: F, flag: 'teacher', w: 0.6, kind: 'family',
    ja: '{disciple}が自分の工房を構えた。看板の隅に、小さく{name}の名前が入っていた。',
    en: "{disciple} opened a workshop of their own. In the corner of the sign, {name}'s name was written small.",
    eff: { happy: 5, fame: 2 }, tie: { role: 'disciple', d: 8 },
  },
  {
    id: 'fa.disciple-astray', stage: ['middle', 'elder'], tags: F, flag: 'teacher', noFlag: 'strayDisciple', w: 0.25, kind: 'loss',
    ja: '{disciple}が、{name}の教えた技で人を殺めたと聞いた。手配書の似顔絵は、少しも似ていなかった。',
    en: "{name} heard that {disciple} had killed someone with the very techniques {name} had taught. The wanted poster looked nothing like them.",
    eff: { happy: -7 }, set: 'strayDisciple', tie: { role: 'disciple', d: -40 },
  },
  {
    id: 'fa.knight-commander', stage: ['middle'], tags: F, jobs: ['knight'], flag: 'knighted', noFlag: 'commander', w: 0.4, kind: 'fame', big: true,
    ja: '{name}は騎士団長に任じられた。新しい外套は重く、最初の週は肩が凝った。',
    en: "{name} was made commander of the knights. The new cloak was heavy, and their shoulders ached all the first week.",
    eff: { fame: 6, wealth: 4 }, set: 'commander',
  },
  {
    id: 'fa.general', stage: ['middle'], tags: F, jobs: ['knight', 'soldier', 'lord'], w: 0.4, kind: 'battle',
    ja: '国境の戦で、{name}は二千の兵を預けられた。敵は川の向こうに三千いる。',
    en: 'In the border war, {name} was given command of two thousand. Three thousand of the enemy waited across the river.',
    choice: {
      ja: 'どう戦うか', en: 'How to fight?',
      options: [
        { ja: '夜に渡河して奇襲する', en: 'Cross at night and strike', eff: { fame: 8, level: 2 }, risk: { hazard: 'war', p: 0.07 },
          log: { ja: '霧が味方をした。朝には敵の陣が空になっていた。', en: 'The fog was on their side. By morning the enemy camp was empty.' } },
        { ja: '川岸で守りを固める', en: 'Dig in at the bank', eff: { charm: 3, fame: 2 },
          log: { ja: '睨み合いのまま冬が来て、どちらも兵を退いた。死者はほとんど出なかった。', en: 'Winter came during the standoff, and both sides withdrew. Almost no one died.' } },
      ],
    },
  },
  {
    id: 'fa.lord-revolt', stage: ['middle'], tags: F, flag: 'lord', w: 0.4, kind: 'hard',
    ja: '不作の年、村人たちが鋤や鎌を持って{name}の館の前に集まった。',
    en: "In a bad harvest year, villagers gathered before {name}'s manor carrying hoes and scythes.",
    choice: {
      ja: 'どう応じるか', en: 'How to respond?',
      options: [
        { ja: '年貢を下げる', en: 'Lower the tax', eff: { wealth: -5, charm: 6 },
          log: { ja: '{name}は門を開けて自分で話した。人々は鎌を下ろして帰っていった。', en: '{name} opened the gate and spoke to them directly. They lowered their scythes and went home.' } },
        { ja: '兵で散らす', en: 'Disperse them with soldiers', eff: { wealth: 2, charm: -7 }, risk: { hazard: 'violence', p: 0.03 },
          log: { ja: '広場は一刻で空になった。その冬、館の窓に石が三度投げ込まれた。', en: 'The square was empty within the hour. That winter, stones came through the manor windows three times.' } },
      ],
    },
  },
  {
    id: 'fa.lord-border', stage: ['middle'], tags: F, flag: 'lord', w: 0.5, kind: 'hard',
    ja: '隣の領の{rival}が、境の小川の向こう岸まで自分の土地だと言い出した。',
    en: 'The neighboring lord, {rival}, began claiming that the land up to the far bank of the boundary stream was theirs.',
    eff: { wealth: -2, mind: 1 }, tie: { role: 'rival', new: true, d: -15 },
  },
  {
    id: 'fa.lord-school', stage: ['middle'], tags: F, flag: 'lord', w: 0.5, kind: 'work',
    ja: '{name}は領地の真ん中に、子どもが字を習える小屋と、薬師の詰める小屋を建てた。',
    en: 'In the middle of the fief, {name} built one hut where children could learn letters and another for a healer.',
    eff: { wealth: -4, charm: 5, fame: 3 },
  },
  {
    id: 'fa.lord-promoted', stage: ['middle'], tags: F, flag: 'lord', noFlag: 'count', w: 0.3, kind: 'fame', big: true,
    ja: '開拓の功で、{name}は伯爵に上げられた。王都の夜会に呼ばれるようになり、着ていく服に困った。',
    en: "For opening up the frontier, {name} was raised to count. Invitations to the capital's evening parties began, and so did the problem of what to wear.",
    eff: { fame: 6, wealth: 5 }, set: 'count',
  },
  {
    id: 'fa.court-intrigue', stage: ['middle'], tags: F, jobs: ['lord', 'knight', 'mage'], w: 0.4, kind: 'hard',
    ja: '宰相の名で届いた手紙には、王太子の毒殺に手を貸せとは書いていなかった。ただ、そう読めた。',
    en: "The letter under the chancellor's name did not say to help poison the crown prince. It only read that way.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '王に見せる', en: 'Show the king', eff: { fame: 5, charm: 3 }, risk: { hazard: 'execution', p: 0.04 },
          log: { ja: '宰相は失脚した。{name}の館の周りを、それから一年見知らぬ男がうろついた。', en: "The chancellor fell. For a year afterward, a stranger loitered around {name}'s manor." } },
        { ja: '燃やして忘れる', en: 'Burn it and forget', eff: { happy: -2 },
          log: { ja: '{name}は手紙を暖炉に入れた。灰になるまで見ていた。', en: '{name} put the letter in the fireplace and watched until it was ash.' } },
      ],
    },
  },
  {
    id: 'fa.child-wants-adventure', stage: ['middle'], tags: F, w: 0.8, kind: 'family',
    ja: '{child}が、冒険者になると言い出した。手には、{name}が昔使っていた短剣を握っていた。',
    en: "{child} announced they were going to be an adventurer, gripping the dagger {name} used to carry.",
    tie: { role: 'child', d: 0 },
    choice: {
      ja: 'どう答えるか', en: 'How do you answer?',
      options: [
        { ja: '許して鍛える', en: 'Allow it and train them', eff: { happy: 3, power: 1 },
          log: { ja: '翌朝から、{name}は{child}と裏庭で木剣を打ち合った。', en: 'From the next morning, {name} and {child} crossed wooden swords in the backyard.' } },
        { ja: '反対する', en: 'Forbid it', eff: { happy: -3 },
          log: { ja: '{child}は三日口をきかなかった。四日目の朝、短剣は{name}の枕元に戻されていた。', en: "{child} would not speak for three days. On the fourth morning, the dagger was back by {name}'s pillow." } },
      ],
    },
  },
  {
    id: 'fa.child-academy', stage: ['middle'], tags: F, magic: 1, w: 0.6, kind: 'family',
    ja: '{child}が王都の魔術学院に受かった。{name}は荷造りを手伝い、余計なものを三つ詰め込んだ。',
    en: '{child} was accepted at the royal academy of magic. {name} helped pack and slipped in three things that were not needed.',
    eff: { happy: 5, wealth: -4 }, tie: { role: 'child', d: 5 },
  },
  {
    id: 'fa.child-betrothal', stage: ['middle'], tags: ['fantasy', 'nobility'], flag: 'lord', w: 0.6, kind: 'family',
    ja: '{child}の縁談が、隣の領から持ち込まれた。肖像画の相手は、ずいぶん若く描かれていた。',
    en: 'A marriage offer for {child} came from the neighboring fief. The portrait made the suitor look quite young.',
    eff: { wealth: 3, mind: 1 }, tie: { role: 'child', d: -3 },
  },
  {
    id: 'fa.grandchild', stage: ['middle', 'elder'], tags: F, w: 0.6, kind: 'family', big: true,
    ja: '{child}に子が生まれた。{name}はその小さな手を、なかなか放せなかった。',
    en: "{child} had a baby. {name} found it hard to let go of the tiny hand.",
    eff: { happy: 8 }, tie: { role: 'child', d: 10 }, set: 'grandparent',
  },
  {
    id: 'fa.hand-over-house', stage: ['middle', 'elder'], tags: F, flag: 'lord', noFlag: 'retired', w: 0.5, kind: 'family',
    ja: '{name}は家督を{child}に譲った。印章を渡す時、思っていたより指が震えた。',
    en: "{name} handed the family seat to {child}. Passing over the seal, their fingers shook more than expected.",
    eff: { happy: 3, fame: 1 }, set: 'retired', tie: { role: 'child', d: 8 },
  },
  {
    id: 'fa.widowed', stage: ['middle', 'elder'], tags: F, flag: 'married', noFlag: 'widowed', w: 0.25, kind: 'loss', big: true,
    ja: '{spouse}が流行り病で亡くなった。{name}は食卓の椅子を、ずっと片付けられなかった。',
    en: '{spouse} died of a fever that was going around. {name} could never bring themselves to put away the chair at the table.',
    eff: { happy: -10, hp: -2 }, set: 'widowed', tie: { role: 'spouse', d: 0, dies: true },
  },
  {
    id: 'fa.remarry', stage: ['middle'], tags: F, flag: 'widowed', noFlag: 'remarried', w: 0.3, kind: 'love',
    ja: '市場で毎週同じ時間に会う{spouse}と、{name}は再婚した。式は家族だけで、雨の日だった。',
    en: '{name} remarried {spouse}, whom they had met at the market at the same hour every week. Only family came, and it rained.',
    eff: { happy: 6 }, set: 'remarried', tie: { role: 'spouse', new: true, d: 25 },
  },
  {
    id: 'fa.hidden-child', stage: ['middle'], tags: F, jobs: ['adventurer', 'mercenary', 'bard', 'sailor', 'knight'], w: 0.15, kind: 'family',
    ja: '見知らぬ若者が{name}を訪ねてきて、母の名を告げた。{name}はその名前を覚えていた。',
    en: "A young stranger came to {name}'s door and gave their mother's name. {name} remembered it.",
    eff: { happy: 2, mind: 2 }, tie: { role: 'child', new: true, d: 5 },
  },
  {
    id: 'fa.old-companion-reunion', stage: ['middle', 'elder'], tags: F, w: 0.7, kind: 'family',
    ja: '二十年ぶりに{companion}と会った。お互いの白髪を笑い、それから昔のダンジョンの地図を広げた。',
    en: "{name} met {companion} for the first time in twenty years. They laughed at each other's gray hair, then spread out an old dungeon map.",
    eff: { happy: 6 }, tie: { role: 'companion', d: 15 },
  },
  {
    id: 'fa.old-companion-enemy', stage: ['middle'], tags: F, jobs: FIGHTERS, w: 0.25, kind: 'battle',
    ja: '敵の陣の先頭に、{companion}の見慣れた盾があった。',
    en: "At the head of the enemy line was {companion}'s familiar shield.",
    eff: { happy: -6 }, tie: { role: 'companion', d: -30 }, risk: { hazard: 'war', p: 0.04 },
  },
  {
    id: 'fa.nemesis-reconcile', stage: ['middle', 'elder'], tags: F, w: 0.4, kind: 'family',
    ja: '年老いた{nemesis}から手紙が届いた。詫びの言葉はなく、ただ酒の銘柄が一つ書いてあった。',
    en: 'A letter came from {nemesis}, now old. There was no apology, only the name of a wine.',
    eff: { happy: 4, mind: 2 }, tie: { role: 'nemesis', d: 30 },
  },
  {
    id: 'fa.rival-reconcile', stage: ['middle', 'elder'], tags: F, w: 0.5, kind: 'family',
    ja: '{rival}と酒場で鉢合わせした。昔の勝ち負けの数を、二人とも違う数で覚えていた。',
    en: "{name} ran into {rival} at a tavern. They each remembered a different tally of old wins and losses.",
    eff: { happy: 4 }, tie: { role: 'rival', d: 20 },
  },
  {
    id: 'fa.mana-decline', stage: ['middle'], tags: F, magic: 2, jobs: ['mage', 'priest', 'saint', 'necromancer'], w: 0.9, kind: 'old',
    ja: '若い頃なら一息で唱えられた術に、{name}は今では二度息を継ぐ。',
    en: 'A spell {name} once cast in a single breath now takes two.',
    eff: { mind: -2, hp: -1 },
  },
  {
    id: 'fa.memoir', stage: ['middle', 'elder'], tags: F, noFlag: 'memoir', w: 0.4, kind: 'work',
    ja: '{name}は夜ごと机に向かい、これまでのことを書き始めた。最初の三枚は、何度も書き直した。',
    en: '{name} began sitting at the desk each night, writing down the years so far. The first three pages were rewritten many times.',
    eff: { mind: 3, fame: 1 }, set: 'memoir',
  },
  {
    id: 'fa.lost-magic', stage: ['middle', 'elder'], tags: F, magic: 2, jobs: ['mage', 'alchemist'], w: 0.5, kind: 'power',
    ja: '遺跡から出た石板に、千年前に途絶えた転移の術の式が半分だけ残っていた。',
    en: 'A stone tablet from the ruins held half the formula for a teleportation spell lost a thousand years ago.',
    choice: {
      ja: '残り半分を探すか', en: 'Search for the other half?',
      options: [
        { ja: '研究に没頭する', en: 'Throw yourself into it', eff: { mind: 6, fame: 3, wealth: -4 }, risk: { hazard: 'magic', p: 0.04 },
          log: { ja: '五年目の春、{name}は塔の部屋から中庭へ一瞬で移った。着地で足首をひねった。', en: 'In the spring of the fifth year, {name} moved from the tower room to the courtyard in an instant, and twisted an ankle landing.' } },
        { ja: '写して学院に送る', en: 'Copy it and send it to the academy', eff: { charm: 2, mind: 1 },
          log: { ja: '学院から礼状が届いた。それきり何の便りもない。', en: 'A thank-you note came from the academy. Nothing after that.' } },
      ],
    },
  },
  {
    id: 'fa.legend-told', stage: ['middle', 'elder'], tags: F, flag: 'dragonSlayer', w: 0.8, kind: 'fame',
    ja: '旅の吟遊詩人が、竜を討った英雄の歌を{name}の目の前で歌った。英雄の背丈が、実際より頭一つ高かった。',
    en: 'A traveling bard sang the ballad of the dragon slayer right in front of {name}. The hero in the song was a head taller than in life.',
    eff: { fame: 4, happy: 2 }, set: 'famous',
  },
  {
    id: 'fa.advise-young-hero', stage: ['middle', 'elder'], tags: F, magic: 2, w: 0.3, kind: 'work',
    ja: '新しく選ばれた勇者の{disciple}が、{name}に教えを乞いに来た。まだ剣の握り方が甘かった。',
    en: '{disciple}, the newly chosen hero, came to {name} for guidance. Their grip on the sword was still loose.',
    eff: { charm: 3, fame: 2 }, tie: { role: 'disciple', new: true, d: 15 },
  },
  {
    id: 'fa.demon-king-return', stage: ['middle', 'elder'], tags: F, magic: 2, flag: 'demonKingSlain', w: 0.4, kind: 'hard',
    ja: '北の空が赤く染まる夜が続いた。{name}は倉の奥から、あの時の剣を出して布を外した。',
    en: "Night after night, the northern sky glowed red. {name} took the old sword from the back of the storehouse and unwrapped it.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '北へ向かう', en: 'Head north', eff: { fame: 6, level: 2 }, risk: { hazard: 'war', p: 0.08 },
          log: { ja: '兆しは魔王の残党が起こした火だった。{name}はそれを消して帰った。', en: "The omens were fires set by the demon king's remnants. {name} put them out and came home." } },
        { ja: '若い者に任せる', en: 'Leave it to the young', eff: { mind: 2, happy: 1 },
          log: { ja: '{name}は剣を若い騎士に渡し、門まで見送った。', en: '{name} gave the sword to a young knight and saw them off at the gate.' } },
      ],
    },
  },
  {
    id: 'fa.merchant-guild-head', stage: ['middle'], tags: F, jobs: ['merchant'], flag: 'shop', w: 0.4, kind: 'fame',
    ja: '{name}は商人ギルドの会頭に選ばれた。祝いの席で、昔の取引相手が若い頃の失敗を三つ話した。',
    en: "{name} was elected head of the merchants' guild. At the celebration, an old trading partner told three stories of their early mistakes.",
    eff: { fame: 5, wealth: 6 },
  },
  {
    id: 'fa.merchant-ruin', stage: ['middle'], tags: F, jobs: ['merchant'], flag: 'shop', w: 0.3, kind: 'hard',
    ja: '荷を積んだ船が三隻続けて沈み、{name}の帳簿は赤い数字で埋まった。',
    en: "Three cargo ships sank one after another, and {name}'s ledger filled with red.",
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '金貸しから借りて立て直す', en: 'Borrow from a moneylender', eff: { wealth: 2, happy: -3 }, risk: { hazard: 'violence', p: 0.02 },
          log: { ja: '借金は七年で返し終えた。利子は元金を超えていた。', en: 'The debt took seven years to repay. The interest came to more than the principal.' } },
        { ja: '店をたたむ', en: 'Close the shop', eff: { wealth: -6, happy: -4, mind: 2 },
          log: { ja: '{name}は看板を外し、裏の井戸で長いこと手を洗った。', en: '{name} took down the sign and spent a long time washing their hands at the well out back.' } },
      ],
    },
  },
  {
    id: 'fa.smith-hands', stage: ['middle'], tags: F, jobs: ['smith'], w: 0.7, kind: 'old',
    ja: '槌を握る指が、朝のうちは伸びなくなった。{name}は湯に手を浸してから火を入れるようになった。',
    en: "{name}'s fingers would no longer straighten around the hammer in the mornings. They began soaking their hands in hot water before lighting the forge.",
    eff: { hp: -2, mind: 1 },
  },
  {
    id: 'fa.farmer-heir', stage: ['middle'], tags: ['fantasy', 'rural'], jobs: ['farmer'], w: 0.6, kind: 'family',
    ja: '{child}が初めて一人で畑を耕した。畝はまっすぐではなかったが、{name}は何も言わなかった。',
    en: "{child} plowed the field alone for the first time. The furrows were not straight, but {name} said nothing.",
    eff: { happy: 4 }, tie: { role: 'child', d: 6 },
  },
  {
    id: 'fa.priest-bishop', stage: ['middle'], tags: F, jobs: ['priest'], w: 0.3, kind: 'fame',
    ja: '{name}は{town}の司教に任じられた。新しい法衣の裾は、階段で三度踏んだ。',
    en: "{name} was appointed bishop of {town}. They stepped on the hem of the new vestments three times on the stairs.",
    eff: { fame: 5, wealth: 3, charm: 2 },
  },
  {
    id: 'fa.bard-voice', stage: ['middle'], tags: F, jobs: ['bard'], w: 0.7, kind: 'old',
    ja: '高い音が出なくなった。{name}は昔の歌を一段低く直し、そちらの方が客の受けがよかった。',
    en: 'The high notes would not come anymore. {name} reset the old songs a step lower, and the crowds liked them better.',
    eff: { mind: 2, happy: 1 },
  },
  {
    id: 'fa.thief-last-job', stage: ['middle'], tags: F, jobs: ['thief'], w: 0.6, kind: 'work',
    ja: '若い頃の仲間が、最後の一仕事を持ちかけてきた。王都の宝物庫だ。',
    en: 'An old partner came to {name} with one last job: the royal treasury.',
    choice: {
      ja: '乗るか', en: 'In or out?',
      options: [
        { ja: '乗る', en: 'In', eff: { wealth: 10, fame: 3 }, risk: { hazard: 'execution', p: 0.06 },
          log: { ja: '盗んだ王冠はその月のうちに溶かされ、誰にも見つからなかった。', en: 'The stolen crown was melted down that same month and never found.' } },
        { ja: '足を洗う', en: 'Go straight', eff: { happy: 3 },
          log: { ja: '{name}は錠前屋の看板を出した。腕は確かだと評判になった。', en: '{name} hung out a locksmith sign. Word spread that their work was very good.' } },
      ],
    },
  },
  {
    id: 'fa.assassin-out', stage: ['middle'], tags: F, jobs: ['assassin'], w: 0.6, kind: 'hard',
    ja: '組織の長が代替わりした。古い者は始末されるか、さらに深く縛られるかだという。',
    en: 'The guild had a new master. The old hands would either be disposed of or bound in deeper.',
    choice: {
      ja: 'どうするか', en: 'What do you do?',
      options: [
        { ja: '名を変えて消える', en: 'Change your name and vanish', eff: { wealth: -5, happy: 3 }, risk: { hazard: 'violence', p: 0.05 },
          log: { ja: '{name}は海を渡り、小さな港町で網を繕う仕事についた。', en: '{name} crossed the sea and found work mending nets in a small harbor town.' } },
        { ja: '新しい長に仕える', en: 'Serve the new master', eff: { wealth: 5, happy: -4 },
          log: { ja: '最初の命令は、昔の同僚の名前だった。', en: 'The first order was the name of an old colleague.' } },
      ],
    },
  },
  {
    id: 'fa.saint-successor', stage: ['middle'], tags: F, jobs: ['saint'], w: 0.6, kind: 'work',
    ja: '新しい聖女候補の{disciple}が、{name}のもとに預けられた。祈りの言葉より先に、休み方を教えた。',
    en: "{disciple}, the new candidate for saint, was placed in {name}'s care. Before the words of prayer, {name} taught how to rest.",
    eff: { charm: 3, mind: 2 }, tie: { role: 'disciple', new: true, d: 15 },
  },
  {
    id: 'fa.necro-lich', stage: ['middle', 'elder'], tags: F, magic: 3, jobs: ['necromancer'], noFlag: 'lich', w: 0.4, kind: 'power',
    ja: '{name}は、自分の魂を移す器のための骨壺を作り終えた。あとは決めるだけだった。',
    en: '{name} finished crafting the urn meant to hold their own soul. All that remained was the decision.',
    choice: {
      ja: '儀式を行うか', en: 'Perform the ritual?',
      options: [
        { ja: '行う', en: 'Perform it', eff: { mind: 6, power: 5, hp: -8, charm: -6 }, set: 'lich', risk: { hazard: 'magic', p: 0.1 },
          log: { ja: '儀式の後、{name}の脈は止まったまま、目だけが開いていた。', en: "After the ritual, {name}'s pulse had stopped, yet their eyes stayed open." } },
        { ja: '骨壺を割る', en: 'Break the urn', eff: { happy: 3, mind: 1 },
          log: { ja: '{name}は骨壺を庭の石に打ちつけ、破片を土に埋めた。', en: '{name} smashed the urn against a garden stone and buried the shards.' } },
      ],
    },
  },
  {
    id: 'fa.necro-grave-keeper', stage: ['middle', 'elder'], tags: F, jobs: ['necromancer'], w: 0.6, kind: 'work',
    ja: '{name}は村の墓守を頼まれた。死者が起き上がらないよう見張る役を、死霊術師に頼むのが一番だと村長は言った。',
    en: "{name} was asked to keep the village graveyard. Who better to make sure the dead stay down, the village head said, than a necromancer.",
    eff: { charm: 4, wealth: 2 },
  },
  {
    id: 'fa.cook-inn', stage: ['middle'], tags: F, jobs: ['cook'], w: 0.6, kind: 'work',
    ja: '{name}の宿屋の煮込みを食べに、隣の町から歩いてくる客がいる。鍋は二十年、火を落としていない。',
    en: "Some guests walk from the next town just to eat the stew at {name}'s inn. The pot has not been off the fire in twenty years.",
    eff: { wealth: 3, happy: 3, fame: 2 },
  },
  {
    id: 'fa.sailor-captain', stage: ['middle'], tags: ['sea'], not: NF, jobs: ['sailor'], w: 0.5, kind: 'fame',
    ja: '{name}は自分の船の船長になった。船の名前は、最初に乗った船からもらった。',
    en: '{name} became captain of their own ship and named it after the first ship they ever sailed on.',
    eff: { fame: 4, wealth: 4, happy: 4 },
  },
  {
    id: 'fa.miner-lungs', stage: ['middle', 'elder'], tags: F, jobs: ['miner'], w: 0.8, kind: 'ill',
    ja: '咳が止まらなくなった。吐いた痰は、坑道の岩と同じ灰色だった。',
    en: "{name}'s cough would not stop. What they coughed up was the same gray as the tunnel rock.",
    eff: { hp: -5 }, risk: { hazard: 'disease', p: 0.02 },
  },
  {
    id: 'fa.hunter-teach-child', stage: ['middle'], tags: F, jobs: ['hunter'], w: 0.6, kind: 'family',
    ja: '{name}は{child}に、雪の上の足跡から獣の重さを読む方法を教えた。',
    en: "{name} taught {child} how to read an animal's weight from its tracks in the snow.",
    eff: { happy: 3 }, tie: { role: 'child', d: 6 },
  },
  {
    id: 'fa.familiar-old', stage: ['middle', 'elder'], tags: F, w: 0.5, kind: 'old',
    ja: '{familiar}の鼻先の毛が白くなった。散歩の道は、毎年少しずつ短くなっている。',
    en: "The fur on {familiar}'s muzzle has gone white. Their walk gets a little shorter every year.",
    eff: { happy: -1 }, tie: { role: 'familiar', d: 8 },
  },
  {
    id: 'fa.herbalist-garden', stage: ['middle', 'elder'], tags: F, jobs: ['herbalist'], w: 0.7, kind: 'work',
    ja: '{name}の薬草畑は、四十種を越えた。どれがどの病に効くか、全部書き留めた帳面は三冊目になった。',
    en: "{name}'s herb garden passed forty kinds. The notebook recording which cures what was on its third volume.",
    eff: { mind: 3, wealth: 2 },
  },
  {
    id: 'fa.alchemist-stone', stage: ['middle', 'elder'], tags: F, magic: 2, jobs: ['alchemist'], w: 0.4, kind: 'power',
    ja: '炉の底に、赤い小石が一つだけ残った。{name}はそれを三日眺めて、誰にも見せずに引き出しにしまった。',
    en: 'A single red pebble was left at the bottom of the furnace. {name} studied it for three days, then put it in a drawer and showed no one.',
    eff: { mind: 5, luck: 3 },
  },
  {
    id: 'fa.servant-steward', stage: ['middle'], tags: F, jobs: ['servant'], w: 0.6, kind: 'work',
    ja: '{name}は屋敷の家令になった。銀器の数から庭師の給金まで、全部{name}の頭に入っている。',
    en: "{name} became steward of the house. Everything from the count of the silver to the gardener's wages lives in {name}'s head.",
    eff: { wealth: 4, mind: 2, charm: 2 },
  },
  {
    id: 'fa.mercenary-company', stage: ['middle'], tags: F, jobs: ['mercenary'], noFlag: 'company', w: 0.5, kind: 'work',
    ja: '{name}は三十人の傭兵団を率いることになった。最初に決めたのは、団の旗の色だった。',
    en: '{name} took command of a mercenary company of thirty. The first thing decided was the color of the banner.',
    eff: { wealth: 5, fame: 3 }, set: 'company',
  },
  {
    id: 'fa.kingdom-falls', stage: ['middle'], tags: F, w: 0.08, kind: 'loss', big: true,
    ja: '王都が落ちた。{name}は家族と荷車一台分の荷物だけを持って、山を越えて隣の国へ逃れた。',
    en: 'The capital fell. {name} fled over the mountains to the next kingdom with family and a single cartload of belongings.',
    eff: { wealth: -8, happy: -8, hp: -3 }, risk: { hazard: 'war', p: 0.04 },
  },
  {
    id: 'fa.hero-middle', stage: ['middle'], tags: F, flag: 'hero', w: 0.6, kind: 'old',
    ja: '勇者の印は、まだ{name}の手の甲に残っている。ただ、昔ほどは光らなくなった。',
    en: "The hero's mark is still on the back of {name}'s hand. It just does not glow the way it used to.",
    eff: { power: -2, mind: 2 },
  },
  {
    id: 'fa.gamey-level-cap', stage: ['middle'], tags: ['gamey'], not: NF, w: 0.6, kind: 'old',
    ja: '何年も経験を積んでいるのに、{name}の頭の上の数字はもう動かなくなった。',
    en: 'Years of experience, and the number above {name}\'s head no longer moves.',
    eff: { happy: -2, mind: 2 },
  },

  // ======================================================================
  // 老年 (elder)
  // ======================================================================
  {
    id: 'fa.retire-woods', stage: ['elder'], tags: F, noFlag: 'retired', w: 1.2, kind: 'old',
    ja: '{name}は森の端の小さな家に移った。朝は鳥の声で起き、夜は薪の数を数えて眠る。',
    en: '{name} moved to a small house at the edge of the woods, waking to birdsong and falling asleep counting the firewood.',
    eff: { happy: 5, hp: 1 }, set: 'retired',
  },
  {
    id: 'fa.old-master', stage: ['elder'], tags: F, jobs: ['adventurer', 'knight', 'soldier', 'mercenary', 'mage', 'hero', 'none'], w: 0.6, kind: 'work',
    ja: '村の子どもたちが、{name}に剣を教えてくれとせがんだ。いちばん熱心だったのは{disciple}だった。',
    en: 'The village children begged {name} to teach them the sword. The most eager was {disciple}.',
    eff: { happy: 4, charm: 2 }, tie: { role: 'disciple', new: true, d: 15 },
  },
  {
    id: 'fa.tell-grandkids', stage: ['elder'], tags: F, flag: 'grandparent', w: 1, repeat: true, kind: 'family',
    ja: '{child}の子どもたちに、{name}は迷宮の話をした。話すたびに、魔物は少しずつ大きくなる。',
    en: "{name} told {child}'s children about the labyrinth. With each telling, the monsters grow a little larger.",
    eff: { happy: 3 }, tie: { role: 'child', d: 3 },
  },
  {
    id: 'fa.great-grandchild', stage: ['elder'], tags: F, flag: 'grandparent', w: 0.3, kind: 'family', big: true,
    ja: 'ひ孫が生まれた。{name}は名前を三度聞き返し、四度目に覚えた。',
    en: '{name} had a great-grandchild, and had to ask the name three times before it stuck on the fourth.',
    eff: { happy: 7 },
  },
  {
    id: 'fa.old-friends-gone', stage: ['elder'], tags: F, flag: 'party', w: 0.8, repeat: true, kind: 'loss',
    ja: '若い頃のパーティの一人の訃報が届いた。{name}は窓辺で、その人の好きだった酒を一杯だけ飲んだ。',
    en: "Word came that someone from the old party had died. {name} drank a single cup of their favorite at the window.",
    eff: { happy: -4 },
  },
  {
    id: 'fa.long-lived-spouse', stage: ['elder'], tags: F, flag: 'married', noFlag: 'widowed', w: 0.6, kind: 'family',
    ja: '{spouse}が{name}の白い髪を梳かしてくれた。手つきは、初めて会った頃と変わらなかった。',
    en: "{spouse} combed {name}'s white hair, with the same hands as the year they first met.",
    eff: { happy: 5 }, tie: { role: 'spouse', d: 8 },
  },
  {
    id: 'fa.elder-widowed', stage: ['elder'], tags: F, flag: 'married', noFlag: 'widowed', w: 0.4, kind: 'loss', big: true,
    ja: '{spouse}は、冬の終わりの朝、眠ったまま目を覚まさなかった。{name}は二人分の茶を淹れてから気づいた。',
    en: "{spouse} did not wake one morning at the end of winter. {name} realized only after making tea for two.",
    eff: { happy: -10 }, set: 'widowed', tie: { role: 'spouse', d: 0, dies: true },
  },
  {
    id: 'fa.play-of-life', stage: ['elder'], tags: F, flag: 'famous', w: 0.6, kind: 'fame',
    ja: '{name}の若い頃を題材にした劇が、王都でかかった。{name}は一番後ろの席で見て、途中で一度笑った。',
    en: "A play based on {name}'s youth opened in the capital. {name} watched from the back row and laughed once partway through.",
    eff: { fame: 4, happy: 3 },
  },
  {
    id: 'fa.statue', stage: ['elder'], tags: F, flag: 'famous', noFlag: 'statue', w: 0.4, kind: 'fame', big: true,
    ja: '{town}の広場に{name}の銅像が建った。像の鼻は、本物より少し高かった。',
    en: "A bronze statue of {name} went up in the {town} square. Its nose was a little higher than the real one.",
    eff: { fame: 6, happy: 2 }, set: 'statue',
  },
  {
    id: 'fa.last-adventure', stage: ['elder'], tags: F, jobs: ['adventurer', 'hero', 'knight', 'mercenary', 'hunter', 'none'], w: 0.5, kind: 'adventure',
    ja: '若い頃に引き返した扉のことを、{name}は今でも夢に見る。地図はまだ箪笥の奥にある。',
    en: '{name} still dreams of the door they turned back from in their youth. The map is still at the bottom of the chest.',
    choice: {
      ja: '最後の冒険に出るか', en: 'Set out on one last adventure?',
      options: [
        { ja: '出る', en: 'Go', eff: { fame: 8, happy: 6, hp: -5 }, risk: { hazard: 'monster', p: 0.1 }, set: 'lastAdventure',
          log: { ja: '扉の向こうには小さな部屋があり、誰かの古い寝床だけが残っていた。{name}は満足して帰った。', en: "Beyond the door was a small room with nothing but someone's old bedroll. {name} went home satisfied." } },
        { ja: '家に残る', en: 'Stay home', eff: { hp: 1, mind: 1 },
          log: { ja: '{name}は地図を孫に譲った。', en: '{name} gave the map to a grandchild.' } },
      ],
    },
  },
  {
    id: 'fa.become-legend', stage: ['elder'], tags: F, flag: 'demonKingSlain', noFlag: 'legend', w: 0.8, kind: 'fame', big: true,
    ja: '子どもたちの遊びで、魔王を倒す役の名前が{name}になっていた。本人を見ても、誰もそれと気づかなかった。',
    en: "In the children's games, the one who defeats the demon king was called {name}. Seeing the real one, nobody recognized them.",
    eff: { fame: 6, happy: 4 }, set: 'legend',
  },
  {
    id: 'fa.dragon-slayer-old', stage: ['elder'], tags: F, flag: 'dragonSlayer', noFlag: 'legend', w: 0.5, kind: 'fame',
    ja: '{name}の家の壁にかけた竜の鱗を、学者が三日かけて写生していった。',
    en: "A scholar spent three days sketching the dragon scale on {name}'s wall.",
    eff: { fame: 3, mind: 1 }, set: 'legend',
  },
  {
    id: 'fa.choose-grave', stage: ['elder'], tags: F, noFlag: 'graveChosen', w: 0.5, kind: 'old',
    ja: '{name}は丘の上の樫の木の下を自分の墓所に決め、そこまでの坂道を毎朝歩くようになった。',
    en: '{name} chose a spot under the oak on the hill for their grave, and began walking the slope up to it every morning.',
    eff: { mind: 2, hp: 1 }, set: 'graveChosen',
  },
  {
    id: 'fa.entrust-relic', stage: ['elder'], tags: F, flag: 'teacher', w: 0.6, kind: 'family',
    ja: '{name}は長く使った道具を、布に包んで{disciple}に渡した。手入れの仕方だけは三度言った。',
    en: "{name} wrapped the tools of a lifetime in cloth and gave them to {disciple}, repeating three times how to care for them.",
    eff: { happy: 4 }, tie: { role: 'disciple', d: 10 },
  },
  {
    id: 'fa.god-premonition', stage: ['elder'], tags: F, w: 0.4, kind: 'old',
    ja: '夜明け前、{name}は{god}に呼ばれたような気がして目を覚ました。窓の外では雪が降り始めていた。',
    en: 'Before dawn, {name} woke feeling as though {god} had called. Outside the window, snow had begun to fall.',
    eff: { mind: 2, luck: 2 },
  },
  {
    id: 'fa.elder-knees', stage: ['elder'], tags: F, w: 1.5, repeat: true, kind: 'old',
    ja: '井戸まで水を汲みに行くのに、{name}は途中で二度休むようになった。',
    en: '{name} now rests twice on the way to the well.',
    eff: { hp: -2 },
  },
  {
    id: 'fa.elder-garden', stage: ['elder'], tags: F, w: 1.5, repeat: true, kind: 'old',
    ja: '{name}は家の前に小さな菜園を作り、毎朝同じ時間に水をやった。',
    en: '{name} planted a small vegetable garden in front of the house and watered it at the same hour every morning.',
    eff: { happy: 2, hp: 1 },
  },
  {
    id: 'fa.elder-rival-tea', stage: ['elder'], tags: F, w: 0.6, kind: 'family',
    ja: '{rival}が杖をついて訪ねてきた。二人は昔の勝負の話は一度もせず、天気の話だけをして日が暮れた。',
    en: '{rival} came by, leaning on a cane. They never once mentioned their old contests, and talked only about the weather until dark.',
    eff: { happy: 4 }, tie: { role: 'rival', d: 15 },
  },
  {
    id: 'fa.elder-nemesis-funeral', stage: ['elder'], tags: F, w: 0.3, kind: 'loss',
    ja: '{nemesis}の葬儀に、{name}は遠くから立って見ていた。参列者は思ったよりずっと少なかった。',
    en: "{name} watched {nemesis}'s funeral from a distance. Far fewer people came than expected.",
    eff: { happy: -2, mind: 3 }, tie: { role: 'nemesis', d: 10 },
  },
  {
    id: 'fa.elder-familiar', stage: ['elder'], tags: F, w: 0.5, kind: 'family',
    ja: '暖炉の前で、{familiar}が{name}の膝に顎を載せて眠っている。どちらも、もう遠くへは行かない。',
    en: "By the fire, {familiar} sleeps with its chin on {name}'s knee. Neither of them goes far anymore.",
    eff: { happy: 4 }, tie: { role: 'familiar', d: 6 },
  },
  {
    id: 'fa.elder-grimoire', stage: ['elder'], tags: F, magic: 2, jobs: ['mage', 'necromancer', 'alchemist'], noFlag: 'grimoire', w: 0.6, kind: 'work',
    ja: '{name}は生涯の術をまとめた魔導書を書き上げた。最後の頁は白紙のまま残した。',
    en: "{name} finished a grimoire of a lifetime's spells and left the last page blank.",
    eff: { mind: 4, fame: 3 }, set: 'grimoire',
  },
  {
    id: 'fa.elder-priest', stage: ['elder'], tags: F, jobs: ['priest', 'saint'], w: 0.7, kind: 'old',
    ja: '{name}が昔洗礼を授けた子が、自分の孫を連れて同じ泉に来た。',
    en: 'A child {name} once baptized came to the same spring with a grandchild of their own.',
    eff: { happy: 5, charm: 2 },
  },
  {
    id: 'fa.elder-shop', stage: ['elder'], tags: F, flag: 'shop', w: 0.7, kind: 'old',
    ja: '{name}は店先の椅子に座っているだけになった。それでも常連は、{name}に挨拶してから品を選ぶ。',
    en: 'These days {name} only sits in the chair out front. Still, the regulars greet {name} before choosing their goods.',
    eff: { happy: 3, charm: 1 },
  },
  {
    id: 'fa.elder-smith', stage: ['elder'], tags: F, jobs: ['smith'], w: 0.7, kind: 'old',
    ja: '{name}は年に一本だけ剣を打つ。それを誰に売るかは、{name}が客の目を見て決める。',
    en: '{name} forges only one sword a year now, and decides who may buy it by looking the customer in the eye.',
    eff: { fame: 2, mind: 2 },
  },
  {
    id: 'fa.elder-farmer', stage: ['elder'], tags: ['fantasy', 'rural'], jobs: ['farmer', 'none'], w: 1, kind: 'old',
    ja: '{name}は畑の端の切り株に腰かけ、孫たちが麦を刈るのを見ていた。刈り方には、口を出さないことにしている。',
    en: '{name} sat on a stump at the edge of the field, watching the grandchildren cut the wheat. They have decided not to comment on the technique.',
    tie: { role: 'child', d: 2 },
    eff: { happy: 3 },
  },
  {
    id: 'fa.elder-lord', stage: ['elder'], tags: F, flag: 'lord', w: 0.7, kind: 'old',
    ja: '{name}が建てた字習いの小屋から、今年は領内で初めての書記が出た。',
    en: "This year, the letters hut {name} built produced the first scribe the fief has ever had.",
    eff: { happy: 4, fame: 2 },
  },
  {
    id: 'fa.elder-hero', stage: ['elder'], tags: F, flag: 'hero', w: 0.6, kind: 'old',
    ja: '若い騎士たちが勇者の墓を探して村に来た。{name}は「まだ生きている」とだけ言って、薪を割り続けた。',
    en: "Young knights came to the village looking for the hero's grave. {name} said only, \"Still alive,\" and went on splitting wood.",
    eff: { happy: 3, fame: 1 },
  },
  {
    id: 'fa.elder-saint', stage: ['elder'], tags: F, flag: 'saint', w: 0.6, kind: 'old',
    ja: '癒しの力はもうほとんど残っていない。それでも{name}の手を握りに、毎朝誰かが戸を叩く。',
    en: "Almost none of the healing power is left. Still, every morning someone knocks to hold {name}'s hand.",
    eff: { happy: 4, charm: 2 },
  },
  {
    id: 'fa.elder-soldier', stage: ['elder'], tags: F, jobs: ['soldier', 'knight', 'mercenary', 'none'], w: 0.6, kind: 'old',
    ja: '戦没者の慰霊の日、{name}は石碑に刻まれた同じ隊の名前を、指でひとつずつなぞった。',
    en: "On the day of remembrance, {name} traced each name from the old unit carved into the memorial stone.",
    eff: { mind: 2, happy: -2 },
  },
  {
    id: 'fa.elder-bard', stage: ['elder'], tags: F, jobs: ['bard'], w: 0.7, kind: 'old',
    ja: '{name}の歌を、今では若い吟遊詩人の方が上手に歌う。{name}はそれを聴くのが嫌いではない。',
    en: "Young bards now sing {name}'s songs better than {name} does. {name} does not mind listening.",
    eff: { happy: 3, fame: 2 },
  },
  {
    id: 'fa.elder-thief', stage: ['elder'], tags: F, jobs: ['thief', 'assassin', 'none'], flag: 'branded', w: 0.6, kind: 'old',
    ja: '肩の焼き印のことを、孫に訊かれた。{name}は「若い頃の勲章だ」とだけ答えた。',
    en: 'A grandchild asked about the brand on {name}\'s shoulder. {name} only said it was a medal from their youth.',
    tie: { role: 'child', d: 2 },
    eff: { happy: 2 },
  },
  {
    id: 'fa.elder-cook', stage: ['elder'], tags: F, jobs: ['cook'], w: 0.7, kind: 'old',
    ja: '{name}は煮込みの作り方を初めて紙に書いた。分量の欄は「だいたい」ばかりになった。',
    en: '{name} wrote down the stew recipe for the first time. Almost every measurement said "about."',
    eff: { happy: 2, mind: 1 },
  },
  {
    id: 'fa.elder-guild-visit', stage: ['elder'], tags: F, flag: 'guild', w: 0.6, kind: 'old',
    ja: '久しぶりにギルドに顔を出すと、若い受付は{name}の名前を知らなかった。古い台帳には、ちゃんと載っていた。',
    en: "Visiting the guild after many years, {name} found the young receptionist did not know their name. It was there in the old ledger, though.",
    eff: { happy: 1, mind: 1 },
  },
  {
    id: 'fa.elder-sea', stage: ['elder'], tags: ['sea'], not: NF, w: 0.7, kind: 'old',
    ja: '{name}は毎夕、港の端に座って入ってくる船の帆を数えた。帆の継ぎ方で、どこの船かわかる。',
    en: 'Every evening {name} sat at the end of the harbor counting the sails coming in. From the patching, they could tell where each ship was from.',
    eff: { happy: 3 },
  },
  {
    id: 'fa.elder-dark', stage: ['elder'], tags: ['dark'], not: NF, w: 0.7, kind: 'old',
    ja: 'この年まで生きた者は、{town}に{name}を入れて三人しかいない。三人は互いの戸口に毎朝塩をまく。',
    en: 'Only three people in {town} have lived this long, {name} among them. Every morning the three scatter salt on each other\'s doorsteps.',
    eff: { mind: 2, luck: 2 },
  },
  {
    id: 'fa.elder-desert', stage: ['elder'], tags: ['desert'], not: NF, w: 0.7, kind: 'old',
    ja: '{name}は日陰で、孫に星の名前と、それで砂の海を渡る方法を教えた。',
    en: '{name} sat in the shade teaching a grandchild the names of the stars and how to cross the sea of sand by them.',
    tie: { role: 'child', d: 2 },
    eff: { happy: 3, mind: 1 },
  },
  {
    id: 'fa.elder-myth', stage: ['elder'], tags: ['myth'], not: NF, w: 0.6, kind: 'old',
    ja: '若い頃に助けた白い狐が、今年も{name}の家の前に木の実を三つ置いていった。',
    en: 'The white fox {name} saved long ago left three nuts in front of the house again this year.',
    eff: { happy: 4, luck: 2 },
  },
  {
    id: 'fa.elder-beast', stage: ['elder'], tags: F, races: BEASTFOLK, w: 0.6, kind: 'old',
    ja: '耳の毛がすっかり白くなった。群れの若い者たちは、{name}の前を通る時に尾を低くする。',
    en: "The fur on {name}'s ears has gone completely white. The young ones of the pack lower their tails when they pass.",
    eff: { charm: 3, happy: 2 },
  },
  {
    id: 'fa.elder-gamey', stage: ['elder'], tags: ['gamey'], not: NF, w: 0.7, kind: 'old',
    ja: '見えている数字のうち、体力の欄だけが毎年少しずつ減っていく。{name}はもう、あまり見なくなった。',
    en: 'Of all the numbers {name} can see, only the stamina line shrinks a little each year. {name} rarely looks anymore.',
    eff: { hp: -2, mind: 2 },
  },
  {
    id: 'fa.elder-disciple-visit', stage: ['elder'], tags: F, flag: 'teacher', w: 0.7, kind: 'family',
    ja: '{disciple}が自分の弟子を三人連れて、{name}に挨拶に来た。{name}は三人の名前を一度で覚えた。',
    en: '{disciple} came to pay respects with three apprentices of their own. {name} learned all three names on the first try.',
    eff: { happy: 5 }, tie: { role: 'disciple', d: 8 },
  },
  {
    id: 'fa.elder-child-care', stage: ['elder'], tags: F, w: 0.8, kind: 'family',
    ja: '冬のあいだ、{child}が毎週、薪と黒パンを持って{name}の家に来た。',
    en: "All winter long, {child} came to {name}'s house every week with firewood and black bread.",
    eff: { happy: 4, hp: 1 }, tie: { role: 'child', d: 6 },
  },
];
