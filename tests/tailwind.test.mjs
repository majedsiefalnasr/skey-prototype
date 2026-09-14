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

test('Tailwind compiler writes a non-empty staged stylesheet', async () => {
  const output = path.join(await mkdtemp(path.join(tmpdir(), 'tw-')), 'tailwind.css');
  const {bytes} = await compileTailwind({root: process.cwd(), output});
  assert.ok(bytes > 0);
  assert.match(await readFile(output, 'utf8'), /@layer utilities|\.flex/);
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

test('Tailwind input has explicit sources and the generated output stays within the Task 4 budget', async () => {
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

  const outputPath = path.join(await mkdtemp(path.join(tmpdir(), 'tw-budget-')), 'tailwind.css');
  await compileTailwind({root, output: outputPath});
  const output = await stat(outputPath);
  // Completing the two previously deferred Task 4 component files raises the
  // compiled utility sheet to 58,365 bytes while deleting their legacy CSS.
  // 59,000 is a narrow rounded guardrail for this migration, not the plan's
  // final bundle budget. Task 7 owns the final baseline + 10% decision.
  assert.ok(output.size >= 6518);
  assert.ok(output.size <= 59000, `Tailwind output exceeds the reviewed Task 4 ceiling: ${output.size} bytes`);
});
