import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/format';
import type { AppNotification } from '@/types/community';

const ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  new_post: 'image',
  new_story: 'aperture',
};

export default function NotificationsScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { notifications, getUserById, markNotificationsRead } = useCommunity();

  useEffect(() => {
    const t = setTimeout(() => markNotificationsRead(), 400);
    return () => clearTimeout(t);
  }, [markNotificationsRead]);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    [notifications]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptySub}>
            Likes, comments, follows, and new posts or stories from people you
            follow will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {sorted.map((n) => {
            const actor = getUserById(n.actorId);
            const isOwnAction = n.actorId === 'me';
            const text =
              n.type === 'like'
                ? 'liked your post'
                : n.type === 'comment'
                ? `commented: "${n.commentText ?? ''}"`
                : n.type === 'follow'
                ? 'started following you'
                : n.type === 'new_post'
                ? isOwnAction
                  ? 'You shared a new post'
                  : 'shared a new post'
                : isOwnAction
                ? 'You added a new story'
                : 'added a new story';
            const badgeColor =
              n.type === 'like'
                ? COLORS.accent
                : n.type === 'comment'
                ? COLORS.primary
                : n.type === 'new_story'
                ? '#E0B400'
                : n.type === 'new_post'
                ? COLORS.primary
                : COLORS.success;
            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  if (n.type === 'new_story' && actor) {
                    router.push(`/community/story/${actor.id}` as never);
                  } else if (n.postId) {
                    router.push(`/community/post/${n.postId}` as never);
                  } else if (actor) {
                    router.push(`/community/profile/${actor.id}` as never);
                  }
                }}
                style={({ pressed }) => [
                  styles.row,
                  !n.read && { backgroundColor: COLORS.primarySoft },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.avatarWrap}>
                  {actor?.avatarUri ? (
                    <Image source={{ uri: actor.avatarUri }} style={styles.avatar} />
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
                    {!isOwnAction && (
                      <>
                        <Text style={styles.actor}>
                          {actor?.displayName ?? 'Someone'}
                        </Text>{' '}
                      </>
                    )}
                    {text}
                  </Text>
                  <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
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
