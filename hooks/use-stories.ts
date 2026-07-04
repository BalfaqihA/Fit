import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  subscribeLiveStories,
  subscribeStoryViews,
  type StoryGroup,
  type StoryViewer,
} from '@/lib/stories';

/**
 * All live stories grouped by author (realtime). The signed-in user's own
 * group is sorted first; others by most recent story.
 */
export function useStories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    return subscribeLiveStories((g) => {
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const ordered = useMemo(() => {
    const uid = user?.uid;
    return [...groups].sort((a, b) => {
      if (uid && a.authorId === uid) return -1;
      if (uid && b.authorId === uid) return 1;
      const aLast = a.stories[a.stories.length - 1]?.createdAtMs ?? 0;
      const bLast = b.stories[b.stories.length - 1]?.createdAtMs ?? 0;
      return bLast - aLast;
    });
  }, [groups, user?.uid]);

  const myGroup = useMemo(
    () => ordered.find((g) => g.authorId === user?.uid),
    [ordered, user?.uid]
  );

  return { groups: ordered, myGroup, loading };
}

/** Who has viewed a given story (realtime). */
export function useStoryViews(storyId: string | undefined) {
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  useEffect(() => {
    if (!storyId) {
      setViewers([]);
      return;
    }
    return subscribeStoryViews(storyId, setViewers);
  }, [storyId]);
  return viewers;
}
