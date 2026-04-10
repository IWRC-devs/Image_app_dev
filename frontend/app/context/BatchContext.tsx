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
  weedBackground: string | null;
  growthStage: string | null;
  soilColor: string | null;
  lightingId?: number;
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
    weedBackground: null,
    growthStage: null,
    soilColor: null,
    lightingId: undefined,
    images: [],
    selectedOption: undefined,
  };
};
