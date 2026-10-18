import {test, expect} from '@playwright/test';
import {boot} from './support/browser.mjs';

test('translated dialog options retain their stored values across language switches', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  const language = async rtl => page.locator('#rtl').evaluate((el, checked) => {
    el.checked = checked;
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }, rtl);
  const values = () => page.locator('option[data-i18n]').evaluateAll(options => options.map(option => ({
    key: `${option.closest('select')?.id}:${option.dataset.i18n}`,
    value: option.value,
  })));
  await language(false);
  const before = await values();
  expect(before.length).toBeGreaterThan(0);
  await language(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  expect(await values()).toEqual(before);
  await language(false);
  expect(await values()).toEqual(before);
});
