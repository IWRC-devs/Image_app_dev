import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

import { ImageItem } from "@/types";

export function imageItemFromPickerAsset(asset: ImagePicker.ImagePickerAsset): ImageItem {
  return {
    id: uuid.v4() as string,
    uri: asset.uri,
    fileName: asset.fileName,
    width: asset.width,
    height: asset.height,
    fileSizeBytes: asset.fileSize,
    annotations: [],
  };
}

export function imageOrientation(width?: number, height?: number) {
  if (!width || !height || width === height) return "square";
  return width > height ? "landscape" : "portrait";
}
