import type { BoundingBoxAnnotation, ImageItem } from '@/types';
import { normalizeAnnotation } from './batchMetadata.ts';

/** Complete one image without replacing other photos or relying on tab history. */
export function completeAnnotationEdit<T extends {
  images: ImageItem[];
  botanicalName: string | null;
  selectedOption?: 'manual' | 'capture';
  editingSavedBatch?: boolean;
}>(batch: T, imageId: string, boxes: BoundingBoxAnnotation[], sourceSize: { width: number; height: number }) {
  if (!batch.images.some((image) => image.id === imageId)) throw new Error('This image is no longer available.');
  const annotations = boxes.map((box, index) => {
    const normalized = normalizeAnnotation(box, index);
    if (!normalized) throw new Error('Keep each bounding box inside the image.');
    return { ...normalized, className: batch.botanicalName?.trim() || box.className || 'Weed of interest' };
  });
  return {
    batch: {
      ...batch,
      images: batch.images.map((image) => image.id === imageId
        ? { ...image, width: image.width || sourceSize.width, height: image.height || sourceSize.height, annotations }
        : image),
    },
    route: batch.editingSavedBatch ? '/screens/imaging/saved-batch' as const : batch.selectedOption === 'capture'
      ? '/screens/imaging/capture-image' as const
      : '/screens/imaging/image-selection' as const,
  };
}
