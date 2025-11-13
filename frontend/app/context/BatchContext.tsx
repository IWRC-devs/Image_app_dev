import React, { createContext, useContext, useState, ReactNode } from "react";

export type ImageItem = {
  id: string;
  uri: string;
};

export type BatchData = {
  synced: any;
  id: string | null;
  name: string;
  affiliationId?: number;
  sizeClass: string | null;
  flowerAnswer: string | null;
  cropAnswer: string | null;
  groundCoverPercentId?: number;
  images: ImageItem[];
  selectedOption?: "manual" | "capture";
};

type BatchContextType = {
  batchData: BatchData | null;
  setBatchData: (data: BatchData | null) => void;
};

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) throw new Error("useBatch must be used within BatchProvider");
  return context;
};

export const BatchProvider = ({ children }: { children: ReactNode }) => {
  const [batchData, setBatchData] = useState<BatchData | null>(null);

  return (
    <BatchContext.Provider value={{ batchData, setBatchData }}>
      {children}
    </BatchContext.Provider>
  );
};

export const createNewBatch = (): BatchData => {
  const timestamp = new Date().toISOString();
  return {
    synced: null,
    id: null,
    name: `batch-${timestamp}`,
    affiliationId: undefined,
    sizeClass: null,
    flowerAnswer: null,
    cropAnswer: null,
    groundCoverPercentId: undefined,
    images: [],
    selectedOption: undefined,
  };
};
