import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ExtraMetadataRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/screens/imaging/parameters");
  }, [router]);

  return null;
}
