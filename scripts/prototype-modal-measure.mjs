// PROTOTYPE, throwaway. Measures every rendered role="dialog" at 390, 768, 1024 and 1440px.
// Usage: node scripts/prototype-modal-measure.mjs <outDir>  (needs the dev server: node scripts/dev.mjs, port 4173)
// Ticket #31 measurement. Read-only: forces hidden dialogs visible only in memory and restores them.
import {chromium} from '@playwright/test';
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const WIDTHS = [390, 768, 1024, 1440];

const browser = await chromium.launch();
const byWidth = {};
for (const width of WIDTHS) {
  const mobile = width <= 480;
  const context = await browser.newContext({
    viewport: {width, height: mobile ? 844 : 900},
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  const page = await context.newPage();
  await page.clock.install({time: Date.parse('2026-09-13T09:00:00+02:00')});
  await page.goto(`${BASE}/concepts/app-shell.html`);
  await page.clock.resume();
  await page.waitForTimeout(1500);
  byWidth[width] = await page.evaluate(() => {
    const describe = el => {
      const labelled = el.getAttribute('aria-labelledby');
      const title = labelled ? document.getElementById(labelled.split(' ')[0])?.textContent?.trim() : null;
      return {
        id: el.id || null,
        label: el.getAttribute('aria-label') || title || null,
        classes: (el.getAttribute('class') || '').slice(0, 220),
        inlineWidth: el.style.width || null,
        modal: el.getAttribute('aria-modal'),
      };
    };
    return [...document.querySelectorAll('[role="dialog"]')].map((el, index) => {
      const hidden = [];
      for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none') {
          hidden.push([node, node.style.getPropertyValue('display'), node.style.getPropertyPriority('display')]);
          node.style.setProperty('display', 'block', 'important');
        }
      }
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const result = {
        index,
        ...describe(el),
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        radius: cs.borderTopLeftRadius,
        position: cs.position,
        forcedAncestors: hidden.length,
      };
      for (const [node, value, priority] of hidden.reverse()) {
        node.style.removeProperty('display');
        if (value) node.style.setProperty('display', value, priority);
      }
      return result;
    });
  });
  await context.close();
}

await browser.close();
const dialogs = Object.values(byWidth)[0].map(d => d.index);
const rows = dialogs.map(index => {
  const base = byWidth[1440][index];
  return {
    index,
    id: base.id,
    label: base.label,
    classes: base.classes,
    inlineWidth: base.inlineWidth,
    radius: base.radius,
    position: base.position,
    width: Object.fromEntries(WIDTHS.map(w => [w, byWidth[w][index]?.width ?? null])),
    height: Object.fromEntries(WIDTHS.map(w => [w, byWidth[w][index]?.height ?? null])),
  };
});
await mkdir(OUT, {recursive: true});
await writeFile(path.join(OUT, '31-modal-measure.json'), JSON.stringify({widths: WIDTHS, count: rows.length, rows}, null, 2));
console.log(JSON.stringify({count: rows.length}));
