import {test, expect} from '@playwright/test';
import {readChart, chartURL} from '../scripts/cache-chart.mjs';
import {serve} from '../scripts/serve.mjs';
import {openSurface, settle, FIXTURE_TIME_EPOCH_MS} from './support/browser.mjs';

// Real, integrity-checked ApexCharts bytes; no spy or replacement renderer.
// Compare directly with the immutable Git baseline so no new golden can mask drift.
test('real chart matches baseline through theme changes and cleans up on navigation', async ({page, context}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Real chart comparison runs once at desktop size.');
  const body = await readChart();
  const baselineServer = await serve({root: '.baseline', port: 0});
  const baseline = await context.newPage();
  const errors = [];
  const load = async (target, url) => {
    target.on('pageerror', error => errors.push(error.message));
    await target.clock.install({time: FIXTURE_TIME_EPOCH_MS});
    await target.route(chartURL, route => route.fulfill({
      body, contentType: 'application/javascript',
      headers: {'access-control-allow-origin': '*'},
    }));
    await target.goto(`${url}/concepts/app-shell.html`);
    await target.clock.resume();
    await target.locator('#simulate-loading').uncheck();
    await openSurface(target, 'list');
    await target.locator('[data-list-action="chart"]').first().click();
    await expect(target.locator('.apexcharts-svg')).toBeVisible();
    await settle(target);
  };
  try {
    await load(baseline, `http://127.0.0.1:${baselineServer.address().port}`);
    await load(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    for (const theme of ['light', 'dark']) {
      for (const target of [baseline, page]) {
        await target.locator('#theme').evaluate((control, value) => {
          control.value = value;
          control.dispatchEvent(new Event('change', {bubbles: true}));
        }, theme);
        await expect(target.locator('.apexcharts-svg')).toHaveCount(1);
        await expect.poll(() => target.evaluate(() =>
          window.Apex?._chartInstances?.filter(item => !item.chart.w.globals.isDestroyed)
            .every(item => item.chart.w.globals.animationEnded)
        )).toBe(true);
        await settle(target);
      }
      const expected = await baseline.locator('.data-list-chart-canvas').screenshot({animations: 'disabled'});
      const actual = await page.locator('.data-list-chart-canvas').screenshot({animations: 'disabled'});
      await testInfo.attach(`${theme}-baseline`, {body: expected, contentType: 'image/png'});
      await testInfo.attach(`${theme}-candidate`, {body: actual, contentType: 'image/png'});
      expect(actual.equals(expected), `${theme} real chart pixels differ`).toBe(true);
    }
    await page.locator('[data-list-open-record]').first().click();
    await expect(page.locator('.apexcharts-svg')).toHaveCount(0);
    await page.locator('.record-back').first().click();
    await expect(page.locator('.apexcharts-svg')).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally {
    await baseline.close();
    await new Promise((resolve, reject) => baselineServer.close(error => error ? reject(error) : resolve()));
  }
});
