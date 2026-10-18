import {test, expect} from '@playwright/test';
import {STATUSES} from '../concepts/app/prototype/fixtures/invoices.js';

// Invoice journey regressions, one describe block per requirement.
// Later tasks append further requirement blocks (for example leave-guard cases).

// Spec 3.2 lifecycle, written out independently of the implementation.
const LIFECYCLE = {
  draft: ['open', 'canceled'],
  open: ['pending', 'canceled'],
  pending: ['open', 'posted'],
  posted: ['pending', 'returned', 'canceled'],
  returned: [],
  canceled: [],
  inactive: [],
};
const KEYS = Object.keys(LIFECYCLE);
const label = key => STATUSES[key].label;
const arabicStatus = {draft: 'مسودة', open: 'مفتوح', pending: 'معلق', posted: 'مرحل', returned: 'مرتجع', canceled: 'ملغى', inactive: 'موقوف'};
const displayLabel = (key, info) => info.project.use.rtl ? arabicStatus[key] : label(key);

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
const back = page => page.locator('.record-back:visible').click();
// Prototype Controls kit: change the invoice status select the way a reviewer would.
const setKitStatus = (page, key) => page.locator('#st').evaluate((el, value) => {
  el.value = value; el.dispatchEvent(new Event('change', {bubbles: true}));
}, key);
const collectPageErrors = page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
};
const headerBadge = page => page.locator('.stpill:visible .nm').first();

test.describe('INV-02 every status value round-trips list and record', () => {
  test('status table is the spec lifecycle and every key has one label', async () => {
    const {INVOICE_TRANSITIONS, statusKeyFromLabel} = await import('../concepts/app/prototype/fixtures/invoices.js');
    expect(INVOICE_TRANSITIONS).toEqual(LIFECYCLE);
    for (const key of KEYS) expect(statusKeyFromLabel(label(key))).toBe(key);
    expect(statusKeyFromLabel('Deactivated')).toBe('inactive');
    expect(statusKeyFromLabel('deactivated')).toBeNull();
    expect(statusKeyFromLabel('')).toBeNull();
    expect(statusKeyFromLabel(undefined)).toBeNull();
  });

  for (const key of KEYS) {
    test(`every #st value round-trips through list and record: ${key}`, async ({page}, info) => {
      const errors = collectPageErrors(page);
      await boot(page, info);
      await open(page, '145');
      await setKitStatus(page, key);
      await expect(headerBadge(page)).toHaveText(displayLabel(key, info));
      await back(page);
      const row = page.locator('[data-list-row-key="145"]').first();
      await expect(row.locator('.badge.invoice-status:visible').first()).toHaveText(displayLabel(key, info));
      await open(page, '145');
      await expect(page.locator('#st')).toHaveValue(key);
      await expect(headerBadge(page)).toHaveText(displayLabel(key, info));
      const pills = await page.locator('.stpill:visible').evaluateAll(els => els.map(el => el.dataset.s));
      expect(pills.length).toBeGreaterThan(0);
      expect(pills.every(s => s === key)).toBe(true);
      await back(page);
      await expect(row.locator('.badge.invoice-status:visible').first()).toHaveText(displayLabel(key, info));
      expect(errors).toEqual([]);
    });
  }

  test('a reopened Deactivated record is locked and can still be switched to another row', async ({page}, info) => {
    const errors = collectPageErrors(page);
    await boot(page, info);
    await open(page, '145');
    await setKitStatus(page, 'inactive');
    await back(page);
    await open(page, '145');
    await expect(page.locator('[data-act="Modify"]:visible').first()).toBeDisabled();
    await expect(page.locator('.statuswrap [data-act="Change status"]:visible').first()).toBeDisabled();
    await back(page);
    await open(page, '143');
    await expect(headerBadge(page)).toHaveText(displayLabel('posted', info));
    expect(errors).toEqual([]);
  });
});

