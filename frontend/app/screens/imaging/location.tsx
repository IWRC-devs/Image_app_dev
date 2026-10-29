import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PageTransition } from "@/components/PageTransition";
import { type BatchData, createNewBatch, useBatch } from "../../context/BatchContext";
import { saveBatch } from "@/utils/batchStore";
import { showAlert } from "@/utils/alerts";

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
  const [collectorName, setCollectorName] = useState(batchData?.collectorName ?? '');
  const [collectorEmail, setCollectorEmail] = useState(batchData?.collectorEmail ?? '');
  const [organization, setOrganization] = useState(batchData?.organization ?? '');

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
      showAlert("Please complete location selection");
      return;
    }

    const email = collectorEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Check email address', 'Enter a valid email address, or leave this optional field blank.');
      return;
    }

    const baseBatch: BatchData = batchData ?? createNewBatch();

    const nextBatch: BatchData = {
      ...baseBatch,
      collectorName: collectorName.trim() || null,
      collectorEmail: email || null,
      organization: organization.trim() || null,
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
    <PageTransition>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, styles.detailLabel]}>Collector / team name (optional)</Text>
      <TextInput
        accessibilityLabel="Collector or team name"
        placeholder="Person or team collecting the images"
        placeholderTextColor="#666"
        value={collectorName}
        onChangeText={setCollectorName}
        autoComplete="name"
        autoCapitalize="words"
        style={styles.input}
      />

      <Text style={[styles.label, styles.detailLabel]}>Email address (optional)</Text>
      <TextInput
        accessibilityLabel="Collector email address"
        placeholder="name@example.org"
        placeholderTextColor="#666"
        value={collectorEmail}
        onChangeText={setCollectorEmail}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <Text style={[styles.label, styles.detailLabel]}>Organization (optional)</Text>
      <TextInput
        accessibilityLabel="Organization"
        placeholder="Organization name"
        placeholderTextColor="#666"
        value={organization}
        onChangeText={setOrganization}
        autoCapitalize="words"
        style={styles.input}
      />

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
    </PageTransition>
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
  detailLabel: {
    fontSize: 20,
  },
  input: {
    backgroundColor: '#f0f0f0',
    color: '#000',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    fontSize: 16,
    marginBottom: 12,
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
