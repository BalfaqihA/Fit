import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/format';
import type { Post, SeedUser, UserProfile } from '@/types/community';

type PostCardProps = {
  post: Post;
  author: SeedUser | UserProfile;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onComment: () => void;
  onPressAuthor: () => void;
  onPressMenu?: () => void;
};

export function PostCard({
  post,
  author,
  liked,
  likeCount,
  commentCount,
  onLike,
  onComment,
  onPressAuthor,
  onPressMenu,
}: PostCardProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={onPressAuthor} style={styles.headerLeft} hitSlop={6}>
          {author.avatarUri ? (
            <Image source={{ uri: author.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{author.displayName}</Text>
            <Text style={styles.time}>
              @{author.handle} · {relativeTime(post.createdAt)}
            </Text>
          </View>
        </Pressable>
        {onPressMenu && (
          <Pressable hitSlop={8} onPress={onPressMenu}>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}

      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={styles.image} contentFit="cover" />
      )}

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onLike} hitSlop={6}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? COLORS.accent : COLORS.text}
          />
          <Text style={styles.actionText}>{likeCount}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onComment} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.text} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </Pressable>
        <Pressable style={styles.action} hitSlop={6}>
          <Ionicons name="paper-plane-outline" size={20} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={6}>
          <Ionicons name="bookmark-outline" size={20} color={COLORS.text} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 16,
      ...SHADOWS.card,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: COLORS.border,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    time: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    caption: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 12 },
    image: {
      width: '100%',
      height: 220,
      borderRadius: RADIUS.md,
      marginBottom: 12,
      backgroundColor: COLORS.border,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  });
