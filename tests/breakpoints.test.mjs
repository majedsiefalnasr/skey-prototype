import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIEWPORT_BREAKPOINTS, maxWidthQuery} from '../concepts/app/core/breakpoints.js';

const stylesheet = readFileSync(new URL('../concepts/app/styles/tailwind.css', import.meta.url), 'utf8');

function themeBreakpoints() {
  const pairs = [...stylesheet.matchAll(/--breakpoint-legacy-(\d+):\s*(\d+)px;/g)];
  return new Map(pairs.map(([, name, value]) => [name, Number(value)]));
}

test('every scripted breakpoint mirrors a --breakpoint-legacy-* theme token', () => {
  const tokens = themeBreakpoints();
  for (const [key, value] of Object.entries(VIEWPORT_BREAKPOINTS)) {
    const name = key.replace('legacy', '');
    assert.equal(tokens.get(name), value, `--breakpoint-legacy-${name} must be ${value}px`);
  }
});

test('each --breakpoint-legacy-* token is named for its own pixel value', () => {
  for (const [name, value] of themeBreakpoints()) assert.equal(Number(name), value);
});

test('maxWidthQuery builds the media query the shell used before', () => {
  assert.equal(maxWidthQuery('legacy720'), '(max-width: 720px)');
  assert.equal(maxWidthQuery('legacy900'), '(max-width: 900px)');
});
