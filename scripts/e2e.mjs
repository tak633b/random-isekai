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

async function widths(page, name) {
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
const ageOf = async (page) => Number((await page.locator('#age').innerText()).replace(/\D/g, ''));
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
async function autoplay(page, lang) {
  const alive = async () => !(await page.locator('.death').count()) && await page.locator('#scenecv').count() > 0;
  if (!(await page.locator('#autobtn.on').count())) await page.click('#autobtn'); // 選択で止まらないように
  await page.click('[data-act=speed][data-v="4"]');
  const a0 = await ageOf(page);
  await page.waitForTimeout(3500);
  if (!(await alive())) { notes.push(`[${lang}] autoplay: died during the wait (still counts as moving)`); return; }
  const a1 = await ageOf(page);
  if (a1 <= a0) errors.push(`[${lang}] autoplay: age did not move (${a0} -> ${a1})`); else notes.push(`[${lang}] autoplay: ${a0} -> ${a1} in 3.5s at 4x`);
  await page.click('#pausebtn').catch(() => {});
  if (!(await alive())) { notes.push(`[${lang}] autoplay: died before pausing`); return; }
  const p0 = await ageOf(page);
  await page.waitForTimeout(2000);
  if (await ageOf(page) !== p0) errors.push(`[${lang}] pause: age moved while paused`);
  await page.click('[data-act=speed][data-v="8"]');
  if ((await pressed(page, '[data-act=speed][data-v="8"]')) !== 'true') errors.push(`[${lang}] speed: 8x not selected`);
  // 選択で止まる: 自動で決めるを切り、16×で選択が来るまで流す
  await page.click('#autobtn');
  await page.click('[data-act=speed][data-v="16"]');
  await page.click('#pausebtn');
  const got = await page.waitForSelector('#modal:not([hidden]) [data-act=opt]', { timeout: 40000 }).then(() => true).catch(() => false);
  if (!(await alive())) { notes.push(`[${lang}] choice: died before a choice came`); return; }
  if (got) {
    const c0 = await ageOf(page);
    await page.waitForTimeout(1500);
    if (await ageOf(page) !== c0) errors.push(`[${lang}] choice: year moved while the modal was open`);
    await page.keyboard.press('Escape');
    if (await page.locator('#modal[hidden]').count()) errors.push(`[${lang}] choice: Esc closed the modal`);
    await page.keyboard.press('1');
    notes.push(`[${lang}] choice: stopped at ${c0}, chose with key 1`);
  } else notes.push(`[${lang}] choice: none came within 40s`);
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

async function run(lang) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
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
  await shot(page, `death${sfx}.png`);
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
  for (let tries = 0; tries < 8; tries++) {
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
    if (await page.locator('.death').count()) { await page.waitForSelector('.page.death'); continue; }
    const people = await page.locator('.ring [data-act=tie]').count();
    const years = await page.locator('.timeline li.yr').count();
    if ((people < 3 || years < 15) && tries < 7) continue;
    await page.locator('.ring [data-act=tie]').first().click();
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
    break;
  }

  // 過去の人生
  await page.click('[data-go=title]');
  await page.click('[data-go=past]');
  await page.click('.pastlist [data-i="0"]');
  await page.waitForSelector('#pastdetail .record');
  await widths(page, `${lang} past`);
  await browser.close();
}

for (const lang of ['ja', 'en']) {
  try { await run(lang); } catch (e) {
    await current?.screenshot({ path: join(OUT, '..', '..', 'dev', `e2e-fail-${lang}.png`) }).catch(() => {}); errors.push(`[${lang}] script: ${e.message.split('\n').slice(0, 3).join(' | ')}`); }
}
console.log(notes.join('\n'));
console.log(`errors: ${errors.length}`);
for (const e of errors) console.log('  ' + e);
console.log(`overflow: ${overflow.length}`);
for (const o of overflow) console.log('  ' + o);
process.exit(errors.length || overflow.length ? 1 : 0);
