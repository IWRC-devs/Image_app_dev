import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/utils/alerts';
import { BatchDownloadButton } from '@/components/BatchDownloadButton';
import { BatchUploadButton } from '@/components/BatchUploadButton';

import { PageTransition } from '@/components/PageTransition';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StoredBatch } from '@/types';
import { deleteBatch, getSavedBatches } from '@/utils/batchStore';
import { useBatch } from '@/app/context/BatchContext';
import { openSavedBatch } from '@/utils/savedBatchEditing';

export default function SavedBatchesScreen() {
  const router = useRouter();
  const { setBatchData } = useBatch();
  const [batches, setBatches] = useState<StoredBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await getSavedBatches());
    } catch (error) {
      console.error('Unable to read saved batches:', error);
      showAlert('Unable to load', 'The batches stored on this device could not be read.');
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
    showAlert(
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

  const handleOpen = (batch: StoredBatch) => {
    try {
      setBatchData(openSavedBatch(batch));
      router.push({ pathname: '/screens/imaging/saved-batch', params: { batchId: batch.id! } });
    } catch (error) {
      showAlert('Unable to open batch', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <PageTransition>
    <ThemedView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.heading}>Saved Batches</ThemedText>
        <ThemedText style={styles.privacyNote}>
          {Platform.OS === 'web'
            ? "Saved in this browser on this device. Clearing this site's browser data removes local batches. Exported or uploaded copies are kept separately."
            : 'Saved to the "IWRC imaging" folder you selected on this device. Nothing is uploaded to a server or cloud account.'}
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
              <View style={styles.batchRow}>
              <TouchableOpacity style={styles.batchInfo} accessibilityRole="button"
                accessibilityLabel={`Open ${batch.name} to annotate`} onPress={() => handleOpen(batch)}>
                <ThemedText style={styles.batchName}>{batch.name}</ThemedText>
                <ThemedText style={styles.batchDetails}>
                  {batch.images.length} {batch.images.length === 1 ? 'image' : 'images'} · {new Date(batch.savedAt).toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.location}>
                  {[batch.locationState, batch.locationCountry].filter(Boolean).join(', ')}
                </ThemedText>
              </TouchableOpacity>

              <View style={styles.actions}>
                <BatchDownloadButton batch={batch} />
                <TouchableOpacity
                  accessibilityLabel={`Delete ${batch.name}`}
                  onPress={() => handleDelete(batch)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={24} color="#ff5a5f" />
                </TouchableOpacity>
              </View>
              </View>
              <TouchableOpacity style={styles.openButton} accessibilityRole="button"
                accessibilityLabel={`Open and annotate ${batch.name}`} onPress={() => handleOpen(batch)}>
                <Ionicons name="folder-open-outline" size={22} color="#fff" />
                <ThemedText style={styles.openButtonText}>Open & annotate</ThemedText>
              </TouchableOpacity>
              <BatchUploadButton batch={batch} />
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  batchRow: { flexDirection: 'row', alignItems: 'center' },
  openButton: { marginTop: 14, minHeight: 48, borderRadius: 8, backgroundColor: '#2e7d32',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  openButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  batchInfo: { flex: 1 },
  batchName: { fontWeight: '700', fontSize: 16, marginBottom: 5 },
  batchDetails: { color: '#aaa', fontSize: 13 },
  location: { color: '#aaa', fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', marginLeft: 8 },
  iconButton: { padding: 10 },
});
