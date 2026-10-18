import {chromium} from '/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out = '/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma/docs/superpowers/reports/2026-10-17-demo-visual-review/arabic';
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/apexcharts**',r=>r.abort());
await page.addInitScript(()=>sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':true,launchpad:true,'simulate-loading':false})));
async function go(path){
 await page.goto('http://127.0.0.1:4254'+path);
 await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
 if(await page.locator('#kit-hide').isVisible())await page.locator('#kit-hide').click();
 await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
 await page.evaluate(()=>document.fonts.ready);
}
async function shot(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('.skeleton-overlay').waitFor({state:'hidden'});await page.screenshot({path:out+'/'+name+'.png',animations:'disabled'});}
await go('/sales-systems-management/sales-invoices');
await page.locator('[data-list-open-record="145"]').first().click();
await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
await shot('J3-invoice');
await page.locator('#rec-tab-payment').click();await shot('J3-payments');
await go('/customers/list');
await page.locator('[data-list-row-key="200001"] [data-list-open-record]').first().click();
await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
await shot('J4-customer');
await page.locator('.phead [data-customer-action="modify"]:visible').first().click();
await page.locator('[data-customer-field="customerName"]').fill('عميل المراجعة');
await page.locator('.phead [data-customer-action="save"]:visible').first().click();await shot('J4-save');
await go('/system-setup/geographical-structure');
await page.locator('[data-list-open-record]').first().click();
await page.locator('.skeleton-overlay').waitFor({state:'hidden'});await shot('J5-geography');
await go('/help-screens/email');await page.locator('.email-list-row[data-id="e1"]').click();await shot('J6-mail');
await go('/system/profile?section=employee');await shot('J7-profile');
await go('/system/organization?section=application-sessions');await shot('J7-organization');
await fs.writeFile(out+'/observations.json',JSON.stringify({errors,lang:await page.locator('html').getAttribute('lang'),direction:await page.locator('html').getAttribute('dir'),scope:'Desktop Arabic J3–J7 visual spot-check states, not full manual journey acceptance'},null,2));
await browser.close();
