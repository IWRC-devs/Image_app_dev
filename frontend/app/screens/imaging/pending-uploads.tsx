import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { getSavedBatches, deleteBatch } from "@/utils/batchStore";
import { API_BASE_URL } from "@/constants/Config";
import { useFocusEffect } from "expo-router";

export default function PendingUploadsScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPendingBatches();
    }, [])
  );

  const fetchPendingBatches = async () => {
    setLoading(true);
    const saved = await getSavedBatches();
    setBatches(saved.filter(b => !b.synced));
    setLoading(false);
  };

  /*useEffect(() => {
    fetchPendingBatches();
  }, []);*/

  const handleUpload = async (batch: any) => {
    Alert.alert("Uploading", `Uploading batch: ${batch.name}`);

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
        headers: { Accept: "application/json" },
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Uploaded", `Batch ${batch.name} uploaded successfully.`);
        await deleteBatch(batch.id);
        fetchPendingBatches();
      } else {
        Alert.alert("Upload failed", result.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed", "Network or server error");
    }
  };

  const handleDelete = async (batch: any) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this saved batch?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteBatch(batch.id);
          fetchPendingBatches();
        },
      },
    ]);
  };

  if (loading) return <ThemedText>Loading saved batches...</ThemedText>;
  if (batches.length === 0) return <ThemedText>No pending uploads.</ThemedText>;

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <ThemedText style={styles.heading}>Pending Uploads</ThemedText>

        {batches.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.batchName}>{batch.name}</ThemedText>
              <ThemedText style={styles.batchDetails}>
                {batch.images.length} images • Saved on {new Date(batch.savedAt).toLocaleString()}
              </ThemedText>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleUpload(batch)} style={styles.iconButton}>
                <Ionicons name="cloud-upload" size={22} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(batch)} style={styles.iconButton}>
                <Ionicons name="trash" size={22} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  batchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  batchName: { fontWeight: "bold", fontSize: 16 },
  batchDetails: { color: "#aaa", fontSize: 12 },
  actions: { flexDirection: "row", marginLeft: 10 },
  iconButton: { marginHorizontal: 6 },
});
