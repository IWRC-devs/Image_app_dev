import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PageTransition } from "@/components/PageTransition";
import { type BatchData, createNewBatch, useBatch } from "../../context/BatchContext";
import { saveBatch } from "@/utils/batchStore";
import { showAlert } from "@/utils/alerts";
import { getCollectorProfileError, normalizeCollectorProfile } from '@/utils/collectorProfile';
import { loadCollectorProfile, saveCollectorProfile } from '@/utils/collectorPreferences';

const FORM_FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif';

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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [initialLocationCountry] = useState(batchData?.locationCountry);

  useEffect(() => {
    let active = true;
    loadCollectorProfile().then((profile) => {
      if (!active || !profile) return;
      setCollectorName((current) => current || profile.collectorName);
      setCollectorEmail((current) => current || profile.collectorEmail);
      setOrganization((current) => current || profile.organization);
      // Keep an in-progress batch's country/state together when returning here.
      if (!initialLocationCountry) {
        setCountry(profile.locationCountry);
        setState(profile.locationState);
      }
    }).catch(() => {
      if (active) showAlert('Unable to load saved details', 'Please enter your details again.');
    }).finally(() => {
      if (active) setLoadingProfile(false);
    });
    return () => { active = false; };
    // The initial value is stable; later batch changes must not replace edits.
  }, [initialLocationCountry]);

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

  const profile = normalizeCollectorProfile({ collectorName, collectorEmail, organization,
    locationCountry: country, locationState: state });
  const isValid = !getCollectorProfileError(profile) && !!country && stateOptions.includes(state ?? '');
  const busy = loadingProfile || savingProfile;

  const handleContinue = async () => {
    if (busy) return;
    const error = getCollectorProfileError(profile);
    if (error || !isValid) {
      showAlert('Complete your details', error || 'Please select a country and state.');
      return;
    }

    setSavingProfile(true);
    try {
      await saveCollectorProfile(profile);
    } catch {
      showAlert('Unable to save your details', 'Your details could not be remembered on this device. Please try again.');
      return;
    } finally {
      setSavingProfile(false);
    }

    const baseBatch: BatchData = batchData ?? createNewBatch();

    const nextBatch: BatchData = {
      ...baseBatch,
      ...profile,
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
      <Text style={styles.label}>Collector / team name</Text>
      <TextInput
        accessibilityLabel="Collector or team name"
        placeholder="Person or team collecting the images"
        placeholderTextColor="#666"
        value={collectorName}
        onChangeText={setCollectorName}
        autoComplete="name"
        autoCapitalize="words"
        style={styles.input}
        editable={!busy}
      />

      <Text style={styles.label}>Email address</Text>
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
        editable={!busy}
      />

      <Text style={styles.label}>Organization</Text>
      <TextInput
        accessibilityLabel="Organization"
        placeholder="Organization name"
        placeholderTextColor="#666"
        value={organization}
        onChangeText={setOrganization}
        autoCapitalize="words"
        style={styles.input}
        editable={!busy}
      />

      <Text style={styles.label}>Country</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={country}
          accessibilityLabel="Country"
          enabled={!busy}
          onValueChange={(value) => {
            setCountry(value);
            setState(null);
          }}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Select country" value={null as any} fontFamily={FORM_FONT} style={styles.pickerItem} />
          {COUNTRY_OPTIONS.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} fontFamily={FORM_FONT} style={styles.pickerItem} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>State</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={state}
          accessibilityLabel="State"
          onValueChange={setState}
          enabled={!!country && !busy}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label={country ? "Select state" : "Select country first"} value={null as any} fontFamily={FORM_FONT} style={styles.pickerItem} />
          {stateOptions.map((option) => (
            <Picker.Item key={option} label={option} value={option} fontFamily={FORM_FONT} style={styles.pickerItem} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.button, (!isValid || busy) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!isValid || busy}
      >
        <Text style={styles.buttonText}>{savingProfile ? 'Saving…' : 'Continue'}</Text>
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
    fontSize: 20,
    color: "#fff",
    marginBottom: 8,
    marginTop: 12,
    fontWeight: "600",
    fontFamily: FORM_FONT,
  },
  pickerBox: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 0,
    marginBottom: 12,
    overflow: "hidden",
  },
  input: {
    backgroundColor: '#f0f0f0',
    color: '#000',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    fontSize: 16,
    fontFamily: FORM_FONT,
    marginBottom: 12,
  },
  picker: {
    color: "#000",
    backgroundColor: "#f0f0f0",
    fontSize: 16,
    fontFamily: FORM_FONT,
    height: 60,
    borderRadius: 8,
  },
  pickerItem: {
    fontFamily: FORM_FONT,
    fontSize: 16,
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
    fontFamily: FORM_FONT,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
