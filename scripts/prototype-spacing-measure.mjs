// PROTOTYPE, throwaway. Measures what each spacing value set changes on the real screens.
// Usage: node scripts/prototype-spacing-measure.mjs [outDir]
// Needs the prototype server: node scripts/prototype-dev.mjs (port 4181).
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openSurface} from '../tests/support/browser.mjs';
import {extraScreens} from './prototype-spacing-extra-screens.mjs';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4181';
const OUT = process.argv[2] ?? '/private/tmp/skey-proto-29-out';
const WIDTHS = [390, 768, 1024, 1440];
const BASE_SCREENS = [
  {id: 'home', label: 'Home', open: page => openSurface(page, 'launchpad')},
  {id: 'customers-list', label: 'Customer list', open: page => openSurface(page, 'customers-list')},
  {id: 'customer-record', label: 'Customer record', open: page => openSurface(page, 'customer-record')},
  {id: 'profile', label: 'Profile', open: async page => {
    await page.goto(`${BASE}/system/profile`);
  }},
  {id: 'profile-appearance', label: 'Profile (Appearance section)', open: async page => {
    await page.goto(`${BASE}/system/profile?section=appearance`);
  }},
  {id: 'invoice-list', label: 'Sales invoice list', open: page => openSurface(page, 'list')},
  {id: 'invoice-record', label: 'Sales invoice record', open: page => openSurface(page, 'record')},
  {id: 'email', label: 'Email', open: page => openSurface(page, 'email')},
];
const EXTRA = Boolean(process.env.EXTRA);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SCREENS = (EXTRA ? extraScreens(BASE) : BASE_SCREENS).filter(screen => !ONLY || ONLY.includes(screen.id));
const VARIANTS = ['A', 'B', 'C'];
const HIDE = '[data-spacing-prototype],#kit,#kit-pill{display:none!important}';

