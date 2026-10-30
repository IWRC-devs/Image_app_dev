import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveBatch, getSavedBatches, deleteBatch, saveBatchAnnotations } from '../utils/batchStore.web.ts';
import { openSavedBatch, saveOpenedBatch } from '../utils/savedBatchEditing.ts';
import { completeAnnotationEdit } from '../utils/annotationEditing.ts';
import { createBatchArchive } from '../utils/exportBatch.web.ts';
import { strFromU8, unzipSync } from 'fflate';
import { addTappedBox, finishBox, createHistory, imageFrame, fitView } from '../utils/annotationCanvas.ts';

const fixture = (id, savedAt = '2026-10-29T12:00:00Z') => ({
  id, name: id, savedAt, synced: false,
  locationCountry: 'United States', locationState: 'Texas', locationCity: null,
  botanicalName: 'Test specimen', weedBackground: 'Soil', growthStage: 'Seedling', soilColor: 'Brown',
  growingEnvironment: 'Field', plantingSystem: 'Soil',
  collectorName: 'Sample Collector', collectorEmail: 'collector@example.org', organization: 'Example Organization',
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
  assert.equal(saved.collectorName, 'Sample Collector');
  assert.equal(saved.collectorEmail, 'collector@example.org');
  assert.equal(saved.organization, 'Example Organization');
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

test('a saved batch can be reopened, annotated and reloaded without duplicates or changed photos and metadata', async () => {
  const original = fixture('reopen-existing');
  original.images.push({ ...structuredClone(original.images[0]), id: 'photo-2', fileName: 'second.png', annotations: [] });
  await saveBatch(original);
  const [loaded] = await getSavedBatches();
  const opened = openSavedBatch(loaded);
  const originalBoxes = structuredClone(loaded.images[0].annotations);
  const added = { ...opened.images[0].annotations[0], id: 'extra-box', xCenter: 0.75, width: 0.1 };
  const completed = completeAnnotationEdit(opened, opened.images[0].id,
    [...opened.images[0].annotations, added], { width: 200, height: 100 });
  assert.equal(completed.route, '/screens/imaging/saved-batch');
  await saveOpenedBatch(completed.batch, saveBatchAnnotations);
  assert.deepEqual(loaded.images[0].annotations, originalBoxes);
  const freshPage = await import(`../utils/batchStore.web.ts?reopen=${Date.now()}`);
  const batches = await freshPage.getSavedBatches();
  assert.equal(batches.length, 1);
  const saved = batches[0];
  assert.equal(saved.id, original.id);
  assert.equal(saved.name, original.name);
  assert.equal(saved.savedAt, original.savedAt);
  for (const field of ['collectorName', 'collectorEmail', 'organization', 'locationCountry', 'locationState',
    'botanicalName', 'growingEnvironment', 'plantingSystem', 'growthStage', 'soilColor']) {
    assert.equal(saved[field], original[field]);
  }
  assert.equal(saved.editingSavedBatch, undefined);
  assert.equal(saved.images[0].annotations.length, 2);
  assert.deepEqual(saved.images[1].annotations, []);
  for (const [index, image] of saved.images.entries()) {
    assert.equal(await (await fetch(image.uri)).text(), 'image-bytes');
    assert.deepEqual(image.exif, original.images[index].exif);
    assert.equal(image.width, original.images[index].width);
    assert.equal(image.fileName, original.images[index].fileName);
  }
  const archive = unzipSync(await createBatchArchive(saved));
  assert.equal(strFromU8(archive['image_001.txt']).split('\n').length, 2);
  const metadata = JSON.parse(strFromU8(archive['batch.txt']));
  assert.equal(Object.keys(metadata.images['image_001.png'].bounding_box_coordinates).length, 2);
  assert.equal(metadata.collector.email, original.collectorEmail);
  // Removing the last boxes is also a durable edit, not a duplicate/new batch.
  const noBoxes = completeAnnotationEdit(openSavedBatch(saved), saved.images[0].id, [], { width: 200, height: 100 });
  await saveOpenedBatch(noBoxes.batch, saveBatchAnnotations);
  assert.deepEqual((await getSavedBatches())[0].images[0].annotations, []);
  await deleteBatch(original.id);
});

test('stale saved-batch edits fail without replacing photos or recreating a deleted batch', async () => {
  const original = fixture('stale-edit');
  await saveBatch(original);
  const [loaded] = await getSavedBatches();
  await assert.rejects(saveBatchAnnotations({ ...loaded, images: [{ ...loaded.images[0], id: 'different-photo' }] }));
  const [unchanged] = await getSavedBatches();
  assert.equal(unchanged.images[0].id, original.images[0].id);
  assert.deepEqual(unchanged.images[0].annotations, original.images[0].annotations);
  const opened = openSavedBatch(unchanged);
  await deleteBatch(original.id);
  await assert.rejects(saveOpenedBatch(opened, saveBatchAnnotations));
  assert.deepEqual(await getSavedBatches(), []);
});

test('saving each tapped box keeps one batch and allows another box to be saved immediately', async () => {
  const original = fixture('save-each-box');
  original.images[0].annotations = [];
  await saveBatch(original);
  const [loaded] = await getSavedBatches();
  let opened = openSavedBatch(loaded);
  let history = finishBox(createHistory());
  const source = { width: 200, height: 100 };
  const viewport = { width: 400, height: 300 };
  const frame = imageFrame(source, viewport, fitView());
  for (let instance = 1; instance <= 2; instance++) {
    history = addTappedBox(history, `instance-${instance}`, opened.botanicalName,
      { x: 120 + instance * 50, y: 150 }, frame, source, viewport);
    opened = await saveOpenedBatch(completeAnnotationEdit(opened, 'photo-1', history.present.boxes, source).batch,
      saveBatchAnnotations);
    history = finishBox(history);
    // Re-reading the database confirms each Save box was durable before the next tap.
    const persisted = await new Promise((resolve, reject) => {
      const request = indexedDB.open('iwrc-imaging', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('batches', 'readonly');
        const read = transaction.objectStore('batches').get(original.id);
        transaction.oncomplete = () => { resolve(read.result); db.close(); };
        transaction.onabort = () => { reject(transaction.error); db.close(); };
      };
    });
    assert.equal(persisted.images[0].annotations.length, instance);
    assert.equal(await persisted.images[0].blob.text(), 'image-bytes');
  }
  const batches = await getSavedBatches();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].id, original.id);
  const archive = unzipSync(await createBatchArchive(batches[0]));
  assert.equal(strFromU8(archive['image_001.txt']).split('\n').length, 2);
  await deleteBatch(original.id);
});
