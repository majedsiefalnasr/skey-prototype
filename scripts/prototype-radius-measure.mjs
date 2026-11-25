// PROTOTYPE, throwaway. Measures what each radius value set changes on the real screens.
// Usage: node scripts/prototype-radius-measure.mjs [outDir]
// Needs the prototype server: node scripts/prototype-dev.mjs (port 4180).
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openSurface} from '../tests/support/browser.mjs';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4180';
const OUT = process.argv[2] ?? '/private/tmp/skey-proto-27-out';
const WIDTHS = [390, 768, 1024, 1440];
const SCREENS = [
  {id: 'home', label: 'Home', open: page => openSurface(page, 'launchpad')},
  {id: 'customers-list', label: 'Customer list', open: page => openSurface(page, 'customers-list')},
  {id: 'customer-record', label: 'Customer record', open: page => openSurface(page, 'customer-record')},
  {id: 'profile', label: 'Profile', open: async page => {
    await page.goto(`${BASE}/system/profile`)
  }},
  {id: 'profile-appearance', label: 'Profile (Appearance section)', open: async page => {
    await page.goto(`${BASE}/system/profile?section=appearance`)
  }},
  {id: 'invoice-list', label: 'Sales invoice list', open: page => openSurface(page, 'list')},
  {id: 'invoice-record', label: 'Sales invoice record', open: page => openSurface(page, 'record')},
  {id: 'email', label: 'Email', open: page => openSurface(page, 'email')},
];
const TOKEN_NAMES = [1, 3, 5, 7, 9, 10, 11, 14];
const VARIANTS = ['A', 'B', 'C'];

async function collect(page, sentinelValues) {
  return page.evaluate(({sentinelValues}) => {
    const root = document.documentElement;
    const ids = Object.keys(sentinelValues);
    for (const id of ids) root.style.setProperty(`--ds-radius-legacy-${id}`, `${sentinelValues[id]}px`);
    const rows = [];
    const all = document.querySelectorAll('body *');
    all.forEach((node, index) => {
      if (node.closest('[data-radius-prototype], #kit, #kit-pill')) return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const cs = getComputedStyle(node);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const corners = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
        .map(value => parseFloat(value) || 0);
      if (corners.every(value => value === 0)) return;
      rows.push({index, w: rect.width, h: rect.height, corners});
    });
    return rows;
  }, {sentinelValues});
}

async function readCorners(page, indexes) {
  return page.evaluate(({indexes}) => {
    const all = document.querySelectorAll('body *');
    return indexes.map(index => {
      const cs = getComputedStyle(all[index]);
      return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(value => parseFloat(value) || 0);
    });
  }, {indexes});
}

async function setTokens(page, values) {
  await page.evaluate(({values}) => {
    const root = document.documentElement;
    for (const [id, px] of Object.entries(values)) {
      if (px === null) root.style.removeProperty(`--ds-radius-legacy-${id}`);
      else root.style.setProperty(`--ds-radius-legacy-${id}`, `${px}px`);
    }
  }, {values});
}

