// Ledger accessibility items 2, 3, 4 and 10 (spec UX-06), task T5.1.
//
//   #2  pager Previous/Next buttons need accessible names
//   #3  collapsed (<=620px) toolbar summaries keep an accessible name
//   #4  selected nav item and current page meet 4.5:1 in every theme
//   #10 coarse-pointer sizes for list summaries, row actions, select-all and
//       the page-size select
//
// Runs in the 7 Playwright projects: themes come from the project's own
// colorScheme/contrast settings, coarse pointers from the two mobile projects.

import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173';
const isCoarse = () => Boolean(test.info().project.use.hasTouch);

async function openList(page, surface = 'list') {
  await boot(page, BASE_URL);
  await openSurface(page, surface);
  await settle(page);
}

// Accessible name as computed by Chromium's accessibility tree (the role of
// <summary> has no Playwright getByRole mapping).
async function accessibleName(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    const {root} = await cdp.send('DOM.getDocument', {depth: 0});
    const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector});
    if (!nodeId) return null;
    const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {nodeId, fetchRelatives: false});
    return nodes[0]?.name?.value ?? '';
  } finally {
    await cdp.detach();
  }
}

// WCAG 2.x contrast ratio of an element's text colour over its composited
// background, read from computed style in the page.
async function contrastOf(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    const rgba = value => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return {r, g, b, a: a / 255};
    };
    const over = (top, bottom) => {
      const a = top.a + bottom.a * (1 - top.a);
      if (!a) return {r: 0, g: 0, b: 0, a: 0};
      const mix = k => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
      return {r: mix('r'), g: mix('g'), b: mix('b'), a};
    };
    let background = {r: 255, g: 255, b: 255, a: 0};
    for (let node = el; node; node = node.parentElement) {
      background = over(background, rgba(getComputedStyle(node).backgroundColor));
      if (background.a >= 0.999) break;
    }
    background = over(background, {r: 255, g: 255, b: 255, a: 1});
    const text = over(rgba(getComputedStyle(el).color), background);
    const lum = ({r, g, b}) => {
      const [R, G, B] = [r, g, b].map(v => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const [hi, lo] = [lum(text), lum(background)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }, selector);
}

for (const [surface, label] of [
  ['list', 'invoice'],
  ['customers-list', 'customer'],
  ['geo-list', 'geography'],
]) {
  test(`pager buttons have names (${label} list)`, async ({page}) => {
    await openList(page, surface);
    // Arabic string merges in core/locale.js at wave end; accept both so the
    // RTL project still asserts a real name rather than skipping.
    await expect(page.getByRole('button', {name: /previous page|الصفحة السابقة/i})).toBeVisible();
    await expect(page.getByRole('button', {name: /next page|الصفحة التالية/i})).toBeVisible();
    for (const selector of ['.data-pagination-prev', '.data-pagination-next']) {
      expect(await accessibleName(page, selector), selector).toMatch(/\S/);
    }
  });
}

// T5.2 (ledger #9, INV-11): the pager total is the real row count, so it
// never advertises a page 2 that renders "No ... match this view".
for (const [surface, label, expected] of [
  ['list', 'invoice', 8],
  ['customers-list', 'customer', 3],
  ['geo-list', 'geography', 12],
]) {
  test(`pager count equals rows (${label} list)`, async ({page}) => {
    await openList(page, surface);
    const summary = page.locator('.data-pagination-summary');
    await expect(summary).toBeVisible();
    // Digits are read after folding Arabic-Indic numerals, so RTL passes too.
    const text = (await summary.innerText()).replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x660));
    const [rangeStart, rangeEnd, total] = text.match(/\d+/g).map(Number);
    const rendered = await page.locator('tr.data-list-record-row').count();
    expect(total, 'pager total').toBe(expected);
    expect(rendered, 'rendered rows').toBe(expected);
    expect([rangeStart, rangeEnd], 'pager range').toEqual([1, expected]);
    await expect(page.locator('.data-pagination-page'), 'only page 1 is offered').toHaveCount(1);
    await expect(page.locator('.data-pagination-next')).toBeDisabled();
  });
}

// Toolbar triggers: visible menu <summary> elements that are neither row
// actions nor menu items inside a popover. Tags them and returns how many.
async function tagToolbarSummaries(page) {
  return page.evaluate(() => {
    const summaries = [
      ...document.querySelectorAll('details.data-menu:not(.data-row-menu) > summary, details.data-page-manage > summary'),
    ].filter(summary => summary.getClientRects().length && !summary.closest('.data-menu-popover'));
    summaries.forEach((summary, index) => summary.setAttribute('data-a11y-probe', String(index)));
    return summaries.length;
  });
}

