import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as metadata from '../utils/batchMetadata.ts';
import * as dimensions from '../utils/imageDimensions.ts';
import * as annotationFiles from '../utils/savedAnnotationFiles.ts';

const source = await readFile(new URL('../utils/batchStore.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function nativeStore(platform = 'android') {
  const files = new Map();
  const directories = new Map();
  const preferences = new Map();
  const writes = [];
  const removed = [];
  const measured = [];
  const plain = uri => uri.replace(/\/$/, '');
  const addDirectory = uri => { if (!directories.has(plain(uri))) directories.set(plain(uri), []); return plain(uri); };
  const addFile = (directory, name, content) => {
    addDirectory(directory);
    const uri = `${plain(directory)}/${name}`;
    if (!directories.get(plain(directory)).includes(uri)) directories.get(plain(directory)).push(uri);
    files.set(uri, content);
    return uri;
  };
  const documents = addDirectory('content://documents');
  const request = { granted: true, directoryUri: documents };
  let failMetadata = false;
  const fs = {
    documentDirectory: 'file:///app/', EncodingType: { Base64: 'base64' },
    getInfoAsync: async uri => ({ exists: files.has(uri) || directories.has(plain(uri)),
      isDirectory: directories.has(plain(uri)), size: files.get(uri)?.length }),
    makeDirectoryAsync: async uri => {
      const directory = addDirectory(uri);
      const parent = directory.slice(0, directory.lastIndexOf('/'));
      addDirectory(parent);
      if (!directories.get(parent).includes(directory)) directories.get(parent).push(directory);
    },
    readDirectoryAsync: async uri => {
      if (!directories.has(plain(uri))) throw new Error('Missing directory');
      return directories.get(plain(uri)).map(child => child.slice(plain(uri).length + 1));
    },
    readAsStringAsync: async uri => {
      if (!files.has(uri)) throw new Error('Missing file');
      return files.get(uri);
    },
    writeAsStringAsync: async (uri, content) => {
      writes.push(uri);
      addFile(uri.slice(0, uri.lastIndexOf('/')), uri.slice(uri.lastIndexOf('/') + 1), content);
      if (failMetadata && uri.endsWith('/batch.txt')) { failMetadata = false; throw new Error('Interrupted metadata write'); }
    },
    copyAsync: async ({ from, to }) => {
      if (!files.has(from)) throw new Error('Missing photo');
      addFile(to.slice(0, to.lastIndexOf('/')), to.slice(to.lastIndexOf('/') + 1), files.get(from));
    },
    deleteAsync: async uri => { files.delete(uri); removed.push(uri); },
    StorageAccessFramework: {
      getUriForDirectoryInRoot: () => documents,
      requestDirectoryPermissionsAsync: async () => request,
      readDirectoryAsync: async uri => {
        if (!directories.has(plain(uri))) throw new Error('Missing directory');
        return directories.get(plain(uri));
      },
      makeDirectoryAsync: async (parent, name) => {
        const uri = addDirectory(`${plain(parent)}/${name}`);
        directories.get(plain(parent)).push(uri);
        return uri;
      },
      createFileAsync: async (parent, name) => addFile(parent, name, ''),
      deleteAsync: async uri => {
        files.delete(uri);
        removed.push(uri);
        for (const [parent, children] of directories) directories.set(parent, children.filter(child => child !== uri));
      },
    },
  };
  const imports = {
    '@react-native-async-storage/async-storage': { getItem: async key => preferences.get(key) ?? null,
      setItem: async (key, value) => { preferences.set(key, value); } },
    'expo-file-system/legacy': fs,
    'react-native': { Platform: { OS: platform }, Image: { getSize: (uri, resolve) => {
      measured.push(uri); resolve(200, 100);
    } } },
    '@/utils/savedAnnotationFiles': annotationFiles, '@/utils/batchMetadata': metadata, '@/utils/imageDimensions': dimensions,
    '@/assets/data/lighting.json': [{ id: 1, name: 'sunny' }],
  };
  const module = { exports: {} };
  const execute = vm.runInNewContext(`(function(require, module, exports) {${compiled}\n})`, { console });
  execute(name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  }, module, module.exports);
  return { api: module.exports, files, directories, preferences, writes, removed, measured, addFile, addDirectory,
    request, interruptMetadata: () => { failMetadata = true; } };
}

const annotation = { id: 'box', classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.4 };
const batch = { id: 'old-id', name: 'Field batch', botanicalName: 'Species', savedAt: '2026-11-12T12:00:00Z',
  images: [{ id: 'photo', uri: 'file:///selected.jpg', fileName: 'selected.jpg', width: 200, height: 100, annotations: [annotation] }] };

