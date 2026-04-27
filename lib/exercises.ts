import data from '@/assets/data/exercises.json';

export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced' | 'unknown';

export type ExerciseRecord = {
  id: string;
  name: string;
  category: string;
  level: ExerciseLevel;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[]; // e.g. ["Dead_Bug/0.jpg", "Dead_Bug/1.jpg"]
};

const RECORDS = data as ExerciseRecord[];

const BY_ID: Record<string, ExerciseRecord> = Object.fromEntries(
  RECORDS.map((e) => [e.id, e])
);

export const ALL_EXERCISES: ReadonlyArray<ExerciseRecord> = RECORDS;

export function getExerciseById(id: string | undefined | null): ExerciseRecord | undefined {
  if (!id) return undefined;
  return BY_ID[id];
}

const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function exerciseImageUrl(relative: string): string {
  return `${IMAGE_BASE}${encodeURI(relative)}`;
}

export function exerciseImageUrls(record: ExerciseRecord | undefined): string[] {
  if (!record?.images?.length) return [];
  return record.images.map(exerciseImageUrl);
}
