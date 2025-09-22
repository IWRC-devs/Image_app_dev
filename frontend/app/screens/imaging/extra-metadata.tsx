import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, useColorScheme, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button } from "react-native-paper";

export default function ExtraMetadataScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [groundCoverPercent, setGroundCoverPercent] = useState('');
  const router = useRouter();

  const params = useLocalSearchParams();
  const batchDataJson = params.data as string;
  const batchData = JSON.parse(batchDataJson);
  const affiliationId = batchData.affiliationId;
  const sizeClass = batchData.sizeClass;
  const flowerAnswer = batchData.flowerAnswer;
  const cropAnswer = batchData.cropAnswer;


  const options = ["0-25%", "26-50%", "51-75%", "76-100%"];

  const onContinue = () => {
    if (!groundCoverPercent) return;
    const formData = {
      affiliationId,
      sizeClass,
      flowerAnswer,
      cropAnswer,
      groundCoverPercent,
    };

    router.push({
      pathname: '../../screens/imaging/image-option',
      params: { data: JSON.stringify(formData) },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Step 3: Extra Metadata
        </ThemedText>
      </ThemedView>
      <View style={{ flex: 1, padding: 16 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.label}>Ground Cover %</ThemedText>
          <View style={styles.listContainer}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.item,
                  groundCoverPercent === opt && styles.selectedItem,
                ]}
                onPress={() => setGroundCoverPercent(opt)}
              >
                <ThemedText style={[
                  styles.itemText,
                  groundCoverPercent === opt && styles.selectedText
                ]}>
                  {opt}
                </ThemedText>
                {groundCoverPercent === opt && (
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

          {groundCoverPercent ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => onContinue()}
            >
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
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
    backgroundColor: "#607D8B", // selected color (green)
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
