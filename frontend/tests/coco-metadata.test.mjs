import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toInternalMetadata, normalizeSavedBatch, batchFolderName } from '../utils/batchMetadata.ts';
import { ensureImageDimensions } from '../utils/imageDimensions.ts';

const box = { id: 'private-box', classId: 0, className: 'Amaranthus palmeri',
  xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.4 };
const fixture = { id: 'private-id', name: 'Batch', savedAt: '2026-11-12T12:00:00Z', botanicalName: 'Amaranthus palmeri',
  collectorName: 'Collector', collectorEmail: 'collector@example.org', organization: 'Organization',
  images: [2, 5, 0, 1, 3].map((count, index) => ({ id: `private-${index}`, uri: `file:///image_${index + 1}.jpg`,
    fileName: `image_${index + 1}.jpg`, width: 4000, height: 3000, mimeType: 'image/jpeg',
    annotations: Array.from({ length: count }, (_, instance) => ({ ...box, id: `${index}-${instance}` })) })) };

test('five images share one self-describing COCO dataset with unique annotation IDs and schema 1 last', () => {
  const metadata = toInternalMetadata(fixture);
  assert.equal(metadata.annotation_format, 'COCO');
  assert.equal(metadata.schema_version, 1);
  assert.equal(Object.keys(metadata).at(-1), 'schema_version');
  assert.equal(metadata.coordinate_system.units, 'pixels');
  assert.deepEqual(metadata.coordinate_system.bbox_order, ['x', 'y', 'width', 'height']);
  assert.equal(metadata.coco.images.length, 5);
  assert.equal(metadata.coco.annotations.length, 11);
  assert.equal(new Set(metadata.coco.annotations.map(annotation => annotation.id)).size, 11);
  for (const [index, image] of fixture.images.entries()) {
    const exported = metadata.images[image.fileName];
    assert.equal(exported.image_format, 'JPEG');
    assert.equal('mime_type' in exported, false);
    assert.equal(Object.keys(exported.bounding_box_coordinates).length, image.annotations.length);
    for (const annotation of Object.values(exported.bounding_box_coordinates)) {
      assert.equal(annotation.image_id, index + 1);
      assert.deepEqual(annotation.bbox, [1600, 900, 800, 1200]);
      assert.equal(annotation.area, 960000);
      assert.equal(annotation.iscrowd, 0);
      assert.equal(metadata.coco.categories.find(category => category.id === annotation.category_id).name, fixture.botanicalName);
      assert.deepEqual(metadata.coco.annotations.find(item => item.id === annotation.id), annotation);
    }
  }
  assert.equal(JSON.stringify(metadata).includes('private-'), false);
  const files = Object.fromEntries(fixture.images.map(image => [image.fileName, image.uri]));
  for (const serialized of [metadata, metadata.coco]) {
    const loaded = normalizeSavedBatch(serialized, 'batch', files);
    assert.deepEqual(loaded.images.map(image => image.annotations.length), [2, 5, 0, 1, 3]);
    assert.equal(loaded.images[1].annotations[0].xCenter, 0.5);
    assert.equal(loaded.images[1].annotations[0].width, 0.2);
  }
});

test('legacy schema 5 boxes retain their geometry when rewritten into COCO', () => {
  const old = { schema_version: 5, batch_name: 'Older batch', classes: ['Amaranthus palmeri'], images: {
    'old.png': { resolution: { width: 1200, height: 800 }, mime_type: 'image/png', bounding_box_coordinates: {
      instance_1: { weed_name: 'Amaranthus palmeri', x_center: 0.25, y_center: 0.5, width: 0.5, height: 1 },
    } },
  } };
  const loaded = normalizeSavedBatch(old, 'old', { 'old.png': 'file:///old.png' });
  const updated = toInternalMetadata(loaded);
  assert.deepEqual(updated.coco.annotations[0].bbox, [0, 0, 600, 800]);
  assert.deepEqual(normalizeSavedBatch(updated, 'old', { 'old.png': 'file:///old.png' }).images[0].annotations,
    [{ ...loaded.images[0].annotations[0], id: '1' }]);
});

test('missing dimensions in old batches are measured without altering the original record', async () => {
  const batch = { images: [{ id: 'old', uri: 'file:///old.jpg' }, fixture.images[0]] };
  const calls = [];
  const complete = await ensureImageDimensions(batch, async uri => { calls.push(uri); return { width: 200, height: 100 }; });
  assert.deepEqual(calls, ['file:///old.jpg']);
  assert.equal(complete.images[0].width, 200);
  assert.equal(batch.images[0].width, undefined);
  await assert.rejects(ensureImageDimensions(batch, async () => ({ width: 0, height: 100 })), /measured/);
});

test('export folder names cannot escape the IWRC root', () => {
  for (const name of ['..', '../outside', 'nested/folder', 'folder\\child', 'NUL', ' ']) {
    const folder = batchFolderName({ name });
    assert.ok(folder && folder !== '..' && !/[\\/]/.test(folder));
  }
});
