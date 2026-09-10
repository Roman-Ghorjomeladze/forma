// Production build: tsc -> dist/app, copy public/ -> dist/, generate dist/sw.js with a precache list.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pub = path.join(root, 'public');

function findTsc() {
  const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(local)) return local;
  return process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
}

export function build({ watch = false } = {}) {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  fs.cpSync(pub, dist, { recursive: true });

  const tsc = findTsc();
  const args = ['-p', path.join(root, 'tsconfig.json')];
  if (watch) args.push('--watch', '--preserveWatchOutput');
  const r = spawnSync(tsc, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0 && !watch) {
    console.error('\nTypeScript build failed. Install it with `npm install` (only dev dependency) and retry.');
    process.exit(r.status ?? 1);
  }
  writeServiceWorker();
}

export function writeServiceWorker() {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== 'sw.js') files.push('./' + path.relative(dist, p).split(path.sep).join('/'));
    }
  };
  walk(dist);
  const hash = crypto.createHash('sha1');
  for (const f of files) hash.update(fs.readFileSync(path.join(dist, f)));
  const version = hash.digest('hex').slice(0, 10);
  const sw = fs.readFileSync(path.join(root, 'tools', 'sw.template.js'), 'utf8')
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(files.concat(['./']), null, 0));
  fs.writeFileSync(path.join(dist, 'sw.js'), sw);
  console.log(`build ok — ${files.length} files, version ${version} -> dist/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
