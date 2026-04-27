import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  EXERCISES,
  getDayByNumber,
  muscleColor,
  type Exercise,
} from '@/constants/workout-data';
import { useWorkoutSession } from '@/contexts/workout-session';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { exerciseImageUrl, getExerciseById } from '@/lib/exercises';
import type { PlanDay, PlanExercise } from '@/types/plan';

const MUSCLE_ICON: Record<string, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function DayDetail() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { startSession } = useWorkoutSession();
  const { plan } = usePlan();

  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNum = Number(day ?? '1');

  // Prefer the user's personalized plan day. Fall back to the static plan.
  const planDay: PlanDay | null =
    plan && dayNum >= 1 && dayNum <= plan.days.length
      ? plan.days[dayNum - 1]
      : null;

  if (planDay) {
    return (
      <PlanDayView
        styles={styles}
        COLORS={COLORS}
        planDay={planDay}
        dayNum={dayNum}
        startSession={startSession}
      />
    );
  }

  // ---- legacy fallback ----
  const legacyPlan = getDayByNumber(dayNum);
  if (!legacyPlan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Day</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Day not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (legacyPlan.isRestDay) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>{legacyPlan.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <View style={styles.restIcon}>
            <Ionicons name="moon" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Rest Day</Text>
          <Text style={styles.emptyMeta}>
            Take it easy today. Recovery is part of the plan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const exercises: Exercise[] = legacyPlan.exercises
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  const totalXp = exercises.reduce((n, e) => n + e.xp, 0);

  const renderItem = ({ item }: { item: Exercise }) => {
    const color = muscleColor(item.muscle, COLORS);
    return (
      <Pressable
        onPress={() => router.push(`/workout/exercise/${item.id}` as never)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons
            name={(MUSCLE_ICON[item.muscle] ?? 'dumbbell') as never}
            size={26}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.cardChipRow}>
            <View style={[styles.chip, { backgroundColor: color + '22' }]}>
              <Text style={[styles.chipText, { color }]}>{item.muscle}</Text>
            </View>
            <View style={styles.chipOutline}>
              <Text style={styles.chipOutlineText}>{item.level}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {item.sets} × {item.reps ? `${item.reps} reps` : `${item.holdSec}s hold`}
          </Text>
        </View>
        <View style={styles.xpBadge}>
          <Ionicons name="flash" size={11} color={COLORS.primary} />
          <Text style={styles.xpBadgeText}>+{item.xp}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{legacyPlan.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={exercises}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={['#8E54E9', '#6C56D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerRow}>
                <Item value={`${exercises.length}`} label="Exercises" />
                <View style={styles.bannerDivider} />
                <Item value={`${legacyPlan.estimatedMinutes}m`} label="Estimated" />
                <View style={styles.bannerDivider} />
                <Item value={`${totalXp}`} label="Max XP" />
              </View>
              <View style={styles.focusRow}>
                {legacyPlan.focusMuscles.map((m) => (
                  <View key={m} style={styles.focusPill}>
                    <Text style={styles.focusPillText}>{m}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
            <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Start This Day"
              onPress={() => {
                startSession(
                  exercises.map((e) => e.id),
                  dayNum
                );
                router.push(`/workout/run/0` as never);
              }}
              icon={<Ionicons name="play" size={18} color="#fff" />}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function PlanDayView({
  styles,
  COLORS,
  planDay,
  dayNum,
  startSession,
}: {
  styles: ReturnType<typeof makeStyles>;
  COLORS: Palette;
  planDay: PlanDay;
  dayNum: number;
  startSession: (ids: string[], dayNum: number) => void;
}) {
  const focusMuscles = useMemo(() => {
    const set = new Set<string>();
    planDay.exercises.forEach((e) =>
      e.primaryMuscles.forEach((m) => set.add(titleCase(m)))
    );
    return Array.from(set).slice(0, 4);
  }, [planDay]);

  const renderItem = ({ item }: { item: PlanExercise }) => {
    const record = getExerciseById(item.exerciseId);
    const thumb = record?.images?.[0];
    return (
      <Pressable
        onPress={() => router.push(`/workout/exercise/${item.exerciseId}` as never)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.thumbWrap}>
          {thumb ? (
            <Image
              source={{ uri: exerciseImageUrl(thumb) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <MaterialCommunityIcons
              name="dumbbell"
              size={26}
              color={COLORS.primary}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.cardChipRow}>
            {item.primaryMuscles.slice(0, 1).map((m) => (
              <View
                key={m}
                style={[styles.chip, { backgroundColor: COLORS.primarySoft }]}
              >
                <Text style={[styles.chipText, { color: COLORS.primary }]}>
                  {titleCase(m)}
                </Text>
              </View>
            ))}
            {item.equipment ? (
              <View style={styles.chipOutline}>
                <Text style={styles.chipOutlineText}>{titleCase(item.equipment)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardMeta}>
            {item.sets} × {item.reps} reps
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{planDay.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={planDay.exercises}
        renderItem={renderItem}
        keyExtractor={(_, idx) => `${dayNum}-${idx}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={['#8E54E9', '#6C56D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerRow}>
                <Item value={`${planDay.exercises.length}`} label="Exercises" />
                <View style={styles.bannerDivider} />
                <Item value={`${planDay.estimatedMinutes}m`} label="Estimated" />
                <View style={styles.bannerDivider} />
                <Item value={`Day ${planDay.day}`} label="Today" />
              </View>
              {focusMuscles.length > 0 && (
                <View style={styles.focusRow}>
                  {focusMuscles.map((m) => (
                    <View key={m} style={styles.focusPill}>
                      <Text style={styles.focusPillText}>{m}</Text>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
            <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Start This Day"
              onPress={() => {
                startSession(
                  planDay.exercises.map((e) => e.exerciseId),
                  dayNum
                );
                router.push(`/workout/run/0` as never);
              }}
              icon={<Ionicons name="play" size={18} color="#fff" />}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Item({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
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
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    banner: {
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 16,
      ...SHADOWS.button,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center' },
    bannerDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
    focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
    focusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    focusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      ...SHADOWS.card,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbWrap: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    cardChipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
    chipText: { fontSize: 11, fontWeight: '700' },
    chipOutline: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipOutlineText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    cardMeta: { fontSize: 12, color: COLORS.muted, marginTop: 4, fontWeight: '600' },
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
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    restIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 6 },
    emptyMeta: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 6,
      textAlign: 'center',
    },
  });
