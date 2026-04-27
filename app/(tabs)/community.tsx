import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PostCard } from '@/components/post-card';
import { StoryRing } from '@/components/story-ring';
import { type Palette, SHADOWS } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function CommunityTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const {
    getPostsForFeed,
    getStoriesGrouped,
    getCommentsForPost,
    getUserById,
    hasLiked,
    toggleLike,
    unreadNotificationCount,
  } = useCommunity();

  const feedPosts = getPostsForFeed();
  const storyGroups = getStoriesGrouped();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>See what friends are up to</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => router.push('/community/search' as never)}
            >
              <Ionicons name="search" size={20} color={COLORS.text} />
            </Pressable>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => router.push('/community/notifications' as never)}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
              {unreadNotificationCount > 0 && <View style={styles.badge} />}
            </Pressable>
            <Pressable
              style={styles.headerAvatarBtn}
              onPress={() => router.push(`/community/profile/${profile.id}` as never)}
            >
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.headerAvatarImage} />
              ) : (
                <Ionicons name="person" size={18} color={COLORS.primary} />
              )}
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          <Pressable
            style={styles.addStoryTile}
            onPress={() => router.push('/community/story-compose' as never)}
          >
            <View style={[styles.addStoryRing, { borderColor: COLORS.primary }]}>
              <View style={[styles.addStoryInner, { backgroundColor: COLORS.primarySoft }]}>
                <Ionicons name="add" size={26} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.addStoryLabel} numberOfLines={1}>
              Add Story
            </Text>
          </Pressable>
          {storyGroups.map((group) => {
            const isOwn = group.user.id === profile.id;
            return (
              <StoryRing
                key={group.user.id}
                name={isOwn ? 'Your Story' : group.user.displayName}
                avatarUri={group.user.avatarUri}
                own={isOwn}
                hasStory
                onPress={() => router.push(`/community/story/${group.user.id}` as never)}
              />
            );
          })}
        </ScrollView>

        {feedPosts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>
              Tap the + button below to share your first post.
            </Text>
          </View>
        )}

        {feedPosts.map((post) => {
          const author = getUserById(post.authorId);
          if (!author) return null;
          return (
            <PostCard
              key={post.id}
              post={post}
              author={author}
              liked={hasLiked(post.id)}
              likeCount={post.likeIds.length}
              commentCount={getCommentsForPost(post.id).length}
              onLike={() => toggleLike(post.id)}
              onComment={() => router.push(`/community/post/${post.id}` as never)}
              onPressAuthor={() => router.push(`/community/profile/${author.id}` as never)}
              onPressMenu={() => router.push(`/community/post/${post.id}` as never)}
            />
          );
        })}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/community/compose' as never)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingBottom: 120 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 14,
    },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    headerIcons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.card,
    },
    headerAvatarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: COLORS.primary,
    },
    headerAvatarImage: { width: '100%', height: '100%' },
    badge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.accent,
    },
    storiesRow: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 14,
    },
    addStoryTile: { alignItems: 'center', width: 72 },
    addStoryRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderStyle: 'dashed',
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addStoryInner: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addStoryLabel: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.text,
    },
    empty: {
      marginHorizontal: 20,
      marginTop: 40,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 4,
    },
    emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.button,
    },
  });
