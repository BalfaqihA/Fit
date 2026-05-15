import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { FollowButton } from '@/components/follow-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { GOAL_META } from '@/constants/goals';
import { useAchievements } from '@/hooks/use-achievements';
import { useAuth } from '@/hooks/use-auth';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';
import { useUserById } from '@/hooks/use-user-by-id';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAchievement } from '@/lib/achievements';
import { relativeTime } from '@/lib/format';
import { levelFromXp } from '@/lib/gamification';

const COVER_FALLBACK =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80';

export default function ProfileView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { user: authUser } = useAuth();
  const {
    posts: allPosts,
    getPostsByUser,
    getCommentsByAuthor,
    getUserById,
    getFollowerCount,
    getFollowingCount,
  } = useCommunity();
  const { user, loading: userLoading, notFound } = useUserById(id);
  const isCurrentUser = !!user && user.id === profile.id;
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');
  const { unlocked } = useAchievements(
    isCurrentUser && authUser ? authUser.uid : undefined,
  );
  const totalXp = isCurrentUser ? profile.stats?.totalXp ?? 0 : 0;
  const { level } = levelFromXp(totalXp);
  const recentUnlocks = unlocked.slice(0, 5);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          {userLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.emptyTitle}>
              {notFound ? 'User not found' : 'Loading…'}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const userPosts = getPostsByUser(user.id);
  const userComments = getCommentsByAuthor(user.id);
  const followerCount = getFollowerCount(user.id);
  const followingCount = getFollowingCount(user.id);

  // Goals visibility: own profile uses the toggle; seeded users always show.
  const showGoals = isCurrentUser ? profile.goalsVisible : true;
  const goals = isCurrentUser ? profile.goals : ('goals' in user ? user.goals : []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.coverWrap}>
          <Image
            source={{ uri: user.coverUri || COVER_FALLBACK }}
            style={styles.cover}
            contentFit="cover"
          />
          <View style={styles.coverOverlayHeader}>
            <BackButton />
            <View style={{ flex: 1 }} />
            {isCurrentUser && (
              <Pressable
                style={styles.coverHeaderBtn}
                onPress={() => router.push('/community/profile-edit' as never)}
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.bodyWrap}>
          <View style={styles.avatarRow}>
            {user.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={36} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.avatarSpacer} />
            {isCurrentUser ? (
              <Pressable
                onPress={() => router.push('/community/profile-edit' as never)}
                style={styles.editProfileBtn}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </Pressable>
            ) : (
              <FollowButton userId={user.id} />
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.displayName}</Text>
            {isCurrentUser && (
              <View style={styles.levelChip}>
                <Ionicons name="flash" size={12} color={COLORS.primary} />
                <Text style={styles.levelChipText}>Lv {level}</Text>
              </View>
            )}
          </View>
          <Text style={styles.handle}>@{user.handle}</Text>
          {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          <View style={styles.statsRow}>
            <Stat label="Posts" value={userPosts.length} COLORS={COLORS} />
            <View style={[styles.statDivider, { backgroundColor: COLORS.divider }]} />
            <Stat
              label="Followers"
              value={followerCount}
              COLORS={COLORS}
              onPress={() =>
                router.push(`/community/profile/${user.id}/followers` as never)
              }
            />
            <View style={[styles.statDivider, { backgroundColor: COLORS.divider }]} />
            <Stat
              label="Following"
              value={followingCount}
              COLORS={COLORS}
              onPress={() =>
                router.push(`/community/profile/${user.id}/following` as never)
              }
            />
          </View>

          {showGoals && goals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Motivation Goals</Text>
              <View style={styles.goalGrid}>
                {goals.map((g) => {
                  const meta = GOAL_META[g];
                  return (
                    <View
                      key={g}
                      style={[styles.goalCard, { backgroundColor: meta.iconBg }]}
                    >
                      <MaterialCommunityIcons
                        name={meta.iconName as never}
                        size={22}
                        color={meta.iconColor}
                      />
                      <Text style={[styles.goalLabel, { color: meta.iconColor }]}>
                        {meta.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {isCurrentUser && (
            <View style={styles.section}>
              <View style={styles.achievementsHeader}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    authUser &&
                    router.push(
                      `/community/achievements/${authUser.uid}` as never,
                    )
                  }
                >
                  <Text style={styles.sectionLink}>See all</Text>
                </Pressable>
              </View>
              {recentUnlocks.length === 0 ? (
                <Text style={styles.emptyText}>
                  Train consistently to unlock your first badge.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {recentUnlocks.map((u) => {
                    const a = getAchievement(u.id);
                    if (!a) return null;
                    const Icon =
                      a.iconLib === 'material-community'
                        ? MaterialCommunityIcons
                        : Ionicons;
                    return (
                      <View key={u.id} style={styles.achievementBadge}>
                        <View style={styles.achievementBadgeIcon}>
                          <Icon
                            name={a.icon as never}
                            size={22}
                            color={COLORS.primary}
                          />
                        </View>
                        <Text
                          style={styles.achievementBadgeTitle}
                          numberOfLines={2}
                        >
                          {a.title}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.tabsRow}>
              <Pressable
                onPress={() => setTab('posts')}
                style={[styles.tabBtn, tab === 'posts' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="grid-outline"
                  size={14}
                  color={tab === 'posts' ? COLORS.primary : COLORS.muted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: tab === 'posts' ? COLORS.primary : COLORS.muted },
                  ]}
                >
                  Posts ({userPosts.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('comments')}
                style={[styles.tabBtn, tab === 'comments' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color={tab === 'comments' ? COLORS.primary : COLORS.muted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: tab === 'comments' ? COLORS.primary : COLORS.muted },
                  ]}
                >
                  Comments ({userComments.length})
                </Text>
              </Pressable>
            </View>

            {tab === 'posts' ? (
              userPosts.length === 0 ? (
                <Text style={styles.emptyText}>No posts yet.</Text>
              ) : (
                <View style={styles.postGrid}>
                  {userPosts.map((post) => (
                    <Pressable
                      key={post.id}
                      onPress={() => router.push(`/community/post/${post.id}` as never)}
                      style={styles.postTile}
                    >
                      {post.imageUri ? (
                        <Image source={{ uri: post.imageUri }} style={styles.postTileImage} />
                      ) : (
                        <View style={[styles.postTileImage, styles.postTileText]}>
                          <Text style={styles.postTileTextContent} numberOfLines={4}>
                            {post.caption}
                          </Text>
                        </View>
                      )}
                      {post.mediaType === 'video' && (
                        <View style={styles.postTileVideoBadge}>
                          <Ionicons name="videocam" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )
            ) : userComments.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {userComments.map((comment) => {
                  const parentPost = allPosts.find((p) => p.id === comment.postId);
                  const parentAuthor = parentPost
                    ? getUserById(parentPost.authorId)
                    : undefined;
                  return (
                    <Pressable
                      key={comment.id}
                      onPress={() =>
                        router.push(`/community/post/${comment.postId}` as never)
                      }
                      style={styles.commentRow}
                    >
                      <Text style={styles.commentText} numberOfLines={3}>
                        {comment.text}
                      </Text>
                      <Text style={styles.commentMeta}>
                        {parentAuthor
                          ? `on @${parentAuthor.handle}'s post · ${relativeTime(comment.createdAt)}`
                          : relativeTime(comment.createdAt)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  COLORS,
  onPress,
}: {
  label: string;
  value: number;
  COLORS: Palette;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { flex: 1, alignItems: 'center' },
          pressed && { opacity: 0.6 },
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={{ flex: 1, alignItems: 'center' }}>{content}</View>;
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
    coverWrap: { width: '100%', height: 160 },
    cover: { width: '100%', height: '100%', backgroundColor: COLORS.border },
    coverOverlayHeader: {
      position: 'absolute',
      top: 8,
      left: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    coverHeaderBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bodyWrap: { paddingHorizontal: 20 },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginTop: -40,
    },
    avatar: {
      width: 86,
      height: 86,
      borderRadius: 43,
      borderWidth: 4,
      borderColor: COLORS.bg,
      backgroundColor: COLORS.primarySoft,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarSpacer: { flex: 1 },
    editProfileBtn: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    editProfileText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    levelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    levelChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    handle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    bio: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginTop: 10 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      paddingVertical: 14,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      ...SHADOWS.card,
    },
    statDivider: { width: 1, height: 30 },
    section: { marginTop: 22 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    achievementsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionLink: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
    achievementBadge: {
      width: 86,
      alignItems: 'center',
      gap: 6,
    },
    achievementBadgeIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    achievementBadgeTitle: {
      fontSize: 11,
      color: COLORS.text,
      fontWeight: '700',
      textAlign: 'center',
    },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    goalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: RADIUS.md,
    },
    goalLabel: { fontSize: 13, fontWeight: '700' },
    emptyText: { fontSize: 13, color: COLORS.muted },
    postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    postTile: {
      width: '32.5%',
      aspectRatio: 1,
    },
    postTileImage: {
      width: '100%',
      height: '100%',
      borderRadius: 6,
      backgroundColor: COLORS.border,
    },
    postTileText: {
      backgroundColor: COLORS.card,
      padding: 8,
      ...SHADOWS.card,
    },
    postTileTextContent: { fontSize: 11, color: COLORS.text, lineHeight: 15 },
    postTileVideoBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.pill,
      padding: 4,
      marginBottom: 14,
      ...SHADOWS.card,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
    },
    tabBtnActive: { backgroundColor: COLORS.primarySoft },
    tabBtnText: { fontSize: 13, fontWeight: '800' },
    commentRow: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...SHADOWS.card,
    },
    commentText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    commentMeta: { fontSize: 11, color: COLORS.muted, marginTop: 6 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  });
