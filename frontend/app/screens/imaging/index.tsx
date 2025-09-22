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
import { Button } from "react-native-paper";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Config";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";

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

  useEffect(() => {
    async function fetchAffiliations() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/affiliations`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setAffiliations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAffiliations();
  }, []);

  const handleContinue = () => {
    if (selectedAffiliation) {
      router.push({
        pathname: "../../screens/imaging/parameters",
        params: { affiliationId: selectedAffiliation.id },
      });
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

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}
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
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => handleContinue()}
          >
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          </TouchableOpacity>
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
