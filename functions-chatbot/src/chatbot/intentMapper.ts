import type { BroadIntent } from './types';

// Maps the fine-grained tag produced by the tfjs classifier (one of 43 tags
// in intents.json) to one of the 8 broad intents Gemini understands. The
// broad intent goes into the prompt so the model picks the right shape of
// answer (workout plan vs nutrition vs motivation vs ...). The fine tag is
// still saved alongside on the message for audit / future training.

const TAG_TO_BROAD: Record<string, BroadIntent> = {
  // workout_plan
  ask_plan_today: 'workout_plan',
  ask_workout_advice: 'workout_plan',
  ask_set_rep_scheme: 'workout_plan',
  form_check: 'workout_plan',
  progression_request: 'workout_plan',
  equipment_swap: 'workout_plan',
  swap_exercise: 'workout_plan',
  exercise_squat: 'workout_plan',
  exercise_deadlift: 'workout_plan',
  exercise_bench_press: 'workout_plan',
  exercise_pullup: 'workout_plan',
  cardio_advice: 'workout_plan',

  // nutrition_advice
  nutrition_question: 'nutrition_advice',
  nutrition_macros: 'nutrition_advice',
  hydration: 'nutrition_advice',
  supplement_question: 'nutrition_advice',

  // weight_loss
  weight_loss_tips: 'weight_loss',

  // muscle_gain
  muscle_gain_tips: 'muscle_gain',

  // motivation
  motivation: 'motivation',
  greeting: 'motivation',
  consult_me: 'motivation',
  progress_question: 'motivation',
  share_progress: 'motivation',

  // injury_warning
  injury_concern: 'injury_warning',
  rest_day_advice: 'injury_warning',
  sleep_recovery: 'injury_warning',

  // app_help
  app_help: 'app_help',
  app_navigation: 'app_help',
  log_question: 'app_help',
  quiz_request: 'app_help',
};

export function mapToBroadIntent(fineTag: string): BroadIntent {
  return TAG_TO_BROAD[fineTag] ?? 'general_chat';
}
