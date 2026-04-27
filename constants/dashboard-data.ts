export type WeeklyBar = { day: string; value: number; minutes: number; date: string };

export type PersonalRecord = {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: string;
  delta: string;
  trend: 'up' | 'down';
  achievedAt: string;
  history: { date: string; value: number }[];
  notes?: string;
};

export type BodyStat = {
  key: 'weight' | 'bmi' | 'body_fat';
  label: string;
  value: string;
  trend: 'up' | 'down';
  change: string;
  unit: string;
  history: { date: string; value: number }[];
  goal?: string;
  description: string;
};

export const WEEKLY_BARS: WeeklyBar[] = [
  { day: 'M', date: '2026-04-20', value: 0.6, minutes: 42 },
  { day: 'T', date: '2026-04-21', value: 0.85, minutes: 60 },
  { day: 'W', date: '2026-04-22', value: 0.4, minutes: 28 },
  { day: 'T', date: '2026-04-23', value: 0.95, minutes: 68 },
  { day: 'F', date: '2026-04-24', value: 0.7, minutes: 50 },
  { day: 'S', date: '2026-04-25', value: 0.55, minutes: 38 },
  { day: 'S', date: '2026-04-26', value: 0.3, minutes: 22 },
];

export const ACTIVITY_TOTALS = {
  workouts: 5,
  minutes: 308,
  calories: 8400,
  distanceKm: 12.4,
  activeDays: 7,
  longestStreak: 11,
};

export const PERSONAL_RECORDS: PersonalRecord[] = [
  {
    id: 'pr_bench',
    label: 'Bench Press',
    value: '85',
    unit: 'kg',
    icon: 'dumbbell',
    delta: '+5 kg',
    trend: 'up',
    achievedAt: '2026-04-22',
    notes: 'Clean reps with a paused 2-second hold at the chest.',
    history: [
      { date: '2026-01-15', value: 70 },
      { date: '2026-02-08', value: 72.5 },
      { date: '2026-02-25', value: 75 },
      { date: '2026-03-15', value: 80 },
      { date: '2026-04-22', value: 85 },
    ],
  },
  {
    id: 'pr_squat',
    label: 'Back Squat',
    value: '120',
    unit: 'kg',
    icon: 'weight',
    delta: '+10 kg',
    trend: 'up',
    achievedAt: '2026-04-19',
    notes: 'Below parallel, tight brace. Form felt locked in.',
    history: [
      { date: '2026-01-10', value: 95 },
      { date: '2026-02-05', value: 100 },
      { date: '2026-03-01', value: 110 },
      { date: '2026-03-22', value: 115 },
      { date: '2026-04-19', value: 120 },
    ],
  },
  {
    id: 'pr_5k',
    label: '5K Run',
    value: '22:14',
    unit: 'time',
    icon: 'run-fast',
    delta: '-0:45',
    trend: 'down',
    achievedAt: '2026-04-26',
    notes: 'Negative split — held back the first km, kicked the last.',
    history: [
      { date: '2026-01-12', value: 26.5 },
      { date: '2026-02-10', value: 25.2 },
      { date: '2026-03-08', value: 24.0 },
      { date: '2026-04-05', value: 23.0 },
      { date: '2026-04-26', value: 22.23 },
    ],
  },
  {
    id: 'pr_deadlift',
    label: 'Deadlift',
    value: '150',
    unit: 'kg',
    icon: 'weight-lifter',
    delta: '+5 kg',
    trend: 'up',
    achievedAt: '2026-04-15',
    notes: 'First time over 1.5x body weight.',
    history: [
      { date: '2026-01-20', value: 130 },
      { date: '2026-02-15', value: 135 },
      { date: '2026-03-10', value: 140 },
      { date: '2026-03-30', value: 145 },
      { date: '2026-04-15', value: 150 },
    ],
  },
  {
    id: 'pr_pullup',
    label: 'Pull-ups',
    value: '14',
    unit: 'reps',
    icon: 'arm-flex',
    delta: '+2',
    trend: 'up',
    achievedAt: '2026-04-12',
    notes: 'Strict form, full extension at the bottom.',
    history: [
      { date: '2026-01-08', value: 8 },
      { date: '2026-02-12', value: 10 },
      { date: '2026-03-04', value: 11 },
      { date: '2026-03-25', value: 12 },
      { date: '2026-04-12', value: 14 },
    ],
  },
];

export const BODY_STATS: BodyStat[] = [
  {
    key: 'weight',
    label: 'Weight',
    value: '74.2',
    unit: 'kg',
    trend: 'down',
    change: '-1.1',
    goal: '72.0 kg',
    description: 'Body weight, measured first thing in the morning.',
    history: [
      { date: '2026-01-01', value: 78.0 },
      { date: '2026-02-01', value: 77.1 },
      { date: '2026-03-01', value: 76.0 },
      { date: '2026-04-01', value: 75.3 },
      { date: '2026-04-26', value: 74.2 },
    ],
  },
  {
    key: 'bmi',
    label: 'BMI',
    value: '22.8',
    unit: '',
    trend: 'down',
    change: '-0.3',
    goal: '22.0',
    description: 'Body Mass Index — calculated from your height and weight.',
    history: [
      { date: '2026-01-01', value: 23.9 },
      { date: '2026-02-01', value: 23.6 },
      { date: '2026-03-01', value: 23.3 },
      { date: '2026-04-01', value: 23.1 },
      { date: '2026-04-26', value: 22.8 },
    ],
  },
  {
    key: 'body_fat',
    label: 'Body Fat',
    value: '16.4',
    unit: '%',
    trend: 'down',
    change: '-0.7',
    goal: '14.0%',
    description: 'Estimated body fat percentage from caliper measurements.',
    history: [
      { date: '2026-01-01', value: 19.1 },
      { date: '2026-02-01', value: 18.4 },
      { date: '2026-03-01', value: 17.6 },
      { date: '2026-04-01', value: 17.1 },
      { date: '2026-04-26', value: 16.4 },
    ],
  },
];

export function getPersonalRecord(id: string): PersonalRecord | undefined {
  return PERSONAL_RECORDS.find((p) => p.id === id);
}

export function getBodyStat(key: BodyStat['key']): BodyStat | undefined {
  return BODY_STATS.find((s) => s.key === key);
}
