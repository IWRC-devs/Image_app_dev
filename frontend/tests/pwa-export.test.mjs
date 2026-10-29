import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const output = new URL('../dist/', import.meta.url);

test('exported PWA caches its real assets and serves deep links offline', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', output), 'utf8'));
  const base = manifest.scope.replace(/\/$/, '');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, manifest.scope);
  const html = await readFile(new URL('index.html', output), 'utf8');
  assert.ok(html.includes(`href="${base}/manifest.webmanifest"`));
  assert.ok(html.includes(`src="${base}/register-sw.js"`));
  const events = {};
  const stores = new Map([['another-app-cache', new Map()]]);
  const cacheApi = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) {
            const relative = url.slice(base.length + 1) || 'index.html';
            const content = await readFile(new URL(relative, output));
            entries.set(url, new Response(content));
          }
        },
        async match(url) { return entries.get(url)?.clone(); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const source = await readFile(new URL('sw.js', output), 'utf8');
  vm.runInNewContext(source, {
    URL, caches: cacheApi,
    fetch: () => { throw new Error('Network is offline'); },
    self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {} },
      addEventListener: (name, listener) => { events[name] = listener; } },
  });
  let completion;
  events.install({ waitUntil: (promise) => { completion = promise; } });
  await completion;
  events.activate({ waitUntil: (promise) => { completion = promise; } });
  await completion;
  assert.ok(stores.has('another-app-cache'));
  const route = '/screens/imaging/location';
  events.fetch({
    request: { url: `https://example.test${base}${route}`, method: 'GET', mode: 'navigate' },
    respondWith: (promise) => { completion = promise; },
  });
  const response = await completion;
  assert.equal(await response.text(), await readFile(new URL(`${route.slice(1)}.html`, output), 'utf8'));
  let intercepted = false;
  events.fetch({ request: { url: 'https://other.test/photo.jpg', method: 'GET' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
