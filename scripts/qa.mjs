// Проверка вёрстки и сети: ширины 375 / 768 / 1440, reduced-motion, сторонние запросы, Lighthouse.
// Нужен запущенный сайт (npm run dev или npm run preview) и установленный Google Chrome.
//   npm run qa                        — полный прогон по http://localhost:4173/ (preview)
//   QA_URL=http://localhost:5173/ QA_WIDTHS=375 QA_LH=0 npm run qa   — быстрый прогон
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const URL_ = process.env.QA_URL || 'http://localhost:4173/';
const WIDTHS = (process.env.QA_WIDTHS || '375,768,1440').split(',').map(Number);
const LH = process.env.QA_LH !== '0';
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
const OUT = '.qa';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--hide-scrollbars'] });
const host = new URL(URL_).host;
const report = { url: URL_, widths: {}, foreignRequests: [], consoleErrors: [], failedRequests: [] };

async function check(width, reduced = false) {
  const key = `${width}${reduced ? '-reduced' : ''}`;
  const page = await browser.newPage();
  const mobile = width < 768;
  await page.setViewport({ width, height: mobile ? 812 : 900, isMobile: mobile, hasTouch: mobile });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).host !== host) report.foreignRequests.push(u); });
  page.on('requestfailed', (r) => report.failedRequests.push(`[${key}] ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(`[${key}] ${r.status()} ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') report.consoleErrors.push(`[${key}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`[${key}] pageerror: ${e.message}`));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  // Медленная прокрутка до конца — чтобы сработали все ScrollTrigger и ленивые графики
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= total; y += 350) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await new Promise((r) => setTimeout(r, 90));
  }
  await new Promise((r) => setTimeout(r, 2500));
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const over = [...document.querySelectorAll('body *')].filter((e) => {
      if (e.closest('.sr-only, .skip-link, .transit, .bg, svg')) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.right > vw + 1 || r.left < -1);
    }).slice(0, 12).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} [${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}]`);
    const charts = Object.fromEntries([...document.querySelectorAll('[data-chart]')].map((e) => [e.dataset.chart, e.querySelector('svg, .treemap') ? 'ok' : 'EMPTY']));
    const hidden = [...document.querySelectorAll('.prose > p, .prose > h2, .prose > h3')].filter((p) => Number(getComputedStyle(p).opacity) < 0.5).length;
    const fn = document.querySelectorAll('.fn a').length;
    const fnBroken = [...document.querySelectorAll('.fn a')].filter((a) => !document.getElementById(`src-${a.dataset.src}`)).map((a) => a.dataset.src);
    const leftovers = [...document.querySelectorAll('.prose, .customs-card, .scen__panel')].map((e) => e.textContent).join(' ').match(/\[\^\d+\]|\*\*/g) || [];
    return { vw, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflow: over, charts, hiddenText: hidden, footnotes: fn, brokenFootnotes: fnBroken, markdownLeftovers: leftovers.length };
  });
  // Скриншоты по остановкам: экран за экраном (полностраничный снимок Chrome обрезает после 16 384 px)
  if (!reduced) {
    const vh = mobile ? 812 : 900;
    const tops = await page.evaluate(() => [...document.querySelectorAll('[data-stop]:not(a)')].map((s) => ({ n: s.dataset.stop, top: s.getBoundingClientRect().top + window.scrollY, h: s.offsetHeight })));
    for (const s of tops) {
      const shots = Math.min(Number(process.env.QA_SHOTS || 4), Math.ceil(s.h / (vh * 0.9)));
      for (let i = 0; i < shots; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(s.top + i * vh * 0.9));
        await new Promise((r) => setTimeout(r, 700));
        await page.screenshot({ path: `${OUT}/${key}-s${s.n}-${i}.png` });
      }
    }
  }
  await page.close();
  report.widths[key] = res;
}

for (const w of WIDTHS) await check(w);
if (WIDTHS.includes(375)) await check(375, true);

if (LH) {
  const { default: lighthouse } = await import('lighthouse');
  const port = Number(new URL(browser.wsEndpoint()).port);
  const lh = await lighthouse(URL_, { port, output: 'html', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
  writeFileSync(`${OUT}/lighthouse.html`, lh.report);
  writeFileSync(`${OUT}/lighthouse.json`, JSON.stringify(lh.lhr));
  report.a11yDetails = Object.values(lh.lhr.audits).filter((a) => a.score === 0 && a.details?.items?.length).slice(0, 8)
    .map((a) => `${a.id}: ${a.details.items.slice(0, 3).map((i) => i.node?.snippet || i.url || '').join(' | ')}`);
  report.lighthouse = Object.fromEntries(Object.entries(lh.lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  report.lighthouseMetrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((k) => [k, lh.lhr.audits[k].displayValue]));
  report.lighthouseIssues = Object.values(lh.lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(a.scoreDisplayMode)).map((a) => `${a.id}: ${a.title}`);
}

await browser.close();
report.foreignRequests = [...new Set(report.foreignRequests)];
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
