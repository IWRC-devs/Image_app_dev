import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBatch } from "../../context/BatchContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBotanicalNamesFromFile } from "@/data/botanicalName";
import { getLightingFromFile } from "@/data/lighting";

export default function ParametersScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();

  const weedBackgroundOptions = ["Fallow", "Black/Gray Mat"];
  const growthStageOptions = ["Vegetative", "Flowering", "Mature"];
  const soilColorOptions = ["Black", "Brown", "Grey", "Pale Bleached", "Red", "Yellow Brown", "Not Visible"];
  const [weedBackground, setWeedBackground] = useState<string | null>(null);
  const [growthStage, setGrowthStage] = useState<string | null>(null);
  const [soilColor, setSoilColor] = useState<string | null>(null);
  const [lighting, setLighting] = useState<{ id: number; name: string }[]>([]);
  const [selectedLightingId, setSelectedLighting] = useState<number | null>(batchData?.lightingId ?? null);
  const [botanicalName, setBotanicalName] = useState("");
  const [botanicalOptions, setBotanicalOptions] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [botanicalData, lightingData] = await Promise.all([
          getBotanicalNamesFromFile(),
          getLightingFromFile(),
        ]);
        setBotanicalOptions(botanicalData);
        setLighting(lightingData);
      } catch (err) {
        console.error("Error loading form data:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredOptions =
    botanicalName.length === 0
      ? botanicalOptions
      : botanicalOptions.filter((item) =>
        item.name.toLowerCase().includes(botanicalName.toLowerCase())
      );

  const selectBotanical = (name: string) => {
    setBotanicalName(name);
    setShowDropdown(false);
  };

  const ensureBotanicalExists = async (name: string) => {
    const exists = botanicalOptions.some(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    if (!exists) {
      const newItem = {
        id: Date.now(),
        name,
      };
      setBotanicalOptions((prev) => [...prev, newItem]);
    }
  };

  const onContinue = async () => {
    if (!weedBackground || !growthStage || !soilColor || !botanicalName || selectedLightingId === null || selectedLightingId === undefined) return;

    await ensureBotanicalExists(botanicalName);

    if (batchData) {
      setBatchData({
        ...batchData,
        weedBackground,
        growthStage,
        soilColor,
        botanicalName,
        lightingId: selectedLightingId,
      });
    }

    router.push("../../screens/imaging/image-option");
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor }}>
        <ThemedText>Loading parameters...</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.label}>Botanical Name</ThemedText>

          <TextInput
            value={botanicalName}
            onChangeText={(text) => {
              setBotanicalName(text);
              setShowDropdown(true);
            }}
            placeholder="Type or select botanical name"
            style={styles.input}
            onFocus={() => setShowDropdown(true)}
          />

          {showDropdown && filteredOptions.length > 0 && (
            <View style={styles.dropdown}>
              {filteredOptions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownItem}
                  onPress={() => selectBotanical(item.name)}
                >
                  <ThemedText>{item.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.container}>
            <ThemedText style={[styles.label, { marginTop: 20 }]}>Background of target weed</ThemedText>
            {renderList(weedBackgroundOptions, weedBackground, setWeedBackground)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>Growth Stage</ThemedText>
            {renderList(growthStageOptions, growthStage, setGrowthStage)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>Soil Color</ThemedText>
            {renderList(soilColorOptions, soilColor, setSoilColor)}

            <ThemedText style={[styles.label, { marginTop: 20 }]}>Lighting</ThemedText>
            {lighting.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.item, selectedLightingId === opt.id && styles.selectedItem]}
                onPress={() => setSelectedLighting(opt.id)}
              >
                <ThemedText style={[styles.itemText, selectedLightingId === opt.id && styles.selectedText]}>
                  {opt.name}
                </ThemedText>
                {selectedLightingId === opt.id && (
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

        {(weedBackground && growthStage && soilColor && botanicalName && selectedLightingId !== null && selectedLightingId !== undefined) && (
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
  container: { padding: 0, flexGrow: 1 },
  label: { fontSize: 16, marginBottom: 5 },
  item: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedItem: { backgroundColor: "#607D8B" },
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
