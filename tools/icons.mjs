// Renders public/icons/icon.svg to PNG app icons. Needs `sharp` (npm i -D sharp) — the PNGs are committed, so this is optional.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', 'icons', 'icon.svg');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(process.argv[2] ?? 'sharp'); }

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(src).resize(size, size).png().toFile(path.join(root, 'public', 'icons', name));
  console.log('wrote', name);
}
