import { useEffect, useState } from 'react';

import { subscribeToComments, type FeedComment } from '@/lib/community';

export function useComments(postId: string | undefined) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = subscribeToComments(
      postId,
      (next) => {
        setComments(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [postId]);

  return { comments, loading, error };
}
