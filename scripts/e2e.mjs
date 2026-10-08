// 通しプレイ: タイトル → 完全ランダム → 最後まで → 死亡記録 → 100回 / 比べる、と、
// 設定画面で全項目を選んで転生 → 何年か進めて選択肢を選ぶ → 最後まで → 過去の人生、を日本語と英語で。
// コンソールのエラーと、幅 375px / 1280px での横のはみ出しを数える。スクリーンショットは docs/images/ に。
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

// 選択が出ていれば最初の選択肢を選ぶ。選んだら true
async function chooseIfAny(page) {
  const opt = page.locator('#decision [data-act=opt]').first();
  if (await opt.count()) { await opt.click(); return true; }
  return false;
}

async function run(lang) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${lang}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${lang}] pageerror: ${e.message}`));
  page.on('dialog', (d) => d.dismiss());
  const sfx = lang === 'ja' ? '' : '-en';

  // A: 完全ランダム
  await page.goto(BASE);
  await page.waitForSelector('.logo');
  await widths(page, `${lang} title`);
  await shot(page, `title${sfx}.png`);
  await page.click('[data-go=random]');
  await page.waitForSelector('[data-go=live]');
  await widths(page, `${lang} arrival`);
  if (lang === 'ja') await shot(page, 'arrival.png');
  await page.click('[data-go=live]');
  await page.waitForSelector('#scenecv');
  // 続きから: 2年進めて中断 → タイトルに「続きから」→ 同じ年齢で再開
  for (let i = 0; i < 2; i++) { if (!(await chooseIfAny(page)) && await page.locator('#b1').isEnabled()) await page.click('#b1'); }
  if (!(await page.locator('.death').count())) {
    const before = await page.locator('#age').innerText();
    await page.click('[data-act=exit]');
    await page.waitForSelector('[data-go=resume]');
    await page.click('[data-go=resume]');
    await page.waitForSelector('#scenecv');
    const after = await page.locator('#age').innerText();
    if (before !== after) errors.push(`[${lang}] resume: age ${before} -> ${after}`);
    else notes.push(`[${lang}] resume ok at ${after}`);
  }
  for (let i = 0; i < 3; i++) { if (!(await chooseIfAny(page)) && await page.locator('#b1').isEnabled()) await page.click('#b1'); if (await page.locator('.death').count()) break; }
  if (!(await page.locator('.death').count())) await page.click('[data-act=end]');
  await page.waitForSelector('.death');
  await widths(page, `${lang} death`);
  await shot(page, `death${sfx}.png`);
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
  await widths(page, `${lang} setup`);
  await shot(page, `setup${sfx}.png`);
  await page.click('[data-go=start]');
  let chosen = 0, lives = 1;
  for (;;) {
    await page.waitForSelector('[data-go=live]');
    const decided = await page.locator('.decided em').count();
    if (decided > 3) notes.push(`[${lang}] setup: ${decided} items still random (expected 0-3)`);
    await page.click('[data-go=live]');
    await page.waitForSelector('#scenecv');
    for (let i = 0; i < 300 && chosen < 2; i++) {
      if (await page.locator('.death').count()) break;
      if (await chooseIfAny(page)) { chosen++; continue; }
      await page.click('#b1');
    }
    if (chosen >= 2 || lives >= 6) break;
    if (!(await page.locator('.death').count())) break;
    await page.click('[data-go=again]');
    lives++;
  }
  notes.push(`[${lang}] choices made: ${chosen} over ${lives} lives`);
  if (!(await page.locator('.death').count())) {
    await page.click('[data-act=y10]').catch(() => {});
    await chooseIfAny(page);
    if (!(await page.locator('.death').count())) await page.click('[data-act=end]');
  }
  await page.waitForSelector('.death');

  // C: README 用の life.png。剣と魔法の中世の人間で、30年ほど生きた年表
  for (let tries = 0; tries < 8; tries++) {
    await page.click('[data-go=title]');
    await page.click('[data-go=setup]');
    await page.click('[data-go=reset]');
    await page.click('[data-world=medieval]');
    await page.click('[data-k=race][data-v=human]');
    await page.click('[data-k=arrival][data-v=reborn]');
    await page.click('[data-go=start]');
    await page.click('[data-go=live]');
    await page.waitForSelector('#scenecv');
    for (let i = 0; i < 80; i++) {
      if (await page.locator('.death').count()) break;
      if (await chooseIfAny(page)) continue;
      if (Number((await page.locator('#age').innerText()).replace(/\D/g, '')) >= 30) break;
      await page.click('#b1');
    }
    if (await page.locator('.death').count()) continue;
    const people = await page.locator('.ring [data-act=tie]').count();
    const years = await page.locator('.timeline li.yr').count();
    if ((people < 3 || years < 15) && tries < 7) continue;
    await page.locator('.ring [data-act=tie]').first().click();
    await widths(page, `${lang} life`);
    await shot(page, `life${sfx}.png`, false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(80);
    await shot(page, `mobile-life${sfx}.png`, false);
    await page.setViewportSize({ width: 1280, height: 900 });
    notes.push(`[${lang}] life.png after ${tries + 1} tries, ${await page.locator('.timeline li.yr').count()} years in timeline`);
    await page.click('[data-act=end]');
    await page.waitForSelector('.death');
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
  try { await run(lang); } catch (e) { errors.push(`[${lang}] script: ${e.message.split('\n').slice(0, 3).join(' | ')}`); }
}
console.log(notes.join('\n'));
console.log(`errors: ${errors.length}`);
for (const e of errors) console.log('  ' + e);
console.log(`overflow: ${overflow.length}`);
for (const o of overflow) console.log('  ' + o);
process.exit(errors.length || overflow.length ? 1 : 0);
