// 死亡記録: 人生の終わりを1枚にまとめる。この端末の localStorage に残し、「過去の人生」で読み返せる
import type { Figure, Hazard, Hero, LogEntry, Role, SceneSpec, Setup, Tie } from '../engine/types';
import { fateLine } from '../engine/people';
import { CHEATS, heqOf, raceOf, randomSeed, statusName, summary } from '../engine';
import { heroFigure, sceneOf, tieFigure, faceHTML, sceneHTML, paintAll } from './pixel';
import { ARRIVAL_NAME, KIND_NAME, ROLE_NAME, SEX_NAME, ageText, climbText, endAge, jobName } from './labels';
import { esc, load, save } from './dom';
import { screen, setBack, type Nav } from './nav';
import { aiOf } from './ailog';
import { kindIcon } from './icons';
import { FOE_NAME, RESULT_NAME } from './stage';
import { genWord, lineageHTML, recordLineage, type RecordLineage } from './lineage';
import { isEn, L, T } from '../i18n';
import { adHTML } from './ads';

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
  names?: [number, string][];  // 輪の人の名前 (年表の戦いの仲間に使う)
  circle?: { name: string; role: Role; face: Figure; fate: string }[]; // 関わった人たち
  lineage?: RecordLineage;     // 系譜 (第2代から)
}

// 関わった人たち: 大事な役を先に、近かった順に多くて8人
const KEY_ROLES: Role[] = ['spouse', 'companion', 'mentor', 'nemesis', 'child', 'lover', 'fiance', 'disciple', 'familiar', 'rival'];
function circleOf(h: Hero): LifeRecord['circle'] {
  const rank = (t: Tie) => (KEY_ROLES.includes(t.role) ? 0 : 1);
  return [...h.people].sort((a, b) => rank(a) - rank(b) || b.bond - a.bond || a.id - b.id).slice(0, 8)
    .map((t) => ({ name: t.name, role: t.role, face: tieFigure(h, t), fate: fateLine(h, t) }));
}

export function toRecord(h: Hero): LifeRecord {
  const s = summary(h);
  const gamey = h.world.tags.includes('gamey');
  const kids = h.people.filter((t) => t.role === 'child').length;
  const facts: [string, string][] = [
    [L('世界', 'World'), T(h.world.name)],
    [L('種族', 'Race'), `${T(raceOf(h.race).name)}${L('・', ', ')}${SEX_NAME[h.sex]}`],
    [L('生まれ', 'Born into'), statusName(h.status, h.world)],
    ...(climbText(h) ? [[L('身分の歩み', 'Rise and fall'), climbText(h)] as [string, string]] : []),
    [L('転生の型', 'Arrival'), ARRIVAL_NAME[h.arrival]],
    [L('転生特典', 'Cheat skill'), h.cheat ? T(CHEATS[h.cheat].name) : L('なし', 'None')],
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
    names: h.people.map((t) => [t.id, t.name] as [number, string]), circle: circleOf(h),
    ...(recordLineage(h) ? { lineage: recordLineage(h) } : {}),
  };
}

export const records = (): LifeRecord[] => load<LifeRecord[]>(KEY, []).filter((r) => r && r.v === 1);

export function keep(r: LifeRecord): void {
  save(KEY, [r, ...records()].slice(0, MAX));
}

// 年表。年ごとにまとめ、big は太く、why は小さく添える。newest なら新しい年を上に
type Entry = LogEntry & { ai?: boolean };
// 文の中の〈特典やスキルの名前〉を少し目立たせる。esc した後に囲むので、中身はテキストのまま
export const markGifts = (escaped: string): string => escaped.replace(/〈([^〈〉<>]{1,40})〉/g, '<b class="gift">〈$1〉</b>');

// 戦いの行の添え書き: 相手・結果・一緒に戦った人
export function fightNote(f: NonNullable<LogEntry['fight']>, names?: Map<number, string>): string {
  const allies = (f.allies ?? []).map((id) => names?.get(id)).filter(Boolean) as string[];
  const with_ = allies.length ? L(`・${allies.join('、')}と`, `, with ${allies.join(' and ')}`) : '';
  return L(`vs ${FOE_NAME[f.foe]}・${RESULT_NAME[f.result]}${with_}`, `vs ${FOE_NAME[f.foe]}: ${RESULT_NAME[f.result]}${with_}`);
}

