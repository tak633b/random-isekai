// ほかの人の一生 (輪の人・ほかの転生者) と、年代記 (世界の歴史) と、この世界の転生者の一覧。
// 一生はその場でエンジンに作らせる (lifeOfTie / reincarnatorLife)。文は esc してから入れ、〈〉は markGifts で目立たせる
import { formatGold } from '../engine/econ';
import type { ChronicleEntry, ChronicleKind, Hero, OtherLife, Reincarnator, YearKind } from '../engine/types';
import { CHEATS, RACES, lifeOfTie, statusName } from '../engine';
import { reincarnatorLife, reincarnatorsOf } from '../engine/reincarnators';
import { chronicleOf } from '../engine/chronicle';
import { kindIcon } from './icons';
import { markGifts } from './records';
import { ARRIVAL_NAME, SEX_NAME, ageText, jobName, pastEnd } from './labels';
import { esc } from './dom';
import { L, T } from '../i18n';

// 年代記の種類を、年表のドットの印で見せる
const CHRON_ICON: Record<ChronicleKind, YearKind> = { war: 'battle', plague: 'ill', famine: 'hard', demon: 'death', reincarnator: 'arrival', hero: 'fame', realm: 'family' };
export const CHRON_NAME: Record<ChronicleKind, string> = {
  war: L('戦', 'War'), plague: L('疫病', 'Plague'), famine: L('飢饉', 'Famine'), demon: L('魔王', 'Demon Lord'),
  reincarnator: L('転生者', 'Reincarnator'), hero: L('英雄', 'Heroes'), realm: L('国', 'Realm'),
};

const start = (h: Hero) => h.log[0]?.age ?? 0;

// 主人公の年齢 at を、主人公から見た言い方に (生まれる前 / 生きていた年 / 亡くなった後)
export function whenText(h: Hero, at: number): string {
  if (at < start(h)) return L(`${h.given}が生まれる${start(h) - at}年前`, `${start(h) - at} ${start(h) - at === 1 ? 'year' : 'years'} before ${h.given}`);
  if (!h.alive && at > h.age) return L(`${h.given}の死から${at - h.age}年後`, `${at - h.age} ${at - h.age === 1 ? 'year' : 'years'} after ${h.given} died`);
  return L(`${h.given} ${at}歳`, `${h.given} at ${at}`);
}

// 列に入れる短い言い方 (1行に収める): 誕生58年前 / 23歳 / 没後8年
export function shortWhen(h: Hero, at: number): string {
  const s = start(h);
  if (at < s) return L(`誕生${s - at}年前`, `${s - at}y before birth`);
  if (!h.alive && at > h.age) return L(`没後${at - h.age}年`, `${at - h.age}y after death`);
  return L(`${at}歳`, `Age ${at}`);
}

// 生きている主人公には、まだ来ていない年は見せない
const visible = (h: Hero, at: number) => !h.alive || at <= h.age;

function nameOf(h: Hero, key: string, roster: Reincarnator[]): string | null {
  const [k, n] = key.split(':');
  if (k === 't') return h.people.find((t) => t.id === Number(n))?.name ?? null;
  if (k === 'r') return roster.find((p) => p.id === Number(n))?.name ?? null;
  return null;
}

// 年代記。lived の年は押すと主人公の年表のその年へ (data-jump)、人の名は押すとその人の一生 (data-life)
export function chronicleHTML(h: Hero): string {
  const roster = reincarnatorsOf(h);
  const list = chronicleOf(h).filter((e) => visible(h, e.at));
  if (!list.length) return `<p class="note">${L('まだ記すことはない。', 'Nothing recorded yet.')}</p>`;
  const row = (e: ChronicleEntry) => {
    const label = esc(shortWhen(h, e.at)), title = esc(whenText(h, e.at));
    const when = e.lived ? `<button class="when" data-jump="${e.at}" title="${title}" aria-label="${title}">${label}</button>` : `<span class="when" title="${title}">${label}</span>`;
    // 同じ人が 't:' と 'r:' の両方で載ることがあるので、名前で1つにする
    const seen = new Set<string>();
    const who = (e.who ?? []).map((k) => ({ k, n: nameOf(h, k, roster) })).filter((x) => x.n && !seen.has(x.n) && seen.add(x.n))
      .map((x) => `<button class="whobtn" data-life="${esc(x.k)}">${esc(x.n!)}</button>`).join('');
    return `<li class="ch-${e.kind}${e.lived ? ' lived' : ''}">${when}<div>${kindIcon(CHRON_ICON[e.kind])}<span class="chk">${esc(CHRON_NAME[e.kind])}</span>${markGifts(esc(e.text))}${who ? `<span class="whos">${who}</span>` : ''}</div></li>`;
  };
  return `<ol class="chronicle">${list.map(row).join('')}</ol>`;
}

