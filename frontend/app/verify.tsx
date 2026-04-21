import { View, Text, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function VerifyScreen() {
  const router = useRouter();
  const { success } = useLocalSearchParams();

  useEffect(() => {
    setTimeout(() => {
      router.replace("/screens/auth/login"); // go to login after message
    }, 2000);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {success === "true" ? (
        <Text style={{ fontSize: 18 }}>✅ Email verified successfully!</Text>
      ) : (
        <Text style={{ fontSize: 18 }}>❌ Verification failed</Text>
      )}
      <ActivityIndicator style={{ marginTop: 20 }} />
    </View>
  );
}