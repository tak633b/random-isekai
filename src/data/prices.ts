// 解放の値段の表 (チケットの枚数)。「設定して転生」を開くと FREE は無料で使える。
// ふつうは1、強いものは3〜5、特典の上位は8〜10。trait は cost と種類から決める
import type { CheatId, RaceId, StartAge, Status, TraitDef, WorldId } from '../engine/types';
import { WORLD_IDS } from '../engine/worlds';
import { RACE_IDS } from '../engine/races';
import { CHEAT_IDS } from '../engine/cheats';
import { allTraits } from '../engine/traits';
import type { UnlockKey } from '../meta/types';

export const CUSTOM: UnlockKey = 'custom:setup';
export const BLESSING_KEY: UnlockKey = 'blessing:on';

// 長く生きられる世界ほど高い (表の e0 が 60 を超えるものは 3、40 を超えるものは 2、ほかは 1)
const WORLD_PRICE: Partial<Record<WorldId, number>> = { cyberpunk: 3, space: 3, modern: 3, academy: 2, steampunk: 2 };

// 長命・強い種族ほど高い
const RACE_PRICE: Partial<Record<RaceId, number>> = {
  vampire: 5, elf: 4, dark_elf: 4, demon: 4, dragonkin: 4,
  dwarf: 3, oni: 3, merfolk: 3, alien: 3, beast_fox: 3, half_elf: 2, halfling: 2, android: 2, cyborg: 2,
};

const CHEAT_PRICE: Record<CheatId, number> = {
  immortal_body: 10, return_by_death: 9, creation: 8, regeneration: 8, max_luck: 6, skill_steal: 6,
  all_magic: 5, infinite_mana: 5, sword_saint: 5, online_shop: 5, poison_immunity: 5, foresight: 4, holy_power: 4,
  modern_medicine: 4, exp_boost: 3, growth: 3, tamer: 3, gacha: 3, charm_eyes: 3, psychic: 3, stealth: 3, hacking: 3,
  appraisal: 2, item_box: 2, agri_knowledge: 2, map: 2, cooking: 2, hide_status: 1, language: 1, trash_skill: 1,
};

const STATUS_PRICE: Record<Status, number> = { slave: 1, orphan: 1, poor: 1, commoner: 0, merchant: 1, gentry: 2, noble: 3, royal: 5 };
const START_PRICE: Record<StartAge, number> = { birth: 0, child: 1, teen: 2, adult: 2 };

// trait: cost 1〜2 は1、3 は2、4 は3、5 は4、6 は5。加護は +1。弱点は1
export function traitPrice(t: TraitDef): number {
  if (t.kind === 'weakness') return 1;
  const base = t.cost <= 2 ? 1 : t.cost - 1;
  return Math.min(5, base + (t.kind === 'blessing' ? 1 : 0));
}

const plain = (t: TraitDef) => !t.tags && !t.not && t.magic === undefined && t.powers === undefined && !t.tech && !t.races;
// 最初から使える trait: どの世界でも選べる、cost 1 の能力・スキル・体質を8つと、軽い弱点を4つ (定義の順)
const FREE_TRAITS = [
  ...allTraits().filter((t) => plain(t) && t.kind !== 'weakness' && t.cost === 1).slice(0, 8),
  ...allTraits().filter((t) => plain(t) && t.kind === 'weakness' && t.cost >= -2).slice(0, 4),
].map((t) => `trait:${t.id}` as UnlockKey);

export const FREE: UnlockKey[] = ['world:medieval', 'race:human', 'startAge:birth', 'status:commoner', ...FREE_TRAITS];

export const PRICES: Record<UnlockKey, number> = Object.fromEntries([
  [CUSTOM, 10],
  [BLESSING_KEY, 3],
  ...WORLD_IDS.map((w) => [`world:${w}`, WORLD_PRICE[w] ?? 1]),
  ...RACE_IDS.map((r) => [`race:${r}`, RACE_PRICE[r] ?? 1]),
  ...CHEAT_IDS.map((c) => [`cheat:${c}`, CHEAT_PRICE[c]]),
  ...(Object.keys(STATUS_PRICE) as Status[]).map((s) => [`status:${s}`, STATUS_PRICE[s]]),
  ...(Object.keys(START_PRICE) as StartAge[]).map((a) => [`startAge:${a}`, START_PRICE[a]]),
  ...allTraits().map((t) => [`trait:${t.id}`, traitPrice(t)]),
  ...FREE.map((k) => [k, 0]),
]) as Record<UnlockKey, number>;
