import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import {
  useWeightUpdateInsights,
  type LatestWeightUpdateInsight,
} from '@/hooks/use-weight-update-insights';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const ASK_COACH_PROMPT = 'Explain my latest weight update and workout progress.';

function shortRange(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(startIso).toLocaleDateString(undefined, opts);
  const e = new Date(endIso).toLocaleDateString(undefined, opts);
  return `${s} - ${e}`;
}

export function WeightUpdateInsightSheet({ visible, onClose }: Props) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { insight, loading } = useWeightUpdateInsights();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <Text style={styles.title}>Weight updated</Text>

          {loading || !insight ? (
            <Text style={styles.subtitle}>
              {loading
                ? 'Loading your latest progress…'
                : "We're still crunching your latest numbers — check back in a moment."}
            </Text>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <InsightBody insight={insight} styles={styles} COLORS={COLORS} />
            </ScrollView>
          )}

          <View style={{ height: 14 }} />
          <PrimaryButton
            label="Ask Coach About This"
            onPress={() => {
              onClose();
              router.push({
                pathname: '/(tabs)/chatbot',
                params: { initialPrompt: ASK_COACH_PROMPT },
              } as never);
            }}
            icon={
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            }
          />
          <View style={styles.secondaryRow}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                onClose();
                router.push('/dashboard/activity' as never);
              }}
            >
              <Text style={styles.secondaryText}>View activity</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InsightBody({
  insight,
  styles,
  COLORS,
}: {
  insight: LatestWeightUpdateInsight;
  styles: ReturnType<typeof makeStyles>;
  COLORS: Palette;
}) {
  const { weight, currentWeek, mostActiveWeek, topExercises, suggestions } =
    insight;
  const deltaWord =
    weight.deltaSinceLastKg < 0
      ? 'down'
      : weight.deltaSinceLastKg > 0
        ? 'up'
        : 'no change';
  const deltaColor =
    weight.goalAlignment === 'good'
      ? COLORS.success
      : weight.goalAlignment === 'needs_attention'
        ? COLORS.accent
        : COLORS.muted;

  return (
    <>
      {/* Weight result */}
      <View style={styles.card}>
        <Text style={styles.bigValue}>
          {weight.currentKg != null ? `${weight.currentKg.toFixed(1)} kg` : '--'}
        </Text>
        <View style={[styles.pill, { backgroundColor: deltaColor + '22' }]}>
          <Text style={[styles.pillText, { color: deltaColor }]}>
            {weight.deltaSinceLastKg === 0
              ? 'No change since last update'
              : `${deltaWord} ${Math.abs(weight.deltaSinceLastKg).toFixed(1)} kg since last update`}
          </Text>
        </View>
        <Text style={styles.cardMeta}>
          30-day trend: {weight.direction} {Math.abs(weight.delta30dKg).toFixed(1)} kg
        </Text>
      </View>

      {/* This week */}
      <Text style={styles.sectionLabel}>THIS WEEK</Text>
      <View style={styles.card}>
        <Text style={styles.statLine}>
          {currentWeek.workouts} workouts · {currentWeek.minutes} min ·{' '}
          {currentWeek.caloriesKcal} kcal
        </Text>
        <Text style={styles.cardMeta}>
          {currentWeek.xp} XP · {currentWeek.activeDays} active days
          {currentWeek.adherencePercent != null
            ? ` · ${currentWeek.adherencePercent}% of plan`
            : ''}
        </Text>
      </View>

      {/* Most active week */}
      {mostActiveWeek ? (
        <>
          <Text style={styles.sectionLabel}>MOST ACTIVE WEEK</Text>
          <View style={styles.card}>
            <Text style={styles.statLine}>
              {shortRange(
                mostActiveWeek.weekStartIso,
                mostActiveWeek.weekEndIso
              )}
            </Text>
            <Text style={styles.cardMeta}>
              {mostActiveWeek.caloriesKcal} kcal · {mostActiveWeek.minutes} min ·{' '}
              {mostActiveWeek.workouts} workouts
            </Text>
            <Text style={styles.reason}>{mostActiveWeek.reason}</Text>
          </View>
        </>
      ) : null}

      {/* Top exercises */}
      {topExercises.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>TOP EXERCISES</Text>
          <View style={styles.card}>
            {topExercises.slice(0, 3).map((ex, i) => (
              <View
                key={ex.exerciseId ?? ex.name}
                style={[styles.exRow, i > 0 && styles.exRowBorder]}
              >
                <Text style={styles.exName} numberOfLines={1}>
                  {i + 1}. {ex.name}
                </Text>
                <Text style={styles.exMeta}>
                  {ex.primaryMuscle ?? 'mixed'} · {ex.timesCompleted}x ·{' '}
                  {ex.totalSets} sets · {ex.totalReps} reps ·{' '}
                  {ex.totalCaloriesKcal} kcal · {ex.totalXp} XP
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Suggestion */}
      {suggestions.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>COACH NOTE</Text>
          <View style={styles.card}>
            <Text style={styles.cardMeta}>{suggestions.join(' ')}</Text>
          </View>
        </>
      ) : null}
    </>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    backdropPress: { ...StyleSheet.absoluteFillObject },
    sheet: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      padding: 22,
      paddingBottom: 32,
      maxHeight: '88%',
      ...SHADOWS.card,
    },
    scroll: { marginTop: 6 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    iconBubble: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    subtitle: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 8,
      lineHeight: 19,
    },
    card: {
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      padding: 16,
      marginBottom: 6,
    },
    bigValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    pill: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    pillText: { fontSize: 12, fontWeight: '700' },
    cardMeta: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 8,
      lineHeight: 19,
    },
    statLine: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    reason: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 8,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginTop: 14,
      marginBottom: 8,
      marginLeft: 4,
    },
    exRow: { paddingVertical: 8 },
    exRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.divider,
    },
    exName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    exMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3, lineHeight: 17 },
    secondaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    secondaryBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.inputBg,
    },
    secondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  });
