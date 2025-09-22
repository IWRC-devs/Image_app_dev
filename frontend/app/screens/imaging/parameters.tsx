import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

export default function ParametersScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";
  const router = useRouter();
  const params = useLocalSearchParams();
  const affiliationId = params.affiliationId;

  const sizeClasses = ["Small", "Medium", "Large"];
  const flowerOptions = ["Yes", "No"];
  const cropOptions = ["Crop", "Fallow"];

  const [sizeClass, setSizeClass] = useState<string | null>(null);
  const [flowerAnswer, setFlowerAnswer] = useState<string | null>(null);
  const [cropAnswer, setCropAnswer] = useState<string | null>(null);

  const onContinue = () => {
    const formData = { affiliationId, sizeClass, flowerAnswer, cropAnswer };
    router.push({
      pathname: "../../screens/imaging/extra-metadata",
      params: { data: JSON.stringify(formData) },
    });
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

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <ThemedText style={styles.label}>Select Size Class</ThemedText>
            {renderList(sizeClasses, sizeClass, setSizeClass)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>
              Do you see any flower, fruit or seeds?
            </ThemedText>
            {renderList(flowerOptions, flowerAnswer, setFlowerAnswer)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>
              Is there a crop or is this a fallow field?
            </ThemedText>
            {renderList(cropOptions, cropAnswer, setCropAnswer)}
          </View>
        </ScrollView>
        {(sizeClass && flowerAnswer && cropAnswer) && (

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => onContinue()}
          >
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          </TouchableOpacity>
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
    marginTop: 24,
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
