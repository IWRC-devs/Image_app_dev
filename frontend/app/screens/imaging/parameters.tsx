import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBatch } from "../../context/BatchContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ParametersScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";
  const router = useRouter();
  //const params = useLocalSearchParams();
  const { batchData, setBatchData } = useBatch();

  const weedBackgroundOptions = ["Wheat"];
  const growthStageOptions = ["Yes", "No"];
  const soilColorOptions = ["Black", "Brown", "Grey", "Pale Bleached", "Red", "Yellow Brown"];
  const [weedBackground, setWeedBackground] = useState<string | null>(null);
  const [growthStage, setGrowthStage] = useState<string | null>(null);
  const [soilColor, setSoilColor] = useState<string | null>(null);

  // Continue to next screen
  const onContinue = () => {
    if (!weedBackground || !growthStage || !soilColor) return;

    if (batchData) {
      setBatchData({
        ...batchData!,
        weedBackground,
        growthStage,
        soilColor,
      });
    }
    router.push("../../screens/imaging/extra-metadata");
  };

  const renderList = (
    items: string[],
    selected: string | null,
    onSelect: (item: string) => void
  ) => {
    return items.map((item) => (
      <TouchableOpacity
        key={item}
        style={[styles.item, selected === item && styles.selectedItem]}
        onPress={() => onSelect(item)}
      >
        <ThemedText style={[styles.itemText, selected === item && styles.selectedText]}>
          {item}
        </ThemedText>
        {selected === item && (
          <Ionicons
            name="checkmark-circle"
            size={30}
            color="black"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Step 2: Select Parameters
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16 }}>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <ThemedText style={styles.label}>Background of target weed</ThemedText>
            {renderList(weedBackgroundOptions, weedBackground, setWeedBackground)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>
              Growth Stage
            </ThemedText>
            {renderList(growthStageOptions, growthStage, setGrowthStage)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>
              Soil Color
            </ThemedText>
            {renderList(soilColorOptions, soilColor, setSoilColor)}
          </View>
        </ScrollView>
        {(weedBackground && growthStage && soilColor) && (
          <SafeAreaView
            edges={[]}
            style={{ paddingHorizontal: 0, paddingTop: 20, paddingBottom: 12 }}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => onContinue()}
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
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  container: { padding: 0, flexGrow: 1 },
  titleContainer: { padding: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, marginBottom: 5 },
  item: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // pushes icon to the right
  },
  selectedItem: { backgroundColor: "#607D8B" }, // red variant
  itemText: { fontSize: 18, color: "#333" },
  selectedText: { color: "#fff", fontWeight: "bold" },
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
