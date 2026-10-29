import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { PageTransition } from "@/components/PageTransition";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { createNewBatch, formatBatchName, useBatch } from "../../context/BatchContext";
import { AnnotationImageCard } from '@/components/AnnotationImageCard';
import { saveBatch } from "@/utils/batchStore";
import { showAlert } from "@/utils/alerts";
import { getCollectorProfileError } from '@/utils/collectorProfile';

export default function ReviewSummaryScreen() {
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";

  const [loading, setLoading] = useState(false);
  const [savedImageCount, setSavedImageCount] = useState<number | null>(null);

  const selectedImages = batchData?.images ?? [];

  if (!batchData)
    return <ThemedText>No batch data available. Please go back.</ThemedText>;

  const locationText =
    batchData.locationState && batchData.locationCountry
      ? `${batchData.locationState}, ${batchData.locationCountry}`
      : "Not selected";

  const removeImage = (id: string) => {
    const updatedImages = selectedImages.filter((img) => img.id !== id);
    setBatchData({ ...batchData, images: updatedImages });
  };

  const annotateImage = (id: string) => {
    router.push({ pathname: "/screens/imaging/annotation-editor", params: { imageId: id } });
  };

  const validateBatch = (): boolean => {
    const collectorError = getCollectorProfileError(batchData);
    if (collectorError) {
      showAlert('Complete collector and location details', collectorError);
      return false;
    }
    const requiredFields = [
      batchData.name,
      batchData.locationCountry,
      batchData.locationState,
      batchData.weedBackground,
      batchData.growingEnvironment,
      batchData.plantingSystem,
      batchData.growthStage,
      batchData.soilColor,
      batchData.lightingId,
    ];

    if (requiredFields.some((f) => !f)) {
      showAlert("Validation Error", "Please fill in all required fields.");
      return false;
    }

    if (selectedImages.length === 0) {
      showAlert("Validation Error", "Please add at least one image.");
      return false;
    }

    return true;
  };

  const handleSaveLocally = async () => {
    if (!validateBatch()) return;

    try {
      setLoading(true);
      const batchName = batchData.name || formatBatchName();
      const normalizedBatch = {
        ...batchData,
        name: batchName,
        id: batchData.id || batchName,
        synced: false,
        savedAt: new Date().toISOString(),
      };
      const savedBatch = await saveBatch(normalizedBatch as any);
      setSavedImageCount(savedBatch.images.length);
    } catch (err) {
      console.error("Save error:", err);
      showAlert(
        "Save Failed",
        err instanceof Error ? err.message : "Unable to save batch."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setSavedImageCount(null);
    setBatchData(createNewBatch());
    router.replace("/");
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#ffffff"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );

  return (
    <PageTransition>
      <SuccessOverlay
        visible={savedImageCount !== null}
        title="Batch saved!"
        message={Platform.OS === 'web'
          ? `${savedImageCount ?? 0} image${savedImageCount === 1 ? "" : "s"} and the batch details were saved in this browser on this device. Clearing this site's browser data removes saved batches.`
          : `${savedImageCount ?? 0} image${savedImageCount === 1 ? "" : "s"} and the batch details were saved to the "IWRC imaging" folder on this device.`}
        onDone={handleSuccessDone}
      />
      <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Review & Save
        </ThemedText>
      </ThemedView>

      <View style={styles.content}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.summaryTitle}>Batch Summary</ThemedText>
          <View style={styles.summaryBox}>
            {[
              { label: "Batch Name", value: batchData.name || formatBatchName() },
              { label: "Collector / team", value: batchData.collectorName || 'Not provided' },
              { label: "Email", value: batchData.collectorEmail || 'Not provided' },
              { label: "Organization", value: batchData.organization || 'Not provided' },
              { label: "Location", value: locationText },
              { label: "Botanical name", value: batchData.botanicalName },
              { label: "Growing environment", value: batchData.growingEnvironment },
              { label: "Planting system", value: batchData.plantingSystem },
              { label: "Background", value: batchData.weedBackground },
              { label: "Growth stage", value: batchData.growthStage },
              { label: "Soil color", value: batchData.soilColor },
              {
                label: "Lighting",
                value: (() => {
                  const lightingOptions = require('@/assets/data/lighting.json') as { id: number; name: string }[];
                  return lightingOptions.find((option) => option.id === batchData.lightingId)?.name ?? '';
                })(),
              },
            ].map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>{item.label}:</ThemedText>
                <ThemedText style={styles.summaryValue}>{String(item.value ?? "")}</ThemedText>
              </View>
            ))}
          </View>

          <ThemedText style={styles.heading}>
            Selected Images ({selectedImages.length})
          </ThemedText>
          <View style={styles.grid}>
            {selectedImages.map((item, index) => (
              <AnnotationImageCard key={item.id} image={item} index={index} weedName={batchData.botanicalName}
                onAnnotate={() => annotateImage(item.id)} onRemove={() => removeImage(item.id)} />
            ))}
          </View>

          {selectedImages.length > 0 && (
            <View style={{ marginTop: 16, marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleSaveLocally}
              >
                <ThemedText style={styles.continueButtonText}>
                  Save locally
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  summaryLabel: {
    fontWeight: "600",
    marginRight: 6,
    flexShrink: 0,
    color: "#fff",
  },
  summaryValue: {
    flex: 1,
    flexWrap: "wrap",
    color: "#fff",
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#fff",
  },
  continueButton: {
    marginTop: 12,
    backgroundColor: "#4CAF50",
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
