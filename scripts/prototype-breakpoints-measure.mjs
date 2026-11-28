// PROTOTYPE, throwaway. Measures the screens behind the open legacy breakpoints for #21 at
// 390, 520, 768, 1024, 1280, 1366 and 1440px. Read-only.
// Usage: PROTOTYPE_URL=http://127.0.0.1:4173 node scripts/prototype-breakpoints-measure.mjs <outFile> [md]
// Run once against the current build and once against a build with the proposed values.
// With `md`, measures the three effects left by the earlier `md` move instead: the data list
// toolbar, the statistics cards and the content inset against the page heading.
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const MD = process.argv[3] === 'md';
const WIDTHS = MD ? [640, 768, 900, 960, 1023, 1024, 1060, 1100, 1101] : [390, 520, 768, 1024, 1280, 1366, 1440];
const SCREENS = MD ? [
  {id: 'invoices-list', path: '/sales-systems-management/sales-invoices',
    targets: ['.data-toolbar', '.data-toolbar-inline', '.data-toolbar-overflow', '.data-statistics']},
  {id: 'notes', path: '/help-screens/notes', targets: [], edges: ['h1', '[data-collab-body]']},
  {id: 'activities', path: '/help-screens/activities', targets: [], edges: ['h1', '[data-collab-body]']},
] : [
  {id: 'geography-record', path: '/system-setup/geographical-structure', click: '[data-list-open-record]', targets: ['.geo-workspace']},
  {id: 'people-cards', path: '/help-screens/people-data', click: '[data-view-select="cards"]', targets: ['.data-card-grid']},
  {id: 'customers-cards', path: '/customers/list', click: '[data-list-view="cards"]', targets: ['.data-card-grid']},
  {id: 'invoices-cards', path: '/sales-systems-management/sales-invoices', click: '[data-list-view="cards"]', targets: ['.data-card-grid']},
  {id: 'invoices-statistics', path: '/sales-systems-management/sales-invoices', click: '[data-list-manage-action="statistics-status"]',
    unless: '.data-statistics', targets: ['.data-statistics']},
  {id: 'organization-overview', path: '/system/organization?section=overview', targets: ['[class*="legacy-1299"]']},
];

function measure([selectors, edgeSelectors = []]) {
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const scrollsX = el => /(auto|scroll)/.test(getComputedStyle(el).overflowX);
  const name = el => `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.')}`;
  const offscreen = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    let inScroller = false;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (scrollsX(node)) { inScroller = true; break; }
    }
    if (inScroller) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width && (rect.right > innerWidth + 1 || rect.left < -1)) offscreen.push(name(el));
  }
  const targets = selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(visible).map(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const kids = [...el.children].filter(visible).map(kid => kid.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i], b = kids[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps++;
    }
    const truncated = [...el.querySelectorAll('*')].filter(node => visible(node) && node.scrollWidth > node.clientWidth + 1
      && getComputedStyle(node).textOverflow === 'ellipsis').length;
    const tracks = cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none' ? cs.gridTemplateColumns.split(' ') : null;
    return {
      selector: name(el),
      width: Math.round(rect.width),
      columns: tracks ? tracks.length : null,
      tracks: tracks ? tracks.map(track => Math.round(parseFloat(track))) : null,
      rowsOfChildren: new Set(kids.map(kid => Math.round(kid.top))).size,
      childWidths: [...new Set(kids.map(kid => Math.round(kid.width)))].slice(0, 6),
      overlaps,
      truncated,
    };
  }));
  return {
    path: location.pathname + location.search,
    pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    offscreen: offscreen.length,
    offscreenSample: [...new Set(offscreen)].slice(0, 5),
    edges: Object.fromEntries(edgeSelectors.map(selector => {
      const el = [...document.querySelectorAll(selector)].find(visible);
      const rect = el?.getBoundingClientRect();
      return [selector, rect ? [Math.round(rect.left), Math.round(rect.right)] : null];
    })),
    targets,
  };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
    for (const screen of SCREENS) {
      const page = await context.newPage();
      let row;
      try {
        await page.goto(`${BASE}${screen.path}`);
        await page.locator('.skeleton-overlay').waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await page.waitForTimeout(1200);
        if (screen.click) {
          const clicked = await page.evaluate(([selector, unless]) => {
            const present = unless && [...document.querySelectorAll(unless)].some(el => el.getClientRects().length);
            if (present) return 'already shown';
            const item = document.querySelector(selector);
            if (!item) return false;
            item.click();
            return 'clicked';
          }, [screen.click, screen.unless]);
          if (!clicked) throw new Error(`control ${screen.click} not found`);
          await page.waitForTimeout(900);
        }
        row = {width, screen: screen.id, ...(await page.evaluate(measure, [screen.targets, screen.edges]))};
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
console.log(JSON.stringify(results.map(row => [row.width, row.screen, row.error ?? row.targets.length, row.pageOverflowX, row.offscreen])));
