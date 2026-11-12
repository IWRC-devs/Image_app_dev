import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { showAlert } from '@/utils/alerts';
import { connectSavedBatchFolder } from '@/utils/batchStore';

export function BatchFolderButton({ onConnected }: { onConnected: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (Platform.OS !== 'android') return null;
  const connect = async () => {
    setBusy(true);
    try {
      await connectSavedBatchFolder();
      await onConnected();
    } catch {
      showAlert('Unable to open folder', 'Please select the IWRC folder or the older folder containing your batches.');
    } finally { setBusy(false); }
  };
  return <TouchableOpacity style={styles.button} accessibilityRole="button" disabled={busy}
    accessibilityLabel="Open saved batch folder" onPress={connect}>
    <Ionicons name="folder-open-outline" color="#fff" size={22} />
    <ThemedText style={styles.label}>{busy ? 'Opening…' : 'Open saved batch folder'}</ThemedText>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 12, borderRadius: 8, backgroundColor: '#2e7d32',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
