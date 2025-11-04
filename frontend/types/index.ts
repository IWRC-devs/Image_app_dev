export interface ImageItem {
  id: string;
  uri: string;
}

export interface StoredBatch {
  id: string | null;
  name: string;
  affiliationId?: number;
  sizeClass: string | null;
  flowerAnswer: string | null;
  cropAnswer: string | null;
  groundCoverPercentId?: number;
  images: ImageItem[];
  selectedOption?: "manual" | "capture";
  synced: boolean;
  savedAt: string;
}
