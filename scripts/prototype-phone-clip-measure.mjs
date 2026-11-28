// PROTOTYPE, throwaway. Measures clipped text and horizontal overflow on phone widths for #26:
// Profile, People, Customer and Invoices at 320, 360, 375 and 390px. Read-only.
// Usage: PROTOTYPE_URL=http://127.0.0.1:4173 node scripts/prototype-phone-clip-measure.mjs <outFile>
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const WIDTHS = [320, 360, 375, 390];
const SCREENS = [
  {id: 'profile', path: '/system/profile'},
  {id: 'people-record', path: '/help-screens/people-data', click: '[data-list-open-record]'},
  {id: 'customer-record', path: '/customers/list', click: '[data-list-open-record]'},
  {id: 'invoices-list', path: '/sales-systems-management/sales-invoices'},
];

function measure() {
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const clipped = [];
  const content = document.querySelector('.page-content') ?? document.body;
  for (const el of content.querySelectorAll('*')) {
    if (!visible(el) || el.getBoundingClientRect().width === 0) continue;
    const cs = getComputedStyle(el);
    const text = (el.childElementCount === 0 ? el.textContent : '').trim();
    if (!text) continue;
    const overflows = el.scrollWidth > el.clientWidth + 1;
    if (!overflows) continue;
    const rect = el.getBoundingClientRect();
    clipped.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.'),
      text: text.slice(0, 40),
      width: Math.round(rect.width),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      ellipsis: cs.textOverflow === 'ellipsis',
      overflowX: cs.overflowX,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
    });
  }
  const offscreen = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width && (rect.right > innerWidth + 1 || rect.left < -1)) {
      let scroller = false;
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX)) { scroller = true; break; }
      }
      if (!scroller) offscreen.push(`${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(/\s+/)[0]}`);
    }
  }
  return {
    path: location.pathname + location.search,
    pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    offscreen: offscreen.length,
    offscreenSample: [...new Set(offscreen)].slice(0, 8),
    clippedCount: clipped.length,
    clipped: clipped.slice(0, 40),
  };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({viewport: {width, height: 800}, reducedMotion: 'reduce'});
    await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
    for (const screen of SCREENS) {
      const page = await context.newPage();
      let row;
      try {
        await page.goto(`${BASE}${screen.path}`);
        await page.locator('.skeleton-overlay').waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await page.waitForTimeout(1000);
        if (screen.click) {
          const clicked = await page.evaluate(selector => {
            const item = document.querySelector(selector);
            if (!item) return false;
            item.click();
            return true;
          }, screen.click);
          if (!clicked) throw new Error(`control ${screen.click} not found`);
          await page.waitForTimeout(900);
        }
        row = {width, screen: screen.id, ...(await page.evaluate(measure))};
      } catch (error) {
        row = {width, screen: screen.id, error: String(error.message || error).split('\n')[0]};
      }
      results.push(row);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
await mkdir(path.dirname(OUT), {recursive: true});
await writeFile(OUT, JSON.stringify({base: BASE, widths: WIDTHS, results}, null, 2));
console.log(JSON.stringify(results.map(row => [row.width, row.screen, row.error ?? row.clippedCount, row.pageOverflowX, row.offscreen])));
