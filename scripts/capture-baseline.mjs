#!/usr/bin/env node
// Materializes the frozen baseline app shell (a fixed Git revision) into the
// ignored `.baseline/` directory, so Playwright can compare the live current
// app against an immutable historical snapshot without ever touching the
// authored source tree.
//
// Usage: node scripts/capture-baseline.mjs

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const run = promisify(execFile);

export const BASELINE_COMMIT = '07f6b8a664e684022a3faf4c9e95392a13134529';
export const BASELINE_HTML_BLOB = '2776f120870c4fdbb6eb80e2777bc4c085ce39f3';
export const BASELINE_HTML_PATH = 'concepts/app-shell.html';

// The only files the baseline app shell needs to render and behave
// identically to the live app: the entry HTML plus the two relative image
// assets it (indirectly, via inline fixtures) references. Everything else
// in the baseline app shell is inline <style>/<script>; there are no other
// local .js/.css files or fonts to fetch.
export const BASELINE_ASSET_PATHS = [
  'concepts/assets/customers/customer-200002-organization.webp',
  'concepts/assets/customers/customer-200010-portrait.webp',
];

const OUTPUT_ROOT = path.resolve('.baseline');

/**
 * Read `path` from `commit` as a Buffer using `git show <commit>:<path>`.
 * @param {string} commit
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
async function readBlobAtCommit(commit, filePath) {
  const {stdout} = await run('git', ['show', `${commit}:${filePath}`], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

/**
 * Compute the Git blob hash (`git hash-object`-compatible SHA-1) for
 * `content`, so materialized bytes can be checked against the recorded
 * blob hash without shelling out again.
 * @param {Buffer} content
 * @returns {string}
 */
export function gitBlobHash(content) {
  const header = `blob ${content.length}\0`;
  return crypto
    .createHash('sha1')
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest('hex');
}

/**
 * Materialize the baseline HTML and its public assets into `.baseline/`,
 * mirroring their original relative paths. Verifies the HTML blob hash
 * against `BASELINE_HTML_BLOB` and throws rather than writing a baseline
 * that silently drifted from the recorded revision.
 * @returns {Promise<{htmlPath: string, assetPaths: string[]}>}
 */
export async function captureBaseline() {
  const htmlContent = await readBlobAtCommit(BASELINE_COMMIT, BASELINE_HTML_PATH);
  const actualHash = gitBlobHash(htmlContent);
  if (actualHash !== BASELINE_HTML_BLOB) {
    throw new Error(
      `Baseline HTML blob mismatch for ${BASELINE_HTML_PATH} at ${BASELINE_COMMIT}: ` +
        `expected ${BASELINE_HTML_BLOB}, got ${actualHash}`
    );
  }

  const htmlOutPath = path.join(OUTPUT_ROOT, BASELINE_HTML_PATH);
  await mkdir(path.dirname(htmlOutPath), {recursive: true});
  await writeFile(htmlOutPath, htmlContent);

  const assetPaths = [];
  for (const assetPath of BASELINE_ASSET_PATHS) {
    const content = await readBlobAtCommit(BASELINE_COMMIT, assetPath);
    const outPath = path.join(OUTPUT_ROOT, assetPath);
    await mkdir(path.dirname(outPath), {recursive: true});
    await writeFile(outPath, content);
    assetPaths.push(assetPath);
  }

  return {htmlPath: htmlOutPath, assetPaths};
}

/**
 * Read the already-materialized baseline HTML back from `.baseline/`,
 * primarily for use by other scripts/tests that need the exact bytes
 * (e.g. the Task 2 extraction invariant) without recomputing it.
 */
export async function readMaterializedBaselineHtml() {
  return readFile(path.join(OUTPUT_ROOT, BASELINE_HTML_PATH), 'utf8');
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const result = await captureBaseline();
  // eslint-disable-next-line no-console
  console.log(`Baseline materialized at ${result.htmlPath}`);
  for (const assetPath of result.assetPaths) {
    // eslint-disable-next-line no-console
    console.log(`  + ${assetPath}`);
  }
}
