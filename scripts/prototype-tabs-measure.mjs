// PROTOTYPE, throwaway. Measures every role="tablist" for #33 at 390, 768, 1024 and 1440px,
// and tests Arrow, Home and End keys at 1440px. Read-only: hidden dialogs are shown only in memory.
// Usage: node scripts/prototype-tabs-measure.mjs <outDir>  (needs the dev server: node scripts/dev.mjs, port 4173)
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openSurface} from '../tests/support/browser.mjs';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const WIDTHS = [390, 768, 1024, 1440];
const SCREENS = [
  {id: 'home', open: page => openSurface(page, 'launchpad')},
  {id: 'invoice-record', open: page => openSurface(page, 'record')},
  {id: 'invoice-activity', open: async page => {
    await openSurface(page, 'record');
    await page.waitForTimeout(900);
    await page.locator('.dr-open:not([disabled])').first().click();
  }},
  {id: 'geo-record', open: page => openSurface(page, 'geo-record')},
  {id: 'notifications-panel', open: page => page.locator('button.ibtn[data-i18n-aria-label="System Alerts"]').click()},
  {id: 'hidden-dialogs', forced: true, open: async () => {}},
];

function measure(forced) {
  const shown = [];
  const forcedLists = new Set();
  if (forced) {
    for (const list of document.querySelectorAll('[role="tablist"]')) {
      if (list.getClientRects().length) continue;
      forcedLists.add(list);
      for (let node = list; node && node !== document.documentElement; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none' || node.hidden) {
          shown.push([node, node.style.getPropertyValue('display'), node.style.getPropertyPriority('display'), node.hidden]);
          node.hidden = false;
          node.style.setProperty('display', 'block', 'important');
        }
      }
    }
  }
  const all = [...document.querySelectorAll('[role="tablist"]')];
  const rows = all.filter(list => list.getClientRects().length && (!forced || forcedLists.has(list))).map(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')].filter(tab => tab.getClientRects().length);
    const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
    const cs = selected ? getComputedStyle(selected) : null;
    const rect = selected?.getBoundingClientRect();
    const inView = rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth;
    const hit = inView ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
    return {
      listIndex: all.indexOf(list),
      label: list.getAttribute('aria-label') || list.id || null,
      listClass: (list.getAttribute('class') || '').split(/\s+/)[0],
      forced: forcedLists.has(list),
      covered: inView ? !list.contains(hit) : null,
      tabs: tabs.length,
      selected: selected && {
        text: selected.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      },
      listWidth: Math.round(list.getBoundingClientRect().width),
      listOverflows: list.scrollWidth > list.clientWidth + 1,
    };
  });
  return {rows, shown: shown.length};
}

async function keyboard(page, listIndex) {
  const tabsOf = listIndex => [...document.querySelectorAll('[role="tablist"]')[listIndex].querySelectorAll('[role="tab"]')].filter(tab => tab.getClientRects().length);
  const state = () => page.evaluate(([listIndex, source]) => {
    const tabs = new Function('return ' + source)()(listIndex);
    return {focus: tabs.indexOf(document.activeElement), selected: tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'), count: tabs.length};
  }, [listIndex, tabsOf.toString()]);
  const focusTab = which => page.evaluate(([listIndex, source, which]) => {
    const tabs = new Function('return ' + source)()(listIndex);
    const tab = which === 'last' ? tabs.at(-1) : tabs[0];
    tab?.focus();
    return {count: tabs.length, roving: tabs.map(tab => tab.tabIndex)};
  }, [listIndex, tabsOf.toString(), which]);
  const start = await focusTab('first');
  if (!start.count) return null;
  const result = {tabs: start.count, tabIndex: start.roving};
  const before = await state();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const right = await state();
  result.arrowRightMovesFocus = right.focus === before.focus + 1;
  result.arrowRightSelects = right.selected === right.focus && right.focus !== before.selected;
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const left = await state();
  result.arrowLeftMovesFocus = left.focus === right.focus - 1;
  await page.keyboard.press('End');
  await page.waitForTimeout(150);
  result.endMovesFocus = (await state()).focus === start.count - 1;
  await focusTab('last');
  await page.keyboard.press('Home');
  await page.waitForTimeout(150);
  result.homeMovesFocus = (await state()).focus === 0;
  return result;
}

const browser = await chromium.launch();
const results = [];
for (const width of WIDTHS) {
  const mobile = width <= 480;
  const context = await browser.newContext({viewport: {width, height: mobile ? 844 : 900}, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce'});
  await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  for (const screen of SCREENS) {
    const page = await context.newPage();
    await page.clock.install({time: Date.parse('2026-09-13T09:00:00+02:00')});
    await page.goto(`${BASE}/concepts/app-shell.html`);
    await page.clock.resume();
    const loading = page.locator('#simulate-loading');
    if (await loading.isChecked()) await loading.uncheck();
    try {
      await screen.open(page);
      await page.waitForTimeout(1200);
    } catch (cause) {
      results.push({width, screen: screen.id, error: String(cause).split('\n')[0]});
      await page.close();
      continue;
    }
    const {rows} = await page.evaluate(measure, Boolean(screen.forced));
    for (const row of rows) {
      if (width === 1440 && !row.covered) row.keyboard = await keyboard(page, row.listIndex).catch(cause => ({error: String(cause).split('\n')[0]}));
      results.push({width, screen: screen.id, ...row});
    }
    await page.close();
  }
  await context.close();
}
await browser.close();
await mkdir(OUT, {recursive: true});
await writeFile(path.join(OUT, '33-tabs-measure.json'), JSON.stringify({widths: WIDTHS, measuredAt: new Date().toISOString(), rows: results}, null, 2));
console.log(JSON.stringify({rows: results.length}));
