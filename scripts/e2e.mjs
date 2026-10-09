// 通しプレイ: タイトル → 完全ランダム → 最後まで → 死亡記録 → 100回 / 比べる、と、
// 設定画面で全項目を選んで転生 → 何年か進めて選択肢を選ぶ → 最後まで → 過去の人生、を日本語と英語で。
// コンソールのエラーと、幅 375px / 1280px での横のはみ出しを数える。スクリーンショットは docs/images/ に。
// 追悼館: サーバ (PORT=8790 node server/server.mjs) を起動した状態で回すと 残す→一覧→ろうそく まで試す。
// MEMORIAL=off で回すと、サーバが無いときの案内文だけを確かめる (このとき /api の失敗はブラウザが出す通信エラーなので数えない)。
// 使い方: (vite を 5293 で起動してから) node scripts/e2e.mjs [http://localhost:5293]
// Playwright は依存に入れていない。入っている場所を PLAYWRIGHT_PATH で渡す (無ければ 'playwright' を探す)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:5293/';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'images');
mkdirSync(OUT, { recursive: true });

const errors = [];
const overflow = [];
const notes = [];
const OFF = process.env.MEMORIAL === 'off';
let current = null; // 失敗したときに画面を残す

// 年齢と本文の2列の行: 子要素がちょうど2つで、本文の文字が行に直に置かれていない (〈強調〉が別のセルにならない)。
// 年齢の列が本文に押されて潰れていない (幅が 2em 以上) ことも見る
let giftRows = 0;
async function gridRows(page, name) {
  const r = await page.evaluate(() => {
    const bad = [];
    let gifts = 0;
    for (const li of document.querySelectorAll('.highlights li, .pstory li, .yr, .chronicle li, .otherlog li:not(.sep)')) {
      const kids = li.children.length;
      const loose = [...li.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const age = li.firstElementChild;
      const w = age ? age.getBoundingClientRect().width : 0;
      const em = parseFloat(getComputedStyle(li).fontSize);
      if (li.querySelector('.gift')) gifts++;
      if (kids !== 2 || loose || (li.offsetParent && w < em * 2)) bad.push(`${li.className || li.parentElement?.className}: ${kids} children${loose ? ', loose text' : ''}, age col ${w.toFixed(0)}px`);
    }
    // 時の列と年齢の添え書きは1行に収まる
    for (const el of document.querySelectorAll('.chronicle .when, .otherlog .heroage')) {
      if (!el.offsetParent) continue;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.7;
      if (el.getBoundingClientRect().height > lh * 1.6 + 6) bad.push(`time label wraps: "${el.textContent}" (${el.getBoundingClientRect().height.toFixed(0)}px)`);
    }
    return { bad: bad.slice(0, 3), gifts };
  });
  giftRows += r.gifts;
  for (const b of r.bad) errors.push(`${name} grid row broken: ${b}`);
}

async function widths(page, name) {
  await gridRows(page, name);
  const size = page.viewportSize();
  for (const w of [375, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    if (r.sw > r.iw) overflow.push(`${name}@${w}: ${r.sw} > ${r.iw}`);
  }
  await page.setViewportSize(size);
  await page.waitForTimeout(60);
}

const shot = (page, file, full = true) => page.screenshot({ path: join(OUT, file), fullPage: full });

// 選択のモーダルが出ていれば最初の選択肢を選ぶ。選んだら true
async function chooseIfAny(page) {
  const opt = page.locator('#modal:not([hidden]) [data-act=opt]').first();
  if (await opt.count()) { await opt.click(); return true; }
  return false;
}
const ageOf = async (page) => Number((await page.locator('#age').innerText({ timeout: 3000 })).replace(/\D/g, ''));
const pressed = (page, sel) => page.locator(sel).getAttribute('aria-pressed');
// 人生の画面に入って、手で進める流れのために一時停止する (自動再生は別に確かめる)
async function enterLife(page) {
  await page.click('[data-go=live]');
  await page.waitForSelector('#scenecv');
  await pause(page);
}
// 最後まで進めて死亡記録を待つ (選択のモーダルが出ていれば先に選ぶ。亡くなった直後の間にも対応)
async function finish(page) {
  for (let i = 0; i < 5 && await chooseIfAny(page); i++);
  if (!(await page.locator('.page.death').count())) await page.click('[data-act=end]', { timeout: 3000 }).catch(() => {});
  await page.waitForSelector('.page.death', { timeout: 60000 });
}
async function pause(page) {
  for (let i = 0; i < 5 && await chooseIfAny(page); i++);
  if (await page.locator('.death').count() || !(await page.locator('#pausebtn').count())) return;
  if ((await pressed(page, '#pausebtn')) !== 'true') await page.click('#pausebtn');
}

// 自動再生: 放置で年が進む・一時停止で止まる・速さの切り替え・選択で止まる・続きからで状態が戻る
// 確かめている途中に主人公が亡くなることがある (確率どおり)。そのときは死亡記録へ移るのを待って先へ進む
async function autoplay(page, lang) {
  try { await autoplayChecks(page, lang); } catch (e) {
    const dead = await page.waitForSelector('.page.death', { timeout: 5000 }).then(() => true).catch(() => false);
    if (!dead) throw e;
    notes.push(`[${lang}] autoplay: the hero died during the checks`);
  }
}
async function autoplayChecks(page, lang) {
  const alive = async () => !(await page.locator('.death').count()) && await page.locator('#scenecv').count() > 0;
  if (!(await page.locator('#autobtn.on').count())) await page.click('#autobtn'); // 選択で止まらないように
  await page.click('[data-act=speed][data-v="8"]'); // 1×は1年10秒なので、8×で数年ぶん
  const a0 = await ageOf(page);
  await page.waitForTimeout(3500);
  if (!(await alive())) { notes.push(`[${lang}] autoplay: died during the wait (still counts as moving)`); return; }
  const a1 = await ageOf(page);
  if (a1 <= a0) errors.push(`[${lang}] autoplay: age did not move (${a0} -> ${a1})`); else notes.push(`[${lang}] autoplay: ${a0} -> ${a1} in 3.5s at 8x`);
  await page.click('#pausebtn').catch(() => {});
  if (!(await alive())) { notes.push(`[${lang}] autoplay: died before pausing`); return; }
  const p0 = await ageOf(page);
  await page.waitForTimeout(2000);
  if (await ageOf(page) !== p0) errors.push(`[${lang}] pause: age moved while paused`);
  await page.click('[data-act=speed][data-v="4"]');
  if ((await pressed(page, '[data-act=speed][data-v="4"]')) !== 'true') errors.push(`[${lang}] speed: 4x not selected`);
  // 選択で止まる: 自動で決めるを切り、16×で選択が来るまで流す
  await page.click('#autobtn');
  await page.click('[data-act=speed][data-v="16"]');
  await page.click('#pausebtn');
  const got = await page.waitForSelector('#modal:not([hidden]) [data-act=opt]', { timeout: 60000 }).then(() => true).catch(() => false);
  if (!(await alive())) { notes.push(`[${lang}] choice: died before a choice came`); return; }
  if (got) {
    const c0 = await ageOf(page);
    await page.waitForTimeout(1500);
    if (await ageOf(page) !== c0) errors.push(`[${lang}] choice: year moved while the modal was open`);
    await page.keyboard.press('Escape');
    if (await page.locator('#modal[hidden]').count()) errors.push(`[${lang}] choice: Esc closed the modal`);
    await page.keyboard.press('1');
    notes.push(`[${lang}] choice: stopped at ${c0}, chose with key 1`);
  } else notes.push(`[${lang}] choice: none came within 60s`);
  await pause(page);
  if (!(await alive())) return;
  // 続きから: 速さ 8×・一時停止の状態で中断して戻る
  await page.click('[data-act=speed][data-v="8"]');
  const before = await ageOf(page);
  await page.click('[data-act=exit]');
  await page.click('[data-go=resume]');
  await page.waitForSelector('#scenecv');
  const ok = (await pressed(page, '[data-act=speed][data-v="8"]')) === 'true' && (await pressed(page, '#pausebtn')) === 'true' && await ageOf(page) === before;
  if (!ok) errors.push(`[${lang}] resume: speed/pause/age not restored`); else notes.push(`[${lang}] resume: 8x, paused, age ${before} restored`);
  notes.push(`[${lang}] render ms: last ${await page.locator('#app').getAttribute('data-render-ms')}, max ${await page.locator('#app').getAttribute('data-render-max')}`);
}

// 動く場面: テスト用の人生を作って「続きから」に入れ、戦いの年・仲間の並ぶ年をその場で見る
// kind: 'fight' は次の年に戦いがある所、'party' は仲間が2人以上いる所で止めた人生を保存する
async function plant(page, kind) {
  return page.evaluate(async (kind) => {
    const E = await window.__imp('/src/engine/index.ts');
    const PARTY = ['companion', 'mentor', 'spouse', 'lover', 'fiance', 'familiar', 'disciple', 'servant', 'master'];
    for (let seed = 1; seed < 400; seed++) {
      const setup = { seed, world: { preset: 'medieval' }, hero: { race: 'human', arrival: 'reborn', blessing: true }, auto: true, policy: 'bold' };
      const h = E.createHero(setup);
      let at = -1;
      for (let i = 0; i < 90 && h.alive; i++) {
        E.advanceYear(h);
        const year = h.log.filter((e) => e.age === h.age);
        if (kind === 'fight' && h.age >= 18 && year.some((e) => e.fight && e.fight.result !== 'lose')) { at = h.age; break; }
        if (kind === 'party' && h.age >= 20 && E.around(h).filter((t) => PARTY.includes(t.role)).length >= 2) { at = h.age; break; }
      }
      if (at < 0) continue;
      const g = E.createHero(setup);
      const stopAt = kind === 'fight' ? at - 1 : at;
      while (g.alive && g.age < stopAt) E.advanceYear(g);
      if (!g.alive || g.age !== stopAt) continue;
      localStorage.setItem('current', JSON.stringify(E.toSaved(g)));
      localStorage.setItem('current-ai', 'null');
      localStorage.setItem('play', JSON.stringify({ speed: 1, paused: kind === 'party' }));
      return { seed, at };
    }
    return null;
  }, kind);
}
const pixels = (page) => page.evaluate(() => document.getElementById('scenecv').toDataURL());

async function stageChecks(page, lang, browser) {
  const sfx = lang === 'ja' ? '' : '-en';
  // 戦い: 1×で次の年に戦いがある人生から再開し、敵が描かれるのを待つ
  await page.goto(BASE);
  const f = await plant(page, 'fight');
  if (!f) { errors.push(`[${lang}] stage: no fight life found`); return; }
  await page.reload();
  await page.click('[data-go=resume]');
  const sawEnemy = await page.waitForFunction(() => document.getElementById('scenecv')?.dataset.enemy === '1', null, { timeout: 40000 }).then(() => true).catch(() => false);
  if (!sawEnemy) errors.push(`[${lang}] stage: no enemy drawn in the fight year (seed ${f.seed}, age ${f.at})`);
  else {
    await page.waitForTimeout(1000);
    await shot(page, `battle${sfx}.png`, false);
    notes.push(`[${lang}] battle: seed ${f.seed}, age ${f.at}, caption "${await page.locator('.stagecap').innerText().catch(() => '')}"`);
  }
  // 動いている: 0.3秒おきに2回読んで画素が変わる
  const a = await pixels(page); await page.waitForTimeout(300); const b = await pixels(page);
  if (a === b) errors.push(`[${lang}] stage: canvas did not change while playing`);
  // 一時停止で止まる
  await pause(page);
  if (await page.locator('#scenecv').count()) {
    await page.waitForTimeout(250);
    const c = await pixels(page); await page.waitForTimeout(400); const d = await pixels(page);
    if (c !== d) errors.push(`[${lang}] stage: canvas changed while paused`);
  }
  // 仲間の並ぶ場面 (一時停止のまま再開して撮る) と、動いている様子の連続コマ
  await page.goto(BASE);
  const p = await plant(page, 'party');
  if (!p) notes.push(`[${lang}] party: none found`);
  else {
    await page.reload();
    await page.click('[data-go=resume]');
    await page.waitForSelector('#scenecv');
    await page.click('#pausebtn'); // 再生して、加わった仲間が歩いて入ってくるのを待つ
    await page.waitForTimeout(1500);
    await shot(page, `party${sfx}.png`, false);
    const m = await page.evaluate(() => ({ ...document.getElementById('scenecv').dataset }));
    notes.push(`[${lang}] party: seed ${p.seed}, age ${p.at}; idle redraw ${m.fps}/s, frame avg ${m.frameMs}ms max ${m.frameMax}ms`);
    if (lang === 'ja') {
      const frames = [];
      for (let i = 0; i < 4; i++) { frames.push(await pixels(page)); await page.waitForTimeout(160); }
      const pg = await browser.newPage({ viewport: { width: 1320, height: 230 } });
      await pg.setContent(`<body style="margin:0;background:#14121f;display:flex;gap:8px;padding:8px">${frames.map((u) => `<img src="${u}" style="width:320px;image-rendering:pixelated">`).join('')}</body>`);
      await pg.screenshot({ path: join(OUT, 'anim-frames.png'), fullPage: true });
      await pg.close();
    }
    await pause(page);
  }
  // reduced-motion では止まる
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx2.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  await ctx2.addInitScript(IMP);
  const r = await ctx2.newPage();
  r.on('pageerror', (e) => errors.push(`[${lang}] reduced pageerror: ${e.message}`));
  await r.goto(BASE);
  await plant(r, 'party');
  await r.evaluate(() => localStorage.setItem('play', JSON.stringify({ speed: 1, paused: false })));
  await r.reload();
  await r.click('[data-go=resume]');
  await r.waitForSelector('#scenecv');
  await r.waitForTimeout(300);
  const x = await pixels(r); await r.waitForTimeout(500); const y = await pixels(r);
  const age0 = await ageOf(r);
  if (x !== y && await ageOf(r) === age0) errors.push(`[${lang}] stage: canvas moved under reduced-motion`);
  else notes.push(`[${lang}] reduced-motion: still`);
  await ctx2.close();
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.removeItem('current'); localStorage.removeItem('play'); });
}

