// 死にかけた年の演出: 暗くなり、鼓動が速まり、HP が 0 に向かって減っていく。助かるか (九死に一生)、そのまま倒れるか。
// どちらになるかは見ている人に分からないように、途中までは同じ流れ。押す・Enter・Esc で飛ばせる。動きを減らす設定では鼓動を止める
import type { Hazard, Hero } from '../engine/types';
import { hpOf } from '../meta/sheet';
import { L } from '../i18n';
import { musicCrisis } from './music';
import { sfx } from './sfx';

// 死因ごとの、迫ってくる三つの拍
const BEATS: Partial<Record<Hazard, [string, string][]>> = {
  monster: [['牙が迫る', 'Fangs close in'], ['視界が赤く染まる', 'Everything turns red'], ['音が遠のく', 'The sound fades']],
  war: [['矢が降る', 'Arrows fall'], ['足がもつれる', 'Legs give way'], ['空が回る', 'The sky spins']],
  violence: [['刃がきらめく', 'A blade flashes'], ['背中が熱い', 'A burning in the back'], ['膝が落ちる', 'The knees give']],
  disease: [['熱が下がらない', 'The fever will not break'], ['息が浅くなる', 'Breathing grows shallow'], ['誰かが名を呼ぶ', 'Someone calls a name']],
  plague: [['咳が止まらない', 'The coughing will not stop'], ['隣の寝台が空く', 'The next bed empties'], ['灯りが滲む', 'The lamp blurs']],
  infant: [['小さな体が熱い', 'Such a small body, so hot'], ['泣き声が細くなる', 'The crying grows thin'], ['母が手を握る', 'Mother holds a hand']],
  accident: [['足もとが崩れる', 'The ground gives way'], ['体が宙に浮く', 'Weightless for a moment'], ['衝撃', 'Impact']],
  childbirth: [['陣痛が続く', 'The labor goes on'], ['産婆の声が遠い', 'The midwife sounds far away'], ['白い光', 'White light']],
  famine: [['腹が鳴らなくなった', 'The stomach no longer growls'], ['足が前に出ない', 'The feet will not move'], ['目の前が暗い', 'Darkness at the edges']],
  execution: [['刑場の空', 'The sky above the scaffold'], ['群衆のざわめき', 'The murmur of the crowd'], ['刃が上がる', 'The blade rises']],
  magic: [['魔力が暴れる', 'Mana runs wild'], ['内側から焼ける', 'Burning from within'], ['光が弾ける', 'Light bursts']],
};
const DEFAULT: [string, string][] = [['鼓動が速まる', 'The heartbeat quickens'], ['息が苦しい', 'It is hard to breathe'], ['目の前が暗くなる', 'Darkness closes in']];

let playing: Promise<void> | null = null;

/** 演出を流す。survive なら持ち直し、そうでなければ倒れる。終わったら (飛ばしても) 解決する */
export function playSuspense(h: Hero, hz: Hazard, survive: boolean): Promise<void> {
  if (playing) return playing;
  const quick = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { max } = hpOf({ ...h, alive: true } as Hero);
  const from = Math.max(1, Math.round(max * Math.max(0.35, h.stats.hp / 100)));
  const beats = BEATS[hz] ?? DEFAULT;
  const el = document.createElement('div');
  el.className = `suspense${quick ? ' still' : ''}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="sp-in"><div class="sp-heart" aria-hidden="true"></div>
    <p class="sp-beat" id="spbeat"></p>
    <div class="sp-hp"><span>HP</span><i><b id="sphp"></b></i><em id="spnum"></em></div>
    <p class="sp-end" id="spend"></p>
    <button class="sp-skip">${L('飛ばす ▸▸', 'Skip ▸▸')}</button></div>`;
  document.body.append(el);
  const $ = (id: string) => el.querySelector<HTMLElement>(`#${id}`)!;
  const setHp = (v: number) => { $('sphp').style.width = `${Math.max(0, (v / max) * 100).toFixed(1)}%`; $('spnum').textContent = `${Math.max(0, Math.round(v))}/${max}`; };
  setHp(from);
  let done = false;
  const timers: number[] = [];
  musicCrisis(h, true); // 張りつめた曲へ (持ち直したら、その世界の曲へ戻す)
  sfx('alarm');
  playing = new Promise<void>((ok) => {
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', key);
      el.classList.add('out');
      if (survive) musicCrisis(h, false);
      setTimeout(() => { el.remove(); playing = null; ok(); }, quick ? 0 : 400);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); } };
    document.addEventListener('keydown', key);
    el.onclick = finish;
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(() => { if (!done) f(); }, ms));
    // 三つの拍で、HP が少しずつ減っていく (ここまでは助かる時も倒れる時も同じ)
    beats.forEach(([ja, en], i) => at(300 + i * 1100, () => {
      $('spbeat').textContent = L(ja, en);
      sfx('heart');
      el.style.setProperty('--rate', `${0.9 - i * 0.2}s`);
      setHp(from * (1 - (i + 1) * 0.28));
    }));
    at(300 + 3 * 1100, () => {
      if (survive) {
        setHp(max * 0.06);
        at(500, () => { el.classList.add('saved'); setHp(max * 0.22); $('spend').textContent = L('……生きてる。', '...Still alive.'); sfx('saved'); });
        at(2400, finish);
      } else {
        setHp(0);
        el.classList.add('fall');
        sfx('fall');
        $('spend').textContent = L('……', '...');
        at(1800, finish);
      }
    });
  });
  return playing;
}
