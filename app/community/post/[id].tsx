import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { CommentRow } from '@/components/comment-row';
import { PostCard } from '@/components/post-card';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useComments } from '@/hooks/use-comments';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import {
  MAX_COMMENT_LEN,
  POSTS,
  addComment,
  deleteComment,
  deletePost,
  likePost,
  mapPost,
  reportPost,
  subscribeToLikedPostIds,
  unlikePost,
  type FeedPost,
} from '@/lib/community';
import { db } from '@/lib/firebase';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState<Error | null>(null);
  const [liked, setLiked] = useState(false);
  const { comments, loading: commentsLoading } = useComments(id);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Real-time single-doc subscription for the post.
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, POSTS, id),
      (snap) => {
        if (snap.exists()) {
          setPost(mapPost(snap));
        } else {
          setPost(null);
        }
        setPostLoading(false);
      },
      (err) => {
        setPostError(err);
        setPostLoading(false);
      }
    );
    return unsub;
  }, [id]);

  // Track whether the current user has liked this post.
  useEffect(() => {
    if (!profile.id || !id) return;
    return subscribeToLikedPostIds(profile.id, (ids) => setLiked(ids.has(id)));
  }, [profile.id, id]);

  const trimmedDraft = draft.trim();
  const draftValid = trimmedDraft.length > 0 && trimmedDraft.length <= MAX_COMMENT_LEN;

  const handleSubmit = async () => {
    if (!post || !draftValid || submitting) return;
    setSubmitting(true);
    try {
      await addComment({
        postId: post.id,
        postOwnerId: post.authorId,
        text: trimmedDraft,
        authorName: profile.displayName,
        authorAvatarUrl: profile.avatarUri ?? null,
      });
      setDraft('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not add comment.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!post) return;
    try {
      if (liked) await unlikePost(post.id);
      else await likePost({ id: post.id, authorId: post.authorId });
    } catch {
      // Surface only via Sentry; UI keeps current state.
    }
  };

  const handleMenu = () => {
    if (!post) return;
    const isOwn = post.authorId === profile.id;
    if (isOwn) {
      Alert.alert('Post actions', undefined, [
        {
          text: 'Delete post',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete post', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deletePost(post.id);
                    router.back();
                  } catch {
                    Alert.alert('Error', 'Could not delete the post.');
                  }
                },
              },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post actions', undefined, [
        {
          text: 'Report post',
          style: 'destructive',
          onPress: () =>
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
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      await deleteComment(commentId, postId);
    } catch {
      Alert.alert('Error', 'Could not delete the comment.');
    }
  };

  if (postLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (postError || !post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Post not found</Text>
          <Text style={styles.emptySub}>
            {postError ? 'Something went wrong.' : 'It may have been deleted.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <PostCard
            postId={post.id}
            authorId={post.authorId}
            authorName={post.authorName}
            authorAvatarUrl={post.authorAvatarUrl}
            caption={post.caption}
            imageUrl={post.imageUrl}
            createdAtMs={post.createdAtMs}
            liked={liked}
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            isOwn={post.authorId === profile.id}
            onLike={handleToggleLike}
            onComment={() => {}}
            onPressAuthor={() =>
              router.push(`/community/profile/${post.authorId}` as never)
            }
            onPressMenu={handleMenu}
          />

          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </Text>
          </View>

          {commentsLoading && (
            <View style={styles.commentsLoading}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}

          {!commentsLoading && comments.length === 0 && (
            <Text style={styles.noComments}>Be the first to comment.</Text>
          )}

          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              authorName={comment.authorName}
              authorAvatarUrl={comment.authorAvatarUrl}
              text={comment.text}
              createdAtMs={comment.createdAtMs}
              isOwn={comment.authorId === profile.id}
              onPressAuthor={() =>
                router.push(`/community/profile/${comment.authorId}` as never)
              }
              onDelete={() => handleDeleteComment(comment.id, post.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.muted}
            style={styles.composerInput}
            multiline
            maxLength={MAX_COMMENT_LEN + 50}
            editable={!submitting}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!draftValid || submitting}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: draftValid && !submitting ? COLORS.primary : COLORS.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    commentsHeader: { paddingHorizontal: 20, marginTop: 10, marginBottom: 4 },
    commentsTitle: { fontSize: 13, fontWeight: '800', color: COLORS.muted, letterSpacing: 0.6 },
    commentsLoading: { paddingVertical: 16, alignItems: 'center' },
    noComments: { paddingHorizontal: 20, marginTop: 16, fontSize: 13, color: COLORS.muted },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
      backgroundColor: COLORS.bg,
    },
    composerInput: {
      flex: 1,
      maxHeight: 100,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: COLORS.text,
      ...SHADOWS.card,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    emptySub: { marginTop: 4, fontSize: 13, color: COLORS.muted },
  });
