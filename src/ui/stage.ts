// 動く場面 (舞台)。背景 (paintScene の tick) と立ち絵のコマを 10fps で描き直す。
// その年の記録に join があれば仲間が歩いて入ってきて喜び、fight があれば右から敵が来て戦う。演出は記録どおりで、結果を変えない。
// 一時停止・タブ非表示・画面外・prefers-reduced-motion では止まる (reduced-motion は静止画で、戦いは要点の1コマ)
import type { Figure, Fight, Foe, Hero, Pose, SceneSpec, Tie } from '../engine/types';
import { summary } from '../engine';
import { ambientOf, groundY, paintScene, tintOf, W, H } from './scene';
import { paintSprite, POSE_FRAMES, SW, SH } from './sprite';
import { ENEMY_H, enemyFor, paintEnemy, type EnemyPose, type EnemySpec } from './enemy';
import { castOf, fit } from './pixel';
import { hash, Pix } from './raster';
import { L } from '../i18n';

const FRAME_MS = 100;        // 10fps
// 戦いの演出: 1×で5秒。ただしその年の時間 (速さで割った後) の 85% に収め、年を待たせない
// (待たせると、速さのボタンが「その速さで年が進む」という約束を破り、早送り中にもたつくため)。
// 収めた長さが 1.2秒に満たない (4×のあたり) なら、動かさずに要点の1コマだけ出す。8×以上と「次の選択まで」は剣のしるしだけ
// 1×で全部 (入場・打ち合い4回・決着・余韻) を見られるよう最大5秒 (3秒では打ち合いが速すぎた)
export const FIGHT_MS = 5000, FIGHT_SHARE = 0.85, FIGHT_MIN_MS = 1200;
const JOIN_MS = 1800;        // 仲間が歩いて入ってきて喜ぶまで
const LEAVE_MS = 1500;       // 離れた人が場面から去るまで
const GAP = 30;
const ENEMY_X = 222;

export const FOE_NAME: Record<Foe, string> = {
  monster: L('魔物', 'monster'), beast: L('獣', 'beast'), bandit: L('盗賊', 'bandits'), soldier: L('敵兵', 'soldiers'),
  undead: L('死者', 'the undead'), dragon: L('竜', 'a dragon'), demon: L('魔族', 'demons'), machine: L('機械', 'machines'),
};
export const RESULT_NAME: Record<Fight['result'], string> = {
  win: L('勝った', 'won'), hurt: L('傷を負って勝った', 'won, wounded'), flee: L('退いた', 'retreated'), lose: L('倒れた', 'fell'),
};

type Mode = 'full' | 'key' | 'skip';
interface Actor { id: number | 'me'; fig: Figure; slot: number; phase: number }

// 立ち絵と敵のコマは同じ人・同じ姿勢なら同じ絵なので使い回す
const cache = new Map<string, Pix>();
function cached(key: string, make: () => Pix): Pix {
  let p = cache.get(key);
  if (!p) { if (cache.size > 800) cache.clear(); p = make(); cache.set(key, p); }
  return p;
}
const sprite = (f: Figure, pose: Pose, frame: number) => cached(`${JSON.stringify(f)}|${pose}|${frame % POSE_FRAMES[pose]}`, () => paintSprite(f, pose, frame));
const enemy = (e: EnemySpec, pose: EnemyPose, frame: number) => cached(`e|${e.world}|${e.foe}|${e.seed}|${pose}|${frame & 1}`, () => paintEnemy(e, pose, frame));

// 透明な背景の絵を重ねる。flash は白か赤に寄せる (当たった時の点滅)
function blit(P: Pix, S: Pix, x0: number, y0: number, tint: number[], flash?: 'white' | 'red', alpha = 1): void {
  x0 = Math.round(x0); y0 = Math.round(y0);
  const fc = flash === 'white' ? [255, 255, 255] : flash === 'red' ? [255, 60, 50] : null;
  for (let y = 0; y < S.h; y++) {
    const Y = y0 + y;
    if (Y < 0 || Y >= H) continue;
    for (let x = 0; x < S.w; x++) {
      const si = (y * S.w + x) * 4, a = (S.d[si + 3] / 255) * alpha;
      const X = x0 + x;
      if (a <= 0 || X < 0 || X >= W) continue;
      const di = (Y * W + X) * 4;
      for (let k = 0; k < 3; k++) {
        let v = S.d[si + k] * tint[k];
        if (fc) v = v * 0.4 + fc[k] * 0.6;
        P.d[di + k] = P.d[di + k] * (1 - a) + v * a;
      }
    }
  }
}

