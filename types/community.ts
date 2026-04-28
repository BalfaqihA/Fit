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
  stats?: {
    totalWorkouts: number;
    totalMinutes: number;
    totalCaloriesKcal: number;
  };
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

export type Post = {
  id: string;
  authorId: string;
  caption: string;
  imageUri?: string;
  createdAt: number;
  likeIds: string[];
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: number;
};

export type Story = {
  id: string;
  authorId: string;
  imageUri: string;
  caption?: string;
  createdAt: number;
  expiresAt: number;
};

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'new_post'
  | 'new_story';

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string;
  postId?: string;
  storyId?: string;
  commentText?: string;
  createdAt: number;
  read: boolean;
};
