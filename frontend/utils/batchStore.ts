import * as FileSystem from 'expo-file-system/legacy';
import { StoredBatch } from '@/types';

const BATCHES_DIR = `${FileSystem.documentDirectory}batches`;

/**
 * Ensure the batches directory exists.
 */
async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(BATCHES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BATCHES_DIR, { intermediates: true });
  }
}

/**
 * Save a batch locally (offline draft)
 */
export async function saveBatch(batch: StoredBatch) {
  await ensureDirExists();

  const id = batch.id || `batch-${Date.now()}`;
  const filePath = `${BATCHES_DIR}/${id}.json`;

  const dataToSave = {
    ...batch,
    id,
    synced: batch.synced ?? false,
    savedAt: new Date().toISOString(),
  };

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(dataToSave));
  return id;
}

/**
 * Get all saved batches
 */
export async function getSavedBatches(): Promise<StoredBatch[]> {
  await ensureDirExists();

  const files = await FileSystem.readDirectoryAsync(BATCHES_DIR);
  const batches: StoredBatch[] = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      const content = await FileSystem.readAsStringAsync(`${BATCHES_DIR}/${file}`);
      try {
        batches.push(JSON.parse(content));
      } catch (e) {
        console.warn("Skipping invalid batch file:", file);
      }
    }
  }

  // Sort by latest saved first
  return batches.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

/**
 * Delete a saved batch by ID
 */
export async function deleteBatch(id: string) {
  const filePath = `${BATCHES_DIR}/${id}.json`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(filePath);
  }
}

/**
 * Mark a batch as synced (uploaded)
 */
export async function markBatchAsSynced(id: string) {
  const filePath = `${BATCHES_DIR}/${id}.json`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (!fileInfo.exists) return;

  const content = await FileSystem.readAsStringAsync(filePath);
  const batch = JSON.parse(content);

  batch.synced = true;
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(batch));
}
