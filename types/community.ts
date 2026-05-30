export type GoalKey =
  | 'lose_weight'
  | 'build_muscle'
  | 'stay_fit'
  | 'increase_endurance'
  | 'improve_flexibility';

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';

export type Gender = 'male' | 'female';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentKey =
  | 'body'
  | 'dumbbells'
  | 'barbell'
  | 'bands'
  | 'kettlebell'
  | 'full-gym';

export type UserProfile = {
  id: string;
  displayName: string;
  handle: string;
  email: string;
  bio: string;
  avatarUri?: string;
  coverUri?: string;
  goals: GoalKey[];
  goalsVisible: boolean;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;

  // Onboarding-driven fields (set when the user completes onboarding).
  age?: number;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  fitnessLevel?: FitnessLevel;
  equipment?: EquipmentKey;
  sessionMinutes?: number;
  daysPerWeek?: number;
  primaryGoal?: GoalKey;
  currentPlanId?: string;
  /** ISO `YYYY-MM-DD` of the day the user completed their first workout. */
  planStartDate?: string;
  stats?: {
    totalWorkouts: number;
    totalMinutes: number;
    totalCaloriesKcal: number;
    totalXp?: number;
    longestStreak?: number;
  };
  /** ISO `YYYY-MM-DD` of the last weight log; used to nudge weekly weigh-ins. */
  weightLastUpdatedAt?: string;
  /** ISO `YYYY-MM-DD` of the most recently completed workout. */
  lastWorkoutAt?: string;
};

export type SeedUser = {
  id: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarUri: string;
  coverUri?: string;
  goals: GoalKey[];
};

// Posts, comments, stories and notifications are now Firestore-backed.
// Their shapes live next to their data access:
//   - posts/comments  -> lib/community.ts (FeedPost, FeedComment)
//   - stories          -> lib/stories.ts (Story, StoryGroup, StoryViewer)
//   - notifications    -> lib/community-notifications.ts (AppNotification)
// `SeedUser` is kept purely as the lightweight user-card shape reused by
// search results (lib/users.ts SearchUser).
