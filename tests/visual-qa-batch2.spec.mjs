import {test,expect} from '@playwright/test';

test.beforeEach(async ({page},info)=>{
  test.skip(!info.project.use.isMobile,'Batch 2 mobile layout regressions');
  await page.clock.setFixedTime(new Date('2026-10-13T10:24:00Z'));
  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('skey-proto-state'))sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':true,launchpad:true,'simulate-loading':false}));
  });
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**',route=>route.abort());
});
async function go(page,info,area){
  await page.goto('/help-screens/'+area);
  if(await page.locator('#kit-hide').isVisible())await page.locator('#kit-hide').click();
  await page.locator('#rtl').evaluate((el,rtl)=>{el.checked=rtl;el.dispatchEvent(new Event('change',{bubbles:true}));},Boolean(info.project.use.rtl));
  await expect(page.locator('html')).toHaveAttribute('lang',info.project.use.rtl?'ar':'en');
  await expect(page.locator('html')).toHaveAttribute('dir',info.project.use.rtl?'rtl':'ltr');
  await expect(page.locator('.skeleton-overlay:visible')).toHaveCount(0);
  await page.evaluate(()=>document.fonts.ready);
}
async function exposed(locator){
  await expect(locator).toBeVisible();
  const result=await locator.evaluate(el=>{
    const r=el.getBoundingClientRect(),v=visualViewport;
    let fits=r.left>=v.offsetLeft&&r.right<=v.offsetLeft+v.width&&r.top>=v.offsetTop&&r.bottom<=v.offsetTop+v.height;
    for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX+s.overflowY))fits&&=r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1;}
    const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {fits,hit:h===el||el.contains(h)};
  });
  expect(result).toEqual({fits:true,hit:true});
}
async function week(page){
  await page.locator('[data-view-menu] summary').click();await page.locator('[data-view-select="calendar"]').click();
  await expect(page.locator('[data-timed] [data-cal-slot][data-time="00:00"]')).toHaveCount(7);
}

test('VQA-04: week context stays visible through the approved pan and native scrolling',async({page},info)=>{
  await go(page,info,'activities');await week(page);
  expect(await page.locator('[data-timed] [data-cal-slot][data-time="00:00"]').evaluateAll(els=>els.map(el=>el.dataset.calSlot))).toEqual(Array.from({length:7},(_,i)=>`2026-10-${11+i}`));
  await page.locator('[data-timed]').evaluate(el=>{el.scrollTop=432;});
  const call=page.locator('[data-cal-item]').first();
  await call.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  const context=page.locator('[data-cal-context]');
  await exposed(context);
  await exposed(page.locator('[data-cal-prev]'));
  await exposed(page.locator('[data-cal-next]'));
  await expect(context.locator('[data-cal-context-dates]')).toContainText(info.project.use.rtl?'١٣ أكتوبر':'13 Oct');
  await expect(context.locator('[data-cal-context-time]')).toHaveText(/\d{2}:\d{2}–\d{2}:\d{2}/);
  const [from,to]=(await context.locator('[data-cal-context-time]').textContent()).split('–').map(t=>Number(t.slice(0,2))*60+Number(t.slice(3)));
  expect(from).toBeLessThanOrEqual(15*60);expect(to).toBeGreaterThanOrEqual(15*60+30);
  await exposed(call);
  expect(await call.evaluate(el=>{
    const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.top+2);
    return h===el||el.contains(h);
  }),'period controls/context must not cover the event start').toBe(true);
  const original=await context.locator('[data-cal-context-time]').textContent();
  await page.locator('[data-timed]').hover();await page.mouse.wheel(0,144);
  await expect(context.locator('[data-cal-context-time]')).not.toHaveText(original);
  await exposed(context);
  await page.locator('[data-cal-item]').nth(1).evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  await expect(context.locator('[data-cal-context-dates]')).toContainText(info.project.use.rtl?'١٥ أكتوبر':'15 Oct');
  await exposed(context);
});

test('VQA-04: month weekday context remains visible while panning the approved cells',async({page},info)=>{
  await go(page,info,'events');
  await page.locator('[data-date="2026-10-13"]').evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  const context=page.locator('[data-cal-context]');
  await exposed(context);
  await expect(context.locator('[data-cal-context-dates]')).toContainText(info.project.use.rtl?'الثلاثاء':'Tue');
  for(const date of ['2026-10-06','2026-10-13'])await exposed(page.locator(`[data-date="${date}"] [data-cal-item]`));
  await page.locator('[data-date="2026-10-15"]').evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  await expect(context.locator('[data-cal-context-dates]')).toContainText(info.project.use.rtl?'الخميس':'Thu');
  await exposed(context);
  await page.locator('.collab-calendar-scroll').hover();await page.mouse.wheel(0,160);
  await exposed(context);
  await expect(page.locator('[data-cal-month]')).toHaveAttribute('aria-label',info.project.use.rtl?'أكتوبر ٢٠٢٦':'October 2026');
});