test('Android new saves use IWRC/batch-name with photos and one batch.txt, and retry partial saves safely', async () => {
  const store = nativeStore();
  store.files.set(batch.images[0].uri, 'cGhvdG8=');
  store.interruptMetadata();
  await assert.rejects(store.api.saveBatch(batch), /Interrupted/);
  const saved = await store.api.saveBatch(batch);
  assert.equal(saved.storageDirectoryUri, 'content://documents/IWRC/Field batch');
  assert.deepEqual(store.directories.get(saved.storageDirectoryUri).map(uri => uri.split('/').at(-1)), ['image_001.jpg', 'batch.txt']);
  const written = JSON.parse(store.files.get(saved.storageDirectoryUri + '/batch.txt'));
  assert.deepEqual(written.coco.annotations[0].bbox, [80, 30, 40, 40]);
  assert.equal((await store.api.getSavedBatches())[0].id, saved.id);
  const previous = new Map(store.files);
  await assert.rejects(store.api.saveBatchAnnotations({ ...saved, id: 'another-batch' }), /unavailable/);
  await assert.rejects(store.api.saveBatchAnnotations({ ...saved,
    images: saved.images.map(image => ({ ...image, uri: 'file:///different-photo.jpg' })) }), /photos changed/);
  assert.deepEqual(store.files, previous);
  await assert.rejects(store.api.saveBatch(batch), /already saved/);
  assert.deepEqual(store.files, previous);
});

test('Android legacy SAF batches survive new-root creation and repeated annotation saves', async () => {
  const store = nativeStore();
  const root = store.addDirectory('content://documents/IWRC imaging');
  const folder = store.addDirectory(root + '/older');
  store.directories.get(root).push(folder);
  store.preferences.set('iwrc_imaging_root_directory_uri', root);
  const imageUri = store.addFile(folder, 'old.jpg', 'ORIGINAL-PHOTO');
  store.addFile(folder, 'batch.txt', JSON.stringify({ ...batch, id: 'older', images: [{ id: 'legacy-uuid', uri: imageUri, annotations: [] }] }));
  let saved = (await store.api.getSavedBatches())[0];
  assert.equal(saved.images[0].fileName, 'old.jpg');
  saved.images[0].annotations = [annotation];
  saved = await store.api.saveBatchAnnotations(saved);
  saved.images[0].annotations.push({ ...annotation, id: 'second' });
  await store.api.saveBatchAnnotations(saved);
  const reloaded = (await store.api.getSavedBatches())[0];
  assert.equal(reloaded.images[0].annotations.length, 2);
  assert.equal(reloaded.images[0].width, 200);
  assert.equal(store.files.get(imageUri), 'ORIGINAL-PHOTO');
  assert.ok(store.writes.every(uri => uri.endsWith('/batch.txt')));
  assert.deepEqual(store.removed, []);
  store.files.set(batch.images[0].uri, 'cGhvdG8=');
  await store.api.saveBatch(batch);
  assert.equal((await store.api.getSavedBatches()).length, 2);
  assert.equal(store.preferences.get('iwrc_imaging_root_directory_uri'), root);
});

test('Android users can reconnect an older folder after preferences are missing', async () => {
  const store = nativeStore();
  const folder = store.addDirectory('content://older-batches/old');
  store.addDirectory('content://older-batches');
  store.directories.get('content://older-batches').push(folder);
  const uri = store.addFile(folder, 'old.jpg', 'ORIGINAL');
  store.addFile(folder, 'batch.txt', JSON.stringify({ ...batch, images: [{ id: 'old-photo', uri, width: 200, height: 100 }] }));
  assert.equal((await store.api.getSavedBatches()).length, 0);
  store.request.directoryUri = 'content://older-batches';
  await store.api.connectSavedBatchFolder();
  const [opened] = await store.api.getSavedBatches();
  opened.images[0].annotations = [annotation];
  await store.api.saveBatchAnnotations(opened);
  assert.equal((await store.api.getSavedBatches())[0].images[0].annotations.length, 1);
  assert.equal(store.files.get(uri), 'ORIGINAL');
});

test('legacy private JSON batches can be annotated and reopened on Android', async () => {
  const store = nativeStore();
  store.addDirectory('file:///app/batches');
  store.files.set(batch.images[0].uri, 'ORIGINAL');
  store.addFile('file:///app/batches', 'older.json', JSON.stringify(batch));
  const [opened] = await store.api.getSavedBatches();
  opened.images[0].annotations = [];
  await store.api.saveBatchAnnotations(opened);
  assert.equal((await store.api.getSavedBatches())[0].images[0].annotations.length, 0);
  assert.equal(store.files.get(batch.images[0].uri), 'ORIGINAL');
});

test('new private saves have the same flat IWRC batch layout and support repeated edits', async () => {
  const store = nativeStore('ios');
  store.files.set(batch.images[0].uri, 'ORIGINAL');
  const saved = await store.api.saveBatch(batch);
  assert.equal(saved.storageDirectoryUri, 'file:///app/IWRC/Field batch/');
  const [opened] = await store.api.getSavedBatches();
  opened.images[0].annotations = [];
  await store.api.saveBatchAnnotations(opened);
  assert.equal((await store.api.getSavedBatches())[0].images[0].annotations.length, 0);
  assert.equal(store.files.get(saved.images[0].uri), 'ORIGINAL');
});
