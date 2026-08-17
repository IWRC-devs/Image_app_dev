import { Image } from 'expo-image';
import { ImageBackground, Platform, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/plant-cover-01.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <ImageBackground style={styles.overlay} />

      <ThemedText style={styles.title}>IWRC Imaging</ThemedText>

      <TouchableOpacity style={styles.button} onPress={() => router.replace("/screens/imaging") }>
        <ThemedText style={styles.buttonText}>Continue</ThemedText>
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
    // for Android the safe-area-context doesn't include status bar height, so add fallback:
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,            // full-screen overlay
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 40,
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '70%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
