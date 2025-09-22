import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button } from "react-native-paper";

export default function ImageOptionScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [selectedOption, setSelectedOption] = useState<'manual' | 'camera' | null>(null);
  const router = useRouter();

  const params = useLocalSearchParams();
  const batchDataJson = params.data as string;
  const batchData = JSON.parse(batchDataJson);
  const { affiliationId, sizeClass, flowerAnswer, cropAnswer, groundCoverPercent, cloudCover, groundResidue } = batchData;

  console.log("params-2", batchData);

  const options: { key: 'manual' | 'camera'; label: string }[] = [
    { key: 'manual', label: 'Select images manually' },
    { key: 'camera', label: 'Take images using device camera' },
  ];

  const handleContinue = () => {
    if (!selectedOption) return;

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
      pathname: selectedOption === 'manual' ? '../../screens/imaging/image-selection' : '../../screens/imaging/capture-image',
      params: { data: JSON.stringify({ ...formData, selectedOption }) },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={[styles.title, { flexWrap: 'wrap' }]}>
          Step 4: Select how you want to add images
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>


          <View style={styles.listContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionItem,
                  selectedOption === option.key && styles.optionSelected,
                ]}
                onPress={() => setSelectedOption(option.key)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    selectedOption === option.key && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </ThemedText>
                {selectedOption === option.key && (
                  <Ionicons
                    name="checkmark-circle"
                    size={30}
                    color="black"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {selectedOption && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => handleContinue()}
            >
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 0, flexGrow: 1 },
  titleContainer: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  listContainer: { marginTop: 20 },
  optionItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // pushes icon to the right
  },
  optionSelected: {
    backgroundColor: '#607D8B', // selected green variant
  },
  optionText: { fontSize: 16, color: '#000' },
  optionTextSelected: { color: '#fff', fontWeight: 'bold' },
  continueButton: {
    marginTop: 20,
    marginBottom: 100,
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
});
