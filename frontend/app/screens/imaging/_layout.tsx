import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BatchProvider } from '@/app/context/BatchContext';
import { UserProvider } from "@/app/context/UserContext";

export default function ImagingLayout() {
  const colorScheme = useColorScheme();

  return (
    <UserProvider>
      <BatchProvider>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#4CAF50',
            headerTitle: 'IWRC Imaging',
            headerTitleAlign: 'center',
            headerShown: true,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarStyle: Platform.select({
              ios: {
                // Use a transparent background on iOS to show the blur effect
                position: 'absolute',
              },
              default: {},
            }),
          }}
        >
          <Tabs.Screen
            name="parameters"
            options={{
              title: 'Parameters',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="options-outline" color={color} />
            }} />
          <Tabs.Screen
            name="image-option"
            options={{
              title: 'Image Selection',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="image-outline" color={color} />
            }} />
          <Tabs.Screen
            name="image-selection"
            options={{
              title: 'Upload',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="cloud-upload-outline" color={color} />,
              href: null, // This hides the tab from the tab bar
              /*tabBarStyle: {
                display: 'none', // Hide the tab bar for this specific screen
              },*/
            }} />
          <Tabs.Screen
            name="capture-image"
            options={{
              title: 'Capture',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="camera" color={color} />,
              href: null, // This hides the tab from the tab bar
              /*tabBarStyle: {
                display: 'none', // Hide the tab bar for this specific screen
              },*/
            }} />
          <Tabs.Screen
            name="review-summary"
            options={{
              title: 'Review & Upload',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="cloud" color={color} />,
              href: null,
            }} />
          <Tabs.Screen
            name="pending-uploads"
            options={{
              title: 'Pending Uploads',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="cloud-upload" color={color} />,
            }} />
        </Tabs>
      </BatchProvider>
    </UserProvider>
  );
}
