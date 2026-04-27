import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { SESSIONS, USER_STATS, type WorkoutSession } from '@/constants/workout-data';
import { useTheme } from '@/hooks/use-theme';

type Filter = 'All' | 'This Week' | 'This Month';
const FILTERS: Filter[] = ['All', 'This Week', 'This Month'];

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const diff = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export default function WorkoutHistory() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [filter, setFilter] = useState<Filter>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'All') return SESSIONS;
    if (filter === 'This Week') {
      const start = startOfWeek(now);
      return SESSIONS.filter((s) => new Date(s.date) >= start);
    }
    return SESSIONS.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of filtered) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([key, list]) => ({
        key,
        list: list.sort((a, b) => +new Date(b.date) - +new Date(a.date)),
      }));
  }, [filtered]);

  const avg =
    USER_STATS.totalWorkouts === 0
      ? 0
      : Math.round(USER_STATS.totalMinutes / USER_STATS.totalWorkouts);

  const iconColor = (i: number) =>
    ['#6C56D9', '#FF6B7A', '#4EA3FF', '#2EC07E', '#F4A93B'][i % 5];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <Stat COLORS={COLORS} label="Workouts" value={USER_STATS.totalWorkouts} />
          <Stat COLORS={COLORS} label="Minutes" value={USER_STATS.totalMinutes} />
          <Stat COLORS={COLORS} label="Calories" value={USER_STATS.totalCalories} />
          <Stat COLORS={COLORS} label="Total XP" value={USER_STATS.totalExp} />
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Average session: <Text style={{ fontWeight: '800' }}>{avg} min</Text>
          </Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && { color: '#FFFFFF' },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {grouped.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="dumbbell" size={32} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Your completed sessions will show up here.</Text>
            <View style={{ height: 12 }} />
            <PrimaryButton
              label="Start a Workout"
              onPress={() => router.push('/workout/plan' as never)}
              icon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
            />
          </View>
        ) : (
          grouped.map(({ key, list }) => {
            const d = new Date(`${key}-01`);
            const monthName = d.toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            });
            return (
              <View key={key}>
                <Text style={styles.monthHeader}>
                  {monthName} <Text style={styles.monthHeaderCount}>• {list.length} sessions</Text>
                </Text>
                {list.map((s, i) => {
                  const isOpen = expanded === s.id;
                  const dd = new Date(s.date);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setExpanded(isOpen ? null : s.id)}
                      style={styles.card}
                    >
                      <View style={styles.cardRow}>
                        <View
                          style={[
                            styles.cardIcon,
                            { backgroundColor: iconColor(i) + '22' },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="dumbbell"
                            size={20}
                            color={iconColor(i)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>
                            {dd.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {s.duration} min · {s.calories} kcal · {s.exercisesCompleted} ex
                          </Text>
                        </View>
                        <Text style={styles.cardXp}>+{s.expEarned}</Text>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={COLORS.muted}
                        />
                      </View>

                      {isOpen && (
                        <View style={styles.detail}>
                          <Detail
                            COLORS={COLORS}
                            icon="barbell-outline"
                            label="Exercises"
                            value={`${s.exercisesCompleted}`}
                          />
                          <Detail
                            COLORS={COLORS}
                            icon="time-outline"
                            label="Duration"
                            value={`${s.duration} min`}
                          />
                          <Detail
                            COLORS={COLORS}
                            icon="flame-outline"
                            label="Calories"
                            value={`${s.calories}`}
                          />
                          <Detail
                            COLORS={COLORS}
                            icon="flash-outline"
                            label="XP"
                            value={`+${s.expEarned}`}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ COLORS, label, value }: { COLORS: Palette; label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: 12,
        ...SHADOWS.card,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }}>
        {value.toLocaleString()}
      </Text>
      <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '700', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function Detail({
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
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}>
      <Ionicons name={icon as never} size={16} color={COLORS.primary} />
      <Text style={{ flex: 1, fontSize: 13, color: COLORS.muted, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>{value}</Text>
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
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.primarySoft,
      padding: 12,
      borderRadius: RADIUS.md,
      marginBottom: 14,
    },
    infoText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterPillActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterPillText: { fontSize: 12, fontWeight: '800', color: COLORS.muted },
    monthHeader: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 8,
      marginBottom: 8,
    },
    monthHeaderCount: { color: COLORS.muted, fontWeight: '600' },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      ...SHADOWS.card,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    cardMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '600' },
    cardXp: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginRight: 4 },
    detail: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
    },
    emptyCard: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      ...SHADOWS.card,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 4,
      textAlign: 'center',
    },
  });