// 転生者ごとの前世の終わりの一文。名簿の順に、同じ文が重ならないよう割り当てる (一覧と一生の画面で同じ文になる)
function pastEnds(roster: Reincarnator[]): Map<number, string> {
  const used = new Set<number>(), out = new Map<number, string>();
  for (const p of roster) {
    const e = pastEnd(p.past.cause, p.arrival === 'summoned', p.seed, used.size >= 8 ? new Set() : used);
    if (e.i >= 0) used.add(e.i);
    out.set(p.id, e.text);
  }
  return out;
}

// この世界の転生者: 会った人と、年代記に名が出た (噂を聞いた) 人
export function reincarnatorsHTML(h: Hero): string {
  const roster = reincarnatorsOf(h);
  const heard = new Set(chronicleOf(h).filter((e) => visible(h, e.at)).flatMap((e) => e.who ?? []).filter((k) => k.startsWith('r:')).map((k) => Number(k.slice(2))));
  const known = roster.filter((p) => p.tieId !== undefined || heard.has(p.id));
  const latest = (p: Reincarnator) => [...chronicleOf(h)].reverse().find((e) => visible(h, e.at) && e.who?.includes(`r:${p.id}`));
  const rest = roster.length - known.length;
  if (!known.length) return `<p class="note">${L(`この世界には${roster.length}人の転生者がいるらしい。まだ誰の噂も聞いていない。`, `There seem to be ${roster.length} other reincarnator${roster.length === 1 ? '' : 's'} in this world. No word of any of them yet.`)}</p>`;
  const ends = pastEnds(roster);
  return `<ul class="reinc">${known.map((p) => {
    const l = latest(p);
    const end = { text: ends.get(p.id) ?? '' };
    return `<li><button data-life="r:${p.id}"><b>${esc(p.name)}</b><small>${esc(T(RACES[p.race].name))}${L('・', ' · ')}${esc(ARRIVAL_NAME[p.arrival])}${p.tieId !== undefined ? L('・会った', ' · met') : L('・噂', ' · rumor')}</small>
      <small class="gift">${L(`〈${esc(T(CHEATS[p.cheat].name))}〉`, `"${esc(T(CHEATS[p.cheat].name))}"`)}</small>
      <small>${L(`前世: ${p.past.age}歳の${esc(T(p.past.job))}。${esc(end.text)}`, `Past life: a ${p.past.age}-year-old ${esc(T(p.past.job))}. ${esc(end.text)}`)}</small>
      ${l ? `<small class="fate">${esc(whenText(h, l.at))}${L(': ', ': ')}${markGifts(esc(l.text))}</small>` : ''}</button></li>`;
  }).join('')}</ul>${rest > 0 ? `<p class="note">${L(`ほかに${rest}人、まだ名も聞かない転生者がいる。`, `And ${rest} more you have not heard of yet.`)}</p>` : ''}`;
}

// 年表の中の、その年 (記録の無い年なら、それより前でいちばん近い年。無ければ最初の年)
export function nearestYear(root: ParentNode, age: number): HTMLElement | null {
  const ys = [...root.querySelectorAll<HTMLElement>('.yr[data-age]')];
  let best: HTMLElement | null = null, ba = -Infinity;
  for (const y of ys) { const a = Number(y.dataset.age); if (a <= age && a > ba) { best = y; ba = a; } }
  return best ?? ys.sort((x, y) => Number(x.dataset.age) - Number(y.dataset.age))[0] ?? null;
}

