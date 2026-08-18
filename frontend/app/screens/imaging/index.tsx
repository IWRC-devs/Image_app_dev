import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ImagingIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/screens/imaging/location");
  }, [router]);

  return null;
}
