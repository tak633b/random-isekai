// AI の返事を検める。1つでも引っかかった文は使わない (直して使うことはしない)。
// 合格した文は Hero を書き換えず、年表の後ろに足せる値 (ai 印つき) として返す。画面側が表示に混ぜる。
import type { LogEntry, YearKind } from '../engine';

// 検査の材料 (prompts.ts が頼むたびに作る)
export interface Check {
  known: string;   // 渡した事実の全文と、輪の全員・主人公の名
  dead: string[];  // この年より前に亡くなった人の名 (出てきたら、生きているように書いたとみなす)
  death: boolean;  // 死亡の記録への文か (死の語を許す。生き返りは許さない)
  en: boolean;     // 英語で頼んだか
}

export type AiEntry = LogEntry & { ai: true };
export interface AiWord { id: number; name: string; text: string; ai: true }
export interface AiDeath { words: AiWord[]; epitaph: string | null }

// 長さの上限 (字)。英語は同じ内容で日本語の2〜3倍の字数になる
export const MAX = { year: [160, 420], word: [90, 220], epitaph: [40, 100] } as const;

const DEATH_JA = /死ん|死ぬ|死な|死亡|死去|戦死|病死|事故死|討ち死|亡くな|息を引き取|命を落と|殺さ|殺し|殺す|殺め|殺され|絶命|逝っ|逝く|果てた/;
const DEATH_EN = /\b(?:die[sd]?|dying|dead|death|deaths|kill(?:s|ed|ing)?|slain|slew|murder\w*|perish\w*|passed away|lifeless)\b/i;
const REVIVE_JA = /生き返|蘇|甦|よみがえ|復活/;
const REVIVE_EN = /\b(?:reviv\w*|resurrect\w*|came back to life|back from the dead|rose from the (?:dead|grave))\b/i;
const NUM_WORD = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand';
const NUM_EN = new RegExp(`\\b(?:${NUM_WORD})(?:[- ](?:${NUM_WORD}))?(?:[- ]years?\\b|\\s+(?:summers|winters)\\b)|\\b(?:aged?|at)\\s+(?:${NUM_WORD})\\b`, 'i');
const NUM_JA = /[〇一二三四五六七八九十百千万]+(?:歳|才|年|人|枚|日)/g;

// カタカナ語のうち、名前でないよくある語。これ以外で渡していないカタカナ語は作った名前とみなす
const KATA_OK = new Set(('ギルド スライム ゴブリン オーク ドラゴン ダンジョン ポーション パン スープ ミルク チーズ ワイン エール ハーブ ランプ ローブ マント ナイフ ベッド テーブル ' +
  'ドア カップ スプーン ステータス スキル レベル ランク クエスト パーティ パーティー モンスター エルフ ドワーフ ゴーレム ゾンビ スケルトン ' +
  'メイド シスター コーヒー ベンチ ホーム ビル ネオン データ ネット ロボット ドローン コロニー シャワー ガラス バス タバコ ケーキ リンゴ').split(' '));
// 英語で、文頭なら大文字で始まってよい語
const STARTERS = new Set(('the a an and but or so yet then when while after before as at by for from in into of on onto over under with without ' +
  'she he they it its his her their there here we you your my our i this that these those each every some no not only even still later once ' +
  'though although if because since until what where why how all both most one nobody someone everyone nothing something everything ' +
  'thank thanks goodbye farewell rest sleep remember forgive go look listen wait come stay never always sometimes perhaps maybe yes ' +
  'again too just now soon long once outside inside above below near beyond through across around during against between among ' +
  'here lies beloved born loved died gone home').split(' '));
// 呼びかけとしてよく大文字になる語
const TITLES = new Set('mother father mom dad mama papa grandma grandpa sir lady lord master teacher god gods'.split(' '));

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 英字の名前は単語として、それ以外は文字列として探す
const mentions = (t: string, n: string) => (/^[\x20-\x7e]+$/.test(n) ? new RegExp(`\\b${escRe(n)}\\b`, 'i').test(t) : t.includes(n));

