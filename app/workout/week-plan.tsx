import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { muscleColor } from '@/constants/workout-data';
import { useOnboarding } from '@/hooks/use-onboarding';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { GoalKey } from '@/types/community';
import type { Plan, PlanDay } from '@/types/plan';

const GOAL_LABEL: Record<GoalKey, string> = {
  lose_weight: 'Lose Weight',
  build_muscle: 'Build Muscle',
  stay_fit: 'Stay Fit',
  increase_endurance: 'Endurance',
  improve_flexibility: 'Flexibility',
};

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type WeekSlot = {
  weekdayIndex: number; // 0 = Mon ... 6 = Sun
  name: string;
  short: string;
  isRest: boolean;
  planDay?: PlanDay;
  focusMuscles: string[];
};

/**
 * Map the user's plan onto the current week. Workouts fill the first
 * `daysPerWeek` weekday slots (Mon-first); the rest are rest days. This
 * keeps the screen stable as the plan changes — switching from 3 → 5
 * days/week immediately re-renders 5 active cards.
 */
function buildWeek(plan: Plan | null): WeekSlot[] {
  const daysPerWeek = Math.min(
    7,
    Math.max(0, plan?.profile?.daysPerWeek ?? 0),
  );
  return WEEKDAY_NAMES.map((name, weekdayIndex) => {
    const isRest = !plan || weekdayIndex >= daysPerWeek;
    const planDay = !isRest ? plan?.days?.[weekdayIndex] : undefined;
    const focusMuscles = planDay
      ? Array.from(
          new Set(
            planDay.exercises.flatMap((e) =>
              e.primaryMuscles.map((m) => m.toLowerCase()),
            ),
          ),
        )
      : [];
    return {
      weekdayIndex,
      name,
      short: WEEKDAY_SHORT[weekdayIndex],
      isRest,
      planDay,
      focusMuscles,
    };
  });
}

