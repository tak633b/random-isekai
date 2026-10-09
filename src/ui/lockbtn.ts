// まだ解放していない選択肢のボタン (設定の画面と、スキルの組み立てで使う)
import type { UnlockKey } from '../meta/types';
import { isSeen, priceOf } from '../meta/unlocks';
import { lockIcon } from './labels';
import { esc } from './dom';
import { L } from '../i18n';

// まだ解放していない選択肢: 鍵と値段 (おまかせの人生で見たものは値引きの印)。押すと解放するか尋ねる
export function lockedBtn(key: UnlockKey, label: string, cls = ''): string {
  const price = priceOf(key) ?? 0, seen = isSeen(key);
  return `<button type="button" class="locked ${cls}" data-unlock="${esc(key)}" data-label="${esc(label)}" aria-label="${esc(L(`${label}(未解放・チケット${price}枚)`, `${label} (locked, ${price} tickets)`))}">${lockIcon()} ${esc(label)} <small class="price${seen ? ' seen' : ''}">${seen ? L('見た・', 'seen · ') : ''}${price}</small></button>`;
}
