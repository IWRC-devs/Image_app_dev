import { Image } from 'expo-image';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { Button } from "react-native-paper";
import { API_BASE_URL } from '@/constants/Config';

export default function TabTwoScreen() {

  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [affiliations, setAffiliations] = useState<{ id: number; name: string }[]>([]);
  const [selectedAffiliation, setSelectedAffiliation] = useState<{ id: number; name: string } | null>(null);;
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/affiliations`)
      .then((response) => response.json())
      .then((data) => {
        setAffiliations(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching affiliations:', error);
        setLoading(false);
      });
  }, []);

  const onSelect = (itemId: number) => {
    const aff = affiliations.find(a => a.id === itemId) || null;
    setSelectedAffiliation(aff);
  };

  const onContinue = () => {
    const aff = affiliations.find(a => a.id === selectedAffiliation?.id);
    if (aff) {
      router.push({
        pathname: '/screens/parameters',
        params: { affiliationId: aff.id },
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.titleContainer, { backgroundColor }]}>
          <ThemedText type="title" style={styles.titleText}>
            Select Affiliation to get started
          </ThemedText>
        </ThemedView>

        <View style={styles.container}>

          <Picker
            selectedValue={selectedAffiliation ? selectedAffiliation.id : undefined}
            onValueChange={onSelect}
          >
            <Picker.Item label="Select an affiliation" value={undefined} />
            {affiliations.map((aff: any) => (
              <Picker.Item key={aff.id} label={aff.name} value={aff.id} />
            ))}
          </Picker>

          <ThemedText style={[styles.subTitleText, { marginBottom: 10, marginTop: 100 }]}>
            {selectedAffiliation ? `Selected Affiliation :\n ${selectedAffiliation.name}` : 'No Affiliations selected'}
          </ThemedText>

          {/* Show Continue button only if a selection is made */}
          {selectedAffiliation !== null && (
            <View style={styles.buttonContainer}>
              <Button mode="outlined"
            onPress={onContinue} 
            style={styles.button}>
              Continue
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  subTitleText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'normal',
    lineHeight: 36,
    marginBottom: 50
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  picker: {
    height: 150,
    width: '100%',
    color: '#1D3D47',
    borderRadius: 10,
  },
  buttonContainer: {
    marginTop: 24,
  },
  button: {
    marginTop: 30,
    color: '#000'
  },
});