async function main() {
  await mkdir(path.join(OUT, 'shots'), {recursive: true});
  const browser = await chromium.launch();
  const results = [];
  const sets = await (async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/concepts/app-shell.html`);
    await page.waitForFunction(() => window.__radiusPrototype);
    const data = await page.evaluate(() => {
      const proto = window.__radiusPrototype;
      const out = {};
      for (const variant of ['B', 'C']) {
        out[variant] = {};
        for (const name of Object.keys(proto.TOKENS)) out[variant][name] = proto.valueFor(variant, name);
      }
      return out;
    });
    await context.close();
    return data;
  })();

  for (const width of WIDTHS) {
    const mobile = width <= 480;
    const context = await browser.newContext({
      viewport: {width, height: mobile ? 844 : 900},
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    });
    await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
    for (const screen of SCREENS) {
      const page = await context.newPage();
      await page.clock.install({time: Date.parse('2026-09-13T09:00:00+02:00')});
      await page.goto(`${BASE}/concepts/app-shell.html`);
      await page.clock.resume();
      await page.waitForFunction(() => window.__radiusPrototype);
      const loading = page.locator('#simulate-loading');
      if (await loading.isChecked()) await loading.uncheck();
      let error = null;
      try {
        await screen.open(page);
        await page.waitForTimeout(900);
        await page.waitForFunction(() => window.__radiusPrototype);
        await page.addStyleTag({content: '[data-radius-prototype],#kit,#kit-pill{display:none!important}'});
        await page.waitForFunction(() => !document.querySelector('.skeleton-overlay'), null, {timeout: 5000}).catch(() => {});
      } catch (cause) {
        error = String(cause).split('\n')[0];
      }
      if (error) {
        results.push({width, screen: screen.id, error});
        await page.close();
        continue;
      }

      const sentinel = Object.fromEntries(TOKEN_NAMES.map(id => [id, id + 0.5]));
      const rows = await collect(page, sentinel);
      const sentinelToToken = new Map(TOKEN_NAMES.map(id => [id + 0.5, id]));
      const tokenElements = [];
      let literalOnListedValues = 0;
      let radiusElements = rows.length;
      let fullPill = 0;
      for (const row of rows) {
        const used = row.corners.map(value => sentinelToToken.get(value) ?? null);
        if (used.some(Boolean)) tokenElements.push({...row, used});
        else if (row.corners.some(value => value >= 999)) fullPill += 1;
        else if (row.corners.some(value => TOKEN_NAMES.includes(value))) literalOnListedValues += 1;
      }
      const indexes = tokenElements.map(row => row.index);

      const perVariant = {};
      for (const variant of VARIANTS) {
        const values = Object.fromEntries(TOKEN_NAMES.map(id => [id, variant === 'A' ? id : sets[variant][id]]));
        await setTokens(page, values);
        await page.waitForTimeout(50);
        const after = await readCorners(page, indexes);
        perVariant[variant] = {values, after};
        if (variant !== 'A') {
          await page.setViewportSize({width, height: mobile ? 844 : 900});
        }
        await page.screenshot({path: path.join(OUT, 'shots', `${screen.id}-${width}-${variant}.png`)});
      }
      await setTokens(page, Object.fromEntries(TOKEN_NAMES.map(id => [id, null])));

      const perToken = {};
      for (const id of TOKEN_NAMES) perToken[id] = {elements: 0, B: {changed: 0, hiddenByClamp: 0, maxDelta: 0}, C: {changed: 0, hiddenByClamp: 0, maxDelta: 0}};
      tokenElements.forEach((row, rowIndex) => {
        const half = Math.min(row.w, row.h) / 2;
        const tokensHere = new Set(row.used.filter(Boolean));
        for (const id of tokensHere) {
          perToken[id].elements += 1;
          for (const variant of ['B', 'C']) {
            let shown = 0;
            let wouldBe = 0;
            row.used.forEach((token, corner) => {
              if (token !== id) return;
              const before = Math.min(id, half);
              const afterValue = perVariant[variant].after[rowIndex][corner];
              const afterShown = Math.min(afterValue, half);
              shown = Math.max(shown, Math.abs(afterShown - before));
              wouldBe = Math.max(wouldBe, Math.abs(afterValue - id));
            });
            if (shown > 0.01) {
              perToken[id][variant].changed += 1;
              perToken[id][variant].maxDelta = Math.max(perToken[id][variant].maxDelta, shown);
            } else if (wouldBe > 0.01) {
              perToken[id][variant].hiddenByClamp += 1;
            }
          }
        }
      });
      results.push({width, screen: screen.id, label: screen.label, radiusElements, tokenElements: tokenElements.length, literalOnListedValues, fullPill, perToken});
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  await writeFile(path.join(OUT, 'measure.json'), JSON.stringify({sets, results}, null, 2));
  console.log(`wrote ${path.join(OUT, 'measure.json')} (${results.length} rows)`);
}

await main();
