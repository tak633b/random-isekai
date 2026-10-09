// 共有の追悼館: ほかの人が残した人生の一覧と1件の詳細、ろうそく。サーバが無い所では案内だけを出す
import { WORLDS, RACES } from '../engine';
import { getMemorial, listMemorial, lightCandle, memorialAvailable, reportMemorial, type MemorialEntry } from '../net/memorial';
import { sceneHTML, paintAll } from './pixel';
import { ROLE_NAME, ageText, endAge, endAgeShort } from './labels';
import { esc, load, save } from './dom';
import { screen, setBack, type Nav } from './nav';
import { markGifts } from './records';
import { genWord } from './lineage';
import { L, T, lang } from '../i18n';

const LIT = 'candles-lit';
const PAGE = 12;
const lit = (): number[] => load<number[]>(LIT, []);

export const memorialOffHTML = (): string =>
  `<p class="note memorial-off">${L('サーバーで動かすと、ほかの人の人生も読める共有の追悼館が使えます (npm run build のあと npm start)。', 'Run it on a server to use the shared memorial, where you can read other people\'s lives (npm run build, then npm start).')}</p>`;

const worldName = (e: MemorialEntry) => (WORLDS[e.world] ? T(WORLDS[e.world].name) : e.world);
const raceName = (e: MemorialEntry) => (RACES[e.race] ? T(RACES[e.race].name) : e.race);
const scene = (e: MemorialEntry) => (e.scene ? sceneHTML(e.scene, L('墓の場面', 'Grave')) : '');

// 数はサーバから来るので、HTML に入れる前に数にしておく
const num = (e: MemorialEntry): MemorialEntry => ({ ...e, id: Number(e.id), age: Number(e.age), candles: Number(e.candles),
  gen: Math.max(1, Math.floor(Number(e.gen ?? 1)) || 1), lineage: Array.isArray(e.lineage) ? e.lineage.map(String) : [],
  highlights: (e.highlights ?? []).map((h) => ({ age: Number(h.age), text: String(h.text) })), lastWith: e.lastWith ?? [] });

function itemHTML(e: MemorialEntry): string {
  return `<li><button data-id="${e.id}">${scene(e)}<span><b>${esc(e.name)}</b><small>${esc(worldName(e))}${L('・', ' · ')}${endAgeShort(e.age, e.hazard)}${e.gen && e.gen > 1 ? `${L('・', ' · ')}${esc(genWord(e.gen))}` : ''}</small>
    <small>${esc(e.causeLabel)}</small><small class="candles">${L(`ろうそく ${e.candles}`, `${e.candles} ${e.candles === 1 ? 'candle' : 'candles'}`)}</small></span></button></li>`;
}

function detailHTML(e: MemorialEntry): string {
  const done = lit().includes(e.id);
  return `<article class="record">
    <header><span>${L('追悼館', 'Memorial')}</span><span>No. ${e.id}</span></header>
    ${scene(e)}
    <div class="recbody">
      <p class="kicker">${esc(worldName(e))}${L('・', ' · ')}${esc(raceName(e))}</p><h1>${esc(e.name)}</h1>
      <p class="age">${endAge(e.age, e.hazard)}</p>
      ${e.gen && e.gen > 1 ? `<p class="lineage"><b>${esc(genWord(e.gen))}</b>${(e.lineage ?? []).map((n) => `<span>${esc(n)}</span>`).join('<i aria-hidden="true">→</i>')}<i aria-hidden="true">→</i><span class="me">${esc(e.name)}</span></p>` : ''}
      <div class="cause"><b>${esc(e.causeLabel)}</b><p>${esc(e.causeText)}</p>${e.why ? `<p class="why">${L('なぜ: ', 'Why: ')}${esc(e.why)}</p>` : ''}</div>
      ${e.note ? `<p class="message">${L('「', '“')}${esc(e.note)}${L('」', '”')}</p>` : ''}
      ${e.lastWith.length ? `<h3>${L('最後にそばにいた人', 'Who was there at the end')}</h3><p>${e.lastWith.map((t) => `${esc(t.name)} <small>(${esc(ROLE_NAME[t.role] ?? t.role)})</small>`).join(L('、', ', '))}</p>` : ''}
      ${e.highlights.length ? `<h3>${L('主な出来事', 'Moments that mattered')}</h3><ul class="highlights">${e.highlights.map((h) => `<li><span>${ageText(h.age)}</span><div>${markGifts(esc(h.text))}</div></li>`).join('')}</ul>` : ''}
      <div class="choices"><button class="primary" data-candle="${e.id}" ${done ? 'disabled' : ''}>${done ? L('ろうそくを灯した', 'Candle lit') : L('ろうそくを灯す', 'Light a candle')} <small id="cn">${e.candles}</small></button>
        <button data-list="1">${L('一覧へ', 'Back to the list')}</button></div>
      <p class="note" id="candlemsg" role="status"></p>
      <p class="note"><button class="quiet" data-report="${e.id}">${L('不適切な内容を報告', 'Report this entry')}</button> <span id="reportmsg" role="status"></span></p>
    </div></article>`;
}