// ほかの人の一生・年代記・転生者 (人生の画面、一時停止中)
async function othersChecks(page, lang, sfx) {
  // 人物の欄から「この人の一生」
  await page.click('#person [data-life]');
  await page.waitForSelector('.lifemodal .otherlog li', { timeout: 10000 });
  const rows = await page.locator('.lifemodal .otherlog li').count();
  const ms = await page.locator('.lifemodal .modal').getAttribute('data-ms');
  notes.push(`[${lang}] life-of: ${rows} rows, built in ${ms}ms, shared ${await page.locator('.lifemodal li.shared').count()}`);
  await widths(page, `${lang} life-of`);
  await shot(page, `life-of${sfx}.png`, false);
  const j = page.locator('.lifemodal [data-jump]').first();
  if (await j.count()) {
    const at = await j.getAttribute('data-jump');
    await j.click();
    if (!(await page.locator('#log .yr.flash').count())) errors.push(`[${lang}] life-of: jump to age ${at} did not show the year`);
  } else await page.keyboard.press('Escape');
  if (await page.locator('.lifemodal').count()) errors.push(`[${lang}] life-of: modal did not close`);
  // 年代記: 項目が出て、生きていた年を押すと年表のその年へ
  await page.click('[data-tab=chron]');
  await page.waitForSelector('#chron .chronicle li, #chron .note');
  const ch = await page.locator('#chron .chronicle li').count();
  notes.push(`[${lang}] chronicle: ${ch} entries`);
  if (!ch) errors.push(`[${lang}] chronicle: no entries`);
  await page.evaluate(() => document.querySelector('.logpanel')?.scrollIntoView());
  await page.waitForTimeout(80);
  await widths(page, `${lang} chronicle`);
  await shot(page, `chronicle${sfx}.png`, false);
  if (lang === 'ja') {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => document.querySelector('.logpanel')?.scrollIntoView());
    await page.waitForTimeout(80);
    await shot(page, 'chronicle-mobile.png', false);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  const w = page.locator('#chron button.when').first();
  if (await w.count()) {
    const at = await w.getAttribute('data-jump');
    await w.click();
    // その年 (記録の無い年なら、近い前の年) が光る
    if ((await page.locator('#log').isHidden()) || !(await page.locator('#log .yr.flash').count())) errors.push(`[${lang}] chronicle: jump to ${at} failed`);
  }
  // 転生者の一覧と、その一生
  await page.click('[data-tab=reinc]');
  const rn = await page.locator('#reinc .reinc li').count();
  notes.push(`[${lang}] reincarnators listed: ${rn}`);
  // 召喚された人の前世は「気づいたら終わっていた」ではなく来た時の様子で、一覧の中で同じ文が並ばない
  const pasts = await page.locator('#reinc .reinc li').evaluateAll((lis) => lis.map((li) => [...li.querySelectorAll('small')].map((x) => x.textContent).find((t) => /^前世|^Past life/.test(t)) ?? ''));
  if (pasts.some((t) => /気づいたら終わっていた|ended without warning/.test(t))) errors.push(`[${lang}] reincarnators: summoned past still says "ended without warning"`);
  const ends = pasts.map((t) => t.replace(/^[^。.]*[。.]\s*/, ''));
  const dup = ends.filter((t, i) => t && ends.indexOf(t) !== i && /召喚|光|連れて|神殿|教室|呼ばれ|summoned|light|taken|temple|class|name called/.test(t));
  // 召喚の言い回しは18種。一覧の召喚者がそれより多いときだけ重なってよい
  const summonedN = ends.filter((t) => /召喚|光|連れて|神殿|教室|呼ばれ|summoned|light|taken|temple|class|name called/.test(t)).length;
  if (dup.length && summonedN <= 18) errors.push(`[${lang}] reincarnators: repeated summon lines: ${dup[0]}`);
  await widths(page, `${lang} reincarnators`);
  if (lang === 'ja') { await page.evaluate(() => document.querySelector('.logpanel')?.scrollIntoView()); await shot(page, 'reincarnators.png', false); }
  if (rn) {
    await page.locator('#reinc [data-life]').first().click();
    await page.waitForSelector('.lifemodal .otherlog li', { timeout: 10000 });
    notes.push(`[${lang}] reincarnator life: ${await page.locator('.lifemodal .otherlog li').count()} rows, gift ${await page.locator('.lifemodal .facts .gift').count()}`);
    await page.keyboard.press('Escape');
  }
  await page.click('[data-tab=log]');
  await page.evaluate(() => window.scrollTo(0, 0));
}

