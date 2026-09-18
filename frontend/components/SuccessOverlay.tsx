import React, { useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';

export function SuccessOverlay({
  visible,
  title,
  message,
  onDone,
}: {
  visible: boolean;
  title: string;
  message: string;
  onDone: () => void;
}) {
  const scale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    scale.value = 0;
    checkOpacity.value = 0;
    textOpacity.value = 0;

    checkOpacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 8, stiffness: 140 });
    textOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
  }, [visible, scale, checkOpacity, textOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.circle, circleStyle]}>
          <Ionicons name="checkmark" size={64} color="#fff" />
        </Animated.View>
        <Animated.View style={textStyle}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.doneButtonWrapper, textStyle]}>
          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
  },
  doneButtonWrapper: {
    marginTop: 32,
    width: '100%',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
