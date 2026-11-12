import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Image, Platform } from 'react-native';

import type { ImageItem, StoredBatch } from '@/types';
import { writeSavedAnnotationFiles } from '@/utils/savedAnnotationFiles';
import { batchClasses, batchFolderName, imageExtension, imageMimeType, ROOT_DIRECTORY_NAME,
  normalizeSavedBatch as normalizeBatch, toInternalMetadata as serializeBatch } from '@/utils/batchMetadata';
import { ensureImageDimensions } from '@/utils/imageDimensions';

const BATCHES_DIR = `${FileSystem.documentDirectory}${ROOT_DIRECTORY_NAME}/`;
const PREVIOUS_BATCHES_DIR = `${FileSystem.documentDirectory}IWRC/`;
const LEGACY_BATCHES_DIR = `${FileSystem.documentDirectory}batches/`;
const METADATA_FILE_NAME = 'batch.txt';
const ROOT_DIRECTORY_URI_KEY = 'iwrc_imaging_named_root_directory_uri';
const PREVIOUS_ROOT_URI_KEY = 'iwrc_images_root_directory_uri';
const LEGACY_ROOT_URI_KEY = 'iwrc_imaging_root_directory_uri';
const CONNECTED_ROOTS_KEY = 'iwrc_connected_batch_directories';
const LIGHTING_OPTIONS = require('@/assets/data/lighting.json') as { id: number; name: string }[];
const USE_DEVICE_FOLDER = Platform.OS === 'android';

const fileNameFromUri = (uri: string) => decodeURIComponent(uri).split('/').pop() ?? uri;
const isImagingRoot = (uri: string) => fileNameFromUri(uri).toLowerCase() === ROOT_DIRECTORY_NAME.toLowerCase();
const toInternalMetadata = (batch: StoredBatch) => serializeBatch(batch, LIGHTING_OPTIONS);
function normalizeLocalBatch(content: unknown, id: string, byName: Record<string, string> = {}) {
  const batch = normalizeBatch(content, id, byName, LIGHTING_OPTIONS);
  return { ...batch, images: batch.images.map(image => ({ ...image, id: image.fileName || image.id })) };
}
const completeDimensions = (batch: StoredBatch) => ensureImageDimensions(batch, uri => new Promise((resolve, reject) => {
  Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
}));