// 系譜: 死亡記録から「この人で続ける」→ 引き継ぎ → 第2代が進む → 中断と続きから → 亡くなる → 第3代 → 系譜が死亡記録・年代記・追悼館に出る
async function lineageChecks(page, lang, sfx) {
  const heirs = page.locator('.heirs [data-heir]');
  if (!(await heirs.count())) { notes.push(`[${lang}] lineage: no one left to continue as`); return; }
  await page.evaluate(() => document.querySelector('.heirs')?.scrollIntoView({ block: 'center' }));
  await widths(page, `${lang} continue`);
  await shot(page, `continue${sfx}.png`, false);
  for (let gen = 2; gen <= 3; gen++) {
    const h = page.locator('.heirs [data-heir]').first();
    if (!(await h.count())) { notes.push(`[${lang}] lineage: stopped at generation ${gen - 1} (no heirs)`); return; }
    const who = await h.getAttribute('data-name');
    await h.click();
    const ask = await page.locator('#heirask p').innerText();
    await page.click('#heirask [data-heirgo]');
    await page.waitForSelector('.handover [data-go=live]');
    notes.push(`[${lang}] gen ${gen}: "${ask}" → ${await page.locator('.handover .story').innerText()}`);
    await widths(page, `${lang} handover`);
    await page.click('.handover [data-go=live]');
    await page.waitForSelector('#scenecv');
    const line = await page.locator('#wholine').innerText();
    if (!/第\d+代|Generation \d+/.test(line)) errors.push(`[${lang}] gen ${gen}: no generation in the header (${line})`);
    if (!line.includes(who.split(/[・ ]/)[0])) notes.push(`[${lang}] gen ${gen}: header "${line}" (chose ${who})`);
    // 年が進む (自動再生・8×、自動で決める)
    if (!(await page.locator('#autobtn.on').count())) await page.click('#autobtn').catch(() => {});
    await page.click('[data-act=speed][data-v="8"]').catch(() => {});
    if ((await pressed(page, '#pausebtn')) === 'true') await page.click('#pausebtn').catch(() => {});
    const a0 = await ageOf(page).catch(() => -1);
    await page.waitForTimeout(2500);
    if (await page.locator('#scenecv').count()) {
      const a1 = await ageOf(page).catch(() => -1);
      if (a1 >= 0 && a1 <= a0) errors.push(`[${lang}] gen ${gen}: age did not move (${a0} -> ${a1})`);
      await pause(page);
      if (gen === 2) {
        await widths(page, `${lang} gen2 life`);
        if (lang === 'ja') await shot(page, 'gen2-life.png', false);
        // 中断 → 続きから: 第2代が再開できる
        const before = await ageOf(page);
        await page.click('[data-act=exit]');
        await page.click('[data-go=resume]');
        await page.waitForSelector('#scenecv');
        const l2 = await page.locator('#wholine').innerText();
        if (!/第2代|Generation 2/.test(l2) || await ageOf(page) !== before) errors.push(`[${lang}] gen 2 resume failed (${l2})`);
        else notes.push(`[${lang}] gen 2 resumed at ${before}`);
      }
    }
    await finish(page);
  }
  // 第3代の死亡記録: 系譜・年代記
  const lin = await page.locator('.record .lineage').innerText().catch(() => '');
  if (!/第3代|Generation 3/.test(lin)) errors.push(`[${lang}] gen 3 record: no lineage (${lin})`);
  else notes.push(`[${lang}] lineage: ${lin.replace(/\s+/g, ' ')}, links ${await page.locator('.record .lineage [data-record]').count()}`);
  if ((await page.locator('.record .lineage [data-record]').count()) < 2) errors.push(`[${lang}] lineage: earlier generations are not linked to their records`);
  await page.evaluate(() => document.querySelector('.record .rechead')?.scrollIntoView({ block: 'start' }));
  await widths(page, `${lang} lineage`);
  if (lang === 'ja') {
    await shot(page, 'lineage.png', false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => document.querySelector('.record .rechead')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(80);
    await shot(page, 'lineage-mobile.png', false);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.evaluate(() => document.querySelector('.chronbox')?.setAttribute('open', ''));
  notes.push(`[${lang}] gen 3 chronicle: ${await page.locator('.chronbox .chronicle li').count()} entries, ${await page.locator('.chronbox .chronicle li').filter({ hasText: /誕生|before birth/ }).count()} before birth`);
  // 追悼館に残すと代と系譜が出る
  if (await page.locator('#postbtn').count()) {
    await page.click('#postbtn');
    await page.click('#postmsg [data-mem]');
    await page.waitForSelector('[data-candle]');
    const ml = await page.locator('.memorial .lineage').innerText().catch(() => '');
    if (!/第3代|Generation 3/.test(ml)) errors.push(`[${lang}] memorial: no lineage (${ml})`);
    else notes.push(`[${lang}] memorial lineage: ${ml.replace(/\s+/g, ' ')}`);
    await page.click('[data-go=title]');
  } else await page.click('[data-go=title]');
  // 過去の人生で系譜がまとまる
  await page.click('[data-go=past]');
  const fam = await page.locator('.pastlist .family').count();
  notes.push(`[${lang}] past lives grouped by line: ${fam}`);
  if (!fam) errors.push(`[${lang}] past lives: lineage not grouped`);
  await widths(page, `${lang} past (lineage)`);
  // 過去の人生の画面のまま戻る (続きの流れは「タイトルへ」から始まる)
}

// 画面と同じモジュールを読み込む。vite はファイルが変わると ?t= を付けた URL で読み直すので、
// 画面が実際に読んだ URL (いちばん新しいもの) を使う (別の URL だと別の実体になり、記録や一覧を共有しない)
const IMP = () => {
  window.__imp = (path) => {
    const seen = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => new URL(n).pathname === path);
    return import(seen.length ? seen[seen.length - 1] : path);
  };
};

// 開発ビルドの部品を直接読み込んで使う (画面と同じモジュール)。ほかの流れのために全部解放しておく
async function unlockAll(page) {
  await page.evaluate(async () => {
    const S = await window.__imp('/src/meta/store.ts');
    const U = await window.__imp('/src/meta/unlocks.ts');
    S.devGrant(100000);
    for (const k of U.ALL_UNLOCKS) U.unlock(k);
  });
}
const tickets = (page) => page.evaluate(() => window.__ri.progress().tickets);

// チケットと解放・図鑑・実績・知らせ (新しい記録から)
async function metaChecks(page, lang, sfx, browser) {
  // 1. 閉じた「設定して転生」(0/10)
  await page.waitForSelector('.logo');
  if (!(await page.evaluate(() => !!window.__ri))) errors.push(`[${lang}] dev: window.__ri missing in the dev build`);
  const lockTxt = await page.locator('.title [data-go=setup].locked').innerText().catch(() => '');
  if (!/0\/10/.test(lockTxt)) errors.push(`[${lang}] locked: setup button "${lockTxt}"`);
  await widths(page, `${lang} locked title`);
  await shot(page, `locked${sfx}.png`, false);
  await page.click('[data-go=setup]');
  if (!(await page.locator('#unlockask:not([hidden])').count())) errors.push(`[${lang}] locked: no explanation when clicking the locked button`);
  // 2. おまかせで最後まで → チケットが増え、内訳が出る
  const t0 = await tickets(page);
  await page.click('[data-go=random]');
  await enterLife(page);
  await finish(page);
  const t1 = await tickets(page);
  const parts = await page.locator('.grant .parts li').count();
  if (t1 <= t0 || !parts) errors.push(`[${lang}] tickets: ${t0} -> ${t1}, ${parts} parts`);
  notes.push(`[${lang}] tickets: ${t0} -> ${t1}; ${(await page.locator('.grant .parts').innerText().catch(() => '')).replace(/\s+/g, ' ')}; achievements ${await page.locator('.grant .newach li').count()}`);
  await page.evaluate(() => document.querySelector('.grant')?.scrollIntoView({ block: 'start' }));
  await widths(page, `${lang} tickets`);
  if (lang === 'ja') await shot(page, 'tickets.png', false);
  // 3. 同じ人生は二度数えない (死亡記録が使う grantLife を同じ人生で2回) と、過去の人生を開いても増えない
  const twice = await page.evaluate(async () => {
    const E = await window.__imp('/src/engine/index.ts');
    const M = await window.__imp('/src/meta/tickets.ts');
    const h = E.liveOut(E.createHero({ seed: 424242, world: { preset: 'random' }, hero: {}, auto: true }));
    const a = M.grantLife(h, true), b = M.grantLife(h, true);
    return { first: a.already, second: b.already, same: a.ticketsNow === b.ticketsNow };
  });
  if (twice.first || !twice.second || !twice.same) errors.push(`[${lang}] grant twice: ${JSON.stringify(twice)}`);
  const t2 = await tickets(page);
  await page.click('[data-go=title]');
  await page.click('[data-go=past]');
  await page.click('.pastlist [data-i="0"]');
  if (await tickets(page) !== t2) errors.push(`[${lang}] tickets changed on reopening a record`);
  await page.click('[data-go=title]');
  // 4. 10枚にして「設定して転生」を開ける
  await page.evaluate((n) => window.__ri.grant(n), Math.max(0, 10 - t2) + 6);
  await page.goto(BASE);
  await page.click('[data-go=setup]');
  await page.click('[data-go=opencustom]');
  await page.waitForSelector('.setup #worlds');
  const afterOpen = await tickets(page);
  notes.push(`[${lang}] custom opened, tickets now ${afterOpen}`);
  // 5. 1つ解放する (剣と魔法の中世のエルフ。見ていれば値引き)
  await page.click('[data-world=medieval]');
  await page.waitForSelector('[data-unlock="race:elf"]');
  await page.evaluate(() => document.querySelector('[data-unlock="race:elf"]')?.scrollIntoView({ block: 'center' }));
  await widths(page, `${lang} unlock`);
  await shot(page, `unlock${sfx}.png`, false);
  const price = Number((await page.locator('[data-unlock="race:elf"] .price').innerText()).replace(/\D/g, ''));
  await page.click('[data-unlock="race:elf"]');
  await page.click('[data-unlockyes="race:elf"]');
  const afterUnlock = await tickets(page);
  if (afterUnlock !== afterOpen - price || !(await page.locator('[data-k=race][data-v=elf]').count())) errors.push(`[${lang}] unlock: ${afterOpen} - ${price} != ${afterUnlock}`);
  else notes.push(`[${lang}] unlocked elf for ${price}: ${afterOpen} -> ${afterUnlock}`);
  // 6. 設定した人生を最後まで → チケットは増えない (実績の報酬だけは増えうる)
  await page.click('[data-k=race][data-v=elf]');
  await page.click('[data-go=start]');
  await enterLife(page);
  // 年ごとの実績の知らせ: いまのデータには年ごとの実績が無いので、確かめる用に1つ足して、知らせが出るのを見る
  await page.evaluate(async () => {
    const A = await window.__imp('/src/meta/achievements.ts');
    A.useAchievements([...A.allAchievements(), { id: 'e2e.year', category: 'feat', name: { ja: '一年を越えた', en: 'One Year On' }, desc: { ja: '確かめる用', en: 'Test only' }, cond: { fact: 'age', gte: 0 }, when: 'year' }]);
  });
  const yearToast = page.locator('.toast', { hasText: /一年を越えた|One Year On/ });
  for (let i = 0; i < 4 && !(await yearToast.count()) && await page.locator('#b1').count(); i++) {
    await chooseIfAny(page);
    if (await page.locator('#b1').isEnabled()) await page.click('#b1').catch(() => {});
    await page.waitForTimeout(150);
  }
  const toasted = await yearToast.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  if (!toasted && !(await page.locator('#b1').count())) notes.push(`[${lang}] toast: the hero died before a year passed`);
  if (!toasted && await page.locator('#b1').count()) errors.push(`[${lang}] toast: no toast for a year achievement`);
  else if (lang === 'ja') await shot(page, 'toast.png', false);
  notes.push(`[${lang}] year check ms: ${await page.locator('#app').getAttribute('data-check-ms')}`);
  const t3 = afterUnlock; // 設定した人生を始める前の枚数 (途中で亡くなって死亡記録が先に出ても比べられるように)
  await finish(page);
  const t4 = await tickets(page);
  // 実際に足された実績の報酬 (1つの人生の上限の後)。画面の各実績の +N は上限の前の値なので使わない
  const bonus = Number(await page.locator('.grant').getAttribute('data-bonus').catch(() => '0') ?? 0);
  if (t4 - t3 !== bonus || (await page.locator('.grant .parts li').count())) errors.push(`[${lang}] custom life: tickets ${t3} -> ${t4} (achievement bonus ${bonus})`);
  else notes.push(`[${lang}] custom life: no tickets (achievement bonus ${bonus})`);
  // 7. 図鑑と実績
  await page.click('[data-go=collection]');
  await page.waitForSelector('#bestiary');
  notes.push(`[${lang}] bestiary met ${await page.locator('#bestiary li.met').count()}/${await page.locator('#bestiary li').count()}, encounters ${await page.locator('#encounters li.met').count()}`);
  await widths(page, `${lang} collection`);
  await page.evaluate(() => document.getElementById('bestiary')?.scrollIntoView({ block: 'start' }));
  await shot(page, `bestiary${sfx}.png`, false);
  if (lang === 'ja') {
    await page.evaluate(() => document.getElementById('encounters')?.scrollIntoView({ block: 'start' }));
    await shot(page, 'encounters.png', false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => document.getElementById('bestiary')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(80);
    await shot(page, 'collection-mobile.png', false);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.selectOption('#bworld', 'medieval');
  await page.click('[data-go=achievements]');
  const got = await page.locator('.ach li.got').count();
  if (!got) errors.push(`[${lang}] achievements: none unlocked`);
  notes.push(`[${lang}] achievements unlocked: ${got}/${await page.locator('.ach li').count()}`);
  await widths(page, `${lang} achievements`);
  await shot(page, `achievements${sfx}.png`, false);
  await page.click('[data-go=title]');
  // 8. ストレージが使えない状態でも遊べる
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } }); });
  const q = await ctx3.newPage();
  const qerr = [];
  q.on('pageerror', (e) => qerr.push(e.message));
  q.on('console', (m) => { if (m.type() === 'error') qerr.push(m.text()); });
  await q.goto(BASE);
  await q.click('[data-go=random]');
  await enterLife(q);
  await finish(q);
  await q.click('[data-go=collection]');
  await q.waitForSelector('#bestiary');
  await q.click('[data-go=achievements]');
  await q.waitForSelector('.ach');
  await ctx3.close();
  if (qerr.length) errors.push(`[${lang}] no-storage: ${qerr[0]}`);
  else notes.push(`[${lang}] no-storage: played to the end, collection and achievements opened`);
}

