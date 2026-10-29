import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { ImageItem, StoredBatch } from '@/types';
import { batchClasses, imageExtension, imageMimeType, labelFileName, normalizeSavedBatch as normalizeBatch, toInternalMetadata as serializeBatch, yoloLine } from '@/utils/batchMetadata';

const BATCHES_DIR = `${FileSystem.documentDirectory}batches/`;
const METADATA_FILE_NAME = 'batch.txt';
const ROOT_DIRECTORY_NAME = 'IWRC imaging';
const ROOT_DIRECTORY_URI_KEY = 'iwrc_imaging_root_directory_uri';
const LIGHTING_OPTIONS = require('@/assets/data/lighting.json') as { id: number; name: string }[];

// Android has no writable path apps can reach without either a Storage Access
// Framework grant or the (Play Store discouraged) all-files permission, so
// batches are saved into a folder the user picks via SAF. Other platforms
// fall back to the app's private document directory.
const USE_DEVICE_FOLDER = Platform.OS === 'android';

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

function safePathSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_');
}

const normalizeSavedBatch = (batch: unknown, fallbackId?: string, imageUrisByName: Record<string, string> = {}) =>
  normalizeBatch(batch, fallbackId, imageUrisByName, LIGHTING_OPTIONS);
const toInternalMetadata = (batch: StoredBatch) => serializeBatch(batch, LIGHTING_OPTIONS);

async function writeSafTextFile(directoryUri: string, fileName: string, content: string) {
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'text/plain');
  await FileSystem.writeAsStringAsync(uri, content);
}

/** Finds a direct child of a SAF directory by its display name, or null if absent. */
async function findChildUri(parentUri: string, childName: string) {
  const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  return entries.find((uri) => decodeURIComponent(uri).split('/').pop() === childName) ?? null;
}

/**
 * Returns the SAF URI for the user-selected "IWRC imaging" folder, prompting
 * the user to pick a folder the first time this is called. The picker is
 * hinted to open in Documents, but the user can choose any folder - "IWRC
 * imaging" is then created (or reused) inside whatever they pick.
 * When `promptIfMissing` is false, returns null instead of prompting.
 */
async function getRootDirectoryUri(promptIfMissing: boolean): Promise<string | null> {
  const savedUri = await AsyncStorage.getItem(ROOT_DIRECTORY_URI_KEY);
  if (savedUri) {
    // FileSystem.getInfoAsync() targets real filesystem paths; on some
    // Android builds it can't stat a SAF content:// tree URI at all and
    // throws "Function not implemented" instead of reporting non-existence.
    // Probe with an actual SAF call instead, and treat any failure here
    // (revoked permission, deleted folder, this quirk) as "needs re-grant".
    try {
      await FileSystem.StorageAccessFramework.readDirectoryAsync(savedUri);
      return savedUri;
    } catch {
      await AsyncStorage.removeItem(ROOT_DIRECTORY_URI_KEY);
    }
  }

  if (!promptIfMissing) return null;

  const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Documents');
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
  if (!permission.granted) {
    throw new Error('Folder permission was not granted.');
  }

  const existingRoot = await findChildUri(permission.directoryUri, ROOT_DIRECTORY_NAME);
  const rootUri =
    existingRoot ??
    (await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      permission.directoryUri,
      ROOT_DIRECTORY_NAME
    ));
  await AsyncStorage.setItem(ROOT_DIRECTORY_URI_KEY, rootUri);
  return rootUri;
}

