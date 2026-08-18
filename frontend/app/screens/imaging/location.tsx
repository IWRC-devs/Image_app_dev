import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { type BatchData, createNewBatch, useBatch } from "../../context/BatchContext";
import { saveBatch } from "@/utils/batchStore";

const LOCATION_DATA = (require("@/assets/data/locations.json") as {
  name: string;
  states: string[];
}[]) ?? [];

const COUNTRY_OPTIONS = LOCATION_DATA.map((country) => ({
  label: country.name,
  value: country.name,
}));

export default function LocationScreen() {
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();

  const [country, setCountry] = useState<string | null>(batchData?.locationCountry ?? null);
  const [state, setState] = useState<string | null>(batchData?.locationState ?? null);

  const stateOptions = useMemo(() => {
    if (!country) return [];
    const selectedCountry = LOCATION_DATA.find((item) => item.name === country);
    return selectedCountry?.states ?? [];
  }, [country]);

  useEffect(() => {
    if (!country) {
      setState(null);
      return;
    }

    if (state && !stateOptions.includes(state)) {
      setState(null);
    }
  }, [country, state, stateOptions]);

  const isValid = !!country && !!state;

  const handleContinue = async () => {
    if (!country || !state) {
      Alert.alert("Please complete location selection");
      return;
    }

    const baseBatch: BatchData = batchData ?? createNewBatch();

    const nextBatch: BatchData = {
      ...baseBatch,
      locationCountry: country,
      locationState: state,
      locationCity: null,
      name: baseBatch.name,
      synced: baseBatch.synced,
      id: baseBatch.id,
    };

    setBatchData(nextBatch);

    try {
      if (nextBatch && nextBatch.id) {
        await saveBatch({
          ...nextBatch,
          synced: Boolean(nextBatch.synced),
          savedAt: new Date().toISOString(),
        } as any);
      }
    } catch (err) {
      console.warn("Location save warning:", err);
    }

    router.push("/screens/imaging/parameters");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Country</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={country}
          onValueChange={(value) => {
            setCountry(value);
            setState(null);
          }}
          style={styles.picker}
        >
          <Picker.Item label="Select country" value={null as any} />
          {COUNTRY_OPTIONS.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>State</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={state}
          onValueChange={setState}
          enabled={!!country}
          style={styles.picker}
        >
          <Picker.Item label={country ? "Select state" : "Select country first"} value={null as any} />
          {stateOptions.map((option) => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  label: {
    fontSize: 32,
    color: "#fff",
    marginBottom: 8,
    marginTop: 12,
    fontWeight: "600",
    fontFamily: "sans-serif",
  },
  pickerBox: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 0,
    marginBottom: 12,
    overflow: "hidden",
  },
  picker: {
    color: "#000",
    backgroundColor: "#f0f0f0",
    fontSize: 16,
    height: 60,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