test('VQA-08: painted duration geometry is independent of the touch target',async({page},info)=>{
  await go(page,info,'activities');await week(page);
  const metrics=await page.locator('[data-timed] [data-cal-item]').evaluateAll(els=>els.map(el=>{
    const paint=el.querySelector('.cal-event-paint')||el;
    return {label:el.getAttribute('aria-label'),paint:paint.getBoundingClientRect().height,offset:paint.getBoundingClientRect().top-el.getBoundingClientRect().top,target:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width};
  }));
  expect(metrics.map(m=>m.paint)).toEqual([22,46]);
  for(const m of metrics){expect(m.target).toBeGreaterThanOrEqual(44);expect(m.width).toBeGreaterThanOrEqual(44);expect(m.offset).toBe(0);}
  expect(metrics[0].label).toContain('15:00 to 15:30');
  expect(metrics[1].label).toContain('10:00 to 11:00');
  expect(metrics[0].paint/metrics[1].paint).toBeLessThan(0.5);
  const call=page.locator('[data-cal-item]').first();
  await call.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  await call.tap();
  await expect(page.locator('#collab-panel-title')).toHaveText('Call Al Noor about quotation 884');
  await page.locator('[data-panel-close]').click();
  await call.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#collab-panel-title')).toHaveText('Call Al Noor about quotation 884');
});

test('VQA-08: adjacent half-hour activities remain independently tappable',async({page},info)=>{
  await go(page,info,'activities');
  // Create a test-only adjacent record through the editor; tracked fixtures
  // and the original 15:00 call are unchanged.
  await page.locator('[data-collab-new]').click();
  const title='Batch 2 adjacent half-hour';
  await page.locator('#activity-summary').fill(title);
  await page.locator('#collab-panel details summary').click();
  await page.locator('#activity-start').fill('2026-10-13T15:30');
  await page.locator('#activity-duration').selectOption('30');
  await page.locator('#collab-panel [data-panel-save]').click();
  await expect(page.locator('#collab-panel')).toBeHidden();
  // Complete the normal creation flow before testing calendar hit targets;
  // the success flag otherwise overlays the bottom portion of the phone.
  await page.locator('.toast button[aria-label="Dismiss"]').click();
  await expect(page.locator('.toast')).toHaveCount(0);
  await week(page);
  const call=page.locator('[data-timed] [data-cal-item]').filter({hasText:'Call Al Noor about quotation 884'});
  const adjacent=page.locator('[data-timed] [data-cal-item]').filter({hasText:title});
  await call.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  const a=await call.locator('.cal-event-paint').boundingBox(),b=await adjacent.locator('.cal-event-paint').boundingBox();
  expect(a.height).toBe(22);expect(b.height).toBe(22);
  expect(b.y-a.y).toBe(24);
  expect(a.y+a.height).toBeLessThan(b.y);
  await page.screenshot({path:info.outputPath('adjacent-calendar.png'),animations:'disabled',caret:'hide'});
  for(const [target,expected]of [[call,'Call Al Noor about quotation 884'],[adjacent,title]]){
    expect(await target.evaluate(el=>{
      const r=el.querySelector('.cal-event-paint').getBoundingClientRect();
      return [r.top+2,r.top+r.height/2,r.bottom-2].every(y=>document.elementFromPoint(r.x+r.width/2,y)?.closest('[data-cal-item]')===el);
    }),'painted top, center and bottom select this event, not its neighbor').toBe(true);
    await target.locator('.cal-event-paint').tap();
    await expect(page.locator('#collab-panel-title')).toHaveText(expected);
    await page.locator('[data-panel-close]').click();
    await target.tap();
    await expect(page.locator('#collab-panel-title')).toHaveText(expected);
    await page.locator('[data-panel-close]').click();
  }
});

test('VQA-05: Mail Reply and launcher have independent hit targets and the kit reopens',async({page},info)=>{
  await go(page,info,'email');
  await page.locator('.email-list-row[data-id="e1"]').click();
  await expect(page.locator('#email-quick-reply')).toBeHidden();
  await page.locator('[data-mail-action="reply"]').click();
  await page.locator('#email-compose-body').fill('Batch 2 saved reply for launcher verification');
  await page.locator('[data-save-draft]').click();
  await expect(page.getByText(info.project.use.rtl ? 'تم حفظ المسودة' : 'Draft saved',{exact:true})).toBeVisible();
  await go(page,info,'email');
  await page.locator('.email-list-row[data-id="e1"]').click();
  await expect(page.locator('#email-quick-reply')).toHaveValue('Batch 2 saved reply for launcher verification');
  const reply=page.locator('.email-send'),pill=page.locator('#kit-pill');
  await exposed(reply);await exposed(pill);
  const a=await reply.boundingBox(),b=await pill.boundingBox();
  expect(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<=0||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<=0,'Reply and launcher rectangles are disjoint').toBe(true);
  for(const target of [reply,pill]){
    expect(await target.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return [[.5,.5],[.1,.5],[.9,.5],[.5,.1],[.5,.9]].every(([x,y])=>{const h=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return h===el||el.contains(h);});
    }),'center and four edge-midpoints hit the intended control').toBe(true);
  }
  expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
  await expect(pill).toHaveAccessibleName('Prototype controls');
  await pill.tap();await expect(page.locator('#kit')).toBeVisible();
  await expect(page.locator('#kit-min')).toBeFocused();
  await page.locator('#kit-hide').tap();await expect(pill).toBeFocused();
  await exposed(reply);await exposed(pill);
  await expect(page.locator('#email-quick-reply')).toHaveValue('Batch 2 saved reply for launcher verification');
  await reply.tap();await expect(page.getByText(info.project.use.rtl ? 'تم إرسال الرسالة' : 'Message sent',{exact:true})).toBeVisible();
  await go(page,info,'notes');
  expect((await pill.boundingBox()).x).toBe(info.project.use.rtl?14:332);
});
