import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  followUser,
  subscribeFollowers,
  subscribeFollowing,
  subscribeIsFollowing,
  subscribeUserCounts,
  unfollowUser,
  type FollowUserCard,
} from '@/lib/follows';

/** Follower / following counts for a user (realtime, from the user doc). */
export function useFollowCounts(uid: string | undefined) {
  const [counts, setCounts] = useState({ followerCount: 0, followingCount: 0 });
  useEffect(() => {
    if (!uid) return;
    return subscribeUserCounts(uid, setCounts);
  }, [uid]);
  return counts;
}

/** Whether the signed-in user follows `targetId`, plus a toggle. */
export function useFollowState(targetId: string | undefined) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const self = !!user && !!targetId && user.uid === targetId;

  useEffect(() => {
    if (!user || !targetId || self) return;
    return subscribeIsFollowing(user.uid, targetId, setIsFollowing);
  }, [user, targetId, self]);

  const toggle = useCallback(async () => {
    if (!targetId || busy || self) return;
    setBusy(true);
    // Optimistic: reflect immediately; the realtime listener corrects it.
    setIsFollowing((prev) => !prev);
    try {
      if (isFollowing) await unfollowUser(targetId);
      else await followUser(targetId);
    } catch {
      setIsFollowing((prev) => !prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }, [targetId, busy, self, isFollowing]);

  return { isFollowing, toggle, busy, self };
}

/** Users that `uid` follows (realtime). */
export function useFollowing(uid: string | undefined) {
  const [users, setUsers] = useState<FollowUserCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeFollowing(uid, (u) => {
      setUsers(u);
      setLoading(false);
    });
  }, [uid]);
  return { users, loading };
}

/** Users who follow `uid` (realtime). */
export function useFollowers(uid: string | undefined) {
  const [users, setUsers] = useState<FollowUserCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeFollowers(uid, (u) => {
      setUsers(u);
      setLoading(false);
    });
  }, [uid]);
  return { users, loading };
}
