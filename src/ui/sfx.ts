// 効果音。音源ファイルは持たず、WebAudio の矩形波・三角波・雑音で昔の RPG 風に作る (ライセンスの心配がない)。
// 鳴るのは BGM と SE を入れているときだけ (music.ts の seOutput)。音量は BGM のつまみに合わせる。
// 一生の画面では、毎年の変化を前の年と比べて1つだけ選ぶ。ふだんの音は続けて鳴らさず、8倍速以上では鳴らさない。大きな場面はいつも鳴らす
import type { Hero, Status } from '../engine/types';
import { seOutput } from './music';

export type Sfx =
  | 'encounter' | 'slash' | 'magic' | 'strike' | 'defeat' | 'victory' | 'hurt' | 'flee'
  | 'levelup' | 'statup' | 'skill' | 'coin' | 'rank' | 'achieve' | 'climb'
  | 'alarm' | 'heart' | 'saved' | 'fall' | 'soul' | 'portal' | 'gift';

// 音の部品: [始まり (秒), 長さ, 周波数 (終わりの周波数), 波形, 大きさ]
type Note = [number, number, number | [number, number], OscillatorType | 'noise', number];
const n = (f: number) => 440 * 2 ** ((f - 69) / 12); // MIDI の番号から Hz
const arp = (notes: number[], step: number, len: number, w: OscillatorType = 'square', v = 0.25): Note[] => notes.map((m, i) => [i * step, len, n(m), w, v]);

export const SOUNDS: Record<Sfx, Note[]> = {
  encounter: arp([72, 76, 79, 84, 79, 84], 0.05, 0.06),
  slash: [[0, 0.09, [3000, 600], 'noise', 0.35], [0.11, 0.08, [2500, 500], 'noise', 0.3]],
  magic: [[0, 0.35, [400, 1800], 'triangle', 0.3], ...arp([88, 91, 96], 0.07, 0.12, 'triangle', 0.15).map((x): Note => [x[0] + 0.2, x[1], x[2], x[3], x[4]])],
  strike: [[0, 0.12, [900, 200], 'noise', 0.3], [0, 0.1, [180, 90], 'square', 0.15]],
  defeat: [[0, 0.18, [2000, 200], 'noise', 0.35], [0.05, 0.3, [400, 60], 'square', 0.2]],
  victory: [...arp([67, 67, 67], 0.1, 0.08), [0.32, 0.5, n(72), 'square', 0.25], [0.32, 0.5, n(64), 'triangle', 0.25]],
  hurt: [[0, 0.22, [320, 90], 'square', 0.3], [0, 0.12, [1500, 300], 'noise', 0.2]],
  flee: arp([79, 74, 71, 67], 0.05, 0.07, 'triangle', 0.25),
  levelup: [...arp([72, 76, 79, 84, 88, 91], 0.06, 0.08), [0.38, 0.45, n(96), 'square', 0.2]],
  statup: arp([88, 95], 0.09, 0.25, 'triangle', 0.3),
  skill: arp([79, 83, 86, 91, 95], 0.07, 0.3, 'triangle', 0.25),
  coin: [[0, 0.07, n(83), 'square', 0.22], [0.07, 0.3, n(88), 'square', 0.22]],
  rank: [...arp([72, 79], 0.12, 0.1), [0.26, 0.5, n(84), 'square', 0.25], [0.26, 0.5, n(76), 'triangle', 0.25]],
  achieve: arp([76, 80, 83, 88], 0.08, 0.5, 'triangle', 0.25),
  climb: [...arp([72, 74, 76, 77, 79, 81, 83], 0.045, 0.06), [0.32, 0.55, n(84), 'square', 0.25], [0.32, 0.55, n(79), 'triangle', 0.2]],
  alarm: [0, 1, 2].flatMap((i): Note[] => [[i * 0.34, 0.16, n(81), 'square', 0.18], [i * 0.34 + 0.17, 0.16, n(76), 'square', 0.18]]),
  heart: [[0, 0.18, [70, 40], 'sine', 0.8], [0.22, 0.2, [60, 38], 'sine', 0.55]],
  saved: [[0, 1.2, n(72), 'triangle', 0.2], [0.15, 1.1, n(76), 'triangle', 0.18], [0.3, 1, n(79), 'triangle', 0.18]],
  fall: [[0, 1.0, [600, 55], 'square', 0.25], [0.9, 0.6, [120, 40], 'triangle', 0.25]],
  soul: arp([84, 88, 91, 96, 100], 0.18, 0.9, 'triangle', 0.18),
  portal: [[0, 1.3, [200, 2200], 'sine', 0.25], [0.2, 1.1, [300, 3000], 'triangle', 0.12], ...arp([84, 91, 96], 0.25, 0.6, 'triangle', 0.15).map((x): Note => [x[0] + 0.6, x[1], x[2], x[3], x[4]])],
  gift: arp([84, 88, 91, 96, 91, 96], 0.06, 0.4, 'triangle', 0.22),
};

let noiseBuf: AudioBuffer | null = null;
/** 鳴らした音の名前 (確かめる用。新しいものが後ろ、20件まで) */
export const played: Sfx[] = [];
/** 鳴らした音と時刻 (performance.now、確かめる用。20件まで) */
export const playLog: [Sfx, number][] = [];

