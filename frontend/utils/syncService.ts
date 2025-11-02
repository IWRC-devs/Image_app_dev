import { getPendingBatches, markBatchSynced } from "./batchStore";
import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";
import { API_BASE_URL } from "@/constants/Config";

export async function syncPendingBatches() {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    console.log("Offline: sync postponed.");
    return;
  }

  try {
    const pending = await getPendingBatches();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} batches...`);

    for (const batch of pending) {
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
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        await markBatchSynced(batch.name);
        console.log(`✅ Synced batch: ${batch.name}`);
      } else {
        console.error(`❌ Failed to sync batch: ${batch.name}`);
      }
    }

    Alert.alert("Sync Complete", "All pending batches uploaded successfully.");
  } catch (err) {
    console.error("Sync failed:", err);
  }
}
