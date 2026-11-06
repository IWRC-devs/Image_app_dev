import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { StoredBatch } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { showAlert } from '@/utils/alerts';
import { localUploadOrigin, uploadLocalBatch, type UploadPhase } from '@/utils/localUpload.web';

const lighting = require('@/assets/data/lighting.json') as { id: number; name: string }[];

export function BatchUploadButton({ batch }: { batch: StoredBatch }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [verified, setVerified] = useState(false);
  useEffect(() => { setOrigin(localUploadOrigin(window.location.href)); }, []);
  if (!origin) return null;
  const upload = async () => {
    setVerified(false);
    try {
      await uploadLocalBatch(batch, origin, setPhase, fetch, lighting);
      setVerified(true);
      showAlert('Upload verified', 'The stored ZIP checksum matches your batch. Your local photos and metadata are retained.');
    } catch (error) {
      showAlert('Upload not completed', error instanceof Error ? error.message : 'Your local batch is unchanged. Please retry.');
    } finally { setPhase(null); }
  };
  return <View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Upload ${batch.name} to private storage`}
      disabled={phase !== null} onPress={upload} style={styles.button}>
      {phase ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={22} color="#fff" />}
      <ThemedText style={styles.text}>{phase === 'preparing' ? 'Preparing batch…'
        : phase === 'uploading' ? 'Uploading & verifying…' : 'Upload batch'}</ThemedText>
    </TouchableOpacity>
    {verified && <ThemedText style={styles.note}>Last upload verified. Upload again after making annotation changes.</ThemedText>}
  </View>;
}

const styles = StyleSheet.create({
  button: { marginTop: 10, minHeight: 48, borderRadius: 8, backgroundColor: '#245a78',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { color: '#b7bec4', fontSize: 13, marginTop: 8 },
});
