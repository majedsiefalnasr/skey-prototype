import {test, expect} from '@playwright/test';
import {boot, openSurface} from './support/browser.mjs';

const pageErrors = new WeakMap();
test.beforeEach(async ({page}) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
});

test.afterEach(async ({page}) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('invoice line entry adds once and retains quantity calculations', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  const rows = page.locator('#items-body > tr');
  const count = await rows.count();
  await page.locator('#add-item-link').click();
  await expect(rows).toHaveCount(count + 1);
  await rows.last().locator('.items-qty').fill('3');
  await expect(page.locator('#items-total-qty')).toHaveText(String(count + 3));
  await rows.last().getByRole('button', {name: 'Remove item'}).click();
  await expect(rows).toHaveCount(count);
  await expect(page.locator('#items-total-qty')).toHaveText(String(count));
});

test('invoice payments retain method-specific fields and removal', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  await page.locator('#rec-tab-payment').click();
  await page.locator('#add-payment-link').click();
  const rows = page.locator('#payment-rows [data-payment-row]');
  await expect(rows).toHaveCount(2);
  await rows.last().locator('[data-payment-method]').selectOption('Cheque');
  await expect(rows.last().getByLabel('Cheque No.')).toBeVisible();
  await rows.last().getByRole('button', {name: 'Remove payment method'}).click();
  await expect(rows).toHaveCount(1);
});

test('geography editing excludes descendants as parents and preserves undo', async ({page}) => {
  await openSurface(page, 'geo-record');
  const name = page.locator('#geo-field-name');
  const original = await name.inputValue();
  const code = await page.locator('#geo-field-code').inputValue();
  await page.locator('.geo-record-view [data-geo-record-action="modify"]').last().click();
  await expect(page.locator(`#geo-field-parent option[value="${code}"]`)).toHaveCount(0);
  await name.fill('Temporary location');
  await page.locator('.geo-record-view [data-geo-record-action="undo"]').last().click();
  await expect(name).toHaveValue(original);
  await expect(name).toHaveAttribute('readonly', '');
});

test('geography details uses the shared record header and field structure', async ({page}) => {
  await openSurface(page, 'geo-record');

  const header = page.locator('#geo-record-chrome .phead');
  await expect(header).toHaveCSS('display', 'flex');
  await expect(header).toHaveCSS('gap', '20px');
  await expect(header.locator('.tline')).toHaveCSS('flex-wrap', 'wrap');
  await expect(header.locator('.recacts')).toHaveCSS('display', 'flex');

  const details = page.locator('.geo-detail-card');
  await expect(details).toHaveCSS('overflow', 'hidden');
  await expect(details.locator('label[for="geo-field-code"]')).toHaveText('Location Code');
  await expect(details.locator('label[for="geo-field-parent"]')).toHaveText('Parent Location');
  await expect(details.locator('label[for="geo-field-remarks"]')).toHaveText('Remarks');

  const typeSelect = details.locator('#geo-field-type');
  const selectMetrics = await typeSelect.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      appearance: style.appearance,
      backgroundImage: style.backgroundImage,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
    };
  });
  expect(selectMetrics.appearance).toBe('none');
  expect(selectMetrics.backgroundImage).not.toBe('none');
  expect(selectMetrics.paddingRight).toBe('28px');

  const parentSelect = details.locator('#geo-field-parent');
  await expect(parentSelect).toHaveCSS('border-start-end-radius', '0px');
  await expect(parentSelect).toHaveCSS('border-end-end-radius', '0px');
});