async function saveBatchToDeviceFolder(batch: StoredBatch): Promise<StoredBatch> {
  // Validate all annotations before touching an existing batch on disk.
  const classes = batchClasses(batch);
  const rootUri = await getRootDirectoryUri(true);
  if (!rootUri) {
    throw new Error('Folder permission was not granted.');
  }

  const id = safePathSegment(batch.id || `batch-${Date.now()}`);

  const existingBatchUri = await findChildUri(rootUri, id);
  if (existingBatchUri) {
    await FileSystem.StorageAccessFramework.deleteAsync(existingBatchUri);
  }
  const batchUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(rootUri, id);

  const permanentImages: ImageItem[] = [];
  for (const [index, image] of batch.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.fileName ?? image.uri)}`;
    const imageUri = await FileSystem.StorageAccessFramework.createFileAsync(
      batchUri,
      fileName,
      imageMimeType(fileName)
    );
    // copyAsync's Android implementation does not reliably support a SAF
    // content:// destination (it tries to mkdir the raw URI as a path), so
    // the image bytes are round-tripped through base64 instead.
    const base64Image = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(imageUri, base64Image, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileSizeBytes = Math.floor(base64Image.length * 3 / 4) - (base64Image.endsWith('==') ? 2 : base64Image.endsWith('=') ? 1 : 0);
    permanentImages.push({ ...image, uri: imageUri, fileName, fileSizeBytes, mimeType: image.mimeType || imageMimeType(fileName) });
    await writeSafTextFile(batchUri, labelFileName(fileName), (image.annotations ?? []).map(yoloLine).join('\n'));
  }

  const storedBatch: StoredBatch = {
    ...batch,
    id,
    name: batch.name || id,
    images: permanentImages,
    synced: false,
    savedAt: batch.savedAt || new Date().toISOString(),
  };

  const jsonUri = await FileSystem.StorageAccessFramework.createFileAsync(
    batchUri,
    METADATA_FILE_NAME,
    'text/plain'
  );
  await FileSystem.writeAsStringAsync(
    jsonUri,
    JSON.stringify(toInternalMetadata(storedBatch), null, 2)
  );
  await writeSafTextFile(batchUri, 'classes.txt', classes.join('\n'));

  return storedBatch;
}

async function getSavedBatchesFromDeviceFolder(): Promise<StoredBatch[]> {
  const rootUri = await getRootDirectoryUri(false);
  if (!rootUri) return [];

  const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(rootUri);
  const batches: StoredBatch[] = [];

  for (const entryUri of entries) {
    const fallbackId = decodeURIComponent(entryUri).split('/').pop() ?? entryUri;
    try {
      const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(entryUri);
      const imageUrisByName = Object.fromEntries(
        children.map((uri) => [decodeURIComponent(uri).split('/').pop() ?? uri, uri])
      );
      const jsonUri = children.find(
        (uri) => decodeURIComponent(uri).split('/').pop() === METADATA_FILE_NAME
      );
      if (!jsonUri) continue;
      const content = await FileSystem.readAsStringAsync(jsonUri);
      batches.push(normalizeSavedBatch(JSON.parse(content), fallbackId, imageUrisByName));
    } catch {
      console.warn('Skipping invalid saved batch:', fallbackId);
    }
  }

  return batches.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

async function deleteBatchFromDeviceFolder(id: string) {
  const rootUri = await getRootDirectoryUri(false);
  if (!rootUri) return;

  const batchUri = await findChildUri(rootUri, safePathSegment(id));
  if (batchUri) {
    await FileSystem.StorageAccessFramework.deleteAsync(batchUri);
  }
}

async function saveBatchInternal(batch: StoredBatch): Promise<StoredBatch> {
  const classes = batchClasses(batch);
  await ensureDirectory(BATCHES_DIR);
  const id = safePathSegment(batch.id || `batch-${Date.now()}`);
  const batchDirectory = `${BATCHES_DIR}${id}/`;
  const imagesDirectory = `${batchDirectory}images/`;
  await ensureDirectory(imagesDirectory);

  const permanentImages: ImageItem[] = [];
  for (const [index, image] of batch.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.fileName ?? image.uri)}`;
    const destination = `${imagesDirectory}${fileName}`;
    if (image.uri !== destination) {
      await FileSystem.copyAsync({ from: image.uri, to: destination });
    }
    const fileInfo = await FileSystem.getInfoAsync(destination);
    permanentImages.push({ ...image, uri: destination, fileName,
      fileSizeBytes: fileInfo.exists ? fileInfo.size : image.fileSizeBytes,
      mimeType: image.mimeType || imageMimeType(fileName) });
    await FileSystem.writeAsStringAsync(`${imagesDirectory}${labelFileName(fileName)}`, (image.annotations ?? []).map(yoloLine).join('\n'));
  }

  const storedBatch: StoredBatch = {
    ...batch,
    id,
    name: batch.name || id,
    images: permanentImages,
    synced: false,
    savedAt: batch.savedAt || new Date().toISOString(),
  };
  const metadataPath = `${batchDirectory}${METADATA_FILE_NAME}`;
  await FileSystem.writeAsStringAsync(`${imagesDirectory}classes.txt`, classes.join('\n'));
  await FileSystem.writeAsStringAsync(
    metadataPath,
    JSON.stringify(toInternalMetadata(storedBatch), null, 2)
  );
  return storedBatch;
}

