import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet } from "react-native";
import { Button, RadioButton } from "react-native-paper";


export default function ParametersScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [sizeClass, setSizeClass] = useState('');
  const [flowerAnswer, setFlowerAnswer] = useState('');
  const [cropAnswer, setCropAnswer] = useState('');
  const router = useRouter();

  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;

  const sizeClassList = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  const onContinue = () => {
    const formData = {
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
    };
  
    router.push({
      pathname: '/screens/extra-metadata', 
      params: { data: JSON.stringify(formData) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
          <ThemedText type="title" style={styles.titleText}>
            Step 2: Select Parameters 
          </ThemedText>
        </ThemedView>
        <View style={styles.container}>
        <ThemedText>Select Size Class</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={sizeClass}
              onValueChange={(itemValue) => setSizeClass(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select size" value="" />
              <Picker.Item label="Small" value="small" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Large" value="large" />
            </Picker>
          </View>


          <ThemedText style={[styles.label, { marginTop: 20 }]}>
            Do you see any flower, fruit or seeds?
          </ThemedText>
          <RadioButton.Group
            onValueChange={(newValue) => setFlowerAnswer(newValue)}
            value={flowerAnswer}
          >
            <View style={styles.radioItem}>
              <RadioButton value="yes" />
              <ThemedText>Yes</ThemedText>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="no" />
              <ThemedText>No</ThemedText>
            </View>
          </RadioButton.Group>


          <ThemedText style={[styles.label, { marginTop: 20 }]}>
          Is there a crop or is this a fallow field?
          </ThemedText>
          <RadioButton.Group
            onValueChange={(newValue) => setCropAnswer(newValue)}
            value={cropAnswer}
          >
            <View style={styles.radioItem}>
              <RadioButton value="crop" />
              <ThemedText>Crop</ThemedText>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="fallow" />
              <ThemedText>Fallow</ThemedText>
            </View>
          </RadioButton.Group>

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