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
export const L = (ja: string, en: string): string => (isEn ? en : ja);

// データに {ja, en} の組で持っている文を、今の言語で
export interface Text { ja: string; en: string }
export const T = (t: Text): string => (isEn ? t.en : t.ja);

export function setLang(next: Lang): void {
  try { localStorage.setItem('lang', next); } catch { /* 保存できなくても今回だけは切り替える */ }
  location.reload();
}
