export interface ImageExifMetadata {
  capturedAt?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  exposureTime?: string | number;
  fNumber?: string | number;
  iso?: string | number;
  focalLengthMm?: string | number;
  latitude?: number;
  longitude?: number;
  altitudeMeters?: number;
}

export interface BoundingBoxAnnotation {
  id: string;
  classId: number;
  className?: string;
  /** Coordinates and dimensions normalized to the image (0-1). */
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface ImageItem {
  id: string;
  uri: string;
  fileName?: string | null;
  width?: number;
  height?: number;
  mimeType?: string | null;
  fileSizeBytes?: number;
  exif?: ImageExifMetadata;
  annotations?: BoundingBoxAnnotation[];
}

export interface CollectorDetails {
  collectorName?: string | null;
  collectorEmail?: string | null;
  organization?: string | null;
}

export interface StoredBatch extends CollectorDetails {
  id: string | null;
  name: string;
  affiliationId?: number;
  locationCountry: string | null;
  locationState: string | null;
  locationCity: string | null;
  botanicalName: string | null;
  weedBackground: string | null;
  growingEnvironment?: string | null;
  plantingSystem?: string | null;
  /** Legacy field used by batches saved before the parameter split. */
  weedSite?: string | null;
  growthStage: string | null;
  soilColor: string | null;
  lightingId?: number;
  images: ImageItem[];
  selectedOption?: "manual" | "capture";
  synced: boolean;
  savedAt: string;
}
