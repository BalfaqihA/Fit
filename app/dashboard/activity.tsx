import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { ACTIVITY_TOTALS, WEEKLY_BARS } from '@/constants/dashboard-data';
import { useTheme } from '@/hooks/use-theme';

export default function ActivityDetail() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const totalMinutes = WEEKLY_BARS.reduce((sum, b) => sum + b.minutes, 0);
  const peak = WEEKLY_BARS.reduce(
    (best, bar) => (bar.minutes > best.minutes ? bar : best),
    WEEKLY_BARS[0]
  );
  const avgPerDay = Math.round(totalMinutes / WEEKLY_BARS.length);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>WEEKLY OVERVIEW</Text>
        <View style={styles.cardsRow}>
          <Tile
            icon="time-outline"
            iconColor={COLORS.primary}
            iconBg={COLORS.primarySoft}
            label="Total minutes"
            value={`${ACTIVITY_TOTALS.minutes}`}
            COLORS={COLORS}
          />
          <Tile
            icon="flame-outline"
            iconColor="#FF5A64"
            iconBg="#FFE1E1"
            label="Calories burned"
            value={`${(ACTIVITY_TOTALS.calories / 1000).toFixed(1)}k`}
            COLORS={COLORS}
          />
        </View>
        <View style={styles.cardsRow}>
          <Tile
            icon="barbell-outline"
            iconColor="#0C7A8A"
            iconBg="#E8E3E1"
            label="Workouts"
            value={`${ACTIVITY_TOTALS.workouts}`}
            COLORS={COLORS}
          />
          <Tile
            icon="walk-outline"
            iconColor="#E0B400"
            iconBg="#FFF3E0"
            label="Distance"
            value={`${ACTIVITY_TOTALS.distanceKm} km`}
            COLORS={COLORS}
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>STREAK</Text>
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <MaterialCommunityIcons name="fire" size={26} color="#FF5A64" />
            <Text style={styles.streakValue}>{ACTIVITY_TOTALS.activeDays}</Text>
            <Text style={styles.streakLabel}>Active days</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: COLORS.divider }]} />
          <View style={styles.streakItem}>
            <Ionicons name="ribbon-outline" size={26} color={COLORS.primary} />
            <Text style={styles.streakValue}>{ACTIVITY_TOTALS.longestStreak}</Text>
            <Text style={styles.streakLabel}>Longest streak</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>LAST 7 DAYS</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {WEEKLY_BARS.map((bar, idx) => (
              <View key={`${bar.day}-${idx}`} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { height: `${bar.value * 100}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{bar.day}</Text>
                <Text style={styles.barMin}>{bar.minutes}m</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryRow}>
            <Summary label="Avg / day" value={`${avgPerDay} min`} COLORS={COLORS} />
            <Summary label="Best day" value={`${peak.day} · ${peak.minutes}m`} COLORS={COLORS} />
            <Summary label="Total" value={`${totalMinutes} min`} COLORS={COLORS} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  COLORS,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  COLORS: Palette;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: 14,
        ...SHADOWS.card,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function Summary({
  label,
  value,
  COLORS,
}: {
  label: string;
  value: string;
  COLORS: Palette;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '700', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 4 }}>
        {value}
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
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginLeft: 4,
    },
    cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      paddingVertical: 18,
      ...SHADOWS.card,
    },
    streakItem: { flex: 1, alignItems: 'center', gap: 4 },
    streakValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 4 },
    streakLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    streakDivider: { width: 1, height: 50 },
    chartCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 18,
      ...SHADOWS.card,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 160,
      marginBottom: 6,
    },
    barColumn: { alignItems: 'center', flex: 1 },
    barTrack: {
      width: 22,
      height: 120,
      backgroundColor: COLORS.primarySoft,
      borderRadius: 11,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 11 },
    barLabel: { marginTop: 8, fontSize: 11, fontWeight: '700', color: COLORS.text },
    barMin: { marginTop: 2, fontSize: 10, color: COLORS.muted },
    summaryRow: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.divider,
    },
  });
