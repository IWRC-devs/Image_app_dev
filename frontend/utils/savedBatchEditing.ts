import type { BatchData } from '@/app/context/BatchContext';
import type { StoredBatch } from '@/types';

export function openSavedBatch(batch: StoredBatch): BatchData {
  if (!batch.id) throw new Error('This saved batch has no identifier.');
  return {
    ...batch,
    growingEnvironment: batch.growingEnvironment ?? null,
    plantingSystem: batch.plantingSystem ?? null,
    editingSavedBatch: true,
    images: batch.images.map(image => ({ ...image, exif: image.exif ? { ...image.exif } : undefined,
      annotations: image.annotations?.map(box => ({ ...box })) })),
  };
}

export async function saveOpenedBatch(batch: BatchData,
  writeAnnotations: (batch: StoredBatch) => Promise<StoredBatch>): Promise<BatchData> {
  if (!batch.editingSavedBatch || !batch.id) throw new Error('Open a saved batch before saving its annotations.');
  const { editingSavedBatch: _editing, ...stored } = batch;
  const saved = await writeAnnotations({ ...stored, synced: false, savedAt: stored.savedAt || new Date().toISOString() });
  return openSavedBatch(saved);
}