// その人の一生をエンジンに作らせる。key は 't:<id>' か 'r:<id>'
export function lifeOf(h: Hero, key: string): OtherLife | null {
  const [k, n] = key.split(':');
  try {
    if (k === 't') {
      // 転生者として会った人は、転生者の一生の方を見せる (前世と特典がある)
      const p = reincarnatorsOf(h).find((x) => x.tieId === Number(n));
      return p ? reincarnatorLife(h, p.id) : lifeOfTie(h, Number(n));
    }
    if (k === 'r') return reincarnatorLife(h, Number(n));
  } catch { /* 古い記録などで作れなければ出さない */ }
  return null;
}

// 一生の画面の中身。その人の年齢で並べ、主人公の年齢を小さく添える。主人公と分け合った出来事には印 (押すと主人公の年表へ)
function lifeHTML(h: Hero, o: OtherLife): string {
  // 主人公と分け合った出来事: 主人公の年表の同じ年に同じ文があるか、主人公の名が出てくる (よくある文が偶然重なるのを避けて年も見る)
  const heroAt = (age: number) => o.bornAt + age;
  const heroLines = new Set(h.log.map((e) => `${e.age}|${e.text}`));
  // エンジンが印 (LogEntry.shared) を付けていればそれだけを使う。印の無い古いデータは文と年の一致から推す
  const marked = o.log.some((e) => (e as { shared?: boolean }).shared !== undefined);
  const sharedAt = (e: { age: number; text: string; shared?: boolean }) =>
    marked ? e.shared === true : heroLines.has(`${heroAt(e.age)}|${e.text}`) || e.text.includes(h.given);
  const deathEntry = [...o.log].reverse().find((e) => e.kind === 'death');
  // 転生者なら名簿の seed と転生の型 (一覧と同じ文になるように)
  const rp = o.key.startsWith('r:') ? reincarnatorsOf(h).find((x) => `r:${x.id}` === o.key) : undefined;
  const summoned = rp ? rp.arrival === 'summoned' : o.past?.cause === 'unknown';
  const seed = [...o.key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pastText = o.past ? (rp ? pastEnds(reincarnatorsOf(h)).get(rp.id)! : pastEnd(o.past.cause, summoned, seed).text) : '';
  // 主人公がまだ生きているなら、その人の今より後 (死も含む) は畳んでおく (先の年を見たい人だけが開く)
  const future = h.alive && o.diedAt !== undefined && o.diedAt > h.age;
  const facts: [string, string][] = [
    [L('生まれ', 'Born'), `${statusName(o.status, h.world)}${L('・', ', ')}${T(RACES[o.race].name)}${L('・', ', ')}${SEX_NAME[o.sex]}${L(`(${whenText(h, o.bornAt)})`, ` (${whenText(h, o.bornAt)})`)}`],
    [L('職業', 'Job'), jobName(o.job)],
    [L('強さ', 'Strength'), `Lv ${Math.round(o.level)}${o.rank ? L(`・ランク${o.rank}`, `, Rank ${o.rank}`) : ''}`],
    // お金は亡くなった時点のもの (先の年は伏せる)
    ...(o.gold !== undefined && o.diedAt !== undefined && !future ? [[L('遺したお金', 'Left behind'), formatGold(h.world.id, o.gold)] as [string, string]] : []),
    ...(o.cheat ? [[L('特典', 'Cheat skill'), L(`〈${T(CHEATS[o.cheat].name)}〉`, `"${T(CHEATS[o.cheat].name)}"`)] as [string, string]] : []),
    ...(o.past ? [[L('前世', 'Past life'), L(`${o.past.age}歳の${T(o.past.job)}。${pastText}`, `A ${o.past.age}-year-old ${T(o.past.job)}. ${pastText}`)] as [string, string]] : []),
    // 元の世界へ帰った人は享年と言わない (labels.ts の endAge と同じ言い方)
    o.death?.hazard === 'return' && o.ageAtDeath !== undefined && !future
      ? [L('元の世界へ', 'Went home'), L(`${o.ageAtDeath}歳で元の世界へ(${whenText(h, o.diedAt!)})`, `At ${o.ageAtDeath} (${whenText(h, o.diedAt!)})`)]
      : [L('享年', 'Died at'), o.ageAtDeath !== undefined && !future ? L(`${o.ageAtDeath}歳(${whenText(h, o.diedAt!)})`, `${o.ageAtDeath} (${whenText(h, o.diedAt!)})`) : L('まだ生きている', 'Still alive')],
  ];
  // 主人公の今より後の年: 主人公が亡くなっていれば区切り線の後に、生きていれば畳んだ中に
  const cut = (age: number) => heroAt(age) > h.age;
  const row = (e: OtherLife['log'][number]) => {
    const s2 = sharedAt(e);
    const at = heroAt(e.age);
    const hero = at >= start(h) && at <= h.age ? `<small class="heroage" title="${esc(whenText(h, at))}">${esc(L(`主人公${at}歳`, `you ${at}`))}</small>` : '';
    return `<li class="k-${e.kind}${e.big ? ' big' : ''}${s2 ? ' shared' : ''}"><span class="oage">${ageText(e.age)}</span><div>${kindIcon(e.kind)}${markGifts(esc(e.text))}${hero}${s2 && hero ? `<button class="whobtn" data-jump="${at}">${L('一緒に', 'together')}</button>` : s2 ? `<span class="sharedtag">${L('一緒に', 'together')}</span>` : ''}${e.why ? `<small class="why">${esc(e.why)}</small>` : ''}</div></li>`;
  };
  const before = o.log.filter((e) => !cut(e.age)), after = o.log.filter((e) => cut(e.age));
  const causeBox = o.death ? `<div class="cause"><b>${esc(o.death.label)}</b><p>${esc(o.death.text)}</p>${deathEntry?.why ? `<p class="why">${L('なぜ: ', 'Why: ')}${esc(deathEntry.why)}</p>` : ''}</div>` : '';
  const items = before.map(row).join('') + (after.length && !h.alive ? `<li class="sep">${L(`ここから先は、${h.given}が亡くなった後のこと`, `What follows is after ${h.given} died`)}</li>${after.map(row).join('')}` : '');
  const later = after.length && h.alive
    ? `<details class="future"><summary>${L(`この先のこと (${h.given}の今より後。${after.length}件)`, `What lies ahead (after ${h.given}'s present; ${after.length})`)}</summary>${future ? causeBox : ''}<ol class="otherlog">${after.map(row).join('')}</ol></details>` : '';
  return `<p class="kicker">${L('この人の一生', 'A life')}</p><h2 id="lifetitle">${esc(o.name)}</h2>
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${markGifts(esc(v))}</dd></div>`).join('')}</dl>
    ${future ? '' : causeBox}
    <ol class="otherlog">${items}</ol>${later}`;
}

// 一生の画面 (モーダル)。Esc か「閉じる」で閉じる。onJump は主人公の年表のその年へ
export function openLife(h: Hero, key: string, onJump: (heroAge: number) => void, onClose?: () => void): void {
  const t0 = performance.now();
  const o = lifeOf(h, key);
  if (!o) return;
  const ms = performance.now() - t0;
  const back = document.createElement('div');
  back.className = 'modal-back lifemodal';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="lifetitle" data-ms="${ms.toFixed(1)}">
    <div class="modalhead"><button class="close" data-x="close" aria-label="${L('閉じる', 'Close')}">${L('閉じる', 'Close')}</button></div>${lifeHTML(h, o)}</div>`;
  const prev = document.activeElement as HTMLElement | null;
  const close = () => { back.remove(); document.removeEventListener('keydown', key_); prev?.focus(); onClose?.(); };
  const key_ = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...back.querySelectorAll<HTMLElement>('button')];
    const i = f.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus();
  };
  back.onclick = (e) => {
    const t = e.target as HTMLElement;
    if (t === back || t.closest('[data-x=close]')) return close();
    const j = t.closest<HTMLElement>('[data-jump]')?.dataset.jump;
    if (j !== undefined) { close(); onJump(Number(j)); }
  };
  document.addEventListener('keydown', key_);
  document.body.append(back);
  back.querySelector<HTMLElement>('[data-x=close]')?.focus();
}
