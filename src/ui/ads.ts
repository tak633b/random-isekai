// 広告 (Google AdSense)。出すのは タイトル・死亡記録の下・過去の人生の一覧・図鑑 の4か所だけ。
// 生きている途中・戦い・選択肢・ダイアログには出さない (遊びの邪魔と誤クリックを避ける。AdSense の方針)。
// ID はビルド時の環境変数から。VITE_ADSENSE_CLIENT か枠の ID が無ければ何も出さない。
// adsbygoogle.js の読み込みは vite.config.ts が index.html の <head> に足す (同意の管理は Google の「プライバシーとメッセージ」が同じタグで行う)。
// VITE_ADS_PLACEHOLDER=1 のときは、開発と E2E 用に枠の位置だけを灰色の箱で出す (Google には何も送らない)
import { L } from '../i18n';

export type AdPlace = 'title' | 'death' | 'past' | 'collection';

const env = import.meta.env;
// 形の違う値はビルドの誤りとみなして使わない (HTML に入れるので)
const CLIENT = /^ca-pub-\d{10,20}$/.test(env.VITE_ADSENSE_CLIENT ?? '') ? env.VITE_ADSENSE_CLIENT as string : '';
const SLOTS: Record<AdPlace, string> = {
  title: env.VITE_ADSENSE_SLOT_TITLE ?? '',
  death: env.VITE_ADSENSE_SLOT_DEATH ?? '',
  past: env.VITE_ADSENSE_SLOT_PAST ?? '',
  collection: env.VITE_ADSENSE_SLOT_COLLECTION ?? '',
};
const PLACEHOLDER = env.VITE_ADS_PLACEHOLDER === '1';
const BOX = 'display:block;margin:2.5em auto 1em;max-width:728px;text-align:center';

/** 広告の枠の HTML。出さないときは空文字 */
export function adHTML(place: AdPlace): string {
  const label = `<small style="display:block;opacity:.6;font-size:.75em">${L('広告', 'Advertisement')}</small>`;
  if (PLACEHOLDER) {
    return `<aside class="adslot" data-ad="${place}" style="${BOX}">${label}<div style="border:1px dashed #888;min-height:90px;display:grid;place-items:center;opacity:.6">AD (${place})</div></aside>`;
  }
  const slot = SLOTS[place];
  if (!CLIENT || !/^\d{5,20}$/.test(slot)) return '';
  return `<aside class="adslot" data-ad="${place}" style="${BOX}">${label}<ins class="adsbygoogle" style="display:block" data-ad-client="${CLIENT}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
}

// 画面は #app の innerHTML を入れ替えて作るので、新しく現れた枠を見つけて1回ずつ埋める
type AdsWindow = Window & { adsbygoogle?: unknown[] };
if (CLIENT && !PLACEHOLDER && typeof MutationObserver !== 'undefined') {
  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(() => {
      for (const ins of app.querySelectorAll<HTMLElement>('ins.adsbygoogle:not([data-filled])')) {
        ins.dataset.filled = '1';
        try { ((window as AdsWindow).adsbygoogle ??= []).push({}); } catch { /* 広告が出なくても遊びは続ける */ }
      }
    }).observe(app, { childList: true, subtree: true });
  }
}
