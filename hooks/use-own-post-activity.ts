import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  subscribeToOwnPostComments,
  subscribeToOwnPostLikes,
} from '@/lib/community';
import { notifyLocally } from '@/lib/notifications';

/**
 * Subscribes to likes / comments on the current user's posts and fires a
 * local notification when a new one arrives from another user. Mount once
 * near the top of the tree (e.g. tab layout) so it runs while the app is open.
 */
export function useOwnPostActivity() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const unsubLikes = subscribeToOwnPostLikes(user.uid, (like) => {
      void notifyLocally('New like', `Someone liked your post.`);
      void like;
    });
    const unsubComments = subscribeToOwnPostComments(user.uid, (comment) => {
      const preview = comment.text.length > 80
        ? `${comment.text.slice(0, 77)}...`
        : comment.text;
      void notifyLocally(
        `${comment.authorName} commented`,
        preview
      );
    });
    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [user]);
}
