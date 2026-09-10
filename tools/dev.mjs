// Dev mode: rebuild on change (tsc --watch + public/ copy) and serve dist/ on the network.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeServiceWorker } from './build.mjs';
import { serve } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pub = path.join(root, 'public');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(pub, dist, { recursive: true });

const localTsc = path.join(root, 'node_modules', '.bin', 'tsc');
const tsc = fs.existsSync(localTsc) ? localTsc : 'tsc';
const child = spawn(tsc, ['-p', root, '--watch', '--preserveWatchOutput'], { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));

let timer;
const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { try { writeServiceWorker(); } catch {} }, 400); };
fs.watch(pub, { recursive: true }, (_e, name) => {
  if (!name) return;
  const src = path.join(pub, name), dst = path.join(dist, name);
  try { if (fs.statSync(src).isFile()) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); } } catch {}
  schedule();
});
fs.watch(path.join(dist), { recursive: true }, schedule);
serve(dist, Number(process.env.PORT ?? 5173));
