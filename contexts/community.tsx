import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  SEED_COMMENTS,
  SEED_POSTS,
  SEED_STORIES,
  SEED_USERS,
} from '@/constants/community-data';
import { useUserProfile } from '@/hooks/use-user-profile';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import type {
  AppNotification,
  Comment,
  Post,
  SeedUser,
  Story,
  UserProfile,
} from '@/types/community';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

type StoryGroup = {
  user: SeedUser | UserProfile;
  stories: Story[];
};

type CommunityContextValue = {
  hydrated: boolean;
  posts: Post[];
  comments: Comment[];
  stories: Story[];
  notifications: AppNotification[];
  followingIds: string[];

  getUserById: (id: string) => SeedUser | UserProfile | undefined;
  getPostsForFeed: () => Post[];
  getPostsByUser: (id: string) => Post[];
  getCommentsForPost: (postId: string) => Comment[];
  getStoriesGrouped: () => StoryGroup[];
  getMyStories: () => Story[];
  getFollowers: (userId: string) => (SeedUser | UserProfile)[];
  getFollowing: (userId: string) => (SeedUser | UserProfile)[];
  getFollowerCount: (userId: string) => number;
  getFollowingCount: (userId: string) => number;
  isFollowing: (userId: string) => boolean;
  hasLiked: (postId: string) => boolean;
  unreadNotificationCount: number;

  createPost: (input: { caption: string; imageUri?: string }) => Post;
  deletePost: (id: string) => void;
  editPost: (id: string, patch: Partial<Pick<Post, 'caption' | 'imageUri'>>) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  deleteComment: (id: string) => void;
  createStory: (input: { imageUri: string; caption?: string }) => Story;
  toggleFollow: (userId: string) => void;
  markNotificationsRead: () => void;
};

export const CommunityContext = createContext<CommunityContextValue | null>(null);

