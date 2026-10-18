import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
async function boot(page,base){
 await page.clock.setFixedTime(new Date('2026-10-13T10:24:00Z'));
 await page.addInitScript(()=>{if(!sessionStorage.getItem('skey-proto-state'))sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':true,launchpad:true,'simulate-loading':false}));});
 await page.route('https://cdn.jsdelivr.net/npm/apexcharts**',route=>route.abort());
 await page.goto(base+'/customers/list');
 if(await page.locator('#kit-hide').isVisible())await page.locator('#kit-hide').click();
}
const dir=new URL('./layout-review/',import.meta.url);await mkdir(dir,{recursive:true});
const browser=await chromium.launch();const rows=[];
try {
 for(const [name,width,height,rtl] of [['desktop',1440,900,false],['mobile-rtl',390,844,true]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();
  await boot(page,'http://127.0.0.1:4272');
  if(rtl)await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  for(const [label,path] of [['customers','/customers/list'],['mail','/help-screens/email'],['notes','/help-screens/notes'],['activities','/help-screens/activities'],['events','/help-screens/events'],['for-you','/customers'],['dashboard','/dashboard'],['placeholder','/customers/unavailable?screen=Marketers']]) {
   await page.goto('http://127.0.0.1:4272'+path);await page.locator('.skeleton-overlay').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
   const file=`${name}-${label}.png`;await page.screenshot({path:new URL(file,dir).pathname,animations:'disabled'});
   rows.push({project:name,label,path,file,geometry:await page.evaluate(()=>{const main=document.querySelector('.page-content');const h=[...main.querySelectorAll('h1')].find(x=>x.getBoundingClientRect().width);return {canvas:main.getBoundingClientRect().toJSON(),heading:h?.getBoundingClientRect().toJSON(),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};})});
  }
  await page.goto('http://127.0.0.1:4272/sales-systems-management/sales-invoices');await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
  await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('.list-view .data-page-manage > summary').click();await page.screenshot({path:new URL(`${name}-arabic-manage.png`,dir).pathname,animations:'disabled'});
  await context.close();
 }
 await writeFile(new URL('geometry.json',dir),JSON.stringify(rows,null,2)+'\n');
}finally{await browser.close();}
