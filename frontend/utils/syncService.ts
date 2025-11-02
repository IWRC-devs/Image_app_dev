import NetInfo from "@react-native-community/netinfo";
import { getPendingBatches, markBatchSynced } from '@/utils/batchStore';
import { API_BASE_URL } from '@/constants/Config';

export const syncPendingBatches = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    console.log("Offline — skipping sync");
    return;
  }

  const pendingBatches = await getPendingBatches();
  if (pendingBatches.length === 0) {
    console.log("No pending batches to sync");
    return;
  }

  for (const batch of pendingBatches) {
    try {
      const formData = new FormData();
      formData.append("name", batch.name);
      formData.append("affiliation_id", String(batch.affiliationId ?? ""));
      formData.append("size_class", batch.sizeClass ?? "");
      formData.append("flower_answer", batch.flowerAnswer ?? "");
      formData.append("crop_answer", batch.cropAnswer ?? "");
      formData.append("ground_cover_percent_id", String(batch.groundCoverPercentId ?? ""));

      batch.images.forEach((img, idx) => {
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
        await markBatchSynced(batch.name);
        console.log(`✅ Synced batch: ${batch.name}`);
      } else {
        console.log(`❌ Failed to sync batch: ${batch.name}`, result);
      }
    } catch (err) {
      console.error(`Error syncing batch ${batch.name}:`, err);
    }
  }
};
