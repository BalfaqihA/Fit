import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { type Palette, RADIUS } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';

type FollowButtonProps = {
  userId: string;
  size?: 'sm' | 'md';
};

export function FollowButton({ userId, size = 'md' }: FollowButtonProps) {
  const { COLORS } = useTheme();
  const { isFollowing, toggleFollow } = useCommunity();
  const following = isFollowing(userId);
  const styles = useMemo(() => makeStyles(COLORS, size), [COLORS, size]);

  return (
    <Pressable
      onPress={() => toggleFollow(userId)}
      style={({ pressed }) => [
        styles.btn,
        following ? styles.btnFollowing : styles.btnFollow,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.label, following ? styles.labelFollowing : styles.labelFollow]}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}

const makeStyles = (COLORS: Palette, size: 'sm' | 'md') =>
  StyleSheet.create({
    btn: {
      borderRadius: RADIUS.pill,
      paddingHorizontal: size === 'sm' ? 14 : 20,
      paddingVertical: size === 'sm' ? 6 : 9,
      borderWidth: 1.5,
    },
    btnFollow: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    btnFollowing: { backgroundColor: 'transparent', borderColor: COLORS.border },
    label: {
      fontSize: size === 'sm' ? 12 : 13,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    labelFollow: { color: '#FFFFFF' },
    labelFollowing: { color: COLORS.text },
  });
