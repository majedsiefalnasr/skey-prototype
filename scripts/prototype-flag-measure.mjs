// PROTOTYPE, throwaway. Measures the four Flag tones for #17 on /system/profile: title and body font,
// text contrast, dismiss button, Escape, width and sideways overflow. 1440px in light, dark and
// high contrast light, 390px in light, both directions. One flag at a time, English sample text.
// Usage: node scripts/prototype-flag-measure.mjs <out.json>  (needs the dev server: node scripts/dev.mjs, port 4173)
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2];
const TONES = ['ok', 'info', 'warn', 'bad'];
const MODES = [
  {name: 'light', theme: 'light', hc: false},
  {name: 'dark', theme: 'dark', hc: false},
  {name: 'hc-light', theme: 'light', hc: true},
];
const message = tone => ({tone, title: `${tone} flag title that is long enough to wrap onto a second line`, body: 'Body text explains what happened and what to do next.', action: 'Undo', ms: 600000});

async function setControl(page, id, value) {
  await page.locator(`#${id}`).evaluate((control, value) => {
    if (control.type === 'checkbox') {
      if (control.checked === value) return;
      control.checked = value;
    } else control.value = value;
    control.dispatchEvent(new Event('change', {bubbles: true}));
  }, value);
}

function measure(node) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const rgb = color => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const lum = ([r, g, b]) => [r, g, b].map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (fg, bg) => {
    const [a, b] = [lum(rgb(fg)), lum(rgb(bg))].sort((x, y) => y - x);
    return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
  };
  const r = node.getBoundingClientRect();
  const bg = getComputedStyle(node).backgroundColor;
  const title = node.querySelector('h2');
  const ts = title && getComputedStyle(title);
  const body = node.querySelector('p');
  const bs = body && getComputedStyle(body);
  const close = node.querySelector('.x')?.getBoundingClientRect();
  return {
    flagLeft: Math.round(r.left), flagRight: Math.round(r.right), flagWidth: Math.round(r.width), flagBottom: Math.round(r.bottom), viewportHeight: innerHeight,
    role: node.getAttribute('role'),
    title: ts && `${title.tagName} ${ts.fontSize}/${ts.lineHeight} ${ts.fontWeight}`,
    body: bs && `${bs.fontSize}/${bs.lineHeight}`,
    titleContrast: ts && ratio(ts.color, bg),
    bodyContrast: bs && ratio(bs.color, bg),
    dismiss: close ? `${Math.round(close.width)}x${Math.round(close.height)}` : null,
    overflow: [...node.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible').length,
    pageScrollX: document.scrollingElement.scrollWidth - document.documentElement.clientWidth,
  };
}

const browser = await chromium.launch();
const rows = [];
for (const width of [1440, 390]) {
  for (const rtl of [false, true]) {
    for (const mode of MODES) {
      if (width === 390 && mode.name !== 'light') continue;
      const context = await browser.newContext({viewport: {width, height: 800}, reducedMotion: 'reduce', hasTouch: width < 600, isMobile: width < 600});
      const page = await context.newPage();
      await page.goto(BASE + '/system/profile');
      await page.locator('.profile-view').waitFor();
      await setControl(page, 'theme', mode.theme);
      await setControl(page, 'high-contrast', mode.hc);
      await setControl(page, 'rtl', rtl);
      const minimize = page.locator('#kit-min');
      if (await minimize.isVisible()) await minimize.click();
      for (const tone of TONES) {
        await page.evaluate(async msg => {
          const host = document.getElementById('toasts');
          for (const node of [...host.children]) node.remove();
          const {createToast} = await import('/concepts/app/components/toast/toast.js');
          window.__probeToast ??= createToast(host);
          window.__probeToast({...msg, onAction() {}});
        }, message(tone));
        await page.waitForTimeout(350);
        const flag = page.locator('#toasts > *').last();
        const info = await flag.evaluate(measure);
        let flagsLeftAfterEscape = null;
        if (info.dismiss) {
          await flag.locator('.x').focus();
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          flagsLeftAfterEscape = await page.locator('#toasts > *:not([data-exit])').count();
        }
        rows.push({viewport: width, dir: rtl ? 'rtl' : 'ltr', mode: mode.name, tone, ...info, flagsLeftAfterEscape});
      }
      await context.close();
    }
  }
}
await browser.close();

await mkdir(path.dirname(OUT), {recursive: true});
await writeFile(OUT, JSON.stringify({
  issue: 17,
  method: 'createToast from concepts/app/components/toast/toast.js on /system/profile, one flag at a time, reduced motion, English sample text. Contrast is title and body colour against the flag background. Escape is pressed with focus on the dismiss button.',
  notMeasured: ['avoid (lifting the flag above a phone action)', 'several stacked flags with Escape', 'Arabic text', 'dark and high contrast at 390px', 'motion'],
  rows,
}, null, 2) + '\n');
