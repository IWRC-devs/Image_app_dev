import { strToU8, zipSync } from 'fflate';
import type { ImageItem, StoredBatch } from '@/types';
import { batchClasses, imageExtension, labelFileName, toInternalMetadata, yoloLine } from './batchMetadata.ts';

export async function createBatchArchive(batch: StoredBatch, lightingOptions: { id: number; name: string }[] = []) {
  const files: Record<string, Uint8Array> = {};
  const images: ImageItem[] = [];
  const classes = batchClasses(batch);
  for (const [index, image] of batch.images.entries()) {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('A saved image could not be read.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const extension = imageExtension(image.fileName || image.uri);
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${extension}`;
    files[fileName] = bytes;
    files[labelFileName(fileName)] = strToU8((image.annotations ?? []).map(yoloLine).join('\n'));
    images.push({ ...image, fileName, fileSizeBytes: bytes.byteLength,
      mimeType: image.mimeType || response.headers.get('content-type') });
  }
  files['batch.txt'] = strToU8(JSON.stringify(toInternalMetadata({ ...batch, images }, lightingOptions), null, 2));
  files['classes.txt'] = strToU8(classes.join('\n'));
  // Photos are already compressed; storing them avoids costly recompression.
  // Stable entry timestamps make retries of an unchanged batch byte-identical.
  // Actual capture and save times remain in EXIF and batch.txt.
  return zipSync(files, { level: 0, mtime: new Date(1980, 0, 1) });
}
