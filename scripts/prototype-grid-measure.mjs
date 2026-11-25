// PROTOTYPE, throwaway. Measures the page grid the screens use today for #24: page inset from
// the viewport edge, content width, and the column and row gaps of the card grid and statistics,
// at 390, 768, 1024, 1280, 1440 and 1768px, in Fluid and Boxed layouts and both densities. Read-only.
// Usage: PROTOTYPE_URL=http://127.0.0.1:4173 node scripts/prototype-grid-measure.mjs <outFile>
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const WIDTHS = [390, 768, 1024, 1280, 1440, 1768];
const LAYOUTS = ['fluid', 'boxed'];
const DENSITIES = ['default', 'compact'];
const SCREENS = [
  {id: 'customers-list', path: '/customers/list', targets: ['.customer-list-view h1', '#customer-list-canvas']},
  {id: 'invoices-cards', path: '/sales-systems-management/sales-invoices', click: '[data-list-view="cards"]',
    targets: ['.data-card-grid', '.data-statistics']},
  {id: 'notes', path: '/help-screens/notes', targets: ['.notes-view h1', '[data-collab-body]']},
];

function measure([selectors]) {
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const page = document.querySelector('.page-content');
  const pageBox = page?.getBoundingClientRect();
  const padding = page ? getComputedStyle(page) : null;
  const left = padding ? parseFloat(padding.paddingInlineStart) : 0;
  const right = padding ? parseFloat(padding.paddingInlineEnd) : 0;
  const targets = selectors.map(selector => {
    const el = [...document.querySelectorAll(selector)].find(visible);
    if (!el) return {selector, missing: true};
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      selector,
      inset: Math.round(rect.left - pageBox.left),
      insetEnd: Math.round(pageBox.right - rect.right),
      width: Math.round(rect.width),
      columnGap: parseFloat(cs.columnGap) || 0,
      rowGap: parseFloat(cs.rowGap) || 0,
    };
  });
  return {
    pagePadding: [left, right],
    pageWidth: Math.round(pageBox?.width ?? 0),
    targets,
  };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const width of WIDTHS) {
    for (const layout of LAYOUTS) {
      for (const density of DENSITIES) {
        const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
        const setup = await context.newPage();
        await setup.goto(`${BASE}/concepts/app-shell.html`);
        await setup.evaluate(([layout, density]) => {
          for (const [id, value] of [['density', density], ['content-layout', layout]]) {
            const el = document.getElementById(id);
            if (el) {
              el.value = value;
              el.dispatchEvent(new Event('change', {bubbles: true}));
            }
          }
        }, [layout, density]);
        await setup.close();
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
              await page.waitForTimeout(800);
            }
            const actual = await page.evaluate(() => [
              document.getElementById('density')?.value,
              document.getElementById('content-layout')?.value,
            ]);
            row = {width, layout, density, screen: screen.id, appliedDensity: actual[0], appliedLayout: actual[1],
              ...(await page.evaluate(measure, [screen.targets]))};
          } catch (error) {
            row = {width, layout, density, screen: screen.id, error: String(error.message || error).split('\n')[0]};
          }
          results.push(row);
          await page.close();
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
await mkdir(path.dirname(OUT), {recursive: true});
await writeFile(OUT, JSON.stringify({base: BASE, widths: WIDTHS, results}, null, 2));
console.log(`rows: ${results.length}, errors: ${results.filter(row => row.error).length}`);
