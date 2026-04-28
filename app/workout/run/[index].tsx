import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { RepTracker } from '@/components/rep-tracker';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useWorkoutSession } from '@/contexts/workout-session';
import { useTheme } from '@/hooks/use-theme';
import { exerciseImageUrl } from '@/lib/exercises';
import { exerciseXp } from '@/lib/workouts';

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Map raw plan-exercise muscle keys (e.g. "abdominals", "quadriceps") to a
// coarse group used for the badge color and icon.
const MUSCLE_GROUP: Record<string, string> = {
  chest: 'Chest',
  middle_back: 'Back',
  lower_back: 'Back',
  lats: 'Back',
  traps: 'Back',
  abdominals: 'Core',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  calves: 'Legs',
  glutes: 'Legs',
  shoulders: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  neck: 'Full Body',
};

const GROUP_COLOR: Record<string, string> = {
  Chest: '#FF6B7A',
  Back: '#4EA3FF',
  Legs: '#2EC07E',
  Shoulders: '#F4A93B',
  Arms: '#9B6BFF',
  Core: '#FF8A3D',
};

const GROUP_ICON: Record<string, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

export default function RunExercise() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { index } = useLocalSearchParams<{ index: string }>();
  const idx = Number(index ?? '0');

  const {
    session,
    planExercises,
    totalCount,
    completeCurrent,
    reset,
    minutes,
    calories,
  } = useWorkoutSession();

  const exercise = planExercises[idx];

  if (!session.isActive || !exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton onPress={() => router.replace('/(tabs)')} />
          <Text style={styles.headerTitle}>No active session</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="barbell-outline" size={42} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Nothing in progress</Text>
          <Text style={styles.emptyMeta}>
            Start a workout from the home page to begin.
          </Text>
          <View style={{ height: 16 }} />
          <PrimaryButton
            label="Go Home"
            onPress={() => router.replace('/(tabs)')}
            icon={<Ionicons name="home-outline" size={18} color="#fff" />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const primaryRaw = exercise.primaryMuscles[0]?.toLowerCase() ?? '';
  const group = MUSCLE_GROUP[primaryRaw] ?? 'Full Body';
  const color = GROUP_COLOR[group] ?? COLORS.primary;
  const xp = exerciseXp(exercise);

  const screenW = Dimensions.get('window').width;
  const imageW = screenW - 40;

  const isLast = idx + 1 >= totalCount;
  const progress = (idx + 1) / totalCount;

  const onClose = () => {
    Alert.alert('Quit workout?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Quit',
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const onNext = () => {
    if (isLast) {
      const done = session.completedCount + 1;
      const totalXp = Math.max(
        50,
        session.accumulatedXp + xp + minutes * 3 + 50
      );
      router.replace({
        pathname: '/workout/summary',
        params: {
          duration: String(Math.max(1, minutes)),
          calories: String(calories),
          done: String(done),
          xp: String(totalXp),
          planId: session.planId ?? '',
          dayNum: session.dayNum != null ? String(session.dayNum) : '',
        },
      });
    } else {
      completeCurrent(xp);
      router.replace('/workout/rest');
    }
  };

  const imageUrls = exercise.images.map(exerciseImageUrl);
  const equipmentLabel = exercise.equipment ? titleCase(exercise.equipment) : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Exercise {idx + 1} of {totalCount}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
        >
          {imageUrls.length === 0 ? (
            <View
              style={[
                styles.imageBox,
                { width: imageW, backgroundColor: color + '22' },
              ]}
            >
              <MaterialCommunityIcons
                name={(GROUP_ICON[group] ?? 'dumbbell') as never}
                size={84}
                color={color}
              />
            </View>
          ) : (
            imageUrls.map((url, i) => (
              <View
                key={url}
                style={[
                  styles.imageBox,
                  { width: imageW, backgroundColor: COLORS.card },
                ]}
              >
                <Image
                  source={{ uri: url }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={150}
                />
                <Text style={styles.imageLabel}>
                  {imageUrls.length > 1
                    ? i === 0
                      ? 'Start position'
                      : i === imageUrls.length - 1
                        ? 'End position'
                        : `Step ${i + 1}`
                    : 'Position'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <Text style={styles.title}>{exercise.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{group}</Text>
          </View>
          {equipmentLabel ? (
            <View style={styles.badgeOutline}>
              <Text style={styles.badgeOutlineText}>{equipmentLabel}</Text>
            </View>
          ) : null}
          {exercise.category ? (
            <View style={styles.badgeOutline}>
              <Text style={styles.badgeOutlineText}>
                {titleCase(exercise.category)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.metricValue}>
              {exercise.sets} × {exercise.reps}
            </Text>
            <Text style={styles.metricLabel}>Sets × Reps</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
            <Text style={styles.metricValue}>+{xp}</Text>
            <Text style={styles.metricLabel}>XP</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="flame-outline" size={18} color={COLORS.primary} />
            <Text style={styles.metricValue}>{calories}</Text>
            <Text style={styles.metricLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Track Your Sets</Text>
          <RepTracker exercise={exercise} COLORS={COLORS} />
        </View>

        {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Muscles Targeted</Text>
            <View style={styles.muscleRow}>
              {exercise.primaryMuscles.map((m) => (
                <View
                  key={`p-${m}`}
                  style={[styles.musclePill, { backgroundColor: color + '22' }]}
                >
                  <Text style={[styles.musclePillText, { color }]}>
                    {titleCase(m)} · primary
                  </Text>
                </View>
              ))}
              {exercise.secondaryMuscles.map((m) => (
                <View key={`s-${m}`} style={styles.musclePillOutline}>
                  <Text style={styles.musclePillOutlineText}>
                    {titleCase(m)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Muscles Targeted</Text>
            <View style={styles.muscleRow}>
              {exercise.primaryMuscles.map((m) => (
                <View
                  key={`p-${m}`}
                  style={[styles.musclePill, { backgroundColor: color + '22' }]}
                >
                  <Text style={[styles.musclePillText, { color }]}>
                    {titleCase(m)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {exercise.instructions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Instructions</Text>
            {exercise.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={isLast ? 'Finish Workout' : 'Next Exercise'}
          onPress={onNext}
          icon={
            <Ionicons
              name={isLast ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#fff"
            />
          }
        />
      </View>
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
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    progressTrack: {
      height: 4,
      marginHorizontal: 20,
      borderRadius: 2,
      backgroundColor: COLORS.primarySoft,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 2,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 10,
    },
    emptyMeta: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 6,
      textAlign: 'center',
    },
    scroll: { padding: 20, paddingBottom: 24 },
    imageBox: {
      height: 220,
      borderRadius: RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    imageLabel: {
      position: 'absolute',
      bottom: 12,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: COLORS.text,
      backgroundColor: COLORS.card,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 8,
      marginBottom: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 14,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeOutline: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    badgeOutlineText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    metric: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      alignItems: 'center',
      ...SHADOWS.card,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 6,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 14,
      ...SHADOWS.card,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 4,
    },
    muscleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    musclePill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
    },
    musclePillText: { fontSize: 11, fontWeight: '800' },
    musclePillOutline: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    musclePillOutlineText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 10,
    },
    stepBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    stepText: {
      flex: 1,
      fontSize: 13,
      color: COLORS.text,
      fontWeight: '600',
      lineHeight: 19,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: COLORS.bg,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
    },
  });