// 年表。年ごとにまとめ、big は太く、why は小さく添える。newest なら新しい年を上に。
// names は輪の人の名前 (戦いの仲間と、行に関わった人の名に使う)。link なら関わった人の名を押すとその人の欄が開く
export function logHTML(log: Entry[], newest = false, names?: Map<number, string>, link = false): string {
  const years = new Map<number, Entry[]>();
  for (const e of log) years.set(e.age, [...(years.get(e.age) ?? []), e]);
  const ages = [...years.keys()].sort((a, b) => (newest ? b - a : a - b));
  const who = (e: Entry) => (link && names && e.who?.length && e.kind !== 'death'
    ? `<span class="whos">${e.who.filter((id) => names.has(id)).slice(0, 3).map((id) => `<button class="whobtn" data-act="tie" data-id="${id}">${esc(names.get(id)!)}</button>`).join('')}</span>` : '');
  return `<ol class="timeline">${ages.map((a) => `<li class="yr" data-age="${a}"><span class="yrage">${ageText(a)}</span><ul>${years.get(a)!.map((e) =>
    `<li class="k-${e.kind}${e.big ? ' big' : ''}" title="${esc(KIND_NAME[e.kind])}">${kindIcon(e.kind)}${e.ai ? '<i class="aitag" title="AI">AI</i>' : ''}${markGifts(esc(e.text))}${e.fight ? `<small class="fight">${esc(fightNote(e.fight, names))}</small>` : ''}${e.why ? `<small class="why">${esc(e.why)}</small>` : ''}${who(e)}</li>`).join('')}</ul></li>`).join('')}</ol>`;
}

export function recordHTML(r: LifeRecord): string {
  const no = `${r.setup.world.preset}-${String(r.setup.seed % 1e6).padStart(6, '0')}`;
  return `
  <article class="record">
    <header><span>${L('死亡記録', 'Record of death')}</span><span>No. ${esc(no)}</span></header>
    ${sceneHTML(r.scene, L('墓の場面', 'Grave'))}
    <div class="recbody">
      <div class="rechead">${faceHTML(r.face, 'face big')}<div>
        <p class="kicker">${esc(r.worldName)}${r.lineage && r.lineage.gen > 1 ? `${L('・', ' · ')}${esc(genWord(r.lineage.gen))}` : ''}</p><h1>${esc(r.name)}</h1>
        <p class="age">${endAge(r.age, r.hazard)}${r.heqAge !== r.age ? `<small>${L(`人間でいえば${r.heqAge}歳`, `about ${r.heqAge} in human years`)}</small>` : ''}</p>
      </div></div>
      ${lineageHTML(r.lineage, r.name)}
      <div class="cause"><b>${esc(r.cause)}</b><p>${esc(r.text)}</p>${r.why ? `<p class="why">${L('なぜ: ', 'Why: ')}${esc(r.why)}</p>` : ''}</div>
      <dl class="facts">${r.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <h3>${L('最後にそばにいた人', 'Who was there at the end')}</h3>
      ${r.lastWith.length ? `<ul class="lastwith">${r.lastWith.map((t) => `<li>${faceHTML(t.face)}<span><b>${esc(t.name)}</b><small>${esc(ROLE_NAME[t.role])}</small></span></li>`).join('')}</ul>`
        : `<p class="note">${L('そばには誰もいなかった。', 'No one was there.')}</p>`}
      ${r.highlights.length ? `<h3>${L('主な出来事', 'Moments that mattered')}</h3><ul class="highlights">${r.highlights.map((e) => `<li><span>${ageText(e.age)}</span><div>${markGifts(esc(e.text))}</div></li>`).join('')}</ul>` : ''}
      ${r.circle?.length ? `<h3>${L('関わった人たち', 'The people in this life')}</h3><ul class="circle">${r.circle.map((c) => `<li>${faceHTML(c.face)}<span><b>${esc(c.name)}</b><small>${esc(ROLE_NAME[c.role])}</small><small class="fate">${esc(c.fate)}</small></span></li>`).join('')}</ul>` : ''}
      <details class="fulllog"><summary>${L(`年表の全体 (${r.log.length}件)`, `Full timeline (${r.log.length} entries)`)}</summary>${logHTML(r.log, false, new Map(r.names ?? []))}</details>
    </div>
  </article>`;
}

