import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { PageTransition } from '@/components/PageTransition';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StoredBatch } from '@/types';
import { deleteBatch, getSavedBatches } from '@/utils/batchStore';

export default function SavedBatchesScreen() {
  const [batches, setBatches] = useState<StoredBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await getSavedBatches());
    } catch (error) {
      console.error('Unable to read saved batches:', error);
      Alert.alert('Unable to load', 'The batches stored on this device could not be read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBatches();
    }, [loadBatches])
  );

  const handleDelete = (batch: StoredBatch) => {
    Alert.alert(
      'Delete local batch?',
      `This permanently removes ${batch.images.length} images and the batch details from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!batch.id) return;
            await deleteBatch(batch.id);
            await loadBatches();
          },
        },
      ]
    );
  };

  return (
    <PageTransition>
    <ThemedView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.heading}>Saved Batches</ThemedText>
        <ThemedText style={styles.privacyNote}>
          Saved to the &quot;IWRC imaging&quot; folder you selected on this device. Nothing is
          uploaded to a server or cloud account.
        </ThemedText>

        {loading ? (
          <ThemedText style={styles.emptyText}>Loading saved batches…</ThemedText>
        ) : batches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={42} color="#9aa0a6" />
            <ThemedText style={styles.emptyText}>No batches saved on this device.</ThemedText>
          </View>
        ) : (
          batches.map((batch) => (
            <View key={batch.id ?? batch.name} style={styles.batchCard}>
              <View style={styles.batchInfo}>
                <ThemedText style={styles.batchName}>{batch.name}</ThemedText>
                <ThemedText style={styles.batchDetails}>
                  {batch.images.length} images · {new Date(batch.savedAt).toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.location}>
                  {[batch.locationState, batch.locationCountry].filter(Boolean).join(', ')}
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  accessibilityLabel={`Delete ${batch.name}`}
                  onPress={() => handleDelete(batch)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={24} color="#ff5a5f" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  privacyNote: { color: '#9aa0a6', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { color: '#9aa0a6', textAlign: 'center' },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  batchInfo: { flex: 1 },
  batchName: { fontWeight: '700', fontSize: 16, marginBottom: 5 },
  batchDetails: { color: '#aaa', fontSize: 13 },
  location: { color: '#aaa', fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', marginLeft: 8 },
  iconButton: { padding: 10 },
});
