import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { USER_STATS } from '@/constants/workout-data';
import { useWorkoutSession } from '@/contexts/workout-session';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { recordCompletedWorkout } from '@/lib/workouts';

export default function WorkoutSummary() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { reset } = useWorkoutSession();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const params = useLocalSearchParams<{
    duration?: string;
    calories?: string;
    done?: string;
    xp?: string;
    planId?: string;
    dayNum?: string;
  }>();

  const duration = Number(params.duration ?? 0);
  const calories = Number(params.calories ?? 0);
  const done = Number(params.done ?? 0);
  const xp = Number(params.xp ?? 0);

  const persisted = useRef(false);
  useEffect(() => {
    if (persisted.current) return;
    persisted.current = true;
    const run = async () => {
      if (user) {
        try {
          await recordCompletedWorkout(user.uid, {
            planId: params.planId || undefined,
            dayNum: params.dayNum ? Number(params.dayNum) : undefined,
            durationMin: duration,
            caloriesKcal: calories,
            exercisesCompleted: done,
            xp,
            setPlanStartDate: !profile.planStartDate,
          });
        } catch {
          // non-blocking; UI is already shown
        }
      }
      reset();
    };
    run();
  }, [
    user,
    duration,
    calories,
    done,
    xp,
    reset,
    params.planId,
    params.dayNum,
    profile.planStartDate,
  ]);

  const baseExp = 50;
  const durationBonus = duration * 3;
  const exerciseExp = Math.max(0, xp - baseExp - durationBonus);

  const progress = Math.min(
    1,
    (USER_STATS.currentLevelExp + xp) / USER_STATS.expToNextLevel
  );
  const remaining = Math.max(
    0,
    USER_STATS.expToNextLevel - USER_STATS.currentLevelExp - xp
  );

  const stats = [
    { icon: 'time-outline', label: 'Duration', value: `${duration}m` },
    { icon: 'flame-outline', label: 'Calories', value: `${calories}` },
    { icon: 'barbell-outline', label: 'Exercises', value: `${done}` },
    { icon: 'flash-outline', label: 'XP Earned', value: `+${xp}` },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#8E54E9', '#6C56D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.trophy}>
            <MaterialCommunityIcons name="trophy" size={42} color="#FFD66B" />
          </View>
          <Text style={styles.heroTitle}>Workout Complete!</Text>
          <Text style={styles.heroXp}>+{xp} XP</Text>
          <Text style={styles.heroMeta}>Great work. You earned this one.</Text>
        </LinearGradient>

        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.gridCell}>
              <View style={styles.gridIcon}>
                <Ionicons name={s.icon as never} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.gridValue}>{s.value}</Text>
              <Text style={styles.gridLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>XP Breakdown</Text>
          <BreakdownRow
            COLORS={COLORS}
            icon="checkmark-done"
            label="Exercise XP"
            value={`+${exerciseExp}`}
          />
          <BreakdownRow
            COLORS={COLORS}
            icon="time-outline"
            label={`Duration bonus (${duration}m)`}
            value={`+${durationBonus}`}
          />
          <BreakdownRow
            COLORS={COLORS}
            icon="trophy-outline"
            label="Completion bonus"
            value={`+${baseExp}`}
          />
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>+{xp} XP</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.levelHeader}>
            <Text style={styles.cardTitle}>Level Progress</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv {USER_STATS.level}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressMeta}>
              {USER_STATS.currentLevelExp + xp} / {USER_STATS.expToNextLevel}
            </Text>
            <Text style={styles.progressMeta}>
              {remaining} XP to Lv {USER_STATS.level + 1}
            </Text>
          </View>
        </View>

        <PrimaryButton
          label="Back to Home"
          onPress={() => router.replace('/(tabs)' as never)}
          icon={<Ionicons name="home-outline" size={18} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({
  COLORS,
  icon,
  label,
  value,
}: {
  COLORS: Palette;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={brStyles(COLORS).row}>
      <View style={brStyles(COLORS).iconWrap}>
        <Ionicons name={icon as never} size={16} color={COLORS.primary} />
      </View>
      <Text style={brStyles(COLORS).label}>{label}</Text>
      <Text style={brStyles(COLORS).value}>{value}</Text>
    </View>
  );
}

const brStyles = (COLORS: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
    value: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  });

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    hero: {
      borderRadius: RADIUS.lg,
      padding: 24,
      alignItems: 'center',
      marginBottom: 18,
      ...SHADOWS.button,
    },
    trophy: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 4,
    },
    heroXp: {
      color: '#FFD66B',
      fontSize: 32,
      fontWeight: '800',
      marginVertical: 2,
    },
    heroMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      marginTop: 4,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    gridCell: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      ...SHADOWS.card,
    },
    gridIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    gridValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    gridLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 18,
      ...SHADOWS.card,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    breakdownTotal: {
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
      marginTop: 4,
      paddingTop: 12,
      justifyContent: 'space-between',
    },
    totalLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    levelBadge: {
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    levelBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    progressTrack: {
      height: 10,
      borderRadius: 6,
      backgroundColor: COLORS.primarySoft,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 6,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    progressMeta: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  });
