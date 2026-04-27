import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  onPress?: () => void;
};

export function BackButton({ onPress }: Props) {
  const { COLORS } = useTheme();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 220 });
    opacity.value = withTiming(0.9, { duration: 80 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 120 });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={8}
    >
      <Animated.View style={[styles.button, animatedStyle]}>
        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
