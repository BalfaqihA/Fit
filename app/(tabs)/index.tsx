import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WeighInBanner } from '@/components/weigh-in-banner';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useAuth } from '@/hooks/use-auth';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import {
  useTodayWorkout,
  useWorkoutHistory,
} from '@/hooks/use-workout-history';
import { computeDayNumber, planDayIndex } from '@/lib/plan-day';

const primaryActions: {
  label: string;
  subtitle: string;
  route: string;
  icon: string;
}[] = [
  {
    label: 'Start Workout',
    subtitle: "Begin today's session",
    route: '/workout/start',
    icon: 'play-circle',
  },
  {
    label: 'Exercise Library',
    subtitle: 'Browse all exercises',
    route: '/workout/plan',
    icon: 'book-open-variant',
  },
];

const secondaryShortcuts: { label: string; route: string; icon: string }[] = [
  { label: 'Week Plan', route: '/workout/week-plan', icon: 'calendar-week' },
  { label: 'Calendar', route: '/workout/calendar', icon: 'calendar-month-outline' },
  { label: 'History', route: '/workout/history', icon: 'history' },
  { label: 'Log Workout', route: '/workout/log', icon: 'notebook-edit-outline' },
];

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function HomeTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile, hydrated } = useUserProfile();
  const { user } = useAuth();
  const firstName = useMemo(
    () => profile.displayName.split(' ')[0] || profile.displayName,
    [profile.displayName]
  );

  const { plan } = usePlan();
  const { sessions, loading: historyLoading } = useWorkoutHistory();

  const dayNumber = useMemo(
    () => computeDayNumber(profile.planStartDate),
    [profile.planStartDate]
  );

  const personalizedDay = useMemo(() => {
    if (!plan || plan.days.length === 0) return null;
    return plan.days[planDayIndex(dayNumber, plan.days.length)];
  }, [plan, dayNumber]);

  const todays = useTodayWorkout();
  const isDoneToday = todays !== null;
  const { currentStreak } = useWeeklyStats();

  const motivation = useMemo(() => {
    if (currentStreak >= 30) return 'A month of grind. Legendary work.';
    if (currentStreak >= 14) return 'Two weeks straight — you are unstoppable.';
    if (currentStreak >= 7) return 'A full week on fire. Keep stoking it.';
    if (currentStreak >= 3) return `Day ${currentStreak} streak — momentum is yours.`;
    if (currentStreak === 2) return 'Two in a row. Build the habit.';
    return 'One down. Show up tomorrow and start a streak.';
  }, [currentStreak]);

  const heroLabel = isDoneToday
    ? 'Today · Done'
    : personalizedDay
      ? `Day ${dayNumber}`
      : "Today's session";
  const heroTitle = isDoneToday
    ? "Today's workout is complete!"
    : personalizedDay
      ? personalizedDay.title
      : 'Create Your Workout Plan';
  const heroMeta = isDoneToday
    ? `${todays!.durationMin} min · ${todays!.caloriesKcal} kcal · +${todays!.xp} XP · ${motivation}`
    : personalizedDay
      ? `${personalizedDay.estimatedMinutes} min · ${personalizedDay.exercises.length} exercises`
      : 'Finish onboarding to begin';
  const heroRoute = personalizedDay ? '/workout/start' : '/onboarding';

  // Derive Home stats from the same sessions list that History/Calendar use,
  // so the numbers always agree. Falls back to profile.stats only while the
  // sessions snapshot is still loading on first paint.
  const quickStats = useMemo(() => {
    const fmtK = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

    const useFallback = historyLoading && sessions.length === 0;
    const fallback = profile.stats ?? {
      totalWorkouts: 0,
      totalCaloriesKcal: 0,
      totalMinutes: 0,
    };
    const totals = useFallback
      ? fallback
      : sessions.reduce(
          (acc, s) => ({
            totalWorkouts: acc.totalWorkouts + 1,
            totalMinutes: acc.totalMinutes + s.durationMin,
            totalCaloriesKcal: acc.totalCaloriesKcal + s.caloriesKcal,
          }),
          { totalWorkouts: 0, totalMinutes: 0, totalCaloriesKcal: 0 }
        );

    return [
      { label: 'Workouts', value: `${totals.totalWorkouts}`, icon: 'run' },
      { label: 'Calories', value: fmtK(totals.totalCaloriesKcal), icon: 'fire' },
      { label: 'Minutes', value: `${totals.totalMinutes}`, icon: 'timer-outline' },
      { label: 'Streak', value: `${currentStreak}d`, icon: 'flame' },
    ];
  }, [sessions, historyLoading, profile.stats, currentStreak]);

  const previewMuscles = useMemo(() => {
    if (!personalizedDay) return [] as string[];
    const set = new Set<string>();
    personalizedDay.exercises.forEach((e) =>
      e.primaryMuscles.forEach((m) => set.add(titleCase(m)))
    );
    return Array.from(set).slice(0, 3);
  }, [personalizedDay]);

  const previewTopExercises = useMemo(() => {
    if (!personalizedDay) return '';
    return personalizedDay.exercises
      .slice(0, 2)
      .map((e) => e.name)
      .join(', ');
  }, [personalizedDay]);

  if (!hydrated || (historyLoading && sessions.length === 0)) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingScreen]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Welcome back, {firstName}</Text>
            <Text style={styles.name}>Ready to train?</Text>
          </View>
          <Pressable
            onPress={() => {
              if (user) router.push(`/community/profile/${user.uid}` as never);
            }}
            style={({ pressed }) => [
              styles.avatar,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={8}
          >
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <Ionicons name="person" size={20} color={COLORS.primary} />
            )}
          </Pressable>
        </View>

        <WeighInBanner />

        <LinearGradient
          colors={
            isDoneToday ? ['#2EC07E', '#1FAE6A'] : ['#8E54E9', '#6C56D9']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>{heroLabel}</Text>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroMeta}>{heroMeta}</Text>
          </View>
          {isDoneToday ? (
            <View style={styles.heroPlay}>
              <Ionicons name="checkmark" size={26} color={COLORS.success} />
            </View>
          ) : (
            <Pressable
              onPress={() => router.push(heroRoute as never)}
              style={({ pressed }) => [
                styles.heroPlay,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={personalizedDay ? 'play' : 'arrow-forward'}
                size={22}
                color={COLORS.primary}
              />
            </Pressable>
          )}
        </LinearGradient>

        {!personalizedDay && !isDoneToday && (
          <Pressable
            onPress={() => router.push('/onboarding' as never)}
            style={({ pressed }) => [
              styles.onboardingCta,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.onboardingCtaIcon}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.onboardingCtaLabel}>Complete Onboarding</Text>
              <Text style={styles.onboardingCtaMeta}>
                Answer a few questions to unlock your plan.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        )}

        {personalizedDay && !isDoneToday && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.previewTitle}>Next workout preview</Text>
              <View style={styles.previewBadge}>
                <Ionicons
                  name="flash-outline"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.previewBadgeText}>
                  Day {dayNumber}
                </Text>
              </View>
            </View>
            <Text style={styles.previewMeta}>
              {personalizedDay.exercises.length} exercises ·{' '}
              {personalizedDay.estimatedMinutes} min
            </Text>
            {previewTopExercises ? (
              <Text style={styles.previewExercises} numberOfLines={1}>
                {previewTopExercises}
              </Text>
            ) : null}
            {previewMuscles.length > 0 && (
              <View style={styles.previewPillRow}>
                {previewMuscles.map((m) => (
                  <View key={m} style={styles.previewPill}>
                    <Text style={styles.previewPillText}>{m}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.statsGrid}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={styles.statIcon}>
                <MaterialCommunityIcons
                  name={stat.icon as never}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
        </View>

        <View style={styles.primaryRow}>
          {primaryActions.map((action) => (
            <Pressable
              key={action.route}
              onPress={() => router.push(action.route as never)}
              style={({ pressed }) => [
                styles.primaryCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.primaryIcon}>
                <MaterialCommunityIcons
                  name={action.icon as never}
                  size={26}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.primaryLabel}>{action.label}</Text>
              <Text style={styles.primarySubtitle}>{action.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.secondaryGrid}>
          {secondaryShortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.route}
              onPress={() => router.push(shortcut.route as never)}
              style={({ pressed }) => [
                styles.secondaryCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.secondaryIcon}>
                <MaterialCommunityIcons
                  name={shortcut.icon as never}
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.secondaryLabel}>{shortcut.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    loadingScreen: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    hello: {
      fontSize: 14,
      color: COLORS.muted,
      marginBottom: 2,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: COLORS.text,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 44,
      height: 44,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: RADIUS.lg,
      padding: 20,
      marginBottom: 22,
      ...SHADOWS.button,
    },
    heroLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 4,
    },
    heroMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
    },
    heroPlay: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      alignItems: 'flex-start',
      ...SHADOWS.card,
    },
    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
    },
    statLabel: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: COLORS.text,
    },
    primaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    primaryCard: {
      flex: 1,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.lg,
      padding: 16,
      minHeight: 130,
      justifyContent: 'space-between',
      ...SHADOWS.button,
    },
    primaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryLabel: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    primarySubtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    secondaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    secondaryCard: {
      width: '48%',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      alignItems: 'flex-start',
      ...SHADOWS.card,
    },
    secondaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    secondaryLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.text,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    onboardingCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 22,
      ...SHADOWS.button,
    },
    onboardingCtaIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    onboardingCtaLabel: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    onboardingCtaMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    previewCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 22,
      ...SHADOWS.card,
    },
    previewHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: COLORS.text,
    },
    previewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    previewBadgeText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    previewMeta: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.muted,
    },
    previewExercises: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.text,
      marginTop: 6,
    },
    previewPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    previewPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    previewPillText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '700',
    },
  });
