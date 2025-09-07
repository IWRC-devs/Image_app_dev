import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Button, RadioButton } from "react-native-paper";
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';

export default function CaptureImageScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
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

    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled && result.assets.length > 0) {
      setCapturedImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleImageTap = (uri: string) => {
    setCapturedImages((prev) => prev.filter(img => img !== uri));
    setSelectedImages((prev) => [...prev, uri]);
  };

  const handleContinue = () => {
    const formData = {
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
      groundCoverPercent,
      cloudCover,
      groundResidue
    };
    const timestamp = new Date().toISOString();
    const batch = {
      name: `batch-${timestamp}`,
      images: selectedImages.map((uri) => ({ id: uuid.v4(), uri })),
    };

    // TODO: Save `batch` to DB
    router.push({
      pathname: '/screens/image-selection',
      params: { data: JSON.stringify(formData) },
    });

  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
          <ThemedText type="title" style={styles.titleText}>
            Step 5: Capture Image
          </ThemedText>
        </ThemedView>
        <View style={styles.container}>

          <Button onPress={handleCapture}>Capture Image</Button>





          <ThemedText style={{ fontWeight: 'bold', marginTop: 20 }}>Captured Images</ThemedText>
          <ScrollView horizontal>
            {capturedImages.map((uri) => (
              <TouchableOpacity key={uri} onPress={() => handleImageTap(uri)}>
                <Image source={{ uri }} style={{ width: 100, height: 100, margin: 5 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ThemedText style={{ fontWeight: 'bold', marginTop: 20 }}>Selected Images</ThemedText>
          <ScrollView horizontal>
            {selectedImages.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 100, height: 100, margin: 5 }} />
            ))}
          </ScrollView>

          {selectedImages.length > 0 && (
            <Button onPress={handleContinue} >Continue</Button>
          )}


        </View>




      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  titleContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  subTitleText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'normal',
    lineHeight: 36,
    marginBottom: 50
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 0,
    borderRadius: 5,
    borderColor: '#ccc',
    marginBottom: 140,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: 30,
    color: '#000'
  },
});