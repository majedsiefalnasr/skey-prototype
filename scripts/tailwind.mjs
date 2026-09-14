import {execFile} from 'node:child_process';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

const run = promisify(execFile);

export async function compileTailwind({root, output}) {
  const executable = path.join(root, 'node_modules', '.bin', 'tailwindcss');
  const input = path.join(root, 'concepts', 'app', 'styles', 'tailwind.css');
  await run(executable, ['-i', input, '-o', output, '--minify'], {cwd: root});
  return {bytes: (await stat(output)).size};
}
