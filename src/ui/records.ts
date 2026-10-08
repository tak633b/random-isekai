// 死亡記録: 人生の終わりを1枚にまとめる。この端末の localStorage に残し、「過去の人生」で読み返せる
import type { Figure, Hazard, Hero, LogEntry, Role, SceneSpec, Setup } from '../engine/types';
import { CHEATS, heqOf, raceOf, randomSeed, statusName, summary } from '../engine';
import { heroFigure, sceneOf, tieFigure, faceHTML, sceneHTML, paintAll } from './pixel';
import { ARRIVAL_NAME, KIND_NAME, ROLE_NAME, SEX_NAME, ageText, jobName } from './labels';
import { esc, load, save } from './dom';
import { screen, type Nav } from './nav';
import { aiOf } from './ailog';
import { isEn, L, T } from '../i18n';

const KEY = 'lives';
const MAX = 20;

export interface LifeRecord {
  v: 1;
  date: string;
  setup: Setup;
  name: string;
  worldName: string;
  age: number;
  heqAge: number;
  hazard?: Hazard;
  cause: string;
  text: string;
  why: string;
  face: Figure;
  scene: SceneSpec;
  facts: [string, string][];
  lastWith: { name: string; role: Role; face: Figure }[];
  highlights: LogEntry[];
  log: LogEntry[];
}

export function toRecord(h: Hero): LifeRecord {
  const s = summary(h);
  const gamey = h.world.tags.includes('gamey');
  const kids = h.people.filter((t) => t.role === 'child').length;
  const facts: [string, string][] = [
    [L('世界', 'World'), T(h.world.name)],
    [L('種族', 'Race'), `${T(raceOf(h.race).name)}${L('・', ', ')}${SEX_NAME[h.sex]}`],
    [L('生まれ', 'Born into'), statusName(h.status, h.world)],
    [L('転生の型', 'Arrival'), ARRIVAL_NAME[h.arrival]],
    [L('転生特典', 'Gift'), h.cheat ? T(CHEATS[h.cheat].name) : L('なし', 'None')],
    [L('最後の仕事', 'Last job'), jobName(h.job)],
    [L('子', 'Children'), kids ? L(`${kids}人`, `${kids}`) : L('なし', 'None')],
    ...(gamey ? [[L('レベル', 'Level'), `${Math.round(h.level)}${h.rank ? L(`・ランク${h.rank}`, `, rank ${h.rank}`) : ''}`] as [string, string]] : []),
  ];
  return {
    v: 1, date: new Date().toISOString(), setup: h.setup, name: h.name, worldName: T(h.world.name),
    age: h.age, heqAge: Math.round(heqOf(h)), ...(s.hazard ? { hazard: s.hazard } : {}),
    cause: s.cause ?? '', text: s.text ?? '', why: s.why ?? '',
    face: heroFigure(h), scene: sceneOf(h, s.lastWith), facts,
    lastWith: s.lastWith.map((t) => ({ name: t.name, role: t.role, face: tieFigure(h, t) })),
    highlights: s.highlights, log: [...h.log, ...aiOf(h)],
  };
}

export const records = (): LifeRecord[] => load<LifeRecord[]>(KEY, []).filter((r) => r && r.v === 1);

export function keep(r: LifeRecord): void {
  save(KEY, [r, ...records()].slice(0, MAX));
}

// 年表。年ごとにまとめ、big は太く、why は小さく添える。newest なら新しい年を上に
type Entry = LogEntry & { ai?: boolean };
export function logHTML(log: Entry[], newest = false): string {
  const years = new Map<number, Entry[]>();
  for (const e of log) years.set(e.age, [...(years.get(e.age) ?? []), e]);
  const ages = [...years.keys()].sort((a, b) => (newest ? b - a : a - b));
  return `<ol class="timeline">${ages.map((a) => `<li class="yr"><span class="yrage">${ageText(a)}</span><ul>${years.get(a)!.map((e) =>
    `<li class="k-${e.kind}${e.big ? ' big' : ''}" title="${esc(KIND_NAME[e.kind])}">${e.ai ? '<i class="aitag" title="AI">AI</i>' : ''}${esc(e.text)}${e.why ? `<small class="why">${esc(e.why)}</small>` : ''}</li>`).join('')}</ul></li>`).join('')}</ol>`;
}

