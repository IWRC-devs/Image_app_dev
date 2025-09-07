import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet } from "react-native";
import { Button, RadioButton } from "react-native-paper";


export default function ImageSelectionScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [groundCoverPercent, setGroundCoverPercent] = useState('');
  const [cloudCover, setCloudCover] = useState('');
  const [groundResidue, setGroundResidue] = useState('');
  const router = useRouter();

  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;
  const sizeClass = params.sizeClass;
  const flowerAnswer = params.flowerAnswer;
  const cropAnswer = params.cropAnswer;


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
      pathname: '/screens/image-option', 
      params: { data: JSON.stringify(formData) },
    });
  
 
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
          <ThemedText type="title" style={styles.titleText}>
          Step 4: Image Selection
          </ThemedText>
        </ThemedView>
        <View style={styles.container}>
        <ThemedText>Ground Cover %</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={groundCoverPercent}
              onValueChange={(itemValue) => setGroundCoverPercent(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select ground cover %" value="" />
              <Picker.Item label="0-25%" value="0-25%" />
              <Picker.Item label="26-50%" value="26-50%" />
              <Picker.Item label="51-75%" value="51-75%" />
              <Picker.Item label="76-100%" value="76-100%" />
            </Picker>
          </View>

     


     
          



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
});