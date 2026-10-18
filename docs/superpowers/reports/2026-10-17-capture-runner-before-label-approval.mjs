// Approved 2026-10-16 manifest. DOM preflight never calls a screenshot API.
// Capture requires a complete preflight for the same frozen build and runner.
import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile, writeFile, readdir, mkdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.split('=')));
const mode = args['--mode'];
assert(['preflight', 'capture'].includes(mode), 'Use --mode=preflight or --mode=capture');
const evidence = path.resolve(args['--evidence']);
const buildRoot = path.resolve(args['--build-root']);
const base = process.env.PARITY_URL;
assert(base && new URL(base).hostname === '127.0.0.1', 'Require isolated localhost PARITY_URL');
const manifestPath = 'docs/superpowers/plans/2026-10-16-visual-capture-manifest.json';
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runnerSha256 = sha(await readFile(new URL(import.meta.url)));
const manifestSha256 = sha(manifestBytes);
const build = JSON.parse(await readFile(path.join(evidence, 'frozen-build.json')));
async function treeHashes(root, prefix = '') {
  const result = {};
  for (const entry of (await readdir(path.join(root, prefix), {withFileTypes: true})).sort((a,b) => a.name.localeCompare(b.name))) {
    const rel = path.posix.join(prefix, entry.name);
    assert(!entry.isSymbolicLink(), `Unexpected symlink ${rel}`);
    if (entry.isDirectory()) Object.assign(result, await treeHashes(root, rel));
    else result[rel] = sha(await readFile(path.join(root, rel)));
  }
  return result;
}
assert.deepEqual(await treeHashes(buildRoot), build.files, 'Frozen build changed');
assert.equal(sha(await readFile(path.join(buildRoot, manifest.fixtures.collaboration.source))), manifest.fixtures.collaboration.sha256);
const fixture = await import(path.join(buildRoot, manifest.fixtures.collaboration.source));
assert.equal(fixture.PROTOTYPE_NOW, manifest.runtime.prototypeNow);
for (const [type, ids] of Object.entries(manifest.fixtures.collaboration.entityIds)) {
  assert.deepEqual(fixture.COLLAB_SEED.entities[type].map(e => e.id), ids);
}
assert.deepEqual(fixture.COLLAB_SEED.links.map(l => l.id), manifest.fixtures.collaboration.links);
const entries = manifest.projects.flatMap(project => manifest.captureStates
  .filter(state => state.projects === 'all' || state.projects.includes(project.name))
  .map(state => ({project, state, destination: manifest.snapshotPathTemplate.replace('{projectName}', project.name).replace('{name}', state.name)})));
