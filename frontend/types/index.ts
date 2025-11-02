// /types/index.ts

export interface ImageItem {
  id: string;
  uri: string;
}

export interface BatchData {
  name: string;
  images: ImageItem[];
  affiliationId?: number | undefined;
  sizeClass?: string | null;
  flowerAnswer?: string | null;
  cropAnswer?: string | null;
  groundCoverPercentId?: number | undefined;
  selectedOption?: string | undefined;
  synced?: boolean; // for offline sync tracking
}
