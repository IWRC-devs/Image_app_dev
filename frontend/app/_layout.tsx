import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Button } from "react-native-paper";
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...Ionicons.font, // load all Ionicons glyphs
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "IWRC Home" }}
        />
        <Stack.Screen
          name="screens/auth/login"
          options={{ headerShown: false, title: "Login" }}
        />
        <Stack.Screen
          name="screens/auth/register"
          options={{ headerShown: false, title: "Register" }}
        />
        <Stack.Screen
          name="screens/imaging"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