function pruneExpired(stories: Story[]): Story[] {
  const now = Date.now();
  return stories.filter((s) => s.expiresAt > now);
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function buildInitialActivityNotifications(
  posts: Post[],
  stories: Story[],
  followingIds: string[]
): AppNotification[] {
  const result: AppNotification[] = [];
  const recentPosts = posts
    .filter((p) => followingIds.includes(p.authorId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  for (const post of recentPosts) {
    result.push({
      id: newId('n'),
      type: 'new_post',
      actorId: post.authorId,
      postId: post.id,
      createdAt: post.createdAt,
      read: false,
    });
  }
  const recentStories = stories
    .filter((s) => followingIds.includes(s.authorId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  for (const story of recentStories) {
    result.push({
      id: newId('n'),
      type: 'new_story',
      actorId: story.authorId,
      storyId: story.id,
      createdAt: story.createdAt,
      read: false,
    });
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUserProfile();

  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
  const [stories, setStories] = useState<Story[]>(pruneExpired(SEED_STORIES));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>(['u_sara', 'u_lina']);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJSON<Post[]>(STORAGE_KEYS.posts, SEED_POSTS),
      loadJSON<Comment[]>(STORAGE_KEYS.comments, SEED_COMMENTS),
      loadJSON<Story[]>(STORAGE_KEYS.stories, SEED_STORIES),
      loadJSON<string[]>(STORAGE_KEYS.follows, ['u_sara', 'u_lina']),
      loadJSON<AppNotification[]>(STORAGE_KEYS.notifications, []),
    ]).then(([p, c, s, f, n]) => {
      if (cancelled) return;
      setPosts(p);
      setComments(c);
      setStories(pruneExpired(s));
      setFollowingIds(f);
      // Seed activity notifications from followed users on first ever launch.
      const seeded = n.length === 0 ? buildInitialActivityNotifications(p, s, f) : n;
      setNotifications(seeded);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change (after hydration so we don't overwrite with seeds).
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.posts, posts);
  }, [posts, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.comments, comments);
  }, [comments, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.stories, stories);
  }, [stories, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.follows, followingIds);
  }, [followingIds, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.notifications, notifications);
  }, [notifications, hydrated]);

  const getUserById = useCallback(
    (id: string): SeedUser | UserProfile | undefined => {
      if (id === profile.id) return profile;
      return SEED_USERS.find((u) => u.id === id);
    },
    [profile]
  );

  const getPostsForFeed = useCallback(
    () => [...posts].sort((a, b) => b.createdAt - a.createdAt),
    [posts]
  );

  const getPostsByUser = useCallback(
    (id: string) =>
      posts.filter((p) => p.authorId === id).sort((a, b) => b.createdAt - a.createdAt),
    [posts]
  );

  const getCommentsForPost = useCallback(
    (postId: string) =>
      comments.filter((c) => c.postId === postId).sort((a, b) => a.createdAt - b.createdAt),
    [comments]
  );

  const getStoriesGrouped = useCallback((): StoryGroup[] => {
    const live = pruneExpired(stories);
    const byAuthor = new Map<string, Story[]>();
    for (const story of live) {
      const arr = byAuthor.get(story.authorId) ?? [];
      arr.push(story);
      byAuthor.set(story.authorId, arr);
    }
    const groups: StoryGroup[] = [];
    for (const [authorId, group] of byAuthor.entries()) {
      const user = getUserById(authorId);
      if (!user) continue;
      groups.push({
        user,
        stories: group.sort((a, b) => a.createdAt - b.createdAt),
      });
    }
    // Own stories first, then others by most-recent story
    return groups.sort((a, b) => {
      if (a.user.id === profile.id) return -1;
      if (b.user.id === profile.id) return 1;
      const aLast = a.stories[a.stories.length - 1].createdAt;
      const bLast = b.stories[b.stories.length - 1].createdAt;
      return bLast - aLast;
    });
  }, [stories, getUserById, profile.id]);

  const getMyStories = useCallback(
    () => pruneExpired(stories).filter((s) => s.authorId === profile.id),
    [stories, profile.id]
  );

  // Demo "social graph": deterministic per-user lists derived from SEED_USERS.
  // For the current user, we use the real `followingIds` for who they follow,
  // and a stable subset of seed users as their followers.
  const deriveFollowerIds = useCallback(
    (userId: string): string[] => {
      if (userId === profile.id) {
        // Seed: first 3 seed users follow the current user.
        return SEED_USERS.slice(0, 3).map((u) => u.id);
      }
      const seed = Math.abs(hashString(userId));
      const others = [profile.id, ...SEED_USERS.filter((u) => u.id !== userId).map((u) => u.id)];
      const count = (seed % 4) + 2;
      const result: string[] = [];
      for (let i = 0; i < count && i < others.length; i++) {
        result.push(others[(seed + i) % others.length]);
      }
      // The current user is a follower iff they actually follow this user.
      return result.filter((id) => id !== profile.id || followingIds.includes(userId));
    },
    [followingIds, profile.id]
  );

  const deriveFollowingIds = useCallback(
    (userId: string): string[] => {
      if (userId === profile.id) return followingIds;
      const seed = Math.abs(hashString(userId + 'f'));
      const others = SEED_USERS.filter((u) => u.id !== userId).map((u) => u.id);
      const count = (seed % 4) + 2;
      const result: string[] = [];
      for (let i = 0; i < count && i < others.length; i++) {
        result.push(others[(seed + i) % others.length]);
      }
      return result;
    },
    [followingIds, profile.id]
  );

  const getFollowers = useCallback(
    (userId: string) => {
      const ids = deriveFollowerIds(userId);
      return ids
        .map((id) => getUserById(id))
        .filter((u): u is SeedUser | UserProfile => !!u);
    },
    [deriveFollowerIds, getUserById]
  );

  const getFollowing = useCallback(
    (userId: string) => {
      const ids = deriveFollowingIds(userId);
      return ids
        .map((id) => getUserById(id))
        .filter((u): u is SeedUser | UserProfile => !!u);
    },
    [deriveFollowingIds, getUserById]
  );

  const getFollowerCount = useCallback(
    (userId: string) => deriveFollowerIds(userId).length,
    [deriveFollowerIds]
  );

  const getFollowingCount = useCallback(
    (userId: string) => deriveFollowingIds(userId).length,
    [deriveFollowingIds]
  );

  const isFollowing = useCallback(
    (userId: string) => followingIds.includes(userId),
    [followingIds]
  );

  const hasLiked = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      return post ? post.likeIds.includes(profile.id) : false;
    },
    [posts, profile.id]
  );

  const pushNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      // Don't notify yourself.
      if (n.actorId === profile.id) {
        // Notifications target the post author; if the actor IS the author we skip.
      }
      setNotifications((prev) => [
        {
          ...n,
          id: newId('n'),
          createdAt: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    },
    [profile.id]
  );

  const createPost = useCallback<CommunityContextValue['createPost']>(
    ({ caption, imageUri }) => {
      const post: Post = {
        id: newId('p'),
        authorId: profile.id,
        caption: caption.trim(),
        imageUri,
        createdAt: Date.now(),
        likeIds: [],
      };
      setPosts((prev) => [post, ...prev]);
      pushNotification({ type: 'new_post', actorId: profile.id, postId: post.id });
      return post;
    },
    [profile.id, pushNotification]
  );

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setComments((prev) => prev.filter((c) => c.postId !== id));
    setNotifications((prev) => prev.filter((n) => n.postId !== id));
  }, []);

  const editPost = useCallback<CommunityContextValue['editPost']>((id, patch) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const toggleLike = useCallback(
    (postId: string) => {
      let nowLiked = false;
      let authorId: string | undefined;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          authorId = p.authorId;
          if (p.likeIds.includes(profile.id)) {
            return { ...p, likeIds: p.likeIds.filter((id) => id !== profile.id) };
          }
          nowLiked = true;
          return { ...p, likeIds: [...p.likeIds, profile.id] };
        })
      );
      if (nowLiked && authorId && authorId !== profile.id) {
        pushNotification({ type: 'like', actorId: profile.id, postId });
      }
    },
    [profile.id, pushNotification]
  );

  const addComment = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: Comment = {
        id: newId('c'),
        postId,
        authorId: profile.id,
        text: trimmed,
        createdAt: Date.now(),
      };
      setComments((prev) => [...prev, comment]);
      const post = posts.find((p) => p.id === postId);
      if (post && post.authorId !== profile.id) {
        pushNotification({
          type: 'comment',
          actorId: profile.id,
          postId,
          commentText: trimmed,
        });
      }
    },
    [posts, profile.id, pushNotification]
  );

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const createStory = useCallback<CommunityContextValue['createStory']>(
    ({ imageUri, caption }) => {
      const now = Date.now();
      const story: Story = {
        id: newId('s'),
        authorId: profile.id,
        imageUri,
        caption,
        createdAt: now,
        expiresAt: now + STORY_TTL_MS,
      };
      setStories((prev) => [...pruneExpired(prev), story]);
      pushNotification({ type: 'new_story', actorId: profile.id, storyId: story.id });
      return story;
    },
    [profile.id, pushNotification]
  );

  const toggleFollow = useCallback(
    (userId: string) => {
      if (userId === profile.id) return;
      let nowFollowing = false;
      setFollowingIds((prev) => {
        if (prev.includes(userId)) {
          return prev.filter((id) => id !== userId);
        }
        nowFollowing = true;
        return [...prev, userId];
      });
      if (nowFollowing) {
        pushNotification({ type: 'follow', actorId: profile.id });
      }
    },
    [profile.id, pushNotification]
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo<CommunityContextValue>(
    () => ({
      hydrated,
      posts,
      comments,
      stories,
      notifications,
      followingIds,
      getUserById,
      getPostsForFeed,
      getPostsByUser,
      getCommentsForPost,
      getStoriesGrouped,
      getMyStories,
      getFollowers,
      getFollowing,
      getFollowerCount,
      getFollowingCount,
      isFollowing,
      hasLiked,
      unreadNotificationCount,
      createPost,
      deletePost,
      editPost,
      toggleLike,
      addComment,
      deleteComment,
      createStory,
      toggleFollow,
      markNotificationsRead,
    }),
    [
      hydrated,
      posts,
      comments,
      stories,
      notifications,
      followingIds,
      getUserById,
      getPostsForFeed,
      getPostsByUser,
      getCommentsForPost,
      getStoriesGrouped,
      getMyStories,
      getFollowers,
      getFollowing,
      getFollowerCount,
      getFollowingCount,
      isFollowing,
      hasLiked,
      unreadNotificationCount,
      createPost,
      deletePost,
      editPost,
      toggleLike,
      addComment,
      deleteComment,
      createStory,
      toggleFollow,
      markNotificationsRead,
    ]
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