export function showMemorial(nav: Nav, id?: number): void {
  let offset = 0;
  screen(`
  <main class="page memorial">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('追悼館', 'Memorial')}</h1>
    <p class="note">${L('ほかの人が生きて、ここに残した人生。名前は人生の主人公のもので、遊んだ人の名前や連絡先は残らない。', 'Lives that others lived and left here. Names belong to the characters; nothing about the players is kept.')}</p>
    <div id="mem"><p class="note">${L('読み込み中…', 'Loading…')}</p></div>
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    if (t.closest('[data-go=past]')) return nav.past();
    const one = t.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (one) return void detail(Number(one));
    if (t.closest('[data-list]')) return void list(true);
    if (t.closest('[data-more]')) { offset += PAGE; return void list(false); }
    const c = t.closest<HTMLButtonElement>('[data-candle]');
    if (c && !c.disabled) void candle(c);
    const rp = t.closest<HTMLButtonElement>('[data-report]');
    if (rp && !rp.disabled && confirm(L('この記録を不適切な内容として報告しますか？', 'Report this entry as inappropriate?'))) {
      rp.disabled = true;
      void reportMemorial(Number(rp.dataset.report)).then((r) => { const m = document.getElementById('reportmsg'); if (m) m.textContent = r.ok ? L('報告しました。', 'Reported.') : L('報告できなかった。', 'Could not report.'); });
    }
  }, { back: nav.title });
  const box = document.getElementById('mem')!;
  const alive = () => document.getElementById('mem') === box;

  async function list(reset: boolean): Promise<void> {
    setBack(nav.title);
    if (reset) { offset = 0; box.innerHTML = `<ul class="memlist" id="memlist"></ul><div id="memmore"></div>`; }
    const r = await listMemorial(offset, PAGE, lang);
    if (!alive()) return;
    const ul = document.getElementById('memlist');
    if (!ul) return;
    if (!r.ok) { document.getElementById('memmore')!.innerHTML = `<p class="warn">${L('読み込めなかった: ', 'Could not load: ')}${esc(r.error)}</p>`; return; }
    if (reset && !r.data.items.length) ul.innerHTML = `<li class="note">${L('まだ誰も残していない。死亡記録の「追悼館に残す」から残せる。', 'No one yet. Leave a life from its death record.')}</li>`;
    ul.insertAdjacentHTML('beforeend', r.data.items.map((e) => itemHTML(num(e))).join(''));
    paintAll(ul);
    const more = r.data.offset + r.data.items.length < r.data.total;
    document.getElementById('memmore')!.innerHTML = more ? `<button data-more="1">${L('もっと見る', 'Show more')}</button>` : '';
  }

  async function detail(n: number): Promise<void> {
    const r = await getMemorial(n);
    if (!alive()) return;
    setBack(() => void list(true));
    box.innerHTML = r.ok ? detailHTML(num(r.data)) : `<p class="warn">${L('見つからなかった。', 'Not found.')}</p><button data-list="1">${L('一覧へ', 'Back to the list')}</button>`;
    paintAll(box);
    window.scrollTo(0, 0);
  }

  async function candle(btn: HTMLButtonElement): Promise<void> {
    const n = Number(btn.dataset.candle);
    btn.disabled = true;
    const r = await lightCandle(n);
    if (!alive()) return;
    if (r.ok) {
      save(LIT, [...lit(), n].slice(-500));
      btn.innerHTML = `${L('ろうそくを灯した', 'Candle lit')} <small>${Number(r.data.candles)}</small>`;
    } else {
      btn.disabled = false;
      document.getElementById('candlemsg')!.textContent = r.status === 429 ? L('少し時間をおいてから。', 'Please wait a little.') : L('灯せなかった。', 'Could not light it.');
    }
  }

  void memorialAvailable().then((ok) => {
    if (!alive()) return;
    if (!ok) {
      box.innerHTML = `${memorialOffHTML()}<div class="choices"><button data-go="past">${L('この端末の過去の人生を見る', 'See past lives on this device')}</button></div>`;
      return;
    }
    if (id !== undefined) void detail(id); else void list(true);
  });
}
