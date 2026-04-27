import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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
import { type BodyStat, getBodyStat } from '@/constants/dashboard-data';
import { useTheme } from '@/hooks/use-theme';

export default function BodyStatDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const stat = key ? getBodyStat(key as BodyStat['key']) : undefined;

  if (!stat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Stat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Stat not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const max = Math.max(...stat.history.map((p) => p.value));
  const min = Math.min(...stat.history.map((p) => p.value));
  const range = Math.max(max - min, 0.0001);

  // For body stats, 'down' trend usually means improving (e.g., weight, BMI, body fat)
  const start = stat.history[0].value;
  const end = stat.history[stat.history.length - 1].value;
  const overallChange = end - start;
  const positive = stat.trend === 'down' ? overallChange < 0 : overallChange > 0;
  const sign = overallChange > 0 ? '+' : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{stat.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>
            {stat.value}
            {stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit}
          </Text>
          <Text style={styles.heroLabel}>Latest measurement</Text>
          <View
            style={[
              styles.heroTrend,
              {
                backgroundColor: positive
                  ? 'rgba(46, 192, 126, 0.12)'
                  : 'rgba(255, 90, 100, 0.12)',
              },
            ]}
          >
            <Ionicons
              name={stat.trend === 'down' ? 'trending-down' : 'trending-up'}
              size={14}
              color={positive ? COLORS.success : COLORS.accent}
            />
            <Text
              style={[
                styles.heroTrendText,
                { color: positive ? COLORS.success : COLORS.accent },
              ]}
            >
              {stat.change}
              {stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit} this month
            </Text>
          </View>
        </View>

        <Text style={styles.about}>{stat.description}</Text>

        <Text style={styles.sectionLabel}>HISTORY</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {stat.history.map((point, idx) => {
              const norm = (point.value - min) / range;
              const heightPct = norm * 100;
              return (
                <View key={`${point.date}-${idx}`} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max(heightPct, 8)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{point.value}</Text>
                  <Text style={styles.barDate}>{shortDate(point.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <Row label="Entries" value={`${stat.history.length}`} COLORS={COLORS} />
          <View style={styles.divider} />
          <Row
            label="Starting value"
            value={`${start}${stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit}`}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Latest value"
            value={`${end}${stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit}`}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Net change"
            value={`${sign}${overallChange.toFixed(1)}${stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit}`}
            COLORS={COLORS}
          />
          {stat.goal && (
            <>
              <View style={styles.divider} />
              <Row label="Goal" value={stat.goal} COLORS={COLORS} />
            </>
          )}
          <View style={styles.divider} />
          <Row label="Highest" value={`${max}`} COLORS={COLORS} />
          <View style={styles.divider} />
          <Row label="Lowest" value={`${min}`} COLORS={COLORS} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  COLORS,
}: {
  label: string;
  value: string;
  COLORS: Palette;
}) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ flex: 1, fontSize: 14, color: COLORS.muted, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>{value}</Text>
    </View>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
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
    heroCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 22,
      alignItems: 'center',
      ...SHADOWS.card,
    },
    heroValue: { fontSize: 32, fontWeight: '800', color: COLORS.text },
    heroLabel: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
    heroTrend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    heroTrendText: { fontSize: 12, fontWeight: '700' },
    about: {
      fontSize: 13,
      color: COLORS.muted,
      lineHeight: 19,
      marginTop: 14,
      marginBottom: 22,
      paddingHorizontal: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginLeft: 4,
    },
    chartCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      ...SHADOWS.card,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 180,
    },
    barColumn: { alignItems: 'center', flex: 1 },
    barTrack: {
      width: 18,
      height: 130,
      backgroundColor: COLORS.primarySoft,
      borderRadius: 9,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 9 },
    barValue: { marginTop: 6, fontSize: 11, fontWeight: '800', color: COLORS.text },
    barDate: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
    summaryCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      ...SHADOWS.card,
      overflow: 'hidden',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginHorizontal: 14,
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 15, color: COLORS.muted },
  });
