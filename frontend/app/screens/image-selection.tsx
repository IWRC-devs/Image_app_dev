import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, Alert, TouchableOpacity, Image } from "react-native";
import { Button, RadioButton } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';


export default function ImageSelectionScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const router = useRouter();

  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;
  const sizeClass = params.sizeClass;
  const flowerAnswer = params.flowerAnswer;
  const cropAnswer = params.cropAnswer;
  const groundCoverPercent = params.groundCoverPercent;
  const cloudCover = params.cloudCover;
  const groundResidue = params.groundResidue;

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const handleContinue = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("Please select at least one image.");
      return;
    }

    const batchName = `batch-${new Date().toISOString()}`;
    const batch = {
      name: batchName,
      images: selectedImages.map(uri => ({ uri })),
    };

    try {
      /*const response = await axios.post('http://<YOUR-IP>:PORT/api/save-batch', batch);
      router.push({
        pathname: '/screens/summary',
        params: { batchId: response.data.batchId },
      });*/
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save images.');
    }
  };


  const onContinue = () => {
    const formData = {
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
      groundCoverPercent,
      cloudCover,
      groundResidue
    };

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
            Step 5: Image Selection
          </ThemedText>
        </ThemedView>
        <View style={styles.container}>




          <Button onPress={pickImages} >Select Images from Device</Button>

          <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>
          <ScrollView horizontal style={{ marginVertical: 12 }}>
            {selectedImages.map((uri, idx) => (
              <TouchableOpacity key={idx} onPress={() => removeImage(uri)}>
                <Image source={{ uri }} style={styles.thumbnail} />
              </TouchableOpacity>
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
  thumbnail: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
  },
  heading: {
    fontWeight: 'bold',
    marginTop: 16,
    fontSize: 16,
  },
});