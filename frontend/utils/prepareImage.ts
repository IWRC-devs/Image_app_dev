import type { ImagePickerAsset } from 'expo-image-picker';
import { imageItemFromPickerAsset } from '@/utils/imageMetadata';

export async function prepareImage(asset: ImagePickerAsset) {
  return imageItemFromPickerAsset(asset);
}
