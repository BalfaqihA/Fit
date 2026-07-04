import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS } from '@/constants/design';
import { useCommunityNotifications } from '@/hooks/use-community-notifications';
import { useTheme } from '@/hooks/use-theme';
import type { NotificationType } from '@/lib/community-notifications';
import { relativeTime } from '@/lib/format';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  new_post: 'image',
};

export default function NotificationsScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { items, loading, markAllRead } = useCommunityNotifications();

  // Mark everything read shortly after the screen opens (gives the unread
  // highlight a beat to be visible first).
  useEffect(() => {
    const t = setTimeout(() => {
      markAllRead();
    }, 600);
    return () => clearTimeout(t);
  }, [markAllRead]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptySub}>
            Likes, comments, follows, and new posts from people you follow will
            show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {items.map((n) => {
            const text =
              n.type === 'like'
                ? 'liked your post'
                : n.type === 'comment'
                ? `commented: "${n.commentText ?? ''}"`
                : n.type === 'follow'
                ? 'started following you'
                : 'shared a new post';
            const badgeColor =
              n.type === 'like'
                ? COLORS.accent
                : n.type === 'comment'
                ? COLORS.primary
                : n.type === 'new_post'
                ? COLORS.primary
                : COLORS.success;
            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  if (n.postId) {
                    router.push(`/community/post/${n.postId}` as never);
                  } else if (n.actorId) {
                    router.push(`/community/profile/${n.actorId}` as never);
                  }
                }}
                style={({ pressed }) => [
                  styles.row,
                  !n.read && { backgroundColor: COLORS.primarySoft },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.avatarWrap}>
                  {n.actorAvatarUrl ? (
                    <Image
                      source={{ uri: n.actorAvatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={18} color={COLORS.primary} />
                    </View>
                  )}
                  <View
                    style={[styles.iconBadge, { backgroundColor: badgeColor }]}
                  >
                    <Ionicons name={ICON[n.type]} size={11} color="#FFFFFF" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>
                    <Text style={styles.actor}>{n.actorName}</Text> {text}
                  </Text>
                  <Text style={styles.time}>
                    {relativeTime(n.createdAtMs)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 6 },
    emptySub: {
      fontSize: 13,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 260,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: RADIUS.md,
      marginHorizontal: 8,
      alignItems: 'center',
    },
    avatarWrap: { width: 44, height: 44 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    iconBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: COLORS.bg,
    },
    text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    actor: { fontWeight: '800' },
    time: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  });
