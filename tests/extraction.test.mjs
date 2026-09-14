import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The Task 2 checkpoint originally included a test here asserting
// concepts/app/legacy-app.js was byte-identical to the baseline's inline
// application script. Per the plan ("Extraction byte tests become
// checkpoint evidence after later modules replace these files; do not keep
// tests that require deleted temporary files"), that invariant stopped
// PASSING once Task 4 began pulling shared facilities out of legacy-app.js
// and converting it into a module (its own Interfaces section explicitly
// authorizes modifying this file) — legacy-app.js is no longer expected to
// match the frozen baseline byte-for-byte. Content that moved out:
// locale/i18n (-> core/locale.js), color math + applyTheme/
// applyAppearanceAccent (-> core/appearance.js), dialog focus-trap
// (-> components/dialog/dialog.js), toast (-> components/toast/toast.js),
// runWork (-> core/work.js), skeleton/ticker loading (->
// components/loading/loading.js). See task-4-report.md for the exact
// line-range mapping.
//
// The plan explicitly assigns actual deletion of legacy-app.js — and of
// this now-permanently-stale checkpoint test — to Task 12, not Task 4:
// legacy-app.js still exists and is load-bearing after this task (only
// partially emptied, not deleted). So the assertion is kept below as
// test.todo rather than removed outright: it still runs and its pass/fail
// is visible in `node --test` output, but is reported as TODO regardless
// of outcome, so it cannot break the suite. Retire it for real in Task 12
// when legacy-app.js itself is deleted. The remaining three tests below
// cover files this task does not touch and remain valid checkpoint
// evidence for Task 2's mechanical extraction.
test.todo('mechanical extraction retains application block bytes (stale as of Task 4 — see comment above; retired in Task 12)', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const script = [...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .find(match => !/\bsrc=/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/legacy-app.js','utf8'), script);
});

// Same treatment as the legacy-app.js checkpoint above: Task 11 replaced
// concepts/app/prototype/legacy-controls.js with the real
// concepts/app/prototype/controls.js module (createPrototypeControls,
// readPrototypeState — see that file's own comments for why: the classic
// script's restoreState() ran before customers/invoices page factories
// existed, so customer-mode/customer-layout restoration silently did
// nothing, known-defects.md issue 6) and deleted legacy-controls.js per the
// plan's own Task 11 file list ("delete prototype/legacy-controls.js when
// no callers remain"). The byte-identity file this asserted against no
// longer exists, so this checkpoint test is retired as test.todo rather
// than removed outright, matching the Task 4 precedent above.
test.todo('mechanical extraction retains prototype-controls script bytes (stale as of Task 11 — see comment above; superseded by controls.js)', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const scripts = [...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !/\bsrc=/.test(match[1]));
  const controlsScript = scripts.find(match => /id="shell-kit-js"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/prototype/legacy-controls.js','utf8'), controlsScript);
});

test('mechanical extraction retains main style block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const styles = [...original.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)];
  const mainStyle = styles.find(match => !/id="shell-kit-css"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/styles/legacy-app.css','utf8'), mainStyle);
});

test('mechanical extraction retains prototype-controls style block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const styles = [...original.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)];
  const controlsStyle = styles.find(match => /id="shell-kit-css"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/prototype/controls.css','utf8'), controlsStyle);
});
