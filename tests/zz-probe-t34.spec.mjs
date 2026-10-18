import {test, expect} from '@playwright/test';
import {boot, openSurface} from './support/browser.mjs';
test('probe', async ({page}) => {
  await boot(page, process.env.PARITY_URL);
  await openSurface(page, 'geo-list');
  const keys = await page.locator('[data-list-row-key]').evaluateAll(els => [...new Set(els.map(e => e.getAttribute('data-list-row-key')))]);
  expect(keys.length).toBeGreaterThan(1);
  await page.locator('[data-list-open-record]').first().evaluate(el=>el.click());
  const pager = page.locator('.geo-record-footer .pager');
  await expect(page.locator('#geo-field-code')).toHaveValue(keys[0]);
  await expect(pager.locator('.pg-i')).toHaveValue('1');
  await pager.locator('.pg-n').click();
  await expect(page.locator('#geo-field-code')).toHaveValue(keys[1]);
  await expect(pager.locator('.pg-i')).toHaveValue('2');
});
