import type { GoalKey } from '@/types/community';

export type GoalMeta = {
  key: GoalKey;
  title: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
};

export const GOAL_META: Record<GoalKey, GoalMeta> = {
  lose_weight: {
    key: 'lose_weight',
    title: 'Lose Weight',
    subtitle: 'Burn fat and reach your ideal body weight',
    iconName: 'scale-bathroom',
    iconColor: '#FF5A64',
    iconBg: '#FFE1E1',
  },
  build_muscle: {
    key: 'build_muscle',
    title: 'Build Muscle',
    subtitle: 'Gain strength and increase muscle mass',
    iconName: 'dumbbell',
    iconColor: '#6C56D9',
    iconBg: '#EDE8F8',
  },
  stay_fit: {
    key: 'stay_fit',
    title: 'Stay Fit',
    subtitle: 'Maintain your current fitness and health',
    iconName: 'meditation',
    iconColor: '#0C7A8A',
    iconBg: '#E8E3E1',
  },
  increase_endurance: {
    key: 'increase_endurance',
    title: 'Increase Endurance',
    subtitle: 'Boost stamina and cardiovascular fitness',
    iconName: 'run-fast',
    iconColor: '#E0B400',
    iconBg: '#FFF3E0',
  },
  improve_flexibility: {
    key: 'improve_flexibility',
    title: 'Improve Flexibility',
    subtitle: 'Enhance mobility and reduce injury risk',
    iconName: 'human-handsup',
    iconColor: '#8A43CC',
    iconBg: '#F2E9FF',
  },
};

export const GOAL_LIST: GoalMeta[] = [
  GOAL_META.lose_weight,
  GOAL_META.build_muscle,
  GOAL_META.stay_fit,
  GOAL_META.increase_endurance,
  GOAL_META.improve_flexibility,
];
