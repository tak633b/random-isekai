// 同じ設定で何回も生きる (DESIGN 6節)。engine の runTrials と同じ数え方を、画面を固めないよう小分けにして回す
import type { Policy, Setup } from '../engine/types';
import { CHEATS, HAZARDS, REACH_AGES, TABLE_E0, createHero, hazardName, raceOf, randomSeed, statusName, trialAdd, trialFinish, trialStart, type TrialResult } from '../engine';
import { ageHistogram, barList, fmtPct } from './charts';
import { ARRIVAL_NAME, POLICY_NAME } from './labels';
import { esc } from './dom';
import { screen, type Nav } from './nav';
import { L, T } from '../i18n';

const SLICE_MS = 30;
let generation = 0; // 画面を離れたら走っている集計を止める

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function runTrialsChunked(setup: Setup, n: number, policy: Policy | undefined, progress: (done: number) => void): Promise<TrialResult | null> {
  const gen = generation;
  const st = trialStart(setup, policy);
  let t0 = performance.now();
  for (let i = 0; i < n; i++) {
    if (performance.now() - t0 > SLICE_MS) {
      progress(i);
      await tick();
      if (gen !== generation) return null;
      t0 = performance.now();
    }
    trialAdd(st, i);
  }
  progress(n);
  return trialFinish(st);
}

const yrs = (x: number) => L(`${x.toFixed(1)}歳`, x.toFixed(1));

function resultHTML(r: TrialResult, e0?: number): string {
  const reach = REACH_AGES.filter((a) => a <= Math.max(100, r.max));
  const hz = HAZARDS.filter((k) => r.byHazard[k] > 0).sort((a, b) => r.byHazard[b] - r.byHazard[a]);
  return `
    <div class="nums">
      <div><small>${L('平均', 'Mean')}</small><b>${yrs(r.mean)}</b></div>
      <div><small>${L('中央値', 'Median')}</small><b>${yrs(r.median)}</b></div>
      <div><small>${L('最長', 'Longest')}</small><b>${L(`${r.max}歳`, String(r.max))}</b></div>
      <div><small>${L('回数', 'Lives')}</small><b>${r.n}</b></div>
    </div>
    ${r.alive ? `<p class="note">${L(`${r.alive}人は${r.maxYears}年を過ぎても生きていたので、そこで打ち切った。`, `${r.alive} were still alive after ${r.maxYears} years and were stopped there.`)}</p>` : ''}
    <h3>${L('享年の分布', 'Age at death')}</h3>
    ${ageHistogram(r.ages, [{ age: Math.round(r.mean), label: L('平均', 'mean') }, ...(e0 ? [{ age: Math.round(e0), label: L('表の平均寿命', 'table e0') }] : [])])}
    <div class="two">
      <div><h3>${L('その年齢まで生きた割合', 'Reached this age')}</h3>
        <table class="reach">${reach.map((a) => `<tr><td>${L(`${a}歳`, `${a}`)}</td><td><i class="meter"><b style="width:${(r.reach[a] * 100).toFixed(1)}%"></b></i></td><td>${fmtPct(r.reach[a])}</td></tr>`).join('')}</table></div>
      <div><h3>${L('死因の分類', 'Causes by kind')}</h3>${barList(hz.map((k) => ({ label: hazardName(k), p: r.byHazard[k] })))}</div>
    </div>
    <h3>${L('多かった死因', 'Most common deaths')}</h3>
    <ol class="causes">${r.topCauses.map((c) => `<li><span>${esc(c.label)}</span><em>${fmtPct(c.count / r.n)}</em></li>`).join('')}</ol>`;
}

function compareHTML(rs: [Policy, TrialResult][]): string {
  const top = (r: TrialResult) => HAZARDS.reduce((b, k) => (r.byHazard[k] > r.byHazard[b] ? k : b), HAZARDS[0]);
  return `<table class="cmp"><tr><th>${L('性格', 'Temperament')}</th><th>${L('平均', 'Mean')}</th><th>${L('中央値', 'Median')}</th><th>${L('最長', 'Longest')}</th><th>${L('60歳まで', 'Reach 60')}</th><th>${L('最多の死因', 'Top cause')}</th></tr>
    ${rs.map(([p, r]) => `<tr><td>${POLICY_NAME[p]}</td><td>${yrs(r.mean)}</td><td>${yrs(r.median)}</td><td>${r.max}</td><td>${fmtPct(r.reach[60])}</td><td>${esc(hazardName(top(r)))}</td></tr>`).join('')}</table>
    <p class="note">${L('慎重は危険の少ない選択肢と職業を、無謀は得の大きい方を選ぶ。ふつうは職業を人の多い順に、出来事の選択はくじで選ぶ。', 'Careful picks the safer option and trade. Reckless goes for the bigger reward. Normal takes the most common trade and picks event choices at random.')}</p>`;
}

