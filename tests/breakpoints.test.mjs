import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIEWPORT_BREAKPOINTS, belowQuery, maxWidthQuery} from '../concepts/app/core/breakpoints.js';

const stylesheet = readFileSync(new URL('../concepts/app/styles/tailwind.css', import.meta.url), 'utf8');
const REM_IN_PX = 16;

function themeBreakpoints(pattern) {
  const pairs = [...stylesheet.matchAll(pattern)];
  return new Map(pairs.map(([, name, value]) => [name, Number(value)]));
}

test('every scripted breakpoint mirrors a --breakpoint-* theme token', () => {
  const tokens = new Map([
    ...themeBreakpoints(/--breakpoint-(?!legacy-)([a-z]+\d*):\s*([\d.]+)rem;/g),
    ...[...themeBreakpoints(/--breakpoint-legacy-(\d+):\s*([\d.]+)rem;/g)].map(([name, value]) => [`legacy${name}`, value])
  ]);
  for (const [key, value] of Object.entries(VIEWPORT_BREAKPOINTS)) {
    assert.equal(tokens.get(key), value, `the theme token for ${key} must be ${value}rem`);
  }
});

test('each --breakpoint-legacy-* token is named for its own pixel value at a 16px root', () => {
  for (const [name, value] of themeBreakpoints(/--breakpoint-legacy-(\d+):\s*([\d.]+)rem;/g)) assert.equal(Number(name), value * REM_IN_PX);
});

test('every --breakpoint-* token is written in rem, never px', () => {
  const declarations = [...stylesheet.matchAll(/--breakpoint-(?!2xl)[\w-]+:\s*([^;]+);/g)];
  assert.ok(declarations.length > 0);
  for (const [declaration, value] of declarations) assert.match(value, /^[\d.]+rem$/, declaration);
});

test('the ADS breakpoint tokens match the Atlassian Design System steps', () => {
  const tokens = themeBreakpoints(/--breakpoint-(?!legacy-)([a-z]+\d*):\s*([\d.]+)rem;/g);
  assert.deepEqual(Object.fromEntries(tokens), {xs: 30, sm: 48, md: 64, lg: 90, xl: 110.5});
});

test('maxWidthQuery builds the media query the shell used before', () => {
  assert.equal(maxWidthQuery('legacy900'), '(max-width: 56.25rem)');
});

test('belowQuery matches the boundary of Tailwind max-sm:', () => {
  assert.equal(belowQuery('sm'), '(width < 48rem)');
});