test.describe('INV-05 list row menu follows the one status table', () => {
  const rowMenuTargets = async (page, no) => {
    await page.locator(`summary[aria-label="Actions for invoice ${no}"]:visible`).click();
    const submenu = page.locator('.data-manage-submenu >> visible=true >> summary');
    if (!(await submenu.count())) return [];
    await submenu.first().click();
    return page.locator('[data-list-row-action="change-status"][data-status-target]:visible').evaluateAll(els => els.map(el => el.dataset.statusTarget));
  };

  for (const key of KEYS) {
    test(`row menu offers exactly the lifecycle targets: ${key}`, async ({page}, info) => {
      await boot(page, info);
      await open(page, '145');
      await setKitStatus(page, key);
      await back(page);
      expect(await rowMenuTargets(page, '145')).toEqual(LIFECYCLE[key].map(label));
    });
  }

  test('Posted and Canceled row targets open the record action that collects their fields', async ({page}, info) => {
    await boot(page, info);
    for (const [target, dialogTitle] of [['Posted', '#pf-title'], ['Canceled', '#cf-title']]) {
      const key = target === 'Posted' ? 'pending' : 'open';
      await open(page, '145');
      await setKitStatus(page, key);
      await back(page);
      await page.locator('summary[aria-label="Actions for invoice 145"]:visible').click();
      await page.locator('.data-manage-submenu >> visible=true >> summary').first().click();
      await page.locator(`[data-list-row-action="change-status"][data-status-target="${target}"]:visible`).click();
      await expect(page.locator('#canvas-root')).toBeVisible();
      await expect(page.locator('#rscrim.open')).toBeVisible();
      await expect(page.locator(dialogTitle)).toContainText('145');
      await page.locator('#rscrim .dlg:not([hidden]) .r-close').first().click();
      await back(page);
    }
  });

  test('Open and Pending row targets still use the list status dialog', async ({page}, info) => {
    await boot(page, info);
    await page.locator('summary[aria-label="Actions for invoice 145"]:visible').click();
    await page.locator('.data-manage-submenu >> visible=true >> summary').first().click();
    await page.locator('[data-list-row-action="change-status"][data-status-target="Pending"]:visible').click();
    await expect(page.locator('#invoice-status-title')).toHaveText(info.project.use.rtl ? 'تعليق الفاتورة 145' : 'Mark invoice 145 as pending');
    await page.locator('#invoice-status-reason').fill('Waiting for approval');
    await page.locator('#invoice-status-confirm').click();
    await expect(page.locator('[data-list-row-key="145"]').first().locator('.badge.invoice-status:visible').first()).toHaveText(displayLabel('pending', info));
  });
});

test.describe('INV-05 kanban documents the Deactivated exclusion', () => {
  test('board has a column for every status except Deactivated and says so', async ({page}, info) => {
    await boot(page, info);
    await open(page, '145');
    await setKitStatus(page, 'inactive');
    await back(page);
    // The Kanban view option is deliberately hidden in the view menu, so activate it directly.
    await page.locator('[data-list-view="kanban"]').evaluate(el => el.click());
    const board = page.locator('.data-kanban-board');
    await expect(board).toBeVisible();
    const columns = await board.locator('[data-kanban-column]').evaluateAll(els => els.map(el => el.dataset.kanbanColumn));
    expect(columns).toEqual(KEYS.filter(key => key !== 'inactive').map(label));
    await expect(board.locator('[data-kanban-status="Deactivated"]')).toHaveCount(0);
    await expect(page.locator('.data-kanban-note')).toHaveText(info.project.use.rtl
      ? 'الفواتير الموقوفة لا تظهر على اللوحة.' : 'Deactivated invoices are not shown on the board.');
  });
});

