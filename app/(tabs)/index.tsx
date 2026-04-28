import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { todayDayNumber } from '@/constants/workout-data';
import { useAuth } from '@/hooks/use-auth';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';

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
    label: 'Library',
    subtitle: 'Browse all exercises',
    route: '/workout/plan',
    icon: 'book-open-variant',
  },
];

const secondaryShortcuts: { label: string; route: string; icon: string }[] = [
  { label: 'Week Plan', route: '/workout/week-plan', icon: 'calendar-week' },
  { label: 'Calendar', route: '/workout/calendar', icon: 'calendar-month-outline' },
  { label: 'History', route: '/workout/history', icon: 'history' },
  { label: 'Log', route: '/workout/log', icon: 'notebook-outline' },
];

export default function HomeTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const firstName = useMemo(
    () => profile.displayName.split(' ')[0] || profile.displayName,
    [profile.displayName]
  );

  const { plan } = usePlan();

  const personalizedDay = useMemo(() => {
    if (!plan || plan.days.length === 0) return null;
    const dayIndex = (todayDayNumber() - 1) % plan.days.length;
    return plan.days[dayIndex];
  }, [plan]);

  const heroTitle = personalizedDay ? personalizedDay.title : 'Generate your plan';
  const heroMeta = personalizedDay
    ? `${personalizedDay.estimatedMinutes} min · ${personalizedDay.exercises.length} exercises`
    : 'Finish onboarding to begin';
  const heroRoute = personalizedDay ? '/workout/start' : '/onboarding';

  const quickStats = useMemo(() => {
    const s = profile.stats ?? {
      totalWorkouts: 0,
      totalCaloriesKcal: 0,
      totalMinutes: 0,
    };
    const fmtK = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
    return [
      { label: 'Workouts', value: `${s.totalWorkouts}`, icon: 'run' },
      { label: 'Calories', value: fmtK(s.totalCaloriesKcal), icon: 'fire' },
      { label: 'Minutes', value: `${s.totalMinutes}`, icon: 'timer-outline' },
    ];
  }, [profile.stats]);

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
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['#8E54E9', '#6C56D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Today&apos;s session</Text>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroMeta}>{heroMeta}</Text>
          </View>
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
        </LinearGradient>

        <View style={styles.statsRow}>
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
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
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
  });