/** 1つ鳴らす。BGM か SE が切ってあれば何もしない (名前だけ played に残す) */
export function sfx(name: Sfx, k = 1): void {
  played.push(name);
  if (played.length > 20) played.shift();
  playLog.push([name, Math.round(performance.now())]);
  if (playLog.length > 20) playLog.shift();
  const o = seOutput();
  if (!o) return;
  const { ctx, out } = o;
  const t0 = ctx.currentTime + 0.02;
  for (const [at, len, f, w, v] of SOUNDS[name]) {
    const g = ctx.createGain();
    const s = t0 + at;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * k), s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    g.connect(out);
    const [f0, f1] = typeof f === 'number' ? [f, f] : f;
    if (w === 'noise') {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f0, s);
      bp.frequency.exponentialRampToValueAtTime(f1, s + len);
      src.connect(bp).connect(g);
      src.start(s);
      src.stop(s + len + 0.02);
    } else {
      const osc = ctx.createOscillator();
      osc.type = w;
      osc.frequency.setValueAtTime(f0, s);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, s + len);
      osc.connect(g);
      osc.start(s);
      osc.stop(s + len + 0.02);
    }
  }
}
/** いくつかを間をあけて (戦いの流れなど) */
export function sfxSeq(names: Sfx[], gapMs: number): void {
  names.forEach((s, i) => (i ? setTimeout(() => sfx(s), i * gapMs) : sfx(s)));
}

// ---- 一生の画面: 前の年と比べて、鳴らす音を1つ選ぶ ----

const STATUS_ORDER: Status[] = ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'];
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
export interface Snap { hero: Hero; logLen: number; level: number; learned: number; stats: number; gold: number; rank: number; standing: number }
export const snap = (h: Hero): Snap => ({
  hero: h, logLen: h.log.length, level: h.level, learned: h.learned?.length ?? 0,
  stats: h.stats.power + h.stats.mind + h.stats.charm + h.stats.luck,
  gold: h.gold ?? 0, rank: h.rank ? RANKS.indexOf(h.rank) : -1, standing: STATUS_ORDER.indexOf(h.standing ?? h.status),
});

export const ROUTINE_GAP_MS = 3000; // ふだんの音どうしの間 (これより詰めては鳴らさない)
export interface Pick { seq: Sfx[]; big: boolean }
/** 前の年 a から今 b への変化で鳴らす音。無ければ null。戦いは流れ (出会い→斬る→結果) で返す */
export function pickSfx(a: Snap, b: Snap): Pick | null {
  const h = b.hero;
  if (a.hero !== h || b.logLen < a.logLen) return null; // 別の人生・読み込み直し
  if (b.standing > a.standing) return { seq: ['climb'], big: true };
  if (b.rank > a.rank && a.rank >= 0) return { seq: ['rank'], big: true };
  const fight = h.log.slice(a.logLen).reverse().find((e) => e.fight)?.fight;
  if (fight) return { seq: [], big: false }; // 戦いの音は場面の動きに合わせて鳴らす (ui/stage.ts → fightSfx)。この年はほかの音を鳴らさない
  // レベルが表に出る世界では毎回、ほかの世界では5の区切りを越えたときだけ
  if (b.level > a.level && (h.world.tags.includes('gamey') || Math.floor(b.level / 5) > Math.floor(a.level / 5))) return { seq: ['levelup'], big: false };
  if (b.learned > a.learned) return { seq: ['skill'], big: false };
  if (b.stats - a.stats >= 10) return { seq: ['statup'], big: false }; // 子どもの育ちくらいでは鳴らさない
  if (b.gold - a.gold >= Math.max(30, Math.abs(a.gold) * 0.25)) return { seq: ['coin'], big: false };
  return null;
}
/** 鳴らしてよいか: 大きな場面はいつも。ふだんの音は 8倍速以上では鳴らさず、前のふだんの音から ROUTINE_GAP_MS あける */
export const allowed = (p: Pick, fast: boolean, now: number, lastAt: number): boolean => p.big || (!fast && now - lastAt >= ROUTINE_GAP_MS);

let prev: Snap | null = null;
let lastRoutine = -Infinity;
/** 一生の画面を描くたびに呼ぶ (ui/life.ts の render)。fast は 8倍速以上か早送り */
export function sfxLife(h: Hero, fast: boolean): void {
  const cur = snap(h);
  const p = prev && h.alive ? pickSfx(prev, cur) : null;
  prev = cur;
  if (!p) return;
  const now = performance.now();
  if (!allowed(p, fast, now, lastRoutine)) return;
  if (!p.big) lastRoutine = now;
  sfxSeq(p.seq, 260);
}

// ---- 戦いの場面 (ui/stage.ts): 動きの区切りごとに鳴らす ----
// 区切り: -1 敵が来る / 0・2 こちらが打つ / 1・3 敵が打つ / 4 結果。打ち合いは4回だけなので、鳴りっぱなしにならない
export type FightPhase = -2 | -1 | 0 | 1 | 2 | 3 | 4;
export const FIGHT_HIT_K = 0.6; // 打ち合いの音は小さめ
/** 区切り from から to へ進んだときの音。いくつも飛び越えたら最後の区切りの音だけ */
export function fightSfx(from: FightPhase, to: FightPhase, result: 'win' | 'hurt' | 'flee' | 'lose', magic: boolean): Sfx[] {
  if (to <= from) return [];
  if (to === -1) return ['encounter'];
  if (to === 0 || to === 2) return [magic ? 'magic' : 'slash'];
  if (to === 1) return ['strike'];
  if (to === 3) return [result === 'hurt' || result === 'lose' ? 'hurt' : 'strike'];
  if (to === 4) return result === 'win' || result === 'hurt' ? ['defeat', 'victory'] : result === 'flee' ? ['flee'] : [];
  return [];
}
/** 戦いの場面から呼ぶ。結果の音はふつうの大きさ、打ち合いは小さめ */
export function playFight(names: Sfx[]): void {
  names.forEach((n, i) => setTimeout(() => sfx(n, n === 'victory' || n === 'encounter' ? 1 : FIGHT_HIT_K), i * 220));
}
