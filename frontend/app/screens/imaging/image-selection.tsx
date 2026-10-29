import { PageTransition } from "@/components/PageTransition";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from "react-native";
import { showAlert } from "@/utils/alerts";
import { Button } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';
import { useBatch } from "../../context/BatchContext";
import { AnnotationImageCard } from '@/components/AnnotationImageCard';
import { prepareImage } from "@/utils/prepareImage";

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
      exif: true,
    });

    if (!result.canceled) {
      const newItems = await Promise.all(result.assets.map(prepareImage));
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

  // Continue to next screen
  const handleContinue = () => {
    if (selectedImages.length === 0) {
      showAlert("Please select at least one image.");
      return;
    }
    // Navigate to next screen
    router.push("../../screens/imaging/review-summary");
  };

  const annotateImage = (id: string) => {
    router.push({ pathname: "/screens/imaging/annotation-editor", params: { imageId: id } });
  };

  return (
    <PageTransition>
    <View style={{ flex: 1, backgroundColor }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Pick Images Button */}
        <Button mode="outlined" onPress={pickImages} style={styles.pickButton}>
          <ThemedText style={styles.pickButtonText}>Select Images from Device</ThemedText>
        </Button>

        <ThemedText style={styles.heading}>Selected Images ({selectedImages.length})</ThemedText>

        {/* Selected Images Grid */}
        <View style={styles.grid}>
          {selectedImages.map((item, index) => (
            <AnnotationImageCard key={item.id} image={item} index={index} weedName={batchData.botanicalName}
              onAnnotate={() => annotateImage(item.id)} onRemove={() => removeImage(item.id)} />
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

      </ScrollView>
    </View>
    </PageTransition>
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
    flexGrow: 1,
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
    gap: 12,
  },
});
