import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FollowButton } from '@/components/follow-button';
import { type Palette } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import type { SeedUser, UserProfile } from '@/types/community';

type UserListRowProps = {
  user: SeedUser | UserProfile;
  onPress?: () => void;
  showFollow?: boolean;
  isCurrentUser?: boolean;
  rightSlot?: React.ReactNode;
};

export function UserListRow({
  user,
  onPress,
  showFollow = true,
  isCurrentUser = false,
  rightSlot,
}: UserListRowProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      {user.avatarUri ? (
        <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={18} color={COLORS.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.handle}>@{user.handle}</Text>
      </View>
      {rightSlot
        ? rightSlot
        : showFollow && !isCurrentUser && <FollowButton userId={user.id} size="sm" />}
    </Pressable>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.border,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    handle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  });
