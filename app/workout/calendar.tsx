import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useWorkoutHistory } from '@/hooks/use-workout-history';
import { usePlan } from '@/hooks/use-plan';
import { computeStreak, isoToLocalDayStart } from '@/lib/plan-day';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PLAN_HORIZON_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateToIso(d: Date): string {
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function WorkoutCalendar() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { sessions } = useWorkoutHistory();
  const { plan } = usePlan();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(dateToIso(s.completedAt));
    return set;
  }, [sessions]);

  const plannedDays = useMemo(() => {
    const set = new Set<string>();
    if (!plan || plan.days.length === 0 || !profile.planStartDate) return set;
    const startMs = isoToLocalDayStart(profile.planStartDate);
    for (let i = 0; i < PLAN_HORIZON_DAYS; i++) {
      const d = new Date(startMs + i * MS_PER_DAY);
      set.add(dateToIso(d));
    }
    return set;
  }, [plan, profile.planStartDate]);

  const monthSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const d = s.completedAt;
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [sessions, year, month]
  );

  const monthTotals = useMemo(
    () => ({
      workouts: monthSessions.length,
      minutes: monthSessions.reduce((n, s) => n + s.durationMin, 0),
      calories: monthSessions.reduce((n, s) => n + s.caloriesKcal, 0),
      xp: monthSessions.reduce((n, s) => n + s.xp, 0),
    }),
    [monthSessions]
  );

  const streak = useMemo(
    () => computeStreak(sessions.map((s) => s.completedAt)),
    [sessions]
  );

  const totalWorkouts = profile.stats?.totalWorkouts ?? 0;

  const firstWeekday = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const todayIso = dateToIso(now);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const step = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stripRow}>
          <View style={styles.stripCard}>
            <Ionicons name="flame" size={20} color="#FF8A3D" />
            <Text style={styles.stripValue}>{streak}</Text>
            <Text style={styles.stripLabel}>Day Streak</Text>
          </View>
          <View style={styles.stripCard}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.stripValue}>{totalWorkouts}</Text>
            <Text style={styles.stripLabel}>Total Workouts</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.monthNav}>
            <Pressable onPress={() => step(-1)} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={COLORS.text} />
            </Pressable>
            <Text style={styles.monthText}>
              {MONTHS[month]} {year}
            </Text>
            <Pressable onPress={() => step(1)} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {DAY_LABELS.map((l, i) => (
              <Text key={`${l}-${i}`} style={styles.dowText}>
                {l}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={`b-${i}`} style={styles.cell} />;
              const iso = toIsoDate(year, month, d);
              const isWorkout = workoutDays.has(iso);
              const isPlanned = plannedDays.has(iso) && !isWorkout;
              const isToday = iso === todayIso;
              return (
                <View
                  key={iso}
                  style={[
                    styles.cell,
                    isWorkout && styles.cellWorkout,
                    isPlanned && styles.cellPlanned,
                    isToday && !isWorkout && styles.cellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isWorkout && styles.cellTextWorkout,
                      isToday && !isWorkout && { color: COLORS.primary },
                    ]}
                  >
                    {d}
                  </Text>
                  {isWorkout && <View style={styles.cellDot} />}
                </View>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Workout</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: COLORS.primarySoft },
                ]}
              />
              <Text style={styles.legendText}>Planned</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent' },
                ]}
              />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.totals}>
          <Totals COLORS={COLORS} value={monthTotals.workouts} label="Workouts" />
          <Totals COLORS={COLORS} value={monthTotals.minutes} label="Minutes" />
          <Totals COLORS={COLORS} value={monthTotals.calories} label="Calories" />
          <Totals COLORS={COLORS} value={monthTotals.xp} label="XP Earned" />
        </View>

        <Text style={styles.sectionTitle}>Sessions</Text>
        {monthSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-blank" size={32} color={COLORS.muted} />
            <Text style={styles.emptyText}>No workouts this month yet.</Text>
          </View>
        ) : (
          monthSessions
            .slice()
            .sort((a, b) => +b.completedAt - +a.completedAt)
            .map((s) => {
              const d = s.completedAt;
              return (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={styles.sessionIcon}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionDate}>
                      {d.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {s.durationMin} min · {s.caloriesKcal} kcal · {s.exercisesCompleted} ex
                    </Text>
                  </View>
                  <Text style={styles.sessionXp}>+{s.xp}</Text>
                </View>
              );
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Totals({ COLORS, value, label }: { COLORS: Palette; value: number; label: string }) {
  return (
    <View
      style={{
        width: '48%',
        flexGrow: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: 14,
        ...SHADOWS.card,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }}>
        {value.toLocaleString()}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 2 }}>
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
    scroll: { padding: 20, paddingBottom: 40 },
    stripRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    stripCard: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      ...SHADOWS.card,
    },
    stripValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 6 },
    stripLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 14,
      marginBottom: 18,
      ...SHADOWS.card,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },
    monthText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    dowRow: { flexDirection: 'row', marginBottom: 6 },
    dowText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellWorkout: {
      backgroundColor: COLORS.primary,
      borderRadius: 12,
    },
    cellPlanned: {
      backgroundColor: COLORS.primarySoft,
      borderRadius: 12,
    },
    cellToday: {
      borderWidth: 2,
      borderColor: COLORS.primary,
      borderRadius: 12,
    },
    cellText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
    cellTextWorkout: { color: '#FFFFFF' },
    cellDot: {
      position: 'absolute',
      bottom: 6,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#FFFFFF',
    },
    legendRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 10,
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 4 },
    legendText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
      marginTop: 4,
    },
    totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    emptyCard: {
      alignItems: 'center',
      padding: 22,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      ...SHADOWS.card,
    },
    emptyText: { color: COLORS.muted, marginTop: 8, fontWeight: '600' },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      ...SHADOWS.card,
    },
    sessionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionDate: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    sessionMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '600' },
    sessionXp: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  });
