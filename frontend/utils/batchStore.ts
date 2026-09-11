import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { StoredBatch } from '@/types';

const BATCHES_DIR = `${FileSystem.documentDirectory}batches/`;
const METADATA_FILE_NAME = 'batch.json';
const EXPORT_DIRECTORY_NAME = 'iwrc_imaging_batches';
const EXPORT_DIRECTORY_URI_KEY = 'iwrc_imaging_export_directory_uri';
const LIGHTING_OPTIONS = require('@/assets/data/lighting.json') as { id: number; name: string }[];

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

function toExportMetadata(batch: StoredBatch, imageFileNames: string[]) {
  return {
    batch_name: batch.name,
    location_country: batch.locationCountry ?? '',
    location_state: batch.locationState ?? '',
    botanical_name: batch.botanicalName ?? '',
    weed_background: batch.weedBackground ?? '',
    weed_site: batch.weedSite ?? '',
    growth_stage: batch.growthStage ?? '',
    soil_color: batch.soilColor ?? '',
    lighting: getLightingNameById(batch.lightingId),
    images: Object.fromEntries(imageFileNames.map((fileName) => [fileName, ''])),
    saved_at: batch.savedAt,
  };
}

async function getExportDirectoryUri() {
  if (Platform.OS !== 'android') {
    throw new Error('Documents export is currently supported on Android only.');
  }

  const savedUri = await AsyncStorage.getItem(EXPORT_DIRECTORY_URI_KEY);
  if (savedUri) {
    const savedDirectory = await FileSystem.getInfoAsync(savedUri);
    if (savedDirectory.exists) return savedUri;
    await AsyncStorage.removeItem(EXPORT_DIRECTORY_URI_KEY);
  }

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Documents folder permission was not granted.');
  }

  const exportRootUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
    permission.directoryUri,
    EXPORT_DIRECTORY_NAME
  );
  await AsyncStorage.setItem(EXPORT_DIRECTORY_URI_KEY, exportRootUri);
  return exportRootUri;
}

export async function exportBatchToDocuments(batch: StoredBatch) {
  const exportRootUri = await getExportDirectoryUri();
  const batchDirectoryName = safePathSegment(batch.id || `batch-${Date.now()}`);
  let batchUri: string;

  try {
    batchUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      exportRootUri,
      batchDirectoryName
    );
  } catch {
    throw new Error('This batch has already been exported to the selected folder.');
  }

  const imageFileNames: string[] = [];
  for (const [index, image] of batch.images.entries()) {
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${imageExtension(image.uri)}`;
    const imageUri = await FileSystem.StorageAccessFramework.createFileAsync(
      batchUri,
      fileName,
      imageMimeType(fileName)
    );
    await FileSystem.copyAsync({ from: image.uri, to: imageUri });
    imageFileNames.push(fileName);
  }

  const jsonUri = await FileSystem.StorageAccessFramework.createFileAsync(
    batchUri,
    `${batchDirectoryName}.json`,
    'application/json'
  );
  await FileSystem.writeAsStringAsync(
    jsonUri,
    JSON.stringify(toExportMetadata(batch, imageFileNames), null, 2)
  );

  return `${EXPORT_DIRECTORY_NAME}/${batchDirectoryName}`;
}

export async function saveBatch(batch: StoredBatch) {
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

export async function getSavedBatches(): Promise<StoredBatch[]> {
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

export async function deleteBatch(id: string) {
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
