import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveBatch, getSavedBatches, deleteBatch } from '../utils/batchStore.web.ts';

const fixture = (id, savedAt = '2026-10-29T12:00:00Z') => ({
  id, name: id, savedAt, synced: false,
  locationCountry: 'United States', locationState: 'Texas', locationCity: null,
  botanicalName: 'Test specimen', weedBackground: 'Soil', growthStage: 'Seedling', soilColor: 'Brown',
  growingEnvironment: 'Field', plantingSystem: 'Soil',
  images: [{ id: 'photo-1', uri: 'data:image/png;base64,aW1hZ2UtYnl0ZXM=',
    fileName: 'specimen.png', width: 200, height: 100, mimeType: 'image/png', fileSizeBytes: 11,
    exif: { cameraModel: 'Test camera', latitude: 0, longitude: 0 },
    annotations: [{ id: 'box-1', classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.4, height: 0.2 }] }],
});

test('photo bytes and metadata survive a fresh page module, and deletion persists', async () => {
  await saveBatch(fixture('durable-batch'));
  const freshPage = await import(`../utils/batchStore.web.ts?reload=${Date.now()}`);
  const [saved] = await freshPage.getSavedBatches();
  assert.equal(saved.name, 'durable-batch');
  assert.equal(saved.botanicalName, 'Test specimen');
  assert.equal(saved.growingEnvironment, 'Field');
  assert.equal(saved.plantingSystem, 'Soil');
  assert.equal(saved.images[0].width, 200);
  assert.equal(saved.images[0].fileName, 'specimen.png');
  assert.deepEqual(saved.images[0].exif, { cameraModel: 'Test camera', latitude: 0, longitude: 0 });
  assert.deepEqual(saved.images[0].annotations, fixture('durable-batch').images[0].annotations);
  assert.equal(await (await fetch(saved.images[0].uri)).text(), 'image-bytes');
  await freshPage.deleteBatch('durable-batch');
  assert.deepEqual(await getSavedBatches(), []);
});

test('unreadable replacement photos do not destroy a previously saved batch', async () => {
  await saveBatch(fixture('existing-batch'));
  await assert.rejects(saveBatch({
    ...fixture('existing-batch'), name: 'Replacement',
    images: [{ id: 'broken', uri: 'blob:missing-photo' }],
  }));
  const [saved] = await getSavedBatches();
  assert.equal(saved.name, 'existing-batch');
  assert.equal(await (await fetch(saved.images[0].uri)).text(), 'image-bytes');
  await deleteBatch('existing-batch');
});

test('batches sort newest first and replacement does not create a duplicate', async () => {
  await saveBatch(fixture('older', '2026-10-28T12:00:00Z'));
  await saveBatch(fixture('newer', '2026-10-29T12:00:00Z'));
  await saveBatch({ ...fixture('older', '2026-10-28T12:00:00Z'), name: 'Updated' });
  const batches = await getSavedBatches();
  assert.deepEqual(batches.map((batch) => batch.id), ['newer', 'older']);
  assert.equal(batches[1].name, 'Updated');
  await deleteBatch('older');
  await deleteBatch('newer');
});

test('browser batches saved before the handoff keep their photos and load without boxes', async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('iwrc-imaging', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('batches', 'readwrite');
    transaction.objectStore('batches').put({ ...fixture('legacy-browser'),
      images: [{ id: 'old-photo', blob: new Blob(['old-photo-bytes'], { type: 'image/jpeg' }) }] });
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
  const [saved] = await getSavedBatches();
  assert.deepEqual(saved.images[0].annotations, []);
  assert.equal(await (await fetch(saved.images[0].uri)).text(), 'old-photo-bytes');
  await deleteBatch('legacy-browser');
});