assert.equal(entries.length, 128);
assert.equal(new Set(entries.map(e => e.destination)).size, 128);
// Check all paths before the first browser or image write; each write also uses wx.
for (const entry of entries) {
  try { await access(entry.destination); throw new Error(`Destination already exists: ${entry.destination}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (mode === 'capture') {
  const preflight = JSON.parse(await readFile(path.join(evidence, 'preflight.json')));
  assert.equal(preflight.sourceRevision, build.sourceRevision);
  assert.equal(preflight.manifestSha256, manifestSha256);
  assert.equal(preflight.runnerSha256, runnerSha256);
  assert.deepEqual(preflight.buildFiles, build.files);
  assert.equal(preflight.results.length, 128);
  assert(preflight.results.every(r => r.status === 'passed'));
  assert.deepEqual(preflight.results.map(r => r.destination).sort(), entries.map(e => e.destination).sort());
}

async function settle(page) {
  await page.locator('.skeleton-overlay').waitFor({state: 'hidden'});
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function selectView(page, root, value) {
  await page.locator(`${root} [data-view-menu] summary`).click();
  await page.locator(`${root} [data-view-select="${value}"]`).click();
}
async function ids(locator, attribute, expected) {
  assert.deepEqual((await locator.evaluateAll((els, attr) => els.map(el => el.getAttribute(attr)), attribute)).sort(), [...expected].sort());
}
// Entire border box in visual viewport AND all clipping ancestors, plus center hit test.
async function visibleInCrop(locator) {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), vv = visualViewport;
    const rect = b => ({x:b.x,y:b.y,width:b.width,height:b.height});
    const bounds = [{x:vv.offsetLeft,y:vv.offsetTop,width:vv.width,height:vv.height}];
    for(let p=el.parentElement;p;p=p.parentElement) {
      const s=getComputedStyle(p), b=p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX+s.overflowY)) bounds.push(rect(b));
    }
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {rect:rect(r), bounds, hit:hit===el||el.contains(hit),
      fits:r.width>0&&r.height>0&&bounds.every(b=>r.x>=b.x-1&&r.y>=b.y-1&&r.right<=b.x+b.width+1&&r.bottom<=b.y+b.height+1)};
  });
  assert(result.fits && result.hit, `Clipped/obscured ${locator}: ${JSON.stringify(result)}`);
}
async function hitCenter(locator) {
  await expect(locator).toBeVisible();
  assert(await locator.evaluate(el => {const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===el||el.contains(h);}), `Obscured center: ${locator}`);
}
async function invoice(page) {
  await page.locator('[data-list-open-record]').first().evaluate(el => el.click());
  await expect(page.locator('#canvas-root')).toBeVisible();
  await page.locator('#mode').selectOption('create', {force:true});
  await page.locator('#add-item-link').evaluate(el => el.click());
  const rows=page.locator('#items-body > tr'); await expect(rows).toHaveCount(2);
  for (let i=0;i<2;i++) {
    const inputs=rows.nth(i).locator('input');
    for (const [field,value] of Object.entries(manifest.fixtures.invoice.rows[i])) {
      const input=inputs.nth(manifest.fixtures.invoice.rowInputIndices[field]);
      await input.fill(String(value)); await expect(input).toHaveValue(String(value));
    }
    for (const index of [9,10,11]) {
      const value=await inputs.nth(index).inputValue();
      assert(value.trim() && Number(value)===0, 'Actual displayed line outputs stay zero');
    }
  }
  await page.locator('#invoice-discount-calculation').selectOption('percent');
  await page.locator('#invoice-discount-value').fill('10');
  await page.locator('[data-invoice-adjustment="charge"]').evaluate(el => el.click());
  const charge=page.locator('[data-adjustment-kind="charge"]'); await expect(charge).toHaveCount(1);
  await expect(charge.locator('select').nth(0)).toHaveValue('Freight');
  await expect(charge.locator('select').nth(1)).toHaveValue('Before tax');
  await charge.locator('[data-adjustment-value]').fill('25');
  await expect(charge.locator('[data-adjustment-value]')).toHaveValue('25');
  await expect(page.locator('#mode')).toHaveValue('create');
  await expect(page.locator('#invoice-discount-calculation')).toHaveValue('percent');
  await expect(page.locator('#invoice-discount-value')).toHaveValue('10');
  await expect(page.locator('#items-total-qty')).toHaveText('2');
  for(const [id,text] of Object.entries({subtotal:'200.00','items-discount':'− 0.00',discount:'− 20.00',charges:'+ 25.00',tax:'+ 0.00',net:'205.00 EGP'}))
    await expect(page.locator(`#invoice-summary-${id}`)).toHaveText(text);
  await expect(page.locator('.rec-adjustment-empty')).toHaveCount(0);
}
async function runEntry(browser, {project, state, destination}) {
  const {name,applicationLocale,effectiveDirection,invoiceViewportOverride,...contextOptions}=project;
  const context=await browser.newContext(contextOptions);
  const page=await context.newPage(); page.setDefaultTimeout(7000);
  const id=state.name.replace('.png',''), touch=project.isMobile, rtl=applicationLocale==='ar';
  let imageCreated=false;
  try {
    await page.clock.setFixedTime(new Date(manifest.runtime.browserDateFixed));
    await page.addInitScript(signedIn => {
      sessionStorage.clear();localStorage.clear();
      sessionStorage.setItem('skey-proto-state',JSON.stringify({'signed-in':signedIn,launchpad:true,'simulate-loading':false}));
    }, state.fixture!=='signed-out');
    await page.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
    const area=id.startsWith('notes')||id.startsWith('note-')?'notes':id.startsWith('activities')?'activities':id.startsWith('events')||id.startsWith('event-')?'events':id.startsWith('people')?'people-data':id.startsWith('mail')?'email':null;
    await page.goto(base+(area?`/help-screens/${area}`:state.fixture==='invoice'?manifest.fixtures.invoice.route:'/signin'));
    await expect(page.locator('#simulate-loading')).not.toBeChecked();
    const kitHide=page.locator('#kit-hide');
    if(await kitHide.isVisible()) await kitHide.click();
    await expect(page.locator('#kit')).toBeHidden();
    await settle(page);
    if(rtl) await page.locator('#rtl').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
    if(state.fixture==='invoice' && invoiceViewportOverride) await page.setViewportSize(invoiceViewportOverride);
    const root=area?`.${area==='people-data'?'people':area}-view`:null;
    if(area && area!=='email') {
      await expect(page.locator(`${root} h1`)).toBeVisible();
      for (const input of await page.locator(`${root} input[type="search"]`).all()) await expect(input).toHaveValue('');
    }
    const originalCollab=await page.evaluate(()=>sessionStorage.getItem('skey-proto-collab'));
    assert.equal(originalCollab,null,'Fresh application must load tracked seed without saved collaboration state');
    // Hiding the prototype kit focuses its pill; restore the manifest's entry focus.
    if(state.fixture==='signed-out') await page.locator('#si-email').focus();

    if(id==='notes-kanban') {
      await ids(page.locator('.notes-view [data-column]'),'data-column',['draft','active','archived']);
      await expect(page.locator('.notes-view [data-column="archived"]')).toHaveAttribute('data-collapsed','true');
      await ids(page.locator('.notes-view [data-card-open]'),'data-card-open',['note-1','note-2','note-3','note-4']);
      await expect(page.locator('[data-card-open="note-1"] use[href="#i-spark"]')).toHaveCount(1);
    }
    if(id==='notes-list-archived') {
      await selectView(page,root,'list');
      await page.locator(`${root} [data-quick-menu] summary`).click();
      await page.locator(`${root} [data-quick-filter="archived"]`).click();
      await expect(page.locator('[data-notes-grid]')).toBeVisible();
      await expect(page.locator(`${root} tbody tr`)).toHaveCount(1);
      await ids(page.locator(`${root} [data-row-open]`),'data-row-open',['note-5']);
      await expect(page.locator(`${root} tbody`)).toContainText('Old pricing assumptions');
      await expect(page.locator(`${root} [data-quick-filter="archived"]`)).toHaveAttribute('aria-checked','true');
    }
    if(id==='activities-kanban') {
      await ids(page.locator(`${root} [data-card-open]`),'data-card-open',manifest.fixtures.collaboration.entityIds.activity);
      for(const [status,count] of Object.entries({planned:4,in_progress:1,done:1})) await expect(page.locator(`${root} [data-column="${status}"] [data-card-open]`)).toHaveCount(count);
    }
    if(id==='activities-calendar-week') {
      await selectView(page,root,'calendar');
      await expect(page.locator(`${root} [data-cal-week]`)).toBeVisible();
      await expect(page.locator(`${root} [data-cal-modes] [data-value="week"]`)).toHaveAttribute('aria-pressed','true');
      await expect(page.locator(`${root} [data-unscheduled-notice]`)).toContainText('3 unscheduled');
      await ids(page.locator(`${root} [data-timed] [data-cal-slot][data-time="00:00"]`),'data-cal-slot',Array.from({length:7},(_,i)=>`2026-10-${11+i}`));
      const items=page.locator(`${root} [data-cal-item]`);await expect(items).toHaveCount(2);
      await expect(items.nth(0)).toHaveAttribute('aria-label',/Call Al Noor about quotation 884, 15:00 to 15:30/);
      await expect(items.nth(1)).toHaveAttribute('aria-label',/Monthly sales review, 10:00 to 11:00/);
      for(const [item,date,top,height] of [[items.nth(0),'2026-10-13',720,22],[items.nth(1),'2026-10-15',480,46]]) {
        assert.equal(await item.evaluate(el=>el.parentElement.querySelector('[data-cal-slot]').dataset.calSlot),date);
        const position=await item.evaluate(el=>({top:el.style.top,height:el.style.height}));
        assert.deepEqual(position,{top:`${top}px`,height:`${height}px`});
      }
      await page.locator(`${root} [data-timed]`).evaluate(el=>{el.scrollTop=432;});
      if(touch) await items.nth(0).evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
      await hitCenter(items.nth(0)); if(!touch) {await hitCenter(items.nth(1));assert.equal(await page.locator(`${root} [data-timed]`).evaluate(el=>el.scrollTop),432);}
    }
    if(id==='events-calendar-month') {
      await expect(page.locator(`${root} [data-cal-month]`)).toBeVisible();
      await expect(page.locator(`${root} [data-cal-modes] [data-value="month"]`)).toHaveAttribute('aria-pressed','true');
      await expect(page.locator(`${root} [data-cal-item]`)).toHaveCount(5);
      for(const [date,title,time] of [['2026-10-06','Company holiday','all day'],['2026-10-13','Supplier visit — Al Noor','11:00 to 12:00'],['2026-10-15','Monthly sales review','10:00 to 11:00'],['2026-10-29','Quarter close','all day'],['2026-10-30','Quarter close','all day']]) {
        await expect(page.locator(`${root} [data-date="${date}"] [data-cal-item]`)).toHaveAttribute('aria-label',new RegExp(`${title}, ${time}`));
      }
      if(touch) await page.locator(`${root} [data-date="2026-10-13"]`).evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
      const visible=touch?page.locator(`${root} [data-date="2026-10-06"] [data-cal-item], ${root} [data-date="2026-10-13"] [data-cal-item]`):page.locator(`${root} [data-cal-item]`);
      for(const item of await visible.all()) await hitCenter(item);
    }
    if(id.startsWith('people-')) {
      if(id==='people-cards') await selectView(page,root,'cards');
      await ids(page.locator(`${root} [data-row-open]`),'data-row-open',manifest.fixtures.collaboration.entityIds.person);
      if(id==='people-list') {
        await expect(page.locator('[data-people-grid]')).toBeVisible();
        await expect(page.locator(`${root} tbody tr`)).toHaveCount(4);
        const row=page.locator(`${root} tr`).filter({has:page.locator('[data-row-open="per-3"]')});
        await expect(row).toContainText('Contact');
        await expect(row).toContainText(rtl?'Converted to العميل':'Converted to Customer');
      } else {
        await expect(page.locator(`${root} .data-card-grid`)).toBeVisible();
        await expect(page.locator('[data-people-grid]')).toHaveCount(0);
        await expect(page.locator('[data-row-open="per-1"]')).toContainText('Al Noor Trading');
        await expect(page.locator('[data-list-row-key="per-1"]')).toContainText('+20 100 555 0101');
      }
    }
    if(id.startsWith('mail-')) {
      await expect(page.locator('#email-search-input')).toHaveValue('');
      await expect(page.locator('[data-mail-unread-filter]')).not.toBeChecked();
      await expect(page.locator('.email-list-row [type="checkbox"]:checked')).toHaveCount(0);
      if(id==='mail-compose-draft') {
        if(touch) await page.locator('[data-folder-select]').selectOption('drafts');else await page.locator('[data-folder="drafts"]').click();
        await page.locator('.email-list-row[data-id="mail-d1"]').click();
        await expect(page.locator('#email-compose-subject')).toHaveValue('Price list update');
        await expect(page.locator('[data-recipients="to"] [data-recipient-chip]')).toHaveCount(1);
        await expect(page.locator('[data-recipients="to"]')).toContainText('Mariam Adel');
        await expect(page.locator('[data-recipients="cc"] [data-recipient-chip]')).toHaveCount(0);
        await expect(page.locator('#email-compose-body')).toHaveValue('Hi Mariam,\n\nThe revised October price list is attached for your review.');
        await expect(page.locator('[data-draft-status]')).toHaveText('Draft saved 12:10');
      } else {
        await ids(page.locator('.email-list-row'),'data-id',['e1','e2','e3','e4','e5']);
        if(id==='mail-inbox-list') {
          await ids(page.locator('.email-list-row.unread'),'data-id',['e1','e2']);
          await expect(page.locator('.email-list-row[aria-current="true"]')).toHaveCount(0);
          await expect(page.locator('.email-reading-subject')).toHaveCount(0);
          await expect(page.locator('.email-list')).toBeVisible();
          if(touch) await expect(page.locator('#email-reading')).toBeHidden();else await expect(page.locator('#email-reading')).toBeVisible();
        } else {
          await page.locator('.email-list-row[data-id="e1"]').click();
          await expect(page.locator('.email-list-row[data-id="e1"]')).toHaveAttribute('aria-current','true');
          await expect(page.locator('.email-reading-subject')).toHaveText('Payment scheduled for Sales Invoice 126');
          for(const content of ['Finance Team','finance@lastchance.local','invoice-126.pdf','214 KB','20,000.00 EGP']) await expect(page.locator('#email-reading')).toContainText(content);
          await ids(page.locator('.email-list-row.unread'),'data-id',['e2']);
          await expect(page.locator('#email-quick-reply')).toHaveValue('');
          await expect(page.locator('#email-reading')).toBeVisible();
          if(touch) {await expect(page.locator('.email-list')).toBeHidden();await expect(page.locator('[data-mail-back]')).toBeVisible();}else await expect(page.locator('.email-list')).toBeVisible();
        }
      }
      for(const scroll of await page.locator('#email-list-scroll, .email-reading-scroll').all()) assert.equal(await scroll.evaluate(el=>el.scrollTop),0);
    }
    if(id==='note-editor-related') {
      await page.locator('[data-card-open="note-1"]').click();await page.locator('[data-panel-edit]').click();
      await expect(page.locator('#note-title')).toHaveValue('Payment terms for Al Noor');
      await expect(page.locator('#note-body')).toHaveValue(fixture.COLLAB_SEED.entities.note[0].body);
      await expect(page.locator('[data-panel-related] [data-related-row]')).toHaveCount(2);
      await page.locator('#collab-panel [data-panel-form] > div').evaluate(el=>{el.scrollTop=el.scrollHeight;});
      for(const row of await page.locator('[data-panel-related] [data-related-row]').all()) await visibleInCrop(row);
      await expect(page.locator('[data-panel-related]')).toContainText('Call Al Noor about quotation 884');
      await expect(page.locator('[data-panel-related]')).toContainText('Ahmed Ali');
      await visibleInCrop(page.locator('[data-panel-save]'));await visibleInCrop(page.locator('[data-panel-cancel]'));
    }
    if(id==='event-editor-validation') {
      await page.locator('[data-cal-item]').filter({hasText:'Monthly sales review'}).click();await page.locator('[data-panel-edit]').click();
      await page.locator('#event-end').fill('2026-10-15T09:00');await page.locator('[data-panel-save]').click();
      await expect(page.locator('#event-title')).toHaveValue('Monthly sales review');
      await expect(page.locator('#event-start')).toHaveValue('2026-10-15T10:00');
      await expect(page.locator('#event-end')).toHaveValue('2026-10-15T09:00');
      await expect(page.locator('#event-end')).toHaveAttribute('aria-invalid','true');
      await expect(page.locator('#event-end')).toHaveAttribute('aria-describedby','event-end-error');
      await expect(page.locator('#event-end')).toBeFocused();
      await expect(page.locator('#event-end-error')).toHaveText('End must be after start.');
      await visibleInCrop(page.locator('#event-end'));await visibleInCrop(page.locator('#event-end-error'));
      await expect(page.locator('#collab-panel')).toHaveClass(/open/);
      await expect(page.locator('[role="alertdialog"]:visible, .toast:visible')).toHaveCount(0);
    }
    if(state.fixture==='invoice') {
      await invoice(page);
      await page.evaluate(()=>document.activeElement?.blur());
      await page.locator(state.target.locator).evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
      await page.locator('.inv-grid-wrap').evaluate((el,{end,rtl})=>{el.scrollLeft=end?(rtl?-1:1)*(el.scrollWidth-el.clientWidth):0;},{end:id==='invoice-lines-end',rtl});
      if(id==='invoice-tax-totals' && touch) {
        await page.locator('.frame').scrollIntoViewIfNeeded();
        await page.mouse.move(0,0);
        await page.locator('.nc2-rail').evaluate(rail=>Promise.all(rail.getAnimations().map(animation=>animation.finished)));
        await settle(page);
        const neutral=await page.locator('.nc2-rail').evaluate(rail=>({
          visualOffsets:{x:visualViewport.offsetLeft,y:visualViewport.offsetTop},
          hovered:rail.matches(':hover'),focusedWithin:rail.matches(':focus-within'),
          width:rail.getBoundingClientRect().width,
          reservation:rail.closest('.side').getBoundingClientRect().width,
        }));
        assert.deepEqual(neutral.visualOffsets,{x:0,y:0},'Invoice visual viewport must return to origin');
        assert.equal(neutral.hovered,false,'Invoice navigation rail must not be hovered');
        assert.equal(neutral.focusedWithin,false,'Invoice navigation rail must not contain focus');
        assert.equal(neutral.width,neutral.reservation,'Settled rail must match collapsed sidebar reservation');
      }
      if(id.startsWith('invoice-lines')) {
        const grid=page.locator('.inv-grid-wrap');
        const scroll=await grid.evaluate(el=>({left:el.scrollLeft,max:el.scrollWidth-el.clientWidth}));
        assert(Math.abs(scroll.left-(id==='invoice-lines-end'?(rtl?-1:1)*scroll.max:0))<=1);
        if(id==='invoice-lines-end') assert(scroll.max>0);
        const columns=touch?(id==='invoice-lines-end'?[10,11]:[0,1,2]):Array.from({length:12},(_,i)=>i);
        for(const col of columns) {
          await visibleInCrop(grid.locator('thead th').nth(col));
          for(const row of await page.locator('#items-body > tr').all()) await visibleInCrop(row.locator('input').nth(col));
        }
        const geometry=await grid.evaluate(el=>({headerBottom:el.querySelector('thead').getBoundingClientRect().bottom,rowTop:el.querySelector('tbody tr').getBoundingClientRect().top,positions:[...el.querySelectorAll('thead th')].map(th=>getComputedStyle(th).position)}));
        assert(Math.abs(geometry.headerBottom-geometry.rowTop)<=1);
        assert(geometry.positions.every(p=>p==='static'));
      }
      if(id==='invoice-charges') {
        await visibleInCrop(page.locator('#invoice-adjustments-title'));
        for(const field of await page.locator('[data-adjustment-kind="charge"] input, [data-adjustment-kind="charge"] select').all()) await visibleInCrop(field);
      }
      if(id==='invoice-tax-totals') for(const output of await page.locator('.rec-summary output').all()) {
        await visibleInCrop(output); await visibleInCrop(output.locator('..'));
      }
    }
    if(state.fixture==='signed-out') {
      if(id==='signin-unknown-workspace') {
        await page.locator('#si-email').fill('unknown@acme.local');await page.locator('#si-to2').click();
        await expect(page.locator('#si-discovery-message bdi')).toHaveAttribute('dir','ltr');
        await expect(page.locator('#si-discovery-message bdi')).toHaveText('unknown@acme.local');
        await expect(page.locator('#si-discovery-message')).toHaveText(rtl?'لم نعثر على مساحة عمل Skey للبريد unknown@acme.local.':"We couldn't find a Skey workspace for unknown@acme.local.");
        await expect(page.locator('#si-discovery [data-si-goto="request"]')).toBeVisible();
      }
      if(id==='signin-password-identity') {
        await page.locator('#si-email').fill('admin@lastchance.local');await page.locator('#si-to2').click();
        await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');await page.locator('#si-branch-go').click();
        await expect(page.locator('[data-si-pane="2"]')).toBeVisible();
        await expect(page.locator('#si-who')).toHaveText('admin@lastchance.local · lastchance.skeyerp.com · Cairo HQ');
        const auth=page.locator('#si-auth-email');await expect(auth).toBeHidden();await expect(auth).toHaveAttribute('readonly','');await expect(auth).toHaveAttribute('autocomplete','username');await expect(auth).toHaveValue('admin@lastchance.local');
        const pass=page.locator('#si-pass');await expect(pass).toHaveValue('');await expect(pass).toHaveAttribute('type','password');await expect(pass).toHaveAttribute('dir','ltr');await expect(pass).toHaveAttribute('autocomplete','current-password');await expect(pass).toBeFocused();
        await expect(page.locator('[data-si-err]')).toBeHidden();await expect(page.locator('#si-usepin')).toBeHidden();
      } else {
        await expect(page.locator('[data-si-pane="1"]')).toBeVisible();await expect(page.locator('#si-email')).toBeFocused();
        for(const [attribute,value] of Object.entries({type:'email',autocomplete:'username',inputmode:'email',autocapitalize:'off',dir:'ltr'})) await expect(page.locator('#si-email')).toHaveAttribute(attribute,value);
        if(id==='signin-email') {await expect(page.locator('#si-email')).toHaveValue('');await expect(page.locator('#si-discovery')).toBeHidden();await expect(page.locator('#si-email-error')).toBeHidden();}
        await expect(page.locator('#si-to2')).toHaveCount(1);
      }
      await expect(page.locator('[data-si-pane="device"], [data-si-pane="workspaces"]')).toHaveCount(0);
      for(const pane of ['save','savepin','pin','request']) await expect(page.locator(`[data-si-pane="${pane}"]`)).toBeHidden();
      await expect(page.locator('body')).toHaveClass(/signed-out/);
    }
    await settle(page);
    assert.deepEqual(page.viewportSize(),state.fixture==='invoice'&&invoiceViewportOverride?invoiceViewportOverride:project.viewport);
    const common=await page.evaluate(()=>({lang:document.documentElement.lang,dir:getComputedStyle(document.documentElement).direction,
      controls:Object.fromEntries(['theme','density','interface-scale','content-layout','active-role'].map(id=>[id,document.getElementById(id)?.value])),
      state:JSON.parse(sessionStorage.getItem('skey-proto-state')),accounts:JSON.parse(localStorage.getItem('skey-proto-accounts')||'[]'),legacy:localStorage.getItem('skey-proto-cred'),
      collab:sessionStorage.getItem('skey-proto-collab'),menus:document.querySelectorAll('details[open], .mlist.open').length,date:new Date().toISOString()}));
    assert.equal(common.lang,applicationLocale);assert.equal(common.dir,effectiveDirection);
    assert.deepEqual(common.controls,{theme:'system',density:'default','interface-scale':'100','content-layout':'fluid','active-role':'administrator'});
    assert.equal(common.state['signed-in'],state.fixture!=='signed-out');assert.equal(common.state.launchpad,true);assert.equal(common.state['simulate-loading'],false);
    assert.deepEqual(common.accounts,[]);assert.equal(common.legacy,null);assert.equal(common.menus,0);assert.equal(common.date,manifest.runtime.browserDateFixed);
    if(id==='mail-reading-e1') {
      const saved=JSON.parse(common.collab);assert.equal(saved.version,1);assert.equal(saved.seq,1000);assert.deepEqual(saved.folders,[]);
      const expected=structuredClone(fixture.COLLAB_SEED);
      const e1=expected.entities.mail.find(e=>e.id==='e1');e1.unread=false;e1.updatedAt=fixture.PROTOTYPE_NOW;
      assert.deepEqual(saved.entities,expected.entities);assert.deepEqual(saved.links,expected.links);
    } else assert.equal(common.collab,null,'Unapproved collaboration mutation/autosave');
    if(rtl) {
      const heading=state.fixture==='invoice'?page.locator('#invoice-adjustments-title'):state.fixture==='signed-out'?page.locator('.signin-view [data-si-pane]:not([hidden]) h1'):page.locator(`${root} h1`);
      assert(/[\u0600-\u06ff]/.test(await heading.textContent()),'Actual Arabic content required');
    }
    const target=state.target.mode==='element'?page.locator(state.target.locator):null;
    if(target) await visibleInCrop(target);
    const geometry=await page.evaluate(selector=>{
      const el=selector?document.querySelector(selector):null,r=el?el.getBoundingClientRect():{x:0,y:0,width:innerWidth,height:innerHeight};
      const doc={x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};
      return {rect:doc,clip:{x:Math.floor(doc.x),y:Math.floor(doc.y),width:Math.ceil(doc.x+doc.width)-Math.floor(doc.x),height:Math.ceil(doc.y+doc.height)-Math.floor(doc.y)},scrolls:[...document.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({tag:el.tagName,id:el.id,className:el.className,left:el.scrollLeft,top:el.scrollTop}))};
    },state.target.locator||null);
    const after=await page.evaluate(async()=>{const get=()=>[...document.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({tag:el.tagName,id:el.id,className:el.className,left:el.scrollLeft,top:el.scrollTop}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return get();});
    assert.deepEqual(after,geometry.scrolls,'Scroll positions unstable over two frames');
    let image;
    if(mode==='capture') {
      const options={animations:'disabled',caret:'hide',scale:'css'};
      const buffer=target?await target.screenshot(options):await page.screenshot({...options,fullPage:false});
      await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,buffer,{flag:'wx'});imageCreated=true;
      image={bytes:buffer.length,sha256:sha(buffer),width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
    }
    return {project:name,name:state.name,destination,status:'passed',...geometry,locale:common.lang,direction:common.dir,image};
  } catch(error) {
    return {project:name,name:state.name,destination,status:'failed',imageCreated,error:error.stack};
  } finally {await context.close();}
}
const results=[];let cursor=0,failed=false;
const browser=await chromium.launch();
assert.equal(browser.version(),manifest.runtime.browserRevisions[0].browserVersion);
async function worker() {
  while(!failed && cursor<entries.length) {
    const entry=entries[cursor++];const result=await runEntry(browser,entry);results.push(result);
    console.log(`${result.status}: ${result.project}/${result.name}`);
    if(result.status==='failed') {failed=true;console.error(result.error);}
  }
}
try {await Promise.all([worker(),worker()]);} finally {await browser.close();}
await writeFile(path.join(evidence,`${mode}.json`),JSON.stringify({mode,sourceRevision:build.sourceRevision,manifestSha256,runnerSha256,buildFiles:build.files,browserVersion:manifest.runtime.browserRevisions[0].browserVersion,results,unrun:entries.filter(e=>!results.some(r=>r.destination===e.destination)).map(e=>e.destination)},null,2)+'\n');
console.log(`${results.filter(r=>r.status==='passed').length}/${entries.length} passed; ${results.filter(r=>r.status==='failed').length} failed; ${entries.length-results.length} unrun`);
if(failed || results.length!==128) process.exitCode=1;