test.describe('SHL-04 typing in an invoice field arms the unsaved-changes state', () => {
  const openRow = async (page, info, status) => {
    await boot(page, info);
    const row = page
      .locator('[data-list-row-key]')
      .filter({has: page.locator('.badge.invoice-status:visible', {hasText: new RegExp(`^${info.project.use.rtl ? arabicStatus[Object.keys(STATUSES).find(key => label(key) === status)] : status}$`)})})
      .first();
    await row.locator('[data-list-open-record]').first().click();
    await expect(page.locator('#canvas-root')).toBeVisible();
  };
  // Save is disabled with "Nothing changed yet" until the invoice has unsaved edits, so it is the visible indicator.
  const saveButton = page => page.locator('[data-act="Save"]:visible').first();
  const statement = page => page.locator('#rec-panel-other textarea[data-field]:visible').first();
  const openStatement = async page => {
    await page.locator('#rec-tab-other:visible').first().click();
    await expect(statement(page)).toBeVisible();
  };

  test('opening a row and entering Modify do not mark the invoice dirty', async ({page}, info) => {
    await openRow(page, info, 'Open');
    await expect(page.locator('#dirty')).not.toBeChecked();
    await page.locator('[data-act="Modify"]:visible').first().click();
    await expect(saveButton(page)).toBeDisabled();
    await expect(page.locator('#dirty')).not.toBeChecked();
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
  });

  test('typing in an editable field marks the invoice dirty', async ({page}, info) => {
    await openRow(page, info, 'Open');
    await page.locator('[data-act="Modify"]:visible').first().click();
    await openStatement(page);
    await expect(page.locator('#dirty')).not.toBeChecked();
    await statement(page).fill('Typed by a user');
    await expect(page.locator('#dirty')).toBeChecked();
    await expect(saveButton(page)).toBeEnabled();
    // Undo discards the edits and clears the unsaved state.
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
    await page.locator('[data-act="Modify"]:visible').first().click();
    await expect(saveButton(page)).toBeDisabled();
  });

  test('a header select edit also marks the invoice dirty', async ({page}, info) => {
    await openRow(page, info, 'Open');
    await page.locator('[data-act="Modify"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
    const general = page.locator('#canvas-root .rec-card-hd[data-i18n="General"]').first();
    if ((await general.getAttribute('aria-expanded')) === 'false') await general.click();
    const pay = page.locator('select[data-invoice-field="pay"]:visible').first();
    await pay.selectOption({index: (await pay.evaluate(el => el.selectedIndex)) === 0 ? 1 : 0});
    await expect(page.locator('#dirty')).toBeChecked();
    await expect(saveButton(page)).toBeEnabled();
  });
});

test.describe('SHL-04 structural line edits arm the unsaved-changes state', () => {
  const modify = async (page, info) => {
    await boot(page, info);
    await open(page, '145'); // Open status: editable
    await page.locator('[data-act="Modify"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
  };
  const saveButton = page => page.locator('[data-act="Save"]:visible').first();

  test('adding an item row marks dirty', async ({page}, info) => {
    await modify(page, info);
    const rows = page.locator('#items-body tr');
    const before = await rows.count();
    await page.locator('#add-item-link').click();
    await expect(rows).toHaveCount(before + 1);
    await expect(page.locator('#dirty')).toBeChecked();
    await expect(saveButton(page)).toBeEnabled();
  });

  test('removing a payment row marks dirty', async ({page}, info) => {
    await modify(page, info);
    await page.locator('#rec-tab-payment:visible').first().click();
    const rows = page.locator('#payment-rows [data-payment-row]');
    const before = await rows.count();
    expect(before).toBeGreaterThan(0);
    await rows.first().locator('.rec-remove-payment').click();
    await expect(rows).toHaveCount(before - 1);
    await expect(page.locator('#dirty')).toBeChecked();
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(rows).toHaveCount(before);
  });

  test('pasting cells marks dirty', async ({page}, info) => {
    await modify(page, info);
    const first = page.locator('#items-body tr').first().locator('.items-code');
    await first.focus();
    // The grid's own paste handler: tab-separated columns and newline-separated rows.
    await first.evaluate(el => {
      const data = new DataTransfer();
      data.setData('text/plain', 'Item A\tPC\nItem B\tBox');
      el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: data, bubbles: true, cancelable: true}));
    });
    await expect(first).toHaveValue('Item A');
    await expect(page.locator('#items-body tr')).toHaveCount(2);
    await expect(page.locator('#dirty')).toBeChecked();
  });

  test('duplicating a row and removing an item or a charge mark dirty', async ({page}, info) => {
    await modify(page, info);
    const first = page.locator('#items-body tr').first().locator('.items-code');
    await first.focus();
    await page.keyboard.press('ControlOrMeta+d');
    await expect(page.locator('#items-body tr')).toHaveCount(2);
    await expect(page.locator('#dirty')).toBeChecked();
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
    await expect(page.locator('#items-body tr')).toHaveCount(1);
    await page.locator('[data-act="Modify"]:visible').first().click();
    await page.locator('#items-body .rec-remove-item').first().click();
    await expect(page.locator('#dirty')).toBeChecked();
    await page.locator('[data-act="Undo"]:visible').first().click();
    await page.locator('[data-act="Modify"]:visible').first().click();
    await expect(page.locator('#dirty')).not.toBeChecked();
    await page.locator('[data-invoice-adjustment]:visible').first().click();
    await expect(page.locator('#dirty')).toBeChecked();
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(page.locator('#invoice-adjustment-list [data-adjustment-kind]')).toHaveCount(0);
  });

  test('structural edits in the read-only record do not mark dirty', async ({page}, info) => {
    await boot(page, info);
    await open(page, '145');
    await expect(page.locator('#dirty')).not.toBeChecked();
    // Reachable without Modify: the grid is rendered but locked; nothing may arm the guard.
    await page.locator('#items-body .rec-remove-item').first().click({force: true});
    await expect(page.locator('#dirty')).not.toBeChecked();
  });
});

