import {test, expect} from '@playwright/test';
import {COLLAB_SEED} from '../concepts/app/prototype/fixtures/collaboration.js';

async function boot(page, info) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('skey-proto-state')) {
      sessionStorage.setItem('skey-proto-state', JSON.stringify({'signed-in': true, launchpad: true, 'simulate-loading': false}));
    }
  });
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  await page.goto('/help-screens/email');
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click();
  await page.locator('#rtl').evaluate((el, rtl) => {
    el.checked = rtl;
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }, Boolean(info.project.use.rtl));
  await expect(page.locator('html')).toHaveAttribute('lang', info.project.use.rtl ? 'ar' : 'en');
  await expect(page.locator('.skeleton-overlay:visible')).toHaveCount(0);
}

const seedIds = COLLAB_SEED.entities.mail.map(m => m.id);
const drafts = page => page.evaluate(seedIds => JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.filter(m => m.folder === 'drafts' && !seedIds.includes(m.id)), seedIds);

// Freeze timer delivery only after the app/composer is ready. Navigation is
// real; the 600ms autosave cannot accidentally rescue the regression.
async function pauseAutosave(page) {
  const now = new Date('2026-10-17T10:00:00Z');
  await page.clock.install({time: now});
  await page.clock.pauseAt(now);
}

for (const exit of ['reload', 'another page']) {
  test(`latest compose edits survive ${exit} before autosave`, async ({page}, info) => {
    await boot(page, info);
    await page.locator('.email-compose').click();
    await page.locator('[data-add-cc]').click();
    await pauseAutosave(page);
    await page.locator('#email-compose-to').fill('reader@example.com');
    await page.locator('#email-compose-cc').fill('copy@example.com');
    await page.locator('#email-compose-subject').fill('Immediate exit draft');
    await page.locator('#email-compose-body').fill('Keep the latest edits\n\nحتى بعد إعادة التحميل');
    const pending = await drafts(page);
    expect(pending).toHaveLength(1);
    expect(pending[0].subject).toBe('');
    const id = pending[0].id;

    if (exit === 'reload') await page.reload();
    else {
      await page.goto('/help-screens/notes');
      await expect(page.locator('.notes-view')).toBeVisible();
      await page.goto('/help-screens/email');
    }
    const saved = await drafts(page);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({id, subject: 'Immediate exit draft', toInput: 'reader@example.com', ccInput: 'copy@example.com', body: ['Keep the latest edits', 'حتى بعد إعادة التحميل']});

    // Reopen the stored draft through the normal folder/list controls.
    if (info.project.use.isMobile) await page.locator('[data-folder-select]').selectOption('drafts');
    else await page.locator('[data-folder="drafts"]').click();
    await page.locator('.email-list-row', {hasText: 'Immediate exit draft'}).click();
    await expect(page.locator('#email-compose-to')).toHaveValue('reader@example.com');
    await expect(page.locator('#email-compose-cc')).toHaveValue('copy@example.com');
    await expect(page.locator('#email-compose-subject')).toHaveValue('Immediate exit draft');
    await expect(page.locator('#email-compose-body')).toHaveValue('Keep the latest edits\n\nحتى بعد إعادة التحميل');
    await page.clock.resume();
    if (exit === 'reload') {
      await page.locator('.email-send').click();
      await expect(page.locator('#email-compose-body')).toHaveCount(0);
      await page.reload();
      const sent = await page.evaluate(id => JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.filter(m => m.id === id), id);
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({folder: 'sent', to: [{email: 'reader@example.com'}], cc: [{email: 'copy@example.com'}], body: ['Keep the latest edits', 'حتى بعد إعادة التحميل']});
      expect(await drafts(page)).toHaveLength(0);
    } else {
      await page.locator('[data-discard-draft]').click();
      await page.locator('#collab-confirm [data-confirm-ok]').click();
      await expect(page.locator('#email-compose-body')).toHaveCount(0);
      await page.reload();
      expect(await drafts(page)).toHaveLength(0);
      expect(await page.evaluate(id => JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.some(m => m.id === id), id)).toBe(false);
    }
    const seededDrafts = COLLAB_SEED.entities.mail.filter(m => m.folder === 'drafts');
    expect(await page.evaluate(ids => JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.filter(m => ids.includes(m.id)), seededDrafts.map(m => m.id))).toEqual(seededDrafts);
  });
}

test('latest reply edit survives reload before autosave without duplicating a draft', async ({page}, info) => {
  await boot(page, info);
  await page.locator('.email-list-row[data-id="e1"]').click();
  // Phones deliberately defer the empty quick reply; use their normal Reply.
  if (info.project.use.isMobile) await page.locator('[data-mail-action="reply"]').click();
  const input = page.locator(info.project.use.isMobile ? '#email-compose-body' : '#email-quick-reply');
  await expect(input).toBeVisible();
  await pauseAutosave(page);
  await input.fill('Latest reply before reload');
  const pending = await drafts(page);
  expect(pending).toHaveLength(1);
  const id = pending[0].id;
  expect(pending[0].body).not.toEqual(['Latest reply before reload']);
  await page.reload();
  const saved = await drafts(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({id, replyToId: 'e1', body: ['Latest reply before reload']});
  if (info.project.use.isMobile) {
    await page.locator('[data-folder-select]').selectOption('drafts');
    await page.locator('.email-list-row', {hasText: 'Payment scheduled'}).click();
    await expect(page.locator('#email-compose-body')).toHaveValue('Latest reply before reload');
  } else {
    await page.locator('.email-list-row[data-id="e1"]').click();
    await expect(page.locator('#email-quick-reply')).toHaveValue('Latest reply before reload');
  }
});

test('leaving an untouched composer does not create a draft', async ({page}, info) => {
  await boot(page, info);
  await page.locator('.email-compose').click();
  await page.reload();
  expect(await page.evaluate(() => sessionStorage.getItem('skey-proto-collab'))).toBeNull();
});

test('switching messages keeps the composer draft', async ({page}, info) => {
  await boot(page, info);
  await page.locator('.email-compose').click();
  await pauseAutosave(page);
  await page.locator('#email-compose-subject').fill('Switch message draft');
  await page.locator('#email-compose-body').fill('Typed before opening another message\n\nنص قبل فتح رسالة أخرى');
  const pending = await drafts(page);
  expect(pending).toHaveLength(1);
  expect(pending[0].subject, 'the autosave timer is frozen, so the typed values are not stored yet').toBe('');
  const id = pending[0].id;

  // Phones show either the list or the pane, so the composer is left
  // through its Back control; wide layouts click the other row directly.
  if (info.project.use.isMobile) await page.locator('[data-mail-back]').first().click();
  await page.locator('.email-list-row[data-id="e1"]').click();
  await expect(page.locator('#email-compose-body')).toHaveCount(0);

  const saved = await drafts(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({id, subject: 'Switch message draft', body: ['Typed before opening another message', 'نص قبل فتح رسالة أخرى']});

  if (info.project.use.isMobile) {
    await page.locator('[data-mail-back]').first().click();
    await page.locator('[data-folder-select]').selectOption('drafts');
  } else await page.locator('[data-folder="drafts"]').click();
  await page.locator('.email-list-row', {hasText: 'Switch message draft'}).click();
  await expect(page.locator('#email-compose-subject')).toHaveValue('Switch message draft');
  await expect(page.locator('#email-compose-body')).toHaveValue('Typed before opening another message\n\nنص قبل فتح رسالة أخرى');
});