async function getSavedBatchesInternal(): Promise<StoredBatch[]> {
  await ensureDirectory(BATCHES_DIR);
  const entries = await FileSystem.readDirectoryAsync(BATCHES_DIR);
  const batches: StoredBatch[] = [];

  for (const entry of entries) {
    const entryUri = `${BATCHES_DIR}${entry}`;
    try {
      const info = await FileSystem.getInfoAsync(entryUri);
      if (info.exists && info.isDirectory) {
        const metadataPath = `${entryUri}/${METADATA_FILE_NAME}`;
        const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
        if (!metadataInfo.exists) continue;
        const content = await FileSystem.readAsStringAsync(metadataPath);
        const imagesDirectory = `${entryUri}/images`;
        const imagesInfo = await FileSystem.getInfoAsync(imagesDirectory);
        const imageUrisByName = imagesInfo.exists && imagesInfo.isDirectory
          ? Object.fromEntries(
              (await FileSystem.readDirectoryAsync(imagesDirectory)).map((fileName) => [
                fileName,
                `${imagesDirectory}/${fileName}`,
              ])
            )
          : {};
        batches.push(normalizeSavedBatch(JSON.parse(content), entry, imageUrisByName));
      } else if (entry.endsWith('.json')) {
        const content = await FileSystem.readAsStringAsync(entryUri);
        batches.push(normalizeSavedBatch(JSON.parse(content), entry.replace(/\.json$/, '')));
      }
    } catch {
      console.warn('Skipping invalid local batch:', entry);
    }
  }

  return batches.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

async function deleteBatchInternal(id: string) {
  const safeId = safePathSegment(id);
  const batchDirectory = `${BATCHES_DIR}${safeId}`;
  const legacyFile = `${BATCHES_DIR}${safeId}.json`;
  const directoryInfo = await FileSystem.getInfoAsync(batchDirectory);
  if (directoryInfo.exists) {
    await FileSystem.deleteAsync(batchDirectory, { idempotent: true });
  }
  const legacyInfo = await FileSystem.getInfoAsync(legacyFile);
  if (legacyInfo.exists) {
    await FileSystem.deleteAsync(legacyFile, { idempotent: true });
  }
}

export async function saveBatch(batch: StoredBatch): Promise<StoredBatch> {
  return USE_DEVICE_FOLDER ? saveBatchToDeviceFolder(batch) : saveBatchInternal(batch);
}

export async function getSavedBatches(): Promise<StoredBatch[]> {
  return USE_DEVICE_FOLDER ? getSavedBatchesFromDeviceFolder() : getSavedBatchesInternal();
}

export async function deleteBatch(id: string) {
  return USE_DEVICE_FOLDER ? deleteBatchFromDeviceFolder(id) : deleteBatchInternal(id);
}
