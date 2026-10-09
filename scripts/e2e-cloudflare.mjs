// Cloudflare 版の通し: タイトル (広告の枠・法務ページへのリンク) → 完全ランダム → 最後まで → 死亡記録 (記録の下に広告の枠)
// → 追悼館に残す → ろうそく → 報告 → 一覧 → 過去の人生 (広告の枠) を日本語と英語で。生きている途中には広告の枠が無いことも見る。
// コンソールのエラーと、幅 375px での横のはみ出しを数える。
// 使い方: VITE_ADS_PLACEHOLDER=1 で vite build した dist を `wrangler pages dev` で出してから
//   PLAYWRIGHT_PATH=… node scripts/e2e-cloudflare.mjs [http://127.0.0.1:8788/]   (手順は docs/DEPLOY.md の「手元で確かめる」)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const BASE = process.argv[2] ?? 'http://127.0.0.1:8788/';
const errors = [];
const notes = [];

async function chooseIfAny(page) {
  const opt = page.locator('#modal:not([hidden]) [data-act=opt]').first();
  if (await opt.count()) { await opt.click().catch(() => {}); return true; }
  return false;
}
async function finish(page) {
  for (let i = 0; i < 40 && !(await page.locator('.page.death').count()); i++) {
    await chooseIfAny(page);
    await page.click('[data-act=end]', { timeout: 1500 }).catch(() => {});
    await page.waitForSelector('.page.death', { timeout: 1500 }).catch(() => {});
  }
  await page.waitForSelector('.page.death', { timeout: 60000 });
}
async function noOverflow(page, name) {
  const size = page.viewportSize();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(80);
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  if (r.sw > r.iw) errors.push(`${name}@375: ${r.sw} > ${r.iw}`);
  await page.setViewportSize(size);
}
const check = (ok, what) => { if (!ok) errors.push(what); };

async function run(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${lang}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${lang}] pageerror: ${e.message}`));
  page.on('dialog', (d) => d.accept()); // 報告の確かめ
  const t = (ja, en) => (lang === 'ja' ? ja : en);

  // タイトル: 広告の枠が1つ、法務ページへのリンク
  await page.goto(BASE);
  await page.waitForSelector('.logo');
  check(await page.locator('[data-ad]').count() === 1 && await page.locator('[data-ad=title]').isVisible(), `[${lang}] title: ad slot`);
  const links = await page.locator('footer.legal a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check(links.length === 4, `[${lang}] title: legal links ${links}`);
  await noOverflow(page, `${lang} title`);

  // 生きている途中・選択のモーダルには広告が無い
  await page.click('[data-go=random]');
  await page.waitForSelector('[data-go=live]');
  check(await page.locator('[data-ad]').count() === 0, `[${lang}] arrival: ad slot shown`);
  await page.click('[data-go=live]');
  await page.waitForSelector('#scenecv');
  check(await page.locator('[data-ad]').count() === 0, `[${lang}] life: ad slot shown`);
  await finish(page);

  // 死亡記録: 枠は1つ、記録より下で、ボタンの並びとは離れている
  const pos = await page.evaluate(() => {
    const ad = document.querySelector('[data-ad=death]');
    const rec = document.querySelector('.page.death .record');
    if (!ad || !rec) return null;
    // 最後のボタンの並び (同じ設定で試す・タイトルへ など) との間
    const row = [...document.querySelectorAll('.page.death > .choices')].pop();
    return { after: !!(rec.compareDocumentPosition(ad) & Node.DOCUMENT_POSITION_FOLLOWING), gap: ad.getBoundingClientRect().top - row.getBoundingClientRect().bottom, n: document.querySelectorAll('[data-ad]').length };
  });
  check(pos && pos.after && pos.n === 1 && pos.gap >= 16, `[${lang}] death: ad slot placement ${JSON.stringify(pos)}`);
  notes.push(`[${lang}] death: ad slot below the record, ${pos?.gap?.toFixed(0)}px below the last button row`);
  await noOverflow(page, `${lang} death`);

  // 追悼館: 残す → 1件 → ろうそく → 報告 → 一覧
  await page.waitForSelector('#postbtn', { timeout: 10000 });
  await page.fill('#note', t('よく生きた。', 'You lived well.'));
  await page.click('#postbtn');
  await page.click('#postmsg [data-mem]');
  await page.waitForSelector('[data-candle]');
  await page.click('[data-candle]');
  await page.waitForFunction(() => /灯した|Candle lit/.test(document.querySelector('[data-candle]')?.textContent ?? ''));
  await page.click('[data-report]');
  await page.waitForFunction(() => /報告しました|Reported/.test(document.getElementById('reportmsg')?.textContent ?? ''));
  notes.push(`[${lang}] memorial: posted, candle lit, reported`);
  check(await page.locator('[data-ad]').count() === 0, `[${lang}] memorial: ad slot shown`);
  await page.click('[data-list]');
  await page.waitForSelector('.memlist [data-id]');
  await noOverflow(page, `${lang} memorial`);

  // 過去の人生: 枠が1つ
  await page.click('[data-go=title]');
  await page.click('[data-go=past]');
  await page.waitForSelector('.pastlist');
  check(await page.locator('[data-ad=past]').isVisible(), `[${lang}] past: ad slot`);

  // 法務ページ
  await page.click('[data-go=title]');
  await page.click('footer.legal a[href^="privacy"]');
  await page.waitForSelector(lang === 'ja' ? 'h1:text("プライバシーポリシー")' : '#en h1');
  await noOverflow(page, `${lang} privacy`);
  await ctx.close();
}

// 入っている Playwright と、手元のブラウザの版が合わないときは CHROMIUM_PATH で実体を渡す
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const lang of ['ja', 'en']) {
    try { await run(browser, lang); } catch (e) { errors.push(`[${lang}] ${e instanceof Error ? e.message.split('\n')[0] : e}`); }
  }
} finally {
  await browser.close();
}
for (const n of notes) console.log('  ', n);
console.log(errors.length ? `NG ${errors.length}\n${errors.join('\n')}` : 'OK: 0 errors');
process.exit(errors.length ? 1 : 0);
