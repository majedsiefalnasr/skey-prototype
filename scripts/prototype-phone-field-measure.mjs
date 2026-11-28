// PROTOTYPE, throwaway. Measures form field values that do not fit their box for #26, on
// Profile, People record, Customer record and Invoices at 320, 360, 375 and 390px. Read-only.
// Usage: PROTOTYPE_URL=http://127.0.0.1:4173 node scripts/prototype-phone-field-measure.mjs <outFile>
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
  const context = document.createElement('canvas').getContext('2d');
  const content = document.querySelector('.page-content') ?? document.body;
  const fields = [];
  for (const el of content.querySelectorAll('input, textarea')) {
    if (!visible(el) || el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) continue;
    const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    context.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const value = el.value || '';
    const needed = Math.ceil(context.measureText(value).width);
    const available = Math.floor(rect.width - padding - border);
    fields.push({
      name: el.name || el.id || el.getAttribute('aria-label') || el.placeholder || el.type,
      width: Math.round(rect.width),
      available,
      needed,
      clipped: needed > available + 1,
      valueSample: value.slice(0, 40),
    });
  }
  const clippedFields = fields.filter(field => field.clipped);
  return {
    path: location.pathname + location.search,
    fieldCount: fields.length,
    clippedCount: clippedFields.length,
    clipped: clippedFields.slice(0, 30),
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
console.log(JSON.stringify(results.map(row => [row.width, row.screen, row.error ?? `${row.fieldCount} fields, ${row.clippedCount} clipped`])));
