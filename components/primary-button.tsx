import React, { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
};

export function PrimaryButton({ label, onPress, disabled, icon }: Props) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[styles.button, disabled && styles.disabled, animatedStyle]}
      >
        <Text style={styles.label}>{label}</Text>
        {icon}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    button: {
      height: 56,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    disabled: {
      opacity: 0.4,
    },
    label: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
  });
