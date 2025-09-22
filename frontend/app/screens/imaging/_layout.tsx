import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

export default function ImagingLayout() {
  const colorScheme = useColorScheme();

  return (

    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        headerTitle: 'IWRC Imaging',
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
        name="index"
        options={{
          title: 'Affiliation',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }} />
      <Tabs.Screen
        name="parameters"
        options={{
          title: 'Parameters',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="slider.horizontal.3" color={color} />
        }} />
      <Tabs.Screen
        name="extra-metadata"
        options={{
          title: 'Metadata',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.magnifyingglass" color={color} />
        }} />
      <Tabs.Screen
        name="image-option"
        options={{
          title: 'Image Selection',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.on.rectangle" color={color} />
        }} />
      <Tabs.Screen
        name="image-selection"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="square.and.arrow.up" color={color}
          />,
          href: null, // This hides the tab from the tab bar
          /*tabBarStyle: {
            display: 'none', // Hide the tab bar for this specific screen
          },*/
        }} />
      <Tabs.Screen
        name="capture-image"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
          href: null, // This hides the tab from the tab bar
          /*tabBarStyle: {
            display: 'none', // Hide the tab bar for this specific screen
          },*/
        }} /> 
        <Tabs.Screen
        name="review-summary"
        options={{
          title: 'Review & Upload',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
          href: null, // This hides the tab from the tab bar
          /*tabBarStyle: {
            display: 'none', // Hide the tab bar for this specific screen
          },*/
        }} /> 

    </Tabs>
  );
}
