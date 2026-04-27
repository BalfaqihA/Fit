import type { Comment, Post, SeedUser, Story } from '@/types/community';

export const SEED_USERS: SeedUser[] = [
  {
    id: 'u_sara',
    displayName: 'Sara Al-Harbi',
    handle: 'sara.runs',
    bio: 'Marathon runner. Coffee first, training second.',
    avatarUri: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400',
    coverUri:
      'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1200&q=80',
    goals: ['increase_endurance', 'stay_fit'],
  },
  {
    id: 'u_omar',
    displayName: 'Omar Khalid',
    handle: 'omar.lifts',
    bio: 'Powerlifter chasing the 200kg deadlift.',
    avatarUri: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    coverUri:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    goals: ['build_muscle'],
  },
  {
    id: 'u_lina',
    displayName: 'Lina Ahmed',
    handle: 'lina.flow',
    bio: 'Yoga teacher. Mobility nerd.',
    avatarUri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    coverUri:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
    goals: ['improve_flexibility'],
  },
  {
    id: 'u_yusuf',
    displayName: 'Yusuf Rahman',
    handle: 'yusuf.fit',
    bio: 'Calisthenics + climbing. Always grippy.',
    avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    goals: ['build_muscle', 'improve_flexibility'],
  },
  {
    id: 'u_maya',
    displayName: 'Maya Hassan',
    handle: 'maya.moves',
    bio: 'Pilates + dance. Posture queen.',
    avatarUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',
    goals: ['stay_fit', 'improve_flexibility'],
  },
  {
    id: 'u_jad',
    displayName: 'Jad Najjar',
    handle: 'jad.runs',
    bio: 'Trail runner. Mountains > pavement.',
    avatarUri: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400',
    goals: ['increase_endurance'],
  },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();

export const SEED_POSTS: Post[] = [
  {
    id: 'p_seed_1',
    authorId: 'u_sara',
    caption: 'Smashed my 5K PR this morning! 22:14 and feeling strong.',
    imageUri:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
    createdAt: NOW - 2 * HOUR,
    likeIds: ['u_omar', 'u_lina', 'u_yusuf'],
  },
  {
    id: 'p_seed_2',
    authorId: 'u_omar',
    caption: 'New leg day PR — 120kg back squat. Progressive overload works!',
    createdAt: NOW - 5 * HOUR,
    likeIds: ['u_sara', 'u_jad'],
  },
  {
    id: 'p_seed_3',
    authorId: 'u_lina',
    caption: 'Finished a 30-day yoga streak. Who wants to join me for round two?',
    imageUri:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80',
    createdAt: NOW - DAY,
    likeIds: ['u_sara', 'u_omar', 'u_maya'],
  },
  {
    id: 'p_seed_4',
    authorId: 'u_maya',
    caption: 'Pilates + a long walk. Recovery days matter as much as the hard ones.',
    createdAt: NOW - 2 * DAY,
    likeIds: ['u_lina'],
  },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: 'c_seed_1',
    postId: 'p_seed_1',
    authorId: 'u_omar',
    text: 'That pace is wild. Teach me your ways.',
    createdAt: NOW - 1 * HOUR,
  },
  {
    id: 'c_seed_2',
    postId: 'p_seed_1',
    authorId: 'u_lina',
    text: 'Inspiring! Going for a run tomorrow.',
    createdAt: NOW - 30 * 60 * 1000,
  },
  {
    id: 'c_seed_3',
    postId: 'p_seed_3',
    authorId: 'u_yusuf',
    text: 'Count me in for round two.',
    createdAt: NOW - 20 * HOUR,
  },
];

export const SEED_STORIES: Story[] = [
  {
    id: 's_seed_1',
    authorId: 'u_sara',
    imageUri:
      'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=80',
    caption: 'Sunrise run',
    createdAt: NOW - 3 * HOUR,
    expiresAt: NOW + 21 * HOUR,
  },
  {
    id: 's_seed_2',
    authorId: 'u_omar',
    imageUri:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    caption: 'Leg day',
    createdAt: NOW - 6 * HOUR,
    expiresAt: NOW + 18 * HOUR,
  },
  {
    id: 's_seed_3',
    authorId: 'u_lina',
    imageUri:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80',
    createdAt: NOW - 9 * HOUR,
    expiresAt: NOW + 15 * HOUR,
  },
];
