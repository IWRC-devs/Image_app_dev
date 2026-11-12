import type { ImageItem } from '@/types';

/** Resolve missing dimensions in older batches before converting boxes to pixels. */
export async function ensureImageDimensions<T extends { images: ImageItem[] }>(batch: T,
  readSize: (uri: string) => Promise<{ width: number; height: number }>): Promise<T> {
  const images: ImageItem[] = [];
  for (const image of batch.images) {
    const size = Number.isInteger(image.width) && Number.isInteger(image.height) && image.width! > 0 && image.height! > 0
      ? { width: image.width!, height: image.height! } : await readSize(image.uri);
    if (!Number.isInteger(size.width) || !Number.isInteger(size.height) || size.width <= 0 || size.height <= 0) {
      throw new Error('An image could not be measured. Please reopen it before saving annotations.');
    }
    images.push({ ...image, ...size });
  }
  return { ...batch, images };
}
