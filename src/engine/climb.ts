// 成り上がりと没落。身分は生まれ (h.status) のまま残し、今の身分 (h.standing) を変える。変わるたびに年表と h.climb に残る。
// 上がる道は src/data/climb.ts の ROUTES (「何を鍛える？」の候補に1つ出る。training.ts)。
// ほかに、出来事のしるしで上がる (解放された freed → 貧民、騎士 knighted → 郷士、領主 lord → 貴族) と、
// 暮らし向きが尽きた・追放された (exiled) ときに落ちる (没落。しるし fallen が立ち、家を再興する道が開く)
import type { ClimbRoute, Hero, Status } from './types';
import { ROUTES } from '../data/climb';
import { bump, log } from './bonds';
import { heqOf } from './mortality';
import { standingOf, statusName, statusRank } from './status';
import { fits } from './cond';
import { L } from '../i18n';

let LIST: ClimbRoute[] = ROUTES;
export const allRoutes = (): ClimbRoute[] => LIST;
export const useRoutes = (r: ClimbRoute[]): void => { LIST = r; };
export const routeOf = (id: string): ClimbRoute | undefined => LIST.find((r) => r.id === id);

/** 今の身分から行ける道 (年齢・世界・能力・しるしの条件に合うもの) */
export function routesFor(h: Hero): ClimbRoute[] {
  const now = standingOf(h);
  const e = heqOf(h);
  return LIST.filter((r) => r.from.includes(now) && statusRank(r.to) > statusRank(now)
    && e >= (r.heq?.[0] ?? 12) && e <= (r.heq?.[1] ?? 70) && fits(h, r) && needOk(h, r));
}

function needOk(h: Hero, r: ClimbRoute): boolean {
  const n = r.need;
  if (!n) return true;
  if (n.stat && h.stats[n.stat[0]] < n.stat[1]) return false;
  if (n.flag && h.flags[n.flag] === undefined) return false;
  if (n.noFlag && h.flags[n.noFlag] !== undefined) return false;
  if (n.job && !h.job) return false;
  return true;
}

/** 身分を変える。年表に「奴隷 → 平民」と残す */
export function setStanding(h: Hero, to: Status, text: string): void {
  const from = standingOf(h);
  if (from === to) return;
  h.standing = to;
  h.climb = [...(h.climb ?? []), { age: h.age, from, to }];
  const up = statusRank(to) > statusRank(from);
  bump(h, up ? { fame: 4, happy: 5 } : { happy: -8, fame: -3 });
  const line = `${statusName(from, h.world)} → ${statusName(to, h.world)}`;
  log(h, `${text}${L(`(身分: ${line})`, ` (Standing: ${line})`)}`, up ? 'fame' : 'loss', true);
}

/** 毎年: 出来事のしるしで身分を合わせ、暮らしが尽きたら落ちる。乱数は引かない */
export function fortuneYear(h: Hero): void {
  if (!h.alive) return;
  const now = standingOf(h);
  const r = statusRank(now);
  // しるしはその年に立ったものだけを見る (没落した後に、昔の騎士のしるしで戻らないように)
  if (h.flags.freed === h.age && now === 'slave') return setStanding(h, 'poor', L('奴隷の身から解き放たれた。', 'Freed from slavery.'));
  if (h.flags.lord === h.age && r < statusRank('noble')) return setStanding(h, 'noble', L('領主として家名を名乗ることを許された。', 'Was permitted to bear a family name as a lord.'));
  if (h.flags.knighted === h.age && r < statusRank('gentry')) return setStanding(h, 'gentry', L('騎士の身分を得た。', 'Gained the standing of a knight.'));
  // 没落: 商人より上の身分で暮らし向きが尽きたか、追放された年
  const exiled = (h.flags.exiled === h.age && h.job !== 'adventurer') || h.flags.ruined === h.age; // パーティからの追放は身分と関係ない。ruined は政争・借金で失脚する出来事のしるし
  if (r > statusRank('poor') && r >= statusRank('merchant') && (h.stats.wealth < 6 || exiled) && h.flags.fallen !== h.age) {
    h.flags.fallen = h.age;
    setStanding(h, 'poor', h.flags.ruined === h.age ? L('失脚し、家も身分も失った。', 'Fell from grace, losing house and standing.')
      : exiled ? L('追放され、家も身分も失った。', 'Exiled, and stripped of house and standing.')
      : L('家が傾き、屋敷も召し使いも手放した。', 'The family fortune collapsed. The house and the servants were let go.'));
  }
}
