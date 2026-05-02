import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { xpForExercise, xpForWorkout } from '@/lib/gamification';
import { captureException } from '@/lib/observability';
import { recordCompletedWorkout } from '@/lib/workouts';

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
  const [weight, setWeight] = useState('20');
  const [duration, setDuration] = useState('30');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save your entry.');
      return;
    }
    if (saving) return;
    const durationMin = Math.max(0, Math.round(Number(duration) || 0));
    const exerciseXpSum = xpForExercise(sets, reps);
    const workoutXp = xpForWorkout({ exerciseXpSum, durationMin });
    const caloriesKcal = Math.round(durationMin * CALORIES_PER_MINUTE);

    setSaving(true);
    try {
      await recordCompletedWorkout(user.uid, {
        durationMin,
        caloriesKcal,
        exercisesCompleted: 1,
        xp: workoutXp,
        exercises: [
          {
            name: exercise.name,
            primaryMuscle: exercise.muscle,
            plannedSets: sets,
            plannedReps: reps,
            actualSets: sets,
          },
        ],
        source: 'manual_log',
        setPlanStartDate: !profile.planStartDate,
      });

      const prevStats = profile.stats ?? {
        totalWorkouts: 0,
        totalMinutes: 0,
        totalCaloriesKcal: 0,
        totalXp: 0,
      };
      const unlocked = await checkAndUnlockAchievements(user.uid, {
        totalWorkouts: (prevStats.totalWorkouts ?? 0) + 1,
        totalMinutes: (prevStats.totalMinutes ?? 0) + durationMin,
        totalXp: (prevStats.totalXp ?? 0) + workoutXp,
        longestStreak,
        weightLogCount: measurements.length,
      });

      const unlockedLine =
        unlocked.length > 0
          ? `\n\nUnlocked: ${unlocked.map((a) => a.title).join(', ')}`
          : '';

      Alert.alert(
        'Entry saved',
        `${exercise.name}\n${sets} × ${reps} @ ${weight} kg · RPE ${rpe} · ${durationMin} min\n+${workoutXp} XP${unlockedLine}`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      captureException(e, {
        tags: { area: 'workout', op: 'manualLog' },
        context: { uid: user.uid, exerciseId: exercise.id },
      });
      Alert.alert('Could not save', 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const Stepper = ({
    value,
    onChange,
    min = 1,
    max = 99,
  }: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
  }) => (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Ionicons name="remove" size={16} color={COLORS.primary} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Ionicons name="add" size={16} color={COLORS.primary} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Log Workout</Text>
        <View style={{ width: 40 }} />
      </View>

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

        <View style={styles.rowFields}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Sets</Text>
            <Stepper value={sets} onChange={setSets} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Reps</Text>
            <Stepper value={reps} onChange={setReps} max={60} />
          </View>
        </View>

        <View style={styles.rowFields}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.muted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Duration (min)</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.muted}
            />
          </View>
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

        <View style={{ height: 8 }} />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save Entry'}
          onPress={onSave}
          icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
        />
      </ScrollView>

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