test('mobile toolbar triggers keep names', async ({page}) => {
  await openList(page);
  const width = await page.evaluate(() => window.innerWidth);
  test.skip(width > 620, 'toolbar labels collapse only at <=620px');

  const count = await tagToolbarSummaries(page);
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    expect(await accessibleName(page, `[data-a11y-probe="${index}"]`), `toolbar summary #${index}`).toMatch(/\S/);
  }
  // Columns and the view menu are the label-collapsing triggers in the ledger.
  const labelled = await page.locator('[data-a11y-probe] .data-toolbar-label-text').count();
  expect(labelled, 'Columns and view triggers').toBeGreaterThanOrEqual(2);
});

test('selected nav and page contrast >= 4.5', async ({page}) => {
  await openList(page);
  const nav = await contrastOf(page, '.nc1-item.current');
  const pageButton = await contrastOf(page, '.data-pagination-page.is-current');
  expect(nav, 'a current nav item must exist').not.toBeNull();
  expect(pageButton, 'a current page button must exist').not.toBeNull();
  expect(nav, '.nc1-item.current').toBeGreaterThanOrEqual(4.5);
  expect(pageButton, '.data-pagination-page.is-current').toBeGreaterThanOrEqual(4.5);
});

test('coarse list controls >= 44px', async ({page}) => {
  test.skip(!isCoarse(), 'coarse pointer only (mobile projects)');
  await openList(page);

  const measure = selector =>
    page
      .locator(selector)
      .first()
      .evaluate(element => {
        // A checkbox's target is the label that wraps it; every other control
        // (for example the page-size select) is measured itself.
        const target = element.matches('input[type="checkbox"]') ? (element.closest('label') ?? element) : element;
        const {width, height} = target.getBoundingClientRect();
        return {width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100};
      });

  const targets = {
    'row action summary': '[data-data-list="invoice"] details.data-row-menu > summary',
    'select-all checkbox': '[data-data-list="invoice"] [data-list-select-all]',
    'row select checkbox': '[data-data-list="invoice"] [data-list-row-select]',
    'page-size select': '[data-list-page-size]',
  };
  for (const [name, selector] of Object.entries(targets)) {
    const {width, height} = await measure(selector);
    expect(width, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(height, `${name} height`).toBeGreaterThanOrEqual(44);
  }

  // Every toolbar trigger.
  await tagToolbarSummaries(page);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('[data-a11y-probe]')]
      .map(summary => summary.getBoundingClientRect())
      .filter(rect => rect.width < 44 || rect.height < 44)
      .map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`)
  );
  expect(small, 'toolbar summaries below 44px').toEqual([]);

  // The enlarged checkbox target must actually toggle the checkbox.
  const selectAll = page.locator('[data-data-list="invoice"] [data-list-select-all]');
  const before = await selectAll.isChecked();
  await selectAll.locator('xpath=ancestor::label').click({position: {x: 2, y: 2}});
  expect(await selectAll.isChecked()).toBe(!before);
});

// Ledger items 11 and 12 (spec UX-07, UX-08), task T5.3.

test('mobile list visible on first load', async ({page}) => {
  const {width, height} = page.viewportSize();
  test.skip(width > 620, 'statistics collapse only at phone widths');
  await openList(page);
  const firstRow = page.locator('[data-data-list="invoice"] [data-list-row-key]').first();
  await expect(firstRow).toBeVisible();
  const top = await firstRow.evaluate(row => row.getBoundingClientRect().top);
  expect(top, 'first invoice row top must be inside the first viewport').toBeLessThan(height);
  // Collapsed, not removed: the overflow menu can still bring the cards back.
  await expect(page.locator('.data-stat-card')).toHaveCount(0);
  await page.locator('details.data-page-manage > summary').first().click();
  await page.locator('[data-list-manage-action="statistics-status"]').click();
  await expect(page.locator('.data-stat-card').first()).toBeVisible();
});

test('chart script does not block parse', async ({page}) => {
  await openList(page);
  const script = await page.evaluate(() => {
    const element = document.querySelector('script[src*="apexcharts"]');
    return element && {defer: element.defer, integrity: element.integrity, crossOrigin: element.crossOrigin};
  });
  expect(script, 'the ApexCharts script tag must exist').not.toBeNull();
  expect(script.defer, 'defer keeps the CDN script off the parser').toBe(true);
  expect(script.integrity).toMatch(/^sha512-/);
  expect(script.crossOrigin).toBe('anonymous');
});
