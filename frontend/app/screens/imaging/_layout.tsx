import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Ionicons } from '@expo/vector-icons';
import { BatchProvider } from '@/app/context/BatchContext';

export default function ImagingLayout() {
  return (
    <BatchProvider>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
            tabBarLabelStyle: {
              opacity: 0.75,
            },
            headerTitle: 'IWRC Imaging',
            headerTitleAlign: 'center',
            headerShown: true,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarStyle: Platform.select({
              ios: {
                position: 'absolute',
              },
              default: {},
            }),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="extra-metadata"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="location"
            options={{
              title: 'Location',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="location-outline" color={color} />
            }} />
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
              title: 'Select Images',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="images-outline" color={color} />,
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
              title: 'Review & Save',
              tabBarIcon: ({ color }) => <Ionicons size={28} name="save-outline" color={color} />,
              href: null,
            }} />
          <Tabs.Screen
            name="pending-uploads"
            options={{
              href: null,
            }}
          />
        </Tabs>
    </BatchProvider>
  );
}
