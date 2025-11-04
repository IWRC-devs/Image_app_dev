import { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getSavedBatches, deleteBatch } from '@/utils/batchStore';
import { API_BASE_URL } from '@/constants/Config';

export default function PendingUploadsScreen() {
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const saved = await getSavedBatches();
    setBatches(saved);
  };

  const handleUpload = async (batch: any) => {
    try {
      const formData = new FormData();
      formData.append("name", batch.name);
      formData.append("affiliation_id", String(batch.affiliationId ?? ""));
      formData.append("size_class", batch.sizeClass ?? "");
      formData.append("flower_answer", batch.flowerAnswer ?? "");
      formData.append("crop_answer", batch.cropAnswer ?? "");
      formData.append("ground_cover_percent_id", String(batch.groundCoverPercentId ?? ""));

      batch.images.forEach((img: any, idx: number) => {
        formData.append("images", {
          uri: img.uri,
          name: `image-${idx}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      const response = await fetch(`${API_BASE_URL}/api/upload-batch`, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" },
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Uploaded", `Batch ${batch.name} uploaded successfully.`);
        await deleteBatch(batch.id);
        loadBatches();
      } else {
        Alert.alert("Upload failed", result.error || "Server error");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Upload failed due to server or network issue.");
    }
  };

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>
        Pending Uploads
      </ThemedText>

      {batches.length === 0 ? (
        <ThemedText>No pending uploads.</ThemedText>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.batchItem}>
              <ThemedText>{item.name}</ThemedText>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: '#4CAF50' }]}
                  onPress={() => handleUpload(item)}
                >
                  <ThemedText style={styles.btnText}>Upload</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: '#f44336' }]}
                  onPress={() => deleteBatch(item.id).then(loadBatches)}
                >
                  <ThemedText style={styles.btnText}>Delete</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  batchItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  btn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
