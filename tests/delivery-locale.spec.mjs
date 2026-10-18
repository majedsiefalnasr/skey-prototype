import {test, expect} from '@playwright/test';
import {boot, openSurface} from './support/browser.mjs';

test('Arabic invoice Manage menu translates preferences without changing border values', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await openSurface(page, 'list');
  await page.locator('#rtl').evaluate(el => {el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  const menu = page.locator('.list-view .data-page-manage');
  await menu.locator(':scope > summary').click();
  await expect(menu.locator('.data-manage-group-label')).toHaveText(['تبادل البيانات', 'التحليل', 'التقارير', 'تفضيلات الجدول']);
  await expect(menu.locator('[data-list-manage-action="save-layout"] strong')).toHaveText('حفظ تخطيط الجدول');
  const statistics = menu.locator('.data-manage-submenu').filter({has:page.locator('[data-list-manage-statistics-concept]')});
  await expect(statistics.locator(':scope > summary small')).toHaveText('بطاقات متوازنة');
  await expect(statistics.locator('label')).toHaveText(['بطاقات متوازنة','مساحة عمل تشغيلية','مؤشرات أداء تحليلية']);
  expect(await statistics.locator('[data-list-manage-statistics-concept]').evaluateAll(els=>els.map(el=>el.dataset.listManageStatisticsConcept))).toEqual(['balanced','operational','analytical']);
  for (const label of await menu.locator('[data-list-manage-frozen]').locator('..').allTextContents()) expect(label).toMatch(/[\u0600-\u06ff]/);
  const borders = menu.locator('.data-manage-submenu').filter({has:page.locator('[data-list-manage-border]')});
  await borders.locator(':scope > summary').click();
  await expect(borders.locator('label').filter({has:page.locator('[data-list-manage-border="none"]')})).toHaveText('بلا حدود');
  await borders.locator('[data-list-manage-border="none"]').check();
  await expect(page.locator('.list-view .inv-grid')).toHaveClass(/borders-none/);
  await page.locator('#rtl').evaluate(el => {el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('.list-view .inv-grid')).toHaveClass(/borders-none/);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveJSProperty('open', false);
  await menu.locator(':scope > summary').click();
  const restored = menu.locator('[data-list-manage-border="none"]');
  await expect(restored).toBeChecked();
  await expect(restored.locator('..')).toHaveText('None');
});

test('Arabic geography labels retain stable type and status values', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#rtl').evaluate(el => {el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await openSurface(page, 'geo-record');
  await expect(page.locator('label[for="geo-field-name"]')).toHaveText('اسم الموقع');
  await expect(page.locator('#geo-field-type')).toHaveValue('City');
  await expect(page.locator('#geo-field-type option:checked')).toHaveText('المدينة');
  await expect(page.locator('#geo-field-status')).toHaveValue('Inactive');
  await expect(page.locator('#geo-field-status option:checked')).toHaveText('غير نشط');
});

test('Arabic Profile headings and Save controls localize without discarding typed values', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.goto((process.env.PARITY_URL ?? 'http://127.0.0.1:4173')+'/system/profile?section=employee');
  await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('[data-profile-scroll-section="employee"]')).toHaveText('بيانات الموظف');
  await expect(page.locator('#profile-employee-save')).toHaveText('حفظ');
  const phone=page.locator('#profile-employee-work-phone');
  await phone.fill('01234567890');
  await page.locator('#rtl').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(phone).toHaveValue('01234567890');
  await expect(page.locator('#profile-employee-save')).toHaveText('Save');
});

test('Arabic Organization headings and session action dialog are translated', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.goto((process.env.PARITY_URL ?? 'http://127.0.0.1:4173')+'/system/organization?section=application-sessions');
  await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('.organization-view h1')).toHaveText('مركز المؤسسة');
  await expect(page.locator('.organization-nav [data-organization-section="application-sessions"]')).toHaveText('جلسات التطبيق');
  await page.locator('[data-organization-session-action="revoke"]').first().click();
  await expect(page.locator('#organization-session-title')).toHaveText('إلغاء جلسة التطبيق');
  await page.locator('#organization-session-reason').fill('  ');
  await page.locator('#organization-session-confirm').click();
  await expect(page.locator('#organization-session-error')).toHaveText('أدخل سببا تشغيليا قبل المتابعة.');
});