// 過去の人生の一覧。同じ系譜の人生は1つにまとめ、代の順に並べる。focus を渡すとその記録を開いた状態で出す
export function showPast(nav: Nav, focus?: number): void {
  const list = records();
  const fmt = (d: string) => new Date(d).toLocaleDateString(isEn ? 'en-US' : 'ja-JP');
  const item = (r: LifeRecord, i: number) => `<li><button data-i="${i}">${faceHTML(r.face)}<span><b>${r.lineage && r.lineage.gen > 1 ? `<em class="gen">${esc(genWord(r.lineage.gen))}</em>` : ''}${esc(r.name)}</b><small>${esc(r.worldName)}${L('・', ' · ')}${L(`${r.age}歳`, `age ${r.age}`)}${L('・', ' · ')}${esc(r.cause)}</small><small>${fmt(r.date)}</small></span></button></li>`;
  // 系譜ごとにまとめる (初代の記録は rootSeed = その人生の seed とみなす)
  const rootOf = (r: LifeRecord) => r.lineage?.rootSeed ?? r.setup.seed;
  const groups = new Map<number, number[]>();
  list.forEach((r, i) => groups.set(rootOf(r), [...(groups.get(rootOf(r)) ?? []), i]));
  const html = [...groups.values()].map((idx) => {
    if (idx.length === 1) return item(list[idx[0]], idx[0]);
    const sorted = [...idx].sort((a, b) => (list[a].lineage?.gen ?? 1) - (list[b].lineage?.gen ?? 1));
    return `<li class="family"><p class="kicker">${esc(L(`${list[sorted[0]].name}の系譜 (${sorted.length}代)`, `The line of ${list[sorted[0]].name} (${sorted.length} generations)`))}</p><ul class="pastlist">${sorted.map((i) => item(list[i], i)).join('')}</ul></li>`;
  }).join('');
  const open = (i: number) => {
    const r = list[i];
    const el = document.getElementById('pastdetail')!;
    el.innerHTML = `${recordHTML(r)}<div class="choices"><button data-trials="${i}">${L('同じ設定で何回も試す', 'Run this setup many times')}</button><button data-again="${i}">${L('同じ設定で転生', 'Live this setup again')}</button></div>`;
    paintAll(el);
    el.scrollIntoView();
    // 開いた記録からの戻るは、閉じて一覧の先頭へ
    setBack(() => { el.innerHTML = ''; window.scrollTo(0, 0); setBack(nav.title); });
  };
  screen(`
  <main class="page">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('過去の人生', 'Past lives')}</h1>
    <p class="note">${L(`最近の${list.length}つの人生 (最大${MAX})。この端末にだけ残っている。続けた人生は系譜ごとにまとめてある。`, `Your last ${list.length} ${list.length === 1 ? 'life' : 'lives'} (up to ${MAX}). Stored only on this device. Lives carried on by someone else are grouped by line.`)}</p>
    <ul class="pastlist">${html || `<li class="note">${L('まだない。', 'None yet.')}</li>`}</ul>
    <div id="pastdetail"></div>
    ${list.length ? adHTML('past') : ''}
  </main>`, (t) => {
    if (t.closest('[data-go=title]')) return nav.title();
    const i = t.closest<HTMLElement>('[data-i]')?.dataset.i ?? t.closest<HTMLElement>('[data-record]')?.dataset.record;
    if (i !== undefined) open(Number(i));
    const tr = t.closest<HTMLElement>('[data-trials]')?.dataset.trials;
    if (tr !== undefined) return nav.trials(list[Number(tr)].setup);
    const ag = t.closest<HTMLElement>('[data-again]')?.dataset.again;
    if (ag !== undefined) return nav.start({ ...list[Number(ag)].setup, seed: randomSeed() });
  }, { back: nav.title });
  paintAll(document.getElementById('app')!);
  if (focus !== undefined && list[focus]) open(focus);
}