// 戦いを省いた年の、右上の小さな剣のしるし (結果で色を変える)
function swordMark(P: Pix, f: Fight): void {
  const c = f.result === 'win' ? '#f2c45a' : f.result === 'hurt' ? '#e0604e' : f.result === 'flee' ? '#a8a4b8' : '#6a5a6a';
  for (let i = 0; i < 9; i++) P.px(W - 14 + i, 4 + i, c, 1, true);
  for (let i = 0; i < 9; i++) P.px(W - 6 - i, 4 + i, c, 1, true);
  P.px(W - 13, 11, '#ffffff', 1, true); P.px(W - 7, 11, '#ffffff', 1, true);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

export interface ShowOpts { budgetMs: number; fast: boolean }

export class Stage {
  private spec: SceneSpec | null = null;
  private actors: Actor[] = [];
  private leaving: { actor: Actor; x: number }[] = [];
  private joining = new Set<number>();
  private fight: Fight | null = null;
  private foe: EnemySpec | null = null;
  private mode: Mode = 'full';
  private fightMs = FIGHT_MS;
  private key = '';
  private clock = 0;           // その年の演出の経過 (止まっているあいだは進まない)
  private tick = 0;
  private raf = 0;
  private last = 0;
  private paused = false;
  private visible = true;
  private bg: Pix | null = null; // 背景が動かない場面の下絵
  private cap: HTMLElement;
  private io: IntersectionObserver | null = null;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 測定 (確かめる用): 1秒あたりの描き直しと1フレームの時間
  private stats = { frames: 0, ms: 0, max: 0, since: performance.now() };

  constructor(private cv: HTMLCanvasElement) {
    cv.width = W; cv.height = H;
    const box = cv.parentElement!;
    this.cap = document.createElement('p');
    this.cap.className = 'stagecap';
    this.cap.setAttribute('aria-live', 'polite');
    box.append(this.cap);
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver((es) => { this.visible = es.some((e) => e.isIntersecting); this.wake(); });
      this.io.observe(cv);
    }
    document.addEventListener('visibilitychange', this.onVis);
  }

  private onVis = () => this.wake();

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
  }

  setPaused(p: boolean): void { this.paused = p; this.wake(); }

  // 人生の画面から: その年の場面を出す。同じ年なら作り直さない (速さのボタンを押しても演出は続く)
  show(h: Hero, o: ShowOpts): void {
    const year = h.log.filter((e) => e.age === h.age);
    const fight = [...year].reverse().find((e) => e.fight)?.fight ?? null;
    const key = `${h.seed}|${h.age}|${h.log.length}|${h.alive}`;
    if (key === this.key) return;
    this.key = key;
    // 戦いで倒れた年は、墓ではなく戦いの場面を出す (死亡記録へ移るまで)
    const lostFight = !h.alive && fight?.result === 'lose';
    const cast = lostFight ? castOf({ ...h, alive: true } as Hero) : castOf(h, h.alive ? [] : summary(h).lastWith);
    const prev = new Map(this.actors.map((a) => [a.id, a]));
    const leave = new Set(year.flatMap((e) => e.leave ?? []));
    this.leaving = [...prev.values()].filter((a) => typeof a.id === 'number' && leave.has(a.id) && !cast.ids.includes(a.id)).map((a) => ({ actor: a, x: this.xOf(a) }));
    this.joining = new Set(year.flatMap((e) => e.join ?? []).filter((id) => cast.ids.includes(id)));
    this.fight = fight;
    this.foe = fight ? enemyFor(h.world.id, fight.foe, hash(h.seed, h.age, 0xf0e)) : null;
    const room = o.budgetMs * FIGHT_SHARE;
    this.mode = !fight ? 'full' : o.fast ? 'skip' : this.reduced || room < FIGHT_MIN_MS ? 'key' : 'full';
    this.fightMs = Math.min(FIGHT_MS, room);
    if (o.fast) this.joining.clear();
    const names = [...this.joining].map((id) => h.people.find((t: Tie) => t.id === id)?.name).filter(Boolean) as string[];
    const lines = [...names.map((n) => L(`${n}が仲間になった`, `${n} joined you`)),
      ...(fight ? [L(`vs ${FOE_NAME[fight.foe]}・${RESULT_NAME[fight.result]}`, `vs ${FOE_NAME[fight.foe]}: ${RESULT_NAME[fight.result]}`)] : [])];
    this.cap.textContent = lines.join(L('　', ' · '));
    this.cap.hidden = !lines.length;
    this.setCast(cast.spec, cast.ids);
  }

  // 死亡記録などから: 決まった場面を静かに動かす (入退場も戦いも無し)
  showSpec(spec: SceneSpec): void {
    this.key = JSON.stringify(spec).length + '|' + spec.seed;
    this.fight = null; this.foe = null; this.leaving = []; this.joining.clear();
    this.cap.hidden = true;
    this.setCast(spec, spec.figures.map((_, i) => -1 - i));
  }

  private setCast(spec: SceneSpec, ids: (number | 'me')[]): void {
    this.spec = spec;
    this.bg = null;
    this.clock = 0;
    this.actors = spec.figures.map((fig, i) => ({ id: ids[i], fig, slot: i, phase: hash(fig.seed, i) % 4 }));
    this.draw();
    fit(this.cv);
    this.wake();
  }

  // 動かすか: 止まっていない・見えている・タブが前・reduced-motion でない・動くものがある
  private live(): boolean {
    if (!this.spec || this.paused || !this.visible || document.hidden || this.reduced || !this.cv.isConnected) return false;
    return ambientOf(this.spec) || this.actors.length > 0 || !!this.foe;
  }

  private wake(): void {
    if (!this.cv.isConnected) return this.destroy();
    if (this.raf || !this.live()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (t: number): void => {
    this.raf = 0;
    if (!this.live()) return;
    if (t - this.last >= FRAME_MS) {
      this.clock += Math.min(250, t - this.last);
      this.last = t;
      this.tick++;
      this.draw();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  // 並び: 戦いの年は主人公を右端に寄せ (敵と向き合う)、ふだんは真ん中に
  private xOf(a: Actor): number {
    const n = this.actors.length;
    if (this.foe && this.mode !== 'skip') {
      const order = this.actors.filter((x) => x.id !== 'me');
      const i = a.id === 'me' ? order.length : order.indexOf(a);
      return 140 - (order.length - i) * GAP - SW / 2;
    }
    const gap = n > 4 ? GAP : 36;
    return W / 2 + (a.slot - (n - 1) / 2) * gap - SW / 2;
  }

  private draw(): void {
    const s = this.spec;
    if (!s) return;
    const t0 = performance.now();
    const tick = this.reduced ? 0 : this.tick;
    // 背景: 動かない場面は一度描いたものを写す
    let P: Pix;
    if (!ambientOf(s)) {
      if (!this.bg) this.bg = paintScene(s, 0);
      P = new Pix(W, H); P.d.set(this.bg.d);
    } else P = paintScene(s, tick);
    const tint = tintOf(s), y0 = groundY(s) - SH + 2;
    const f = this.fight, mode = this.mode;
    // 戦いの進み (0〜1)。要点の1コマは結果が分かる所で止める
    const KEY: Record<Fight['result'], number> = { win: 0.72, hurt: 0.66, flee: 0.85, lose: 0.85 };
    const p = !f || mode === 'skip' ? 1 : mode === 'key' ? KEY[f.result] : this.clock / this.fightMs;
    const beat = p >= 0.15 && p < 0.6 ? Math.floor(((p - 0.15) / 0.45) * 4) : -1; // 打ち合い: 0,2 はこちら、1,3 は敵が打つ
    const end = p >= 0.6;
    const ours = beat === 0 || beat === 2, theirs = beat === 1 || beat === 3;
    const blink = (this.tick & 1) === 0;
    const fleeDx = f?.result === 'flee' && end ? -lerp(0, 90, (p - 0.6) / 0.4) : 0;

    for (const a of this.actors) {
      let x = this.xOf(a), pose: Pose = 'idle', frame = Math.floor(tick / 2) + a.phase;
      let flash: 'white' | 'red' | undefined;
      if (typeof a.id === 'number' && this.joining.has(a.id)) {
        const j = this.reduced ? 0.6 : this.clock / JOIN_MS;
        if (j < 0.45) { x = lerp(-SW, x, j / 0.45); pose = 'walk'; frame = tick; }
        else if (j < 0.85) { pose = 'cheer'; frame = tick; }
      }
      if (f && mode !== 'skip') {
        const me = a.id === 'me';
        // 打つのは主人公と、記録で一緒に戦った人 (allies)。ほかの人は後ろで見守る
        const fights = me || (typeof a.id === 'number' && (f.allies ?? []).includes(a.id));
        if (ours && fights) { pose = 'attack'; frame = tick + a.phase; }
        if (theirs && me && (f.result === 'hurt' || f.result === 'lose') && beat === 3) { pose = 'hurt'; frame = tick; flash = blink ? 'red' : undefined; }
        if (end) {
          if (f.result === 'win') { pose = me || p > 0.75 ? 'cheer' : 'idle'; frame = tick; }
          if (f.result === 'hurt') { pose = p < 0.72 && me ? 'hurt' : 'cheer'; if (pose === 'hurt' && blink) flash = 'red'; frame = tick; }
          if (f.result === 'flee') { pose = 'walk'; frame = tick; x += fleeDx; }
          if (f.result === 'lose' && me) { pose = 'down'; frame = 0; }
        }
      }
      blit(P, sprite(a.fig, pose, frame), x, y0, tint, flash);
    }
    // 去る人は左へ歩いて消える
    for (const l of this.leaving) {
      const k = this.clock / LEAVE_MS;
      if (k >= 1 || this.reduced) continue;
      blit(P, sprite(l.actor.fig, 'walk', tick), lerp(l.x, -SW - 4, k), y0, tint, undefined, 1 - k * 0.5);
    }
    // 敵: 右から入ってきて、打ち合い、結果
    let drewEnemy = false;
    if (f && this.foe && mode !== 'skip') {
      let ex = p < 0.15 ? lerp(W + 4, ENEMY_X, p / 0.15) : ENEMY_X, epose: EnemyPose = 'idle', eflash: 'white' | undefined, alpha = 1;
      if (ours) { epose = 'hurt'; eflash = blink ? 'white' : undefined; }
      if (theirs) epose = 'attack';
      if (end) {
        if (f.result === 'win' || f.result === 'hurt') { epose = 'down'; alpha = p < 0.8 ? 1 : Math.max(0, 1 - (p - 0.8) / 0.2); if (mode === 'key') alpha = 1; }
        if (f.result === 'flee') epose = (this.tick >> 2) & 1 ? 'attack' : 'idle';
        if (f.result === 'lose') epose = 'idle';
      }
      if (f.result === 'flee' && end) ex = ENEMY_X - lerp(0, 20, (p - 0.6) / 0.4);
      if (alpha > 0) { blit(P, enemy(this.foe, epose, this.tick), ex, groundY(s) - ENEMY_H + 2, tint, eflash, alpha); drewEnemy = true; }
    }
    if (f && mode === 'skip') swordMark(P, f);
    P.put(this.cv);
    this.cv.dataset.enemy = drewEnemy ? '1' : '0';
    // 測定
    const ms = performance.now() - t0, st = this.stats;
    st.frames++; st.ms += ms; st.max = Math.max(st.max, ms);
    const span = performance.now() - st.since;
    if (span >= 1000) {
      this.cv.dataset.fps = (st.frames * 1000 / span).toFixed(1);
      this.cv.dataset.frameMs = (st.ms / st.frames).toFixed(2);
      this.cv.dataset.frameMax = st.max.toFixed(2);
      this.stats = { frames: 0, ms: 0, max: 0, since: performance.now() };
    }
  }
}
