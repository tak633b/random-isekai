// 亡くなったとき: 死亡記録を出し、この端末に残す。追悼館に残す・AI の最後の言葉 (任意)。同じ設定で何回も試す・もう一度・新しく転生
import { openSheet } from './sheet';
import type { Hero } from '../engine/types';
import { randomSeed } from '../engine';
import { keep, recordHTML, toRecord } from './records';
import { paintAll } from './pixel';
import { Stage } from './stage';
import { chronicleHTML, nearestYear, openLife } from './lifeview';
import { askHeir, continueAs, heirsHTML } from './lineage';
import { memorialAvailable, postMemorial } from '../net/memorial';
import { memorialOffHTML } from './memorial';
import { aiEpitaph } from './aipanel';
import { aiReady } from '../ai/settings';
import { screen, type Nav } from './nav';
import { L } from '../i18n';
import { adHTML } from './ads';
import { grantLife, type GrantResult } from '../meta/tickets';
import { CUSTOM, isUnlocked } from '../meta/unlocks';
import { bestiaryEntry } from '../meta/bestiary';
import { encounterOf } from '../meta/encounters';
import { isRandom, setRandom } from './mode';
import { esc } from './dom';
import { T } from '../i18n';

// 死亡記録の「この人生で増えたもの」: チケットの内訳、解除した実績、図鑑に新しく載ったもの
function grantHTML(g: GrantResult, random: boolean): string {
  if (g.already) return `<section class="panel grant"><p class="note">${L('この人生のチケットと実績は、もう数えてある。', 'This life has already been counted for tickets and achievements.')}</p></section>`;
  const t = g.tickets;
  // 実績の報酬は1つの人生で上限がある (meta/tickets.ts の ACH_TICKETS_MAX_PER_LIFE)。表には実際に足した枚数を出す
  const listed = g.achievements.reduce((s, a) => s + (a.tickets ?? 0), 0);
  const bonus = g.achTickets ?? listed;
  const capped = bonus < listed ? `<small class="note">${L(`実績の報酬は1つの人生で${bonus}枚まで`, `Achievement rewards are capped at ${bonus} per life`)}</small>` : '';
  const foes = g.bestiary.map((id) => bestiaryEntry(id)).filter(Boolean).map((b) => T(b!.name));
  const encs = g.encounters.map((id) => encounterOf(id)).filter(Boolean).map((e) => T(e!.name));
  return `<section class="panel grant" data-bonus="${bonus}"><h2>${L('チケット', 'Tickets')} <b class="tickets">+${t.gain + bonus}</b> <small>${L(`今 ${g.ticketsNow}枚`, `now ${g.ticketsNow}`)}</small></h2>
    ${t.parts.length ? `<ul class="parts">${t.parts.map((x) => `<li><span>${esc(x.label)}</span><b>+${x.n}</b></li>`).join('')}${bonus ? `<li><span>${L('実績の報酬', 'Achievement rewards')}</span><b>+${bonus}</b></li>` : ''}</ul>${capped}`
      : `<p class="note">${random ? '' : L('設定した人生ではチケットは出ない。実績と図鑑は数える。', 'Custom lives earn no tickets. Achievements and the collection still count.')}</p>`}
    ${g.achievements.length ? `<h3>${L('解除した実績', 'Achievements unlocked')}</h3><ul class="newach">${g.achievements.map((a) => `<li><b>${esc(T(a.name))}</b><small>${esc(T(a.desc))}</small>${a.tickets ? `<em>+${a.tickets}</em>` : ''}</li>`).join('')}</ul>` : ''}
    ${foes.length ? `<p class="note">${L('魔物図鑑に新しく載った: ', 'New in the bestiary: ')}${esc(foes.join(L('、', ', ')))}</p>` : ''}
    ${encs.length ? `<p class="note">${L('出会い図鑑に新しく載った: ', 'New encounters: ')}${esc(encs.join(L('、', ', ')))}</p>` : ''}
    <div class="choices"><button data-go="collection">${L('図鑑', 'Collection')}</button><button data-go="achievements">${L('実績', 'Achievements')}</button></div></section>`;
}

