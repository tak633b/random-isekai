// タイトルのアカウントの欄: Google でログイン / 「記録はアカウントに保存されています」・ログアウト・アカウントを消す。
// ログインのボタンは Google Identity Services (accounts.google.com/gsi/client) が描く。読み込むのはこの欄を出すときだけ
import { L, lang } from '../i18n';
import { accountEnabled, accountState, deleteAccount, googleClientId, signIn, signOut, watchAccount } from '../net/account';
import { toast } from './toast';

const GIS = 'https://accounts.google.com/gsi/client';
type Gis = { accounts: { id: {
  initialize(o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: 'popup' }): void;
  renderButton(el: HTMLElement, o: Record<string, string | number>): void;
} } };
const gis = (): Gis | undefined => (window as unknown as { google?: Gis }).google;

let loading: Promise<boolean> | null = null;
function loadGis(): Promise<boolean> {
  loading ??= new Promise((ok) => {
    const s = document.createElement('script');
    s.src = GIS;
    s.async = true;
    s.onload = () => {
      gis()?.accounts.id.initialize({ client_id: googleClientId, ux_mode: 'popup', callback: (r) => { if (r.credential) void signIn(r.credential).then((y) => toast(y ? L('ログインした', 'Signed in') : L('ログインできなかった', 'Could not sign in'))); } });
      ok(true);
    };
    s.onerror = () => { loading = null; ok(false); };
    document.head.appendChild(s);
  });
  return loading;
}

let asking = false; // 「消す?」の確かめを出しているか
const box = (): HTMLElement | null => document.getElementById('account');

/** タイトルに置く欄の入れ物。ログインを出さないビルドでは空文字 */
export const accountHTML = (): string => (accountEnabled ? '<section id="account" class="account" aria-live="polite"></section>' : '');

/** 欄の中身を今の状態で描く (タイトルを描いた後と、状態が変わったとき) */
export function paintAccount(): void {
  const el = box();
  if (!el) return;
  const s = accountState();
  if (!s.signedIn) {
    asking = false;
    el.innerHTML = `<p>${L('ログインすると、チケット・解放・図鑑・実績を別の端末でも引き継げる。ログインしなくても遊べる。', 'Sign in to carry your tickets, unlocks, collection and achievements to other devices. You can play without signing in.')}</p>
      <div class="gsi"></div>${s.error ? `<small class="bad">${L('うまくいかなかった。あとでもう一度。', 'Something went wrong. Try again later.')}</small>` : ''}`;
    void loadGis().then((y) => {
      const slot = box()?.querySelector<HTMLElement>('.gsi');
      if (y && slot && !accountState().signedIn) gis()?.accounts.id.renderButton(slot, { type: 'standard', theme: 'filled_black', size: 'medium', text: 'signin_with', locale: lang });
    });
    return;
  }
  el.innerHTML = `<p>${s.syncing ? L('記録を合わせています…', 'Syncing your records…') : L('記録はアカウントに保存されています', 'Your records are saved to your account')}${s.error ? ` <small class="bad">${L('(今は送れていない。次に記録が変わったときにまた送る)', '(Could not sync just now. It will retry on the next change.)')}</small>` : ''}</p>
    ${asking
      ? `<p>${L('アカウントと、サーバーにある記録を消す? この端末の記録は残る。元に戻せない。', 'Delete your account and the records on our server? The records on this device stay. This cannot be undone.')}</p>
         <div class="choices"><button data-acct="delete-yes" class="primary">${L('消す', 'Delete')}</button><button data-acct="delete-no">${L('やめる', 'Cancel')}</button></div>`
      : `<div class="choices"><button data-acct="logout">${L('ログアウト', 'Sign out')}</button><button data-acct="delete">${L('アカウントを消す', 'Delete account')}</button></div>`}`;
  if (asking) el.querySelector<HTMLElement>('[data-acct="delete-no"]')?.focus();
}

watchAccount(paintAccount);

/** タイトルのクリックのうち、この欄のもの。扱ったら true */
export function accountClick(t: HTMLElement): boolean {
  const a = t.closest<HTMLElement>('[data-acct]')?.dataset.acct;
  if (!a) return false;
  if (a === 'logout') void signOut().then(() => toast(L('ログアウトした。記録はこの端末に残っている', 'Signed out. Your records stay on this device')));
  if (a === 'delete' || a === 'delete-no') { asking = a === 'delete'; paintAccount(); }
  if (a === 'delete-yes') { asking = false; void deleteAccount().then((y) => toast(y ? L('アカウントを消した', 'Account deleted') : L('消せなかった', 'Could not delete'))); }
  return true;
}