export function showTrials(setup: Setup, nav: Nav): void {
  generation++;
  const h = createHero(setup);
  const f = h.setup;
  const e0 = h.race === 'human' && !h.cheat && h.status === 'commoner' ? TABLE_E0[h.world.id] : undefined;
  let n = 100;
  const line = [T(h.world.name), T(raceOf(h.race).name), statusName(h.status, h.world), h.cheat ? T(CHEATS[h.cheat].name) : L('特典なし', 'no cheat skill'), ARRIVAL_NAME[h.arrival], POLICY_NAME[h.policy]].join(L('・', ' · '));
  screen(`
  <main class="page trials">
    <button class="back" data-go="title">${L('← タイトルへ', '← Back to title')}</button>
    <h1>${L('同じ設定で何回も生きる', 'The same setup, many lives')}</h1>
    <p class="lead">${esc(line)}</p>
    <p class="note">${L('おまかせで決まった項目も固定して、運だけを変えて生き直す。選択はすべて性格に合わせて自動で選ぶ。', 'Everything decided at birth stays fixed; only luck changes. All choices are made automatically by temperament.')}</p>
    <div class="choices">
      <button class="primary" data-run="100">${L('100回', '100 lives')}</button>
      <button data-run="1000">${L('1000回', '1000 lives')}</button>
      <button data-run="cmp" id="cmpbtn">${L('慎重・ふつう・無謀を比べる', 'Compare careful, normal, reckless')}</button>
    </div>
    <div class="progress" id="prog" hidden><i><b id="progbar"></b></i><span id="progtext"></span></div>
    <section class="panel" id="result" hidden></section>
    <section class="panel" id="compare" hidden></section>
    <div class="choices">
      <button data-go="one">${L('この設定で1回生きる', 'Live this setup once')}</button>
      <button data-go="new">${L('新しく転生', 'A new rebirth')}</button>
    </div>
  </main>`, (t) => {
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go === 'title') { generation++; return nav.title(); }
    if (go === 'new') { generation++; return nav.setup(); }
    if (go === 'one') { generation++; return nav.start({ ...f, seed: randomSeed() }); }
    const run = t.closest<HTMLButtonElement>('[data-run]')?.dataset.run;
    if (run) void start(run);
  });

  const $ = (id: string) => document.getElementById(id)!;
  let busy = false;
  async function start(run: string): Promise<void> {
    if (busy) return;
    busy = true;
    document.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => (b.disabled = true));
    const plan: (Policy | undefined)[] = run === 'cmp' ? ['careful', 'normal', 'bold'] : [undefined];
    if (run !== 'cmp') {
      n = Number(run);
      document.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => b.classList.toggle('primary', b.dataset.run === run));
    }
    const total = n * plan.length;
    const prog = $('prog');
    prog.hidden = false;
    const out: [Policy, TrialResult][] = [];
    for (const [i, p] of plan.entries()) {
      const r = await runTrialsChunked(f, n, p, (done) => {
        const k = (i * n + done) / total;
        $('progbar').style.width = `${(k * 100).toFixed(1)}%`;
        $('progtext').textContent = L(`${i * n + done} / ${total} 回`, `${i * n + done} / ${total} lives`);
      });
      if (!r) return; // 画面を離れた
      out.push([p ?? h.policy, r]);
    }
    if (run === 'cmp') { $('compare').hidden = false; $('compare').innerHTML = `<h2>${L(`性格で比べる (各${n}回)`, `By temperament (${n} lives each)`)}</h2>${compareHTML(out)}`; }
    else { $('result').hidden = false; $('result').innerHTML = `<h2>${L(`${n}回の人生`, `${n} lives`)}</h2>${resultHTML(out[0][1], e0)}`; }
    $('cmpbtn').textContent = L(`慎重・ふつう・無謀を比べる (各${n}回)`, `Compare careful, normal, reckless (${n} each)`);
    prog.hidden = true;
    busy = false;
    document.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => (b.disabled = false));
    $(run === 'cmp' ? 'compare' : 'result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