test.describe('INV-07 Create starts from the template payment type', () => {
  test('opening a Cash row then pressing New shows the template default', async ({page}, info) => {
    await boot(page, info);
    await open(page, '143');
    await expect(page.locator('#pay')).toHaveValue('cash');
    await expect(page.locator('select[data-invoice-field="pay"]').first()).toHaveValue('cash');
    await page.locator('.menu:has([data-act="New"]) > button[data-act="More"]:visible').first().click();
    await page.locator('[data-act="New"]:visible').first().click();
    await expect(page.locator('#mode')).toHaveValue('create');
    await expect(page.locator('#pay')).toHaveValue('credit');
    await expect(page.locator('select[data-invoice-field="pay"]').first()).toHaveValue('credit');
  });
});

test.describe('INV-11 the record pager shows the real position among list rows', () => {
  const pos = page => page.locator('.page-footer [data-page-footer="record"] .pos:visible').first();
  const pager = page => page.locator('.page-footer [data-page-footer="record"] .pager:visible').first();

  test('opening row 142 shows its position out of the 8 list rows', async ({page}, info) => {
    await boot(page, info);
    await open(page, '142');
    await expect(pager(page).locator('.pg-i')).toHaveValue('2');
    await expect(pager(page).locator('.pg-i')).toHaveAttribute('max', '8');
    await expect(pager(page).locator('.tot')).toContainText('8');
    await expect(pager(page).locator('.tot')).not.toContainText('125');
    await expect(pos(page)).toContainText('2');
    await expect(pos(page)).toContainText('8');
    await expect(pos(page)).not.toContainText('125');
  });

  test('the arrows stop at the first and last of the 8 rows', async ({page}, info) => {
    await boot(page, info);
    await open(page, '143');
    await expect(pager(page).locator('.pg-p')).toBeDisabled();
    await pager(page).locator('.pg-l').click();
    await expect(pager(page).locator('.pg-i')).toHaveValue('8');
    await expect(page.locator('#canvas-root label[data-i18n="Doc No."] + input')).toHaveValue('148');
    await expect(pager(page).locator('.pg-n')).toBeDisabled();
    await expect(pos(page)).not.toContainText('125');
  });
});


