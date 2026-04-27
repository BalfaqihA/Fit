import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/format';
import type { Comment, SeedUser, UserProfile } from '@/types/community';

type CommentRowProps = {
  comment: Comment;
  author: SeedUser | UserProfile | undefined;
  isOwn: boolean;
  onPressAuthor?: () => void;
  onDelete?: () => void;
};

export function CommentRow({
  comment,
  author,
  isOwn,
  onPressAuthor,
  onDelete,
}: CommentRowProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={styles.row}>
      <Pressable onPress={onPressAuthor} hitSlop={4}>
        {author?.avatarUri ? (
          <Image source={{ uri: author.avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={14} color={COLORS.primary} />
          </View>
        )}
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={styles.bubble}>
          <Text style={styles.name}>{author?.displayName ?? 'Unknown'}</Text>
          <Text style={styles.text}>{comment.text}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.time}>{relativeTime(comment.createdAt)}</Text>
          {isOwn && onDelete && (
            <Pressable onPress={onDelete} hitSlop={4}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.border,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    bubble: {
      backgroundColor: COLORS.inputBg,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    name: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
    text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    meta: { flexDirection: 'row', gap: 12, marginTop: 4, marginLeft: 4 },
    time: { fontSize: 11, color: COLORS.muted },
    delete: { fontSize: 11, color: COLORS.accent, fontWeight: '700' },
  });
