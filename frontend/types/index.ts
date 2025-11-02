export interface ImageItem {
  id: string;
  uri: string;
}

export interface BatchData {
  name: string;
  images: { id: string; uri: string }[];
  affiliationId?: number;
  sizeClass?: string | null;
  flowerAnswer?: string | null;
  cropAnswer?: string | null;
  groundCoverPercentId?: number;
  selectedOption?: string;
  synced?: boolean; 
  createdAt?: string; 
}
