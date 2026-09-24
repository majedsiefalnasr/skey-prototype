import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat} from 'node:fs/promises';
import {test} from 'node:test';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {compileTailwind} from '../scripts/tailwind.mjs';

const task4DynamicClassFiles = [
  'concepts/app/components/data-list/date-fields.js',
  'concepts/app/components/data-list/footer.js',
  'concepts/app/components/data-list/list.js',
  'concepts/app/components/data-list/menu-controller.js',
  'concepts/app/components/data-list/pagination.js',
  'concepts/app/components/data-list/views.js',
  'concepts/app/components/notifications/notifications.js',
  'concepts/app/pages/invoices/activity.js',
  'concepts/app/pages/invoices/kanban.js',
  'concepts/app/pages/list-cards.js',
];

function literalClassGroups(source, file) {
  return [...source.matchAll(/(?:export\s+)?const\s+([A-Z][A-Z0-9_]*_CLASS)\s*=\s*(['"])(.*?)\2/g)]
    .map(([, name, , utilities]) => ({name, utilities, file}));
}

function cssClassSelector(utility) {
  return `.${utility.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}`;
}

const semanticActivityClasses = new Set([
  'drnote', 'card', 'mk', 'dot', 'main', 't', 'k', 'lnk', 'daysep', 'act',
  'av', 'sys', 'line', 'tm', 'chg', 'chips', 'chip', 'tg', 'ntg', 'notes',
  'note-i', 'av2', 'who', 'txt',
]);

const activityIconButtonUtilities = [
  'relative', 'inline-flex', 'min-h-8', 'min-w-8', 'items-center', 'justify-center',
  'gap-1.5', 'rounded-md', 'px-2', 'py-1', 'hover:enabled:bg-[var(--line-2)]',
  'focus-visible:outline-2', 'focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--focus)]',
];
const activitySecondaryButtonUtilities = [
  'inline-flex', 'items-center', 'gap-1.5', 'rounded-md', 'border', 'border-line',
  'bg-surface', 'px-[11px]', 'py-1.5', 'font-medium', 'whitespace-nowrap',
  'hover:enabled:bg-[var(--line-2)]', 'disabled:cursor-not-allowed',
  'disabled:opacity-50', 'focus-visible:outline-2', 'focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--focus)]',
];
const activityPrimaryButtonUtilities = [
  'inline-flex', 'items-center', 'gap-1.5', 'rounded-md', 'border',
  'border-transparent', 'bg-accent', 'px-[11px]', 'py-1.5', 'font-medium',
  'text-inverse', 'whitespace-nowrap', 'hover:enabled:bg-[var(--accent-hover)]',
  'disabled:cursor-not-allowed', 'disabled:opacity-50', 'focus-visible:outline-2',
  'focus-visible:outline-offset-2', 'focus-visible:outline-[var(--focus)]',
];

function assertClassTokens(actual, expected, label) {
  const tokens = new Set(actual.split(/\s+/));
  for (const token of expected) assert.ok(tokens.has(token), `${label} is missing ${token}`);
}

test('Tailwind compiler writes a non-empty staged stylesheet', async () => {
  const output = path.join(await mkdtemp(path.join(tmpdir(), 'tw-')), 'tailwind.css');
  const {bytes} = await compileTailwind({root: process.cwd(), output});
  assert.ok(bytes > 0);
  assert.match(await readFile(output, 'utf8'), /@layer utilities|\.flex/);
});

test('Task 4 activity drawer buttons own their literal utility presentation', async () => {
  const template = await readFile('concepts/app/pages/invoices/activity-dialog.html', 'utf8');
  const renderer = await readFile('concepts/app/pages/invoices/activity.js', 'utf8');
  const buttonClasses = [...template.matchAll(/<button\b[^>]*class="([^"]*\b(?:ibtn|lbtn)\b[^"]*)"[^>]*>/g)]
    .map(([, classes]) => classes);

  assert.equal(buttonClasses.length, 5, 'expected every static activity drawer ibtn/lbtn control');
  for (const classes of buttonClasses) {
    if (classes.split(/\s+/).includes('ibtn')) {
      assertClassTokens(classes, activityIconButtonUtilities, 'activity close button');
    } else if (classes.split(/\s+/).includes('pri')) {
      assertClassTokens(classes, activityPrimaryButtonUtilities, 'activity primary button');
    } else {
      assertClassTokens(classes, activitySecondaryButtonUtilities, 'activity secondary button');
    }
  }

  const dynamicGroup = literalClassGroups(
    renderer,
    'concepts/app/pages/invoices/activity.js'
  ).find(({name}) => name === 'ACTIVITY_SECONDARY_BUTTON_CLASS');
  assert.equal(
    dynamicGroup?.utilities,
    activitySecondaryButtonUtilities.join(' '),
    'empty-state activity CTA must own the same literal secondary-button utilities'
  );
  assert.match(
    renderer,
    /<button class="lbtn out \$\{ACTIVITY_SECONDARY_BUTTON_CLASS\}" id="first-note">/,
    'empty-state activity CTA must preserve its semantic lbtn/out classes'
  );
});

test('Task 4 dynamic renderer groups have exact inline sources and every selector is generated', async () => {
  const root = process.cwd();
  const input = await readFile(path.join(root, 'concepts/app/styles/tailwind.css'), 'utf8');
  const groups = (
    await Promise.all(task4DynamicClassFiles.map(async file =>
      literalClassGroups(await readFile(path.join(root, file), 'utf8'), file)
    ))
  ).flat();
  assert.ok(groups.length > 0, 'expected Task 4 dynamic class groups');
  assert.deepEqual(
    groups
      .filter(({file}) => file.endsWith('/notifications/notifications.js'))
      .map(({name}) => name),
    [
      'EMAIL_AVATAR_TONE_1_CLASS',
      'EMAIL_AVATAR_TONE_2_CLASS',
      'EMAIL_AVATAR_TONE_3_CLASS',
      'EMAIL_AVATAR_TONE_4_CLASS',
      'EMAIL_AVATAR_TONE_5_CLASS',
    ],
    'notification avatar tones must be literal, exact dynamic utility groups'
  );

  const declarations = [...input.matchAll(
    /\/\* Dynamic utilities: ([A-Z][A-Z0-9_]*_CLASS) \(([^)]+)\)\. \*\/\n@source inline\("([^"]*)"\);/g
  )].map(([, name, file, utilities]) => ({name, file, utilities}));
  assert.deepEqual(
    declarations.map(({name, file}) => ({name, file})).sort((a, b) => a.name.localeCompare(b.name)),
    groups.map(({name, file}) => ({name, file})).sort((a, b) => a.name.localeCompare(b.name)),
    'every and only Task 4 dynamic class group must have one named @source inline declaration'
  );
  for (const group of groups) {
    const source = declarations.find(item => item.name === group.name && item.file === group.file);
    assert.equal(source?.utilities, group.utilities, `${group.name} inline source must exactly match its renderer constant`);
  }

  const output = path.join(await mkdtemp(path.join(tmpdir(), 'tw-task4-')), 'tailwind.css');
  await compileTailwind({root, output});
  const generated = await readFile(output, 'utf8');
  for (const {name, utilities} of groups) {
    for (const utility of utilities.split(/\s+/).filter(Boolean)) {
      if (/^(?:data-[a-z]|fnav(?:$|-))/.test(utility) || semanticActivityClasses.has(utility)) continue;
      assert.ok(
        generated.includes(cssClassSelector(utility)),
        `${name} utility selector was not generated: ${utility}`
      );
    }
  }
});

test('Task 4 compatibility CSS excludes ordinary renderer presentation selectors', async () => {
  const compatibility = await readFile('concepts/app/styles/tailwind/components.css', 'utf8');
  for (const selector of [
    '.toast {',
    '.toast.ok',
    '.toast.bad',
    '.skeleton-shape',
    '.ai-orb {',
    '.ai-dots i',
    '.switch {',
    '.switch input',
    '.switch span',
    '.ai-drawer .drhd',
    '.ai-toolbar .ibtn',
    '.data-filter-chip > details > summary',
    '.data-filter-select-popover [role=',
    '.data-filter-date-presets [role=',
    '.data-search svg',
    '.data-page-manage {',
    '.data-page-manage > summary',
    '.data-page-manage .data-menu-popover',
    ".data-row-menu [data-list-row-action='delete']",
  ]) {
    assert.ok(!compatibility.includes(selector), `ordinary presentation selector must use literal utilities: ${selector}`);
  }
  assert.match(compatibility, /@keyframes toastin/);
  assert.match(compatibility, /@keyframes skeleton-shimmer/);
  assert.match(compatibility, /@keyframes ai-orb-spin/);
  assert.match(compatibility, /\.notif-row\.unread \.notif-icn::after/);
  assert.match(compatibility, /\.data-list-shell \.inv-grid th:first-child/);
});

test('Task 5 invoice and customer owners retire legacy sheets behind literal utilities', async () => {
  const input = await readFile('concepts/app/styles/tailwind.css', 'utf8');
  const entry = await readFile('concepts/app-shell.html', 'utf8');

  assert.match(input, /@import "\.\/tailwind\/invoices\.css" layer\(components\);/);
  assert.match(input, /@import "\.\/tailwind\/customers\.css" layer\(components\);/);
  assert.doesNotMatch(entry, /app\/pages\/invoices\/invoices(?:-[2-5])?\.css/);
  assert.doesNotMatch(entry, /app\/pages\/customers\/customers\.css/);
  const invoices = await readFile('concepts/app/styles/tailwind/invoices.css', 'utf8');
  const customers = await readFile('concepts/app/styles/tailwind/customers.css', 'utf8');
  for (const ordinarySelector of ['.stpill {', '.rdlg {', '.rec-tabs {', '.customer-record-canvas {', '.customer-overlay {']) {
    assert.ok(!invoices.includes(ordinarySelector), `invoice presentation must be literal: ${ordinarySelector}`);
    assert.ok(!customers.includes(ordinarySelector), `customer presentation must be literal: ${ordinarySelector}`);
  }

  const invoiceSource = await readFile('concepts/app/pages/invoices/record.js', 'utf8');
  const customerSource = await readFile('concepts/app/pages/customers/customers.js', 'utf8');
  assert.match(invoiceSource, /addItemButton\.addEventListener/);
  assert.match(customerSource, /function setMode\(mode\)/);
  assert.match(customerSource, /function setLayout\(layout\)/);
});

test('Tailwind input has explicit sources and the generated output includes expected selectors', async () => {
  const root = process.cwd();
  const input = await readFile(path.join(root, 'concepts/app/styles/tailwind.css'), 'utf8');

  assert.doesNotMatch(input, /^@import\s+"tailwindcss"\s*;/m);
  assert.match(input, /@import "tailwindcss\/theme" layer\(theme\);/);
  assert.match(input, /@import "\.\/tailwind\/base\.css" layer\(base\);/);
  assert.match(input, /@import "tailwindcss\/utilities" layer\(utilities\);/);
  assert.match(input, /@source "\.\.\/\.\.\/app-shell\.html";/);
  assert.match(input, /@source "\.\.\/\*\*\/\*\.html";/);
  assert.match(input, /@source "\.\.\/\*\*\/\*\.js";/);
  assert.doesNotMatch(input, /@source inline\("\*/);
  const generated = await readFile(path.join(root, 'dist/concepts/app/styles/tailwind.css'), 'utf8');
  assert.ok(generated.includes('.\\[box-shadow\\:var\\(--shadow-1\\)\\]'));
  assert.ok(generated.includes('.\\[\\&\\>button\\]\\:min-h-8>button'));
  assert.match(generated, /data-s=posted[^}]*background-color:var\(--st-post-bg\)/);
  assert.ok(generated.includes('.group-\\[\\.open\\]\\:flex'));

  const manifest = await readFile(path.join(root, 'concepts/app/styles/tailwind/compatibility.md'), 'utf8');
  assert.match(manifest, /\| Owner \| Selector \| Reason \| Removal condition \|/);
  assert.match(manifest, /::before.*::after/);
  assert.match(manifest, /@keyframes/);
  assert.match(manifest, /ApexCharts DOM/);
  assert.match(manifest, /aria-\*.*relationships/);
  assert.match(manifest, /prototype density\/style modes/);
});

// Task 7 final Tailwind budget.
//
// This is the single authoritative compiled-output-size ceiling for the whole
// migration (tests/architecture.test.mjs previously duplicated this check
// against a different, looser number; that duplicate was removed there in
// favor of this one, per the plan's file-ownership table assigning
// generated-output-size checks to this file).
//
// With every page (shell, components, invoices, customers, geography, email)
// now migrated to literal Tailwind utilities and every legacy CSS file
// deleted, the finished compiled sheet measures 197,594 bytes. That measured
// size is recorded here as the final migration baseline; the ceiling is that
// baseline plus 10% headroom for incidental future utility growth, not a
// license to add new authored CSS. Any change that grows the compiled output
// beyond this ceiling must either shrink elsewhere or have the report name a
// reviewed dynamic-utility addition that justifies raising the baseline.
// Raised from 197594 in two independent branches since: on main, to
// 220359 by the geography flow canvas's per-node action toolbar (Modify/
// Focus/New/Delete), the focus-mode chip, the delete-tree confirmation
// dialog, and its later Center-action/free-pan/true-centering fixes; on
// worktree-user-profile-page, to 221745 across the User Profile page's
// build (card-style rework, select-arrow SVG encoding fix, print dialog
// fixes, split-button seam fixes) plus its own merge of main's geography
// feature partway through. Both are real, reviewed feature CSS, not
// incidental growth -- see docs/tailwind-migration-report.md's addenda
// for each one's justification. Reset to the freshly measured merged
// output (223877) rather than summing the two histories.
const FINAL_TAILWIND_BASELINE_BYTES = 223877;
const FINAL_TAILWIND_CEILING_BYTES = Math.ceil(FINAL_TAILWIND_BASELINE_BYTES * 1.1);

test('Task 7 final Tailwind budget: compiled output stays within baseline + 10%', async () => {
  const root = process.cwd();
  const outputPath = path.join(await mkdtemp(path.join(tmpdir(), 'tw-final-budget-')), 'tailwind.css');
  await compileTailwind({root, output: outputPath});
  const output = await stat(outputPath);
  assert.ok(output.size > 0);
  assert.ok(
    output.size <= FINAL_TAILWIND_CEILING_BYTES,
    `Tailwind output exceeds the final migration budget of ${FINAL_TAILWIND_CEILING_BYTES} bytes ` +
      `(baseline ${FINAL_TAILWIND_BASELINE_BYTES} + 10%): ${output.size} bytes. If this growth is an ` +
      'intentional, reviewed dynamic-utility addition, name it in docs/tailwind-migration-report.md and raise the baseline.'
  );
});