async function ensureDirectory(uri: string) {
  if (!(await FileSystem.getInfoAsync(uri)).exists) await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

async function findChildUri(parentUri: string, childName: string) {
  const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  return entries.find(uri => fileNameFromUri(uri) === childName) ?? null;
}

async function connectedRoots(): Promise<string[]> {
  const saved = await AsyncStorage.getItem(CONNECTED_ROOTS_KEY);
  if (!saved) return [];
  try {
    const roots = JSON.parse(saved);
    return Array.isArray(roots) ? roots.filter((uri): uri is string => typeof uri === 'string') : [];
  } catch { return []; }
}

/** New saves use IWRC Imaging. Earlier root preferences remain available for older batches. */
async function getRootDirectoryUri(promptIfMissing: boolean): Promise<string | null> {
  const savedUri = await AsyncStorage.getItem(ROOT_DIRECTORY_URI_KEY)
    ?? await AsyncStorage.getItem(LEGACY_ROOT_URI_KEY);
  if (savedUri && isImagingRoot(savedUri)) {
    try {
      await FileSystem.StorageAccessFramework.readDirectoryAsync(savedUri);
      return savedUri;
    } catch { if (!promptIfMissing) return null; }
  }
  if (!promptIfMissing) return null;
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
    FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Documents'));
  if (!permission.granted) throw new Error('Folder permission was not granted.');
  const selected = permission.directoryUri;
  const rootUri = isImagingRoot(selected) ? selected
    : (await FileSystem.StorageAccessFramework.readDirectoryAsync(selected)).find(isImagingRoot)
      ?? await FileSystem.StorageAccessFramework.makeDirectoryAsync(selected, ROOT_DIRECTORY_NAME);
  await AsyncStorage.setItem(ROOT_DIRECTORY_URI_KEY, rootUri);
  return rootUri;
}

/** Reconnect a folder after reinstalling, or open batches saved by an older version. */
export async function connectSavedBatchFolder(): Promise<void> {
  if (!USE_DEVICE_FOLDER) throw new Error('Folder access is available on Android.');
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
    FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Documents'));
  if (!permission.granted) return;
  const selected = permission.directoryUri;
  const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(selected);
  const roots = children.filter(uri => [ROOT_DIRECTORY_NAME, 'IWRC imaging', 'IWRC'].includes(fileNameFromUri(uri)));
  const newRoot = isImagingRoot(selected) ? selected : roots.find(isImagingRoot);
  if (newRoot) await AsyncStorage.setItem(ROOT_DIRECTORY_URI_KEY, newRoot);
  await AsyncStorage.setItem(CONNECTED_ROOTS_KEY, JSON.stringify(
    [...new Set([...await connectedRoots(), ...(roots.length ? roots : [selected])])]));
}

async function saveBatchToDeviceFolder(batch: StoredBatch): Promise<StoredBatch> {
  const complete = await completeDimensions(batch);
  batchClasses(complete);
  const rootUri = await getRootDirectoryUri(true);
  if (!rootUri) throw new Error('Folder permission was not granted.');
  const folderName = batchFolderName(complete);
  const batchUri = await findChildUri(rootUri, folderName)
    ?? await FileSystem.StorageAccessFramework.makeDirectoryAsync(rootUri, folderName);
  const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(batchUri);
  if (children.some(uri => fileNameFromUri(uri) === METADATA_FILE_NAME)) {
    throw new Error('This batch is already saved. Open it from Saved Batches to edit its annotations.');
  }
  const byName = new Map(children.map(uri => [fileNameFromUri(uri), uri]));
  const permanentImages: ImageItem[] = [];
  for (const [index, image] of complete.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.fileName || image.uri, image.mimeType)}`;
    const base64Image = await FileSystem.readAsStringAsync(image.uri, { encoding: FileSystem.EncodingType.Base64 });
    const imageUri = byName.get(fileName) ?? await FileSystem.StorageAccessFramework.createFileAsync(
      batchUri, fileName, imageMimeType(fileName));
    await FileSystem.writeAsStringAsync(imageUri, base64Image, { encoding: FileSystem.EncodingType.Base64 });
    const fileSizeBytes = Math.floor(base64Image.length * 3 / 4) - (base64Image.endsWith('==') ? 2 : base64Image.endsWith('=') ? 1 : 0);
    permanentImages.push({ ...image, id: fileName, uri: imageUri, fileName, fileSizeBytes,
      mimeType: image.mimeType || imageMimeType(fileName) });
  }
  const stored: StoredBatch = { ...complete, id: folderName, name: complete.name || folderName,
    storageDirectoryUri: batchUri, images: permanentImages, synced: false,
    savedAt: complete.savedAt || new Date().toISOString() };
  const metadataUri = await FileSystem.StorageAccessFramework.createFileAsync(batchUri, METADATA_FILE_NAME, 'text/plain');
  try {
    await FileSystem.writeAsStringAsync(metadataUri, JSON.stringify(toInternalMetadata(stored), null, 2));
  } catch (error) {
    // Removing an incomplete commit file allows a failed new save to be retried.
    await FileSystem.StorageAccessFramework.deleteAsync(metadataUri);
    throw error;
  }
  return stored;
}

async function readDeviceBatch(directory: string): Promise<StoredBatch | null> {
  const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(directory);
  const metadataUri = children.find(uri => fileNameFromUri(uri) === METADATA_FILE_NAME);
  if (!metadataUri) return null;
  const legacyImages = children.find(uri => fileNameFromUri(uri) === 'images');
  const imageEntries = legacyImages ? [...children, ...await FileSystem.StorageAccessFramework.readDirectoryAsync(legacyImages)] : children;
  const byName = Object.fromEntries(imageEntries.map(uri => [fileNameFromUri(uri), uri]));
  const content = JSON.parse(await FileSystem.readAsStringAsync(metadataUri));
  return { ...normalizeLocalBatch(content, fileNameFromUri(directory), byName), storageDirectoryUri: directory };
}

async function getSavedBatchesFromDeviceFolder(): Promise<StoredBatch[]> {
  const roots = [...new Set([await getRootDirectoryUri(false), await AsyncStorage.getItem(PREVIOUS_ROOT_URI_KEY),
    await AsyncStorage.getItem(LEGACY_ROOT_URI_KEY),
    ...await connectedRoots()].filter((uri): uri is string => Boolean(uri)))];
  const batches: StoredBatch[] = [];
  for (const root of roots) {
    try {
      const directBatch = await readDeviceBatch(root);
      if (directBatch) { batches.push(directBatch); continue; }
      for (const entry of await FileSystem.StorageAccessFramework.readDirectoryAsync(root)) {
        try {
          const batch = await readDeviceBatch(entry);
          if (batch) batches.push(batch);
        } catch { /* Non-batch files are ignored. */ }
      }
    } catch { console.warn('A saved batch folder is unavailable. Reconnect it from Saved Batches.'); }
  }
  return batches;
}

async function saveBatchInternal(batch: StoredBatch): Promise<StoredBatch> {
  const complete = await completeDimensions(batch);
  batchClasses(complete);
  const folderName = batchFolderName(complete);
  const directory = `${BATCHES_DIR}${folderName}/`;
  const metadataPath = `${directory}${METADATA_FILE_NAME}`;
  if ((await FileSystem.getInfoAsync(metadataPath)).exists) {
    throw new Error('This batch is already saved. Open it from Saved Batches to edit its annotations.');
  }
  await ensureDirectory(directory);
  const images: ImageItem[] = [];
  for (const [index, image] of complete.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.fileName || image.uri, image.mimeType)}`;
    const destination = `${directory}${fileName}`;
    if (image.uri !== destination) await FileSystem.copyAsync({ from: image.uri, to: destination });
    const info = await FileSystem.getInfoAsync(destination);
    images.push({ ...image, id: fileName, uri: destination, fileName, fileSizeBytes: info.exists ? info.size : image.fileSizeBytes,
      mimeType: image.mimeType || imageMimeType(fileName) });
  }
  const stored = { ...complete, id: folderName, name: complete.name || folderName,
    storageDirectoryUri: directory, images, synced: false, savedAt: complete.savedAt || new Date().toISOString() };
  try { await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(toInternalMetadata(stored), null, 2)); }
  catch (error) { await FileSystem.deleteAsync(metadataPath, { idempotent: true }); throw error; }
  return stored;
}

