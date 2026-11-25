// PROTOTYPE, throwaway. Prints the measurement tables from measure.json.
import {readFile} from 'node:fs/promises';

const file = process.argv[2] ?? '/private/tmp/skey-proto-27-out/measure.json';
const data = JSON.parse(await readFile(file, 'utf8'));
const ids = [1, 3, 5, 7, 9, 10, 11, 14];
const failed = data.results.filter(row => row.error);
console.log('errors', failed.length, JSON.stringify(failed));
const ok = data.results.filter(row => !row.error);
const screens = [...new Set(ok.map(row => row.screen))];

console.log('\nPer screen and width: elements with a radius / reading a legacy token / literal on a listed px / full pills');
for (const screen of screens) {
  console.log(screen.padEnd(18), ok.filter(row => row.screen === screen)
    .map(row => `${row.width}:${row.radiusElements}/${row.tokenElements}/${row.literalOnListedValues}/${row.fullPill}`).join('  '));
}

for (const width of [390, 768, 1024, 1440]) {
  console.log(`\nWidth ${width}: per token  elements / visibly changed in B / visibly changed in C  (clamped B,C)`);
  for (const screen of screens) {
    const row = ok.find(item => item.screen === screen && item.width === width);
    let line = screen.padEnd(18);
    for (const id of ids) {
      const token = row.perToken[id];
      const clamp = token.B.hiddenByClamp || token.C.hiddenByClamp ? `(${token.B.hiddenByClamp},${token.C.hiddenByClamp})` : '';
      line += ` r${id}:${token.elements}/${token.B.changed}/${token.C.changed}${clamp}`;
    }
    console.log(line);
  }
}

const totals = Object.fromEntries(ids.map(id => [id, {elements: 0, B: 0, C: 0, clamp: 0, maxB: 0, maxC: 0}]));
for (const row of ok) {
  for (const id of ids) {
    const token = row.perToken[id];
    totals[id].elements += token.elements;
    totals[id].B += token.B.changed;
    totals[id].C += token.C.changed;
    totals[id].clamp += token.B.hiddenByClamp + token.C.hiddenByClamp;
    totals[id].maxB = Math.max(totals[id].maxB, token.B.maxDelta);
    totals[id].maxC = Math.max(totals[id].maxC, token.C.maxDelta);
  }
}
console.log('\nTotals over every screen and width (element-states)');
console.log(JSON.stringify(totals));
