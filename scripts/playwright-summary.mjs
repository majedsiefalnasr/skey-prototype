// Summarises a Playwright JSON report, or compares the failures of two reports.
// Write a report without a shell redirect:
//   PLAYWRIGHT_JSON_OUTPUT_NAME=/absolute/report.json npx playwright test --reporter=dot,json
// Usage:
//   node scripts/playwright-summary.mjs <report.json>                  counts by status
//   node scripts/playwright-summary.mjs <report.json> --names          one line per failed test
//   node scripts/playwright-summary.mjs <report.json> --by-file        failed tests per file and project
//   node scripts/playwright-summary.mjs --compare <before.json> <after.json>
import {readFileSync} from 'node:fs';

function readTests(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const tests = [];
  const walk = (suite, file) => {
    const here = suite.file ?? file;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const result = test.results.at(-1);
        const status = test.status === 'skipped' ? 'skipped' : result?.status ?? 'none';
        const message = (result?.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').find(line => line.trim()) ?? '';
        tests.push({project: test.projectName, file: here, line: spec.line, title: spec.title, status, message: message.slice(0, 140)});
      }
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites) walk(suite, suite.file);
  return tests;
}

const isFailure = test => !['passed', 'skipped'].includes(test.status);
const failureKey = test => `${test.project} | ${test.file} | ${test.title}`;

if (process.argv[2] === '--compare') {
  const before = new Set(readTests(process.argv[3]).filter(isFailure).map(failureKey));
  const after = new Set(readTests(process.argv[4]).filter(isFailure).map(failureKey));
  console.log('before', before.size, 'after', after.size);
  console.log('only after:', [...after].filter(name => !before.has(name)));
  console.log('only before:', [...before].filter(name => !after.has(name)));
} else {
  const tests = readTests(process.argv[2]);
  const counts = {};
  for (const test of tests) counts[test.status] = (counts[test.status] ?? 0) + 1;
  console.log(JSON.stringify(counts));
  const failed = tests.filter(isFailure);
  if (process.argv[3] === '--names') {
    for (const test of failed) console.log(`${test.project}\t${test.file}:${test.line}\t${test.title}\t${test.message}`);
  }
  if (process.argv[3] === '--by-file') {
    const byFile = {};
    for (const test of failed) byFile[`${test.file} [${test.project}]`] = (byFile[`${test.file} [${test.project}]`] ?? 0) + 1;
    for (const [key, value] of Object.entries(byFile).sort()) console.log(value, key);
  }
}
