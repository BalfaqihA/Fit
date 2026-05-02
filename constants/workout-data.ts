import type { Palette } from '@/constants/design';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Full Body';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export type Exercise = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondaryMuscles: string[];
  level: Level;
  equipment: string;
  sets: number;
  reps?: number;
  holdSec?: number;
  xp: number;
  category: string;
  mechanic?: 'Compound' | 'Isolation';
  instructions: string[];
  imageStart?: string;
  imageEnd?: string;
};

export type DayPlan = {
  day: number;
  short: string;
  name: string;
  isRestDay: boolean;
  exercises: string[];
  focusMuscles: MuscleGroup[];
  estimatedMinutes: number;
};

export type WorkoutSession = {
  id: string;
  date: string;
  duration: number;
  calories: number;
  exercisesCompleted: number;
  expEarned: number;
};

export const CALORIES_PER_MINUTE = 7;

export const EXERCISES: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    muscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Front Delts'],
    level: 'Intermediate',
    equipment: 'Barbell',
    sets: 4,
    reps: 8,
    xp: 60,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Lie flat on the bench with feet planted firmly on the floor.',
      'Grip the bar slightly wider than shoulder width.',
      'Lower the bar to mid-chest with control.',
      'Press the bar back up to full arm extension, keeping elbows tucked ~45°.',
    ],
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    muscle: 'Chest',
    secondaryMuscles: ['Front Delts', 'Triceps'],
    level: 'Beginner',
    equipment: 'Dumbbells',
    sets: 3,
    reps: 10,
    xp: 45,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Set the bench to a 30° incline.',
      'Hold a dumbbell in each hand at shoulder level.',
      'Press both dumbbells up until arms are extended.',
      'Lower back to the start with a slow tempo.',
    ],
  },
  {
    id: 'push-up',
    name: 'Push Up',
    muscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Core'],
    level: 'Beginner',
    equipment: 'Bodyweight',
    sets: 3,
    reps: 15,
    xp: 30,
    category: 'Bodyweight',
    mechanic: 'Compound',
    instructions: [
      'Start in a high plank with hands under shoulders.',
      'Keep your body in a straight line from head to heels.',
      'Lower your chest to just above the floor.',
      'Push back up to the starting position.',
    ],
  },
  {
    id: 'pull-up',
    name: 'Pull Up',
    muscle: 'Back',
    secondaryMuscles: ['Biceps', 'Rear Delts'],
    level: 'Intermediate',
    equipment: 'Pull-up bar',
    sets: 4,
    reps: 8,
    xp: 55,
    category: 'Bodyweight',
    mechanic: 'Compound',
    instructions: [
      'Hang from the bar with hands just wider than shoulders.',
      'Pull your chest toward the bar, leading with the elbows.',
      'Pause at the top, then lower under control.',
    ],
  },
  {
    id: 'bent-row',
    name: 'Barbell Bent Over Row',
    muscle: 'Back',
    secondaryMuscles: ['Biceps', 'Rear Delts'],
    level: 'Intermediate',
    equipment: 'Barbell',
    sets: 4,
    reps: 10,
    xp: 55,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Hinge forward at the hips with a flat back.',
      'Row the bar to your lower chest / upper abs.',
      'Squeeze the shoulder blades, then lower with control.',
    ],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscle: 'Back',
    secondaryMuscles: ['Biceps'],
    level: 'Beginner',
    equipment: 'Cable',
    sets: 3,
    reps: 12,
    xp: 40,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Sit at the pulldown machine with thighs pinned.',
      'Grip the bar wider than shoulders.',
      'Pull the bar to your upper chest, elbows driving down.',
      'Return the bar up slowly.',
    ],
  },
  {
    id: 'squat',
    name: 'Barbell Back Squat',
    muscle: 'Legs',
    secondaryMuscles: ['Glutes', 'Core'],
    level: 'Intermediate',
    equipment: 'Barbell',
    sets: 4,
    reps: 8,
    xp: 70,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Rest the bar on the upper traps, not the neck.',
      'Stand with feet shoulder width, toes slightly out.',
      'Sit down and back, keeping chest tall.',
      'Drive through the heels to stand back up.',
    ],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    muscle: 'Legs',
    secondaryMuscles: ['Back', 'Glutes', 'Hamstrings'],
    level: 'Advanced',
    equipment: 'Barbell',
    sets: 3,
    reps: 5,
    xp: 90,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Stand with the bar over mid-foot.',
      'Grip the bar just outside your knees with a flat back.',
      'Drive the floor away; the bar should travel straight up.',
      'Stand tall at the top, then lower under control.',
    ],
  },
  {
    id: 'lunge',
    name: 'Walking Lunge',
    muscle: 'Legs',
    secondaryMuscles: ['Glutes'],
    level: 'Beginner',
    equipment: 'Dumbbells',
    sets: 3,
    reps: 12,
    xp: 40,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Hold a dumbbell in each hand at your sides.',
      'Step forward into a lunge, rear knee just above floor.',
      'Push off the front heel to bring your back foot through.',
      'Continue alternating legs.',
    ],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscle: 'Legs',
    secondaryMuscles: ['Glutes'],
    level: 'Beginner',
    equipment: 'Machine',
    sets: 3,
    reps: 12,
    xp: 45,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Sit in the machine with feet shoulder-width on the platform.',
      'Unlock the sled and lower until knees reach ~90°.',
      'Press back up without locking out the knees.',
    ],
  },
  {
    id: 'ohp',
    name: 'Overhead Press',
    muscle: 'Shoulders',
    secondaryMuscles: ['Triceps', 'Core'],
    level: 'Intermediate',
    equipment: 'Barbell',
    sets: 4,
    reps: 8,
    xp: 55,
    category: 'Strength',
    mechanic: 'Compound',
    instructions: [
      'Start with the bar at your front delts, grip just outside shoulders.',
      'Brace the core and press the bar straight overhead.',
      'Lock out with biceps by the ears, then lower under control.',
    ],
  },
  {
    id: 'lat-raise',
    name: 'Dumbbell Lateral Raise',
    muscle: 'Shoulders',
    secondaryMuscles: [],
    level: 'Beginner',
    equipment: 'Dumbbells',
    sets: 3,
    reps: 15,
    xp: 35,
    category: 'Isolation',
    mechanic: 'Isolation',
    instructions: [
      'Stand tall, a light dumbbell in each hand.',
      'Raise both arms out to the sides until parallel with the floor.',
      'Lower under control; lead with the elbows, not the wrists.',
    ],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    muscle: 'Shoulders',
    secondaryMuscles: ['Rear Delts', 'Upper Back'],
    level: 'Beginner',
    equipment: 'Cable',
    sets: 3,
    reps: 15,
    xp: 35,
    category: 'Isolation',
    mechanic: 'Isolation',
    instructions: [
      'Set a rope attachment at upper chest height.',
      'Pull the rope toward your face, elbows high.',
      'Squeeze the rear delts, then return slowly.',
    ],
  },
  {
    id: 'bicep-curl',
    name: 'Dumbbell Bicep Curl',
    muscle: 'Arms',
    secondaryMuscles: ['Forearms'],
    level: 'Beginner',
    equipment: 'Dumbbells',
    sets: 3,
    reps: 12,
    xp: 35,
    category: 'Isolation',
    mechanic: 'Isolation',
    instructions: [
      'Stand tall holding a dumbbell in each hand.',
      'Curl the weights up, keeping elbows pinned at the sides.',
      'Squeeze at the top, then lower under control.',
    ],
  },
  {
    id: 'tricep-pushdown',
    name: 'Triceps Pushdown',
    muscle: 'Arms',
    secondaryMuscles: [],
    level: 'Beginner',
    equipment: 'Cable',
    sets: 3,
    reps: 12,
    xp: 35,
    category: 'Isolation',
    mechanic: 'Isolation',
    instructions: [
      'Stand at a cable tower with a rope or straight bar attachment up high.',
      'Keep elbows pinned; press the bar down until arms are fully extended.',
      'Return under control without letting the elbows flare.',
    ],
  },
  {
    id: 'plank',
    name: 'Plank',
    muscle: 'Core',
    secondaryMuscles: ['Shoulders', 'Glutes'],
    level: 'Beginner',
    equipment: 'Bodyweight',
    sets: 3,
    holdSec: 45,
    xp: 30,
    category: 'Bodyweight',
    instructions: [
      'Rest on forearms with elbows under shoulders.',
      'Form a straight line from head to heels.',
      'Squeeze glutes and brace your core the entire hold.',
    ],
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    muscle: 'Core',
    secondaryMuscles: ['Obliques'],
    level: 'Beginner',
    equipment: 'Bodyweight',
    sets: 3,
    reps: 20,
    xp: 30,
    category: 'Bodyweight',
    instructions: [
      'Sit with knees bent, lean back to ~45°.',
      'Rotate the torso, tapping the floor beside each hip.',
      'Keep the chest open and avoid rounding the back.',
    ],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    muscle: 'Core',
    secondaryMuscles: ['Hip Flexors'],
    level: 'Intermediate',
    equipment: 'Pull-up bar',
    sets: 3,
    reps: 10,
    xp: 45,
    category: 'Bodyweight',
    instructions: [
      'Hang from a bar with arms straight.',
      'Raise your legs until hips are at 90° (or higher).',
      'Lower slowly, avoiding any swinging.',
    ],
  },
  {
    id: 'burpee',
    name: 'Burpee',
    muscle: 'Full Body',
    secondaryMuscles: ['Chest', 'Legs', 'Core'],
    level: 'Intermediate',
    equipment: 'Bodyweight',
    sets: 3,
    reps: 12,
    xp: 50,
    category: 'Conditioning',
    instructions: [
      'From standing, drop to a plank position.',
      'Perform a push-up (optional).',
      'Jump the feet back in and explode up into a jump.',
    ],
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    muscle: 'Full Body',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    level: 'Intermediate',
    equipment: 'Kettlebell',
    sets: 4,
    reps: 15,
    xp: 55,
    category: 'Conditioning',
    mechanic: 'Compound',
    instructions: [
      'Hinge at the hips; let the bell swing back between your legs.',
      'Drive the hips forward; let the bell float up to chest height.',
      'Let it fall back, absorb with the hips, and repeat.',
    ],
  },
];

