import type { ImagePickerAsset } from 'expo-image-picker';
import { imageItemFromPickerAsset, normalizeExif } from '@/utils/imageMetadata';

export async function prepareImage(asset: ImagePickerAsset) {
  const image = imageItemFromPickerAsset(asset);
  try {
    const { parse } = await import('exifr');
    const file = asset.file ?? await (await fetch(asset.uri)).blob();
    const exif = await parse(file, { reviveValues: false, translateValues: false });
    image.exif = normalizeExif(exif) ?? image.exif;
  } catch {
    // Some formats contain no readable EXIF. Keep the photo and picker metadata.
  }
  return image;
}
