import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';
const surfaces = ['launchpad','list','record','customers-list',
  'customer-record','geo-list','geo-record','email'];
const task5Surfaces = new Set(['list', 'record', 'customers-list', 'customer-record']);
for (const id of surfaces) {
  test(`${id}: baseline appearance`, async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
    await openSurface(page, id);
    await settle(page);
    if (task5Surfaces.has(id)) {
      const linkedStylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll(links =>
        links.map(link => link.getAttribute('href'))
      );
      expect(linkedStylesheets).not.toContain('app/pages/invoices/invoices.css');
      expect(linkedStylesheets).not.toContain('app/pages/invoices/invoices-2.css');
      expect(linkedStylesheets).not.toContain('app/pages/invoices/invoices-3.css');
      expect(linkedStylesheets).not.toContain('app/pages/invoices/invoices-4.css');
      expect(linkedStylesheets).not.toContain('app/pages/invoices/invoices-5.css');
      expect(linkedStylesheets).not.toContain('app/pages/customers/customers.css');
    }
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