function todayWeekdayIndex(): number {
  // JS Sunday=0..Saturday=6; map to Mon=0..Sun=6.
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function WeekPlan() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { plan, loading } = usePlan();
  const { reset: resetOnboarding, setMode } = useOnboarding();

  const fitnessLevelLabel = profile.fitnessLevel
    ? profile.fitnessLevel.charAt(0).toUpperCase() +
      profile.fitnessLevel.slice(1)
    : 'Beginner';
  const goalLabel = profile.primaryGoal
    ? GOAL_LABEL[profile.primaryGoal]
    : 'Stay Fit';

  const week = useMemo(() => buildWeek(plan), [plan]);
  const todayIdx = todayWeekdayIndex();

  const totals = useMemo(() => {
    const active = week.filter((d) => !d.isRest && d.planDay);
    const exercises = active.reduce(
      (n, d) => n + (d.planDay?.exercises.length ?? 0),
      0,
    );
    const minutes = active.reduce(
      (n, d) => n + (d.planDay?.estimatedMinutes ?? 0),
      0,
    );
    return {
      activeDays: active.length,
      exercises,
      perDay: active.length === 0 ? 0 : Math.round(minutes / active.length),
    };
  }, [week]);

  const onRefresh = () => {
    Alert.alert(
      'Regenerate plan?',
      'You will go through onboarding again to build a new plan. Your current plan will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: () => {
            resetOnboarding();
            setMode('change');
            router.push('/onboarding/goal' as never);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>My Week</Text>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} hitSlop={8}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#8E54E9', '#6C56D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Item value={`${totals.activeDays}`} label="Workout Days" />
          <View style={styles.bannerDivider} />
          <Item value={`${totals.exercises}`} label="Total Exercises" />
          <View style={styles.bannerDivider} />
          <Item value={`${totals.perDay}m`} label="Min / Day" />
        </LinearGradient>

        <View style={styles.profileRow}>
          <View style={styles.profileChip}>
            <Ionicons name="trophy" size={14} color={COLORS.primary} />
            <Text style={styles.profileChipText}>{fitnessLevelLabel}</Text>
          </View>
          <View style={styles.profileChip}>
            <Ionicons name="flag" size={14} color={COLORS.primary} />
            <Text style={styles.profileChipText}>{goalLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>This Week&apos;s Schedule</Text>

        {loading && !plan ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your plan…</Text>
          </View>
        ) : !plan ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={32}
              color={COLORS.muted}
            />
            <Text style={styles.emptyTitle}>No active plan</Text>
            <Text style={styles.emptySub}>
              Generate a plan to see your weekly schedule.
            </Text>
            <View style={{ height: 12 }} />
            <PrimaryButton label="Generate Plan" onPress={onRefresh} />
          </View>
        ) : (
          week.map((d) => {
            const isToday = d.weekdayIndex === todayIdx;

            if (d.isRest || !d.planDay) {
              return (
                <View
                  key={d.weekdayIndex}
                  style={[
                    styles.dayCard,
                    styles.restCard,
                    isToday && styles.dayCardToday,
                  ]}
                >
                  <View style={styles.restIcon}>
                    <Ionicons name="moon" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayName}>
                      {d.name}
                      {isToday && (
                        <Text style={styles.todayTag}> · Today</Text>
                      )}
                    </Text>
                    <Text style={styles.dayMeta}>
                      Rest day · Recovery & stretching
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="bed"
                    size={20}
                    color={COLORS.muted}
                  />
                </View>
              );
            }

            const visibleMuscles = d.focusMuscles.slice(0, 3);
            const overflow = d.focusMuscles.length - visibleMuscles.length;
            const planDayNumber = d.weekdayIndex + 1;

            return (
              <Pressable
                key={d.weekdayIndex}
                onPress={() =>
                  router.push(`/workout/day/${planDayNumber}` as never)
                }
                style={[styles.dayCard, isToday && styles.dayCardToday]}
              >
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeShort}>{d.short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayName}>
                    {d.name}
                    {isToday && <Text style={styles.todayTag}> · Today</Text>}
                  </Text>
                  <View style={styles.muscleRow}>
                    {visibleMuscles.map((m) => {
                      const c = muscleColor(m as never, COLORS);
                      return (
                        <View
                          key={m}
                          style={[
                            styles.muscleChip,
                            { backgroundColor: c + '22' },
                          ]}
                        >
                          <Text style={[styles.muscleChipText, { color: c }]}>
                            {m}
                          </Text>
                        </View>
                      );
                    })}
                    {overflow > 0 && (
                      <View style={styles.muscleOverflow}>
                        <Text style={styles.muscleOverflowText}>
                          +{overflow}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.dayMeta}>
                    {d.planDay.exercises.length} exercises ·{' '}
                    {d.planDay.estimatedMinutes} min
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.muted}
                />
              </Pressable>
            );
          })
        )}

        <Pressable
          onPress={() => router.push('/workout/plan' as never)}
          style={styles.libraryBtn}
        >
          <Ionicons name="library-outline" size={18} color={COLORS.primary} />
          <Text style={styles.libraryBtnText}>Browse Exercise Library</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
        {value}
      </Text>
      <Text
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
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
    refreshBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },
    scroll: { padding: 20, paddingBottom: 40 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 14,
      ...SHADOWS.button,
    },
    bannerDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    profileRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    profileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    profileChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    dayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      ...SHADOWS.card,
    },
    dayCardToday: { borderColor: COLORS.primary },
    restCard: { opacity: 0.95 },
    dayBadge: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBadgeShort: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    dayName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    todayTag: { color: COLORS.primary, fontWeight: '700' },
    muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    muscleChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    muscleChipText: { fontSize: 11, fontWeight: '700' },
    muscleOverflow: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    muscleOverflowText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    dayMeta: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 6,
      fontWeight: '600',
    },
    restIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingBox: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingVertical: 22,
      alignItems: 'center',
      gap: 8,
      ...SHADOWS.card,
      marginBottom: 12,
    },
    loadingText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
    emptyCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 22,
      alignItems: 'center',
      gap: 6,
      ...SHADOWS.card,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 6,
    },
    emptySub: {
      fontSize: 13,
      color: COLORS.muted,
      textAlign: 'center',
    },
    libraryBtn: {
      marginTop: 8,
      height: 52,
      borderRadius: RADIUS.md,
      borderWidth: 2,
      borderColor: COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    libraryBtnText: {
      color: COLORS.primary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