// 文字列として取り出す。タグを取り除き、長すぎるものは使わない (途中で切ると文が壊れるため)
export function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.normalize('NFKC').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t && t.length <= max ? t : null;
}

function inventedName(t: string, c: Check): string | null {
  const k = c.known;
  if (!c.en) {
    for (const w of t.match(/[ァ-ヴ][ァ-ヴー]+/g) ?? []) if (!k.includes(w) && !KATA_OK.has(w)) return w;
    // 漢字の名前は形で見分けられないので、敬称の付いた呼び方だけ見る。ponytail: 敬称なしの漢字の新しい名前は通る
    for (const m of t.matchAll(/([一-龯々]{1,4})(?:さん|様|殿|くん|君|ちゃん)/g)) if (!k.includes(m[1])) return m[1];
    return null;
  }
  const words = new Set((k.match(/[A-Za-z']+/g) ?? []).map((w) => w.toLowerCase()));
  for (const s of t.split(/(?<=[.!?:;])\s+|["“”]\s*/)) {
    const ws = s.split(/\s+/).map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, '').replace(/'s$/, '')).filter(Boolean);
    for (const [i, w] of ws.entries()) {
      if (!/^[A-Z][a-z]/.test(w)) continue;
      const lw = w.toLowerCase();
      if (words.has(lw) || TITLES.has(lw) || (i === 0 && STARTERS.has(lw))) continue;
      return w;
    }
  }
  return null;
}

function inventedNumber(t: string, c: Check): string | null {
  const known = new Set(c.known.normalize('NFKC').match(/\d+/g) ?? []);
  const d = (t.match(/\d+/g) ?? []).find((n) => !known.has(n));
  if (d) return d;
  if (c.en) return t.match(NUM_EN)?.[0] ?? null;
  return (t.match(NUM_JA) ?? []).find((w) => !c.known.includes(w)) ?? null;
}

// 使えない理由。使えるなら null。理由はテストと画面の短い説明に使う
export function problem(raw: string, c: Check): string | null {
  const t = raw.normalize('NFKC');
  if (c.en ? /[぀-ヿ一-鿿]/.test(t) : !/[぀-ヿ]/.test(t)) return 'lang';
  if (!c.death && (c.en ? DEATH_EN : DEATH_JA).test(t)) return 'death';
  if ((c.en ? REVIVE_EN : REVIVE_JA).test(t)) return 'revive';
  if (c.dead.some((n) => n && mentions(t, n))) return 'dead-name';
  if (inventedName(t, c)) return 'name';
  if (inventedNumber(t, c)) return 'number';
  return null;
}

const obj = (raw: unknown) => (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
const pass = (v: unknown, max: number, c: Check) => {
  const t = clean(v, max);
  return t && !problem(t, c) ? t : null;
};
const lim = (m: readonly [number, number], c: Check) => m[c.en ? 1 : 0];

// (1) その年の細部。kind はその年の色 (h.kinds[age])
export function sanitizeYear(raw: unknown, c: Check, age: number, kind: YearKind): AiEntry | null {
  const text = pass(obj(raw).text, lim(MAX.year, c), c);
  return text ? { age, text, kind, ai: true } : null;
}

// (2)(3) 最後の言葉と墓碑銘。言葉は頼んだ人 (speakers) の id のものだけ、1人1つ
export function sanitizeDeath(raw: unknown, c: Check, who: { id: number; name: string }[]): AiDeath {
  const o = obj(raw);
  const words: AiWord[] = [];
  for (const w of Array.isArray(o.words) ? o.words : []) {
    const x = obj(w);
    const p = who.find((s) => s.id === Number(x.id));
    const text = p && !words.some((y) => y.id === p.id) ? pass(x.text, lim(MAX.word, c), c) : null;
    if (p && text) words.push({ id: p.id, name: p.name, text, ai: true });
  }
  const ep = typeof o.epitaph === 'string' && /[\r\n]/.test(o.epitaph.trim()) ? null : pass(o.epitaph, lim(MAX.epitaph, c), c);
  return { words, epitaph: ep };
}
