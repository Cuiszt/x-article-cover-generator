// Headless verification: UI screenshots + sample exports for all styles.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TITLE = process.env.TITLE || '我让 AI 做了个 X 长文封面生成器，开源了';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + ROOT + '/index.html');
  await page.waitForSelector('body[data-ready="1"]');
  const styles = await page.evaluate(() => CoverStyles.STYLES.map(s => ({ id: s.id, pals: s.palettes.map(p => p.id) })));
  const outDir = path.join(ROOT, 'samples'); fs.mkdirSync(outDir, { recursive: true });
  const sub = '6 种风格 · 5:2 封面 / 16:9 配图 · 附 AI 生图提示词';
  const jobs = [];
  for (const s of styles) {
    jobs.push([s.id, s.pals[0], 'cover', TITLE, sub]);
    jobs.push([s.id, s.pals[0], 'body', TITLE, sub]);
  }
  if (process.env.ALL) for (const s of styles) for (const p of s.pals.slice(1)) jobs.push([s.id, p, 'cover', TITLE, sub]);
  if (process.env.ALL) for (const s of styles) jobs.push([s.id, s.pals[0], 'square', TITLE, sub]);
  for (const [st, pal, size, title, subtitle] of jobs) {
    const url = await page.evaluate(([st, pal, size, title, subtitle]) => CoverGen.toDataURL(st, pal, size, 1, { title, subtitle, handle: '@Cuiszt_Cui', tag: '开源工具' }), [st, pal, size, title, subtitle]);
    const f = path.join(outDir, `${size}-${st}-${pal}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  }
  // stress test: very long title, empty subtitle, long English
  const stress = [
    ['stress-long-cn', '这是一个非常非常长的标题，用来测试自动换行和字号缩小会不会溢出画布边界，以及标点符号能不能正确地避头尾，看看最后一行会不会只剩一个字，效果如何？', ''],
    ['stress-en', 'I built an open-source X Article cover generator with AI in two days — here is everything', 'Six styles, 5:2 covers, 16:9 images, copyable prompts'],
    ['stress-short', 'AI 周报', ''],
  ];
  if (process.env.STRESS) for (const s of styles) for (const [name, title, subtitle] of stress) for (const size of ['cover', 'body', 'square']) {
    const url = await page.evaluate(([st, size, title, subtitle]) => CoverGen.toDataURL(st, null, size, 1, { title, subtitle, handle: '@Cuiszt_Cui', tag: 'AI 实测' }), [s.id, size, title, subtitle]);
    fs.mkdirSync(path.join(ROOT, '..', 'cover-gen-stress'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, '..', 'cover-gen-stress') + `/${name}-${s.id}-${size}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  // UI screenshots
  const shots = path.join(ROOT, 'docs/screenshots'); fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, 'ui-zh.png'), fullPage: true });
  await page.click('.style-card[data-style="terminal"]'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(shots, 'ui-terminal.png'), fullPage: false });
  await page.click('.style-card[data-style="collage"]'); await page.click('.seg button:nth-child(2)'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(shots, 'ui-collage-16x9.png'), fullPage: false });
  await page.click('[data-lang="en"]'); await page.click('.style-card[data-style="neon"]'); await page.click('.seg button:nth-child(1)'); await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(shots, 'ui-en.png'), fullPage: true });
  const prompts = await page.locator('.prompts').screenshot({ path: path.join(shots, 'ui-prompts.png') });
  // mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.goto('file://' + ROOT + '/index.html'); await m.waitForSelector('body[data-ready="1"]');
  await m.screenshot({ path: path.join(shots, 'ui-mobile.png') });
  // download test via real button
  await page.click('[data-lang="zh"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  console.log('download filename:', dl.suggestedFilename());
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
