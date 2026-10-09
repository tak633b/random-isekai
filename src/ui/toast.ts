// 小さな知らせ (実績の解除など)。画面の下の端に数秒だけ出す。スクリーンリーダーには aria-live で伝える。
// reduced-motion なら動かさずに出して消す
import { esc } from './dom';

const HOLD_MS = 4200;
let box: HTMLElement | null = null;

export function toast(title: string, body = ''): void {
  if (!box || !box.isConnected) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.append(box);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b>${esc(title)}</b>${body ? `<small>${esc(body)}</small>` : ''}`;
  box.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, HOLD_MS);
}

// 画面を移るときに消す (前の画面の知らせが次の画面に重ならないように)
export function clearToasts(): void { box?.replaceChildren(); }
