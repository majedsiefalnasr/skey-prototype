import {test, expect} from '@playwright/test';
import {boot} from './support/browser.mjs';

const surfaces = [
  ['/help-screens/email', '.email-view', '.email-app', false],
  ['/help-screens/notes', '.notes-view', '[data-collab-body]', true],
  ['/help-screens/activities', '.activities-view', '[data-collab-body]', true],
  ['/help-screens/events', '.events-view', '[data-collab-body]', true],
  ['/customers', '.foryou-view', '.grid > div:first-child', false],
  ['/dashboard', '.foryou-view', '.grid > div:first-child', false],
  ['/customers/unavailable?screen=Marketers', '.placeholder-view', '[data-placeholder-back]', false],
];

for (const [density, layout] of [['default', 'fluid'], ['compact', 'fluid'], ['default', 'boxed']]) {
  test(`${density} ${layout}: page gutters align with Customers`, async ({page}, info) => {
    test.setTimeout(60000);
    const base = process.env.PARITY_URL ?? 'http://127.0.0.1:4173';
    await boot(page, base);
    for (const [id,value] of [['density',density],['content-layout',layout]]) {
      await page.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
    }
    const go = async path => {
      await page.goto(base+path);
      await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
      await expect(page.locator('html')).toHaveCSS('direction',info.project.use.rtl?'rtl':'ltr');
      await expect(page.locator('#density')).toHaveValue(density);
      await expect(page.locator('#content-layout')).toHaveValue(layout);
    };
    const inset = (locator, includePadding = false) => locator.evaluate((el, includePadding) => {
      const root = document.querySelector('.page-content').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const padding = includePadding ? parseFloat(getComputedStyle(el).paddingInlineStart) : 0;
      return (rtl ? root.right-box.right : box.left-root.left)+padding;
    }, includePadding);
    await go('/customers/list');
    const expectedHeading = await inset(page.locator('.customer-list-view h1'));
    const expectedContent = await inset(page.locator('#customer-list-canvas'));
    const headerGap = (root, content) => page.evaluate(([root, content]) =>
      document.querySelector(content).getBoundingClientRect().top
        - document.querySelector(root+' .phead').getBoundingClientRect().bottom,
    [root, content]);
    const expectedHeaderGap = await headerGap('.customer-list-view', '#customer-list-canvas');
    for (const [path,root,body,includePadding] of surfaces) {
      await go(path);
      await expect(page.locator(root)).toBeVisible();
      if (root === '.placeholder-view') {
        await expect(page.locator('[data-placeholder-crumb]')).toHaveText(await page.locator(root+' h1').innerText());
      }
      expect(await inset(page.locator(root+' h1')), path+' heading').toBe(expectedHeading);
      // Placeholder content has its own card padding; compare the card edge.
      const content = root === '.placeholder-view'
        ? page.locator(root+' [data-placeholder-back]').locator('..')
        : page.locator(root+' '+body);
      expect(await inset(content,includePadding),path+' content').toBe(expectedContent);
      if (root === '.email-view') {
        expect(await headerGap(root, '.email-app'), path+' header spacing').toBe(expectedHeaderGap);
        expect(await content.evaluate(el=>getComputedStyle(el).marginBottom)).toBe('0px');
      }
      if (root.endsWith('s-view') && root !== '.placeholder-view') {
        const toolbar = page.locator(root+' [data-collab-toolbar]');
        if (await toolbar.count()) expect(await inset(toolbar,true),path+' toolbar').toBe(expectedContent);
      }
    }
  });
}
