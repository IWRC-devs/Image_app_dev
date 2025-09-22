import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { Button } from "react-native-paper";
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

export default function CaptureImageScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const router = useRouter();

  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;
  const sizeClass = params.sizeClass;
  const flowerAnswer = params.flowerAnswer;
  const cropAnswer = params.cropAnswer;
  const groundCoverPercent = params.groundCoverPercent;
  const cloudCover = params.cloudCover;
  const groundResidue = params.groundResidue;

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) {
      setCapturedImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (uri: string) => {
    setCapturedImages(prev => prev.filter(img => img !== uri));
  };

  const clearAll = () => setCapturedImages([]);

  const handleContinue = () => {
    if (capturedImages.length === 0) {
      Alert.alert("Please capture at least one image.");
      return;
    }

    const timestamp = new Date().toISOString();
    const batch = {
      name: `batch-${timestamp}`,
      images: capturedImages.map(uri => ({ id: uuid.v4(), uri })),
    };

    const batchData = {
      name: batch.name,
      images: batch.images,
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
              {capturedImages.map((uri, idx) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />

                  {/* Remove button */}
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(uri)}>
                    <ThemedText style={styles.removeText}>✕</ThemedText>
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
    backgroundColor: 'red',
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
