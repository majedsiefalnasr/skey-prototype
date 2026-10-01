import {chromium} from 'playwright';
import {openSurface, settle} from './tests/support/browser.mjs';

const BASE = 'http://127.0.0.1:4173';
const PROPS = ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','rowGap','columnGap','minHeight'];
const SURFACES = ['launchpad','list','record','customers-list','customer-record','geo-list','geo-record','email'];

const setD = async (page, d) => {
  await page.evaluate((d) => {
    const e = document.querySelector('#density');
    if (!e) throw new Error('no #density');
    e.value = d;
    e.dispatchEvent(new Event('change', {bubbles: true}));
  }, d);
  await page.waitForTimeout(220);
};

const snap = (page) => page.evaluate((PROPS) => {
  const out = [];
  for (const el of document.querySelectorAll('body, body *')) {
    if (!el.checkVisibility || !el.checkVisibility({checkOpacity: false, checkVisibilityCSS: true})) continue;
    if (!el.__sid) { document.__sidSeq = (document.__sidSeq || 0) + 1; el.__sid = document.__sidSeq; }
    const cs = getComputedStyle(el);
    out.push({
      id: el.__sid,
      key: `${el.tagName}|${(typeof el.className === 'string' ? el.className : '').slice(0,60)}`,
      vals: PROPS.map(p => cs[p]),
      chain: (() => { const a=[]; let n=el; for (let k=0;k<4 && n && n!==document.body; k++,n=n.parentElement) a.push((n.tagName||'').toLowerCase()+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ')[0]:'')); return a.join(' < '); })(),
    });
  }
  return out;
}, PROPS);

const num = (v) => { const m = /^(-?[\d.]+)px$/.exec(v); return m ? parseFloat(m[1]) : null; };

const byId = (rows) => new Map(rows.map(r => [r.id, r]));

const never = new Map();      // sig -> {count, sample}
const wrong = new Map();      // sig -> {count, detail, sample}
const oneway = new Map();     // sig -> info

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});

for (const s of SURFACES) {
  await page.goto(`${BASE}/concepts/app-shell.html`, {waitUntil: 'networkidle'});
  await page.waitForTimeout(500);
  try { await openSurface(page, s); } catch (e) { console.error(`openSurface(${s}) failed: ${e.message}`); continue; }
  try { await settle(page); } catch {}
  await page.waitForTimeout(400);

  await setD(page, 'default');
  const A = byId(await snap(page));
  await setD(page, 'compact');
  const B = byId(await snap(page));
  await setD(page, 'comfortable');
  const C = byId(await snap(page));

  for (const [id, a] of A) {
    const b = B.get(id), c = C.get(id);
    if (!b || !c) continue;
    const hasOwn = a.vals.some((v, i) => {
      const n = num(v);
      if (PROPS[i] === 'rowGap' || PROPS[i] === 'columnGap') return v !== 'normal';
      if (PROPS[i] === 'minHeight') return n !== null && n !== 0 && v !== 'auto';
      return n !== null && n !== 0;
    });
    const same = a.vals.every((v, i) => v === b.vals[i] && v === c.vals[i]);
    const sample = `${a.key}\n     pad ${a.vals.slice(0,4).join('/')} mar ${a.vals.slice(4,6).join('/')} gap ${a.vals.slice(6,8).join('/')} minH ${a.vals[8]}\n     ${a.chain}`;

    if (hasOwn && same) {
      const e = never.get(a.key) || {count: 0, sample};
      e.count++; never.set(a.key, e);
      continue;
    }
    // direction
    for (let i = 0; i < PROPS.length; i++) {
      const o = num(a.vals[i]), cp = num(b.vals[i]), cf = num(c.vals[i]);
      if (o === null || (cp === null && cf === null)) continue;
      const grow = PROPS[i].startsWith('margin') || PROPS[i].startsWith('padding') || PROPS[i].startsWith('row') || PROPS[i].startsWith('column') || PROPS[i] === 'minHeight';
      if (!grow) continue;
      const badCp = cp !== null && cp > o + 0.01;
      const badCf = cf !== null && cf < o - 0.01;
      if (badCp || badCf) {
        const k = `${a.key} :: ${PROPS[i]}`;
        const e = wrong.get(k) || {count: 0, detail: `${a.vals[i]} -> ${b.vals[i]} -> ${c.vals[i]}`, sample};
        e.count++; wrong.set(k, e);
      }
    }
    const bDiff = a.vals.some((v, i) => v !== b.vals[i]);
    const cDiff = a.vals.some((v, i) => v !== c.vals[i]);
    if (bDiff !== cDiff) {
      const k = a.key;
      const e = oneway.get(k) || {count: 0, dir: bDiff ? 'compact-only' : 'comfortable-only', sample};
      e.count++; oneway.set(k, e);
    }
  }
  console.error(`scanned ${s}: ${A.size} elements`);
}

const total = (m) => [...m.values()].reduce((n, v) => n + v.count, 0);
const sort = (m) => [...m.entries()].sort((x, y) => y[1].count - x[1].count);

console.log(`===== DIRECTION / WRONG (${total(wrong)} elements, ${wrong.size} signatures) =====`);
for (const [k, v] of sort(wrong)) console.log(` ×${String(v.count).padStart(4)} ${k}  ${v.detail}\n      ${v.sample.split('\n').join('\n      ')}`);

console.log(`\n===== ONE-WAY (${total(oneway)} elements, ${oneway.size} signatures) =====`);
for (const [k, v] of sort(oneway)) console.log(` ×${String(v.count).padStart(4)} [${v.dir}] ${k}`);

console.log(`\n===== NEVER RESPONDS, HAS OWN SPACING (${never.size} signatures, ${total(never)} elements) =====`);
for (const [k, v] of sort(never)) console.log(` ×${String(v.count).padStart(4)} ${k}\n      ${v.sample.split('\n').join('\n      ')}`);

await browser.close();
