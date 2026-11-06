import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { strFromU8, unzipSync } from 'fflate';
import { localUploadOrigin, uploadLocalBatch } from '../utils/localUpload.web.ts';
import { createBatchArchive } from '../utils/exportBatch.web.ts';

const origin = 'http://127.0.0.1:8787';
const batch = { id: 'saved-batch', name: 'Batch', savedAt: '2026-10-29T12:00:00Z', botanicalName: 'Species',
  collectorName: 'Test', collectorEmail: 'test@example.org', organization: 'Test organization',
  images: [{ id: 'photo', uri: 'data:image/png;base64,aW1hZ2UtYnl0ZXM=', width: 200, height: 100, fileSizeBytes: 11,
    annotations: [{ id: 'box', classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.2 }] }] };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('upload controls are enabled only on the designated loopback pilot, not the public app or arbitrary hosts', () => {
  assert.equal(localUploadOrigin(origin + '/Image_app_dev/'), origin);
  assert.equal(localUploadOrigin('http://localhost:8787/Image_app_dev/'), 'http://localhost:8787');
  for (const href of ['https://iwrc-devs.github.io/Image_app_dev/', 'http://192.168.1.2:8787',
    'http://127.0.0.1:8081', 'http://localhost.attacker.example:8787', 'invalid']) assert.equal(localUploadOrigin(href), null);
});

test('an unchanged batch exports byte-identically later, so retries do not create duplicate object revisions', async t => {
  const first = await createBatchArchive(batch);
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 60_000 });
  const second = await createBatchArchive(batch);
  assert.deepEqual(second, first);
  const metadata = JSON.parse(strFromU8(unzipSync(second)['batch.txt']));
  assert.equal(metadata.saved_at, batch.savedAt);
});

test('upload transfers the complete ZIP and accepts only a matching verified receipt without changing local metadata', async () => {
  const before = structuredClone(batch);
  const phases = [];
  let uploaded;
  const request = async (url, options) => {
    assert.equal(options.credentials, 'same-origin');
    if (url.endsWith('/api/session')) return json({ configured: true, csrfToken: 'session-token', maxUploadBytes: 1048576 });
    assert.equal(url, origin + '/api/uploads');
    uploaded = Buffer.from(await options.body.arrayBuffer());
    assert.equal(options.headers['X-Content-SHA256'], hash(uploaded));
    assert.equal(options.headers['X-CSRF-Token'], 'session-token');
    return json({ verified: true, receipt: { sha256: hash(uploaded), bytes: uploaded.length,
      batchId: options.headers['X-Batch-ID'], objectKey: 'pilot/opaque-key.zip', verifiedAt: '2026-10-31T12:00:00Z' } });
  };
  const receipt = await uploadLocalBatch(batch, origin, phase => phases.push(phase), request);
  assert.equal(receipt.sha256, hash(uploaded));
  assert.deepEqual(phases, ['preparing', 'uploading']);
  const files = unzipSync(uploaded);
  for (const name of ['batch.txt', 'classes.txt', 'image_001.jpg', 'image_001.txt']) assert.ok(files[name]);
  assert.equal(strFromU8(files['image_001.txt']), '0 0.500000 0.500000 0.200000 0.200000');
  assert.deepEqual(batch, before);
});

test('unconfigured storage, large batches and invalid receipts cannot report successful uploads', async () => {
  await assert.rejects(uploadLocalBatch(batch, origin, () => {}, async () => json({ configured: false })), /not configured/);
  await assert.rejects(uploadLocalBatch(batch, origin, () => {}, async () => json({ configured: true, csrfToken: 'token', maxUploadBytes: 1 })), /limit/);
  await assert.rejects(uploadLocalBatch(batch, 'https://attacker.example', () => {}, async () => { throw new Error('Must not be called'); }), /local pilot/);
  const request = async url => url.endsWith('/api/session')
    ? json({ configured: true, csrfToken: 'token', maxUploadBytes: 1048576 })
    : json({ verified: true, receipt: { sha256: 'wrong', batchId: 'wrong', bytes: 0 } });
  await assert.rejects(uploadLocalBatch(batch, origin, () => {}, request), /receipt/);
});
