// 人生の画面: 転生したら1年ずつ自動で流れる (速さ・一時停止・次の選択まで・自動で決める)。
// 場面・顔と能力・年表・人の輪・その年の危険の内訳が年ごとに変わる。選択が来たらモーダルで止まる。手で 1年 / 10年 / 最後まで も残す
import type { Hero, StatKey, Tie } from '../engine/types';
import { advanceYear, choose, deathChance, fromSaved, heqOf, liveOut, raceOf, riskBreakdown, statusName, toSaved, CHEATS, type SavedHero } from '../engine';
import { faceHTML, heroFigure, paintAll, tieFigure } from './pixel';
import { FIGHT_MS, Stage } from './stage';
import { barList, fmtPct } from './charts';
import { logHTML } from './records';
import { traitTags } from './build';
import { addAi, aiOf, restoreAi, saveAi } from './ailog';
import { aiYearButton } from './aipanel';
import { aiReady } from '../ai/settings';
import { ROLE_NAME, STAT_NAME, ageText, jobName } from './labels';
import { esc, load, save } from './dom';
import { AFTER_CHOICE_SEC, SPEEDS, lifeSpan, loadPlay, savePlay, scaledMs, yearSec, type PlayState } from './play';
import { screen, type Nav } from './nav';
import { L, T } from '../i18n';

// 途中の人生。1年進むたびに残し、亡くなったら消す
const CURRENT = 'current';
export const savedLife = (): SavedHero | null => load<SavedHero | null>(CURRENT, null);
export function resumeLife(): Hero | null {
  const s = savedLife();
  if (!s) return null;
  try { const h = fromSaved(s); restoreAi(h); return h; } catch { save(CURRENT, null); return null; }
}
const persist = (h: Hero) => { save(CURRENT, h.alive ? toSaved(h) : null); saveAi(h.alive ? h : null); };

const LOG_YEARS = 40;
const STATS: StatKey[] = ['hp', 'power', 'mind', 'charm', 'luck', 'happy', 'wealth', 'fame'];

