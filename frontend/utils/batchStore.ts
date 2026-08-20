import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredBatch } from '@/types';
import { BatchData } from '@/app/context/BatchContext';

const BATCHES_DIR = `${FileSystem.documentDirectory}batches`;
const EXPORT_DIRECTORY_NAME = 'iwrc_imaging_batches';
const EXPORT_DIRECTORY_URI_KEY = 'iwrc_imaging_export_directory_uri';
const LIGHTING_OPTIONS = require('@/assets/data/lighting.json') as { id: number; name: string }[];

async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(BATCHES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BATCHES_DIR, { intermediates: true });
  }
}

function getLightingNameById(lightingId?: number | null) {
  if (lightingId == null) return '';
  return LIGHTING_OPTIONS.find((option) => option.id === lightingId)?.name ?? '';
}

function extractExifForImage(image: { uri?: string; name?: string } | undefined) {
  if (!image) return '';

  const uri = image.uri ?? '';
  const fileName = image.name ?? uri.split('/').pop() ?? 'image';

  if (!uri) return '';

  try {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !['jpg', 'jpeg', 'png', 'tif', 'tiff'].includes(extension)) {
      return '';
    }
  } catch {
    return '';
  }

  return '';
}

function normalizeSavedBatch(batch: any): StoredBatch {
  const lightingId =
    typeof batch?.lighting === 'string'
      ? LIGHTING_OPTIONS.find((option) => option.name.toLowerCase() === batch.lighting.toLowerCase())?.id
      : batch?.lighting_id ?? batch?.lightingId ?? undefined;

  return {
    id: batch?.id ?? null,
    name: batch?.name ?? batch?.batch_name ?? '',
    affiliationId: batch?.affiliation_id ?? batch?.affiliationId,
    locationCountry: batch?.location_country ?? batch?.locationCountry ?? null,
    locationState: batch?.location_state ?? batch?.locationState ?? null,
    locationCity: batch?.location_city ?? batch?.locationCity ?? null,
    weedBackground: batch?.weed_background ?? batch?.weedBackground ?? null,
    weedSite: batch?.weed_site ?? batch?.weedSite ?? null,
    growthStage: batch?.growth_stage ?? batch?.growthStage ?? null,
    soilColor: batch?.soil_color ?? batch?.soilColor ?? null,
    lightingId,
    images: Array.isArray(batch?.images)
      ? batch.images.map((image: any, index: number) => ({
          id: image?.id ?? `${index}`,
          uri: image?.uri ?? '',
        }))
      : [],
    selectedOption: batch?.selected_option ?? batch?.selectedOption,
    synced: Boolean(batch?.synced),
    savedAt: batch?.saved_at ?? batch?.savedAt ?? new Date().toISOString(),
  };
}

function toStoredMetadata(batch: Partial<StoredBatch> & Record<string, any>) {
  const imageEntries = Array.isArray(batch.images)
    ? batch.images.reduce((acc: Record<string, string>, image: any) => {
        const fileName = image?.name ?? image?.uri?.split('/').pop() ?? `image_${Object.keys(acc).length + 1}`;
        acc[fileName] = extractExifForImage(image);
        return acc;
      }, {})
    : {};

  return {
    batch_name: batch.name ?? '',
    location_country: batch.locationCountry ?? '',
    location_state: batch.locationState ?? '',
    botanical_name: batch.botanicalName ?? '',
    weed_background: batch.weedBackground ?? '',
    weed_site: batch.weedSite ?? '',
    growth_stage: batch.growthStage ?? '',
    soil_color: batch.soilColor ?? '',
    lighting: typeof batch.lighting === 'string'
      ? batch.lighting
      : getLightingNameById(batch.lightingId),
    images: imageEntries,
    saved_at: new Date().toISOString(),
  };
}

function getImageFileName(uri: string, index: number) {
  const originalName = uri.split('/').pop()?.split('?')[0] ?? '';
  const extension = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
  return `image_${String(index + 1).padStart(3, '0')}.${extension}`;
}

async function getExportDirectoryUri() {
  if (Platform.OS !== 'android') {
    throw new Error('Exporting to the user Documents folder is currently supported on Android only.');
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

  let exportRootUri: string;
  try {
    exportRootUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      permission.directoryUri,
      EXPORT_DIRECTORY_NAME
    );
  } catch (error) {
    await AsyncStorage.removeItem(EXPORT_DIRECTORY_URI_KEY);
    throw error;
  }
  await AsyncStorage.setItem(EXPORT_DIRECTORY_URI_KEY, exportRootUri);
  return exportRootUri;
}

export async function exportBatchToDocuments(batch: StoredBatch) {
  const exportRootUri = await getExportDirectoryUri();
  const batchDirectoryName = (batch.id || `batch-${Date.now()}`).replace(/[\\/:*?"<>|]/g, '_');
  let batchUri: string;
  try {
    batchUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      exportRootUri,
      batchDirectoryName
    );
  } catch {
    throw new Error('A folder for this batch already exists. Choose a different batch name.');
  }

  const exportImages = batch.images.map((image, index) => ({
    ...image,
    name: getImageFileName(image.uri, index),
  }));

  for (const image of exportImages) {
    const imageUri = await FileSystem.StorageAccessFramework.createFileAsync(
      batchUri,
      image.name,
      'image/jpeg'
    );
    await FileSystem.copyAsync({ from: image.uri, to: imageUri });
  }

  const jsonUri = await FileSystem.StorageAccessFramework.createFileAsync(
    batchUri,
    `${batchDirectoryName}.json`,
    'application/json'
  );
  await FileSystem.writeAsStringAsync(
    jsonUri,
    JSON.stringify(toStoredMetadata({ ...batch, images: exportImages }), null, 2)
  );

  return `${EXPORT_DIRECTORY_NAME}/${batchDirectoryName}`;
}

export async function saveBatch(batch: StoredBatch) {
  await ensureDirExists();

  const id = batch.id || `batch-${Date.now()}`;
  const filePath = `${BATCHES_DIR}/${id}.json`;

  const dataToSave = toStoredMetadata({
    ...batch,
    id,
  });

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(dataToSave, null, 2));
  return filePath;
}

export async function getSavedBatches(): Promise<StoredBatch[]> {
  await ensureDirExists();

  const files = await FileSystem.readDirectoryAsync(BATCHES_DIR);
  const batches: StoredBatch[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await FileSystem.readAsStringAsync(`${BATCHES_DIR}/${file}`);
      try {
        batches.push(normalizeSavedBatch(JSON.parse(content)));
      } catch (e) {
        console.warn('Skipping invalid batch file:', file);
      }
    }
  }

  return batches.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function deleteBatch(id: string) {
  const filePath = `${BATCHES_DIR}/${id}.json`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(filePath);
  }
}

export async function markBatchAsSynced(id: string) {
  const filePath = `${BATCHES_DIR}/${id}.json`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (!fileInfo.exists) return;

  const content = await FileSystem.readAsStringAsync(filePath);
  const batch = JSON.parse(content);

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(batch, null, 2));
}

export const getAllBatches = async (): Promise<BatchData[]> => {
  try {
    const data = await FileSystem.readAsStringAsync(BATCHES_DIR);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('Failed to read batches file:', err);
    return [];
  }
};

export const getPendingBatches = async (): Promise<BatchData[]> => {
  const batches = await getAllBatches();
  return batches.filter((b) => !b.synced);
};
