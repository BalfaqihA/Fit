import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { useWorkoutSession } from '@/contexts/workout-session';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { exerciseImageUrl } from '@/lib/exercises';
import { computeDayNumber, planDayIndex } from '@/lib/plan-day';
import type { Plan, PlanDay, PlanExercise } from '@/types/plan';

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function StartSession() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { startSession } = useWorkoutSession();
  const { plan } = usePlan();
  const { profile } = useUserProfile();

  const dayNum = useMemo(
    () => computeDayNumber(profile.planStartDate),
    [profile.planStartDate]
  );

  const planDay: PlanDay | null = useMemo(() => {
    if (!plan || plan.days.length === 0) return null;
    return plan.days[planDayIndex(dayNum, plan.days.length)];
  }, [plan, dayNum]);

  if (!planDay) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>No plan yet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <View style={styles.restIcon}>
            <Ionicons name="sparkles" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Generate your plan</Text>
          <Text style={styles.emptyMeta}>
            Finish onboarding to get a personalized plan.
          </Text>
          <View style={{ height: 20 }} />
          <PrimaryButton
            label="Complete Onboarding"
            onPress={() => router.push('/onboarding' as never)}
            icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PlanStartView
      styles={styles}
      COLORS={COLORS}
      planDay={planDay}
      plan={plan}
      dayNum={dayNum}
      startSession={startSession}
    />
  );
}

function PlanStartView({
  styles,
  COLORS,
  planDay,
  plan,
  dayNum,
  startSession,
}: {
  styles: ReturnType<typeof makeStyles>;
  COLORS: Palette;
  planDay: PlanDay;
  plan: Plan | null;
  dayNum: number;
  startSession: (day: PlanDay, planId?: string) => void;
}) {
  const focusMuscles = useMemo(() => {
    const set = new Set<string>();
    planDay.exercises.forEach((e) =>
      e.primaryMuscles.forEach((m) => set.add(titleCase(m)))
    );
    return Array.from(set).slice(0, 4);
  }, [planDay]);

  const onStart = () => {
    startSession(planDay, plan?.id);
    router.push(`/workout/run/0` as never);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PlanExercise;
    index: number;
  }) => {
    const thumb = item.images?.[0];

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
            <Text style={styles.cardMeta}>
              {item.sets} × {item.reps} reps
            </Text>
          </View>
        </View>
      </View>
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
        keyExtractor={(_, idx) => `start-${planDay.day}-${idx}`}
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
              <Text style={styles.bannerTitle}>{planDay.title}</Text>
              <View style={styles.bannerRow}>
                <Stat value={`${planDay.exercises.length}`} label="Exercises" />
                <View style={styles.bannerDivider} />
                <Stat value={`${planDay.estimatedMinutes}m`} label="Estimated" />
                <View style={styles.bannerDivider} />
                <Stat value={`Day ${dayNum}`} label="Today" />
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
