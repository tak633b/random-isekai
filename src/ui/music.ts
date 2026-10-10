// 背景の音楽。場面ごとに1曲を流し、場面が変わったら重ねて入れ替える (クロスフェード)。
// 既定は切。左下の ♪ で入れる (この端末に覚える)。曲は public/audio/ にあり、音楽を入れるまで読み込まない。
// 出どころとライセンスは TRACKS (about.html・README・public/audio/CREDITS.txt に載せる)
import type { Hero, WorldId } from '../engine/types';
import { L } from '../i18n';
import { load, save } from './dom';

export type Track = 'title' | 'reveal' | 'village' | 'field' | 'dark' | 'wa' | 'xianxia' | 'steampunk' | 'scifi' | 'desert' | 'ocean' | 'battle' | 'death' | 'return';

export interface Credit { file: string; title: string; artist: string; url: string; license: string; licenseUrl: string }
// 曲はすべて OpenGameArt.org から (ライセンスは各ページで確かめたもの)
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
let cur: { track: Track; el: HTMLAudioElement; gain: GainNode } | null = null;

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
  if (!on || !ctx || !master || cur?.track === want) return;
  fadeOut();
  const el = new Audio(`${import.meta.env.BASE_URL}audio/${TRACKS[want].file}`);
  el.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(gain).connect(master);
  cur = { track: want, el, gain };
  el.play().then(() => fadeTo(gain, 1), () => { /* 止められたら、次に ♪ を押したときに */ });
}

/** 今の場面の曲。音楽が切ってあれば覚えておくだけ */
export function musicScene(t: Track): void {
  want = t;
  start();
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
  ctx ??= new AudioContext();
  if (!master) { master = ctx.createGain(); master.gain.value = vol / 100; master.connect(ctx.destination); }
  void ctx.resume();
  start();
}

function clampVol(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 35;
}
/** 音量 (0〜100)。鳴っている曲にもすぐ効く */
export function setVolume(v: number): void {
  vol = clampVol(v);
  save('musicVol', vol);
  if (ctx && master) master.gain.setTargetAtTime(vol / 100, ctx.currentTime, 0.05);
}

/** 左下の ♪ と音量 (どの画面にも出る。音量は音楽を入れているときだけ)。前に入れていた人は、最初に画面に触れたときに鳴り出す (自動再生の決まり) */
export function initMusic(): void {
  const box = document.createElement('div');
  box.className = 'musicbox';
  box.innerHTML = `<button class="musicbtn">♪</button><input type="range" class="musicvol" min="0" max="100" step="5" value="${vol}" aria-label="${L('音量', 'Volume')}">`;
  const b = box.querySelector<HTMLButtonElement>('button')!;
  const r = box.querySelector<HTMLInputElement>('input')!;
  const paint = () => { b.setAttribute('aria-pressed', String(on)); b.title = b.ariaLabel = on ? L('音楽を止める', 'Turn music off') : L('音楽を流す', 'Turn music on'); r.hidden = !on; };
  b.onclick = () => { setMusic(!on); paint(); };
  r.oninput = () => setVolume(Number(r.value));
  document.body.append(box);
  paint();
  if (load('music', false)) document.addEventListener('pointerdown', (e) => { if (!box.contains(e.target as Node)) { setMusic(true); paint(); } }, { once: true });
}
