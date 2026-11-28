import assert from 'node:assert/strict';
import {mkdtemp, readdir, readFile, stat} from 'node:fs/promises';
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
  'bg-surface', 'px-3', 'py-1.5', 'font-medium', 'whitespace-nowrap',
  'hover:enabled:bg-[var(--line-2)]', 'disabled:cursor-not-allowed',
  'disabled:opacity-50', 'focus-visible:outline-2', 'focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--focus)]',
];
const activityPrimaryButtonUtilities = [
  'inline-flex', 'items-center', 'gap-1.5', 'rounded-md', 'border',
  'border-transparent', 'bg-accent', 'px-3', 'py-1.5', 'font-medium',
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
  assert.match(compatibility, /\.data-list-shell \.inv-grid th\.data-row-actions-cell/);
});

test('Task 5 invoice and customer owners retire legacy sheets behind literal utilities', async () => {
  const input = await readFile('concepts/app/styles/tailwind.css', 'utf8');
  const entry = await readFile('concepts/app-shell.html', 'utf8');

  assert.match(input, /@import ['"]\.\/tailwind\/invoices\.css['"] layer\(components\);/);
  assert.match(input, /@import ['"]\.\/tailwind\/customers\.css['"] layer\(components\);/);
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
  assert.match(input, /@import ['"]tailwindcss\/theme['"] layer\(theme\);/);
  assert.match(input, /@import ['"]\.\/tailwind\/base\.css['"] layer\(base\);/);
  assert.match(input, /@import ['"]tailwindcss\/utilities['"] layer\(utilities\);/);
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
// output (223877) rather than summing the two histories, then raised to
// 253152 for the density-mode alignment pass over shell.css (see the
// report's 2026-09-29 addendum for the justification and the two
// documented exceptions), then 258029 for the email-surface density
// pass (markup density variants in pages/email), then 258928 for the
// four remaining density exceptions (launchpad canvas, invoice grid
// wrapper, geography tree panel/header) -- see the report's
// 2026-09-30 addendum. The 2026-10-25 People Data record-card work
// reuses the Customer record's titlebar/grid tokens and measured +90
// bytes over HEAD's already-over-budget 292202-byte output; the baseline
// now records that reviewed output -- see the report's 2026-10-25
// addendum. #56 then moved the on-scale px spacing in the authored CSS to
// `var(--ds-space-*)`, which is longer than the literal: 315967 to 324348
// bytes -- see the report's 2026-11-27 addendum.
const FINAL_TAILWIND_BASELINE_BYTES = 324348;
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

const adsSpacingSteps = new Set(['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10', '12', '16']);
const spacingUtility = /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?|px)$/;
const spacingArbitraryPixels = /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-\[(\d+(?:\.\d+)?)px\]$/;
// build.test.mjs holds legacy shell markup as fixture input for the build rewrite, so it is not scanned.
const guardExcludedFiles = new Set(['tests/tailwind.test.mjs', 'tests/build.test.mjs']);

async function sourceFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(?:js|mjs|html)$/.test(entry.name) ? [full] : [];
  }));
  return files.flat();
}

test('spacing utilities read ADS steps (#25): no off-scale numeric utility is written', async () => {
  const root = process.cwd();
  const violations = [];
  for (const scope of ['concepts', 'tests', 'scripts']) {
    for (const file of await sourceFiles(path.join(root, scope))) {
      const relative = path.relative(root, file);
      if (guardExcludedFiles.has(relative)) continue;
      const source = await readFile(file, 'utf8');
      for (const [token] of source.matchAll(/[^\s"'`]+/g)) {
        const utility = token.split(':').at(-1).replace(/[!,;)}>]+$/, '');
        const numeric = utility.match(spacingUtility);
        const pixels = utility.match(spacingArbitraryPixels);
        const offScale = numeric
          ? !adsSpacingSteps.has(numeric[1])
          : pixels && !adsSpacingSteps.has(String(Number(pixels[1]) / 4));
        if (offScale) violations.push(`${relative} ${token}`);
      }
    }
  }
  assert.deepEqual(violations, [], 'Off-scale spacing utilities must move to ADS steps (DESIGN.md Spacing).');
});

const spacingDeclaration = /(?<![\w-])((?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|--page-pad)\s*:([^;{}"'`\]]+)/g;
const spacingStyleWrite = /(?:\.style\.|setProperty\(\s*['"])((?:padding|margin|gap|rowGap|columnGap|row-gap|column-gap)[\w-]*)(?:\s*=|['"]\s*,)\s*(?:['"`])([^'"`]*)/g;
// Each entry allows one literal: the sr-only label offset, the room for the interface scale bubble, the density preview's row
// separator and the boxed layout width.
const spacingPixelExceptions = [
  'concepts/app/styles/tailwind/email.css margin: -1px',
  'concepts/app/styles/tailwind/shell.css padding-top: 28px',
  'concepts/app/styles/tailwind/shell.css gap: 1px',
  'concepts/app/styles/tailwind/shell.css padding-inline: calc(max(var(--ds-space-400), (100% - 1296px) / 2) + var(--page-pad, var(--ds-space-200))) !important',
];
// The prototype controls are demo chrome, not product UI.
const spacingPixelExcludedFiles = new Set(['concepts/app/prototype/controls.css']);

test('spacing declarations read ADS tokens (#57): no px literal in padding, margin or gap', async () => {
  const root = process.cwd();
  const remaining = new Set(spacingPixelExceptions);
  const violations = [];
  const entries = await readdir(path.join(root, 'concepts'), {recursive: true, withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(?:css|js|mjs|html)$/.test(entry.name)) continue;
    const relative = path.relative(root, path.join(entry.parentPath, entry.name));
    if (relative.includes('/third-party/') || spacingPixelExcludedFiles.has(relative)) continue;
    let source = await readFile(path.join(root, relative), 'utf8');
    // The vendored driver.js stylesheet stays verbatim; only the app's restyle is checked.
    if (relative.endsWith('/driver-style.js')) {
      const start = source.indexOf('export const ATLASSIAN_SPOTLIGHT_CSS');
      assert.ok(start >= 0, 'Spotlight restyle not found.');
      source = source.slice(start);
    }
    source = source.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^\s*\/\/.*$/gm, '');
    for (const [, property, value] of [...source.matchAll(spacingDeclaration), ...source.matchAll(spacingStyleWrite)]) {
      const literals = [...value.replaceAll('_', ' ').matchAll(/(?<![\w.#])(\d*\.?\d+)px\b/g)];
      if (!literals.some(([, digits]) => Number(digits) !== 0)) continue;
      const key = `${relative} ${property}: ${value.trim()}`;
      if (!remaining.delete(key)) violations.push(key);
    }
  }
  assert.deepEqual(violations, [], 'Spacing px literals must read --ds-space-* tokens (DESIGN.md Spacing).');
  assert.deepEqual([...remaining], [], 'Stale spacing exception.');
});
