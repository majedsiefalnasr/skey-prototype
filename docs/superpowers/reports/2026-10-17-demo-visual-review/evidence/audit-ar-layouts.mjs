import {chromium} from '/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
await page.route('https://cdn.jsdelivr.net/npm/apexcharts**',r=>r.abort());
await page.addInitScript(()=>sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':true,launchpad:true,'simulate-loading':false})));
const observations=[];
for(const [screen,sections] of [['profile',['profile','employee','contact','account','appearance','security','sessions']],['organization',['overview','settings','users','application-sessions','database-sessions']]]){
 for(const section of sections){
  await page.goto('http://127.0.0.1:4254/system/'+screen+'?section='+section);
  await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  if(await page.locator('#kit-hide').isVisible())await page.locator('#kit-hide').click();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.locator('.skeleton-overlay').waitFor({state:'hidden'});
  const residual=await page.locator('.'+screen+'-view').evaluate(root=>[...root.querySelectorAll('button,label,h1,h2,h3,h4,summary,th,dt,[data-i18n]')].filter(el=>el.getClientRects().length&&/[A-Za-z]{3,}/.test(el.textContent)&&!/[\u0600-\u06ff]/.test(el.textContent)).map(el=>({tag:el.tagName,key:el.dataset.i18n,text:el.textContent.trim().replace(/\s+/g,' ').slice(0,220)})));
  observations.push({screen,section,residual});
 }
}
await fs.writeFile('/private/tmp/skey-delivery/codex-resume/ar-layout-residuals.json',JSON.stringify(observations,null,2));
await browser.close();
