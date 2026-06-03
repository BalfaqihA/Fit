import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  CALORIES_PER_MINUTE,
  EXERCISES,
  type Exercise,
} from '@/constants/workout-data';
import { useAuth } from '@/hooks/use-auth';
import { useMeasurements } from '@/hooks/use-measurements';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { xpForExercise, xpForWorkout } from '@/lib/gamification';
import { captureException } from '@/lib/observability';
import { parseDurationMin } from '@/lib/validation';
import { randomId } from '@/lib/uuid';
import { recordCompletedWorkout } from '@/lib/workouts';

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Styles = ReturnType<typeof makeStyles>;

// Module-scope component so React doesn't unmount the +/- pressables on
// every render of the parent.
function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  styles,
  primaryColor,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  styles: Styles;
  primaryColor: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Ionicons name="remove" size={16} color={primaryColor} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Ionicons name="add" size={16} color={primaryColor} />
      </Pressable>
    </View>
  );
}

export default function WorkoutLog() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { longestStreak } = useWeeklyStats();
  const { measurements } = useMeasurements();

  const [exercise, setExercise] = useState<Exercise>(EXERCISES[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('30');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const { run: runSave, pending: saving } = useSubmit();

  // Draft autosave — survives the app being backgrounded mid-entry. Keyed per
  // user so two accounts on the same device don't see each other's draft.
  // Hydrates exactly once after mount; subsequent edits persist debounced.
  const draftKey = user ? `workout-log-draft:${user.uid}` : null;
  const draftHydrated = useRef(false);
  useEffect(() => {
    if (!draftKey || draftHydrated.current) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (cancelled || !raw) {
          draftHydrated.current = true;
          return;
        }
        const d = JSON.parse(raw) as Partial<{
          exerciseId: string;
          sets: number;
          reps: number;
          weight: string;
          duration: string;
          rpe: number;
          notes: string;
        }>;
        if (d.exerciseId) {
          const found = EXERCISES.find((e) => e.id === d.exerciseId);
          if (found) setExercise(found);
        }
        if (typeof d.sets === 'number') setSets(d.sets);
        if (typeof d.reps === 'number') setReps(d.reps);
        if (typeof d.weight === 'string') setWeight(d.weight);
        if (typeof d.duration === 'string') setDuration(d.duration);
        if (typeof d.rpe === 'number') setRpe(d.rpe);
        if (typeof d.notes === 'string') setNotes(d.notes);
      } catch {
        // Draft is best-effort — silently ignore a malformed entry.
      } finally {
        draftHydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftHydrated.current) return;
    const t = setTimeout(() => {
      const payload = {
        exerciseId: exercise.id,
        sets,
        reps,
        weight,
        duration,
        rpe,
        notes,
      };
      AsyncStorage.setItem(draftKey, JSON.stringify(payload)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [draftKey, exercise, sets, reps, weight, duration, rpe, notes]);

  const weightUnit = profile.weightUnit ?? 'kg';

  const onSave = () =>
    runSave(async () => {
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to save your entry.');
        return;
      }
      const parsedDuration = parseDurationMin(duration);
      if (!parsedDuration.ok) {
        Alert.alert('Invalid duration', parsedDuration.error);
        return;
      }
      const durationMin = parsedDuration.value;
      const exerciseXpSum = xpForExercise(sets, reps);
      const workoutXp = xpForWorkout({ exerciseXpSum, durationMin });
      const caloriesKcal = Math.round(durationMin * CALORIES_PER_MINUTE);

      // Weight is optional in the manual log (it's the load you lifted, which
      // can be anything from light dumbbells to a heavy barbell — or blank for
      // bodyweight). Only validate if the user typed something non-zero.
      const weightTrimmed = weight.trim();
      const hasWeight = weightTrimmed !== '' && weightTrimmed !== '0';
      let rawWeight = 0;
      if (hasWeight) {
        const n = Number(weightTrimmed);
        if (!Number.isFinite(n) || n < 0 || n > 1000) {
          Alert.alert(
            'Invalid weight',
            `Enter a weight between 0 and 1000 ${weightUnit}, or leave it blank.`
          );
          return;
        }
        rawWeight = n;
      }
      // Store weight canonically in kg regardless of the user's display unit.
      const weightKg = weightUnit === 'lb' ? rawWeight * 0.45359237 : rawWeight;
      const trimmedNotes = notes.trim();

      try {
        await recordCompletedWorkout(user.uid, {
          idempotencyKey: randomId(),
          durationMin,
          caloriesKcal,
          exercisesCompleted: 1,
          xp: workoutXp,
          exercises: [
            {
              exerciseId: exercise.id,
              name: exercise.name,
              primaryMuscle: exercise.muscle,
              secondaryMuscles: exercise.secondaryMuscles,
              category: exercise.category,
              equipment: exercise.equipment,
              plannedSets: sets,
              plannedReps: reps,
              actualSets: sets,
              actualReps: reps,
              rpe,
              // Single-exercise log: the whole session's duration/calories/xp
              // belong to this one exercise.
              durationMin,
              caloriesKcal,
              xp: exerciseXpSum,
              ...(rawWeight > 0
                ? { weightKg: Math.round(weightKg * 100) / 100 }
                : {}),
            },
          ],
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
          source: 'manual_log',
          setPlanStartDate: !profile.planStartDate,
        });

        // Successful save — drop the draft so a fresh entry starts blank.
        if (draftKey) {
          AsyncStorage.removeItem(draftKey).catch(() => {});
        }

        const prevStats = profile.stats ?? {
          totalWorkouts: 0,
          totalMinutes: 0,
          totalCaloriesKcal: 0,
          totalXp: 0,
        };
        // A manual log does NOT count toward the completed-workout total, so we
        // evaluate achievements against the *unchanged* workout count (minutes,
        // XP, and streak still progress and can unlock their achievements).
        const unlocked = await checkAndUnlockAchievements(user.uid, {
          totalWorkouts: prevStats.totalWorkouts ?? 0,
          totalMinutes: (prevStats.totalMinutes ?? 0) + durationMin,
          totalXp: (prevStats.totalXp ?? 0) + workoutXp,
          longestStreak,
          weightLogCount: measurements.length,
        });

        const unlockedLine =
          unlocked.length > 0
            ? `\n\nUnlocked: ${unlocked.map((a) => a.title).join(', ')}`
            : '';

        const weightStr = rawWeight > 0 ? ` @ ${weightTrimmed} ${weightUnit}` : '';
        Alert.alert(
          'Workout logged',
          `${exercise.name}\n${sets} × ${reps}${weightStr} · ${durationMin} min\n+${workoutXp} XP · saved to your history${unlockedLine}`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } catch (e) {
        captureException(e, {
          tags: { area: 'workout', op: 'manualLog' },
          context: { uid: user.uid, exerciseId: exercise.id },
        });
        // Offer an in-place retry instead of just dismissing — the typed
        // payload is still in component state, so re-running onSave reuses it.
        Alert.alert(
          'Could not save',
          'Saving your entry failed. Your inputs are still here — tap Retry to try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => onSave() },
          ],
        );
      }
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Log Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={[styles.input, styles.inputRow]}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
            <Text style={styles.inputText}>{today}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Exercise</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={[styles.input, styles.inputRow]}>
            <Ionicons name="barbell-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.inputText, { flex: 1 }]} numberOfLines={1}>
              {exercise.name}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Duration (min)</Text>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            style={styles.input}
            placeholder="30"
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.hint}>
            Pick the exercise and how long you trained — that&apos;s all you
            need. Logged workouts are saved to your history and earn XP, but
            don&apos;t count toward your completed-workout total.
          </Text>
        </View>

        <Pressable
          style={styles.detailsToggle}
          onPress={() => setShowDetails((v) => !v)}
        >
          <Ionicons
            name={showDetails ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.detailsToggleText}>
            Add details (sets, reps, weight, effort)
          </Text>
        </Pressable>

        {showDetails && (
          <>
            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Sets</Text>
                <Stepper
                  value={sets}
                  onChange={setSets}
                  styles={styles}
                  primaryColor={COLORS.primary}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Reps</Text>
                <Stepper
                  value={reps}
                  onChange={setReps}
                  max={60}
                  styles={styles}
                  primaryColor={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Weight ({weightUnit}) · optional</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Leave blank for bodyweight"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Perceived effort (RPE)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {RPE.map((r) => {
                  const active = r === rpe;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRpe(r)}
                      style={[styles.rpeChip, active && styles.rpeChipActive]}
                    >
                      <Text style={[styles.rpeText, active && { color: '#FFFFFF' }]}>{r}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Felt strong today — bumped the top set."
                placeholderTextColor={COLORS.muted}
                style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
              />
            </View>
          </>
        )}

        <View style={{ height: 8 }} />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save Entry'}
          onPress={onSave}
          icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
        />
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pick an exercise</Text>
            <FlatList
              data={EXERCISES}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setExercise(item);
                    setReps(item.reps ?? reps);
                    setSets(item.sets);
                    setPickerOpen(false);
                  }}
                  style={styles.modalRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle}>{item.name}</Text>
                    <Text style={styles.modalRowMeta}>
                      {item.muscle} · {item.level}
                    </Text>
                  </View>
                  {item.id === exercise.id && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
            />
            <Pressable onPress={() => setPickerOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    scroll: { padding: 20, paddingBottom: 40 },
    field: { marginBottom: 14 },
    rowFields: { flexDirection: 'row', gap: 10 },
    hint: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 8,
      marginLeft: 4,
      lineHeight: 17,
    },
    detailsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      marginBottom: 6,
    },
    detailsToggleText: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.primary,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: COLORS.text,
      ...SHADOWS.card,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    inputText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 8,
      paddingVertical: 8,
      ...SHADOWS.card,
    },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepValue: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    rpeChip: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    rpeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    rpeText: { fontSize: 14, fontWeight: '800', color: COLORS.muted },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: COLORS.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '80%',
    },
    modalHandle: {
      width: 48,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 12,
    },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    modalRowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    modalRowMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '600' },
    modalSep: { height: 1, backgroundColor: COLORS.divider },
    modalClose: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCloseText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  });
