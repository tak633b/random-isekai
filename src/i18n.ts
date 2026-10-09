// 表示の言語。日本語と英語。切り替えは保存してから読み込み直す。
// 内部の値 (種族・身分・死因の種類など) は英字の id で持ち、表示の時だけ訳す。
export type Lang = 'ja' | 'en';

function detect(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ja' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'ja'; // テスト(node)では日本語
  }
}

export const lang: Lang = detect();
export const isEn = lang === 'en';

// 日本語と英語を並べて書き、今の言語の方を返す
// 英語の a / an を後ろの語で直す。職業や種族を差し込む文が多く、書く側では決められないため
// (母音で始まる語と 8・11・18 の前は an。uni- / use で始まる語は a のまま)
export const an = (s: string): string => s.replace(/\b([Aa]) (?=[aeioAEIO]|[uU](?!ni|se|su|ro|ti)|8|11\b|18\b)/g, '$1n ');
export const L = (ja: string, en: string): string => (isEn ? an(en) : ja);

// データに {ja, en} の組で持っている文を、今の言語で
export interface Text { ja: string; en: string }
export const T = (t: Text): string => (isEn ? an(t.en) : t.ja);

// 英語の代名詞。性別の分かる人は she / he で呼ぶ (they は性別の分からない人だけ)。英語の側の文でだけ使う
export type Pronoun = 'he' | 'him' | 'his' | 'himself';
const PRONOUNS: Record<'F' | 'M', Record<Pronoun, string>> = {
  F: { he: 'she', him: 'her', his: 'her', himself: 'herself' },
  M: { he: 'he', him: 'him', his: 'his', himself: 'himself' },
};
export const pron = (sex: 'F' | 'M' | undefined, p: Pronoun): string => (sex ? PRONOUNS[sex][p] : { he: 'they', him: 'them', his: 'their', himself: 'themselves' }[p]);
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
// 英語の序数 (1st 2nd 3rd 4th … 11th 12th 13th 21st)
export const ordinal = (k: number): string => `${k}${k % 10 === 1 && k % 100 !== 11 ? 'st' : k % 10 === 2 && k % 100 !== 12 ? 'nd' : k % 10 === 3 && k % 100 !== 13 ? 'rd' : 'th'}`;

export function setLang(next: Lang): void {
  try { localStorage.setItem('lang', next); } catch { /* 保存できなくても今回だけは切り替える */ }
  location.reload();
}
