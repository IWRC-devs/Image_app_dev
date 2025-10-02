import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { Button } from "react-native-paper";
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ImageItem, useBatch } from "../../context/BatchContext";

export default function CaptureImageScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const { batchData, setBatchData } = useBatch();
  //const [capturedImages, setCapturedImages] = useState<ImageItem[]>(batchData?.images ?? []); //Remove local state and use context directly
  const capturedImages = batchData?.images ?? [];
  const router = useRouter();
  if (!batchData) return <ThemedText>No batch data available</ThemedText>;

  // Capture from camera
  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) {
      const newImage: ImageItem = { id: uuid.v4() as string, uri: result.assets[0].uri };
      const updatedImages = [...capturedImages, newImage].slice(0, 500);
      //setCapturedImages(updatedImages);
      setBatchData({ ...batchData, images: updatedImages }); // Update context
    }
  };

  // Remove image
  const removeImage = (id: string) => {
    const updatedImages = capturedImages.filter(img => img.id !== id);
    //setCapturedImages(updatedImages);
    setBatchData({ ...batchData, images: updatedImages }); // Update context
  };

  // Clear all
  const clearAll = () => {
    //setCapturedImages([]);
    setBatchData({ ...batchData, images: [] });
  };

  // Continue to next screen
  const handleContinue = () => {
    if (capturedImages.length === 0) {
      Alert.alert("Please capture at least one image.");
      return;
    }

    // Navigate to next screen
    router.push("../../screens/imaging/review-summary");
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Step 5: Capture Images
        </ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Camera Icon */}
        <TouchableOpacity style={styles.cameraButton} onPress={handleCapture}>
          <MaterialIcons name="add-a-photo" size={56} color="#fff" />
        </TouchableOpacity>

        {/* Selected Images Grid */}
        {capturedImages.length > 0 && (
          <>
            <ThemedText style={styles.heading}>Captured Images ({capturedImages.length})</ThemedText>

            <View style={styles.grid}>
              {capturedImages.map((item) => (
                <View key={item.id} style={styles.imageWrapper}>
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(item.id)}>
                  <Ionicons name="close-circle" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Continue & Clear All */}
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
              </TouchableOpacity>

              <Button
                mode="outlined"
                onPress={clearAll}
                style={styles.clearButton}
                labelStyle={styles.clearButtonText}
              >
                Clear All
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  cameraButton: {
    width: 180,
    height: 120,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'grey',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
    overflow: 'hidden',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    margin: 6,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontWeight: 'bold',
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
  clearButton: {
    borderColor: 'red',
    marginTop: 12,
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'red',
    fontWeight: 'bold',
  },
});
