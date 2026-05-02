import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { useTodayWorkout } from '@/hooks/use-workout-history';
import { exerciseImageUrl } from '@/lib/exercises';
import type { CompletedExerciseLog } from '@/lib/workouts';

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function DayExercises() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const todays = useTodayWorkout();

  if (!todays) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Today&apos;s Exercises</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name="calendar-blank"
            size={42}
            color={COLORS.muted}
          />
          <Text style={styles.emptyTitle}>No workout logged today</Text>
          <Text style={styles.emptyMeta}>
            Complete a session to see your exercises here.
          </Text>
          <View style={{ height: 16 }} />
          <PrimaryButton
            label="Back to Home"
            onPress={() => router.replace('/(tabs)' as never)}
            icon={<Ionicons name="home-outline" size={18} color="#fff" />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const exercises: CompletedExerciseLog[] = todays.exercises ?? [];

  const stats = [
    {
      icon: 'time-outline',
      label: 'Duration',
      value: `${todays.durationMin}m`,
    },
    {
      icon: 'flame-outline',
      label: 'Calories',
      value: `${todays.caloriesKcal}`,
    },
    {
      icon: 'barbell-outline',
      label: 'Exercises',
      value: `${todays.exercisesCompleted}`,
    },
  ];

  const renderItem = ({
    item,
    index,
  }: {
    item: CompletedExerciseLog;
    index: number;
  }) => {
    const thumb = item.imageId;
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIndex}>{index + 1}</Text>
        </View>
        <View style={styles.thumbWrap}>
          {thumb ? (
            <Image
              source={{ uri: exerciseImageUrl(thumb) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <Ionicons name="barbell-outline" size={22} color={COLORS.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.cardChipRow}>
            {item.primaryMuscle ? (
              <View
                style={[styles.chip, { backgroundColor: COLORS.primarySoft }]}
              >
                <Text style={[styles.chipText, { color: COLORS.primary }]}>
                  {titleCase(item.primaryMuscle)}
                </Text>
              </View>
            ) : null}
            <Text style={styles.cardMeta}>
              {item.actualSets} / {item.plannedSets} sets · {item.plannedReps} reps
            </Text>
          </View>
        </View>
        {item.actualSets >= item.plannedSets ? (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={COLORS.success}
          />
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Today&apos;s Exercises</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={exercises}
        renderItem={renderItem}
        keyExtractor={(item, idx) => `${idx}-${item.name}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons
                      name={s.icon as never}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>What you did today</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Exercise details weren&apos;t recorded for this session.
            </Text>
          </View>
        }
      />
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
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      ...SHADOWS.card,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
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
    cardLeft: { width: 28, alignItems: 'center' },
    cardIndex: { fontSize: 16, fontWeight: '800', color: COLORS.muted },
    thumbWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cardName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    cardChipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    chipText: { fontSize: 11, fontWeight: '700' },
    cardMeta: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    empty: {
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
    emptyCard: {
      alignItems: 'center',
      padding: 22,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      ...SHADOWS.card,
    },
    emptyText: { color: COLORS.muted, fontWeight: '600', textAlign: 'center' },
  });
