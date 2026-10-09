// 世界ごとのお金と、価値のあるもの (engine/econ.ts)。中の単位は1つ (コイン。暮らし向き 1 = 100 コイン)。
// rate はコイン1枚がその世界の最小の単位いくつか。coins は大きい順の [日本語, 英語, 最小の単位でいくつ]。表示は上の2つまで
// healers は [安い, 高い] 治療、gear は武具の3段、lender は借りる先、shady は危ない借り先。書き足すときは同じ形で
import type { WorldId } from '../engine/types';

type T = [string, string];
export interface WorldMoney {
  rate: number;
  coins: [string, string, number][];
  symbol?: string;          // 数字の後ろに付ける記号 (ゴールドの G など)。あれば coins の代わりにこれで書く
  valuables: T[];           // その世界で値打ちのあるもの (文に出る)
  lender: T;
  shady: T;
  healers: [T, T];
  gear: [T, T, T];
  luxury: T;                // 家・馬・飛行船など、暮らしの贅沢
  gamble: T;
  land: T;                  // 貴族の収入の呼び名 (領地収入・石高 …)
  kidnap: T;                // 人をさらって身代金を求める者
}

export const MONEY: Record<WorldId, WorldMoney> = {
  medieval: { rate: 1, coins: [['金貨', 'gold', 10000], ['銀貨', 'silver', 100], ['銅貨', 'copper', 1]],
    valuables: [['宝石', 'gems'], ['魔石', 'mana stones']], lender: ['商人ギルド', "the Merchants' Guild"], shady: ['裏通りの金貸し', 'a back-alley moneylender'],
    healers: [['薬師の煎じ薬', "an herbalist's brew"], ['神殿の治癒魔法', 'healing magic at the temple']],
    gear: [['革鎧と鉄の剣', 'leather armor and an iron sword'], ['鎖帷子と鋼の剣', 'chainmail and a steel blade'], ['ミスリルの鎧', 'mithril armor']],
    luxury: ['栗毛の馬', 'a chestnut horse'], gamble: ['酒場のサイコロ', 'tavern dice'], land: ['領地収入', 'income from the estate'], kidnap: ['山賊', 'bandits'] },
  dark: { rate: 1, coins: [['黒銀貨', 'black silver', 100], ['鉄片', 'iron bits', 1]],
    valuables: [['血の契約で鋳た黒銀', 'black silver minted by blood pact'], ['聖遺物', 'holy relics']], lender: ['教会の喜捨箱', "the Church's alms chest"], shady: ['血の契約の金貸し', 'a blood-pact lender'],
    healers: [['床屋の瀉血', "a barber's bloodletting"], ['聖騎士団の秘蹟', "the Holy Order's sacrament"]],
    gear: [['錆びた鎖帷子', 'rusted mail'], ['聖別された剣', 'a consecrated blade'], ['銀の甲冑', 'silvered plate']],
    luxury: ['城壁の内の家', 'a house inside the walls'], gamble: ['骨のサイコロ', 'knucklebone dice'], land: ['領地の年貢', 'the fief\'s tithes'], kidnap: ['人狩りの騎士団', 'man-hunting knights'] },
  game: { rate: 1, coins: [], symbol: 'G',
    valuables: [['レアドロップ', 'rare drops'], ['スキルの書', 'skill scrolls']], lender: ['冒険者ギルド', "the Adventurers' Guild"], shady: ['課金おじさんの金貸し', 'a whale who lends'],
    healers: [['回復ポーション', 'healing potions'], ['教会の蘇生サービス', 'the church\'s revival service']],
    gear: [['ブロンズ装備', 'bronze gear'], ['シルバー装備 (+3)', 'silver gear (+3)'], ['伝説の装備セット', 'the legendary gear set']],
    luxury: ['マイホーム (家具つき)', 'a player house (furnished)'], gamble: ['カジノのスロット', 'casino slots'], land: ['領地クエストの報酬', 'domain quest rewards'], kidnap: ['誘拐イベントのNPC', 'kidnapper NPCs'] },
  academy: { rate: 1, coins: [['金貨', 'gold', 10000], ['銀貨', 'silver', 100], ['銅貨', 'copper', 1]],
    valuables: [['学園ポイント', 'academy points'], ['家紋入りの推薦状', 'crested letters of recommendation']], lender: ['実家', 'the family'], shady: ['購買部の裏の金貸し', 'the lender behind the school store'],
    healers: [['保健室の薬', 'the infirmary\'s medicine'], ['宮廷魔術師の治療', 'treatment by the court mage']],
    gear: [['練習用の杖', 'a practice wand'], ['家伝の剣', 'an heirloom sword'], ['特注の魔導具', 'a custom arcane device']],
    luxury: ['舞踏会のドレスと馬車', 'a ball gown and carriage'], gamble: ['寮の賭けカード', 'dormitory card games'], land: ['領地収入', 'income from the estate'], kidnap: ['没落貴族の一味', 'a ruined noble\'s gang'] },
  wa: { rate: 4, coins: [['両', 'ryō', 4000], ['文', 'mon', 1]],
    valuables: [['米俵', 'bales of rice'], ['名刀', 'famous blades']], lender: ['両替商', 'the money changer'], shady: ['高利の座頭金', 'a usurious zatō lender'],
    healers: [['町医者の薬', "a town doctor's medicine"], ['御典医の診立て', 'the shogunate physician']],
    gear: [['胴丸と打刀', 'dōmaru armor and a sword'], ['具足一式', 'a full suit of armor'], ['名工の刀', "a master smith's blade"]],
    luxury: ['町屋', 'a townhouse'], gamble: ['丁半博打', 'chō-han dice'], land: ['石高', 'the rice stipend'], kidnap: ['かどわかしの一味', 'kidnappers'] },
  xianxia: { rate: 1, coins: [['上品霊石', 'high-grade spirit stones', 10000], ['中品霊石', 'mid-grade spirit stones', 100], ['下品霊石', 'low-grade spirit stones', 1]],
    valuables: [['丹薬', 'elixirs'], ['霊草', 'spirit herbs']], lender: ['宗門の宝庫', "the sect's treasury"], shady: ['魔道の高利貸し', 'a demonic-path usurer'],
    healers: [['回気丹', 'a qi-restoring pill'], ['九転還魂丹', 'a ninefold soul-return elixir']],
    gear: [['下品の飛剣', 'a low-grade flying sword'], ['中品の法宝', 'a mid-grade magic treasure'], ['霊器の衣', 'a spirit-artifact robe']],
    luxury: ['洞府', 'a cave abode'], gamble: ['賭石', 'stone gambling'], land: ['宗門の俸禄', 'the sect stipend'], kidnap: ['魔道の宗門', 'a demonic sect'] },
  steampunk: { rate: 1, coins: [['ポンド', 'pounds', 240], ['ペニー', 'pence', 1]],
    valuables: [['真鍮の歯車券', 'brass cog-notes'], ['魔導炉の欠片', 'arcane furnace shards']], lender: ['ギルド銀行', 'the Guild Bank'], shady: ['煙突裏の質屋', 'the pawnbroker behind the chimneys'],
    healers: [['薬局の丸薬', 'pharmacy pills'], ['蒸気診療所の手術', 'surgery at the steam clinic']],
    gear: [['革のコートと拳銃', 'a leather coat and pistol'], ['真鍮の防護服', 'a brass protective suit'], ['魔導義手', 'an arcane prosthetic arm']],
    luxury: ['自家用の蒸気自動車', 'a private steam car'], gamble: ['競馬', 'horse racing'], land: ['工場の配当', 'factory dividends'], kidnap: ['煙突裏のギャング', 'chimney-side gangsters'] },
  cyberpunk: { rate: 10, coins: [], symbol: '¢',
    valuables: [['データ', 'data'], ['義体パーツ', 'cyberware parts']], lender: ['企業金融', 'corporate finance'], shady: ['ヤミ金のフィクサー', 'a loan-shark fixer'],
    healers: [['闇医者', 'a back-alley ripperdoc'], ['企業病院の医療ポッド', 'a corporate hospital pod']],
    gear: [['防弾ジャケット', 'a ballistic jacket'], ['皮下装甲', 'subdermal armor'], ['軍用の義体', 'military-grade cyberware']],
    luxury: ['眺めのいい高層の部屋', 'a high-rise apartment with a view'], gamble: ['地下のネット賭博', 'underground net betting'], land: ['株の配当', 'stock dividends'], kidnap: ['企業の回収部隊', 'a corporate retrieval squad'] },
  space: { rate: 10, coins: [], symbol: 'GC',
    valuables: [['燃料', 'fuel'], ['航路の権利', 'route rights']], lender: ['帝国銀行', 'the Imperial Bank'], shady: ['密輸船の金貸し', "a smuggler's lender"],
    healers: [['船医の応急処置', "the ship's medic"], ['医療ポッド', 'a medical pod']],
    gear: [['与圧服', 'a pressure suit'], ['シールド発生器', 'a shield generator'], ['動力装甲', 'powered armor']],
    luxury: ['小型宇宙船', 'a small starship'], gamble: ['ゼロG賭博', 'zero-g gambling'], land: ['星系の領地収入', 'income from a star system'], kidnap: ['宇宙海賊', 'space pirates'] },
  modern: { rate: 200, coins: [['万円', '0,000 yen', 10000], ['円', 'yen', 1]],
    valuables: [['魔石', 'mana stones'], ['ダンジョン産の素材', 'dungeon materials']], lender: ['銀行', 'the bank'], shady: ['消費者金融', 'a payday lender'],
    healers: [['ドラッグストアの薬', 'drugstore medicine'], ['探索者専門の病院', 'a hospital for delvers']],
    gear: [['防刃ベスト', 'a stab vest'], ['ダンジョン産の剣', 'a dungeon-forged sword'], ['Sランク素材の装備', 'S-rank material gear']],
    luxury: ['タワーマンション', 'a tower apartment'], gamble: ['競馬と宝くじ', 'horse races and the lottery'], land: ['不動産収入', 'rental income'], kidnap: ['探索者崩れの犯罪者', 'criminal ex-delvers'] },
  postapoc: { rate: 1, coins: [['弾薬', 'rounds', 10], ['缶詰', 'cans', 1]],
    valuables: [['きれいな水', 'clean water'], ['抗生物質', 'antibiotics']], lender: ['集落の倉庫番', 'the settlement quartermaster'], shady: ['略奪団の取り立て屋', "a raider gang's collector"],
    healers: [['煮沸した布と酒', 'boiled rags and liquor'], ['戦前の薬', 'pre-war medicine']],
    gear: [['鉄板の胸当て', 'a scrap-metal chestplate'], ['戦前のライフル', 'a pre-war rifle'], ['動力服の残骸', 'salvaged power armor']],
    luxury: ['井戸のある家', 'a house with a well'], gamble: ['ネズミ競争', 'rat racing'], land: ['集落の上納', 'the settlement\'s tribute'], kidnap: ['略奪団', 'raiders'] },
  ocean: { rate: 1, coins: [['真珠', 'pearls', 100], ['貝貨', 'shell coins', 1]],
    valuables: [['真珠', 'pearls'], ['海図', 'sea charts']], lender: ['港の商会', 'the harbor trading house'], shady: ['海賊の金貸し', "a pirate lender"],
    healers: [['海藻の膏薬', 'seaweed poultices'], ['人魚の歌の治癒', 'healing by mermaid song']],
    gear: [['鮫皮の胴着', 'a sharkskin vest'], ['珊瑚の槍', 'a coral spear'], ['海竜の鱗の鎧', 'sea-dragon scale armor']],
    luxury: ['自分の帆船', 'a ship of one\'s own'], gamble: ['貝の当てっこ', 'shell games'], land: ['島の年貢', 'island tribute'], kidnap: ['海賊', 'pirates'] },
  desert: { rate: 1, coins: [['金の砂', 'gold dust', 1000], ['塩の塊', 'salt blocks', 1]],
    valuables: [['水の権利', 'water rights'], ['香辛料', 'spices']], lender: ['隊商の長', 'the caravan master'], shady: ['砂賊の金貸し', 'a sand-raider lender'],
    healers: [['乳香の煙', 'frankincense smoke'], ['オアシスの神殿の治療', 'treatment at the oasis temple']],
    gear: [['布の鎧と曲刀', 'cloth armor and a scimitar'], ['鎖の上衣', 'a mail shirt'], ['精霊の宿る短剣', 'a djinn-bound dagger']],
    luxury: ['駱駝の群れ', 'a herd of camels'], gamble: ['砂盤の賭け', 'sand-board wagers'], land: ['井戸の水代', 'well fees'], kidnap: ['砂賊', 'sand raiders'] },
  beast: { rate: 1, coins: [['毛皮', 'pelts', 50], ['獲物の牙', 'trophy fangs', 1]],
    valuables: [['獲物の牙', 'trophy fangs'], ['毛皮', 'pelts']], lender: ['群れの長老', 'the pack elder'], shady: ['人間の行商人', 'a human peddler'],
    healers: [['薬草の噛み薬', 'chewed herbs'], ['巫女の祈り', "the shaman's prayer"]],
    gear: [['骨の槍', 'a bone spear'], ['大熊の毛皮の鎧', 'great-bear hide armor'], ['森の主の牙の首飾り', 'a necklace of the forest lord\'s fang']],
    luxury: ['大樹の上の巣', 'a nest in the great tree'], gamble: ['木の実の当て遊び', 'nut-guessing games'], land: ['縄張りの貢ぎ物', 'territory tribute'], kidnap: ['よその群れ', 'a rival pack'] },
  myth: { rate: 1, coins: [['黄金の羊毛', 'golden fleece', 10000], ['銀の杯', 'silver cups', 100], ['青銅', 'bronze', 1]],
    valuables: [['神殿への奉納', 'offerings to the temple'], ['神託', 'oracles']], lender: ['神殿の宝物庫', 'the temple treasury'], shady: ['冥府の渡し守の金貸し', "the ferryman's lender"],
    healers: [['神官の薬草', "a priest's herbs"], ['神の泉', 'the god\'s spring']],
    gear: [['青銅の盾', 'a bronze shield'], ['神鍛冶の剣', 'a god-forged sword'], ['英雄の鎧', 'a hero\'s armor']],
    luxury: ['戦車と二頭の白馬', 'a chariot and two white horses'], gamble: ['神託の賭け', 'oracle wagers'], land: ['神殿領の実り', 'temple-land harvests'], kidnap: ['冥府の使い', 'envoys of the underworld'] },
  frontier: { rate: 1, coins: [['砂金', 'gold dust', 1000], ['毛皮', 'furs', 10], ['銅貨', 'copper', 1]],
    valuables: [['土地の権利', 'land claims'], ['毛皮', 'furs']], lender: ['開拓団の金庫', 'the settlers\' fund'], shady: ['よそ者の山師', 'a drifting speculator'],
    healers: [['村の産婆の薬', "the village midwife's remedies"], ['町の治癒師', 'a healer in town']],
    gear: [['猟銃と斧', 'a hunting gun and an axe'], ['鉄の胸当て', 'an iron breastplate'], ['魔獣の革の外套', 'a monster-hide coat']],
    luxury: ['広い畑と牛', 'broad fields and cattle'], gamble: ['酒場のカード', 'saloon cards'], land: ['開墾地の実り', 'harvests from cleared land'], kidnap: ['ならず者', 'outlaws'] },
};