export function recordHTML(r: LifeRecord): string {
  const no = `${r.setup.world.preset}-${String(r.setup.seed % 1e6).padStart(6, '0')}`;
  return `
  <article class="record">
    <header><span>${L('死亡記録', 'Record of death')}</span><span>No. ${esc(no)}</span></header>
    ${sceneHTML(r.scene, L('墓の場面', 'Grave'))}
    <div class="recbody">
      <div class="rechead">${faceHTML(r.face, 'face big')}<div>
        <p class="kicker">${esc(r.worldName)}</p><h1>${esc(r.name)}</h1>
        <p class="age">${L(`享年 <b>${r.age}</b>`, `Died at <b>${r.age}</b>`)}${r.heqAge !== r.age ? `<small>${L(`人間でいえば${r.heqAge}歳`, `about ${r.heqAge} in human years`)}</small>` : ''}</p>
      </div></div>
      <div class="cause"><b>${esc(r.cause)}</b><p>${esc(r.text)}</p>${r.why ? `<p class="why">${L('なぜ: ', 'Why: ')}${esc(r.why)}</p>` : ''}</div>
      <dl class="facts">${r.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <h3>${L('最後にそばにいた人', 'Who was there at the end')}</h3>
      ${r.lastWith.length ? `<ul class="lastwith">${r.lastWith.map((t) => `<li>${faceHTML(t.face)}<span><b>${esc(t.name)}</b><small>${esc(ROLE_NAME[t.role])}</small></span></li>`).join('')}</ul>`
        : `<p class="note">${L('そばには誰もいなかった。', 'No one was there.')}</p>`}
      ${r.highlights.length ? `<h3>${L('主な出来事', 'Moments that mattered')}</h3><ul class="highlights">${r.highlights.map((e) => `<li><span>${ageText(e.age)}</span>${esc(e.text)}</li>`).join('')}</ul>` : ''}
      <details class="fulllog"><summary>${L(`年表の全体 (${r.log.length}件)`, `Full timeline (${r.log.length} entries)`)}</summary>${logHTML(r.log)}</details>
    </div>
  </article>`;
}

// 過去の人生の一覧
export function showPast(nav: Nav): void {
  const list = records();
  const fmt = (d: string) => new Date(d).toLocaleDateString(isEn ? 'en-US' : 'ja-JP');
  screen(`
  <main class="page">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('過去の人生', 'Past lives')}</h1>
    <p class="note">${L(`最近の${list.length}つの人生 (最大${MAX})。この端末にだけ残っている。`, `Your last ${list.length} ${list.length === 1 ? 'life' : 'lives'} (up to ${MAX}). Stored only on this device.`)}</p>
    <ul class="pastlist">${list.map((r, i) => `<li><button data-i="${i}">${faceHTML(r.face)}<span><b>${esc(r.name)}</b><small>${esc(r.worldName)}${L('・', ' · ')}${L(`${r.age}歳`, `age ${r.age}`)}${L('・', ' · ')}${esc(r.cause)}</small><small>${fmt(r.date)}</small></span></button></li>`).join('')
      || `<li class="note">${L('まだない。', 'None yet.')}</li>`}</ul>
    <div id="pastdetail"></div>
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    const i = t.closest<HTMLElement>('[data-i]')?.dataset.i;
    if (i !== undefined) {
      const r = list[Number(i)];
      const el = document.getElementById('pastdetail')!;
      el.innerHTML = `${recordHTML(r)}<div class="choices"><button data-trials="${i}">${L('同じ設定で何回も試す', 'Run this setup many times')}</button><button data-again="${i}">${L('同じ設定で転生', 'Live this setup again')}</button></div>`;
      paintAll(el);
      el.scrollIntoView();
    }
    const tr = t.closest<HTMLElement>('[data-trials]')?.dataset.trials;
    if (tr !== undefined) return nav.trials(list[Number(tr)].setup);
    const ag = t.closest<HTMLElement>('[data-again]')?.dataset.again;
    if (ag !== undefined) return nav.start({ ...list[Number(ag)].setup, seed: randomSeed() });
  });
  paintAll(document.getElementById('app')!);
}
