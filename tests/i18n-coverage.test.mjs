import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createLocale} from '../concepts/app/core/locale.js';

const app = new URL('../concepts/app/', import.meta.url);
const arabic = createLocale();
arabic.setLocale('ar');
const hasEnglish = value => /[A-Za-z]{3,}/.test(value);
const hasArabic = value => /[\u0600-\u06ff]/.test(value);

async function filesBelow(url) {
  const entries = await readdir(url, {withFileTypes: true});
  return (await Promise.all(entries.map(entry => {
    const next = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    return entry.isDirectory() ? filesBelow(next) : [next];
  }))).flat();
}

// Bound the scan to toast object arguments, respecting quoted strings so a
// brace in copy cannot end the argument early. This checks catalog coverage,
// while delivery-locale.spec exercises the actual toast rendering boundary.
function toastObjects(source) {
  const result = [];
  const starts = /\btoast\s*\(\s*\{/g;
  for (const match of source.matchAll(starts)) {
    const start = match.index + match[0].length - 1;
    let depth = 0, quote = '', escaped = false;
    for (let index = start; index < source.length; index++) {
      const char = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
      } else if ('\'"`'.includes(char)) quote = char;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        result.push(source.slice(start, index + 1));
        break;
      }
    }
  }
  return result;
}

test('every literal toast title in app modules has Arabic catalog coverage', async () => {
  let checked = 0;
  const missing = [];
  for (const file of (await filesBelow(app)).filter(file => file.pathname.endsWith('.js'))) {
    const source = await readFile(file, 'utf8');
    for (const object of toastObjects(source)) {
      for (const match of object.matchAll(/\btitle\s*:\s*(?:(?:uiLocale\.)?t\(\s*)?('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/g)) {
        if (match[1].startsWith('`') && match[1].includes('${')) continue;
        const title = runInNewContext(match[1], Object.create(null), {timeout: 100});
        if (!hasEnglish(title)) continue;
        checked++;
        if (!hasArabic(arabic.t(title))) missing.push(`${file.pathname}: ${title}`);
      }
    }
  }
  assert.ok(checked >= 100, `expected the full toast catalog, checked ${checked}`);
  assert.deepEqual(missing, []);
});

const dialogs = [
  'pages/invoices/record-dialogs.html', 'pages/invoices/print-dialog.html',
  'pages/customers/dialogs.html', 'pages/geography/dialogs.html',
  'components/data-list/list-dialogs.html',
];
const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'use', 'path']);

test('translated options declare stable values independent of their labels', async () => {
  const implicit = [];
  for (const file of (await filesBelow(app)).filter(file => file.pathname.endsWith('.html'))) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)) {
      if (match[1].includes('data-i18n') && !/\bvalue\s*=/.test(match[1])) implicit.push(`${file}: ${match[2].trim()}`);
    }
  }
  assert.deepEqual(implicit, []);
});

test('dialog text is localized or explicitly supplied by the dynamic invoice binding', async () => {
  const missing = [];
  for (const file of dialogs) {
    const source = await readFile(new URL(file, app), 'utf8');
    const stack = [];
    // Quote-aware HTML tokens: utility classes can contain literal > signs.
    const tokens = source.match(/<!--[\s\S]*?-->|<\/?[A-Za-z](?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/g) ?? [];
    for (const token of tokens) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) {
        const tag = token.match(/^<\/([\w-]+)/)[1];
        const index = stack.findLastIndex(node => node.tag === tag);
        if (index >= 0) stack.splice(index);
      } else if (token.startsWith('<')) {
        const tag = token.match(/^<([\w-]+)/)[1];
        const attrs = Object.fromEntries([...token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3]]));
        if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push({tag, attrs});
      } else if (hasEnglish(token)) {
        const localized = stack.some(node => node.attrs['data-i18n']);
        // These four nodes are rewritten from the selected invoice each time
        // the dialog opens; a static data-i18n key would overwrite its number.
        const dynamic = stack.some(({attrs}) =>
          ['pf-title', 'del-title', 'cf-title'].includes(attrs.id) ||
          (file === 'pages/invoices/print-dialog.html' && attrs.class === 'dhd-subtitle'));
        if (!localized && !dynamic) missing.push(`${file}: ${token.trim()}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
