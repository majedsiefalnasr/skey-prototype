import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';

test.beforeEach(async ({page, baseURL}) => {
  await boot(page, baseURL);
});

test('Home restores the same topbar actions and releases the inert shell', async ({page}) => {
  await expect(page.locator('.fbody')).toHaveAttribute('inert', '');
  const actions = await page.locator('.lp-actions .right').elementHandle();
  await openSurface(page, 'list');
  await expect(page.locator('.fbody')).not.toHaveAttribute('inert', '');
  expect(await page.locator('.gtop .right').evaluate((node, original) => node === original, actions)).toBe(true);
});

test('reading a notification email preserves unread state and appearance', async ({page}) => {
  await openSurface(page, 'list');
  const unread = Number(await page.locator('#notif-badge').textContent());
  await openSurface(page, 'email');
  await settle(page);
  await expect(page.locator('.email-reading-scroll')).toBeVisible();
  await expect(page.locator('#notif-badge')).toHaveText(String(unread - 1));
  await expect(page.locator('.email-view')).toHaveScreenshot('email-reading.png', {animations: 'disabled', maxDiffPixels: 0});
});

test('email compose retains send feedback', async ({page}, testInfo) => {
  test.skip(testInfo.project.use.viewport.width < 900, 'Known baseline mobile email layout clips the composer.');
  await openSurface(page, 'list');
  await openSurface(page, 'email');
  await settle(page);
  await page.locator('.email-compose').click();
  await page.locator('#email-compose-to').fill('reader@example.com');
  await page.locator('.email-composer-input').fill('Test message');
  await page.locator('.email-send').click();
  await expect(page.getByText('Message sent', {exact: true})).toBeVisible();
  await expect(page.locator('.email-composer-input')).toHaveValue('');
});

test('notification tabs preserve keyboard selection', async ({page}) => {
  await page.locator('button[aria-label="System Alerts"]').click();
  const direct = page.locator('.notif-tabs [data-tab="direct"]');
  await direct.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.notif-tabs [data-tab="email"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('button[aria-label="System Alerts"]')).toBeFocused();
});

test('assistant proposal answers and closes with Escape', async ({page}) => {
  await openSurface(page, 'list');
  await page.locator('.right button.chip').click();
  await expect(page.locator('#aiscrim')).toHaveClass(/open/);
  await page.locator('[data-ai="Summarize this invoice"]').first().click();
  await expect(page.locator('#ai-thread')).toContainText('Sales Invoice 126');
  await page.keyboard.press('Escape');
  await expect(page.locator('#aiscrim')).not.toHaveClass(/open/);
});
