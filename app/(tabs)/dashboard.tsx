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
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { useDerivedRecords } from '@/hooks/use-derived-records';
import { useMeasurements } from '@/hooks/use-measurements';
import { LEVEL_XP, levelFromXp } from '@/lib/gamification';
import { bmiFromKg } from '@/lib/measurements';

export default function DashboardTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { bars, totals, currentStreak } = useWeeklyStats();
  const records = useDerivedRecords();
  const { latestWeight, measurements } = useMeasurements();

  const totalXp = profile.stats?.totalXp ?? 0;
  const { level, currentLevelXp, progress, remainingXp } = levelFromXp(totalXp);

  const topPRs = records.slice(0, 3);

  const heightCm = profile.heightCm ?? 0;
  const bmi = bmiFromKg(latestWeight, heightCm);

  const bodyStats = useMemo(() => {
    const items: {
      key: 'weight' | 'bmi';
      label: string;
      value: string;
      unit: string;
      change: string;
      trend: 'up' | 'down';
    }[] = [];
    const first = measurements[0];
    const weightDelta =
      first && latestWeight ? latestWeight - first.weightKg : 0;
    items.push({
      key: 'weight',
      label: 'Weight',
      value: latestWeight ? latestWeight.toFixed(1) : '--',
      unit: 'kg',
      change:
        weightDelta === 0
          ? '0.0 kg'
          : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`,
      trend: weightDelta <= 0 ? 'down' : 'up',
    });
    items.push({
      key: 'bmi',
      label: 'BMI',
      value: bmi ? bmi.toFixed(1) : '--',
      unit: '',
      change: heightCm ? 'Updated' : 'Set height',
      trend: 'down',
    });
    return items;
  }, [measurements, latestWeight, bmi, heightCm]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Track your progress</Text>
        </View>

        <Pressable
          onPress={() =>
            user &&
            router.push(`/community/achievements/${user.uid}` as never)
          }
          style={({ pressed }) => [styles.levelCard, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.levelHeaderRow}>
            <View style={styles.levelBadge}>
              <Ionicons name="flash" size={14} color={COLORS.primary} />
              <Text style={styles.levelBadgeText}>Lv {level}</Text>
            </View>
            <Text style={styles.levelXp}>{totalXp.toLocaleString()} XP</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressMetaText}>
              {currentLevelXp} / {LEVEL_XP}
            </Text>
            <Text style={styles.progressMetaText}>
              {remainingXp} XP to Lv {level + 1}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/dashboard/activity' as never)}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        >
          <LinearGradient
            colors={['#8E54E9', '#6C56D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <View style={styles.overviewTopRow}>
              <Text style={styles.overviewLabel}>This week</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{totals.minutes}</Text>
                <Text style={styles.overviewMeta}>minutes</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{formatK(totals.calories)}</Text>
                <Text style={styles.overviewMeta}>calories</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{totals.workouts}</Text>
                <Text style={styles.overviewMeta}>workouts</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push('/dashboard/activity' as never)}
          style={({ pressed }) => [styles.chartCard, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Activity</Text>
              <Text style={styles.sectionSubtle}>
                Last 7 days · {currentStreak}d streak
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </View>
          <View style={styles.chart}>
            {bars.map((bar, idx) => (
              <View key={`${bar.dateIso}-${idx}`} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(bar.value * 100, bar.minutes > 0 ? 10 : 0)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal records</Text>
          <Pressable
            onPress={() => router.push('/dashboard/personal-records' as never)}
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>

        {topPRs.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={28}
              color={COLORS.muted}
            />
            <Text style={styles.emptyText}>
              Finish a workout to start earning records.
            </Text>
          </View>
        ) : (
          topPRs.map((pr) => (
            <Pressable
              key={pr.id}
              style={({ pressed }) => [styles.prCard, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push(`/dashboard/personal-record/${pr.id}` as never)
              }
            >
              <View style={styles.prIcon}>
                <MaterialCommunityIcons
                  name={pr.icon as never}
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prLabel}>{pr.label}</Text>
                <Text style={styles.prValue}>
                  {pr.value} {pr.unit}
                </Text>
              </View>
              <View style={styles.prDelta}>
                <Ionicons
                  name={pr.trend === 'down' ? 'arrow-down' : 'arrow-up'}
                  size={12}
                  color={COLORS.success}
                />
                <Text style={styles.prDeltaText}>{pr.delta}</Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Body stats</Text>
          <Pressable
            onPress={() => router.push('/dashboard/body-stats' as never)}
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.bodyRow}>
          {bodyStats.map((stat) => (
            <Pressable
              key={stat.key}
              style={({ pressed }) => [styles.bodyCard, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push(`/dashboard/body-stat/${stat.key}` as never)
              }
            >
              <Text style={styles.bodyLabel}>{stat.label}</Text>
              <Text style={styles.bodyValue}>
                {stat.value}
                {stat.unit ? ` ${stat.unit}` : ''}
              </Text>
              <View style={styles.bodyTrend}>
                <Ionicons
                  name={stat.trend === 'down' ? 'trending-down' : 'trending-up'}
                  size={14}
                  color={COLORS.success}
                />
                <Text style={styles.bodyTrendText}>{stat.change}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 18 },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
    levelCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 14,
      ...SHADOWS.card,
    },
    levelHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
    },
    levelBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    levelXp: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.primarySoft,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 4,
    },
    progressMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    progressMetaText: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
    overviewCard: {
      borderRadius: RADIUS.lg,
      padding: 20,
      marginBottom: 22,
      ...SHADOWS.button,
    },
    overviewTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    overviewLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    overviewRow: { flexDirection: 'row', alignItems: 'center' },
    overviewItem: { flex: 1, alignItems: 'center' },
    overviewDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    overviewValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
    overviewMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      marginTop: 2,
    },
    chartCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 22,
      ...SHADOWS.card,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 140,
    },
    barColumn: { alignItems: 'center', flex: 1 },
    barTrack: {
      width: 18,
      height: 120,
      backgroundColor: COLORS.primarySoft,
      borderRadius: 9,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 9,
    },
    barLabel: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    sectionSubtle: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    sectionLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    prCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      ...SHADOWS.card,
    },
    prIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    prLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
    prValue: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 2,
    },
    prDelta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(46, 192, 126, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      gap: 2,
    },
    prDeltaText: {
      color: COLORS.success,
      fontSize: 12,
      fontWeight: '700',
    },
    bodyRow: { flexDirection: 'row', gap: 10 },
    bodyCard: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      ...SHADOWS.card,
    },
    bodyLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    bodyValue: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 4,
    },
    bodyTrend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 6,
    },
    bodyTrendText: {
      fontSize: 12,
      color: COLORS.success,
      fontWeight: '700',
    },
    emptyCard: {
      alignItems: 'center',
      gap: 8,
      padding: 22,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      marginBottom: 8,
      ...SHADOWS.card,
    },
    emptyText: {
      color: COLORS.muted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