async function readSets(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/concepts/app-shell.html`);
  await page.waitForFunction(() => window.__spacingPrototype);
  const data = await page.evaluate(() => {
    const proto = window.__spacingPrototype;
    const sets = {};
    for (const variant of ['A', 'B', 'C']) {
      sets[variant] = {};
      for (const name of Object.keys(proto.TOKENS)) sets[variant][name] = proto.valueFor(variant, name);
    }
    return {sets, current: Object.fromEntries(Object.entries(proto.TOKENS).map(([name, token]) => [name, token.current]))};
  });
  await context.close();
  return data;
}

async function applyValues(page, values) {
  await page.evaluate(values => {
    for (const [name, px] of Object.entries(values)) {
      if (px === null) document.documentElement.style.removeProperty(`--ds-space-legacy-${name}`);
      else document.documentElement.style.setProperty(`--ds-space-legacy-${name}`, `${px}px`);
    }
  }, values);
}

async function discover(page, sentinel) {
  return page.evaluate(sentinel => {
    const root = document.documentElement;
    for (const [name, px] of Object.entries(sentinel)) root.style.setProperty(`--ds-space-legacy-${name}`, `${px}px`);
    const byValue = new Map(Object.entries(sentinel).map(([name, px]) => [Math.round(px * 100), name]));
    const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap', 'top', 'right', 'bottom', 'left'];
    const found = [];
    const nodes = document.querySelectorAll('body *');
    nodes.forEach((node, index) => {
      if (node.closest('[data-spacing-prototype], #kit, #kit-pill')) return;
      if (node.getClientRects().length === 0) return;
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(node, pseudo);
        if (pseudo && cs.content === 'none') continue;
        if (!pseudo && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
        for (const prop of props) {
          const raw = cs[prop];
          if (!raw || raw === 'auto' || raw === 'normal') continue;
          const value = Math.abs(parseFloat(raw));
          if (Number.isNaN(value)) continue;
          const token = byValue.get(Math.round(value * 100));
          if (token) found.push({index, pseudo, prop, token});
        }
      }
    });
    return found;
  }, sentinel);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const boxes = [];
    const clipped = [];
    document.querySelectorAll('body *').forEach((node, index) => {
      if (node.closest('[data-spacing-prototype], #kit, #kit-pill')) return;
      const rect = node.getBoundingClientRect();
      boxes.push([index, Math.round(rect.width * 100) / 100, Math.round(rect.height * 100) / 100]);
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || rect.width < 1 || rect.height < 1) return;
      const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
      if (clips && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)) clipped.push(index);
    });
    const root = document.documentElement;
    return {boxes, clipped, pageHeight: root.scrollHeight, pageWidthOverflow: root.scrollWidth - root.clientWidth};
  });
}

async function main() {
  await mkdir(path.join(OUT, 'shots'), {recursive: true});
  const browser = await chromium.launch();
  const {sets, current} = await readSets(browser);
  const tokenNames = Object.keys(current);
  const sentinel = Object.fromEntries(tokenNames.map(name => [name, current[name] + 0.37]));
  const results = [];

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
      await page.waitForFunction(() => window.__spacingPrototype);
      const loading = page.locator('#simulate-loading');
      if (await loading.isChecked()) await loading.uncheck();
      let error = null;
      try {
        await screen.open(page);
        await page.waitForTimeout(900);
        await page.waitForFunction(() => window.__spacingPrototype);
        await page.addStyleTag({content: HIDE});
        await page.waitForFunction(() => !document.querySelector('.skeleton-overlay'), null, {timeout: 5000}).catch(() => {});
      } catch (cause) {
        error = String(cause).split('\n')[0];
      }
      if (error) {
        results.push({width, screen: screen.id, error});
        await page.close();
        continue;
      }

      const found = await discover(page, sentinel);
      const perToken = Object.fromEntries(tokenNames.map(name => [name, {elements: new Set(), properties: 0}]));
      for (const hit of found) {
        perToken[hit.token].elements.add(`${hit.index}`);
        perToken[hit.token].properties += 1;
      }

      const perVariant = {};
      for (const variant of VARIANTS) {
        await applyValues(page, sets[variant]);
        await page.waitForTimeout(80);
        perVariant[variant] = await snapshot(page);
        await page.screenshot({path: path.join(OUT, 'shots', `${screen.id}-${width}-${variant}.png`)});
      }
      await applyValues(page, Object.fromEntries(tokenNames.map(name => [name, null])));

      const baseline = new Map(perVariant.A.boxes.map(([index, w, h]) => [index, [w, h]]));
      const baseClipped = new Set(perVariant.A.clipped);
      const summary = {};
      for (const variant of ['B', 'C']) {
        let widthChanges = 0;
        let heightChanges = 0;
        let maxHeight = 0;
        for (const [index, w, h] of perVariant[variant].boxes) {
          const [baseW, baseH] = baseline.get(index) ?? [w, h];
          if (Math.abs(w - baseW) > 0.5) widthChanges += 1;
          if (Math.abs(h - baseH) > 0.5) {
            heightChanges += 1;
            maxHeight = Math.max(maxHeight, Math.abs(h - baseH));
          }
        }
        summary[variant] = {
          widthChanges,
          heightChanges,
          maxHeightChange: maxHeight,
          newlyClipped: perVariant[variant].clipped.filter(index => !baseClipped.has(index)).length,
          pageHeightDelta: perVariant[variant].pageHeight - perVariant.A.pageHeight,
          pageOverflowBefore: perVariant.A.pageWidthOverflow,
          pageOverflowAfter: perVariant[variant].pageWidthOverflow,
        };
      }
      const tokens = Object.fromEntries(Object.entries(perToken).map(([name, data]) => [name, {elements: data.elements.size, properties: data.properties}]));
      results.push({width, screen: screen.id, label: screen.label, tokens, summary, pageHeightA: perVariant.A.pageHeight});
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  const outName = ONLY ? `measure-only-${ONLY.join('+')}.json` : EXTRA ? 'measure-extra.json' : 'measure.json';
  await writeFile(path.join(OUT, outName), JSON.stringify({sets, current, results}, null, 2));
  console.log(`wrote ${path.join(OUT, outName)} (${results.length} rows)`);
}

await main();
