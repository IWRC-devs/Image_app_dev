import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Alert, useColorScheme } from "react-native";
import { Button } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';
import { ImageItem, useBatch } from "../../context/BatchContext";
import uuid from 'react-native-uuid';
import { Ionicons } from "@expo/vector-icons";

export default function ImageSelectionScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  if (!batchData) return <ThemedText>No batch data available</ThemedText>;

  // Local state mirrors context images
  //const [selectedImages, setSelectedImages] = useState<ImageItem[]>(batchData.images ?? []); //Remove local state and use context directly
  const selectedImages = batchData?.images ?? [];

  // Pick images from device
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      const newItems = result.assets.map(asset => ({ id: uuid.v4() as string, uri: asset.uri }));
      const updatedImages = [...selectedImages, ...newItems].slice(0, 500);
      //setSelectedImages(updatedImages);
      setBatchData({ ...batchData, images: updatedImages }); // update context
    }
  };

  // Remove an image
  const removeImage = (id: string) => {
    const updatedImages = selectedImages.filter(img => img.id !== id);
    //setSelectedImages(updatedImages);
    setBatchData({ ...batchData, images: updatedImages });
  };

  // Clear all images
  const clearAll = () => {
    //setSelectedImages([]);
    setBatchData({ ...batchData, images: [] });
  };

  // Continue to next screen
  const handleContinue = () => {
    if (selectedImages.length === 0) {
      Alert.alert("Please select at least one image.");
      return;
    }
    // Navigate to next screen
    router.push("../../screens/imaging/review-summary");
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <View style={styles.content}>
        {/* Pick Images Button */}
        <Button mode="outlined" onPress={pickImages} style={styles.pickButton}>
          <ThemedText style={styles.pickButtonText}>Select Images from Device</ThemedText>
        </Button>

        <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>

        {/* Selected Images Grid */}
        <View style={styles.grid}>
          {selectedImages.map((item) => (
            <View key={item.id} style={styles.imageWrapper}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(item.id)}
              >
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Continue and Clear buttons */}
        {selectedImages.length > 0 && (
          <View style={{ marginTop: 16, marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>

            <Button
              mode="outlined"
              onPress={() => {
                //setSelectedImages([]);
                if (batchData) {
                  setBatchData({ ...batchData, images: [] });
                }
              }}
              style={{
                borderColor: 'red',
                marginTop: 12,
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 8,
              }}
              labelStyle={{ color: 'red', fontWeight: 'bold' }}
            >
              Clear All
            </Button>
          </View>
        )}

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
  pickButton: {
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'grey',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  continueButtonContainer: {
    marginTop: 16,
  },
  continueButton: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  imageWrapper: {
    width: '28%',          // three images per row
    aspectRatio: 1,
    marginBottom: 12,      // vertical spacing
    marginRight: 12,       // horizontal spacing
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
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
});