test('geography detail fields match shared spacing and input-style modes', async ({page}) => {
  await openSurface(page, 'geo-record');

  const geographyForm = page.locator('.geo-form');
  const geographyField = page.locator('#geo-field-name').locator('..');
  const geographyInput = page.locator('#geo-field-name');
  const geographyLabel = page.locator('label[for="geo-field-name"]');
  const setInputStyle = inputStyle =>
    page.locator('#input-style').evaluate((control, selectedStyle) => {
      control.value = selectedStyle;
      control.dispatchEvent(new Event('change', {bubbles: true}));
    }, inputStyle);

  await expect(geographyForm).toHaveCSS('column-gap', '16px');
  await expect(geographyForm).toHaveCSS('row-gap', '10px');
  await expect(geographyForm).toHaveCSS('padding', '12px');
  await expect(geographyInput).toHaveCSS('padding', '6px 8px');

  await setInputStyle('floated');
  await expect(geographyField).toHaveCSS('position', 'relative');
  await expect(geographyField).toHaveCSS('padding-top', '14px');
  await expect(geographyLabel).toHaveCSS('position', 'absolute');
  await expect(geographyInput).toHaveCSS('padding-top', '8px');

  await setInputStyle('inline');
  await expect(geographyField).toHaveCSS('display', 'grid');
  await expect(geographyField).toHaveCSS('grid-template-columns', /130px/);
  await expect(geographyInput).toHaveCSS('border-top-width', '0px');
  await expect(geographyInput).toHaveCSS('border-bottom-width', '1px');
  await expect(geographyInput).toHaveCSS('border-radius', '0px');
  await expect(geographyInput).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await setInputStyle('default');
  await expect(geographyField).toHaveCSS('display', 'block');
  await expect(geographyInput).toHaveCSS('border-top-width', '1px');
  await expect(geographyInput).toHaveCSS('border-radius', '6px');
});


test('geography record status toggle activates with the stored reason and deactivates with a new one', async ({page}) => {
  // openSurface('geo-record') lands on the geo list's first row, which
  // sorts to AIN — the fixture's only inactive location, seeded with its
  // own statusReason (prototype/fixtures/geography.js) — so this starts
  // from Inactive and activates first, rather than assuming an active row.
  await openSurface(page, 'geo-record');

  await expect(page.locator('.geo-record-view .badge.danger')).toHaveText('Inactive');

  await page.locator('.geo-record-view [aria-label="More actions"]').last().click();
  const activateItem = page.locator('.geo-record-view [data-geo-record-action="change-status"]');
  await expect(activateItem).not.toHaveClass(/dan/);
  await activateItem.click();

  await expect(page.locator('#geo-status-scrim')).toHaveClass(/open/);
  await expect(page.locator('#geo-status-scrim .dlg')).toHaveAttribute('data-tone', 'default');
  await expect(page.locator('#geo-status-reason')).toBeHidden();
  await expect(page.locator('#geo-status-reason-text')).toHaveText('Seasonal territory closed for the off-season.');
  await page.locator('#geo-status-confirm').click();
  await expect(page.locator('.toast').last()).toContainText('activated');
  await expect(page.locator('.geo-record-view .badge.danger')).toHaveCount(0);

  await page.locator('.geo-record-view [aria-label="More actions"]').last().click();
  const deactivateItem = page.locator('.geo-record-view [data-geo-record-action="change-status"]');
  await expect(deactivateItem).toHaveClass(/dan/);
  await deactivateItem.click();

  await expect(page.locator('#geo-status-scrim')).toHaveClass(/open/);
  await expect(page.locator('#geo-status-scrim .dlg')).toHaveAttribute('data-tone', 'danger');
  await page.locator('#geo-status-reason').fill('Territory closed for maintenance.');
  await page.locator('#geo-status-confirm').click();
  await expect(page.locator('.toast').last()).toContainText('deactivated');
  await expect(page.locator('.geo-record-view .badge.danger')).toHaveText('Inactive');
});

test('invoice charges and discounts preserve the fixture summary', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  await page.locator('#invoice-discount-value').fill('10');
  await expect(page.locator('#invoice-summary-net')).toHaveText('180.00 EGP');
  await page.locator('[data-invoice-adjustment]').first().click();
  await page.locator('[data-adjustment-value]').fill('25');
  await expect(page.locator('#invoice-summary-net')).toHaveText('205.00 EGP');
  await page.getByRole('button', {name: 'Remove charge', exact: true}).click();
  await expect(page.locator('#invoice-summary-net')).toHaveText('180.00 EGP');
});

test('invoice keyboard line entry registers once after returning from the list', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('.record-back').first().click();
  await page.locator('[data-list-open-record]').first().click();
  await page.locator('#mode').selectOption('create', {force: true});
  const rows = page.locator('#items-body > tr');
  const count = await rows.count();
  await rows.last().getByRole('textbox', {name: 'Item', exact: true}).press('Enter');
  await expect(rows).toHaveCount(count + 1);
  await expect(rows.last().getByRole('textbox', {name: 'Item', exact: true})).toBeFocused();
});

