// 思い出のアルバム: 一生から多くて12の場面を選ぶ (誕生・名を上げた・大きな戦い・結婚・子・九死に一生・最期)。
// 足りなければ「主な出来事」(life.ts の highlights) から埋める。並びは年表の順。死亡記録で、場面の絵と一緒にカードにする
import type { Hero, LogEntry } from './types';
import { highlights } from './life';

export type AlbumTag = 'birth' | 'fame' | 'fight' | 'marriage' | 'child' | 'close' | 'death' | 'moment';
export interface AlbumItem { e: LogEntry; tag: AlbumTag }
export const ALBUM_MAX = 12;

// 種類ごとの上限 (誕生と最期は1つずつ)
const CAP: Record<AlbumTag, number> = { birth: 1, fame: 2, fight: 2, marriage: 1, child: 2, close: 2, death: 1, moment: ALBUM_MAX };

export function albumOf(h: Hero): AlbumItem[] {
  const role = new Map(h.people.map((t) => [t.id, t.role]));
  const tagOf = (e: LogEntry, i: number): AlbumTag | null => {
    if (i === 0) return 'birth';
    if (e.kind === 'death') return 'death';
    if (e.close) return 'close';
    if (e.join?.some((id) => role.get(id) === 'child')) return 'child';
    if (e.kind === 'love' && e.big && e.who?.some((id) => role.get(id) === 'spouse')) return 'marriage';
    if (e.fight && e.fight.result !== 'lose' && (e.big || e.fight.foe === 'dragon' || e.fight.foe === 'demon')) return 'fight';
    if (e.kind === 'fame' && e.big) return 'fame';
    return null;
  };
  const n: Partial<Record<AlbumTag, number>> = {};
  const chosen = new Map<LogEntry, AlbumTag>();
  // 竜・魔族との戦いを先に (同じ種類が上限を超えるときは、先に来たものから)
  const order = h.log.map((e, i) => ({ e, i, t: tagOf(e, i) }))
    .filter((x) => x.t)
    .sort((a, b) => +(b.t === 'fight' && /dragon|demon/.test(b.e.fight!.foe)) - +(a.t === 'fight' && /dragon|demon/.test(a.e.fight!.foe)) || a.i - b.i);
  for (const { e, t } of order) {
    if ((n[t!] ?? 0) >= CAP[t!]) continue;
    n[t!] = (n[t!] ?? 0) + 1;
    chosen.set(e, t!);
  }
  for (const e of highlights(h)) { if (chosen.size >= ALBUM_MAX) break; if (!chosen.has(e)) chosen.set(e, 'moment'); }
  // 種類の上限の合計は 11 なので、埋め草を足しても12を超えない
  const list = h.log.filter((e) => chosen.has(e)).map((e) => ({ e, tag: chosen.get(e)! }));
  return list;
}