export function showDeath(h: Hero, nav: Nav): void {
  const r = toRecord(h);
  keep(r);
  // チケット・実績・図鑑の精算。同じ人生は二度数えない (grantLife が already を返す)
  const g = grantLife(h, isRandom(h));
  screen(`
  <main class="page death">
    ${recordHTML(r)}
    ${grantHTML(g, isRandom(h))}
    ${heirsHTML(h)}
    <details class="panel chronbox"><summary>${L('年代記 (この世界の歴史)', 'Chronicle (the history of this world)')}</summary>${chronicleHTML(h)}</details>
    <div id="aiepi"></div>
    <section class="panel" id="leave"><h2>${L('追悼館に残す', 'Leave it in the memorial')}</h2><p class="note">${L('確かめています…', 'Checking…')}</p></section>
    <div class="choices">
      <button class="primary" data-go="trials">${L('同じ設定で何回も試す', 'Run this setup many times')}</button>
      <button data-go="again">${L('同じ設定でもう一度', 'Same setup, new life')}</button>
      <button data-go="new">${L('新しく転生', 'A new rebirth')}</button>
      <button data-go="sheet">${L('ステータスを見る', 'Status')}</button>
      <button data-go="title" class="quiet">${L('タイトルへ', 'Title')}</button>
    </div>
    <p class="note">${L('「同じ設定」は、おまかせで決まった項目も含めて固定し、運だけを変える。', '"Same setup" keeps everything that was decided, including what was random, and changes only luck.')}</p>
    ${adHTML('death')}
  </main>`, (t) => {
    // この人で続ける: 確かめてから、引き継ぎの場面へ
    const heir = t.closest<HTMLElement>('[data-heir]');
    if (heir) return askHeir(heir);
    if (t.closest('[data-heirno]')) { document.getElementById('heirask')!.hidden = true; return; }
    const hg = t.closest<HTMLElement>('[data-heirgo]')?.dataset.heirgo;
    if (hg) { const next = continueAs(h, hg); if (next) { setRandom(next, isRandom(h)); return nav.handover(h, next); } return; }
    if (t.closest('[data-go=collection]')) return nav.collection();
    if (t.closest('[data-go=achievements]')) return nav.achievements();
    const rec = t.closest<HTMLElement>('[data-record]')?.dataset.record;
    if (rec !== undefined) return nav.past(Number(rec));
    const lk = t.closest<HTMLElement>('[data-life]')?.dataset.life;
    if (lk) return openLife(h, lk, jump);
    const jp = t.closest<HTMLElement>('[data-jump]')?.dataset.jump;
    if (jp !== undefined) return jump(Number(jp));
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go === 'trials') nav.trials(h.setup);
    if (go === 'again') nav.start({ ...h.setup, seed: randomSeed() });
    if (go === 'new') { if (isUnlocked(CUSTOM)) nav.setup(); else nav.title(); }
    if (go === 'title') nav.title();
    if (go === 'sheet') openSheet(h);
    if (go === 'post') void post();
    const m = t.closest<HTMLElement>('[data-mem]')?.dataset.mem;
    if (m) nav.memorial(Number(m));
  }, { back: nav.title });
  const app = document.getElementById('app')!;
  paintAll(app);
  // 年表の全体を開いて、その年へ
  function jump(age: number): void {
    const d = app.querySelector<HTMLDetailsElement>('.fulllog');
    if (d) d.open = true;
    const el = nearestYear(app.querySelector('.fulllog')!, age);
    el?.scrollIntoView({ block: 'center' });
    el?.classList.add('flash');
    setTimeout(() => el?.classList.remove('flash'), 1600);
  }
  // 墓の場面: 最後にそばにいた人が静かに立つ
  const grave = app.querySelector<HTMLCanvasElement>('.record > canvas.scene');
  if (grave) new Stage(grave).showSpec(r.scene, { fig: r.face, home: r.hazard === 'return' });
  const leave = document.getElementById('leave')!;
  const alive = () => document.getElementById('leave') === leave;

  // AI の最後の言葉と墓碑銘。AI の文は textContent で出す
  if (aiReady()) {
    const box = document.getElementById('aiepi')!;
    const out = document.createElement('div');
    out.className = 'panel aiwords';
    box.append(aiEpitaph(h, (d) => {
      out.replaceChildren();
      for (const w of d.words) {
        const p = document.createElement('p');
        const tag = document.createElement('i'); tag.className = 'aitag'; tag.textContent = 'AI';
        p.append(tag, `${w.name}${L('「', ': “')}${w.text}${L('」', '”')}`);
        out.append(p);
      }
      if (d.epitaph) { const p = document.createElement('p'); p.className = 'epitaph'; p.textContent = d.epitaph; out.append(p); }
      box.append(out);
    }));
  }

  void memorialAvailable().then((ok) => {
    if (!alive()) return;
    leave.innerHTML = `<h2>${L('追悼館に残す', 'Leave it in the memorial')}</h2>` + (ok
      ? `<p class="note">${L('ほかの人もこの人生を読めるようになる。一言は任意 (140字まで)。', 'Others will be able to read this life. A few words are optional (up to 140 characters).')}</p>
        <label class="field"><span class="vh">${L('一言', 'A few words')}</span><textarea id="note" maxlength="140" rows="2" placeholder="${L('この人へ一言 (任意)', 'A few words for them (optional)')}"></textarea></label>
        <div class="choices"><button data-go="post" id="postbtn">${L('追悼館に残す', 'Leave it in the memorial')}</button><span class="note" id="postmsg" role="status"></span></div>`
      : memorialOffHTML());
  });

  async function post(): Promise<void> {
    const btn = document.getElementById('postbtn') as HTMLButtonElement;
    const msg = document.getElementById('postmsg')!;
    btn.disabled = true;
    msg.textContent = L('残しています…', 'Saving…');
    const res = await postMemorial(h, (document.getElementById('note') as HTMLTextAreaElement).value);
    if (!alive()) return;
    if (res.ok || res.status === 409) {
      const id = res.ok ? res.data.id : res.id;
      msg.innerHTML = `${res.ok ? L('残した。', 'Saved.') : L('この人生はもう館にある。', 'This life is already in the memorial.')} ${id !== undefined ? `<button data-mem="${Number(id)}">${L('追悼館で見る', 'See it in the memorial')}</button>` : ''}`;
    } else {
      btn.disabled = false;
      msg.textContent = res.status === 429 ? L('少し時間をおいてから。', 'Please wait a little.') : `${L('残せなかった: ', 'Could not save: ')}${res.error}`;
    }
  }
}
