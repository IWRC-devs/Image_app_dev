import * as FileSystem from 'expo-file-system';
import { BatchData } from '@/types';

const BATCHES_FILE = `${FileSystem.documentDirectory}batches.json`;

export const getAllBatches = async (): Promise<BatchData[]> => {
  try {
    const data = await FileSystem.readAsStringAsync(BATCHES_FILE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveBatch = async (batch: BatchData) => {
  const batches = await getAllBatches();
  const index = batches.findIndex(b => b.name === batch.name);

  if (index !== -1) {
    batches[index] = batch;
  } else {
    batches.push(batch);
  }

  await FileSystem.writeAsStringAsync(BATCHES_FILE, JSON.stringify(batches));
};

export const getPendingBatches = async () => {
  const batches = await getAllBatches();
  return batches.filter(b => !b.synced);
};

export const markBatchSynced = async (batchName: string) => {
  const batches = await getAllBatches();
  const updated = batches.map(b =>
    b.name === batchName ? { ...b, synced: true } : b
  );
  await FileSystem.writeAsStringAsync(BATCHES_FILE, JSON.stringify(updated));
};

export const clearAllBatches = async () => {
  await FileSystem.deleteAsync(BATCHES_FILE, { idempotent: true });
};
