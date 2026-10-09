// 異世界転移 (arrival 'summoned') の材料: 来かた・元の世界の仕事・名前・持ち物。engine/hero.ts が引く。
// 来かたは flags 'tr.<how>'、持ち物は flags 'item.<id>' として立つので、出来事のデータは flag で条件にできる
import type { TransferHow } from '../engine/types';

// 来かた: [重み, 日本語, 英語]。{given} 名 / {age} 年齢 / {job} 元の仕事 / {place} 世界 / {town} 町 / {woke} 目を覚ました所
export const HOWS: Record<TransferHow, [number, string, string]> = {
  hero: [30, '{age}歳の{job}だった{given}は、足もとに広がった魔法陣に呑まれた。気づくと{town}の{woke}で、王たちが「勇者さま」と頭を下げていた。',
    '{given}, a {age}-year-old {job}, was swallowed by a magic circle that opened underfoot. {He} woke {woke} in {town}, where royalty bowed and called {him} "Hero".'],
  caught: [20, '{age}歳の{job}だった{given}は、隣にいた高校生の勇者召喚に巻き込まれた。{town}の{woke}で、神官たちは{given}を見て「……どなた？」と言った。',
    '{given}, a {age}-year-old {job}, got caught up in the summoning of the high schooler standing next to {him}. In {town}, the priests looked at {him} and said, "...And you are?"'],
  vanish: [20, '{age}歳の{job}だった{given}は、いつもの帰り道の角を曲がった。そこはもう{place}で、{town}の{woke}に立っていた。',
    '{given}, a {age}-year-old {job}, turned the usual corner on the way home. It was {place} on the other side. {He} was standing {woke} in {town}.'],
  class: [15, '{age}歳の{job}だった{given}は、教室ごと光に包まれた。気づくとクラス全員で{town}の{woke}に座っていて、誰かが「ステータス・オープン」と言った。',
    '{given}, a {age}-year-old {job}, was swallowed by light along with the entire classroom. The whole class woke {woke} in {town}, and someone said "Status open!"'],
  accident: [15, '{age}歳の{job}だった{given}は、{place}の見習い魔術師の失敗した召喚で呼ばれた。本当は使い魔を呼ぶつもりだったらしい。',
    '{given}, a {age}-year-old {job}, was pulled into {place} by an apprentice mage\'s botched spell. Apparently they had been trying to summon a familiar.'],
};

// 元の世界の仕事: [日本語, 英語, 下限の年齢, 上限の年齢, 符号]。符号は flags 'earth.<符号>' として立つ (出来事の条件に)
export const EARTH_JOBS: [string, string, number, number, string][] = [
  ['高校生', 'high school student', 15, 18, 'student'], ['大学生', 'college student', 18, 24, 'college'], ['会社員', 'office worker', 22, 45, 'office'],
  ['看護師', 'nurse', 22, 45, 'nurse'], ['料理人', 'cook', 18, 45, 'cook'], ['プログラマー', 'programmer', 20, 45, 'programmer'], ['農家', 'farmer', 18, 45, 'farmer'],
  ['自衛官', 'soldier in the Self-Defense Forces', 18, 45, 'sdf'], ['主婦', 'homemaker', 22, 45, 'home'], ['ニート', 'shut-in', 18, 45, 'neet'],
  ['教師', 'teacher', 23, 45, 'teacher'], ['経理', 'accountant', 22, 45, 'accountant'], ['配達員', 'delivery driver', 18, 45, 'delivery'],
  ['研究者', 'researcher', 24, 45, 'researcher'], ['コンビニ店員', 'convenience store clerk', 16, 45, 'clerk'], ['営業', 'salesperson', 22, 45, 'sales'],
  ['保育士', 'daycare worker', 20, 45, 'daycare'], ['ゲーム実況者', 'game streamer', 18, 40, 'streamer'], ['大工', 'carpenter', 18, 45, 'carpenter'],
  ['公務員', 'civil servant', 22, 45, 'civil'],
];

// 名前: [漢字, ローマ字]
export const FAMILY: [string, string][] = [
  ['佐藤', 'Sato'], ['鈴木', 'Suzuki'], ['高橋', 'Takahashi'], ['田中', 'Tanaka'], ['伊藤', 'Ito'], ['渡辺', 'Watanabe'], ['山本', 'Yamamoto'], ['中村', 'Nakamura'],
  ['小林', 'Kobayashi'], ['加藤', 'Kato'], ['吉田', 'Yoshida'], ['山田', 'Yamada'], ['松本', 'Matsumoto'], ['井上', 'Inoue'], ['木村', 'Kimura'], ['斎藤', 'Saito'],
];
export const GIVEN: Record<'F' | 'M', [string, string][]> = {
  F: [['陽菜', 'Hina'], ['結衣', 'Yui'], ['美咲', 'Misaki'], ['葵', 'Aoi'], ['さくら', 'Sakura'], ['真由美', 'Mayumi'], ['恵', 'Megumi'], ['彩', 'Aya'], ['千尋', 'Chihiro'], ['由紀', 'Yuki']],
  M: [['翔太', 'Shota'], ['健太', 'Kenta'], ['大輔', 'Daisuke'], ['蓮', 'Ren'], ['悠真', 'Yuma'], ['誠', 'Makoto'], ['拓也', 'Takuya'], ['直樹', 'Naoki'], ['一郎', 'Ichiro'], ['亮', 'Ryo']],
};

// 持ってきた物: [id, 日本語, 英語, 重み]
export const ITEMS: [string, string, string, number][] = [
  ['phone', 'スマホ', 'smartphone', 6], ['pen', 'ボールペン', 'ballpoint pen', 4], ['lighter', '百円ライター', 'disposable lighter', 3],
  ['umbrella', '折りたたみ傘', 'folding umbrella', 2], ['meds', '胃薬', 'stomach medicine', 2], ['snack', 'ポテトチップス', 'bag of potato chips', 3],
  ['book', '文庫本', 'paperback novel', 2], ['badge', '社員証', 'company ID card', 2], ['calc', '電卓', 'calculator', 1], ['knife', '十徳ナイフ', 'Swiss army knife', 1],
];
