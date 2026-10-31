import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createUploadServer } from '../src/server.mjs';
import { validateConfig } from '../src/config.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
const zip = Buffer.from('504b0304aabbccddeeff', 'hex');
const batchId = sha('test batch');
const clientHeaders = { 'X-IWRC-Client': 'iwrc-local-pilot' };

async function setup(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'iwrc-upload-test-'));
  const requests = [];
  const store = { putVerified: async upload => {
    const bytes = await readFile(upload.file);
    requests.push({ ...upload, contents: bytes });
    assert.equal(upload.sha256, sha(bytes));
    assert.equal(upload.bytes, bytes.length);
    return { key: `pilot/${batchId}/${upload.sha256}.zip`, alreadyPresent: false };
  } };
  const server = createUploadServer({ store, dataRoot: root, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    assert.ok(path.basename(root).startsWith('iwrc-upload-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const sessionResponse = await fetch(origin + '/api/session', { headers: clientHeaders });
  const session = await sessionResponse.json();
  const cookie = sessionResponse.headers.get('set-cookie').split(';')[0];
  const headers = { ...clientHeaders, Origin: origin, Cookie: cookie, 'X-CSRF-Token': session.csrfToken,
    'Content-Type': 'application/zip', 'X-Content-SHA256': sha(zip), 'X-Batch-ID': batchId };
  return { root, server, origin, requests, session, headers };
}

test('unconfigured pilot refuses uploads and does not expose local configuration files', async t => {
  const app = await setup(t, { store: null });
  assert.equal(app.session.configured, false);
  const response = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: app.headers, body: zip });
  assert.equal(response.status, 503);
  for (const route of ['/config.local.json', '/.env', '/src/server.mjs', '/Image_app_dev/%2eprivate']) {
    const result = await fetch(app.origin + route);
    assert.ok([403, 404].includes(result.status));
  }
  assert.equal(app.requests.length, 0);
});

test('session, origin and DNS-rebinding protections reject unauthorized uploads', async t => {
  const app = await setup(t);
  const noHeader = await fetch(app.origin + '/api/session');
  assert.equal(noHeader.status, 403);
  const maliciousOrigin = await fetch(app.origin + '/api/session', { headers: { ...clientHeaders, Origin: 'https://attacker.example' } });
  assert.equal(maliciousOrigin.status, 403);
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const request = http.request(app.origin + '/', { headers: { Host: 'attacker.example' } }, response => {
      response.resume(); resolve(response.statusCode);
    });
    request.on('error', reject); request.end();
  });
  assert.equal(wrongHostStatus, 403);
  for (const change of [{ Cookie: '' }, { 'X-CSRF-Token': 'wrong' }, { Origin: 'https://attacker.example' },
    { 'X-CSRF-Token': 'é'.repeat(64) }]) {
    const response = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: { ...app.headers, ...change }, body: zip });
    assert.equal(response.status, 403);
  }
  assert.equal(app.requests.length, 0);
});

test('invalid checksums, paths, ZIP signatures and oversized bodies never reach storage', async t => {
  const app = await setup(t, { maxUploadBytes: 64 });
  for (const [body, overrides, status] of [[zip, { 'X-Content-SHA256': '0'.repeat(64) }, 400],
    [zip, { 'X-Batch-ID': '../outside' }, 400], [Buffer.from('not a zip'), { 'X-Content-SHA256': sha('not a zip') }, 400],
    [Buffer.alloc(65), {}, 413]]) {
    const response = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: { ...app.headers, ...overrides }, body });
    assert.equal(response.status, status);
  }
  assert.equal(app.requests.length, 0);
});

test('a verified upload preserves ZIP bytes and writes a non-secret receipt', async t => {
  const app = await setup(t);
  const response = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: app.headers, body: zip });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.verified, true);
  assert.equal(result.receipt.sha256, sha(zip));
  assert.equal(result.receipt.bytes, zip.length);
  assert.deepEqual(app.requests[0].contents, zip);
  const saved = JSON.parse(await readFile(path.join(app.root, 'receipts', `${batchId}.json`), 'utf8'));
  assert.deepEqual(saved, result.receipt);
});

test('storage errors do not expose secrets or create a successful receipt', async t => {
  const app = await setup(t, { store: { putVerified: async () => { throw new Error('PRIVATE-TEST-KEY signed-url secret=PRIVATE-TEST-SECRET'); } } });
  const response = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: app.headers, body: zip });
  const text = await response.text();
  assert.equal(response.status, 502);
  assert.equal(text.includes('PRIVATE-TEST'), false);
  assert.equal(text.includes('verified'), false);
  assert.equal((await readdir(app.root)).includes('receipts'), false);
});

test('a second concurrent transfer is rejected instead of consuming another upload allocation', async t => {
  let started;
  let finish;
  const ready = new Promise(resolve => { started = resolve; });
  const pending = new Promise(resolve => { finish = resolve; });
  const app = await setup(t, { store: { putVerified: async () => {
    started(); await pending; return { key: 'private/test.zip', alreadyPresent: false };
  } } });
  const first = fetch(app.origin + '/api/uploads', { method: 'POST', headers: app.headers, body: zip });
  await ready;
  const second = await fetch(app.origin + '/api/uploads', { method: 'POST', headers: app.headers, body: zip });
  assert.equal(second.status, 429);
  finish();
  assert.equal((await first).status, 200);
});

test('configuration refuses HTTP endpoints, public/unconfirmed buckets and unsafe prefixes without printing keys', () => {
  const config = { endpoint: 'https://object.example.org', bucket: 'private-bucket', region: 'us-east-1',
    prefix: 'iwrc/pilot', accessKeyId: 'PRIVATE-KEY', secretAccessKey: 'PRIVATE-SECRET', privateBucketConfirmed: true };
  assert.equal(validateConfig(config).maxUploadBytes, 134217728);
  for (const change of [{ endpoint: 'http://object.example.org' }, { endpoint: 'https://user:password@object.example.org' },
    { privateBucketConfirmed: false }, { prefix: '../other-project' }, { maxUploadBytes: 10 ** 12 }, { bucket: 'a/b' }]) {
    assert.throws(() => validateConfig({ ...config, ...change }), error => !error.message.includes('PRIVATE-'));
  }
});
