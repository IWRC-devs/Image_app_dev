import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeSavedAnnotationFiles } from '../utils/savedAnnotationFiles.ts';
import { openSavedBatch, saveOpenedBatch } from '../utils/savedBatchEditing.ts';

const batch = { id: 'existing-batch', name: 'Field batch', savedAt: '2026-10-29T12:00:00Z',
  botanicalName: 'Selected species', collectorName: 'Collector', collectorEmail: 'collector@example.org', organization: 'Org',
  images: [{ id: 'photo', uri: 'content://saved/image_001.jpg', fileName: 'image_001.jpg', width: 4000, height: 3000,
    annotations: [{ id: 'box', classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.3 }] }] };

function fileStore(entries) {
  const contents = new Map(entries);
  const writes = [];
  return { contents, writes,
    read: async name => contents.get(name) ?? null,
    write: async (name, value) => { writes.push(name); contents.set(name, value); },
    remove: async name => { contents.delete(name); },
  };
}

test('native annotation updates touch only TXT files and keep image bytes and the existing batch identity', async () => {
  const files = fileStore([['image_001.jpg', 'ORIGINAL-PHOTO-BYTES'], ['batch.txt', 'old metadata'], ['image_001.txt', 'old boxes']]);
  const saved = await writeSavedAnnotationFiles(batch, files);
  assert.equal(saved.id, batch.id);
  assert.equal(files.contents.get('image_001.jpg'), 'ORIGINAL-PHOTO-BYTES');
  assert.deepEqual(files.writes, ['image_001.txt', 'classes.txt', 'batch.txt']);
  assert.equal(files.contents.get('image_001.txt'), '0 0.500000 0.500000 0.200000 0.300000');
  const metadata = JSON.parse(files.contents.get('batch.txt'));
  assert.equal(metadata.batch_name, batch.name);
  assert.equal(metadata.saved_at, batch.savedAt);
  assert.equal(metadata.collector.email, batch.collectorEmail);
  assert.equal(metadata.images['image_001.jpg'].bounding_box_coordinates.instance_1.weed_name, batch.botanicalName);
});

test('a partial native metadata write restores old labels and metadata and removes newly created labels', async () => {
  for (const hasLabels of [true, false]) {
    const files = fileStore([['image_001.jpg', 'ORIGINAL'], ['batch.txt', 'previous metadata'],
      ...(hasLabels ? [['image_001.txt', 'previous boxes'], ['classes.txt', 'previous classes']] : [])]);
    const before = new Map(files.contents);
    let fail = true;
    const originalWrite = files.write;
    files.write = async (name, value) => {
      await originalWrite(name, value);
      if (name === 'batch.txt' && fail) { fail = false; throw new Error('Simulated interrupted write'); }
    };
    await assert.rejects(writeSavedAnnotationFiles(batch, files), /Simulated interrupted write/);
    assert.deepEqual(files.contents, before);
  }
});

test('invalid coordinates or an unreadable backup cannot change any saved files', async () => {
  const files = fileStore([['batch.txt', 'metadata'], ['image_001.jpg', 'ORIGINAL']]);
  const invalid = { ...batch, images: [{ ...batch.images[0], annotations: [{ ...batch.images[0].annotations[0], width: -1 }] }] };
  await assert.rejects(writeSavedAnnotationFiles(invalid, files));
  assert.deepEqual(files.writes, []);
  files.read = async () => { throw new Error('Permission denied'); };
  await assert.rejects(writeSavedAnnotationFiles(batch, files), /Permission denied/);
  assert.deepEqual(files.writes, []);
});

test('opening legacy metadata does not require reentering collector details, and failed saves leave the session editable', async () => {
  const legacy = { ...batch, collectorName: null, collectorEmail: null, organization: null };
  const opened = openSavedBatch(legacy);
  assert.equal(opened.id, batch.id);
  assert.equal(opened.editingSavedBatch, true);
  opened.images[0].annotations[0].width = 0.1;
  assert.equal(batch.images[0].annotations[0].width, 0.2);
  await assert.rejects(saveOpenedBatch(opened, async () => { throw new Error('Storage full'); }), /Storage full/);
  assert.equal(opened.images[0].annotations[0].width, 0.1);
  assert.equal(opened.editingSavedBatch, true);
  let persisted;
  const saved = await saveOpenedBatch(opened, async value => { persisted = value; return value; });
  assert.equal(persisted.editingSavedBatch, undefined);
  assert.equal(persisted.savedAt, batch.savedAt);
  assert.equal(saved.id, opened.id);
  assert.equal(saved.collectorEmail, null);
});
