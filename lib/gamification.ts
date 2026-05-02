export const COMPLETION_BONUS_XP = 50;
export const XP_PER_MINUTE = 3;
export const LEVEL_XP = 1000;

export function xpForExercise(plannedSets: number, plannedReps: number): number {
  return Math.max(50, Math.round(plannedSets * plannedReps * 1.2));
}

export function xpForWorkout(input: {
  exerciseXpSum: number;
  durationMin: number;
}): number {
  return (
    input.exerciseXpSum +
    Math.max(0, input.durationMin) * XP_PER_MINUTE +
    COMPLETION_BONUS_XP
  );
}

export type LevelInfo = {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  remainingXp: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safe / LEVEL_XP) + 1;
  const currentLevelXp = safe % LEVEL_XP;
  const nextLevelXp = LEVEL_XP;
  const progress = Math.min(1, currentLevelXp / nextLevelXp);
  const remainingXp = Math.max(0, nextLevelXp - currentLevelXp);
  return { level, currentLevelXp, nextLevelXp, progress, remainingXp };
}
