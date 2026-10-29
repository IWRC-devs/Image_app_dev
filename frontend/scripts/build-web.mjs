import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.EXPO_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
if (base && (!base.startsWith('/') || base.includes('..') || /[?#\\]/.test(base))) {
  throw new Error('EXPO_PUBLIC_BASE_PATH must be an absolute URL path, such as /Image_app_dev.');
}
const output = path.join(root, 'dist');
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_BASE_PATH: base },
});
if (result.status !== 0) process.exit(result.status || 1);

// Generate install icons from the existing app icon, using Expo's image tooling.
const { generateImageAsync } = require('@expo/image-utils');
await mkdir(path.join(output, 'icons'), { recursive: true });
for (const size of [192, 512]) {
  const { source } = await generateImageAsync(
    { projectRoot: root, cacheType: 'pwa-icons' },
    { src: path.join(root, 'assets/images/icon.png'), width: size, height: size, resizeMode: 'contain', backgroundColor: '#ffffff' }
  );
  await writeFile(path.join(output, `icons/icon-${size}.png`), source);
}
await writeFile(path.join(output, 'manifest.webmanifest'), JSON.stringify({
  id: `${base}/`,
  name: 'IWRC Imaging',
  short_name: 'IWRC Imaging',
  description: 'Capture weed imaging batches and save field data on this device.',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#28a745',
  icons: [192, 512].map((size) => ({ src: `icons/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png' })),
}, null, 2));
await writeFile(path.join(output, 'register-sw.js'), `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(${JSON.stringify(`${base}/sw.js`)}, { scope: ${JSON.stringify(`${base}/`)} })
      .catch(error => console.warn('Offline support is unavailable:', error));
  });
}
`);
await writeFile(path.join(output, '.nojekyll'), '');

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), `${relative}/`));
    else if (entry.name !== 'sw.js' && !entry.name.startsWith('.')) files.push(relative);
  }
  return files.sort();
}
const files = await listFiles(output);
const hash = createHash('sha256').update(base);
for (const file of files) hash.update(file).update(await readFile(path.join(output, file)));
const version = hash.digest('hex').slice(0, 16);
const cachePrefix = `iwrc-imaging-${encodeURIComponent(base || 'root')}-`;
const urls = files.map((file) => `${base}/${file}`);
urls.push(`${base}/`);
await writeFile(path.join(output, 'sw.js'), `
const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};
const BASE = ${JSON.stringify(base)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
// Updated workers wait until existing tabs close, avoiding mixed app versions.
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE + '/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A versioned app shell stays consistent with its bundled scripts offline.
    const exact = await cache.match(url.pathname);
    if (exact) return exact;
    if (event.request.mode === 'navigate') {
      const route = url.pathname.replace(/\\/$/, '');
      const page = await cache.match(route + '.html') || await cache.match(route + '/index.html');
      if (page) return page;
    }
    return fetch(event.request);
  })());
});
`);
console.log(`PWA exported to ${output} (version ${version}, base ${base || '/'}).`);
