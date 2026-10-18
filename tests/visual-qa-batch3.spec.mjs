import {test, expect} from '@playwright/test';

test.use({timezoneId:'Africa/Cairo',locale:'en-US',deviceScaleFactor:1});
const identity=['admin@lastchance.local','lastchance.skeyerp.com','Cairo HQ'];
async function boot(page,info){
  await page.clock.setFixedTime(new Date('2026-10-13T10:24:00Z'));
  await page.addInitScript(()=>sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':false,launchpad:true,'simulate-loading':false})));
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**',r=>r.abort());
  await page.goto('/signin');
  if(await page.locator('#kit-hide').isVisible())await page.locator('#kit-hide').click();
  await page.locator('#rtl').evaluate((el,rtl)=>{el.checked=rtl;el.dispatchEvent(new Event('change',{bubbles:true}));},Boolean(info.project.use.rtl));
  await expect(page.locator('html')).toHaveAttribute('lang',info.project.use.rtl?'ar':'en');
  await expect(page.locator('html')).toHaveAttribute('dir',info.project.use.rtl?'rtl':'ltr');
  await page.locator('#si-email').fill(identity[0]);await page.locator('#si-to2').click();
  await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');
  await page.locator('#si-branch-go').click();await expect(page.locator('#si-pass')).toBeFocused();
  await expect(page.locator('.skeleton-overlay:visible')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);
}
async function glyphs(locator,terms){
  return locator.evaluate((el,terms)=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const nodes=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
    const at=offset=>{for(const n of nodes){if(offset<n.length)return[n,offset];offset-=n.length;}throw Error('Missing character');};
    return {box:rect(el),terms:terms.map(term=>{
      const start=el.textContent.indexOf(term);if(start<0)throw Error('Missing term '+term);
      const boxes=[];for(let i=0;i<term.length;i++){if(/\s/.test(term[i]))continue;const[n,offset]=at(start+i),range=document.createRange();range.setStart(n,offset);range.setEnd(n,offset+1);boxes.push(rect(range));}
      return {term,boxes,lines:new Set(boxes.map(b=>Math.round(b.y))).size};
    }),overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1};
  },terms);
}
async function exposed(locator){
  await expect(locator).toBeVisible();
  expect(await locator.evaluate(el=>{
    const r=el.getBoundingClientRect(),v=visualViewport;
    let fits=r.x>=v.offsetLeft&&r.right<=v.offsetLeft+v.width&&r.y>=v.offsetTop&&r.bottom<=v.offsetTop+v.height;
    for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX+s.overflowY))fits&&=r.x>=b.x-1&&r.right<=b.right+1&&r.y>=b.y-1&&r.bottom<=b.bottom+1;}
    const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {fits,hit:h===el||el.contains(h)};
  })).toEqual({fits:true,hit:true});
}
function contained(metrics){
  expect(metrics.overflow).toBe(false);
  for(const term of metrics.terms)for(const b of term.boxes){
    expect(b.x).toBeGreaterThanOrEqual(metrics.box.x-1);expect(b.right).toBeLessThanOrEqual(metrics.box.right+1);
    expect(b.y).toBeGreaterThanOrEqual(metrics.box.y-1);expect(b.bottom).toBeLessThanOrEqual(metrics.box.bottom+1);
  }
}

test('VQA-06: seeded identity has intact rendered units and Change restores state',async({page},info)=>{
  await boot(page,info);const who=page.locator('#si-who'),change=page.locator('#si-change'),pass=page.locator('#si-pass');
  await expect(who).toHaveText(identity.join(' · '));await expect(who).toHaveAttribute('dir','ltr');
  const metrics=await glyphs(who,identity);contained(metrics);expect(metrics.terms.map(t=>t.lines)).toEqual([1,1,1]);
  await exposed(who);await exposed(change);const a=await who.boundingBox(),b=await change.boundingBox();
  expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
  if(info.project.use.isMobile){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
  await expect(change).toHaveAccessibleName(info.project.use.rtl?'تغيير':'Change');
  await expect(page.locator('#si-auth-email')).toBeHidden();await expect(page.locator('#si-auth-email')).toHaveValue(identity[0]);
  await expect(pass).toHaveAttribute('autocomplete','current-password');await expect(pass).toHaveAttribute('dir','ltr');
  await page.screenshot({path:info.outputPath('password-identity.png'),animations:'disabled',caret:'hide',scale:'css'});
  await pass.press('Tab');await expect(page.locator('#si-show')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(pass).toBeFocused();
  await pass.fill('Temporary unsubmitted password');await change.click();await expect(page.locator('#si-email')).toBeFocused();
  await expect(page.locator('#si-email')).toHaveValue(identity[0]);await expect(page.locator('#si-email-hint')).toContainText(identity[0]);
  await page.locator('#si-to2').click();await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');await page.locator('#si-branch-go').click();
  await expect(who).toHaveText(identity.join(' · '));await expect(pass).toBeFocused();await expect(pass).toHaveValue('');
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('skey-proto-state'))['signed-in'])).toBe(false);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('skey-proto-accounts')||'[]'))).toEqual([]);
});

test('VQA-06: exceptional tokens stay contained and long branches wrap at words',async({page},info)=>{
  await boot(page,info);
  const branch='North Regional Distribution and Customer Support Office';
  const data={email:'a'.repeat(100)+'@example.local',workspace:'longworkspace'.repeat(12)+'.skeyerp.com',branch};
  // Exercise the actual presentation renderer with test-only data; directory,
  // authentication state and tracked fixtures remain unchanged.
  await page.locator('#si-who').evaluate(async(el,data)=>{const{renderSignInIdentity}=await import('/concepts/app/pages/signin/signin.js');renderSignInIdentity(el,data);},data);
  const who=page.locator('#si-who');await who.scrollIntoViewIfNeeded();
  await expect(who).toHaveText([data.email,data.workspace,branch].join(' · '));
  contained(await glyphs(who,[data.email,data.workspace,branch]));
  const words=await glyphs(page.locator('[data-si-identity="branch"]'),branch.split(' '));contained(words);expect(words.terms.every(t=>t.lines===1)).toBe(true);
  if(info.project.use.isMobile){expect((await glyphs(who,[data.email])).terms[0].lines).toBeGreaterThan(1);expect((await glyphs(who,[branch])).terms[0].lines).toBeGreaterThan(1);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#si-change').click();await expect(page.locator('#si-email')).toBeFocused();await expect(page.locator('#si-email')).toHaveValue(identity[0]);
  await page.locator('#si-to2').click();await page.locator('#si-branch-go').click();await expect(who).toHaveText(identity.join(' · '));
});
