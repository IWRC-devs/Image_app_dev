export interface BoundingBoxAnnotation {
  id: string;
  classId: number;
  className?: string;
  /** YOLO-normalized center x coordinate (0-1). */
  xCenter: number;
  /** YOLO-normalized center y coordinate (0-1). */
  yCenter: number;
  /** YOLO-normalized box width (0-1). */
  width: number;
  /** YOLO-normalized box height (0-1). */
  height: number;
}

export interface ImageItem {
  id: string;
  uri: string;
  fileName?: string | null;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  annotations: BoundingBoxAnnotation[];
}

export interface StoredBatch {
  id: string | null;
  name: string;
  affiliationId?: number;
  locationCountry: string | null;
  locationState: string | null;
  locationCity: string | null;
  botanicalName: string | null;
  weedBackground: string | null;
  weedSite?: string | null;
  growthStage: string | null;
  soilColor: string | null;
  lightingId?: number;
  images: ImageItem[];
  selectedOption?: "manual" | "capture";
  synced: boolean;
  savedAt: string;
}