test('invoice print settings and activity drawer retain their document context', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('.content').getByRole('button', {name: 'Print', exact: true}).click();
  await expect(page.locator('#pscrim')).toHaveClass(/open/);
  await expect(page.locator('#pscrim .dhd-subtitle')).toContainText('Sales Invoice');
  const printGroups = page.locator('#pscrim .print-group');
  await expect(printGroups).toHaveCount(4);
  await expect(page.locator('#pscrim fieldset')).toHaveCount(0);
  await expect(printGroups.nth(0).getByRole('heading')).toHaveText('Destination');
  await expect(printGroups.nth(1).getByRole('heading')).toHaveText('Document');
  await expect(printGroups.nth(1)).toHaveCSS('border-top-style', 'solid');
  await page.locator('#pscrim').getByRole('button', {name: 'Close', exact: true}).click();
  await page.locator('.dr-open[data-tab="stages"]').first().click();
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await expect(page.locator('.drtab[data-tab="stages"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#drawer .dr-close').click();
});

test('invoice print settings groups reflow at narrow widths', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openSurface(page, 'record');
  await page.locator('.content').getByRole('button', {name: 'Print', exact: true}).click();

  const columnCount = locator =>
    locator.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  await expect.poll(() => columnCount(page.locator('#pscrim .dgrid'))).toBe(1);
  await expect.poll(() => columnCount(page.locator('#pscrim .fgrid').first())).toBe(1);
});

for (const dialog of [
  {
    name: 'screen parameters',
    menu: 'More',
    action: 'Screen Parameters',
    header: '#screen-parameters-scrim thead th',
  },
  {
    name: 'journal entry',
    menu: 'Transactions',
    action: 'Display Journal Entry',
    header: '#rscrim [data-dlg="journal"] thead th',
  },
]) {
  test(`${dialog.name} table header paints opaquely above scrolling content`, async ({page}) => {
    await openSurface(page, 'record');
    await page.getByRole('button', {name: dialog.menu, exact: true}).click();
    await page.locator(`[data-act="${dialog.action}"]:visible`).click();

    const style = await page.locator(dialog.header).first().evaluate(element => {
      const computed = getComputedStyle(element);
      const surfaceProbe = document.createElement('span');
      surfaceProbe.style.backgroundColor = 'var(--surface)';
      document.body.append(surfaceProbe);
      const surfaceColor = getComputedStyle(surfaceProbe).backgroundColor;
      surfaceProbe.remove();
      return {
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage,
        position: computed.position,
        surfaceColor,
        zIndex: Number(computed.zIndex),
      };
    });

    expect(style.position).toBe('sticky');
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(style.backgroundColor).toBe(style.surfaceColor);
    expect(style.zIndex).toBeGreaterThan(2);
  });
}

test('invoice modify and undo preserve the operation lifecycle', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#st').selectOption('open', {force: true});
  await page.locator('.design.active [data-act="Modify"]').click();
  await expect(page.locator('#mode')).toHaveValue('edit');
  await page.locator('.design.active .phead [data-act="Undo"]').click();
  await expect(page.locator('#mode')).toHaveValue('record');
});

test('geography hierarchy switches to flow and opens its compact dialog', async ({page}) => {
  await openSurface(page, 'geo-record');
  if (!(await page.locator('[data-geo-view="flow"]').isVisible())) {
    await page.locator('[data-geo-tree-collapse]').click();
    await expect(page.locator('#geo-hierarchy-scrim')).toHaveClass(/open/);
  }
  await page.locator('[data-geo-view="flow"]').click();
  await expect(page.locator('#geo-flow-pane')).toBeVisible();
  await expect(page.locator('#geo-flow-canvas [data-geo-node]')).not.toHaveCount(0);
  if (!(await page.locator('#geo-hierarchy-scrim').evaluate(element => element.classList.contains('open')))) {
    await page.setViewportSize({width: 900, height: 800});
    await page.locator('[data-geo-tree-collapse]').click();
    await expect(page.locator('#geo-hierarchy-scrim')).toHaveClass(/open/);
  }
  await page.locator('.geo-hierarchy-dialog-close').click();
  await expect(page.locator('#geo-hierarchy-scrim')).not.toHaveClass(/open/);
});
