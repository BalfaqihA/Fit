import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { usePosts } from '@/hooks/use-posts';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import {
  deletePost,
  likePost,
  reportPost,
  unlikePost,
  type FeedPost,
} from '@/lib/community';

export default function CommunityTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { getStoriesGrouped, unreadNotificationCount } = useCommunity();
  const {
    posts,
    loading,
    error,
    likedIds,
    loadMore,
    loadingMore,
    hasMore,
    retry,
  } = usePosts();

  const storyGroups = getStoriesGrouped();

  const handleLikeToggle = useCallback(
    async (post: FeedPost) => {
      try {
        if (likedIds.has(post.id)) {
          await unlikePost(post.id);
        } else {
          await likePost({ id: post.id, authorId: post.authorId });
        }
      } catch {
        // Error captured upstream; UI just stays in current state.
      }
    },
    [likedIds]
  );

  const handlePromptReport = useCallback((post: FeedPost) => {
    Alert.prompt(
      'Report this post',
      'Tell us briefly what is wrong.',
      async (reason) => {
        if (!reason) return;
        try {
          await reportPost(post.id, reason);
          Alert.alert('Thanks', 'Your report has been submitted.');
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Could not report.';
          Alert.alert('Error', msg);
        }
      },
      'plain-text',
      ''
    );
  }, []);

  const handleConfirmDelete = useCallback((post: FeedPost) => {
    Alert.alert('Delete post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
          } catch {
            Alert.alert('Error', 'Could not delete the post.');
          }
        },
      },
    ]);
  }, []);

  const handleOpenMenu = useCallback(
    (post: FeedPost) => {
      const isOwn = post.authorId === profile.id;
      if (isOwn) {
        Alert.alert('Post actions', undefined, [
          { text: 'Delete post', style: 'destructive', onPress: () => handleConfirmDelete(post) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Post actions', undefined, [
          { text: 'Report post', style: 'destructive', onPress: () => handlePromptReport(post) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [profile.id, handleConfirmDelete, handlePromptReport]
  );

  const renderHeader = () => (
    <View>
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
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.statePane}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.stateSub}>Loading feed...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.statePane}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.muted} />
          <Text style={styles.stateTitle}>Could not load feed</Text>
          <Text style={styles.stateSub}>Check your connection and try again.</Text>
          <Pressable style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.statePane}>
        <Text style={styles.stateTitle}>No posts yet</Text>
        <Text style={styles.stateSub}>Tap the + button to share your first post.</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading && !error) loadMore();
        }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PostCard
            postId={item.id}
            authorId={item.authorId}
            authorName={item.authorName}
            authorAvatarUrl={item.authorAvatarUrl}
            caption={item.caption}
            imageUrl={item.imageUrl}
            createdAtMs={item.createdAtMs}
            liked={likedIds.has(item.id)}
            likeCount={item.likeCount}
            commentCount={item.commentCount}
            isOwn={item.authorId === profile.id}
            onLike={() => handleLikeToggle(item)}
            onComment={() => router.push(`/community/post/${item.id}` as never)}
            onPressAuthor={() =>
              router.push(`/community/profile/${item.authorId}` as never)
            }
            onPressMenu={() => handleOpenMenu(item)}
          />
        )}
      />

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
    listContent: { paddingBottom: 120 },
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
    statePane: {
      marginHorizontal: 20,
      marginTop: 40,
      alignItems: 'center',
      gap: 8,
    },
    stateTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 6,
    },
    stateSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
    retryBtn: {
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: COLORS.primary,
    },
    retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    footer: { paddingVertical: 18, alignItems: 'center' },
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
