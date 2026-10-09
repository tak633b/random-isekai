// 年表の行の頭に付ける、出来事の種類の小さなドット絵 (5×5)。色だけに頼らず形で見分けられるように
import type { YearKind } from '../engine/types';

const ICON: Record<YearKind, string> = {
  arrival: '..#..|.###.|#####|.###.|..#..',   // 光
  child: '.###.|#...#|#...#|#...#|.###.',     // 丸
  school: '##.##|#.#.#|#.#.#|#.#.#|##.##',    // 開いた本
  adventure: '#....|####.|#####|#....|#....', // 旗
  battle: '#...#|.#.#.|..#..|.#.#.|#...#',    // 交わる剣
  work: '####.|####.|..#..|..#..|..#..',      // 槌
  love: '.#.#.|#####|#####|.###.|..#..',      // ハート
  family: '..#..|.###.|#####|.#.#.|.###.',    // 家
  loss: '.###.|##.##|#...#|##.##|#####',      // 墓石
  ill: '..#..|..#..|#####|..#..|..#..',       // 十字
  power: '...##|..##.|.####|.##..|##...',     // 稲妻
  fame: '#.#.#|#####|#####|#####|.....',      // 冠
  hard: '..#..|..#..|#.#.#|.###.|..#..',      // 下向きの矢
  old: '#####|.###.|..#..|.###.|#####',       // 砂時計
  death: '.###.|#####|#.#.#|#####|.#.#.',     // 髑髏
};

const svg = new Map<YearKind, string>();
export function kindIcon(k: YearKind): string {
  let s = svg.get(k);
  if (!s) {
    const rows = (ICON[k] ?? ICON.child).split('|');
    const rects = rows.flatMap((r, y) => [...r].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
    s = `<svg class="kicon k-${k}" viewBox="0 0 5 5" aria-hidden="true">${rects}</svg>`;
    svg.set(k, s);
  }
  return s;
}
