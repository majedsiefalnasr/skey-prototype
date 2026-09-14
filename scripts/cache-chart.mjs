// Cache the existing chart dependency for repeatable, offline browser verification.
// This does not change the production CDN URL or integrity attribute.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const chartURL = 'https://cdn.jsdelivr.net/npm/apexcharts@7.1.0/dist/apexcharts.min.js';
const integrity = 'N0+WI1lzyjjHpd0bVsvGLavbPzx3SyAANuD/BuwWkyRd+r/YMQYNeU+yb9A0Ycv1TW5kBo21gdn+Brvhh8pnew==';
const cachePath = new URL('../.baseline/apexcharts-7.1.0.min.js', import.meta.url);

export async function readChart() {
  let body;
  let fetched = false;
  try {
    body = await readFile(cachePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(chartURL, {signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`Chart CDN returned ${response.status}`);
    body = Buffer.from(await response.arrayBuffer());
    fetched = true;
  }
  if (createHash('sha512').update(body).digest('base64') !== integrity) {
    throw new Error('ApexCharts cache does not match the production integrity hash');
  }
  if (fetched) {
    await mkdir(new URL('../.baseline/', import.meta.url), {recursive: true});
    await writeFile(cachePath, body);
  }
  return body;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await readChart();
  console.log('Verified ApexCharts 7.1.0 cached in .baseline/');
}
