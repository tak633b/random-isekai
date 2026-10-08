// 亡くなったとき: 死亡記録を出し、この端末に残す。同じ設定で何回も試す・もう一度・新しく転生
import type { Hero } from '../engine/types';
import { randomSeed } from '../engine';
import { keep, recordHTML, toRecord } from './records';
import { paintAll } from './pixel';
import { screen, type Nav } from './nav';
import { L } from '../i18n';

export function showDeath(h: Hero, nav: Nav): void {
  const r = toRecord(h);
  keep(r);
  screen(`
  <main class="page death">
    ${recordHTML(r)}
    <div class="choices">
      <button class="primary" data-go="trials">${L('同じ設定で何回も試す', 'Run this setup many times')}</button>
      <button data-go="again">${L('同じ設定でもう一度', 'Same setup, new life')}</button>
      <button data-go="new">${L('新しく転生', 'A new rebirth')}</button>
      <button data-go="title" class="quiet">${L('タイトルへ', 'Title')}</button>
    </div>
    <p class="note">${L('「同じ設定」は、おまかせで決まった項目も含めて固定し、運だけを変える。', '"Same setup" keeps everything that was decided, including what was random, and changes only luck.')}</p>
  </main>`, (t) => {
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go === 'trials') nav.trials(h.setup);
    if (go === 'again') nav.start({ ...h.setup, seed: randomSeed() });
    if (go === 'new') nav.setup();
    if (go === 'title') nav.title();
  });
  paintAll(document.getElementById('app')!);
}
