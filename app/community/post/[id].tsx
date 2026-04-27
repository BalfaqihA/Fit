import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const {
    posts,
    getCommentsForPost,
    getUserById,
    hasLiked,
    toggleLike,
    addComment,
    deleteComment,
    deletePost,
  } = useCommunity();

  const post = posts.find((p) => p.id === id);
  const [draft, setDraft] = useState('');

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Post not found</Text>
          <Text style={styles.emptySub}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const author = getUserById(post.authorId);
  const comments = getCommentsForPost(post.id);
  const isOwn = post.authorId === profile.id;

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    addComment(post.id, text);
    setDraft('');
  };

  const handleMenu = () => {
    if (!isOwn) return;
    Alert.alert('Post actions', undefined, [
      {
        text: 'Delete post',
        style: 'destructive',
        onPress: () => {
          deletePost(post.id);
          router.back();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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
          {author && (
            <PostCard
              post={post}
              author={author}
              liked={hasLiked(post.id)}
              likeCount={post.likeIds.length}
              commentCount={comments.length}
              onLike={() => toggleLike(post.id)}
              onComment={() => {}}
              onPressAuthor={() =>
                router.push(`/community/profile/${author.id}` as never)
              }
              onPressMenu={isOwn ? handleMenu : undefined}
            />
          )}

          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </View>

          {comments.length === 0 && (
            <Text style={styles.noComments}>Be the first to comment.</Text>
          )}

          {comments.map((comment) => {
            const cAuthor = getUserById(comment.authorId);
            return (
              <CommentRow
                key={comment.id}
                comment={comment}
                author={cAuthor}
                isOwn={comment.authorId === profile.id}
                onPressAuthor={() =>
                  cAuthor && router.push(`/community/profile/${cAuthor.id}` as never)
                }
                onDelete={() => deleteComment(comment.id)}
              />
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.muted}
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: draft.trim() ? COLORS.primary : COLORS.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
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
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    emptySub: { marginTop: 4, fontSize: 13, color: COLORS.muted },
  });
