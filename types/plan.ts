import type { Timestamp } from 'firebase/firestore';

export type PlanExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  category: string;
  instructions: string[];
  /** Relative paths like "Dead_Bug/0.jpg". Use exerciseImageUrl() to make a URL. */
  images: string[];
};

export type PlanDay = {
  day: number;
  title: string;
  estimatedMinutes: number;
  exercises: PlanExercise[];
};

export type PlanProfile = {
  goal: string;
  level: string;
  equipment: string;
  daysPerWeek: number;
  sessionMinutes: number;
};

export type Plan = {
  id: string;
  userId: string;
  createdAt: Timestamp | null;
  profile: PlanProfile;
  days: PlanDay[];
};
