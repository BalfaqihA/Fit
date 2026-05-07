import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  POST_PAGE_SIZE,
  loadMorePosts,
  subscribeToFeed,
  subscribeToLikedPostIds,
  type FeedPost,
} from '@/lib/community';

type PaginatedState = {
  posts: FeedPost[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadingMore: boolean;
  likedIds: Set<string>;
};

export function usePosts() {
  const { user } = useAuth();
  const [state, setState] = useState<PaginatedState>({
    posts: [],
    loading: true,
    error: null,
    hasMore: true,
    loadingMore: false,
    likedIds: new Set(),
  });

  const firstPageCursor = useRef<QueryDocumentSnapshot | null>(null);
  const lastCursor = useRef<QueryDocumentSnapshot | null>(null);
  const olderPostsRef = useRef<FeedPost[]>([]);

  // First page (real-time).
  useEffect(() => {
    if (!user) {
      setState({
        posts: [],
        loading: false,
        error: null,
        hasMore: false,
        loadingMore: false,
        likedIds: new Set(),
      });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    olderPostsRef.current = [];
    const unsub = subscribeToFeed(
      POST_PAGE_SIZE,
      (firstPage, lastDoc) => {
        firstPageCursor.current = lastDoc;
        if (!lastCursor.current) lastCursor.current = lastDoc;
        setState((s) => ({
          ...s,
          posts: [...firstPage, ...olderPostsRef.current],
          loading: false,
          error: null,
          hasMore: firstPage.length === POST_PAGE_SIZE || olderPostsRef.current.length > 0,
        }));
      },
      (err) => {
        setState((s) => ({ ...s, loading: false, error: err }));
      }
    );
    return unsub;
  }, [user]);

  // Liked-by-me set (real-time).
  useEffect(() => {
    if (!user) return;
    return subscribeToLikedPostIds(user.uid, (ids) => {
      setState((s) => ({ ...s, likedIds: ids }));
    });
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user) return;
    const cursor = lastCursor.current ?? firstPageCursor.current;
    if (!cursor) return;
    setState((s) => {
      if (s.loadingMore || !s.hasMore) return s;
      return { ...s, loadingMore: true };
    });
    try {
      const { posts: older, lastDoc } = await loadMorePosts(cursor, POST_PAGE_SIZE);
      olderPostsRef.current = [...olderPostsRef.current, ...older];
      lastCursor.current = lastDoc ?? lastCursor.current;
      setState((s) => ({
        ...s,
        posts: [...s.posts, ...older],
        loadingMore: false,
        hasMore: older.length === POST_PAGE_SIZE,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loadingMore: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [user]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
  }, []);

  return {
    posts: state.posts,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    loadingMore: state.loadingMore,
    likedIds: state.likedIds,
    loadMore,
    retry,
  };
}
