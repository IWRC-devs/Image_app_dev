import { strToU8, zipSync } from 'fflate';
import type { ImageItem, StoredBatch } from '@/types';
import { batchFolderName, imageExtension, ROOT_DIRECTORY_NAME, toInternalMetadata } from './batchMetadata.ts';
import { ensureImageDimensions } from './imageDimensions.ts';

export async function createBatchArchive(batch: StoredBatch, lightingOptions: { id: number; name: string }[] = []) {
  const files: Record<string, Uint8Array> = {};
  const images: ImageItem[] = [];
  const prefix = `${ROOT_DIRECTORY_NAME}/${batchFolderName(batch)}/`;
  for (const [index, image] of batch.images.entries()) {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('A saved image could not be read.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = image.mimeType || response.headers.get('content-type');
    const extension = imageExtension(image.fileName || image.uri, mimeType);
    const fileName = `image_${String(index + 1).padStart(3, '0')}.${extension}`;
    files[prefix + fileName] = bytes;
    images.push({ ...image, fileName, fileSizeBytes: bytes.byteLength,
      mimeType });
  }
  const complete = await ensureImageDimensions({ ...batch, images }, uri => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('A saved image could not be measured for COCO export.'));
    image.src = uri;
  }));
  files[prefix + 'batch.txt'] = strToU8(JSON.stringify(toInternalMetadata(complete, lightingOptions), null, 2));
  // Photos are already compressed; storing them avoids costly recompression.
  // Stable entry timestamps make retries of an unchanged batch byte-identical.
  // Actual capture and save times remain in EXIF and batch.txt.
  return zipSync(files, { level: 0, mtime: new Date(1980, 0, 1) });
}
