import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useBatch } from "../../context/BatchContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/constants/Config";
import { getGroundCoverPercentFromFile } from "@/data/groundCoverPercent";

export default function ExtraMetadataScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';

  const { batchData, setBatchData } = useBatch();
  const [groundCoverPercent, setGroundCoverPercent] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedGroundCoverPercentId, setSelectedGroundCoverPercent] = useState<number | null>(
    batchData?.groundCoverPercentId ?? null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
 * @deprecated Use `getAffiliationsFromFile()` instead.
 */
  async function fetchGroundCoverPercent() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ground-cover-percent`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setGroundCoverPercent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getGroundCoverPercentFromFile();
        setGroundCoverPercent(data);
      } catch (err) {
        console.error("Error loading Ground Cover Percent:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Continue to next screen
  const onContinue = () => {
    if (selectedGroundCoverPercentId === null || selectedGroundCoverPercentId === undefined) return;

    if (batchData) {
      setBatchData({
        ...batchData!,
        groundCoverPercentId: selectedGroundCoverPercentId,
      });
    }

    router.push("../../screens/imaging/image-option");
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
          Step 3: Extra Metadata
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16, position: 'relative' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.label}>Lighting</ThemedText>
          <View style={styles.listContainer}>
            {groundCoverPercent.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.item,
                  selectedGroundCoverPercentId === opt.id && styles.selectedItem,
                ]}
                onPress={() => setSelectedGroundCoverPercent(opt.id)}
              >
                <ThemedText style={[
                  styles.itemText,
                  selectedGroundCoverPercentId === opt.id && styles.selectedText
                ]}>
                  {opt.name}
                </ThemedText>
                {selectedGroundCoverPercentId === opt.id && (
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
        {selectedGroundCoverPercentId && (
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
  safeArea: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  container: {
    padding: 0,
    flexGrow: 1,
  },
  titleContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  listContainer: {
    marginBottom: 20,
  },
  item: {
    padding: 16,
    marginVertical: 6,
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
  button: {
    marginTop: 20,
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
