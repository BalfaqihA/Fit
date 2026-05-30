import { useEffect, useState } from 'react';

import {
  subscribeToUserComments,
  subscribeToUserPosts,
  type FeedComment,
  type FeedPost,
} from '@/lib/community';

/**
 * A user's own posts and comments from Firestore (realtime). Replaces the
 * old in-memory SEED-backed `getPostsByUser` / `getCommentsByAuthor`.
 */
export function useUserPosts(uid: string | undefined) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setPosts([]);
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let gotPosts = false;
    let gotComments = false;
    const settle = () => {
      if (gotPosts && gotComments) setLoading(false);
    };
    const unsubPosts = subscribeToUserPosts(
      uid,
      (p) => {
        setPosts(p);
        gotPosts = true;
        settle();
      },
      (e) => {
        setError(e);
        setLoading(false);
      }
    );
    const unsubComments = subscribeToUserComments(
      uid,
      (c) => {
        setComments(c);
        gotComments = true;
        settle();
      },
      (e) => {
        setError(e);
        setLoading(false);
      }
    );
    return () => {
      unsubPosts();
      unsubComments();
    };
  }, [uid]);

  return { posts, comments, loading, error };
}