test.describe('INV-03/04 in-memory invoice persistence', () => {
  async function create(page) {
    await page.locator('#mode').selectOption('create', {force: true});
    await page.locator('#items-body .items-code').first().fill('Demo item');
    await page.locator('#items-body .items-qty').first().fill('1');
    await page.locator('[data-act="Save"]:visible').first().click();
    await expect(page.locator('#mode')).toHaveValue('record');
  }
  test('create then save adds 149 to the list and reopens', async ({page}, info) => {
    await boot(page, info); await open(page, '145'); await create(page);
    await expect(page.locator('.design.active .tline h1')).toContainText('149');
    await back(page);
    await expect(page.locator('[data-list-row-key="149"]').first()).toContainText('149');
    await open(page, '149');
    await expect(headerBadge(page)).toHaveText(info.project.use.rtl ? 'مفتوح' : 'Open');
  });
  test('two creates then record delete keeps the first created invoice', async ({page}, info) => {
    await boot(page, info); await open(page, '145'); await create(page); await create(page);
    await expect(page.locator('.design.active .tline h1')).toContainText('150');
    await page.locator('.menu:has([data-act="Delete"]) > button[data-act="More"]:visible').first().click();
    await page.locator('[data-act="Delete"]:visible').first().click();
    await page.locator('#del-go').click();
    await expect(page.locator('#rscrim')).not.toHaveClass(/open/);
    if (await page.locator('.record-back:visible').count()) await back(page);
    await expect(page.locator('[data-list-row-key="150"]')).toHaveCount(0);
    await expect(page.locator('[data-list-row-key="149"]').first()).toBeVisible();
    await open(page, '149');
    await create(page);
    await expect(page.locator('.design.active .tline h1')).toContainText('151');
  });
  test('posted row cannot be deleted from the list', async ({page}, info) => {
    await boot(page, info);
    const row = page.locator('[data-list-row-key="143"]').first();
    await row.locator('details.data-row-menu > summary').click();
    await expect(page.locator('[data-list-row-action="delete"]:visible')).toBeDisabled();
  });
  test('a created invoice copies the displayed net amount into its list row', async ({page}, info) => {
    await boot(page, info); await open(page, '145');
    await page.locator('#mode').selectOption('create', {force: true});
    await page.locator('#items-body .items-code').first().fill('Demo item');
    await page.locator('[data-invoice-adjustment]:visible').first().click();
    await page.locator('#invoice-adjustment-list [data-adjustment-value]').first().fill('10');
    await expect(page.locator('#invoice-summary-net')).toHaveText('210.00 EGP');
    await page.locator('[data-act="Save"]:visible').first().click();
    await expect(page.locator('#mode')).toHaveValue('record');
    await back(page);
    await expect(page.locator('[data-list-row-key="149"]').first()).toContainText('210.00');
  });
  test('saved header edits reopen and Undo restores saved dates and payment type', async ({page}, info) => {
    await boot(page, info); await open(page, '145');
    const date = page.locator('#canvas-root [data-invoice-field="date"]');
    const pay = page.locator('#canvas-root [data-invoice-field="pay"]');
    await page.locator('[data-act="Modify"]:visible').first().click();
    const general = page.locator('#canvas-root .rec-card-hd').first();
    if (await general.getAttribute('aria-expanded') === 'false') await general.click();
    await date.fill('2026-08-20');
    await page.locator('#items-body .items-code').first().fill('Demo item');
    await page.locator('[data-act="Save"]:visible').first().click();
    await expect(page.locator('#mode')).toHaveValue('record');
    await back(page); await open(page, '145');
    await expect(date).toHaveValue('2026-08-20');
    await page.locator('[data-act="Modify"]:visible').first().click();
    await date.fill('2026-08-21'); await pay.selectOption('cash');
    await page.locator('[data-act="Undo"]:visible').first().click();
    await expect(date).toHaveValue('2026-08-20');
    await expect(pay).toHaveValue('credit');
  });
});
