import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import type { StoredBatch } from '@/types';
import { showAlert } from '@/utils/alerts';
import { createBatchArchive } from '@/utils/exportBatch.web';

const lightingOptions = require('@/assets/data/lighting.json') as { id: number; name: string }[];

export function BatchDownloadButton({ batch }: { batch: StoredBatch }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const bytes = await createBatchArchive(batch, lightingOptions);
      const uri = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = uri;
      link.download = `${(batch.name || 'batch').replace(/[\\/:*?"<>|]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(uri), 60000);
    } catch (error) {
      showAlert('Download failed', error instanceof Error ? error.message : 'The batch could not be exported.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Download ${batch.name}`} onPress={download} disabled={busy} style={{ padding: 10 }}>
      {busy ? <ActivityIndicator /> : <Ionicons name="download-outline" size={24} color="#4CAF50" />}
    </TouchableOpacity>
  );
}
