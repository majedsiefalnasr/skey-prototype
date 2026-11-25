// PROTOTYPE, throwaway. Builds zoomed A/B/C crops of one real element per legacy token.
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openSurface} from '../tests/support/browser.mjs';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4180';
const OUT = process.argv[2] ?? '/private/tmp/skey-proto-27-out';
const SAMPLES = [
  {token: 3, width: 1440, screen: 'customers-list', open: page => openSurface(page, 'customers-list')},
  {token: 5, width: 1440, screen: 'invoice-list', open: page => openSurface(page, 'list')},
  {token: 7, width: 1440, screen: 'home', open: page => openSurface(page, 'launchpad')},
  {token: 9, width: 1440, screen: 'email', open: page => openSurface(page, 'email')},
  {token: 10, width: 1440, screen: 'home', open: page => openSurface(page, 'launchpad')},
  {token: 14, width: 1440, screen: 'home', open: page => openSurface(page, 'launchpad')},
];
const SENTINEL = {1: 1.5, 3: 3.5, 5: 5.5, 7: 7.5, 9: 9.5, 10: 10.5, 11: 11.5, 14: 14.5};
const VALUES = {
  A: {1: 1, 3: 3, 5: 5, 7: 7, 9: 9, 10: 10, 11: 11, 14: 14},
  B: {1: 2, 3: 2, 5: 4, 7: 6, 9: 8, 10: 8, 11: 12, 14: 12},
  C: {1: 2, 3: 4, 5: 6, 7: 8, 9: 8, 10: 12, 11: 12, 14: 16},
};

async function main() {
  await mkdir(path.join(OUT, 'zoom'), {recursive: true});
  const browser = await chromium.launch();
  const rows = [];
  for (const sample of SAMPLES) {
    const context = await browser.newContext({viewport: {width: sample.width, height: 900}, deviceScaleFactor: 4, reducedMotion: 'reduce'});
    await context.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
    const page = await context.newPage();
    await page.clock.install({time: Date.parse('2026-09-13T09:00:00+02:00')});
    await page.goto(`${BASE}/concepts/app-shell.html`);
    await page.clock.resume();
    await page.waitForFunction(() => window.__radiusPrototype);
    if (await page.locator('#simulate-loading').isChecked()) await page.locator('#simulate-loading').uncheck();
    await sample.open(page);
    await page.waitForTimeout(900);
    await page.addStyleTag({content: '[data-radius-prototype],#kit,#kit-pill{display:none!important}'});
    const found = await page.evaluate(({token, sentinel}) => {
      const root = document.documentElement;
      for (const [id, px] of Object.entries(sentinel)) root.style.setProperty(`--ds-radius-legacy-${id}`, `${px}px`);
      const wanted = sentinel[token];
      for (const node of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(node);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const corners = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(parseFloat);
        if (!corners.includes(wanted)) continue;
        node.scrollIntoView({block: 'center'});
        const rect = node.getBoundingClientRect();
        if (rect.width < 24 || rect.height < 16) continue;
        if (rect.top < 0 || rect.left < 0 || rect.top + 40 > innerHeight || rect.left + 40 > innerWidth) continue;
        return {x: rect.x, y: rect.y, w: rect.width, h: rect.height, tag: node.tagName.toLowerCase(), cls: String(node.className).slice(0, 60), text: (node.textContent || '').trim().slice(0, 30)};
      }
      return null;
    }, {token: sample.token, sentinel: SENTINEL});
    if (!found) {
      rows.push({...sample, error: 'no sample element'});
      await context.close();
      continue;
    }
    const pad = 10;
    const clip = {x: Math.max(0, found.x - pad), y: Math.max(0, found.y - pad), width: Math.min(found.w, 130) + pad * 2, height: Math.min(found.h, 70) + pad * 2};
    const images = {};
    for (const variant of ['A', 'B', 'C']) {
      await page.evaluate(values => {
        for (const [id, px] of Object.entries(values)) document.documentElement.style.setProperty(`--ds-radius-legacy-${id}`, `${px}px`);
      }, VALUES[variant]);
      await page.waitForTimeout(80);
      const buffer = await page.screenshot({clip});
      images[variant] = buffer.toString('base64');
      await writeFile(path.join(OUT, 'zoom', `r${sample.token}-${sample.screen}-${variant}.png`), buffer);
    }
    rows.push({token: sample.token, screen: sample.screen, found, images, from: VALUES.A[sample.token], B: VALUES.B[sample.token], C: VALUES.C[sample.token]});
    await context.close();
  }

  const sheetContext = await browser.newContext({viewport: {width: 1500, height: 400}});
  const sheet = await sheetContext.newPage();
  const html = rows.filter(row => !row.error).map(row => `
    <section>
      <h2>legacy-${row.token} (${row.from}px) on ${row.screen}: <code>${row.found.tag}</code> ${row.found.text ? `"${row.found.text}"` : ''}</h2>
      <div class="row">
        ${['A', 'B', 'C'].map(variant => `<figure><img src="data:image/png;base64,${row.images[variant]}"><figcaption>${variant}: ${variant === 'A' ? `${row.from}px current` : `${row[variant]}px`}</figcaption></figure>`).join('')}
      </div>
    </section>`).join('');
  await sheet.setContent(`<style>body{font:14px system-ui;margin:20px;background:#fff;color:#172b4d}h2{font-size:14px;margin:18px 0 6px}.row{display:flex;gap:24px;align-items:flex-start}figure{margin:0;border:1px solid #dcdfe4;padding:6px}img{display:block;width:auto;height:auto;max-width:440px;image-rendering:auto;zoom:1}figcaption{font-weight:600;margin-top:4px}</style>${html}`);
  await sheet.waitForTimeout(300);
  await sheet.screenshot({path: path.join(OUT, 'zoom-sheet.png'), fullPage: true});
  await browser.close();
  console.log(JSON.stringify(rows.map(row => row.error ? row : {token: row.token, screen: row.screen, tag: row.found.tag, cls: row.found.cls, text: row.found.text, w: Math.round(row.found.w), h: Math.round(row.found.h)}), null, 1));
}

await main();
