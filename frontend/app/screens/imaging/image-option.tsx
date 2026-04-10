import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { useBatch } from "../../context/BatchContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ImageOptionScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();

  if (!batchData) return <ThemedText>No batch data available</ThemedText>;

  // Restrict state to match BatchData.selectedOption type
  const [selectedOption, setSelectedOption] = useState<"manual" | "capture" | null>(
    batchData.selectedOption ?? null
  );

  // Options for user to select
  const options: { key: 'manual' | 'capture'; label: string }[] = [
    { key: 'manual', label: 'Select images manually' },
    { key: 'capture', label: 'Take images using device camera' },
  ];

  // Continue to next screen
  const handleContinue = () => {
    if (!selectedOption) return;

    // Update batchData in context
    setBatchData({
      ...batchData,
      selectedOption,
      // batchData already contains affiliationId, weedBackground, growthStage, soilColor, groundCoverPercent, etc.
    });

    // Navigate to the next screen
    const nextScreen =
      selectedOption === "manual"
        ? "../../screens/imaging/image-selection"
        : "../../screens/imaging/capture-image";

    router.push(nextScreen);
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
        </ScrollView>
        {selectedOption && (
            <SafeAreaView
                        edges={[]}
                        style={{ paddingHorizontal: 0, paddingTop: 20, paddingBottom: 12 }}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => handleContinue()}
            >
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
            </SafeAreaView>
          )}
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
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
