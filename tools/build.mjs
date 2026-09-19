// Production build: tsc -> docs/app, copy public/ -> docs/, generate docs/sw.js with a precache list.
// (Output folder is "docs" — not "dist" — so it can be served directly by GitHub Pages' /docs option.)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'docs');
const pub = path.join(root, 'public');

function findTsc() {
  const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(local)) return local;
  return process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
}

// Plain per-file recursive copy. fs.cpSync's fast directory-clone path fails with EACCES
// on some mounted/network filesystems (seen over the desktop-bridge FUSE mount) — this
// avoids that native fast path entirely and just reads+writes each file.
export function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function build({ watch = false } = {}) {
  fs.rmSync(dist, { recursive: true, force: true });
  copyDirSync(pub, dist);

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
  // exercise-videos/ is a large (many small files) asset bundle — cache clips lazily as the
  // user actually views them (the fetch handler below does this) instead of blocking install
  // on downloading the whole library up front.
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (path.relative(dist, p) === 'exercise-videos') continue;
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
  const swPath = path.join(dist, 'sw.js');
  // Skip the write when nothing changed (keeps file watchers quiet in dev mode).
  if (fs.existsSync(swPath) && fs.readFileSync(swPath, 'utf8') === sw) return;
  fs.writeFileSync(swPath, sw);
  console.log(`build ok — ${files.length} files, version ${version} -> docs/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
