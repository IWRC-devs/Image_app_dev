import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button, RadioButton } from "react-native-paper";


export default function ImageOptionScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [selectedOption, setSelectedOption] = useState<'manual' | 'camera' | null>(null);
  const router = useRouter();

  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;
  const sizeClass = params.sizeClass;
  const flowerAnswer = params.flowerAnswer;
  const cropAnswer = params.cropAnswer;
  const groundCoverPercent = params.groundCoverPercent;
  const cloudCover = params.cloudCover;
  const groundResidue = params.groundResidue;


  const onContinue = () => {
    const formData = {
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
      groundCoverPercent,
      cloudCover,
      groundResidue,
      selectedOption
    };

    if (!selectedOption)
      return;


    router.push({
      pathname: selectedOption === 'manual' ? '/screens/image-selection' : '/screens/capture-image',
      params: { data: JSON.stringify(formData) },
    });


  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
          <ThemedText type="title" style={styles.titleText}>
            Step 4: Select how you want to add images
          </ThemedText>
        </ThemedView>
        <View style={styles.container}>


          <TouchableOpacity
            style={styles.option}
            onPress={() => setSelectedOption('manual')}
          >
            <View style={styles.radioCircle}>
              {selectedOption === 'manual' && <View style={styles.selectedRb} />}
            </View>
            <ThemedText style={styles.optionText}>Select images manually</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => setSelectedOption('camera')}
          >
            <View style={styles.radioCircle}>
              {selectedOption === 'camera' && <View style={styles.selectedRb} />}
            </View>
            <ThemedText style={styles.optionText}>Take images using device camera</ThemedText>
          </TouchableOpacity>



          <Button
            mode="outlined"
            onPress={onContinue}
            style={styles.button}
          >
            Continue
          </Button>


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
  question: {
    fontSize: 18,
    marginBottom: 24,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#444',
  },
});