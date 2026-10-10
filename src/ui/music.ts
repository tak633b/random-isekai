// 背景の音楽。場面ごとに1曲を流し、場面が変わったら重ねて入れ替える (クロスフェード)。
// 既定は切。左下の ♪ で入れる (この端末に覚える)。曲は public/audio/ にあり、音楽を入れるまで読み込まない。
// 出どころとライセンスは TRACKS (about.html・README・public/audio/CREDITS.txt に載せる)
import type { Hero, WorldId } from '../engine/types';
import { L } from '../i18n';
import { load, save } from './dom';

export type Track = 'title' | 'reveal' | 'village' | 'field' | 'dark' | 'wa' | 'xianxia' | 'steampunk' | 'scifi' | 'desert' | 'ocean' | 'battle' | 'death' | 'return';

export interface Credit { file: string; title: string; artist: string; url: string; license: string; licenseUrl: string }
// 曲は OpenGameArt.org と Eric Skiff (ericskiff.com) から。ライセンスは各ページで確かめたもの
const oga = (slug: string) => `https://opengameart.org/content/${slug}`;
const CC0 = { license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const BY3 = { license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' };
export const TRACKS: Record<Track, Credit> = {
  title: { file: 'title.mp3', title: 'Heroes Theme', artist: 'Alexandr Zhelanov', url: oga('heroes-theme'), ...BY3 },
  reveal: { file: 'reveal.mp3', title: 'Mystical Theme', artist: 'Alexandr Zhelanov', url: oga('mystical-theme'), ...BY3 },
  village: { file: 'village.mp3', title: 'Town Theme RPG', artist: 'cynicmusic', url: oga('town-theme-rpg'), ...CC0 },
  field: { file: 'field.mp3', title: 'Woodland Fantasy', artist: 'Matthew Pablo', url: oga('woodland-fantasy'), ...BY3 },
  dark: { file: 'dark.mp3', title: 'Dark Descent', artist: 'Matthew Pablo', url: oga('dark-descent'), ...BY3 },
  wa: { file: 'wa.mp3', title: 'Hot Springs Town', artist: 'Kistol', url: oga('hot-springs-town'), ...CC0 },
  xianxia: { file: 'xianxia.mp3', title: 'Liyan', artist: 'elerya', url: oga('liyan'), ...BY3 },
  steampunk: { file: 'steampunk.mp3', title: 'Victoriana Loop', artist: 'Joe Baxter-Webb (BossLevelVGM)', url: oga('victoriana-loop'), ...BY3 },
  scifi: { file: 'scifi.mp3', title: 'Welcome to Com-Mecha', artist: 'Matthew Pablo', url: oga('theme-of-com-mecha'), ...BY3 },
  desert: { file: 'desert.mp3', title: 'The Eternal Sands', artist: 'HitCtrl', url: oga('fantasy-music-the-eternal-sands'), ...BY3 },
  ocean: { file: 'ocean.mp3', title: "A Sailor's Chant", artist: 'Thimras', url: oga('a-sailors-chant'), ...CC0 },
  battle: { file: 'battle.mp3', title: 'Battle Theme A', artist: 'cynicmusic', url: oga('battle-theme-a'), ...CC0 },
  death: { file: 'death.mp3', title: "Lament for a Warrior's Soul", artist: 'RandomMind', url: oga('fantasy-lament-for-a-warriors-soul'), ...CC0 },
  return: { file: 'return.mp3', title: 'Lively Meadow (Victory Fanfare and Song)', artist: 'Matthew Pablo', url: oga('lively-meadow-victory-fanfare-and-song'), ...BY3 },
};

// 昔の RPG 風 (8ビット・チップチューン)。同じ場面の曲を、人生ごとに TRACKS とこちらのどちらかで流す
const AV = { artist: 'AVGVSTA', url: oga('generic-8-bit-jrpg-soundtrack'), license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' };
export const RETRO: Record<Track, Credit> = {
  title: { file: 'title-retro.mp3', title: 'Opening', ...AV },
  reveal: { file: 'reveal-retro.mp3', title: 'Sanctuary', ...AV },
  village: { file: 'village-retro.mp3', title: 'Town', ...AV },
  field: { file: 'field-retro.mp3', title: 'Overworld', ...AV },
  dark: { file: 'dark-retro.mp3', title: 'Dungeon', ...AV },
  wa: { file: 'wa-retro.mp3', title: 'Timeworn Pagoda', ...AV },
  xianxia: { file: 'xianxia-retro.mp3', title: 'Chipnese', artist: 'Spring Spring', url: oga('chipnese'), ...CC0 },
  steampunk: { file: 'steampunk-retro.mp3', title: 'Clockwork Jester', artist: 'Arold Valda (aroldv)', url: oga('clockwork-jester'), license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  scifi: { file: 'scifi-retro.mp3', title: 'Underclocked (underunderclocked mix)', artist: 'Eric Skiff', url: 'https://ericskiff.com/music/', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  desert: { file: 'desert-retro.mp3', title: 'Desert Theme (8bit chiptune)', artist: 'Wolfgang_ (Ted Kerr)', url: oga('desert-theme-8bit-chiptune-theme'), ...CC0 },
  ocean: { file: 'ocean-retro.mp3', title: 'Mere Baubles (Sailing the Mysterious Seas)', artist: 'Spring Spring', url: oga('mere-baublessailing-the-mysterious-seas'), ...CC0 },
  battle: { file: 'battle-retro.mp3', title: 'Danger', ...AV },
  death: { file: 'death-retro.mp3', title: 'Game Over', ...AV },
  return: { file: 'return-retro.mp3', title: 'Victory', ...AV },
};

// 世界ごとの暮らしの曲
export const WORLD_TRACK: Record<WorldId, Track> = {
  medieval: 'village', academy: 'village', game: 'field', beast: 'field', myth: 'field', frontier: 'field', modern: 'field',
  dark: 'dark', postapoc: 'dark', wa: 'wa', xianxia: 'xianxia', steampunk: 'steampunk',
  cyberpunk: 'scifi', space: 'scifi', desert: 'desert', ocean: 'ocean',
};

const FADE = 2.5;           // 秒
const BATTLE_HOLD = 20000;  // 戦いの曲は、最後の戦いからこれだけ続ける (年ごとに曲が行き来しないように)

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let on = false;
let vol = clampVol(load('musicVol', 35)); // 0〜100
let want: Track = 'title';
let battleAt = -Infinity;
let cur: { file: string; el: HTMLAudioElement; gain: GainNode } | null = null;
let retro = Math.random() < 0.5; // 昔の RPG 風 (RETRO) で流すか。人生ごとに選び直す
let blocked: string | null = null;
let started = false; // 前に入れていた人の音楽を、最初の操作で始めたか

function fadeTo(g: GainNode, v: number): void {
  const now = ctx!.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(v, now + FADE);
}
function fadeOut(): void {
  const old = cur;
  cur = null;
  if (!old) return;
  fadeTo(old.gain, 0);
  setTimeout(() => old.el.pause(), FADE * 1000 + 100);
}

function start(): void {
  const file = (retro ? RETRO : TRACKS)[want].file;
  if (!on || !ctx || !master || cur?.file === file) return;
  fadeOut();
  const el = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
  el.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(gain).connect(master);
  cur = { file, el, gain };
  play(el, gain);
}
// 鳴らす。止められたら (自動再生の決まり・Safari の手順など) 理由を残し、次に画面に触れたときにもう一度
function play(el: HTMLAudioElement, gain: GainNode): void {
  el.play().then(() => fadeTo(gain, 1), (e: unknown) => { blocked = String((e as Error)?.name ?? e); });
}
/** いま鳴らせていない理由 (確かめる用。鳴っていれば null) */
export const musicBlocked = (): string | null => blocked;
// 画面に触れるたびに: 止まっている AudioContext と曲を起こす。前に入れていた人は、ここで鳴り始める
function wake(e: Event): void {
  if ((e.target as Element | null)?.closest?.('[data-music]')) return; // ♪ そのものは toggle が扱う
  if (!on && load('music', false) && !started) { started = true; setMusic(true); return paintAll(); }
  started = true;
  if (!on || !ctx) return;
  if (ctx.state !== 'running') void ctx.resume();
  if (cur?.el.paused) { blocked = null; play(cur.el, cur.gain); }
}

/** 今の場面の曲。音楽が切ってあれば覚えておくだけ */
export function musicScene(t: Track): void {
  want = t;
  start();
}
/** 転生の演出: ここで、この人生を今風と昔の RPG 風のどちらの曲で流すかを選び直す */
export function musicReveal(): void {
  retro = Math.random() < 0.5;
  musicScene('reveal');
}
/** 一生の画面: この年に戦いがあれば戦いの曲、なければその世界の曲 */
export function musicLife(h: Hero): void {
  if (h.alive && h.log.some((e) => e.age === h.age && e.fight)) {
    battleAt = performance.now();
    musicScene('battle');
  } else if (want !== 'battle' || performance.now() - battleAt >= BATTLE_HOLD) musicScene(WORLD_TRACK[h.world.id]);
}
/** 最期の場面: 帰還なら帰還の曲 */
export function musicEnd(h: Hero): void {
  musicScene(h.death?.hazard === 'return' ? 'return' : 'death');
}

function setMusic(v: boolean): void {
  on = v;
  save('music', v);
  if (!on) return fadeOut();
  // iPhone の消音スイッチで Web Audio が黙らないよう、再生の扱いにする (Safari 16.4+)
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = 'playback';
  ctx ??= new AudioContext();
  if (!master) { master = ctx.createGain(); master.gain.value = gainOf(vol); master.connect(ctx.destination); }
  void ctx.resume();
  start();
}

/** つまみ (0〜100) から音の大きさへ。耳の感じ方に合わせて2乗、最大でも 0.4 */
export const gainOf = (v: number): number => 0.4 * (v / 100) ** 2;
function clampVol(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 35;
}
/** 音量 (0〜100)。鳴っている曲にもすぐ効く */
export function setVolume(v: number): void {
  vol = clampVol(v);
  save('musicVol', vol);
  if (ctx && master) master.gain.setTargetAtTime(gainOf(vol), ctx.currentTime, 0.05);
}

/** 音楽の ♪ BGM と音量 (タイトルと一生の画面に置く)。操作は initMusic がまとめて受ける */
export function musicControl(): string {
  return `<span class="musicctl"><button type="button" data-music aria-pressed="${on}" title="${on ? L('BGMを止める', 'Turn music off') : L('BGMを流す', 'Turn music on')}">♪ BGM</button><input type="range" class="musicvol" min="0" max="100" step="5" value="${vol}" aria-label="${L('BGMの音量', 'Music volume')}"${on ? '' : ' hidden'}></span>`;
}
function paintAll(): void {
  document.querySelectorAll<HTMLElement>('.musicctl').forEach((c) => { c.outerHTML = musicControl(); });
}

/** 一度だけ呼ぶ。♪ の押下・音量・最初の操作 (前に入れていた人はここで鳴り始める) を受ける */
export function initMusic(): void {
  document.addEventListener('click', (e) => {
    if (!(e.target as Element | null)?.closest?.('[data-music]')) return;
    setMusic(!on);
    paintAll();
    document.querySelector<HTMLElement>('[data-music]')?.focus();
  });
  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.classList?.contains('musicvol')) setVolume(Number(t.value));
  });
  document.addEventListener('click', wake, true);
  document.addEventListener('keydown', wake, true);
}
