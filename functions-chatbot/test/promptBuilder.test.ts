import { buildGeminiPrompt } from '../src/chatbot/promptBuilder';
import type { PersonalContext } from '../src/personalize';

function build(personal: Partial<Record<string, string>>) {
  return buildGeminiPrompt({
    message: 'what should I do today?',
    personal: personal as PersonalContext,
    memory: { userId: 'u1' } as never,
    knowledge: [],
    intent: 'todays_workout',
    safety: { level: 'none' } as never,
    history: [],
  }).userPrompt;
}

describe('buildGeminiPrompt — new blocks', () => {
  it('renders the CURRENT WORKOUT PLAN block from tokens', () => {
    const p = build({
      planGoal: 'fat loss',
      planDaysPerWeek: '4',
      planSessionMinutes: '45',
      planCompletedThisWeek: '2',
      planPlannedThisWeek: '4',
      todayPlanLine: 'Day 3, Back + Arms, 5 exercises',
      todayPlanExercises: '1. Seated Cable Rows — 4x12 — back — cable',
    });
    expect(p).toContain('CURRENT WORKOUT PLAN');
    expect(p).toContain('- Plan goal: fat loss');
    expect(p).toContain('- Completed this week: 2/4');
    expect(p).toContain("Today's workout: Day 3, Back + Arms, 5 exercises");
    expect(p).toContain('Seated Cable Rows');
  });

  it('renders the LATEST WEIGHT UPDATE block from tokens', () => {
    const p = build({
      wuCurrentKg: '74.2',
      wuDeltaSinceLastKg: 'down 0.6',
      wuDelta30dKg: 'down 1.4',
      wuCurrentWeekCalories: '1240',
      wuMostActiveWeek: 'May 5 - May 11',
      wuMostActiveWeekCalories: '1540',
      wuTopExercises: 'Pushups',
    });
    expect(p).toContain('LATEST WEIGHT UPDATE');
    expect(p).toContain('- Current weight: 74.2 kg');
    expect(p).toContain('- Change since last weigh-in: down 0.6 kg');
    expect(p).toContain('Most active week: May 5 - May 11 (1540 kcal)');
  });

  it('falls back gracefully when tokens are missing/em-dash', () => {
    const p = build({ goal: 'general fitness', wuCurrentKg: '—' });
    expect(p).toContain('CURRENT WORKOUT PLAN');
    expect(p).toContain('LATEST WEIGHT UPDATE');
    expect(p).toContain('- Current weight: unknown kg');
  });

  it('renders the PROGRESS ANALYSIS block when analysis is available', () => {
    const p = build({
      analysisAvailable: '1',
      weightVelocityKgPerWeek: 'down ~0.8 kg/week',
      weightGoalAlignment: 'on track for the goal',
      currentWeekWorkouts: '4',
      currentWeekMinutes: '180',
      currentWeekAdherence: '100%',
      bestWeekSummary: '5 workouts, 220 min',
      muscleBalanceNote: 'chest leads at 38% of sets; legs least-trained',
      topExerciseProgress: 'Bench Press, best 80kg, avg RPE 8.0',
      stallNote: 'progressing normally — no plateau detected',
      coachSuggestions: 'Add a leg day.',
    });
    expect(p).toContain('PROGRESS ANALYSIS');
    expect(p).toContain('down ~0.8 kg/week');
    expect(p).toContain('chest leads at 38% of sets');
    expect(p).toContain('Bench Press, best 80kg');
  });

  it('shows the not-enough-data line when analysis is unavailable', () => {
    const p = build({ analysisAvailable: '0' });
    expect(p).toContain('PROGRESS ANALYSIS');
    expect(p).toMatch(/not enough logged data/i);
  });

  it('includes the domain gate and data-analysis rules in the system instruction', () => {
    const { systemInstruction } = buildGeminiPrompt({
      message: 'x',
      personal: {} as PersonalContext,
      memory: { userId: 'u1' } as never,
      knowledge: [],
      intent: 'general_chat',
      safety: { level: 'none' } as never,
      history: [],
    });
    expect(systemInstruction).toContain('DOMAIN GATE');
    expect(systemInstruction).toContain('DATA-DRIVEN ANALYSIS');
  });
});
