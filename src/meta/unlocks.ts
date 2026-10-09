// 解放: チケットで「設定して転生」と、その画面の選択肢を1つずつ開ける。
// おまかせの人生で見たもの (seen) は半額 (切り上げ)。FREE は「設定して転生」を開いた時点で使える
import type { CheatId, RaceId, StartAge, Status, World, WorldId } from '../engine/types';
import { WORLDS, WORLD_IDS } from '../engine/worlds';
import { RACE_IDS } from '../engine/races';
import { CHEAT_IDS, availableCheats } from '../engine/cheats';
import { availableTraits } from '../engine/traits';
import { BLESSING_KEY, CUSTOM, FREE, PRICES } from '../data/prices';
import { loadProgress, saveProgress } from './store';
import type { Progress, UnlockKey } from './types';

export { CUSTOM, BLESSING_KEY, PRICES, FREE };
const FREE_SET = new Set<UnlockKey>(FREE);
export const ALL_UNLOCKS = Object.keys(PRICES) as UnlockKey[];

export const isSeen = (key: UnlockKey, p: Progress = loadProgress()): boolean => p.seen.includes(key);

export function isUnlocked(key: UnlockKey, p: Progress = loadProgress()): boolean {
  if (p.unlocked.includes(key)) return true;
  return FREE_SET.has(key) && p.unlocked.includes(CUSTOM);
}

// 値段。表に無いものは null。見たものは半額 (切り上げ)。「設定して転生」は値引きしない
export function priceOf(key: UnlockKey, p: Progress = loadProgress()): number | null {
  const base = PRICES[key];
  if (base === undefined) return null;
  return key !== CUSTOM && isSeen(key, p) ? Math.ceil(base / 2) : base;
}

export type UnlockBlock = 'unknown' | 'owned' | 'locked' | 'tickets';
// 解放できない理由 (できるなら null)。locked は「設定して転生」がまだ閉じている
export function unlockBlock(key: UnlockKey, p: Progress = loadProgress()): UnlockBlock | null {
  const price = priceOf(key, p);
  if (price === null) return 'unknown';
  if (isUnlocked(key, p)) return 'owned';
  if (key !== CUSTOM && !p.unlocked.includes(CUSTOM)) return 'locked';
  return p.tickets < price ? 'tickets' : null;
}
export const canUnlock = (key: UnlockKey, p: Progress = loadProgress()): boolean => unlockBlock(key, p) === null;

// チケットを引いて解放する。できなければ何も変えずに false
export function unlock(key: UnlockKey): boolean {
  const p = loadProgress();
  if (!canUnlock(key, p)) return false;
  saveProgress({ ...p, tickets: p.tickets - priceOf(key, p)!, unlocked: [...p.unlocked, key] });
  return true;
}

export interface UnlockedChoices {
  custom: boolean;          // 「設定して転生」が開いている
  worlds: WorldId[];
  races: RaceId[];          // world を渡したら、その世界に生まれうるものだけ
  cheats: CheatId[];        // world を渡したら、その世界で選べるものだけ
  statuses: Status[];
  startAges: StartAge[];
  blessing: boolean;
  traits: string[];         // world と race を渡したら、その組で選べるものだけ
}

const STATUSES: Status[] = ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'];
const START_AGES: StartAge[] = ['birth', 'child', 'teen', 'adult'];

// 設定の画面がおまかせで引く範囲を、解放したものに絞るための一覧
export function unlockedChoices(world?: World | WorldId, race?: RaceId, p: Progress = loadProgress()): UnlockedChoices {
  const has = (k: string) => isUnlocked(k as UnlockKey, p);
  const w = typeof world === 'string' ? WORLDS[world] : world;
  const born = w ? new Set(w.races.filter(([, n]) => n > 0).map(([r]) => r)) : null;
  const cheatOk = w ? new Set(availableCheats(w).map((c) => c.id)) : null;
  const traitOk = w && race ? availableTraits(w, race).map((t) => t.id) : Object.keys(PRICES).filter((k) => k.startsWith('trait:')).map((k) => k.slice(6));
  return {
    custom: p.unlocked.includes(CUSTOM),
    worlds: WORLD_IDS.filter((x) => has(`world:${x}`)),
    races: RACE_IDS.filter((x) => has(`race:${x}`) && (!born || born.has(x))),
    cheats: CHEAT_IDS.filter((x) => has(`cheat:${x}`) && (!cheatOk || cheatOk.has(x))),
    statuses: STATUSES.filter((x) => has(`status:${x}`)),
    startAges: START_AGES.filter((x) => has(`startAge:${x}`)),
    blessing: has(BLESSING_KEY),
    traits: traitOk.filter((id) => has(`trait:${id}`)),
  };
}

// 解放の割合 (図鑑の画面と実績の collection: 'unlocks')。無料のものは数えない
export function unlockProgress(p: Progress = loadProgress()): { total: number; got: number } {
  const paid = ALL_UNLOCKS.filter((k) => PRICES[k] > 0);
  return { total: paid.length, got: paid.filter((k) => p.unlocked.includes(k)).length };
}
