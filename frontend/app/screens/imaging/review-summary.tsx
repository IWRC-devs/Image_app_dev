import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { createNewBatch, useBatch } from "../../context/BatchContext";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/constants/Config";
import { saveBatch } from "@/utils/batchStore";
import NetInfo from "@react-native-community/netinfo";

export default function ReviewSummaryScreen() {
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";

  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const selectedImages = batchData?.images ?? [];

  /** ✅ Monitor connection status */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected && state.isInternetReachable));
    });
    return unsubscribe;
  }, []);

  if (!batchData)
    return <ThemedText>No batch data available. Please go back.</ThemedText>;

  /** ✅ Remove image from batch */
  const removeImage = (id: string) => {
    const updatedImages = selectedImages.filter((img) => img.id !== id);
    setBatchData({ ...batchData, images: updatedImages });
  };

  /** ✅ Validate before saving or uploading */
  const validateBatch = (): boolean => {
    const requiredFields = [
      batchData.name,
      batchData.affiliationId,
      batchData.sizeClass,
      batchData.flowerAnswer,
      batchData.cropAnswer,
      batchData.groundCoverPercentId,
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

  /** ✅ Offline-first save */
  const handleSaveOffline = async () => {
    if (!validateBatch()) return;

    try {
      setLoading(true);
      const newBatch = {
        ...batchData,
        id: batchData.id || `batch-${Date.now()}`,
        synced: false,
        savedAt: new Date().toISOString(),
      };
      await saveBatch(newBatch);
      Alert.alert("Saved Locally", "Batch saved offline for future upload.");
      setBatchData(createNewBatch());
    } catch (err) {
      console.error("Save offline error:", err);
      Alert.alert("Save Failed", "Unable to save batch locally.");
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Upload immediately if online */
  const handleUpload = async () => {
    if (!validateBatch()) return;
    if (!isConnected) {
      Alert.alert("Offline", "You are offline. Please try again later.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", batchData.name);
      formData.append("affiliation_id", String(batchData.affiliationId ?? ""));
      formData.append("size_class", batchData.sizeClass ?? "");
      formData.append("flower_answer", batchData.flowerAnswer ?? "");
      formData.append("crop_answer", batchData.cropAnswer ?? "");
      formData.append(
        "ground_cover_percent_id",
        String(batchData.groundCoverPercentId ?? "")
      );

      selectedImages.forEach((img, idx) => {
        formData.append("images", {
          uri: img.uri,
          name: `image-${idx}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      const response = await fetch(`${API_BASE_URL}/api/upload-batch`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", `Batch uploaded with ID: ${result.batchId}`);
        setBatchData(createNewBatch());
      } else {
        console.error(result);
        Alert.alert("Upload failed", result.error || "Unknown error occurred.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload failed", "Server or network error.");
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
          Review & Upload
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
              { label: "Batch Name", value: batchData.name },
              { label: "Affiliation ID", value: batchData.affiliationId },
              { label: "Ground Cover % ID", value: batchData.groundCoverPercentId },
              { label: "Size Class", value: batchData.sizeClass },
              { label: "Flower/Fruit/Seed", value: batchData.flowerAnswer },
              { label: "Crop or Fallow", value: batchData.cropAnswer },
            ].map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>{item.label}:</ThemedText>
                <ThemedText style={styles.summaryValue}>{item.value}</ThemedText>
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

          {/* ✅ Buttons */}
          {selectedImages.length > 0 && (
            <View style={{ marginTop: 16, marginBottom: 12 }}>
              {!isConnected ? (
                <>
                  <ThemedText
                    style={{
                      color: "orange",
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    You’re offline — save locally and upload later.
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleSaveOffline}
                  >
                    <ThemedText style={styles.continueButtonText}>
                      Save Offline
                    </ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.continueButton, { backgroundColor: "#4CAF50" }]}
                    onPress={handleUpload}
                  >
                    <ThemedText style={styles.continueButtonText}>
                      Upload Now
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      { backgroundColor: "#007BFF", marginTop: 10 },
                    ]}
                    onPress={handleSaveOffline}
                  >
                    <ThemedText style={styles.continueButtonText}>
                      Save Draft (Upload Later)
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
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
  },
  summaryValue: {
    flex: 1,
    flexWrap: "wrap",
    color: "green",
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
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
