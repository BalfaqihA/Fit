import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useWorkoutSession } from '@/contexts/workout-session';
import { useTheme } from '@/hooks/use-theme';
import { exerciseXp } from '@/lib/workouts';

const REST_SECONDS = 60;

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

const MUSCLE_ICON: Record<string, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RestScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { session, planExercises, totalCount } = useWorkoutSession();

  const nextIndex = session.currentIndex;
  const nextExercise = planExercises[nextIndex];

  const [timeLeft, setTimeLeft] = useState(REST_SECONDS);
  const [totalRest, setTotalRest] = useState(REST_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasSession = session.isActive && !!nextExercise;

  useEffect(() => {
    if (!hasSession) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 0 ? 0 : t - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasSession]);

  if (!hasSession || !nextExercise) {
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
          <PrimaryButton
            label="Go Home"
            onPress={() => router.replace('/(tabs)')}
            icon={<Ionicons name="home-outline" size={18} color="#fff" />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const ratio = 1 - timeLeft / totalRest;
  const ringColor =
    ratio < 0.5 ? COLORS.success : ratio < 0.85 ? '#F4A93B' : COLORS.accent;

  const primaryRaw = nextExercise.primaryMuscles[0]?.toLowerCase() ?? '';
  const group = MUSCLE_GROUP[primaryRaw] ?? 'Full Body';
  const color = GROUP_COLOR[group] ?? COLORS.primary;
  const xp = exerciseXp(nextExercise);

  const addFifteen = () => {
    setTotalRest((t) => t + 15);
    setTimeLeft((t) => t + 15);
  };

  const onNext = () => {
    router.replace(`/workout/run/${nextIndex}` as never);
  };

  const ready = timeLeft <= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rest</Text>
        <Text style={styles.headerMeta}>
          {nextIndex + 1} / {totalCount}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.ready}>
          {ready ? 'Ready!' : 'Take a breath'}
        </Text>

        <View style={[styles.ring, { borderColor: COLORS.primarySoft }]}>
          <View
            style={[
              styles.ringFill,
              {
                borderColor: ringColor,
                transform: [{ rotate: `${ratio * 360}deg` }],
              },
            ]}
          />
          <Text style={styles.timeText}>{fmt(timeLeft)}</Text>
          <Text style={styles.timeMeta}>rest</Text>
        </View>

        <Pressable onPress={addFifteen} style={styles.addBtn}>
          <Ionicons name="add" size={16} color={COLORS.primary} />
          <Text style={styles.addBtnText}>+15s</Text>
        </Pressable>

        <Text style={styles.upNextLabel}>Up next</Text>
        <View style={styles.nextCard}>
          <View style={[styles.nextIcon, { backgroundColor: color + '22' }]}>
            <MaterialCommunityIcons
              name={(MUSCLE_ICON[group] ?? 'dumbbell') as never}
              size={28}
              color={color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextName} numberOfLines={2}>
              {nextExercise.name}
            </Text>
            <View style={styles.nextChipRow}>
              <View style={[styles.chip, { backgroundColor: color + '22' }]}>
                <Text style={[styles.chipText, { color }]}>{group}</Text>
              </View>
              <Text style={styles.nextMeta}>
                {nextExercise.sets} × {nextExercise.reps} reps
              </Text>
            </View>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="flash" size={11} color={COLORS.primary} />
            <Text style={styles.xpBadgeText}>+{xp}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Next"
          onPress={onNext}
          icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    headerMeta: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
    body: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    ready: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    ring: {
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    ringFill: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 10,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    timeText: {
      fontSize: 48,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: 2,
    },
    timeMeta: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      marginTop: 18,
    },
    addBtnText: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    upNextLabel: {
      alignSelf: 'flex-start',
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
    },
    nextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 14,
      alignSelf: 'stretch',
      ...SHADOWS.card,
    },
    nextIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    nextChipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    chipText: { fontSize: 11, fontWeight: '700' },
    nextMeta: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
    },
    xpBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
    },
  });
