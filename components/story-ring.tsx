import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type StoryRingProps = {
  name: string;
  avatarUri?: string;
  own?: boolean;
  hasStory?: boolean;
  seen?: boolean;
  onPress?: () => void;
};

export function StoryRing({
  name,
  avatarUri,
  own,
  hasStory,
  seen,
  onPress,
}: StoryRingProps) {
  const { COLORS } = useTheme();

  const ringColor = own
    ? COLORS.border
    : hasStory
    ? seen
      ? COLORS.border
      : COLORS.primary
    : COLORS.border;

  return (
    <Pressable onPress={onPress} style={styles.story}>
      <View
        style={[
          styles.ring,
          { borderColor: ringColor, borderWidth: hasStory && !seen ? 2.5 : 2 },
        ]}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View
            style={[styles.avatar, styles.avatarFallback, { backgroundColor: COLORS.primarySoft }]}
          >
            <Ionicons name="person" size={22} color={COLORS.primary} />
          </View>
        )}
        {own && (
          <View style={[styles.add, { backgroundColor: COLORS.primary, borderColor: COLORS.bg }]}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text
        style={[styles.name, { color: COLORS.text }]}
        numberOfLines={1}
      >
        {own ? 'Your Story' : name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  story: { alignItems: 'center', width: 72 },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 28 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  add: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  name: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
