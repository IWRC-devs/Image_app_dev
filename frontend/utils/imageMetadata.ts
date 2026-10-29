import type * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

import type { ImageExifMetadata, ImageItem } from "@/types";

function firstDefined(exif: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = exif[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function rationalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const [numeratorText, denominatorText] = value.trim().split("/");
    const numerator = Number.parseFloat(numeratorText);
    const denominator = denominatorText === undefined ? 1 : Number.parseFloat(denominatorText);
    const parsed = numerator / denominator;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function coordinateNumber(value: unknown): number | undefined {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string" && value.includes(",")
      ? value.split(",").map((part) => part.trim())
      : null;

  if (parts && parts.length >= 3) {
    const degrees = rationalNumber(parts[0]);
    const minutes = rationalNumber(parts[1]);
    const seconds = rationalNumber(parts[2]);
    if (degrees !== undefined && minutes !== undefined && seconds !== undefined) {
      return degrees + minutes / 60 + seconds / 3600;
    }
  }

  return rationalNumber(value);
}

function signedCoordinate(value: unknown, direction: unknown) {
  const coordinate = coordinateNumber(value);
  if (coordinate === undefined) return undefined;
  const hemisphere = String(direction ?? "").toUpperCase();
  return hemisphere === "S" || hemisphere === "W" ? -Math.abs(coordinate) : coordinate;
}

export function normalizeExif(rawExif?: Record<string, any> | null): ImageExifMetadata | undefined {
  if (!rawExif) return undefined;

  const latitude = signedCoordinate(
    firstDefined(rawExif, ["GPSLatitude", "gpsLatitude", "latitude"]),
    firstDefined(rawExif, ["GPSLatitudeRef", "gpsLatitudeRef"])
  );
  const longitude = signedCoordinate(
    firstDefined(rawExif, ["GPSLongitude", "gpsLongitude", "longitude"]),
    firstDefined(rawExif, ["GPSLongitudeRef", "gpsLongitudeRef"])
  );

  const metadata: ImageExifMetadata = {
    capturedAt: firstDefined(rawExif, ["DateTimeOriginal", "DateTimeDigitized", "CreateDate", "DateTime", "ModifyDate"]),
    cameraMake: firstDefined(rawExif, ["Make", "make"]),
    cameraModel: firstDefined(rawExif, ["Model", "model"]),
    lensModel: firstDefined(rawExif, ["LensModel", "lensModel"]),
    exposureTime: firstDefined(rawExif, ["ExposureTime", "exposureTime"]),
    fNumber: firstDefined(rawExif, ["FNumber", "fNumber"]),
    iso: firstDefined(rawExif, ["PhotographicSensitivity", "ISOSpeedRatings", "ISO"]),
    focalLengthMm: firstDefined(rawExif, ["FocalLength", "focalLength"]),
    latitude,
    longitude,
    altitudeMeters: rationalNumber(firstDefined(rawExif, ["GPSAltitude", "gpsAltitude", "altitude"])),
  };

  if (metadata.altitudeMeters !== undefined && Number(rawExif.GPSAltitudeRef) === 1) {
    metadata.altitudeMeters = -Math.abs(metadata.altitudeMeters);
  }

  const hasMetadata = Object.values(metadata).some(
    (value) => value !== undefined && value !== null && value !== ""
  );
  return hasMetadata ? metadata : undefined;
}

export function imageItemFromPickerAsset(asset: ImagePicker.ImagePickerAsset): ImageItem {
  return {
    id: uuid.v4() as string,
    uri: asset.uri,
    fileName: asset.fileName,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileSizeBytes: asset.fileSize,
    exif: normalizeExif(asset.exif),
    // The first annotation visit starts with a box. Done stores an explicit
    // empty array if the collector intentionally removes every box.
  };
}
