import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { StoredBatch } from '@/types';

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

function getLightingNameById(lightingId?: number | null) {
  if (lightingId == null) return '';
  return LIGHTING_OPTIONS.find((option) => option.id === lightingId)?.name ?? '';
}

function imageExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() : undefined;
  return extension && ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'heic', 'webp'].includes(extension)
    ? extension
    : 'jpg';
}

function imageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'tif' || extension === 'tiff') return 'image/tiff';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function normalizeSavedBatch(batch: any, fallbackId?: string): StoredBatch {
  const lightingId =
    typeof batch?.lighting === 'string'
      ? LIGHTING_OPTIONS.find((option) => option.name.toLowerCase() === batch.lighting.toLowerCase())?.id
      : batch?.lighting_id ?? batch?.lightingId ?? undefined;
  const rawImages = Array.isArray(batch?.images) ? batch.images : [];

  return {
    id: batch?.id ?? fallbackId ?? null,
    name: batch?.name ?? batch?.batch_name ?? fallbackId ?? '',
    affiliationId: batch?.affiliation_id ?? batch?.affiliationId,
    locationCountry: batch?.location_country ?? batch?.locationCountry ?? null,
    locationState: batch?.location_state ?? batch?.locationState ?? null,
    locationCity: batch?.location_city ?? batch?.locationCity ?? null,
    botanicalName: batch?.botanical_name ?? batch?.botanicalName ?? null,
    weedBackground: batch?.weed_background ?? batch?.weedBackground ?? null,
    weedSite: batch?.weed_site ?? batch?.weedSite ?? null,
    growthStage: batch?.growth_stage ?? batch?.growthStage ?? null,
    soilColor: batch?.soil_color ?? batch?.soilColor ?? null,
    lightingId,
    images: rawImages
      .filter((image: any) => image?.uri)
      .map((image: any, index: number) => ({
        id: image?.id ?? `${index}`,
        uri: image.uri,
      })),
    selectedOption: batch?.selected_option ?? batch?.selectedOption,
    synced: false,
    savedAt: batch?.saved_at ?? batch?.savedAt ?? new Date().toISOString(),
  };
}

function toInternalMetadata(batch: StoredBatch) {
  return {
    schema_version: 2,
    id: batch.id,
    batch_name: batch.name,
    affiliation_id: batch.affiliationId ?? null,
    location_country: batch.locationCountry ?? '',
    location_state: batch.locationState ?? '',
    location_city: batch.locationCity ?? '',
    botanical_name: batch.botanicalName ?? '',
    weed_background: batch.weedBackground ?? '',
    weed_site: batch.weedSite ?? '',
    growth_stage: batch.growthStage ?? '',
    soil_color: batch.soilColor ?? '',
    lighting_id: batch.lightingId ?? null,
    lighting: getLightingNameById(batch.lightingId),
    selected_option: batch.selectedOption ?? null,
    images: batch.images,
    saved_at: batch.savedAt,
  };
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

  const permanentImages = [];
  for (const [index, image] of batch.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.uri)}`;
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
    permanentImages.push({ id: image.id, uri: imageUri });
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
      const jsonUri = children.find(
        (uri) => decodeURIComponent(uri).split('/').pop() === METADATA_FILE_NAME
      );
      if (!jsonUri) continue;
      const content = await FileSystem.readAsStringAsync(jsonUri);
      batches.push(normalizeSavedBatch(JSON.parse(content), fallbackId));
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
  await ensureDirectory(BATCHES_DIR);
  const id = safePathSegment(batch.id || `batch-${Date.now()}`);
  const batchDirectory = `${BATCHES_DIR}${id}/`;
  const imagesDirectory = `${batchDirectory}images/`;
  await ensureDirectory(imagesDirectory);

  const permanentImages = [];
  for (const [index, image] of batch.images.entries()) {
    const destination = `${imagesDirectory}image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.uri)}`;
    if (image.uri !== destination) {
      await FileSystem.copyAsync({ from: image.uri, to: destination });
    }
    permanentImages.push({ id: image.id, uri: destination });
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
        batches.push(normalizeSavedBatch(JSON.parse(content), entry));
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
