import {test, expect} from '@playwright/test';
import {LIST_ROWS, RULES, statusKeyFromLabel} from '../concepts/app/prototype/fixtures/invoices.js';

async function boot(page, info) {
  await page.addInitScript(() => sessionStorage.setItem('skey-proto-state', JSON.stringify({'signed-in': true, launchpad: true, 'simulate-loading': false})));
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  await page.goto('/sales-systems-management/sales-invoices');
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click();
  await page.locator('#rtl').evaluate((el, rtl) => {
    el.checked = rtl; el.dispatchEvent(new Event('change', {bubbles: true}));
  }, Boolean(info.project.use.rtl));
  await expect(page.locator('html')).toHaveAttribute('lang', info.project.use.rtl ? 'ar' : 'en');
  await expect(page.locator('.skeleton-overlay:visible')).toHaveCount(0);
}
async function open(page, no) {
  await page.locator(`[data-list-open-record="${no}"]`).first().click();
  await expect(page.locator('#canvas-root')).toBeVisible();
}
async function identity(page, row) {
  const ar = await page.locator('html').getAttribute('lang') === 'ar';
  await expect(page.locator('.phead .tline h1:visible')).toHaveText(`${ar ? 'فاتورة مبيعات' : 'Sales Invoice'} ${row.no}`);
  await expect(page.locator('#st')).toHaveValue(row.status.toLowerCase());
  const statuses = await page.locator('.stpill:visible').evaluateAll(els => els.map(el => el.dataset.s));
  expect(statuses.length).toBeGreaterThan(0);
  expect(statuses.every(s => s === row.status.toLowerCase())).toBe(true);
  const general = page.locator('#canvas-root .rec-card-hd').first();
  if (await general.getAttribute('aria-expanded') === 'false') await general.click();
  await expect(page.locator('#canvas-root label[data-i18n="Sequence"] + input')).toHaveValue(row.seq);
  await expect(page.locator('#canvas-root label[data-i18n="Doc No."] + input')).toHaveValue(row.no);
}
const back = page => page.locator('.record-back:visible').click();

test('every selected invoice and repeated switching keep identity and status coherent', async ({page}, info) => {
  await boot(page, info);
  for (const row of [...LIST_ROWS, LIST_ROWS.find(r => r.no === '144'), LIST_ROWS[0]]) {
    await open(page, row.no); await identity(page, row);
    await expect(page.locator('#invoice-summary-subtotal')).toHaveText('200.00');
    await expect(page.locator('#invoice-summary-tax')).toHaveText('+ 0.00');
    await back(page);
  }
});

test('saved Draft edits and selected invoice dialog identities preserve existing actions', async ({page}, info) => {
  await boot(page, info);
  const draft = LIST_ROWS.find(r => r.no === '144');
  await open(page, draft.no); await identity(page, draft);
  await expect(page.locator('.stpill:visible .nm').first()).toHaveText(info.project.use.rtl ? 'مسودة' : 'Draft');
  await expect(page.locator('[data-act="Modify"]:visible').first()).toBeEnabled();
  await page.locator('[data-act="Modify"]:visible').first().click();
  await expect(page.locator('#canvas-root label[data-i18n="Doc No."] + input')).toHaveAttribute('readonly', '');
  await expect(page.locator('#canvas-root [data-field]').last()).toBeEnabled();
  await page.locator('[data-act="Undo"]:visible').first().click();
  await back(page);
  await open(page, '143');
  await expect(page.locator('[data-act="Modify"]:visible').first()).toBeDisabled();
  await page.locator('.menu:has([data-act="Posting"]) > button:visible').click();
  await page.locator('[data-act="Posting"]:visible').first().click();
  await expect(page.locator('#pf-title')).toHaveText(info.project.use.rtl ? 'تفاصيل الترحيل · الفاتورة 143' : 'Posting details · invoice 143');
  await page.locator('#rscrim .dlg:not([hidden]) .r-close').first().click();
  await page.locator('.p-open:visible').first().click();
  await expect(page.locator('#pscrim .dhd-subtitle')).toContainText('143');
  await expect(page.locator('#p-subj')).toHaveValue(info.project.use.rtl ? 'فاتورة مبيعات 143 · lastchance' : 'Sales Invoice 143 · lastchance');
  await page.locator('#pscrim .p-close').first().click();
  await page.locator('.dr-open[data-tab="stages"]:visible').click();
  await expect(page.locator('#drawer .drhd .sub')).toContainText('001000352026143');
  await expect(page.locator('#drawer .cur-name')).toHaveText('Posted');
});

