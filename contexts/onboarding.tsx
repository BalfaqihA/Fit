import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
} from 'react';

import type {
  EquipmentKey,
  FitnessLevel,
  Gender,
  GoalKey,
} from '@/types/community';

export type OnboardingAnswers = {
  age: number | null;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: GoalKey | null;
  level: FitnessLevel | null;
  equipment: EquipmentKey | null;
  sessionMinutes: number | null;
  daysPerWeek: number | null;
};

export type OnboardingMode = 'full' | 'change';

const EMPTY: OnboardingAnswers = {
  age: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  goal: null,
  level: null,
  equipment: null,
  sessionMinutes: null,
  daysPerWeek: null,
};

type OnboardingContextValue = {
  answers: OnboardingAnswers;
  mode: OnboardingMode;
  setAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K]
  ) => void;
  setMode: (mode: OnboardingMode) => void;
  reset: () => void;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY);
  const [mode, setMode] = useState<OnboardingMode>('full');

  const setAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setAnswers(EMPTY);
    setMode('full');
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ answers, mode, setAnswer, setMode, reset }),
    [answers, mode, setAnswer, reset]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

const EQUIPMENT_PRIORITY: EquipmentKey[] = [
  'full-gym',
  'barbell',
  'dumbbells',
  'kettlebell',
  'bands',
  'body',
];

/** Reduce a multi-select equipment Set to the single highest-capability key. */
export function pickPrimaryEquipment(
  selected: Iterable<string>
): EquipmentKey {
  const set = new Set(Array.from(selected));
  for (const key of EQUIPMENT_PRIORITY) {
    if (set.has(key)) return key;
  }
  return 'body';
}
