import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PostVideo } from '@/components/post-video';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/format';

export type PostCardProps = {
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle?: string;
  authorAvatarUrl: string | null;
  caption: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  mediaType?: 'image' | 'video';
  createdAtMs: number;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  isOwn: boolean;
  isVisible?: boolean;
  onLike: () => void;
  onComment: () => void;
  onPressAuthor: () => void;
  onOpen?: () => void;
  onPressMenu?: () => void;
};

export function PostCard({
  authorName,
  authorHandle,
  authorAvatarUrl,
  caption,
  imageUrl,
  videoUrl,
  mediaType,
  createdAtMs,
  liked,
  likeCount,
  commentCount,
  isVisible,
  onLike,
  onComment,
  onPressAuthor,
  onPressMenu,
}: PostCardProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const subtitle = authorHandle
    ? `@${authorHandle} · ${relativeTime(createdAtMs)}`
    : relativeTime(createdAtMs);

  // Coalesce rapid taps so a flurry hits the network once, not once per tap.
  const lastLikeAt = useRef(0);
  const handleLike = useCallback(() => {
    const now = Date.now();
    if (now - lastLikeAt.current < 300) return;
    lastLikeAt.current = now;
    onLike();
  }, [onLike]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={onPressAuthor} style={styles.headerLeft} hitSlop={6}>
          {authorAvatarUrl ? (
            <Image source={{ uri: authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{authorName}</Text>
            <Text style={styles.time}>{subtitle}</Text>
          </View>
        </Pressable>
        {onPressMenu && (
          <Pressable hitSlop={8} onPress={onPressMenu}>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {!!caption && <Text style={styles.caption}>{caption}</Text>}

      {mediaType === 'video' && videoUrl ? (
        <PostVideo
          uri={videoUrl}
          shouldPlay={!!isVisible}
          style={styles.image}
        />
      ) : (
        imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        )
      )}

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={handleLike} hitSlop={6}>
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
