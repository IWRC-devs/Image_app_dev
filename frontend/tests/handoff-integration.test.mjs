import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { normalizeAnnotation, normalizeSavedBatch, toInternalMetadata, yoloLine } from '../utils/batchMetadata.ts';
import { createBatchArchive } from '../utils/exportBatch.web.ts';
import { normalizeExif } from '../utils/imageMetadata.ts';
import { completeAnnotationEdit } from '../utils/annotationEditing.ts';

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
  assert.equal(metadata.schema_version, 5);
  assert.deepEqual(metadata.images['original.png'].bounding_box_coordinates.instance_1, {
    weed_name: 'Test specimen', x_center: 0.5, y_center: 0.4, width: 0.2, height: 0.4,
  });
  assert.equal(metadata.images['original.png'].bounding_box_coordinates.instance_2.x_center, 0.8);
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
  assert.equal(Object.keys(metadata.images['image_001.png'].bounding_box_coordinates).length, 2);
  assert.deepEqual(metadata.images['image_002.png'].bounding_box_coordinates, {});
  assert.deepEqual(metadata.images['image_001.png'].resolution, { width: 200, height: 100 });
  assert.equal(metadata.images['image_001.png'].file_size_bytes, 11);
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

test('Done preserves all collected images and returns to their collection screen', () => {
  const secondImage = { ...fixture.images[0], id: 'second-image', annotations: [] };
  for (const mode of ['manual', 'capture']) {
    const batch = { ...fixture, selectedOption: mode, images: [...fixture.images, secondImage] };
    const result = completeAnnotationEdit(batch, secondImage.id, [box], { width: 200, height: 100 });
    assert.equal(result.route, `/screens/imaging/${mode === 'capture' ? 'capture-image' : 'image-selection'}`);
    assert.equal(result.batch.images.length, 2);
    assert.equal(result.batch.images[0], batch.images[0]);
    assert.equal(result.batch.images[1].annotations[0].className, fixture.botanicalName);
    assert.equal(secondImage.annotations.length, 0);
    const metadata = toInternalMetadata({ ...result.batch, images: result.batch.images.map((image, index) => ({ ...image, fileName: `image_${index + 1}.png` })) }, lighting);
    assert.equal(Object.keys(metadata.images['image_1.png'].bounding_box_coordinates).length, 2);
    assert.equal(Object.keys(metadata.images['image_2.png'].bounding_box_coordinates).length, 1);
    assert.equal(completeAnnotationEdit(result.batch, secondImage.id, [], { width: 200, height: 100 }).batch.images[1].annotations.length, 0);
  }
});

test('schema 4 annotations still load alongside the new instance format', () => {
  const batch = normalizeSavedBatch({ schema_version: 4, classes: ['Test specimen'], images: {
    'old.jpg': { resolution: { width: 200, height: 100 }, annotations: [{ class_name: 'Test specimen',
      bbox_yolo: { x_center: 0.5, y_center: 0.4, width: 0.2, height: 0.4 } }] },
  } }, 'old', { 'old.jpg': 'file:///old.jpg' });
  assert.equal(batch.images[0].annotations[0].className, 'Test specimen');
  assert.equal(yoloLine(batch.images[0].annotations[0]), '0 0.500000 0.400000 0.200000 0.400000');
});
