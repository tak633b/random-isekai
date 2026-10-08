// 人生の画面: 場面・顔と能力・年表・人の輪・その年の危険の内訳。1年 / 10年 / 最後まで。選択があればボタンで選ぶ
import type { Hero, StatKey, Tie } from '../engine/types';
import { advanceYear, choose, deathChance, fromSaved, heqOf, liveOut, raceOf, riskBreakdown, statusName, toSaved, CHEATS, type SavedHero } from '../engine';
import { drawScene, faceHTML, heroFigure, paintAll, sceneOf, tieFigure } from './pixel';
import { barList, fmtPct } from './charts';
import { logHTML } from './records';
import { traitTags } from './build';
import { addAi, aiOf, restoreAi, saveAi } from './ailog';
import { aiYearButton } from './aipanel';
import { aiReady } from '../ai/settings';
import { ROLE_NAME, STAT_NAME, ageText, jobName } from './labels';
import { esc, load, save } from './dom';
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

const STATS: StatKey[] = ['hp', 'power', 'mind', 'charm', 'luck', 'happy', 'wealth', 'fame'];

export function showLife(h: Hero, nav: Nav): void {
  let sel: number | undefined;
  screen(`
  <header class="topbar">
    <div class="who"><b class="brand">Random Isekai</b><span class="agebig" id="age"></span><span id="wholine"></span></div>
    <div class="controls">
      <button data-act="y1" id="b1">${L('1年進む', '+1 year')}</button>
      <button data-act="y10" id="b10">${L('10年', '+10 years')}</button>
      <button data-act="end" title="${L('選択は性格に合わせて自動で選ぶ', 'Choices are made automatically by temperament')}">${L('最後まで', 'To the end')}</button>
      <button data-act="exit" class="quiet" title="${L('タイトルの「続きから」で再開できる', 'Resume later from the title screen')}">${L('中断', 'Pause')}</button>
    </div>
  </header>
  <main class="lifegrid">
    <section class="colmain">
      <div class="scenebox"><canvas class="pix scene" id="scenecv" width="320" height="100" role="img" aria-label="${L('今の場面', 'Current scene')}"></canvas><p class="scenecap" id="scenecap"></p></div>
      <div id="decision" aria-live="polite"></div>
      <div class="panel logpanel"><div class="loghead"><h2>${L('年表', 'Timeline')}</h2><div id="aiyear"></div></div><div id="log" class="logbox"></div></div>
    </section>
    <aside class="colside">
      <div class="panel" id="me"></div>
      <div class="panel"><h2>${L('人の輪', 'People')}</h2><div id="ring"></div></div>
      <div class="panel"><h2>${L('この1年の危険', 'This year’s dangers')}</h2><div id="risk"></div></div>
    </aside>
  </main>`, (t) => {
    const b = t.closest<HTMLElement>('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'y1': step(1); break;
      case 'y10': step(10); break;
      case 'end': liveOut(h); break;
      case 'opt': choose(h, Number(b.dataset.i)); break;
      case 'tie': sel = sel === Number(b.dataset.id) ? undefined : Number(b.dataset.id); break;
      case 'exit': persist(h); nav.title(); return;
      default: return;
    }
    persist(h);
    if (!h.alive) return nav.death(h);
    render();
    // 作り直した部分にあったボタンなら、キーボードの位置を戻す
    const act = b.dataset.act;
    const again = act === 'tie' ? `[data-act=tie][data-id="${b.dataset.id}"]` : h.pending.length ? '#decision button' : act === 'opt' ? '#b1' : '';
    if (again) document.querySelector<HTMLElement>(again)?.focus();
  });

  // 選択が出たらそこで止まる
  function step(n: number): void {
    for (let i = 0; i < n && h.alive && !h.pending.length; i++) advanceYear(h);
  }

  function render(): void {
    const heq = Math.round(heqOf(h));
    const gamey = h.world.tags.includes('gamey');
    document.getElementById('age')!.textContent = ageText(h.age);
    document.getElementById('wholine')!.textContent = `${h.name}${heq !== h.age ? L(`・人間でいえば${heq}歳`, ` · about ${heq} in human years`) : ''}`;
    const blocked = h.pending.length > 0;
    for (const id of ['b1', 'b10']) (document.getElementById(id) as HTMLButtonElement).disabled = blocked;
    drawScene(document.getElementById('scenecv') as HTMLCanvasElement, sceneOf(h));
    const st = h.state;
    const chips = [st.war > 0 && L('戦争中', 'At war'), st.plague > 0 && L('大疫病', 'Plague'), st.famine > 0 && L('飢饉', 'Famine'), st.demonKing && L('魔王がいる', 'A Demon King reigns')].filter(Boolean) as string[];
    document.getElementById('scenecap')!.innerHTML = `${esc(T(h.world.name))}${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}`;
    document.getElementById('decision')!.innerHTML = decisionHTML(h);
    document.getElementById('log')!.innerHTML = logHTML([...h.log, ...aiOf(h)], true);
    // AI をつないでいるときだけ、今の年を書き足すボタンを出す
    const ai = document.getElementById('aiyear')!;
    ai.replaceChildren();
    if (aiReady() && h.alive) ai.append(aiYearButton(h, (e) => { addAi(h, e); persist(h); render(); }));
    document.getElementById('me')!.innerHTML = meHTML(h, heq, gamey);
    document.getElementById('ring')!.innerHTML = ringHTML(h, sel);
    const risk = riskBreakdown(h).slice(0, 5);
    const notes = risk.flatMap((r) => r.notes);
    document.getElementById('risk')!.innerHTML = `<p class="bigrisk">${L('この1年で亡くなる確率', 'Chance of dying this year')} <b>${fmtPct(deathChance(h))}</b></p>
      ${barList(risk.map((r) => ({ label: r.label, p: r.p })), 'risk')}<p class="note">${L('棒は危険のうちわけ (合計100%)。', 'Bars show how the risk splits (sums to 100%).')}</p>
      ${notes.length ? `<ul class="risknotes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
    paintAll(document.getElementById('app')!);
  }
  persist(h);
  render();
}

