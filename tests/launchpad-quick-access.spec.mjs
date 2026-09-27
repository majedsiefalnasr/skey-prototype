import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

test('launchpad quick access uses a compact split header and intrinsic-width cards', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await settle(page);

  if (test.info().project.name.startsWith('desktop')) {
    const launchpad = page.locator('.lp-body');
    const launchpadWidth = await launchpad.evaluate(element =>
      Math.round(element.getBoundingClientRect().width)
    );
    expect(launchpadWidth).toBe(960);
    const appColumnCount = await launchpad.locator('.lp-grid').evaluate(element =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length
    );
    expect(appColumnCount).toBe(3);
  }

  const header = page.locator('.lp-quick-header');
  const tabs = page.locator('.lp-quick-tabs');
  const more = page.locator('.lp-quick-more');

  await expect(header).toBeVisible();
  await expect(more).toBeVisible();

  const [headerBox, tabsBox, moreBox] = await Promise.all([
    header.boundingBox(),
    tabs.boundingBox(),
    more.boundingBox(),
  ]);
  expect(headerBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(moreBox).not.toBeNull();
  expect(tabsBox.width).toBeLessThan(headerBox.width * 0.75);

  const direction = await page.locator('html').getAttribute('dir');
  if (direction === 'rtl') expect(tabsBox.x).toBeGreaterThan(moreBox.x);
  else expect(tabsBox.x).toBeLessThan(moreBox.x);

  await page.locator('[data-lp-quick-tab="Recent"]').click();
  const cards = page.locator('.lp-tags .lp-tag');
  await expect(cards).toHaveCount(10);
  await expect(more).toBeVisible();

  const widths = await cards.evaluateAll(elements =>
    elements.map(element => Math.round(element.getBoundingClientRect().width))
  );
  expect(new Set(widths).size).toBeGreaterThan(2);
  expect(Math.max(...widths)).toBeLessThan(headerBox.width);
});
