import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { normalizeAnnotation, normalizeSavedBatch, toInternalMetadata, yoloLine } from '../utils/batchMetadata.ts';
import { createBatchArchive } from '../utils/exportBatch.web.ts';
import { normalizeExif } from '../utils/imageMetadata.ts';

const lighting = [{ id: 1, name: 'sunny' }];
const box = { id: 'internal-box-uuid', classId: 0, className: 'Test specimen',
  xCenter: 0.5, yCenter: 0.4, width: 0.2, height: 0.4 };
const fixture = {
  id: 'internal-batch-uuid', name: 'field_batch', savedAt: '2026-10-29T12:00:00Z', synced: false,
  locationCountry: 'United States', locationState: 'Texas', locationCity: null,
  collectorName: 'Sample Collector', collectorEmail: 'collector@example.org', organization: 'Example Organization',
  botanicalName: 'Test specimen', growingEnvironment: 'Greenhouse', plantingSystem: 'Pot',
  weedBackground: 'Crop', growthStage: 'Seedling', soilColor: 'Brown', lightingId: 1,
  images: [{ id: 'internal-image-uuid', uri: 'data:image/png;base64,aW1hZ2UtYnl0ZXM=', fileName: 'original.png',
    width: 200, height: 100, mimeType: 'image/png', fileSizeBytes: 11,
    exif: { cameraMake: 'Test', cameraModel: 'Camera', latitude: 0, longitude: 0 },
    annotations: [box, { ...box, id: 'another-box', xCenter: 0.8, width: 0.1 }] }],
};

test('clean metadata preserves parameters, EXIF and boxes through a saved-file round trip', () => {
  const metadata = toInternalMetadata(fixture, lighting);
  const json = JSON.stringify(metadata);
  assert.equal(json.includes('internal-'), false);
  for (const key of ['"id":', '"uri":', '"lighting_id":', '"class_id":']) assert.equal(json.includes(key), false);
  assert.equal(metadata.parameters.growing_environment, 'Greenhouse');
  assert.equal(metadata.parameters.planting_system, 'Pot');
  assert.equal(metadata.parameters.lighting, 'Sunny');
  assert.deepEqual(metadata.collector, { name: 'Sample Collector', email: 'collector@example.org', organization: 'Example Organization' });
  assert.deepEqual(metadata.images['original.png'].exif.gps, { latitude: 0, longitude: 0 });
  const loaded = normalizeSavedBatch(metadata, 'batch-folder', { 'original.png': 'file:///original.png' }, lighting);
  assert.equal(loaded.id, 'batch-folder');
  assert.equal(loaded.collectorName, 'Sample Collector');
  assert.equal(loaded.collectorEmail, 'collector@example.org');
  assert.equal(loaded.organization, 'Example Organization');
  assert.equal(loaded.images[0].uri, 'file:///original.png');
  assert.equal(loaded.images[0].annotations.length, 2);
  assert.equal(yoloLine(loaded.images[0].annotations[0]), '0 0.500000 0.400000 0.200000 0.400000');
});

test('previous flat schemas and unannotated photos still load', () => {
  const loaded = normalizeSavedBatch({ id: 'old', weed_site: 'Pot', lighting_id: 1,
    images: [{ id: 'photo', uri: 'file:///old.jpg' }] }, 'fallback', {}, lighting);
  assert.equal(loaded.plantingSystem, 'Pot');
  assert.equal(loaded.lightingId, 1);
  assert.deepEqual(loaded.images[0].annotations, []);
  assert.equal(loaded.collectorName, null);
  assert.equal(loaded.collectorEmail, null);
  assert.equal(loaded.organization, null);
  assert.deepEqual(toInternalMetadata(loaded, lighting).collector, {});
  assert.equal(normalizeSavedBatch({ weed_site: 'Field' }).growingEnvironment, 'Field');
});

test('download contains image bytes, clean batch JSON, classes and per-image YOLO labels', async () => {
  const batch = { ...fixture, images: [...fixture.images, { ...fixture.images[0], id: 'negative', annotations: [] }] };
  const files = unzipSync(await createBatchArchive(batch, lighting));
  assert.deepEqual(Object.keys(files).sort(), ['batch.txt', 'classes.txt', 'image_001.png', 'image_001.txt', 'image_002.png', 'image_002.txt']);
  assert.equal(strFromU8(files['image_001.png']), 'image-bytes');
  assert.equal(strFromU8(files['classes.txt']), 'Test specimen');
  assert.equal(strFromU8(files['image_001.txt']).split('\n').length, 2);
  assert.equal(strFromU8(files['image_002.txt']), '');
  const metadata = JSON.parse(strFromU8(files['batch.txt']));
  assert.equal(metadata.images['image_001.png'].annotations.length, 2);
  assert.equal(metadata.parameters.planting_system, 'Pot');
  assert.deepEqual(metadata.collector, { name: 'Sample Collector', email: 'collector@example.org', organization: 'Example Organization' });
});

test('invalid boxes cannot become YOLO training labels', () => {
  assert.equal(normalizeAnnotation({ ...box, width: 2 }, 0), null);
  assert.equal(normalizeAnnotation({ ...box, xCenter: NaN }, 0), null);
  assert.throws(() => yoloLine({ ...box, height: -1 }));
});

test('EXIF GPS rational coordinates and below-sea-level altitude retain their signs', () => {
  const exif = normalizeExif({ GPSLatitude: ['30/1', '15/1', '0/1'], GPSLatitudeRef: 'S',
    GPSLongitude: [97, 30, 0], GPSLongitudeRef: 'W', GPSAltitude: '12/1', GPSAltitudeRef: 1 });
  assert.equal(exif.latitude, -30.25);
  assert.equal(exif.longitude, -97.5);
  assert.equal(exif.altitudeMeters, -12);
});
