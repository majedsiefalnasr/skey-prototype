import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../docs/superpowers/plans/2026-10-16-visual-capture-manifest.json', import.meta.url)));

async function go(page, info, route = '/help-screens/email') {
  await page.clock.setFixedTime(new Date('2026-10-13T10:24:00.000Z'));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('skey-proto-state')) {
      sessionStorage.setItem('skey-proto-state', JSON.stringify({'signed-in': true, launchpad: true, 'simulate-loading': false}));
    }
  });
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  await page.goto(route);
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click();
  await page.locator('#rtl').evaluate((el, rtl) => {
    el.checked = rtl;
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }, Boolean(info.project.use.rtl));
  await expect(page.locator('html')).toHaveAttribute('lang', info.project.use.rtl ? 'ar' : 'en');
  await expect(page.locator('#kit')).toBeHidden();
  await expect(page.locator('.skeleton-overlay:visible')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

// Checks real intersection with the reading scrollport and visual viewport,
// including the hit target. DOM presence alone cannot prove readability.
async function inside(locator, container) {
  const bounds = await container.boundingBox();
  const result = await locator.evaluate((el, bounds) => {
    const r = el.getBoundingClientRect(), v = visualViewport;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {fits: r.width > 0 && r.height > 0 && r.left >= bounds.x - 1 && r.right <= bounds.x + bounds.width + 1 && r.top >= bounds.y - 1 && r.bottom <= bounds.y + bounds.height + 1 && r.top >= v.offsetTop && r.bottom <= v.offsetTop + v.height,
      hit: hit === el || el.contains(hit)};
  }, bounds);
  expect(result).toEqual({fits: true, hit: true});
}

test('VQA-01: opening Mail gives body and attachment visible reading space', async ({page}, info) => {
  await go(page, info);
  await page.locator('.email-list-row[data-id="e1"]').click();
  const reader = page.locator('.email-reading-scroll');
  await expect(page.locator('.email-reading-subject')).toHaveText('Payment scheduled for Sales Invoice 126');
  const toolbar = page.locator('[data-mail-toolbar]');
  if (info.project.use.isMobile) {
    expect((await toolbar.boundingBox()).height).toBeLessThanOrEqual(64);
    expect((await reader.boundingBox()).height).toBeGreaterThanOrEqual(440);
    await expect(page.locator('#email-quick-reply')).toBeHidden();
    await inside(page.locator('.email-attach').first(), reader);
    await inside(page.locator('.email-reading-who > span').first(), reader);
    await inside(page.locator('.email-reading-time').first(), reader);
    await inside(page.locator('.email-reading-body p').first(), reader);
    const payment = await page.locator('.email-reading-body p').nth(1).boundingBox();
    const scrollport = await reader.boundingBox();
    expect(Math.min(payment.y + payment.height, scrollport.y + scrollport.height) - Math.max(payment.y, scrollport.y), 'payment paragraph has visible lines on opening').toBeGreaterThanOrEqual(40);
  } else {
    await expect(page.locator('#email-quick-reply')).toBeVisible();
    await inside(page.locator('.email-attach').first(), reader);
  }
  await expect(page.locator('.email-attach')).toContainText('invoice-126.pdf');
  await reader.hover();
  await page.mouse.wheel(0, 700);
  if (info.project.use.isMobile) await expect.poll(() => reader.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await inside(page.locator('.email-reading-body p').last(), reader);
});

test('VQA-01: Reply drafts, Back, Archive and Move remain usable', async ({page}, info) => {
  await go(page, info);
  await page.locator('.email-list-row[data-id="e1"]').click();
  await page.locator('[data-mail-toolbar] [data-mail-action="reply"]').click();
  const text = 'Batch 1 reply survives leaving the reader';
  await page.locator('#email-compose-body').fill(text);
  await page.locator('[data-save-draft]').click();
  // A saved draft survives a full document navigation as well as Back.
  await expect(page.getByText(info.project.use.rtl ? 'تم حفظ المسودة' : 'Draft saved', {exact: true})).toBeVisible();
  await page.goto('/help-screens/notes');
  await go(page, info);
  await page.locator('.email-list-row[data-id="e1"]').click();
  await expect(page.locator('#email-quick-reply')).toBeVisible();
  await expect(page.locator('#email-quick-reply')).toHaveValue(text);
  await page.locator('#email-quick-reply').fill(text + ' edited');
  if (info.project.use.isMobile) {
    await page.locator('[data-mail-back]').click();
    await expect(page.locator('.email-list')).toBeVisible();
    await page.locator('.email-list-row[data-id="e1"]').click();
    await expect(page.locator('#email-quick-reply')).toHaveValue(text + ' edited');
  }
  await page.locator('[data-mail-toolbar] [data-mail-action="archive"]').click();
  await expect(page.locator('.email-list-row[data-id="e1"]')).toHaveCount(0);
  await page.locator('.email-list-row[data-id="e2"]').click();
  await page.locator('[data-mail-action="move"]').click();
  await page.locator('[data-move-to="archive"]').click();
  await expect(page.locator('.email-list-row[data-id="e2"]')).toHaveCount(0);
});

test('VQA-02: header identity, year and controls occupy distinct usable bounds', async ({page}, info) => {
  await go(page, info, '/help-screens/notes');
  const brand = page.locator('.gtop .app');
  await expect(brand).toHaveAccessibleName('lastchance, fiscal year 2026');
  const geometry = await page.locator('.gtop').evaluate(header => {
    const rect = el => {const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const buttons = [...header.querySelectorAll('button')].filter(visible).map(rect);
    const identity = header.querySelector('.app'), name = identity.querySelector('.app-name'), year = identity.querySelector('.year-badge');
    const text = document.createRange(); text.selectNodeContents(name);
    const paint = text.getBoundingClientRect();
    return {buttons,brand:rect(identity),name:rect(name),year:rect(year),namePaint:{x:paint.x,right:paint.right},
      noOverlaps:buttons.every((a,i) => buttons.slice(i+1).every(b => Math.min(a.right,b.right)-Math.max(a.x,b.x) <= 1 || Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y) <= 1)),
      fullName:name.scrollWidth <= name.clientWidth,header:rect(header),width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  expect(geometry.noOverlaps, 'visible interactive target rectangles do not overlap').toBe(true);
  for (const part of [geometry.name, geometry.year, geometry.namePaint]) {
    expect(part.x).toBeGreaterThanOrEqual(geometry.brand.x);
    expect(part.right).toBeLessThanOrEqual(geometry.brand.right);
  }
  expect(geometry.fullName, 'the seeded workspace name fits at rest').toBe(true);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  if (info.project.use.isMobile) {
    expect(geometry.header.height).toBeLessThanOrEqual(113);
    for (const button of geometry.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.locator('.gtop button[aria-controls="notifications-popover"]').click();
  await expect(page.locator('#notifications-popover')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.gtop .right .chip').click();
  await expect(page.locator('#aiscrim')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('VQA-03: complete invoice identifiers, dates and prices fit at rest', async ({page}, info) => {
  await go(page, info, manifest.fixtures.invoice.route);
  await page.locator('[data-list-open-record]').first().click();
  // This is the existing prototype mode control's real change handler.
  await page.locator('#mode').evaluate(el => {el.value = 'create'; el.dispatchEvent(new Event('change', {bubbles:true}));});
  await page.locator('#add-item-link').click();
  const rows = page.locator('#items-body > tr');
  await expect(rows).toHaveCount(2);
  for (let row = 0; row < 2; row++) {
    for (const [field, value] of Object.entries(manifest.fixtures.invoice.rows[row])) {
      await rows.nth(row).locator('input').nth(manifest.fixtures.invoice.rowInputIndices[field]).fill(String(value));
    }
  }
  const heights = info.project.use.isMobile ? [844, 1200] : [info.project.use.viewport.height];
  for (const height of heights) {
    if (info.project.use.isMobile) await page.setViewportSize({width:390,height});
    await page.locator('.rec-items-hd b').click();
    await page.mouse.move(0, 0);
    for (let row = 0; row < 2; row++) {
      for (const [field, seeded] of Object.entries(manifest.fixtures.invoice.rows[row])) {
        const index = manifest.fixtures.invoice.rowInputIndices[field], value = String(seeded);
        const input = rows.nth(row).locator('input').nth(index);
        await input.scrollIntoViewIfNeeded();
        await expect(input).not.toBeFocused();
        await expect(input).toHaveValue(value);
        const fit = await input.evaluate(el => {
          const s = getComputedStyle(el), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
          ctx.font = s.font;
          const textWidth = ctx.measureText(el.value).width;
          // Reserve native numeric stepper space even when it is not hovered.
          const available = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - (el.type === 'number' ? 20 : 0);
          const r = el.getBoundingClientRect(), wrap = el.closest('.inv-grid-wrap').getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
          return {textWidth, available, scrollLeft:el.scrollLeft, clipped:r.left < wrap.left || r.right > wrap.right || r.top < wrap.top || r.bottom > wrap.bottom, hit:hit === el};
        });
        expect(fit.available, `row ${row+1}, column ${index}: ${value} fits with padding and stepper space`).toBeGreaterThanOrEqual(fit.textWidth);
        expect(fit.scrollLeft, 'unfocused input text is not internally panned').toBe(0);
        expect(fit.clipped).toBe(false);
        expect(fit.hit).toBe(true);
      }
    }
    const scroller = page.locator('.rec-items .inv-grid-wrap');
    // Restore the approved section alignment after checking individual fields.
    await page.locator('.rec-items').evaluate(el => el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
    for (const trailing of [false, true]) {
      await scroller.evaluate((el, trailing) => {
        const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
        el.scrollLeft = trailing ? sign * (el.scrollWidth - el.clientWidth) : 0;
      }, trailing);
      await test.step(`SR-01: ${height}px complete ${trailing ? 'trailing' : 'leading'} header boxes`, async () => {
        const endpoint = await scroller.evaluate(el => ({left:el.scrollLeft,max:el.scrollWidth-el.clientWidth,rtl:getComputedStyle(el).direction==='rtl'}));
        // Match the original capture contract's browser endpoint rounding.
        expect(Math.abs(endpoint.left - (trailing ? (endpoint.rtl ? -1 : 1) * endpoint.max : 0))).toBeLessThanOrEqual(1);
        const columns = info.project.use.isMobile ? (trailing ? [10,11] : [0,1,2]) : Array.from({length:12},(_,i)=>i);
        for (const index of columns) {
          // Input-interior checks alone miss padding clipped off a header.
          // Keep the full header and both rows inside the actual scrollport.
          await inside(scroller.locator('thead th').nth(index), scroller);
          for (const row of await rows.all()) await inside(row.locator('input').nth(index), scroller);
        }
      });
      const column = trailing ? 11 : 0;
      await inside(rows.first().locator('input').nth(column), scroller);
      if (!trailing) await inside(rows.first().locator('input').nth(2), scroller);
    }
  }
  await expect(page.locator('#items-total-qty')).toHaveText('2');
  await expect(page.locator('#invoice-summary-subtotal')).toHaveText('200.00');
  await expect(page.locator('#invoice-summary-tax')).toHaveText('+ 0.00');
  for (const row of await rows.all()) for (const index of [9,10,11]) await expect(row.locator('input').nth(index)).toHaveValue('0');
});
