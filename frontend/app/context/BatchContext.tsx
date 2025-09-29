import React, { createContext, useContext, useState, ReactNode } from "react";

export type ImageItem = {
  id: string;
  uri: string;
};

export type BatchData = {
  name: string;
  images: ImageItem[];
  affiliationId?: number;
  sizeClass: string | null;
  flowerAnswer: string | null;
  cropAnswer: string | null;
  groundCoverPercentId?: number;
  //cloudCover?: string | null;
  //groundResidue?: string | null;
  selectedOption?: "manual" | "capture";
};

type BatchContextType = {
  batchData: BatchData | null;
  setBatchData: (data: BatchData) => void;
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