async function run(lang) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  await ctx.addInitScript(IMP);
  const page = await ctx.newPage();
  current = page;
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // サーバ無しのときの /api の失敗は、ブラウザが通信エラーとして出すもの (画面のエラーではない)
    if (OFF && /Failed to load resource/.test(m.text())) return void notes.push(`[${lang}] (ignored) ${m.text()}`);
    errors.push(`[${lang}] console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${lang}] pageerror: ${e.message}`));
  page.on('dialog', (d) => d.dismiss());
  const sfx = lang === 'ja' ? '' : '-en';

  await page.goto(BASE);
  if (OFF) {
    // サーバが無いとき: 追悼館の欄に案内文、ローカルの過去の人生は見られる
    await page.click('[data-go=memorial]');
    await page.waitForSelector('.memorial-off');
    await widths(page, `${lang} memorial-off`);
    await page.click('[data-go=past]');
    await page.waitForSelector('.pastlist');
    await page.click('[data-go=title]');
    await page.click('[data-go=random]');
    await enterLife(page);
    await finish(page);
    await page.waitForSelector('#leave .memorial-off');
    notes.push(`[${lang}] memorial off: notice shown on memorial and death screens`);
    await browser.close();
    return;
  }

  await metaChecks(page, lang, sfx, browser);
  await unlockAll(page);
  await page.goto(BASE);

  // A: 完全ランダム
  await page.waitForSelector('.logo');
  await widths(page, `${lang} title`);
  await shot(page, `title${sfx}.png`);
  await page.click('[data-go=random]');
  await page.waitForSelector('[data-go=live]');
  await widths(page, `${lang} arrival`);
  if (lang === 'ja') await shot(page, 'arrival.png');
  await page.click('[data-go=live]');
  await page.waitForSelector('#scenecv');
  await autoplay(page, lang);
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('#b1').count())) break; // 亡くなって死亡記録へ移るところ
    if (!(await chooseIfAny(page)) && await page.locator('#b1').isEnabled()) await page.click('#b1').catch(() => {});
  }
  await finish(page);
  await widths(page, `${lang} death`);
  // 追悼館に残す → 館で見る → ろうそく → 一覧
  await page.waitForSelector('#postbtn');
  await page.fill('#note', lang === 'ja' ? 'よく生きた。' : 'You lived well.');
  await page.click('#postbtn');
  await page.click('#postmsg [data-mem]');
  await page.waitForSelector('[data-candle]');
  await page.click('[data-candle]');
  await page.waitForFunction(() => /灯した|Candle lit/.test(document.querySelector('[data-candle]')?.textContent ?? ''));
  notes.push(`[${lang}] memorial: posted, candle -> ${await page.locator('[data-candle]').innerText()}`);
  await page.click('[data-list]');
  await page.waitForSelector('.memlist [data-id]');
  await widths(page, `${lang} memorial`);
  await shot(page, `memorial${sfx}.png`);
  await page.click('[data-go=title]');
  if (await page.locator('[data-go=resume]').count()) errors.push(`[${lang}] resume button still shown after death`);
  await page.click('[data-go=past]');
  await page.click('.pastlist [data-i="0"]');
  await page.click('[data-trials="0"]');
  await page.click('[data-run="100"]');
  await page.waitForSelector('#result:not([hidden])', { timeout: 120000 });
  if (lang === 'ja') {
    const t0 = Date.now();
    await page.click('[data-run="1000"]');
    const sawProgress = await page.locator('#prog:not([hidden])').count();
    await page.waitForFunction(() => document.querySelector('#result h2')?.textContent?.includes('1000'), null, { timeout: 120000 });
    notes.push(`[ja] 1000 lives: ${Date.now() - t0} ms, progress shown: ${sawProgress > 0}`);
  }
  await page.click('#cmpbtn');
  await page.waitForSelector('#compare:not([hidden])', { timeout: 120000 });
  await widths(page, `${lang} trials`);
  await shot(page, `trials${sfx}.png`);
  notes.push(`[${lang}] trials: ${await page.locator('#result .nums').innerText().then((t) => t.replace(/\s+/g, ' '))}`);

  // B: 全項目を選んで転生
  await page.click('[data-go=title]');
  await page.click('[data-go=setup]');
  await page.click('[data-world=game]');
  await page.click('[data-k=magic][data-v="3"]');
  await page.click('[data-k=powers][data-v="2"]');
  await page.selectOption('[data-sel=danger]', '4');
  await page.selectOption('[data-sel=war]', '2');
  await page.click('[data-k=race][data-v=elf]');
  await page.click('[data-k=sex][data-v=F]');
  await page.click('[data-k=status][data-v=commoner]');
  await page.click('[data-k=talent][data-v=magic]');
  await page.click('[data-k=cheat][data-v=appraisal]');
  await page.click('[data-k=arrival][data-v=reborn]');
  await page.click('[data-k=memory][data-v=full]');
  await page.fill('#name', lang === 'ja' ? 'リリア' : 'Lilia');
  await page.click('[data-k=policy][data-v=careful]');
  await page.click('[data-k=startAge][data-v=teen]');
  await page.click('[data-k=blessing][data-v="1"]');
  // 組み立て: 加護を2つ、弱点を1つ、ポイントを健康に2
  await page.click('[data-b=mode][data-v=pick]');
  await page.click('[data-b=tab][data-v=blessing]');
  await page.locator('#cands [data-b=add]').nth(0).click();
  await page.locator('#cands [data-b=add]').nth(1).click();
  await page.click('[data-b=tab][data-v=weakness]');
  await page.locator('#cands [data-b=add]').nth(0).click();
  const first = (await page.locator('#cands [data-b=add] b').first().innerText()).slice(0, 2);
  await page.fill('#tq', first);
  if (!(await page.locator('#cands [data-b=add]').count())) errors.push(`[${lang}] search "${first}" found nothing`);
  await page.fill('#tq', '');
  for (let i = 0; i < 2; i++) await page.click('[data-b=pt][data-k=hp][data-v="1"]');
  // 予算を超えたら転生できない
  for (const k of ['hp', 'power', 'mind', 'charm', 'luck']) for (let i = 0; i < 4; i++) { const b = page.locator(`[data-b=pt][data-k=${k}][data-v="1"]`); if (await b.isEnabled()) await b.click(); }
  if (!(await page.locator('#startbtn').isDisabled())) errors.push(`[${lang}] start button enabled while over budget`);
  else notes.push(`[${lang}] over budget: start disabled (${await page.locator('.errs li').first().innerText()})`);
  for (const k of ['power', 'mind', 'charm', 'luck']) for (let i = 0; i < 4; i++) { const b = page.locator(`[data-b=pt][data-k=${k}][data-v="-1"]`); if (await b.isEnabled()) await b.click(); }
  if (await page.locator('#startbtn').isDisabled()) errors.push(`[${lang}] start still disabled after fixing budget: ${await page.locator('.errs').innerText().catch(() => '')}`);
  // AI の設定パネルが開ける
  await page.click('.aipanel summary');
  if (!(await page.locator('.aipanel[open] select').isVisible())) errors.push(`[${lang}] AI panel did not open`);
  await page.click('.aipanel summary');
  await widths(page, `${lang} setup`);
  await shot(page, `setup${sfx}.png`);
  await page.click('[data-go=start]');
  await page.waitForSelector('[data-go=live]');
  notes.push(`[${lang}] arrival tags: ${await page.locator('.tags .tag').count()}, starts at ${await page.locator('.decided div').nth(10).innerText().then((t) => t.replace(/\s+/g, ' '))}`);
  let chosen = 0, lives = 1;
  for (;;) {
    await page.waitForSelector('[data-go=live]');
    const decided = await page.locator('.decided em').count();
    if (decided > 3) notes.push(`[${lang}] setup: ${decided} items still random (expected 0-3)`);
    await enterLife(page);
    for (let i = 0; i < 300 && chosen < 2; i++) {
      if (await page.locator('.death').count()) break;
      if (await chooseIfAny(page)) { chosen++; continue; }
      if (!(await page.locator('#b1').count())) break;
      await page.click('#b1').catch(() => {});
    }
    if (chosen >= 2 || lives >= 6) break;
    if (!(await page.locator('.death').count())) break;
    await page.click('[data-go=again]');
    lives++;
  }
  notes.push(`[${lang}] choices made: ${chosen} over ${lives} lives`);
  if (!(await page.locator('.death').count())) {
    await page.click('[data-act=y10]').catch(() => {});
  }
  await finish(page);

  // C: README 用の life.png。剣と魔法の中世の人間で、30年ほど生きた年表
  let cDone = false;
  for (let tries = 0; tries < 12 && !cDone; tries++) {
    await page.click('[data-go=title]');
    await page.click('[data-go=setup]');
    await page.click('[data-go=reset]');
    await page.click('[data-world=medieval]');
    await page.click('[data-k=race][data-v=human]');
    await page.click('[data-k=arrival][data-v=reborn]');
    await page.click('[data-go=start]');
    await enterLife(page);
    for (let i = 0; i < 80; i++) {
      if (await page.locator('.death').count()) break;
      if (await chooseIfAny(page)) continue;
      if (!(await page.locator('#b1').count())) break;
      if (Number((await page.locator('#age').innerText()).replace(/\D/g, '')) >= 30) break;
      await page.click('#b1').catch(() => {});
    }
    // 亡くなった直後は死亡記録へ移るまで少し間があるので、その間を待ってから確かめる
    await page.waitForTimeout(1800);
    if (await page.locator('.death').count()) { await page.waitForSelector('.page.death'); continue; }
    const people = await page.locator('.ring [data-act=tie]').count();
    const years = await page.locator('.timeline li.yr').count();
    if ((people < 3 || years < 15) && tries < 11) continue;
    // 人物の欄: 仲間や友がいればその人を、いなければ最初の人を開く
    const pick = page.locator('.ring [data-act=tie]').filter({ hasText: /仲間|友|師|Companion|Friend|Mentor/ }).first();
    await ((await pick.count()) ? pick : page.locator('.ring [data-act=tie]').first()).click();
    const plines = await page.locator('#person .plines dt').count();
    const story = await page.locator('#person .pstory li').count();
    if (!plines) errors.push(`[${lang}] person: no profile lines`);
    else notes.push(`[${lang}] person: ${plines} profile lines, ${story} story rows`);
    // 人物の欄が見える所まで送って、画面のまま撮る (上の帯が重ならないよう少し上に余白を取る)
    const toPerson = () => page.evaluate(() => { const el = document.getElementById('person'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140); });
    await toPerson();
    await page.waitForTimeout(80);
    await shot(page, `person${sfx}.png`, false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(80);
    await toPerson();
    await page.waitForTimeout(80);
    await shot(page, `person-mobile${sfx}.png`, false);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await othersChecks(page, lang, sfx);
    await page.click('[data-act=speed][data-v="2"]');
    await page.click('#pausebtn'); // 再生中の操作が見えるように (撮るあいだだけ流す)
    await widths(page, `${lang} life`);
    await shot(page, `life${sfx}.png`, false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(80);
    await shot(page, `mobile-life${sfx}.png`, false);
    await page.setViewportSize({ width: 1280, height: 900 });
    await pause(page);
    notes.push(`[${lang}] life.png after ${tries + 1} tries, ${await page.locator('.timeline li.yr').count()} years in timeline`);
    await finish(page);
    await page.evaluate(() => document.querySelector('.chronbox')?.setAttribute('open', ''));
    const dch = await page.locator('.chronbox .chronicle li').count();
    if (!dch) errors.push(`[${lang}] death: no chronicle`); else notes.push(`[${lang}] death chronicle: ${dch} entries`);
    await gridRows(page, `${lang} death chronicle`);
    await page.evaluate(() => document.querySelector('.chronbox')?.removeAttribute('open'));
    const circle = await page.locator('.circle li').count();
    if (!circle) errors.push(`[${lang}] death: no "people in this life" section`);
    else notes.push(`[${lang}] death: ${circle} people in the record`);
    await widths(page, `${lang} death (adult)`);
    await page.evaluate(() => document.querySelector('.fulllog')?.setAttribute('open', ''));
    await gridRows(page, `${lang} death full log`);
    await page.evaluate(() => document.querySelector('.fulllog')?.removeAttribute('open'));
    await shot(page, `death${sfx}.png`);
    await lineageChecks(page, lang, sfx);
    cDone = true;
    break;
  }

  // 人物・一生・年代記・系譜の流れは、30歳まで生きた人生が要る。12回とも早く亡くなったら、確かめられなかったことを失敗にする
  if (!cDone) errors.push(`[${lang}] flow C: no life reached 30 in 12 tries; person/lineage checks did not run`);

  // 過去の人生
  await page.click('[data-go=title]');
  // 〈強調〉を含む行を必ず1つ作って、過去の人生の記録で2列が崩れないか確かめる (主な出来事の先頭の文に足す)
  await page.evaluate(() => {
    const lives = JSON.parse(localStorage.getItem('lives') ?? '[]');
    if (lives[0]?.highlights?.[0]) { lives[0].highlights[0].text += ' 〈創造〉の力で、長い一文が折り返しても崩れないかを見るための行。'; localStorage.setItem('lives', JSON.stringify(lives)); }
  });
  await page.click('[data-go=past]');
  await page.click('.pastlist [data-i="0"]');
  await page.waitForSelector('#pastdetail .record');
  if (!(await page.locator('#pastdetail .highlights li .gift').count())) errors.push(`[${lang}] past: the 〈〉 test row was not rendered`);
  await widths(page, `${lang} past`);
  await stageChecks(page, lang, browser);
  await browser.close();
}

for (const lang of ['ja', 'en']) {
  try { await run(lang); } catch (e) {
    await current?.screenshot({ path: join(OUT, '..', '..', 'dev', `e2e-fail-${lang}.png`) }).catch(() => {}); errors.push(`[${lang}] script: ${e.message.split('\n').slice(0, 3).join(' | ')}`); }
}
notes.push(`grid rows with 〈〉 checked: ${giftRows}`);
console.log(notes.join('\n'));
console.log(`errors: ${errors.length}`);
for (const e of errors) console.log('  ' + e);
console.log(`overflow: ${overflow.length}`);
for (const o of overflow) console.log('  ' + o);
process.exit(errors.length || overflow.length ? 1 : 0);
