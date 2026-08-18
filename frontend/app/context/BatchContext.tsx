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

export const formatBatchName = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `batch_${date.getFullYear()}_${pad(date.getMonth() + 1)}_${pad(date.getDate())}_${pad(date.getHours())}_${pad(date.getMinutes())}_${pad(date.getSeconds())}`;
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
  return {
    synced: null,
    id: null,
    name: formatBatchName(),
    affiliationId: undefined,
    locationCountry: null,
    locationState: null,
    locationCity: null,
    botanicalName: null,
    weedBackground: null,
    weedSite: null,
    growthStage: null,
    soilColor: null,
    lightingId: undefined,
    images: [],
    selectedOption: undefined,
  };
};
