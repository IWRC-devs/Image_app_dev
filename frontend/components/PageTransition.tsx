import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_DISTANCE = Math.min(SCREEN_WIDTH * 0.35, 140);
const DURATION = 280;

/**
 * Wraps a screen's content so it slides in from the right and fades in each
 * time the screen gains focus, giving the imaging wizard a directional
 * page-change feel even though the flow is built on a tab navigator (which
 * has no built-in scene transition).
 */
export function PageTransition({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const isFocused = useIsFocused();
  const translateX = useSharedValue(SLIDE_DISTANCE);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isFocused) return;
    translateX.value = SLIDE_DISTANCE;
    opacity.value = 0;
    translateX.value = withTiming(0, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
  }, [isFocused, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.flex, animatedStyle, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
