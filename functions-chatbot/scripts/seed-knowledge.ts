// One-time admin script that seeds the `fitness_knowledge` collection with
// ~25 vetted entries the Gemini-powered chatbot uses as grounding material.
//
// USAGE
//   1. Get a service account key with Firestore access (Firebase Console →
//      Project Settings → Service accounts → Generate new private key).
//   2. Save it locally, e.g. `~/.config/fit-admin.json`.
//   3. From `functions-chatbot/`:
//        $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"
//        npx ts-node scripts/seed-knowledge.ts
//
//   Re-runnable: documents use deterministic ids (slug of title), so re-runs
//   merge instead of duplicating.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

type SeedDoc = {
  title: string;
  category: string;
  content: string;
  tags: string[];
  goal?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  difficulty?: 'easy' | 'moderate' | 'hard';
  safetyNotes?: string;
  keywords: string[];
};

const DOCS: SeedDoc[] = [
  {
    title: 'Dynamic warm-up routine',
    category: 'workout',
    content:
      "Before any training session, spend 5-8 minutes warming up. Start with 2 min of easy cardio (jumping jacks, light jog, or skipping). Then do arm circles, leg swings, hip openers, and bodyweight squats. The goal is to raise core temperature, lubricate joints, and rehearse movement patterns at low load. Skip static stretching pre-workout — save it for cooldown.",
    tags: ['warmup', 'warm-up', 'mobility', 'pre-workout'],
    fitnessLevel: 'all',
    difficulty: 'easy',
    keywords: ['warm up', 'warmup', 'stretching', 'mobility', 'pre workout'],
  },
  {
    title: 'Protein basics for any goal',
    category: 'nutrition',
    content:
      'Aim for roughly 1.6-2.2 g of protein per kg of body weight per day to support recovery and muscle growth. A 70kg adult lands at 112-154 g/day. Spread it across 3-5 meals of 25-40 g each — your body uses protein best in moderate doses. Good sources: chicken, fish, eggs, lean beef, greek yogurt, tofu, lentils, whey.',
    tags: ['protein', 'macros', 'nutrition'],
    fitnessLevel: 'all',
    keywords: ['protein', 'how much protein', 'grams protein', 'protein intake'],
  },
  {
    title: 'Beginner full-body 3x/week workout',
    category: 'workout',
    content:
      'Train 3 non-consecutive days (e.g. Mon/Wed/Fri). Each session: squat or goblet squat 3x8, push-up or bench 3x8, row 3x10, hip hinge (Romanian deadlift) 3x8, plank 3x30s. Warm up first, leave 1-2 reps in the tank, and add a small amount of weight or one rep each week.',
    tags: ['beginner', 'full body', 'workout_plan', 'strength'],
    goal: 'general_fitness',
    fitnessLevel: 'beginner',
    difficulty: 'easy',
    keywords: ['beginner workout', 'full body', 'first workout', 'starter plan', 'beginner plan'],
  },
  {
    title: 'Weight loss principles',
    category: 'weight_loss',
    content:
      'Fat loss requires a modest, sustained calorie deficit (~300-500 kcal/day). Track food honestly for 1-2 weeks, prioritize protein (1.8 g/kg) to preserve muscle, lift weights 3+ times/week so the deficit comes from fat not muscle, walk 8-10k steps/day, and aim for 0.5-1 kg/week — anything faster usually rebounds. Sleep 7-9 h: poor sleep wrecks hunger hormones.',
    tags: ['weight_loss', 'fat_loss', 'deficit', 'cardio'],
    goal: 'lose_weight',
    fitnessLevel: 'all',
    safetyNotes: 'Never drop below ~1200 kcal/day (women) or ~1500 (men) without medical supervision.',
    keywords: ['lose weight', 'weight loss', 'fat loss', 'calorie deficit', 'cutting'],
  },
  {
    title: 'Muscle gain principles',
    category: 'muscle_gain',
    content:
      'Muscle requires three things: progressive overload (gradually add weight/reps/sets), enough protein (1.6-2.2 g/kg), and a small calorie surplus (~200-400 kcal above maintenance). Train each muscle 2x/week with 10-20 hard sets total. Sleep 7-9 h. Expect 0.25-0.5 kg of lean gain per month for beginners — anything faster is mostly fat or water.',
    tags: ['muscle_gain', 'hypertrophy', 'strength', 'bulk'],
    goal: 'build_muscle',
    fitnessLevel: 'all',
    keywords: ['muscle gain', 'build muscle', 'bulking', 'hypertrophy', 'gain muscle'],
  },
  {
    title: 'Post-workout meal',
    category: 'nutrition',
    content:
      "Within 1-2 hours after training, eat a meal with 30-40 g of protein and 50-80 g of carbs to refill glycogen and start recovery. Examples: grilled chicken + rice + veg, salmon + sweet potato, oats + whey + banana. The 'anabolic window' is wider than people think — total daily intake matters more than timing.",
    tags: ['nutrition', 'post-workout', 'recovery', 'meal'],
    fitnessLevel: 'all',
    keywords: ['after workout', 'post workout meal', 'recovery food', 'what to eat after gym'],
  },
  {
    title: 'Hydration guidelines',
    category: 'nutrition',
    content:
      'Drink ~30-40 ml of water per kg of body weight per day, plus an extra 500-1000 ml around training. Watch urine color — pale straw = good, dark yellow = catch up. Sweating heavily? Add electrolytes (sodium ~500 mg + potassium for long sessions). Don\'t over-drink: hyponatremia is real.',
    tags: ['hydration', 'water', 'electrolytes'],
    fitnessLevel: 'all',
    keywords: ['water', 'hydration', 'how much water', 'electrolytes'],
  },
  {
    title: 'Knee-friendly exercise alternatives',
    category: 'injury',
    content:
      'If your knees hurt, avoid jumping (burpees, box jumps), running on hard surfaces, deep squats below parallel, and lunges with heavy load. Safer alternatives: leg press to a comfortable depth, glute bridges, Romanian deadlifts, seated leg curls, swimming, cycling, and brisk walking on flat ground. Build the muscles around the knee — quads, hamstrings, glutes — to stabilize the joint.',
    tags: ['injury', 'knee', 'pain', 'alternatives', 'low_impact'],
    fitnessLevel: 'all',
    safetyNotes: 'Persistent knee pain warrants a physiotherapist visit before continuing training.',
    keywords: ['knee pain', 'bad knees', 'knee injury', 'knee friendly', 'low impact'],
  },
  {
    title: 'Lower-back-friendly exercise alternatives',
    category: 'injury',
    content:
      'Skip heavy barbell deadlifts, conventional bent-over rows, sit-ups, Russian twists, and weighted side bends until the pain settles. Replace with: glute bridges, bird-dogs, dead bugs, McGill curl-ups, hip thrusts (light), and supported single-arm dumbbell rows. Strengthen the core in neutral spine — most back pain improves with stronger glutes and trunk stability.',
    tags: ['injury', 'back', 'lumbar', 'pain', 'alternatives'],
    fitnessLevel: 'all',
    safetyNotes: 'Sharp or radiating back pain needs medical clearance before any loaded training.',
    keywords: ['back pain', 'lower back', 'back injury', 'lumbar', 'sciatica'],
  },
  {
    title: 'Shoulder-friendly exercise alternatives',
    category: 'injury',
    content:
      'Avoid heavy overhead press, behind-the-neck press, upright rows, and dips while shoulders are inflamed. Safer options: landmine press, dumbbell incline press at low angles, face pulls, band pull-aparts, and prone Y-T-W raises. Rotator cuff work (light external rotations) belongs in every warm-up.',
    tags: ['injury', 'shoulder', 'rotator_cuff', 'alternatives'],
    fitnessLevel: 'all',
    keywords: ['shoulder pain', 'shoulder injury', 'rotator cuff'],
  },
  {
    title: 'Sleep and recovery basics',
    category: 'recovery',
    content:
      'Most adults need 7-9 hours of sleep for optimal recovery and muscle growth. Sleep is when your nervous system resets and growth hormone peaks. Keep a consistent schedule, dim screens 1 h before bed, sleep in a cool dark room, and avoid caffeine after 2 pm. One bad night is fine; chronic 5-6 h sleep cuts strength gains by ~30%.',
    tags: ['recovery', 'sleep', 'mindset'],
    fitnessLevel: 'all',
    keywords: ['sleep', 'recovery', 'rest', 'tired', 'fatigue'],
  },
  {
    title: 'Handling a training plateau',
    category: 'workout',
    content:
      "Hit a wall? Plateaus usually mean one of: not enough recovery, the same program for too long, or insufficient calories. Try a 1-week deload (50-60% normal volume), then swap one exercise per movement pattern, ensure protein and sleep are dialed, and consider a small phase change (e.g. switch from 4x8 to 5x5). Track honestly — most 'plateaus' are inconsistent training.",
    tags: ['plateau', 'progression', 'mindset'],
    fitnessLevel: 'intermediate',
    keywords: ['plateau', 'stuck', 'no progress', 'not improving'],
  },
  {
    title: 'Deload week — when and how',
    category: 'recovery',
    content:
      'Every 4-8 weeks of hard training, take a deload: same exercises, but reduce intensity to ~60% and volume to ~50%. Lifts feel light, joints catch up, and you come back stronger. Deloads are not optional — most people deload only when forced to by burnout or minor injury.',
    tags: ['recovery', 'deload', 'programming'],
    fitnessLevel: 'intermediate',
    keywords: ['deload', 'rest week', 'recovery week', 'training break'],
  },
  {
    title: 'Creatine basics',
    category: 'supplement',
    content:
      'Creatine monohydrate is the most researched supplement: 3-5 g per day, any time, with any liquid. It boosts short-burst strength and may help cognition. No need to load. Side effects are minimal — slight water retention. Safe for healthy adults; ask a doctor if you have kidney issues.',
    tags: ['supplement', 'creatine', 'strength'],
    fitnessLevel: 'all',
    safetyNotes: 'Stay hydrated. Consult a doctor if you have kidney disease.',
    keywords: ['creatine', 'supplement', 'monohydrate'],
  },
  {
    title: 'Protein powder safety',
    category: 'supplement',
    content:
      "Protein powder (whey, casein, or plant) is food, not magic. Use it to hit your daily protein target when whole food isn't convenient. Look for third-party tested brands (Informed Sport, NSF). Lactose-intolerant? Use whey isolate or plant blends. Don't exceed 1-2 scoops per serving — your body absorbs only so much at once.",
    tags: ['supplement', 'protein', 'whey'],
    fitnessLevel: 'all',
    safetyNotes: 'Whole food first; supplement to fill gaps. Avoid unverified imports.',
    keywords: ['protein powder', 'whey', 'casein', 'supplement'],
  },
  {
    title: 'Bodyweight workout (no equipment)',
    category: 'workout',
    content:
      'Full session with zero kit: 3-4 rounds of push-ups x10-15, bodyweight squats x15-20, reverse lunges x10/leg, plank x30-45s, glute bridges x15, and superman holds x20s. Add jumping jacks between rounds if you want cardio. Progress by adding reps, slowing the tempo, or moving to single-leg variations.',
    tags: ['workout', 'bodyweight', 'no_equipment', 'home'],
    fitnessLevel: 'all',
    difficulty: 'easy',
    keywords: ['no equipment', 'bodyweight', 'home workout', 'no gym', 'no weights'],
  },
  {
    title: 'Cardio for fat loss',
    category: 'cardio',
    content:
      'For fat loss, cardio is a tool — not the goal. Walking 8-10k steps a day burns more cumulative calories than most HIIT sessions and is easier to recover from. Add 2-3 sessions of 20-30 min moderate cardio (zone 2) per week. Sprint intervals work too but only if you recover well from them. Lifting weights is non-negotiable — it tells the body to keep muscle while losing fat.',
    tags: ['cardio', 'weight_loss', 'fat_loss', 'walking'],
    goal: 'lose_weight',
    fitnessLevel: 'all',
    keywords: ['cardio', 'fat loss cardio', 'best cardio', 'walking', 'hiit'],
  },
  {
    title: 'Progressive overload',
    category: 'strength',
    content:
      'Muscle and strength grow when you progressively demand more — more weight, more reps, better form, or shorter rest. The simplest rule: try to beat your previous session by one rep, 1-2 kg, or one set each week. Once you can\'t, change one variable (rep range, tempo, exercise variation) and progress again.',
    tags: ['strength', 'muscle_gain', 'programming'],
    fitnessLevel: 'all',
    keywords: ['progressive overload', 'progress', 'how to get stronger'],
  },
  {
    title: 'Macros for fat loss',
    category: 'nutrition',
    content:
      "In a fat-loss phase, target: protein 1.8-2.4 g/kg (high to preserve muscle), fat 0.6-0.8 g/kg (don't drop below — hormones suffer), and carbs fill the remaining calories. Eat more carbs around workouts; lower them on rest days if appetite allows. Fiber 25-35 g/day helps with fullness.",
    tags: ['nutrition', 'macros', 'weight_loss'],
    goal: 'lose_weight',
    fitnessLevel: 'all',
    keywords: ['macros for cutting', 'fat loss macros', 'cutting nutrition'],
  },
  {
    title: 'Macros for muscle gain',
    category: 'nutrition',
    content:
      "For lean muscle gain, target: protein 1.6-2.0 g/kg, fat 0.8-1.0 g/kg, and carbs fill a 200-400 kcal surplus. Bigger surpluses = more fat gain, not more muscle. Track weight weekly; if it's climbing >0.5 kg/week, ease the surplus.",
    tags: ['nutrition', 'macros', 'muscle_gain'],
    goal: 'build_muscle',
    fitnessLevel: 'all',
    keywords: ['macros for bulking', 'muscle gain macros', 'bulk nutrition'],
  },
  {
    title: 'Squat form basics',
    category: 'exercise',
    content:
      "Stand with feet shoulder-width, toes slightly turned out. Brace your core, hinge at hips and knees together, push knees out over toes, keep chest up. Descend until thighs are at least parallel to the floor — depth depends on hip mobility. Drive the floor away on the way up. If knees cave or back rounds, the weight is too heavy or you need mobility work.",
    tags: ['exercise', 'squat', 'form', 'strength'],
    fitnessLevel: 'all',
    safetyNotes: 'Use a rack with safety pins for heavy squats, or stick to goblet squats with dumbbells.',
    keywords: ['squat', 'squat form', 'how to squat'],
  },
  {
    title: 'Deadlift form basics',
    category: 'exercise',
    content:
      "Stand with the bar over mid-foot, feet hip-width. Hinge at the hips, grip just outside knees, drop hips so shins touch the bar, chest up, lats tight. Push the floor away — bar slides up your shins to your thighs. Stand fully, then reverse. Keep the bar close throughout. Don't round your lower back; if you can't keep neutral, lower the weight.",
    tags: ['exercise', 'deadlift', 'form', 'strength'],
    fitnessLevel: 'intermediate',
    safetyNotes: 'Lower-back rounding under load is the #1 cause of deadlift injury. Reduce weight at first sign.',
    keywords: ['deadlift', 'deadlift form', 'how to deadlift'],
  },
  {
    title: 'Bench press form basics',
    category: 'exercise',
    content:
      "Lie back, eyes under the bar, feet planted. Arch the upper back slightly, retract shoulder blades 'down and back' against the bench. Grip just outside shoulder width. Unrack, lower the bar to mid-chest with a slight elbow tuck, touch (don't bounce), then press up and slightly back. Always use a spotter or safety pins for working sets.",
    tags: ['exercise', 'bench', 'form', 'strength'],
    fitnessLevel: 'all',
    safetyNotes: 'Never bench heavy without a spotter or safety pins — pin-under-bar is a real injury.',
    keywords: ['bench press', 'bench form', 'how to bench'],
  },
  {
    title: 'Pull-up progression',
    category: 'exercise',
    content:
      "Can't do a pull-up yet? Build up: 1) dead hangs 3x20-30s, 2) scapular pull-ups 3x8, 3) band-assisted pull-ups 3x6-8 (smaller band over time), 4) negatives — jump to the top, lower for 5 seconds, 3x5. Practice 3-4x/week. Most people can do their first full pull-up in 6-10 weeks.",
    tags: ['exercise', 'pullup', 'pull-up', 'progression'],
    fitnessLevel: 'beginner',
    keywords: ['pull up', 'pullup', 'first pull up', 'pull up progression'],
  },
  {
    title: 'Mindset and consistency',
    category: 'motivation',
    content:
      "Motivation is unreliable; consistency is the goal. Schedule training like meetings, lay out clothes the night before, and aim for 80% adherence — not 100%. Missed one session? Move on, don't double up the next day. Track only what you can measure (workouts logged, body weight, key lifts). Progress over months beats intensity over weeks.",
    tags: ['motivation', 'mindset', 'consistency'],
    fitnessLevel: 'all',
    keywords: ['motivation', 'consistency', 'mindset', 'discipline', 'stay motivated'],
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function main(): Promise<void> {
  console.log(`Seeding ${DOCS.length} knowledge docs…`);
  const batch = db.batch();
  for (const doc of DOCS) {
    const id = slugify(doc.title);
    const ref = db.doc(`fitness_knowledge/${id}`);
    batch.set(
      ref,
      {
        ...doc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  + ${id}`);
  }
  await batch.commit();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
