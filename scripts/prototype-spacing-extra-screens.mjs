// PROTOTYPE, throwaway. Extra scenarios for the values that no base screen reaches (#29).
import {openSurface} from '../tests/support/browser.mjs';

const clickAll = (page, selector) => page.evaluate(selector => document.querySelectorAll(selector).forEach(node => node.click()), selector);

export function extraScreens(base) {
  return [
    {id: 'sidebar-branches', label: 'Sidebar, System Setup panel with every branch expanded', open: async page => {
      await page.waitForSelector('.nc2-icn[aria-label="System Setup"]', {state: 'attached', timeout: 5000});
      await clickAll(page, '.nc2-icn[aria-label="System Setup"]');
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelectorAll('.nc1-node').forEach(node => node.classList.add('open')));
    }},
    {id: 'customers-empty', label: 'Customer list, search with no result', open: async page => {
      await openSurface(page, 'customers-list');
      await page.locator('input[type=search]:visible').first().fill('zzzzzz');
      await page.waitForTimeout(500);
    }},
    {id: 'customers-compact-expanded', label: 'Customer list, Compact view, every row expanded', open: async page => {
      await openSurface(page, 'customers-list');
      await page.waitForTimeout(500);
      await clickAll(page, '[data-list-view="responsive"]');
      await page.waitForTimeout(500);
      await clickAll(page, '[data-list-row-expand]');
      await page.waitForTimeout(300);
    }},
    {id: 'email-compose', label: 'Email, new message with recipient suggestions', open: async page => {
      await openSurface(page, 'email');
      await page.locator('.email-compose').first().click();
      await page.waitForTimeout(400);
      const input = page.locator('#email-compose-to');
      await input.click();
      await input.fill('a');
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelectorAll('[id$="-suggestions"]').forEach(node => node.classList.remove('hidden')));
    }},
    {id: 'organization-performance', label: 'Organization Center, System performance', open: async page => {
      await page.goto(`${base}/system/organization`);
      await page.waitForSelector('[data-organization-section="performance"]', {state: 'attached', timeout: 8000});
      await page.waitForTimeout(500);
      await clickAll(page, '[data-organization-section="performance"]');
      await page.waitForTimeout(500);
    }},
    {id: 'journal-compact-expanded', label: 'Sales invoice record, Journal Entry dialog, Compact view expanded', open: async page => {
      await openSurface(page, 'record');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const item = [...document.querySelectorAll('button, [role=menuitem], summary')].find(node => node.textContent.trim().startsWith('Display Journal Entry'));
        if (item) item.click();
      });
      await page.waitForTimeout(800);
      await clickAll(page, '#journal-entry-canvas [data-list-view="responsive"], .dlg[data-dlg="journal"] [data-list-view="responsive"]');
      await page.waitForTimeout(500);
      await clickAll(page, '.dlg[data-dlg="journal"] [data-list-row-expand]');
      await page.waitForTimeout(300);
    }},
  ];
}
