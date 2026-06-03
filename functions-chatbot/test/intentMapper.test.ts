import { mapToBroadIntent } from '../src/chatbot/intentMapper';

// Guards the no-retrain remap: existing fine tags must route to the NEW broad
// intents so plan/weight features are reachable without retraining the model.
describe('mapToBroadIntent — remapped fine tags', () => {
  it.each([
    ['ask_plan_today', 'todays_workout'],
    ['swap_exercise', 'exercise_substitution'],
    ['equipment_swap', 'exercise_substitution'],
    ['form_check', 'exercise_form'],
    ['exercise_squat', 'exercise_form'],
    ['exercise_deadlift', 'exercise_form'],
    ['progression_request', 'exercise_stats'],
    ['progress_question', 'weight_progress'],
    ['share_progress', 'weight_progress'],
  ])('%s -> %s', (tag, expected) => {
    expect(mapToBroadIntent(tag)).toBe(expected);
  });

  it('leaves unrelated tags unchanged', () => {
    expect(mapToBroadIntent('nutrition_question')).toBe('nutrition_advice');
    expect(mapToBroadIntent('motivation')).toBe('motivation');
    expect(mapToBroadIntent('ask_workout_advice')).toBe('workout_plan');
    expect(mapToBroadIntent('unknown_tag')).toBe('general_chat');
  });

  it('routes the off_topic tag to its own broad intent', () => {
    expect(mapToBroadIntent('off_topic')).toBe('off_topic');
  });
});
