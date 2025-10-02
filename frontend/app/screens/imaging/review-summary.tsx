import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, useColorScheme, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createNewBatch, ImageItem, useBatch } from '../../context/BatchContext';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from "@/constants/Config";

export default function ReviewSummaryScreen() {
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  if (!batchData) return <ThemedText>No batch data available</ThemedText>;

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [loading, setLoading] = useState(false);


  // Local state mirrors context images
  const selectedImages = batchData.images;
  //const [localImages, setLocalImages] = useState<ImageItem[]>(batchData.images);

  // Remove an image
  const removeImage = (id: string) => {
    const updatedImages = selectedImages.filter(img => img.id !== id);
    //setLocalImages(updatedImages);
    setBatchData({ ...batchData, images: updatedImages });
  };

  // Save and Upload
  const handleUpload = async () => {
    if (!batchData) return;

    // Validate required fields
  if (
    !batchData.name ||
    !batchData.affiliationId ||
    !batchData.sizeClass ||
    !batchData.flowerAnswer ||
    !batchData.cropAnswer ||
    !batchData.groundCoverPercentId
  ) {
    Alert.alert("Validation Error", "Please fill in all required fields before uploading.");
    return;
  }

    if (selectedImages.length === 0) {
      Alert.alert("Please select at least one image to upload.");
      return;
    }

    if (!batchData) {
      Alert.alert("Batch data not available.");
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();

      // Append batch info
      formData.append("name", batchData.name);
      formData.append("affiliation_id", String(batchData.affiliationId ?? ""));
      formData.append("size_class", batchData.sizeClass ?? "");
      formData.append("flower_answer", batchData.flowerAnswer ?? "");
      formData.append("crop_answer", batchData.cropAnswer ?? "");
      formData.append("ground_cover_percent_id", String(batchData.groundCoverPercentId ?? ""));

      console.log("FormData prepared, sending to backend...");

      // Append images
      selectedImages.forEach((img, idx) => {
        formData.append("images", {
          uri: img.uri,
          name: `image-${idx}.jpg`,
          type: "image/jpeg",
        } as any); // 'as any' to satisfy TS for React Native FormData
      });

      // Call backend API
      const response = await fetch(`${API_BASE_URL}/api/upload-batch`, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
        },
      });

      console.log("Fetch complete, status: ", response.status);

      const result = await response.json();

      console.log("Response data: ", result);

      if (result.success) {
        Alert.alert("Success", `Batch uploaded with ID: ${result.batchId}`);
        //reset to fresh batch
        setBatchData(createNewBatch());
        // clear local images
        //setLocalImages([]);
      } else {
        console.error(result);
        Alert.alert("Upload failed", result.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed", "Server error");
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
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {/* Summary Section */}
          <ThemedText style={styles.summaryTitle}>Batch Summary</ThemedText>
          <View style={styles.summaryBox}>


            {[
              { label: "Batch Name", value: batchData.name },
              { label: "Affiliation ID", value: batchData.affiliationId },
              { label: "Ground Cover Percent ID", value: batchData.groundCoverPercentId },
              { label: "Size Class", value: batchData.sizeClass },
              { label: "Flower, fruit or Seeds", value: batchData.flowerAnswer },
              { label: "Crop or Fallow field", value: batchData.cropAnswer },
            ].map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>{item.label}:</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={styles.summaryValue}
                    numberOfLines={0} // allow multiple lines
                  >
                    {item.value}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* Selected Images Section */}
          <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>
          <View style={styles.grid}>
            {selectedImages.map(item => (
              <View key={item.id} style={styles.imageWrapper}>
                <Image source={{ uri: item.uri }} style={styles.thumbnail} />

                {/* Remove button */}
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(item.id)}>
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}

          </View>

          {selectedImages.length > 0 && (
            <View style={{ marginTop: 16, marginBottom: 12 }}>
              <TouchableOpacity style={styles.continueButton} onPress={handleUpload}>
                <ThemedText style={styles.continueButtonText}>Upload</ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', // optional light background
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start", // aligns label and wrapped text to the top
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
    flexWrap: "wrap", // enables wrapping
    color: "green"
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    margin: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 60,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  removeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  continueButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
