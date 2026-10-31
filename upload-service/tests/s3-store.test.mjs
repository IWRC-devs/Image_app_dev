import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { S3Store } from '../src/s3-store.mjs';

const digest = (data, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(data).digest(encoding);
async function setup(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'iwrc-s3-test-'));
  t.after(async () => {
    assert.ok(path.basename(root).startsWith('iwrc-s3-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const objects = new Map();
  let puts = 0;
  let corrupt = false;
  const client = { send: async command => {
    const input = command.input;
    if (command.constructor.name === 'HeadObjectCommand') {
      if (!objects.has(input.Key)) throw Object.assign(new Error('Missing'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
      const object = objects.get(input.Key);
      return { ContentLength: object.bytes.length, Metadata: object.metadata };
    }
    if (command.constructor.name === 'PutObjectCommand') {
      assert.equal(input.ACL, undefined);
      const chunks = [];
      for await (const chunk of input.Body) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      assert.equal(input.ContentMD5, digest(bytes, 'md5', 'base64'));
      objects.set(input.Key, { bytes, metadata: input.Metadata }); puts++;
      return {};
    }
    if (command.constructor.name === 'GetObjectCommand') {
      const object = objects.get(input.Key);
      const bytes = corrupt ? Buffer.alloc(object.bytes.length) : object.bytes;
      return { ContentLength: bytes.length, Body: Readable.from([bytes]) };
    }
    throw new Error('Unexpected command');
  } };
  const store = new S3Store({ bucket: 'private-test', prefix: 'iwrc/navjot' }, client);
  const upload = async data => {
    const bytes = Buffer.from(data);
    const file = path.join(root, `${digest(bytes)}.zip`);
    await writeFile(file, bytes);
    return store.putVerified({ file, batchId: digest('batch'), sha256: digest(bytes), bytes: bytes.length, md5: digest(bytes, 'md5', 'base64') });
  };
  return { objects, upload, puts: () => puts, corrupt: () => { corrupt = true; } };
}

test('uploads never request a public ACL, retries reuse one object and annotation revisions keep distinct versions', async t => {
  const app = await setup(t);
  const first = await app.upload('first annotated ZIP bytes');
  const retry = await app.upload('first annotated ZIP bytes');
  assert.equal(first.key, retry.key);
  assert.equal(retry.alreadyPresent, true);
  assert.equal(app.puts(), 1);
  const revision = await app.upload('revised annotated ZIP bytes');
  assert.notEqual(revision.key, first.key);
  assert.equal(app.objects.size, 2);
});

test('a stored object with different downloaded bytes never receives a verified result', async t => {
  const app = await setup(t);
  app.corrupt();
  await assert.rejects(app.upload('original ZIP bytes'), /verification failed/);
});
