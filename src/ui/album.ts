// 思い出のアルバム (engine/album.ts が選んだ多くて12の場面) を、その年の場面の絵つきカードにする。
// 絵はその年の主人公の年格好と、その行に関わった人 (多くて2人) で組み立て直す。最期のカードは墓の場面。
// 共有の画像 (PNG): 顔・名・死因・アルバムから4枚・一生の地図・最後の一言を1枚にして保存する
import type { Figure, Hero, Home, Place, SceneSpec, Status, YearKind } from '../engine/types';
import { albumOf, type AlbumTag } from '../engine/album';
import { heq, stageAt } from '../engine';
import { raceOf } from '../engine/races';
import { agingOf } from '../engine/mortality';
import { hash } from './raster';
import { compose, tieFigure, W, H } from './pixel';
import { paintPortrait } from './portrait';
import { drawLifeMap } from './lifemap';
import { ageText } from './labels';
import type { LifeRecord } from './records';
import { L } from '../i18n';

export interface AlbumCard { age: number; text: string; tag: AlbumTag; scene: SceneSpec }

const HOME: Record<Status, Home> = { slave: 'hovel', orphan: 'hovel', poor: 'hovel', commoner: 'house', merchant: 'house', gentry: 'manor', noble: 'manor', royal: 'castle' };
const TODS = ['morning', 'day', 'day', 'dusk', 'night'] as const;
export const TAG_NAME: Record<AlbumTag, string> = {
  birth: L('はじまり', 'Beginning'), fame: L('名を上げた', 'Renown'), fight: L('大きな戦い', 'Great battle'), marriage: L('結婚', 'Marriage'),
  child: L('子', 'A child'), close: L('九死に一生', 'Close call'), death: L('最期', 'The end'), moment: L('ひとこま', 'A moment'),
};

function placeOf(h: Hero, kind: YearKind, tag: AlbumTag, age: number): Place {
  if (tag === 'fight') return 'battle';
  if (tag === 'close') return 'wild';
  switch (kind) {
    case 'arrival': return h.arrival === 'summoned' ? 'temple' : 'home';
    case 'school': return 'academy';
    case 'battle': return 'battle';
    case 'adventure': return age % 2 ? 'dungeon' : 'guild';
    case 'work': return 'town';
    case 'power': return 'temple';
    case 'fame': return h.status === 'noble' || h.status === 'royal' ? 'castle' : 'town';
    case 'hard': return 'wild';
    case 'loss': case 'death': return 'grave';
    default: return 'home';
  }
}

// その年の場面: 主人公をその年の年格好で、関わった人 (その年に生まれていた人) を両脇に
function sceneAt(h: Hero, age: number, kind: YearKind, tag: AlbumTag, who: number[] = []): SceneSpec {
  const r = hash(h.seed, age, 0xa1b);
  const me: Figure = { seed: h.seed, race: h.race, sex: h.sex, stage: stageAt(heq(age, raceOf(h.race), agingOf(h))), job: age === h.age ? h.job : null, status: h.status, me: true, ...(h.transfer ? { earth: true } : {}) };
  const ties = who.map((id) => h.people.find((t) => t.id === id)).filter((t) => t && t.age - (h.age - age) >= 0).slice(0, 2)
    .map((t) => tieFigure(h, { ...t!, age: t!.age - (h.age - age), alive: true }));
  return { seed: hash(h.seed, age), world: h.world.id, place: placeOf(h, kind, tag, age), home: HOME[h.status], tod: TODS[r % TODS.length], season: ((r >>> 8) % 4) as SceneSpec['season'],
    figures: ties.length === 2 ? [ties[0], me, ties[1]] : [...ties, me] };
}

/** 記録に残すアルバム。最期のカードは墓の場面 (grave) を使う */
export function albumCards(h: Hero, grave: SceneSpec): AlbumCard[] {
  return albumOf(h).map(({ e, tag }) => ({ age: e.age, text: e.text, tag, scene: tag === 'death' ? grave : sceneAt(h, e.age, e.kind, tag, e.who) }));
}

// ---- 共有の画像 -------------------------------------------------------------

const CW = 1080, CH = 1350;
const BG = '#14121f', SURF = '#211e33', GOLD = '#e8b44a', TEXT = '#ede4d0', SUB = '#b8ad98';
const FONT = '"DotGothic16", "M PLUS 1p", system-ui, sans-serif';

// ピクセル画を整数倍で貼る (ぼかさない)
function blit(g: CanvasRenderingContext2D, pix: { put(cv: HTMLCanvasElement): void }, x: number, y: number, w: number, h: number): void {
  const cv = document.createElement('canvas');
  pix.put(cv);
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, x, y, w, h);
}

