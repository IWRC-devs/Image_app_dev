import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert, useColorScheme } from "react-native";
import { Button } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';

export default function ImageSelectionScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const router = useRouter();

  const params = useLocalSearchParams();
  const batchDataJson = params.data as string;
  const batchData = JSON.parse(batchDataJson);
  const { affiliationId, sizeClass, flowerAnswer, cropAnswer, groundCoverPercent, cloudCover, groundResidue } = batchData;

  console.log("params-3", batchData);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Picking images
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setSelectedImages(prev => [...prev, ...newUris].slice(0, 500));
    }
  };

  const removeImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(item => item !== uri));
  };

  const handleContinue = () => {
    if (selectedImages.length === 0) {
      Alert.alert("Please select at least one image.");
      return;
    }

    const batchName = `batch-${new Date().toISOString()}`;
    const batchData = {
      name: batchName,
      images: selectedImages.map(uri => ({ uri })),
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
      groundCoverPercent,
      cloudCover,
      groundResidue
    };

    router.push({
      pathname: '../../screens/imaging/review-summary',
      params: { data: JSON.stringify(batchData) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Step 5: Image Selection
        </ThemedText>
      </ThemedView>

      <View style={styles.content}>
        <Button mode="outlined" onPress={pickImages} style={styles.pickButton}>
          <ThemedText style={styles.pickButtonText}>Select Images from Device</ThemedText>
        </Button>

        <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>

        <View style={styles.grid}>
          {selectedImages.map((uri, idx) => (
            <View key={idx} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(uri)}
              >
                <ThemedText style={styles.removeText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

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
              onPress={() => setSelectedImages([])}
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
    elevation: 5, // for Android shadow
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
});