function decisionHTML(h: Hero): string {
  const d = h.pending[0];
  if (!d) return '';
  return `<div class="panel decision"><p class="kicker">${L(`${h.age}歳・選ぶまで次の年に進まない`, `Age ${h.age} · the year waits for your choice`)}</p>
    <h2>${esc(d.title)}</h2><p>${esc(d.text)}</p>
    <div class="cards">${d.options.map((o, i) => `<button data-act="opt" data-i="${i}"><span class="num">${i + 1}</span><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}</div></div>`;
}

function meHTML(h: Hero, heq: number, gamey: boolean): string {
  const job = h.job ? jobName(h.job) + (h.flags.retired !== undefined ? L('・隠居', ', retired') : '') : heq < 16 ? L('子ども', 'Child') : L('定職なし', 'No trade');
  return `<div class="mehead">${faceHTML(heroFigure(h), 'face big')}<div>
      <h2 class="pname">${esc(h.name)}</h2>
      <p>${esc(T(raceOf(h.race).name))}${L('・', ' · ')}${esc(statusName(h.status, h.world))}${L('・', ' · ')}${esc(job)}</p>
      <p class="note">${ageText(h.age)}${heq !== h.age ? L(`(人間でいえば${heq}歳)`, ` (about ${heq} in human years)`) : ''}${h.cheat ? `${L('・', ' · ')}${esc(T(CHEATS[h.cheat].name))}` : ''}${h.revives ? L(`・死の取り消し残り${h.revives}回`, ` · can undo death ${h.revives} more ${h.revives === 1 ? 'time' : 'times'}`) : ''}</p>
      ${gamey ? `<p class="lv">Lv <b>${Math.round(h.level)}</b>${h.rank ? `<span>${L('ギルドランク', 'Guild rank')} <b>${h.rank}</b></span>` : ''}</p>` : ''}
    </div></div>
    ${traitTags(h.traits, h.blessing)}
    <ul class="stats">${STATS.map((k) => `<li><span>${STAT_NAME[k]}</span><i class="meter"><b class="m-${k}" style="width:${h.stats[k]}%"></b></i><em>${Math.round(h.stats[k])}</em></li>`).join('')}</ul>`;
}

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