export const WEEK_PLAN: DayPlan[] = [
  {
    day: 1,
    short: 'MON',
    name: 'Monday',
    isRestDay: false,
    exercises: ['bench-press', 'incline-db-press', 'push-up', 'tricep-pushdown'],
    focusMuscles: ['Chest', 'Arms'],
    estimatedMinutes: 55,
  },
  {
    day: 2,
    short: 'TUE',
    name: 'Tuesday',
    isRestDay: false,
    exercises: ['pull-up', 'bent-row', 'lat-pulldown', 'bicep-curl', 'face-pull'],
    focusMuscles: ['Back', 'Arms', 'Shoulders'],
    estimatedMinutes: 60,
  },
  {
    day: 3,
    short: 'WED',
    name: 'Wednesday',
    isRestDay: true,
    exercises: [],
    focusMuscles: [],
    estimatedMinutes: 0,
  },
  {
    day: 4,
    short: 'THU',
    name: 'Thursday',
    isRestDay: false,
    exercises: ['squat', 'leg-press', 'lunge', 'plank'],
    focusMuscles: ['Legs', 'Core'],
    estimatedMinutes: 65,
  },
  {
    day: 5,
    short: 'FRI',
    name: 'Friday',
    isRestDay: false,
    exercises: ['ohp', 'lat-raise', 'face-pull', 'hanging-leg-raise'],
    focusMuscles: ['Shoulders', 'Core'],
    estimatedMinutes: 50,
  },
  {
    day: 6,
    short: 'SAT',
    name: 'Saturday',
    isRestDay: false,
    exercises: ['deadlift', 'kettlebell-swing', 'burpee', 'russian-twist'],
    focusMuscles: ['Full Body', 'Core'],
    estimatedMinutes: 55,
  },
  {
    day: 7,
    short: 'SUN',
    name: 'Sunday',
    isRestDay: true,
    exercises: [],
    focusMuscles: [],
    estimatedMinutes: 0,
  },
];

export function getExerciseById(id: string | undefined): Exercise | undefined {
  if (!id) return undefined;
  return EXERCISES.find((e) => e.id === id);
}

export function getDayByNumber(day: number | undefined): DayPlan | undefined {
  if (!day) return undefined;
  return WEEK_PLAN.find((d) => d.day === day);
}

export function muscleColor(muscle: MuscleGroup, COLORS: Palette): string {
  switch (muscle) {
    case 'Chest':
      return '#FF6B7A';
    case 'Back':
      return '#4EA3FF';
    case 'Legs':
      return '#2EC07E';
    case 'Shoulders':
      return '#F4A93B';
    case 'Arms':
      return '#9B6BFF';
    case 'Core':
      return '#FF8A3D';
    case 'Full Body':
      return COLORS.primary;
    default:
      return COLORS.primary;
  }
}

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function todayDayNumber(): number {
  // JS: Sunday=0, Monday=1, ... Saturday=6. Our WEEK_PLAN is 1..7 starting Monday.
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}
