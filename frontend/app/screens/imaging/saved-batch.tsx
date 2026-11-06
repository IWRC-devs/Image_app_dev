import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useBatch } from '@/app/context/BatchContext';
import { AnnotationImageCard } from '@/components/AnnotationImageCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getSavedBatches } from '@/utils/batchStore';
import { openSavedBatch } from '@/utils/savedBatchEditing';

export default function SavedBatchScreen() {
  const router = useRouter();
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { batchData, setBatchData } = useBatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const targetId = batchId || (batchData?.editingSavedBatch ? batchData.id : null);

  // Reload on entry and after Done, so the view always reflects persisted annotations.
  // The batchId in the URL also makes reopening after a page refresh possible.
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (!targetId) throw new Error('Please choose a batch from Saved Batches.');
        const batches = await getSavedBatches();
        const saved = batches.find(batch => batch.id === targetId);
        if (!saved) throw new Error('This batch is no longer saved on this device.');
        if (active) setBatchData(openSavedBatch(saved));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'The saved batch could not be opened.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [targetId, setBatchData]));

  const batch = batchData?.editingSavedBatch && batchData.id === targetId ? batchData : null;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton}
          onPress={() => router.replace('/screens/imaging/pending-uploads')}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <ThemedText style={styles.backText}>Saved Batches</ThemedText>
        </TouchableOpacity>
        {loading ? <ActivityIndicator accessibilityLabel="Opening saved batch" size="large" color="#4caf50" />
          : error || !batch ? <ThemedText>{error || 'Please reopen this batch.'}</ThemedText> : <>
            <ThemedText style={styles.title}>{batch.name}</ThemedText>
            <ThemedText style={styles.details}>
              {batch.images.length} {batch.images.length === 1 ? 'image' : 'images'} · {batch.botanicalName || 'Weed of interest'}
            </ThemedText>
            <ThemedText style={styles.details}>
              {[batch.locationState, batch.locationCountry].filter(Boolean).join(', ')}
            </ThemedText>
            <ThemedText style={styles.note}>Choose an image to annotate. Done saves your changes to this batch.</ThemedText>
            <View style={styles.grid}>
              {batch.images.map((image, index) => <AnnotationImageCard key={image.id} image={image}
                index={index} weedName={batch.botanicalName} onAnnotate={() => router.push({
                  pathname: '/screens/imaging/annotation-editor', params: { imageId: image.id },
                })} />)}
            </View>
          </>}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginBottom: 12 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 21, fontWeight: '700', marginBottom: 8 },
  details: { color: '#b7bec4', fontSize: 14, marginBottom: 4 },
  note: { color: '#b7bec4', fontSize: 14, marginTop: 8, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