async function readInternalBatch(uri: string, fallbackId: string): Promise<StoredBatch | null> {
  if (uri.endsWith('.json')) {
    return { ...normalizeLocalBatch(JSON.parse(await FileSystem.readAsStringAsync(uri)), fallbackId), storageDirectoryUri: uri };
  }
  const metadataPath = `${uri}${METADATA_FILE_NAME}`;
  if (!(await FileSystem.getInfoAsync(metadataPath)).exists) return null;
  const imagePaths: Record<string, string> = {};
  for (const directory of [uri, `${uri}images/`]) {
    if (!(await FileSystem.getInfoAsync(directory)).exists) continue;
    for (const name of await FileSystem.readDirectoryAsync(directory)) imagePaths[name] = `${directory}${name}`;
  }
  return { ...normalizeLocalBatch(JSON.parse(await FileSystem.readAsStringAsync(metadataPath)), fallbackId, imagePaths),
    storageDirectoryUri: uri };
}

async function getSavedBatchesInternal(): Promise<StoredBatch[]> {
  const batches: StoredBatch[] = [];
  for (const root of [BATCHES_DIR, PREVIOUS_BATCHES_DIR, LEGACY_BATCHES_DIR]) {
    if (!(await FileSystem.getInfoAsync(root)).exists) continue;
    for (const entry of await FileSystem.readDirectoryAsync(root)) {
      try {
        const info = await FileSystem.getInfoAsync(`${root}${entry}`);
        if (!info.exists || (!info.isDirectory && !entry.endsWith('.json'))) continue;
        const batch = await readInternalBatch(`${root}${entry}${info.isDirectory ? '/' : ''}`, entry.replace(/\.json$/, ''));
        if (batch) batches.push(batch);
      } catch { console.warn('Skipping unreadable local batch:', entry); }
    }
  }
  return batches;
}

export async function saveBatch(batch: StoredBatch): Promise<StoredBatch> {
  return USE_DEVICE_FOLDER ? saveBatchToDeviceFolder(batch) : saveBatchInternal(batch);
}

