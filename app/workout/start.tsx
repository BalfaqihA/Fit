import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import {
  EXERCISES,
  getDayByNumber,
  muscleColor,
  todayDayNumber,
  type Exercise,
} from '@/constants/workout-data';
import { useWorkoutSession } from '@/contexts/workout-session';
import { useTheme } from '@/hooks/use-theme';

const MUSCLE_ICON: Record<string, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

export default function StartSession() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { startSession } = useWorkoutSession();

  const dayNum = todayDayNumber();
  const plan = getDayByNumber(dayNum);

  if (!plan || plan.isRestDay) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>{plan?.name ?? 'Rest Day'}</Text>
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
          <View style={{ height: 20 }} />
          <PrimaryButton
            label="Browse Library"
            onPress={() => router.push('/workout/plan')}
            icon={<Ionicons name="book-outline" size={18} color="#fff" />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const exercises: Exercise[] = plan.exercises
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  const totalXp = exercises.reduce((n, e) => n + e.xp, 0);

  const onStart = () => {
    startSession(
      exercises.map((e) => e.id),
      dayNum
    );
    router.push(`/workout/run/0` as never);
  };

  const renderItem = ({ item, index }: { item: Exercise; index: number }) => {
    const color = muscleColor(item.muscle, COLORS);
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIndex}>{index + 1}</Text>
        </View>
        <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons
            name={(MUSCLE_ICON[item.muscle] ?? 'dumbbell') as never}
            size={24}
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
            <Text style={styles.cardMeta}>
              {item.sets} × {item.reps ? `${item.reps} reps` : `${item.holdSec}s hold`}
            </Text>
          </View>
        </View>
        <View style={styles.xpBadge}>
          <Ionicons name="flash" size={11} color={COLORS.primary} />
          <Text style={styles.xpBadgeText}>+{item.xp}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{plan.name}</Text>
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
              <Text style={styles.bannerLabel}>Today&apos;s session</Text>
              <Text style={styles.bannerTitle}>{plan.name}</Text>
              <View style={styles.bannerRow}>
                <Stat value={`${exercises.length}`} label="Exercises" />
                <View style={styles.bannerDivider} />
                <Stat value={`${plan.estimatedMinutes}m`} label="Estimated" />
                <View style={styles.bannerDivider} />
                <Stat value={`${totalXp}`} label="Max XP" />
              </View>
              <View style={styles.focusRow}>
                {plan.focusMuscles.map((m) => (
                  <View key={m} style={styles.focusPill}>
                    <Text style={styles.focusPillText}>{m}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
            <Text style={styles.sectionTitle}>Exercises in this session</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 18 }}>
            <PrimaryButton
              label="Start This Session"
              onPress={onStart}
              icon={<Ionicons name="play" size={18} color="#fff" />}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
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
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    banner: {
      borderRadius: RADIUS.lg,
      padding: 20,
      marginBottom: 16,
      ...SHADOWS.button,
    },
    bannerLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    bannerTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 14,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center' },
    bannerDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
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
    cardLeft: {
      width: 28,
      alignItems: 'center',
    },
    cardIndex: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.muted,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    cardChipRow: {
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
    cardMeta: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
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
    emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 6,
    },
    emptyMeta: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 6,
      textAlign: 'center',
    },
  });
