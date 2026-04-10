export interface ImageItem {
  id: string;
  uri: string;
}

export interface StoredBatch {
  id: string | null;
  name: string;
  affiliationId?: number;
  weedBackground: string | null;
  growthStage: string | null;
  soilColor: string | null;
  lightingId?: number;
  images: ImageItem[];
  selectedOption?: "manual" | "capture";
  synced: boolean;
  savedAt: string;
}