export async function getSavedBatches(): Promise<StoredBatch[]> {
  const batches = [...(USE_DEVICE_FOLDER ? await getSavedBatchesFromDeviceFolder() : []), ...await getSavedBatchesInternal()];
  const unique = new Map<string | null, StoredBatch>();
  for (const batch of batches) if (!unique.has(batch.id)) unique.set(batch.id, batch);
  return [...unique.values()].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export async function deleteBatch(id: string) {
  const batch = (await getSavedBatches()).find(item => item.id === id);
  if (!batch?.storageDirectoryUri) return;
  if (batch.storageDirectoryUri.startsWith('content://')) await FileSystem.StorageAccessFramework.deleteAsync(batch.storageDirectoryUri);
  else await FileSystem.deleteAsync(batch.storageDirectoryUri, { idempotent: true });
}

/** Updates the existing batch in its original folder, including legacy storage locations. */
export async function saveBatchAnnotations(batch: StoredBatch): Promise<StoredBatch> {
  if (!batch.id) throw new Error('The saved batch could not be identified.');
  let original: StoredBatch | null | undefined;
  if (batch.storageDirectoryUri) {
    const uri = batch.storageDirectoryUri;
    original = uri.startsWith('content://') ? await readDeviceBatch(uri)
      : await readInternalBatch(uri, fileNameFromUri(uri.replace(/\/$/, '')).replace(/\.json$/, ''));
  } else original = (await getSavedBatches()).find(item => item.id === batch.id);
  if (!original?.storageDirectoryUri || original.id !== batch.id) {
    throw new Error('This saved batch is unavailable. Reopen it from Saved Batches.');
  }
  const edits = new Map(batch.images.map(image => [image.id, image]));
  if (edits.size !== batch.images.length || original.images.length !== edits.size ||
      original.images.some(image => edits.get(image.id)?.uri !== image.uri)) {
    throw new Error('The saved photos changed. Reopen the batch before annotating.');
  }
  const stored = await completeDimensions({ ...batch, storageDirectoryUri: original.storageDirectoryUri, synced: false });
  const directory = original.storageDirectoryUri;
  if (directory.startsWith('content://')) {
    const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(directory);
    const legacyImages = children.find(uri => fileNameFromUri(uri) === 'images');
    const entries = legacyImages ? [...children, ...await FileSystem.StorageAccessFramework.readDirectoryAsync(legacyImages)] : children;
    const byName = new Map(entries.map(uri => [fileNameFromUri(uri), uri]));
    return writeSavedAnnotationFiles(stored, {
      read: async name => byName.has(name) ? FileSystem.readAsStringAsync(byName.get(name)!) : null,
      write: async (name, content) => {
        const uri = byName.get(name) ?? await FileSystem.StorageAccessFramework.createFileAsync(directory, name, 'text/plain');
        byName.set(name, uri);
        await FileSystem.writeAsStringAsync(uri, content);
      },
      remove: async name => { const uri = byName.get(name); if (uri) await FileSystem.StorageAccessFramework.deleteAsync(uri); },
    }, LIGHTING_OPTIONS);
  }
  if (directory.endsWith('.json')) {
    // Very old private records retain their photo URIs. Downloads still use COCO batch.txt.
    const previous = await FileSystem.readAsStringAsync(directory);
    try { await FileSystem.writeAsStringAsync(directory, JSON.stringify(stored, null, 2)); }
    catch (error) { await FileSystem.writeAsStringAsync(directory, previous); throw error; }
    return stored;
  }
  const paths = new Map<string, string>();
  for (const image of stored.images) {
    if (image.fileName) paths.set(image.fileName.replace(/\.[^.]+$/, '.txt'), image.uri.replace(/\.[^.]+$/, '.txt'));
  }
  const classesInLegacyImages = `${directory}images/classes.txt`;
  paths.set('classes.txt', (await FileSystem.getInfoAsync(classesInLegacyImages)).exists ? classesInLegacyImages : `${directory}classes.txt`);
  paths.set(METADATA_FILE_NAME, `${directory}${METADATA_FILE_NAME}`);
  const path = (name: string) => paths.get(name) ?? `${directory}${name}`;
  return writeSavedAnnotationFiles(stored, {
    read: async name => (await FileSystem.getInfoAsync(path(name))).exists ? FileSystem.readAsStringAsync(path(name)) : null,
    write: (name, content) => FileSystem.writeAsStringAsync(path(name), content),
    remove: name => FileSystem.deleteAsync(path(name), { idempotent: true }),
  }, LIGHTING_OPTIONS);
}
