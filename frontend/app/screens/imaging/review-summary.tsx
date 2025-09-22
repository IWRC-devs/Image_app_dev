import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';

type ImageItem = { uri: string };

type BatchData = {
  name: string;
  images: ImageItem[];
  affiliationId: string;
  sizeClass: string;
  flowerAnswer: string;
  cropAnswer: string;
  groundCoverPercent: string;
  cloudCover: string;
  groundResidue: string;
};

export default function ReviewSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  // Parse the batch data safely
  const batchDataJson = params.data as string;
  const batchData: BatchData = JSON.parse(batchDataJson);
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';


  const [selectedImages, setSelectedImages] = useState<ImageItem[]>(batchData.images);


  const removeImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(item => item.uri !== uri));
  };

  const handleUpload = () => {
    if (selectedImages.length === 0) {
      Alert.alert("Please select at least one image to upload.");
      return;
    }

    // TODO: implement upload logic here
    //Alert.alert("Upload", `Uploading ${selectedImages.length} images...`);
    Alert.alert("Upload", `Uploading is disabled`);
  };

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
          <View style={styles.summaryBox}>
            <ThemedText style={styles.summaryTitle}>Batch Summary</ThemedText>
            <ThemedText>Batch Name: {batchData.name}</ThemedText>
            <ThemedText>Affiliation ID: {batchData.affiliationId}</ThemedText>
            <ThemedText>Size Class: {batchData.sizeClass}</ThemedText>
            <ThemedText>Flower Answer: {batchData.flowerAnswer}</ThemedText>
            <ThemedText>Crop Answer: {batchData.cropAnswer}</ThemedText>
            <ThemedText>Ground Cover %: {batchData.groundCoverPercent}</ThemedText>
          </View>

          {/* Thumbnails Section */}
          <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>
          <View style={styles.grid}>
            {selectedImages.map((item: ImageItem, idx: number) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: item.uri }} style={styles.thumbnail} />

                {/* Remove button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(item.uri)}
                >
                  <ThemedText style={styles.removeText}>✕</ThemedText>
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
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
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
    backgroundColor: 'red',
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
