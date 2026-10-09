// 転生特典を、大人の年にちゃんと使う: 年に1割ほど、特典ごとの一文 (src/data/cheatuse.ts) と、その効き目。
// スキル強奪はその年に勝った戦いの相手から技を奪い (本当に trait を身につける)、テイムは勝った魔物を従魔にする。
// ほかの人の一生 (錨) では起こさない
import type { Hero, TraitDef } from './types';
import { CHEAT_USE } from '../data/cheatuse';
import { addTie, bump, log } from './bonds';
import { ADULT_HEQ, heqOf } from './mortality';
import { anchorsOf } from './anchor';
import { fill } from './events';
import { availableTraits } from './traits';
import { learn, learnable } from './training';
import { beastName } from './names';
import { makeRng, pickWeighted } from './rng';
import { L, T } from '../i18n';

export const USE_P = 0.12;

const wonThisYear = (h: Hero) => {
  for (let i = h.log.length - 1; i >= 0 && h.log[i].age === h.age; i--) {
    const f = h.log[i].fight;
    if (f && f.result !== 'lose') return f;
  }
  return undefined;
};

export function cheatYear(h: Hero): void {
  if (!h.cheat || !h.alive || anchorsOf(h) || heqOf(h) < ADULT_HEQ - 2) return;
  const won = wonThisYear(h);
  if (h.cheat === 'skill_steal' && won && h.rng() < 0.35) {
    // 戦う技・魔法の技から、その世界・種族で身につけられるもの
    const pool = learnable(h, availableTraits(h.world, h.race).filter((t: TraitDef) => t.kind === 'skill' && t.cost <= 4 && (t.events?.battle ?? 0) >= 1).map((t) => t.id));
    if (pool.length) {
      const t = pickWeighted(h.rng, pool, (x) => 1 / Math.max(1, x.cost));
      return learn(h, t, L(`倒した相手に手をかざし、〈スキル強奪〉で〈${T(t.name)}〉を奪った。相手の目から、何かが抜けていくのが見えた。`,
        `{name} laid a hand on the fallen foe and used Skill Steal to take "${T(t.name)}". Something drained from the foe's eyes.`).replace('{name}', h.given));
    }
  }
  if (h.cheat === 'tamer' && won && (won.foe === 'monster' || won.foe === 'beast') && !h.people.some((t) => t.role === 'familiar' && t.alive) && h.rng() < 0.3) {
    const raw = beastName(makeRng((h.seed * 31 + h.age * 7) >>> 0), h.world);
    const nm = raw.charAt(0).toUpperCase() + raw.slice(1); // 名として呼ぶので頭は大文字 (英語)
    const t = addTie(h, { name: nm, role: 'familiar', race: h.race, sex: h.sex, age: 1, bond: 60 });
    log(h, L(`倒した${nm}が、立ち上がって{name}の足もとに伏せた。〈テイム〉で従魔になった。`, `The ${raw} {name} had beaten got up and lay down at {his} feet. Taming made it a familiar.`).replace('{name}', h.given).replace('{his}', h.sex === 'F' ? 'her' : 'his'), 'power', true, [t.id]).join = [t.id];
    return;
  }
  if (h.rng() >= USE_P) return;
  const uses = CHEAT_USE[h.cheat];
  if (!uses?.length) return;
  const [ja, en, eff] = uses[(h.seed + h.age * 3) % uses.length];
  if (eff) bump(h, eff);
  log(h, fill(L(ja, en), h), 'power');
}