export function showLife(h: Hero, nav: Nav, resumed = false): void {
  let sel: number | undefined;
  const play: PlayState = resumed ? loadPlay() : { ...loadPlay(), paused: false };
  const span = lifeSpan(h);
  let ff = false;          // 次の選択まで
  let progress = 0;        // 今の年の進み (0〜1)
  let yearMs = 0;          // 今の年に掛ける時間 (1×)
  let last = performance.now();
  let saved = 0;           // 最後に保存した時刻
  let leaving = false;
  let renders = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  screen(`
  <header class="topbar">
    <div class="who"><b class="brand">Random Isekai</b><span class="agebig" id="age"></span><span id="wholine"></span></div>
    <div class="controls" role="group" aria-label="${L('再生', 'Playback')}">
      <button data-act="pause" id="pausebtn"></button>
      <span class="speeds" role="group" aria-label="${L('速さ', 'Speed')}">${SPEEDS.map((v) => `<button data-act="speed" data-v="${v}" aria-pressed="false">${v}×</button>`).join('')}</span>
      <button data-act="ff" id="ffbtn" title="${L('選択が来るまで早送り', 'Fast-forward to the next choice')}">${L('次の選択まで', 'Next choice')}</button>
      <button data-act="auto" id="autobtn" aria-pressed="false" title="${L('ONなら選択で止まらず、性格で選ぶ', 'When on, choices are made by temperament without stopping')}">${L('自動で決める', 'Auto-choose')}</button>
      <button data-act="exit" class="quiet" title="${L('タイトルの「続きから」で再開できる', 'Resume later from the title screen')}">${L('中断', 'Save & quit')}</button>
    </div>
    <div class="lifetrack" aria-hidden="true"><i id="lifebar"></i><b id="yearbar"></b></div>
  </header>
  <main class="lifegrid">
    <section class="colmain">
      <div class="scenebox"><canvas class="pix scene" id="scenecv" width="320" height="100" role="img" aria-label="${L('今の場面', 'Current scene')}"></canvas><p class="scenecap" id="scenecap"></p></div>
      <div class="manual"><span>${L('手で進める', 'Step by hand')}</span><button data-act="y1" id="b1">${L('1年', '+1 year')}</button><button data-act="y10" id="b10">${L('10年', '+10 years')}</button><button data-act="end" title="${L('選択は性格に合わせて自動で選ぶ', 'Choices are made automatically by temperament')}">${L('最後まで', 'To the end')}</button></div>
      <div class="panel logpanel"><div class="loghead"><h2>${L('年表', 'Timeline')}</h2><div id="aiyear"></div></div><div id="log" class="logbox" aria-live="off"></div></div>
    </section>
    <aside class="colside">
      <div class="panel" id="me"></div>
      <div class="panel"><h2>${L('人の輪', 'People')}</h2><div id="ring"></div></div>
      <div class="panel"><h2>${L('この1年の危険', 'This year’s dangers')}</h2><div id="risk"></div></div>
    </aside>
  </main>
  <div class="modal-back" id="modal" hidden><div class="modal" id="modalbody" role="dialog" aria-modal="true" aria-labelledby="dtitle"></div></div>`, (t) => {
    const b = t.closest<HTMLElement>('[data-act]');
    if (!b || !h.alive) return;
    switch (b.dataset.act) {
      case 'pause': play.paused = !play.paused; ff = false; break;
      case 'speed': play.speed = Number(b.dataset.v); ff = false; break;
      case 'ff': ff = true; play.paused = false; break;
      case 'auto': h.auto = !h.auto; break;
      case 'y1': step(1); break;
      case 'y10': step(10); break;
      case 'end': liveOut(h); break;
      case 'opt':
        choose(h, Number(b.dataset.i)); closeModal();
        // 選んだ後は、その年の残りを最低 3秒 (1×) 流す
        progress = Math.min(progress, Math.max(0, 1 - (AFTER_CHOICE_SEC * 1000) / yearMs));
        break;
      case 'tie': sel = sel === Number(b.dataset.id) ? undefined : Number(b.dataset.id); break;
      case 'exit': stop(); persist(h); savePlay(play); nav.title(); return;
      default: return;
    }
    savePlay(play);
    persist(h);
    if (b.dataset.act === 'y1' || b.dataset.act === 'y10' || b.dataset.act === 'end') newYear();
    render();
    if (!h.alive) return died();
    if (b.dataset.act === 'tie') document.querySelector<HTMLElement>(`[data-act=tie][data-id="${b.dataset.id}"]`)?.focus();
    nextModal();
  });
  const cv = document.getElementById('scenecv') as HTMLCanvasElement;
  const stage = new Stage(cv);
  const onScreen = () => document.getElementById('scenecv') === cv && !leaving;
  let raf = 0;

  // 選択が出たらそこで止まる (手で進めるとき)
  function step(n: number): void {
    for (let i = 0; i < n && h.alive && !h.pending.length; i++) advanceYear(h);
  }
  // 年が変わったら、その年に掛ける時間を決め直す
  function newYear(): void {
    progress = 0;
    yearMs = yearSec(h, span, FIGHT_MS / 1000) * 1000;
  }

  function frame(t: number): void {
    if (!onScreen()) return;
    const dt = Math.min(250, t - last);
    last = t;
    const waiting = h.pending.length > 0 && !h.auto;
    if (!play.paused && !waiting && h.alive && !document.hidden) {
      progress += dt / scaledMs(yearMs, play.speed, ff);
      let n = 0;
      // 速いときは1フレームに何年か進め、描くのは最後に1回
      while (progress >= 1 && n < 8 && h.alive) {
        advanceYear(h);
        n++;
        newYear();
        if (h.pending.length && !h.auto) { ff = false; break; }
      }
      if (n) {
        render();
        if (t - saved > 1000 || h.pending.length || !h.alive) { persist(h); saved = t; }
        if (!h.alive) return died();
        nextModal();
      }
    }
    const bar = document.getElementById('yearbar');
    if (bar) bar.style.width = `${Math.min(100, progress * 100).toFixed(1)}%`;
    raf = requestAnimationFrame(frame);
  }
  const stop = () => { leaving = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  // タブが隠れているあいだは止まる (戻ったときに時間が飛ばないよう、基準の時刻を取り直す)
  const onVis = () => { last = performance.now(); if (document.hidden) { persist(h); savePlay(play); } };
  document.addEventListener('visibilitychange', onVis);

  let ending = false;
  function died(): void {
    if (ending) return;
    ending = true;
    stop();
    persist(h);
    // 戦いで倒れた年は、演出を見届けてから
    const lost = h.log.at(-1)?.fight?.result === 'lose' || h.log.some((e) => e.age === h.age && e.fight?.result === 'lose');
    setTimeout(() => { if (document.getElementById('scenecv') === cv) { stage.destroy(); nav.death(h); } }, reduced ? 300 : lost ? Math.min(FIGHT_MS, scaledMs(yearMs, play.speed, ff) * 0.85) + 800 : 1500);
  }

  // ---- 選択のモーダル: 選ぶまで年は進まない。Esc では閉じない。Tab はモーダルの中だけを回る
  function nextModal(): void {
    if (!h.pending.length || h.auto) return closeModal();
    const d = h.pending[0];
    const m = document.getElementById('modal')!;
    if (!m.hidden && m.dataset.ref === String(h.log.length)) return;
    m.dataset.ref = String(h.log.length);
    document.getElementById('modalbody')!.innerHTML = `<p class="kicker">${L(`${h.age}歳・選ぶまで次の年に進まない`, `Age ${h.age} · the year waits for your choice`)}</p>
      <h2 id="dtitle">${esc(d.title)}</h2><p>${esc(d.text)}</p>
      <div class="cards">${d.options.map((o, i) => `<button data-act="opt" data-i="${i}"><span class="num">${i + 1}</span><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}</div>
      <p class="note">${L('数字のキーでも選べる。', 'Number keys also work.')}</p>`;
    m.hidden = false;
    document.querySelector<HTMLElement>('#modalbody [data-act=opt]')?.focus();
  }
  function closeModal(): void {
    const m = document.getElementById('modal');
    if (m && !m.hidden) { m.hidden = true; delete m.dataset.ref; document.getElementById('pausebtn')?.focus(); }
  }
  document.getElementById('modal')!.onkeydown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); return; }
    const opts = [...document.querySelectorAll<HTMLElement>('#modalbody button')];
    const n = Number(e.key);
    if (n >= 1 && n <= opts.length) { e.preventDefault(); opts[n - 1].click(); return; }
    if (e.key !== 'Tab' || !opts.length) return;
    const i = opts.indexOf(document.activeElement as HTMLElement);
    const j = e.shiftKey ? (i <= 0 ? opts.length - 1 : i - 1) : (i + 1) % opts.length;
    e.preventDefault();
    opts[j].focus();
  };

  function controls(): void {
    const pb = document.getElementById('pausebtn')!;
    pb.textContent = play.paused ? L('▶ 再開', '▶ Play') : L('❚❚ 止める', '❚❚ Pause');
    pb.setAttribute('aria-pressed', String(play.paused));
    document.querySelectorAll<HTMLButtonElement>('[data-act=speed]').forEach((b) => { const on = Number(b.dataset.v) === play.speed && !ff; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    document.getElementById('ffbtn')!.classList.toggle('on', ff);
    const ab = document.getElementById('autobtn')!;
    ab.classList.toggle('on', h.auto);
    ab.setAttribute('aria-pressed', String(h.auto));
    for (const id of ['b1', 'b10']) (document.getElementById(id) as HTMLButtonElement).disabled = h.pending.length > 0;
    stage.setPaused(play.paused);
    document.getElementById('lifebar')!.style.width = `${Math.min(100, (h.age / span) * 100).toFixed(1)}%`;
  }

  function render(): void {
    const t0 = performance.now();
    const heq = Math.round(heqOf(h));
    const gamey = h.world.tags.includes('gamey');
    document.getElementById('age')!.textContent = ageText(h.age);
    document.getElementById('wholine')!.textContent = `${h.name}${heq !== h.age ? L(`・人間でいえば${heq}歳`, ` · about ${heq} in human years`) : ''}${L(`・寿命の目安 ${Math.round(span)}年`, ` · lifespan about ${Math.round(span)}`)}`;
    controls();
    stage.show(h, { budgetMs: scaledMs(yearMs, play.speed, ff), fast: ff || play.speed >= 8 });
    const st = h.state;
    const chips = [st.war > 0 && L('戦争中', 'At war'), st.plague > 0 && L('大疫病', 'Plague'), st.famine > 0 && L('飢饉', 'Famine'), st.demonKing && L('魔王がいる', 'A Demon King reigns')].filter(Boolean) as string[];
    document.getElementById('scenecap')!.innerHTML = `${esc(T(h.world.name))}${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}`;
    // 年表は新しい40年ぶん (長命の人生でも1年の描き直しを軽く保つ。全部は死亡記録で読める)
    const from = h.age - LOG_YEARS;
    document.getElementById('log')!.innerHTML = logHTML([...h.log, ...aiOf(h)].filter((e) => e.age > from), true);
    const ai = document.getElementById('aiyear')!;
    ai.replaceChildren();
    if (aiReady() && h.alive) ai.append(aiYearButton(h, (e) => { addAi(h, e); persist(h); render(); }));
    document.getElementById('me')!.innerHTML = meHTML(h, heq, gamey);
    document.getElementById('ring')!.innerHTML = ringHTML(h, sel);
    const risk = riskBreakdown(h).slice(0, 5);
    document.getElementById('risk')!.innerHTML = `<p class="bigrisk">${L('この1年で亡くなる確率', 'Chance of dying this year')} <b>${fmtPct(deathChance(h))}</b></p>
      ${barList(risk.map((r) => ({ label: r.label, p: r.p, sub: r.notes })), 'risk')}<p class="note">${L('棒は危険のうちわけ (合計100%)。小さな字はそれに効いている力。', 'Bars show how the risk splits (sums to 100%). Small text shows what affects it.')}</p>`;
    paintAll(document.getElementById('app')!);
    // 1年の描き直しにかかった時間 (確かめる用)
    const ms = performance.now() - t0;
    const app = document.getElementById('app')!;
    app.dataset.renderMs = ms.toFixed(2);
    // 最初の数回は顔の絵を作るぶん重いので除く
    if (++renders > 3) app.dataset.renderMax = Math.max(Number(app.dataset.renderMax ?? 0), ms).toFixed(2);
  }
  persist(h);
  savePlay(play);
  newYear();
  render();
  nextModal();
  if (!h.alive) died(); else raf = requestAnimationFrame((t) => { last = t; frame(t); });
}

function meHTML(h: Hero, heq: number, gamey: boolean): string {
  const job = h.job ? jobName(h.job) + (h.flags.retired !== undefined ? L('・隠居', ', retired') : '') : heq < 16 ? L('子ども', 'Child') : L('定職なし', 'No trade');
  return `<div class="mehead">${faceHTML(heroFigure(h), 'face big')}<div>
      <h2 class="pname">${esc(h.name)}</h2>
      <p>${esc(T(raceOf(h.race).name))}${L('・', ' · ')}${esc(statusName(h.status, h.world))}${L('・', ' · ')}${esc(job)}</p>
      <p class="note">${ageText(h.age)}${heq !== h.age ? L(`(人間でいえば${heq}歳)`, ` (about ${heq} in human years)`) : ''}${h.cheat ? `${L('・', ' · ')}${esc(T(CHEATS[h.cheat].name))}` : ''}${h.revives ? L(`・死の取り消し残り${h.revives}回`, ` · can undo death ${h.revives} more ${h.revives === 1 ? 'time' : 'times'}`) : ''}</p>
      ${gamey ? `<p class="lv">Lv <b>${Math.round(h.level)}</b>${h.rank ? `<span>${L('ギルドランク', 'Guild rank')} <b>${h.rank}</b></span>` : ''}${titlesOf(h).map((t) => `<span class="title">${esc(t)}</span>`).join('')}</p>` : ''}
    </div></div>
    ${traitTags(h.traits, h.blessing)}
    <ul class="stats">${STATS.map((k) => `<li><span>${STAT_NAME[k]}</span><i class="meter"><b class="m-${k}" style="width:${h.stats[k]}%"></b></i><em>${Math.round(h.stats[k])}</em></li>`).join('')}</ul>`;
}

// 称号 (立ったしるしから)
const TITLES: [string, string, string][] = [['demonKingSlain', '魔王を討った者', 'Demon King’s bane'], ['hero', '勇者', 'Hero'], ['saint', '聖女', 'Saint'],
  ['lord', '領主', 'Lord'], ['knighted', '騎士', 'Knight'], ['famous', '名の知れた者', 'Renowned'], ['exiled', '追放された者', 'Exile']];
const titlesOf = (h: Hero): string[] => TITLES.filter(([f]) => h.flags[f] !== undefined).map(([, ja, en]) => L(ja, en));

// 近い順。亡くなった人・離れた人は後ろで薄く
const order = (a: Tie, b: Tie) => +(!a.alive || a.until !== undefined) - +(!b.alive || b.until !== undefined) || b.bond - a.bond;

function ringHTML(h: Hero, sel?: number): string {
  if (!h.people.length) return `<p class="note">${L('この世界に、まだ知り合いはいない。', 'No one in this world knows you yet.')}</p>`;
  const list = [...h.people].sort(order);
  const t = sel !== undefined ? h.people.find((x) => x.id === sel) : undefined;
  return `<ul class="ring">${list.map((p) => `<li><button data-act="tie" data-id="${p.id}" class="${p.alive ? '' : 'dead'}${p.until !== undefined ? ' left' : ''}${p.id === sel ? ' on' : ''}" aria-pressed="${p.id === sel}">
      ${faceHTML(tieFigure(h, p))}<span><b>${esc(p.name)}</b><small>${esc(ROLE_NAME[p.role])}${p.alive ? '' : L('・故人', ' · died')}</small><i class="meter"><b style="width:${p.bond}%"></b></i></span></button></li>`).join('')}</ul>
    ${t ? `<div class="mem"><h3>${L(`${esc(t.name)}との記憶`, `Memories with ${esc(t.name)}`)}</h3><p class="note">${L(`近さ ${Math.round(t.bond)}・${t.since}歳で出会った`, `Closeness ${Math.round(t.bond)} · met at ${t.since}`)}${t.diedAt !== undefined ? L(`・あなたが${t.diedAt}歳のときに亡くなった`, ` · died when you were ${t.diedAt}`) : ''}</p>
      ${t.mem.length ? `<ul>${t.mem.map((m) => `<li><span>${ageText(m.age)}</span>${esc(m.text)}</li>`).join('')}</ul>` : `<p class="note">${L('まだ共有の記憶はない。', 'No shared memories yet.')}</p>`}</div>` : ''}`;
}