test('a status action updates the selected live row and survives switching records', async ({page}, info) => {
  await boot(page, info);
  await open(page, '145');
  await page.locator('.statuswrap [data-act="Change status"]:visible').click();
  await page.locator('[data-status-action="pending"]:visible').click();
  await expect(page.locator('#sf-title')).toHaveText(info.project.use.rtl ? 'تعليق الفاتورة 145' : 'Mark invoice 145 as pending');
  await page.locator('#sf-reason').fill('Waiting for approval');
  await page.locator('#sf-confirm').click();
  await expect(page.locator('#st')).toHaveValue('pending');
  await back(page);
  await expect(page.locator('[data-list-row-key="145"]')).toContainText(info.project.use.rtl ? 'معلق' : 'Pending');
  await open(page, '143'); await identity(page, LIST_ROWS[0]); await back(page);
  await open(page, '145');
  await identity(page, {...LIST_ROWS.find(r => r.no === '145'), status: 'Pending'});
});

test('list Modify never rewrites a locked invoice status', async ({page}, info) => {
  await boot(page, info);
  for (const no of ['143', '148']) {
    await page.locator(`summary[aria-label="Actions for invoice ${no}"]:visible`).click();
    await page.locator('[data-list-row-action="modify"]:visible').click();
    await expect(page.locator('body > .data-menu-popover[data-parked]')).toHaveCount(0);
    await identity(page, LIST_ROWS.find(row => row.no === no));
    await expect(page.locator('#mode')).toHaveValue('record');
    await expect(page.locator('[data-act="Modify"]:visible').first()).toBeDisabled();
    await back(page);
  }
});

const isoDate = text => text.split('/').reverse().join('-');
const headerValue = (page, key) => page.locator(`#canvas-root [data-invoice-field="${key}"]`).evaluate(el =>
  el.tagName === 'SELECT' ? el.selectedOptions[0].textContent : el.value);
const setKit = (page, id, value) => page.locator(`#${id}`).evaluate((el, v) => {
  el.value = v; el.dispatchEvent(new Event('change', {bubbles: true}));
}, value);
const setLocale = async (page, rtl) => {
  await page.locator('#rtl').evaluate((el, value) => {
    el.checked = value; el.dispatchEvent(new Event('change', {bubbles: true}));
  }, rtl);
  await expect(page.locator('html')).toHaveAttribute('lang', rtl ? 'ar' : 'en');
};
const receiptDisabled = row => RULES['Receipt Voucher']({status: statusKeyFromLabel(row.status), pay: row.pay.toLowerCase()}) !== null;

test('cash and credit rows drive payment and receipt rules', async ({page}, info) => {
  await boot(page, info);
  for (const no of ['143', '145']) {
    const row = LIST_ROWS.find(r => r.no === no);
    await open(page, no);
    await expect(page.locator('#pay')).toHaveValue(row.pay.toLowerCase());
    await expect(page.locator('#canvas-root [data-invoice-field="pay"]')).toHaveValue(row.pay.toLowerCase());
    expect(await headerValue(page, 'pay')).toBe(info.project.use.rtl ? (row.pay === 'Cash' ? 'نقدي' : 'آجل') : row.pay);
    const receipt = page.locator('[data-act="Receipt Voucher"]').first();
    if (receiptDisabled(row)) await expect(receipt).toBeDisabled(); else await expect(receipt).toBeEnabled();
    await back(page);
  }
  // 143 is Cash (no receipt voucher), 145 is Credit (receipt voucher available)
  expect(receiptDisabled(LIST_ROWS.find(r => r.no === '143'))).toBe(true);
  expect(receiptDisabled(LIST_ROWS.find(r => r.no === '145'))).toBe(false);
  // the Prototype Controls payment select still overrides after the row has applied its value
  await open(page, '145');
  await setKit(page, 'pay', 'cash');
  expect(await headerValue(page, 'pay')).toBe(info.project.use.rtl ? 'نقدي' : 'Cash');
  await expect(page.locator('[data-act="Receipt Voucher"]').first()).toBeDisabled();
  await back(page);
  await open(page, '145');
  await expect(page.locator('#pay')).toHaveValue('credit');
  await expect(page.locator('[data-act="Receipt Voucher"]').first()).toBeEnabled();
});

