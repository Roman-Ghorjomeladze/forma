// Tiny static file server (no dependencies). Usage: node tools/serve.mjs [dir] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = path.resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? process.env.PORT ?? 5173);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp',
};

export function serve(root = dir, p = port) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(root, urlPath);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Service-Worker-Allowed': '/',
      });
      res.end(data);
    });
  });
  server.listen(p, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
    console.log(`Forma serving ${root}`);
    console.log(`  local:   http://localhost:${p}/`);
    for (const ip of ips) console.log(`  network: http://${ip}:${p}/   (open this on your iPhone, same Wi-Fi)`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) serve();