test('Arabic invoice and customer primary record controls are translated', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#rtl').evaluate(el => {el.checked = true; el.dispatchEvent(new Event('change', {bubbles:true}));});
  await openSurface(page, 'record');
  await expect(page.locator('.design.active [data-act="Modify"]:visible').first()).toContainText('تعديل');
  await expect(page.locator('.lockbanner:visible').first()).toContainText('الفاتورة');
  await expect(page.locator('.lockbanner:visible').first()).not.toContainText(/[A-Za-z]{3,}/);
  await expect(page.locator('[data-act="Receipt Voucher"]:visible').first()).toContainText('سند قبض');
  await page.goto((process.env.PARITY_URL ?? 'http://127.0.0.1:4173') + '/customers/list');
  await page.locator('[data-list-open-record]').first().click();
  await expect(page.locator('[data-customer-section="identity"] h2').first()).toHaveText('العميل');
});

test('Arabic mail reading toolbar labels are translated', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#rtl').evaluate(el => {el.checked = true; el.dispatchEvent(new Event('change', {bubbles:true}));});
  await openSurface(page, 'email');
  const toolbar = page.locator('[data-mail-toolbar]');
  await expect(toolbar.locator('[data-mail-action="reply"] .email-action-label')).toHaveText('رد');
  await expect(toolbar.locator('[data-mail-action="forward"] .email-action-label')).toHaveText('إعادة توجيه');
  await expect(toolbar.locator('[data-mail-action="move"] .email-action-label')).toHaveText('نقل إلى');
});

test('invoice posting dialog follows a locale switch when reopened', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  await page.locator('#st').evaluate(el => {
    el.value = 'pending'; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  const openPosting = async () => {
    await page.locator('.statuswrap [data-act="Change status"]:visible').first().click();
    await page.locator('[data-status-action="posted"]:visible').first().click();
  };
  await openPosting();
  const dialog = page.locator('#rscrim .dlg[data-dlg="posting"]');
  await expect(dialog).toBeVisible();
  await dialog.locator('.r-close').first().click();
  await page.locator('#rtl').evaluate(el => {
    el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await openPosting();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.lead:visible')).toHaveText('يسجل الترحيل هذه الفاتورة في الحسابات. بعد ذلك تصبح للقراءة فقط.');
  await expect(dialog.locator('#pf-title')).toContainText('ترحيل');
  await expect(dialog.locator('.dfoot .lbtn.pri')).toHaveText('ترحيل الفاتورة');
});

test('Arabic customer changes save back with Arabic feedback', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#rtl').evaluate(el => {
    el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await openSurface(page, 'customer-record');
  const number = await page.locator('[data-customer-field="customerNo"]').inputValue();
  await page.locator('.phead [data-customer-action="modify"]:visible').first().click();
  await page.locator('[data-customer-field="customerName"]').fill('عميل تجريبي معدل');
  await page.locator('.phead [data-customer-action="save"]:visible').first().click();
  await expect(page.locator('#toasts .toast b').last()).toHaveText('تم حفظ العميل');
  await page.locator('.customer-back').click();
  await expect(page.locator(`[data-list-row-key="${number}"]`).first()).toContainText('عميل تجريبي معدل');
});

test('receipt voucher action clearly stops at the prototype boundary in Arabic', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await openSurface(page, 'list');
  await page.locator('[data-list-open-record="145"]').first().click();
  await page.locator('#rtl').evaluate(el => {
    el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  // The related-document action is available from the record footer.
  await page.locator('[data-act="Receipt Voucher"]:visible').first().click();
  await expect(page.locator('#toasts .toast p').last()).toHaveText('لا ينشئ هذا النموذج مستندا مرتبطا.');
  await expect(page.locator('#toasts .toast b').last()).toContainText('نموذج توضيحي فقط');
});

test('new Arabic payment rows keep stable method values and translated labels', async ({page}) => {
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  await page.locator('#rtl').evaluate(el => {
    el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await page.locator('#rec-tab-payment').click();
  await page.locator('#add-payment-link').click();
  const row = page.locator('#payment-rows [data-payment-row]').last();
  await expect(row.locator('[data-payment-method]')).toHaveValue('Cash');
  await expect(row.locator('label').first()).toContainText('طريقة الدفع');
  await row.locator('[data-payment-method]').selectOption('Bank');
  await expect(row.locator('[data-payment-method]')).toHaveValue('Bank');
  await expect(row.locator('.rec-payment-extra')).toContainText('اسم البنك');
  await expect(row.locator('.rec-payment-extra')).toContainText('رقم الحساب');
});
