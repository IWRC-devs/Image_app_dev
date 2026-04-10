import { useRouter } from "expo-router";
import { useEffect, useState, useContext } from "react";
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
import { UserContext } from "@/app/context/UserContext";

export default function AffiliationList() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#1D3D47" : "#A1CEDC";
  const [affiliations, setAffiliations] = useState<
    { id: number; name: string } | null
  >(null);
  const [loading, setLoading] = useState(true);



  const { batchData, setBatchData } = useBatch();

  // Generate initial batch data only if it doesn't exist yet
  useEffect(() => {
    async function initBatch() {
      console.log("user1:", user);
      if (!batchData) {
        if (!user) return;
        const timestamp = new Date().toISOString();
        const newBatch = {
          synced: false,
          id: '',
          name: `batch-${timestamp}`,  // batch name generated once
          images: [],
          affiliationId: undefined,
          weedBackground: null,
          growthStage: null,
          soilColor: null,
          lightingId: undefined,
          selectedOption: undefined,
        };
        setBatchData(newBatch);
        try {
          const res = await fetch(`${API_BASE_URL}/api/find-or-create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country_id: user.country_id,
              team_name: user.team_name,
              country_name: user.country_name,
              country_code: user.country_code
            }),
          });
          const data = await res.json();
          console.log("Affiliations:", data);
          setAffiliations(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    }
    initBatch();
  }, [user]);

  // Continue to next screen
  const handleContinue = () => {
    if (batchData) {
      // update batchData with selected affiliation
      setBatchData({
        ...batchData,
        affiliationId: affiliations?.id, // update only this field
      });

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
          Affiliation
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16 }}>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.affiliation}>{affiliations?.name}</ThemedText>

         

        </ScrollView>
        {affiliations && (
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
  affiliation: { fontSize: 20, marginBottom: 40 },
});