test('header fields match the list row', async ({page}, info) => {
  await boot(page, info);
  for (const row of LIST_ROWS) {
    await open(page, row.no);
    await expect(page.locator('#canvas-root [data-invoice-field="date"]')).toHaveValue(isoDate(row.date));
    await expect(page.locator('#canvas-root [data-invoice-field="dueDate"]')).toHaveValue(isoDate(row.dueDate));
    await expect(page.locator('#canvas-root [data-invoice-field="custName"]')).toHaveValue(row.custName);
    expect(await headerValue(page, 'custNo')).toBe(`${row.custNo} - ${row.custName}`);
    await expect(page.locator('#canvas-root [data-invoice-field="pay"]')).toHaveValue(row.pay.toLowerCase());
    expect(await headerValue(page, 'pay')).toBe(info.project.use.rtl ? (row.pay === 'Cash' ? 'نقدي' : 'آجل') : row.pay);
    for (const key of ['currency', 'branch', 'warehouse', 'salesRep', 'priceList']) {
      expect(await headerValue(page, key), `${row.no} ${key}`).toBe(row[key]);
    }
    await back(page);
  }
});

test('header edits survive a dirty toggle on the same record', async ({page}, info) => {
  await boot(page, info);
  await open(page, '144');
  await page.locator('[data-act="Modify"]:visible').first().click();
  await page.locator('#canvas-root [data-invoice-field="custName"]').fill('Edited customer');
  await page.locator('#dirty').evaluate(el => {
    el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await expect(page.locator('#canvas-root [data-invoice-field="custName"]')).toHaveValue('Edited customer');
});

test('disclosure names the shared fields in English and Arabic', async ({page}, info) => {
  await boot(page, info);
  await open(page, '143');
  const note = page.locator('#canvas-root [data-i18n^="Prototype: identity"]');
  await setLocale(page, false);
  for (const word of ['lines', 'payment details', 'other tabs', 'history', 'totals', 'dialog amounts', 'journal']) {
    await expect(note).toContainText(word, {ignoreCase: true});
  }
  await setLocale(page, true);
  for (const word of ['البنود', 'تفاصيل الدفع', 'التبويبات الأخرى', 'السجل', 'الإجماليات', 'مبالغ النوافذ', 'اليومية']) {
    await expect(note).toContainText(word);
  }
  await setLocale(page, Boolean(info.project.use.rtl));
});

test('fresh load shows a list member', async ({page}, info) => {
  await boot(page, info);
  const first = LIST_ROWS[0];
  const number = await page.locator('#canvas-root label[data-i18n="Doc No."] + input').inputValue();
  expect(LIST_ROWS.map(r => r.no)).toContain(number);
  await expect(page.locator('#canvas-root label[data-i18n="Sequence"] + input')).toHaveValue(first.seq);
  await expect(page.locator('#canvas-root [data-invoice-field="custName"]')).toHaveValue(first.custName);
  await expect(page.locator('#pay')).toHaveValue(first.pay.toLowerCase());
  await expect(page.locator('#st')).toHaveValue(first.status.toLowerCase());
  await open(page, first.no);
  await expect(page.locator('.phead .tline h1').first()).toHaveText(`${info.project.use.rtl ? 'فاتورة مبيعات' : 'Sales Invoice'} ${first.no}`);
});