// 1行に収まる長さで折り返す (日本語は文字ごと、英語は語ごと)
function wrap(g: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const parts = /\s/.test(text) ? text.split(/(?<=\s)/) : [...text];
  const lines: string[] = [];
  let cur = '';
  for (const p of parts) {
    if (g.measureText(cur + p).width > width && cur) { lines.push(cur.trimEnd()); cur = p.trimStart(); if (lines.length === maxLines) break; }
    else cur += p;
  }
  if (lines.length < maxLines && cur) lines.push(cur.trimEnd());
  if (lines.length === maxLines && parts.join('').length > lines.join('').length + 1) lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  return lines;
}

/** 記録を1枚の画像にする */
export async function shareCard(r: LifeRecord): Promise<Blob | null> {
  try { await document.fonts?.load(`40px ${FONT}`); } catch { /* 字は手元のもので */ }
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d')!;
  g.fillStyle = BG; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = GOLD; g.lineWidth = 6; g.strokeRect(18, 18, CW - 36, CH - 36);
  g.textBaseline = 'top';
  // 頭: 顔と名と終わり
  g.fillStyle = SURF; g.fillRect(48, 48, 216, 248);
  blit(g, paintPortrait(r.face), 60, 60, 192, 224);
  g.fillStyle = SUB; g.font = `30px ${FONT}`; g.fillText(`Random Isekai · ${r.worldName}`, 296, 56, 740);
  g.fillStyle = TEXT; g.font = `64px ${FONT}`; g.fillText(r.name, 296, 100, 740);
  g.fillStyle = GOLD; g.font = `40px ${FONT}`;
  g.fillText((r.hazard === 'return' ? L(`${r.age}歳で元の世界へ`, `Went home at ${r.age}`) : L(`享年${r.age}`, `Died at ${r.age}`)) + (r.cause ? `  ${r.cause}` : ''), 296, 186, 740);
  g.fillStyle = SUB; g.font = `26px ${FONT}`;
  wrap(g, r.text, 740, 2).forEach((ln, i) => g.fillText(ln, 296, 240 + i * 34));
  // アルバムから4枚 (誕生・最期を含めて、間を均等に)
  const al = r.album ?? [];
  const idx = al.length <= 4 ? al.map((_, i) => i) : [0, Math.round((al.length - 1) / 3), Math.round((2 * (al.length - 1)) / 3), al.length - 1];
  idx.forEach((k, i) => {
    const c = al[k], x = 48 + (i % 2) * 504, y = 330 + Math.floor(i / 2) * 260;
    blit(g, compose(c.scene), x, y, W * 1.5, H * 1.5);
    g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(`${ageText(c.age)} · ${TAG_NAME[c.tag]}`, x, y + 160, 480);
    g.fillStyle = TEXT; g.font = `22px ${FONT}`;
    wrap(g, c.text.replace(/[〈〉]/g, ''), 480, 2).forEach((ln, j) => g.fillText(ln, x, y + 192 + j * 28));
  });
  // 一生の地図
  const top = 330 + 2 * 260 + 10;
  g.fillStyle = SUB; g.font = `26px ${FONT}`; g.fillText(L('一生の地図 (1マス1年)', 'Life map (one square per year)'), 48, top);
  if (r.kinds) {
    const n = r.kinds.length, cols = n <= 120 ? 10 : n <= 400 ? 20 : 40;
    const cell = Math.max(4, Math.min(22, Math.floor(Math.min(984 / cols, 300 / Math.ceil(n / cols))) - 1));
    drawLifeMap(g, r.kinds, n, [48, top + 40], cell);
  }
  // 最後の一言 (遊んだ人の言葉)
  if (r.lastWord) {
    g.fillStyle = GOLD; g.font = `28px ${FONT}`;
    wrap(g, L(`「${r.lastWord}」`, `"${r.lastWord}"`), 984, 2).forEach((ln, i) => g.fillText(ln, 48, CH - 130 + i * 36));
  }
  g.fillStyle = SUB; g.font = `20px ${FONT}`;
  g.fillText(new Date(r.date).toLocaleDateString(L('ja-JP', 'en-US')), 48, CH - 52);
  return new Promise((ok) => cv.toBlob((b) => ok(b), 'image/png'));
}

/** 画像を保存する (共有できる端末では共有の画面を出す) */
export async function saveShareCard(r: LifeRecord): Promise<boolean> {
  const blob = await shareCard(r);
  if (!blob) return false;
  const name = `random-isekai-${r.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.png`;
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: r.name }); return true; }
  } catch { /* 共有をやめた・できない: 保存にする */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
