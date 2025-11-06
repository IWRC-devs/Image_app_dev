import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Config";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useBatch } from "../../context/BatchContext";
import { getAffiliationsFromFile } from "@/data/affiliations";

export default function AffiliationList() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";

  const [affiliations, setAffiliations] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedAffiliation, setSelectedAffiliation] = useState<
    { id: number; name: string } | null
  >(null);
  const [loading, setLoading] = useState(true);


  /**
  * @deprecated Use `getAffiliationsFromFile()` instead.
  */
  async function fetchAffiliationsFromAPI() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/affiliations`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getAffiliationsFromFile();
        setAffiliations(data);
      } catch (err) {
        console.error("Error loading affiliations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { batchData, setBatchData } = useBatch();
  const timestamp = new Date().toISOString();

  // Generate initial batch data only if it doesn't exist yet
  useEffect(() => {
    if (!batchData) {
      const timestamp = new Date().toISOString();
      setBatchData({
        id:'',
        name: `batch-${timestamp}`,  // batch name generated once
        images: [],
        affiliationId: selectedAffiliation?.id ?? undefined,
        sizeClass: null,
        flowerAnswer: null,
        cropAnswer: null,
        groundCoverPercentId: undefined,
        //cloudCover: undefined,
        //groundResidue: undefined,
        selectedOption: undefined,
      });
    }
  }, []);

  // Continue to next screen
  const handleContinue = () => {
    if (selectedAffiliation && batchData) {
      // update batchData with selected affiliation
      if (batchData) {
        setBatchData({
          ...batchData,
          affiliationId: selectedAffiliation.id, // update only this field
        });
      }

      // navigate to next screen
      router.push("../../screens/imaging/parameters"); // no params needed
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#ffffff"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Select an affiliation
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16 }}>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>

          {affiliations.map((aff) => (
            <TouchableOpacity
              key={aff.id}
              style={[
                styles.item,
                selectedAffiliation?.id === aff.id && styles.selectedItem,
              ]}
              onPress={() => setSelectedAffiliation(aff)}
            >
              <ThemedText
                style={[
                  styles.itemText,
                  selectedAffiliation?.id === aff.id && styles.selectedText,
                ]}
              >
                {aff.name}
              </ThemedText>

              {selectedAffiliation?.id === aff.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={30}
                  color="black"
                  style={{ marginLeft: 8 }}
                />
              )}

            </TouchableOpacity>
          ))}

        </ScrollView>
        {selectedAffiliation && (
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
  container: {
    padding: 0,
  },
  titleContainer: { padding: 10, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  item: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // pushes icon to the right
  },
  selectedItem: {
    backgroundColor: "#607D8B",
  },
  itemText: {
    fontSize: 18,
    color: "#333",
  },
  selectedText: {
    color: "#fff",
    fontWeight: "bold",
  },
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
