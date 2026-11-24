import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIEWPORT_BREAKPOINTS, belowQuery, maxWidthQuery} from '../concepts/app/core/breakpoints.js';

const stylesheet = readFileSync(new URL('../concepts/app/styles/tailwind.css', import.meta.url), 'utf8');

function themeBreakpoints(pattern) {
  const pairs = [...stylesheet.matchAll(pattern)];
  return new Map(pairs.map(([, name, value]) => [name, Number(value)]));
}

test('every scripted breakpoint mirrors a --breakpoint-* theme token', () => {
  const tokens = new Map([
    ...themeBreakpoints(/--breakpoint-(?!legacy-)([a-z]+\d*):\s*(\d+)px;/g),
    ...[...themeBreakpoints(/--breakpoint-legacy-(\d+):\s*(\d+)px;/g)].map(([name, value]) => [`legacy${name}`, value])
  ]);
  for (const [key, value] of Object.entries(VIEWPORT_BREAKPOINTS)) {
    assert.equal(tokens.get(key), value, `the theme token for ${key} must be ${value}px`);
  }
});

test('each --breakpoint-legacy-* token is named for its own pixel value', () => {
  for (const [name, value] of themeBreakpoints(/--breakpoint-legacy-(\d+):\s*(\d+)px;/g)) assert.equal(Number(name), value);
});

test('the ADS breakpoint tokens match the Atlassian Design System steps', () => {
  const tokens = themeBreakpoints(/--breakpoint-(?!legacy-)([a-z]+\d*):\s*(\d+)px;/g);
  assert.deepEqual(Object.fromEntries(tokens), {xs: 480, sm: 768, md: 1024, lg: 1440, xl: 1768});
});

test('maxWidthQuery builds the media query the shell used before', () => {
  assert.equal(maxWidthQuery('legacy900'), '(max-width: 900px)');
});

test('belowQuery matches the boundary of Tailwind max-sm:', () => {
  assert.equal(belowQuery('sm'), '(width < 768px)');
});
