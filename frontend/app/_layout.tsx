import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from "@react-native-community/netinfo";
import { syncPendingBatches } from "@/utils/syncService";
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect } from 'react';
import { UserProvider } from "@/app/context/UserContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...Ionicons.font,
  });

  useEffect(() => {
    let isSyncing = false;
    const startSync = async () => {
      if (isSyncing) return;
      isSyncing = true;
      await syncPendingBatches();
      isSyncing = false;
    };

    startSync();

    // Watch for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) startSync();
    });

    return () => unsubscribe();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <UserProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          {/* Root */}
          <Stack.Screen
            name="index"
            options={{ headerShown: false, title: "IWRC Home" }}
          />
          {/* Auth group (correct path!) */}
          <Stack.Screen
            name="screens/auth/login"
            options={{ headerShown: false, title: "Login" }}
          />
          <Stack.Screen
            name="screens/auth/register"
            options={{ headerShown: false, title: "Register" }}
          />
          <Stack.Screen
            name="screens/auth/forgot"
            options={{ headerShown: false, title: "Forgot Password" }}
          />
          {/* Root-level screens */}
          <Stack.Screen
            name="reset"
            options={{ headerShown: false }} />
          <Stack.Screen
            name="verify"
            options={{ headerShown: false }} />
          <Stack.Screen
            name="screens/imaging"
            options={{ headerShown: false }}
          />
        </Stack>
      </ThemeProvider>
    </UserProvider>
  );
}
