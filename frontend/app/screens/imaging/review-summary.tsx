import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { createNewBatch, formatBatchName, useBatch } from "../../context/BatchContext";
import { Ionicons } from "@expo/vector-icons";
import { exportBatchToDocuments, saveBatch } from "@/utils/batchStore";

export default function ReviewSummaryScreen() {
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";

  const [loading, setLoading] = useState(false);

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

  const validateBatch = (): boolean => {
    const requiredFields = [
      batchData.name,
      batchData.locationCountry,
      batchData.locationState,
      batchData.weedBackground,
      batchData.growthStage,
      batchData.soilColor,
      batchData.lightingId,
    ];

    if (requiredFields.some((f) => !f)) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return false;
    }

    if (selectedImages.length === 0) {
      Alert.alert("Validation Error", "Please add at least one image.");
      return false;
    }

    return true;
  };

  const handleSaveOffline = async () => {
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
      await saveBatch(normalizedBatch as any);
      const exportPath = await exportBatchToDocuments(normalizedBatch as any);
      Alert.alert(
        "Saved",
        `Batch saved successfully.\nDocuments/${exportPath}`
      );
      setBatchData(createNewBatch());
      router.back();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Save Failed", "Unable to save batch.");
    } finally {
      setLoading(false);
    }
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
    <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Review & Save
        </ThemedText>
      </ThemedView>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.summaryTitle}>Batch Summary</ThemedText>
          <View style={styles.summaryBox}>
            {[
              { label: "Batch Name", value: batchData.name || formatBatchName() },
              { label: "Location", value: locationText },
              { label: "Botanical name", value: batchData.botanicalName },
              { label: "Weed site", value: batchData.weedSite },
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
            {selectedImages.map((item) => (
              <View key={item.id} style={styles.imageWrapper}>
                <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(item.id)}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {selectedImages.length > 0 && (
            <View style={{ marginTop: 16, marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleSaveOffline}
              >
                <ThemedText style={styles.continueButtonText}>
                  Save batch
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
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
  imageWrapper: {
    position: "relative",
    margin: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "white",
    borderRadius: 60,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
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
