import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';
const surfaces = ['launchpad','list','record','customers-list',
  'customer-record','geo-list','geo-record','email'];
for (const id of surfaces) {
  test(`${id}: baseline appearance`, async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
    await openSurface(page, id);
    await settle(page);
    await expect(page).toHaveScreenshot(`${id}.png`, {
      animations: 'disabled', maxDiffPixels: 0
    });
  });
}

test('launchpad search panel: baseline appearance', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.locator('.lp-search').click();
  await settle(page);
  await expect(page).toHaveScreenshot('launchpad-search.png', {
    animations: 'disabled', maxDiffPixels: 0
  });
});
