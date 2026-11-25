// PROTOTYPE, throwaway. Prints the measurement tables from measure.json.
import {readFile} from 'node:fs/promises';

const file = process.argv[2] ?? '/private/tmp/skey-proto-29-out/measure.json';
const data = JSON.parse(await readFile(file, 'utf8'));
const names = Object.keys(data.current);
const failed = data.results.filter(row => row.error);
console.log('errors', failed.length, JSON.stringify(failed));
const ok = data.results.filter(row => !row.error);
const screens = [...new Set(ok.map(row => row.screen))];

console.log('\nValues (px): token | current | B smaller | C larger');
for (const name of names) console.log(`legacy-${name}`.padEnd(14), String(data.sets.A[name]).padStart(5), String(data.sets.B[name]).padStart(5), String(data.sets.C[name]).padStart(5));

console.log('\nPer token: elements reading it, summed over 8 screens x 4 widths, and on how many screens it appears');
for (const name of names) {
  const rows = ok.filter(row => row.tokens[name].elements > 0);
  const seenScreens = new Set(rows.map(row => row.screen));
  const total = ok.reduce((sum, row) => sum + row.tokens[name].elements, 0);
  const at1440 = ok.filter(row => row.width === 1440).reduce((sum, row) => sum + row.tokens[name].elements, 0);
  console.log(`legacy-${name}`.padEnd(14), 'element-states', String(total).padStart(5), ' at1440', String(at1440).padStart(4), ' screens', [...seenScreens].join(','));
}
console.log('\nNever seen on a measured screen:', names.filter(name => ok.every(row => row.tokens[name].elements === 0)).map(name => `legacy-${name}`).join(', ') || 'none');

console.log('\nPer width, per set (summed over screens): box widths changed / box heights changed / max height change / newly clipped / page height delta (sum) / pages with new horizontal overflow');
for (const width of [390, 768, 1024, 1440]) {
  for (const variant of ['B', 'C']) {
    const rows = ok.filter(row => row.width === width);
    const sum = key => rows.reduce((total, row) => total + row.summary[variant][key], 0);
    const maxHeight = Math.max(...rows.map(row => row.summary[variant].maxHeightChange));
    const overflow = rows.filter(row => row.summary[variant].pageOverflowAfter > row.summary[variant].pageOverflowBefore).length;
    console.log(`${width} ${variant}`.padEnd(9), sum('widthChanges'), sum('heightChanges'), maxHeight, sum('newlyClipped'), sum('pageHeightDelta'), overflow);
  }
}

console.log('\nPer screen and width, set B / set C: newlyClipped, pageHeightDelta, newOverflow');
for (const screen of screens) {
  console.log(screen.padEnd(20), ok.filter(row => row.screen === screen).map(row => {
    const b = row.summary.B;
    const c = row.summary.C;
    return `${row.width}: B ${b.newlyClipped}/${b.pageHeightDelta}/${b.pageOverflowAfter - b.pageOverflowBefore}  C ${c.newlyClipped}/${c.pageHeightDelta}/${c.pageOverflowAfter - c.pageOverflowBefore}`;
  }).join(' | '));
}
