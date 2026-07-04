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

  it('instructs the model to always answer in-domain, honor counts, and name exercises', () => {
    const { systemInstruction } = buildGeminiPrompt({
      message: 'give me two morning exercises',
      personal: {} as PersonalContext,
      memory: { userId: 'u1' } as never,
      knowledge: [],
      intent: 'workout_plan',
      safety: { level: 'none' } as never,
      history: [],
    });
    expect(systemInstruction).toContain('ALWAYS ANSWER IN-DOMAIN');
    expect(systemInstruction).toContain('HONOR REQUESTED COUNTS');
    expect(systemInstruction).toContain('EXERCISE REQUESTS');
  });

  it('renders the user profile block, including reported injuries', () => {
    const p = build({
      firstName: 'Sam',
      goal: 'muscle gain',
      fitnessLevel: 'intermediate',
      equipment: 'full gym',
      injuries: 'left shoulder impingement',
      currentWeightKg: '80',
    });
    expect(p).toContain('USER PROFILE');
    expect(p).toContain('- Name: Sam');
    expect(p).toContain('- Injuries / limitations: left shoulder impingement');
  });
});

describe('buildGeminiPrompt — memory / knowledge / history / safety blocks', () => {
  const base = {
    message: 'help me train',
    personal: {} as PersonalContext,
    knowledge: [],
    intent: 'workout_plan' as const,
    safety: { level: 'none' } as never,
    history: [],
  };

  it('renders chat memory fields when present', () => {
    const p = buildGeminiPrompt({
      ...base,
      memory: {
        userId: 'u1',
        summary: 'Wants to bulk',
        lastGoal: 'muscle gain',
        lastRecommendedWorkout: 'Push day with bench focus',
        dislikedExercises: ['burpees', 'running'],
        preferredTone: 'motivational',
      } as never,
    }).userPrompt;
    expect(p).toContain('CHAT MEMORY');
    expect(p).toContain('Summary: Wants to bulk');
    expect(p).toContain('Last goal discussed: muscle gain');
    expect(p).toContain('Last recommended workout: Push day with bench focus');
    expect(p).toContain('Disliked exercises (avoid): burpees, running');
    expect(p).toContain('Preferred tone: motivational');
  });

  it('shows a placeholder when memory summary is empty', () => {
    const p = buildGeminiPrompt({ ...base, memory: { userId: 'u1' } as never }).userPrompt;
    expect(p).toMatch(/Summary: \(none yet\)/);
  });

  it('renders retrieved knowledge with category, safety note and truncation', () => {
    const longContent = 'x'.repeat(500);
    const p = buildGeminiPrompt({
      ...base,
      memory: { userId: 'u1' } as never,
      knowledge: [
        {
          id: 'k1',
          title: 'Protein basics',
          category: 'nutrition',
          content: longContent,
          safetyNotes: 'consult a doctor for kidney issues',
        } as never,
      ],
    }).userPrompt;
    expect(p).toContain('KNOWLEDGE BASE');
    expect(p).toContain('[Protein basics] (nutrition)');
    expect(p).toContain('[safety: consult a doctor for kidney issues]');
    expect(p).toContain('…'); // content truncated at 350 chars
    expect(p).not.toContain('x'.repeat(400));
  });

  it('notes when no knowledge entries matched', () => {
    const p = buildGeminiPrompt({ ...base, memory: { userId: 'u1' } as never }).userPrompt;
    expect(p).toMatch(/no matching entries/i);
  });

  it('renders only the last 5 conversation turns, truncating long text', () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      from: i % 2 === 0 ? ('user' as const) : ('bot' as const),
      text: `turn ${i} ${'z'.repeat(300)}`,
    }));
    const p = buildGeminiPrompt({ ...base, memory: { userId: 'u1' } as never, history }).userPrompt;
    expect(p).toContain('RECENT CONVERSATION (last 5 turns)');
    expect(p).not.toContain('turn 0'); // dropped (only last 5 kept)
    expect(p).toContain('turn 6');
    expect(p).toContain('…'); // long turn text truncated at 250 chars
  });

  it('shows the first-message placeholder when history is empty', () => {
    const p = buildGeminiPrompt({ ...base, memory: { userId: 'u1' } as never }).userPrompt;
    expect(p).toMatch(/first message of this session/i);
  });

  it('surfaces a caution safety level with its reason', () => {
    const p = buildGeminiPrompt({
      ...base,
      memory: { userId: 'u1' } as never,
      safety: { level: 'caution', reason: 'localized knee pain' } as never,
    }).userPrompt;
    expect(p).toContain('SAFETY LEVEL: caution — localized knee pain');
  });
});
