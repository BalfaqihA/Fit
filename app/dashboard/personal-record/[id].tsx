import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { getPersonalRecord } from '@/constants/dashboard-data';
import { useTheme } from '@/hooks/use-theme';

export default function PersonalRecordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const pr = id ? getPersonalRecord(id) : undefined;

  if (!pr) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Record</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Record not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const max = Math.max(...pr.history.map((p) => p.value));
  const min = Math.min(...pr.history.map((p) => p.value));
  const range = Math.max(max - min, 0.0001);

  // For time-based PRs (5K), lower is better — invert visual fill.
  const isTime = pr.unit === 'time';
  const start = pr.history[0].value;
  const end = pr.history[pr.history.length - 1].value;
  const overallChange = isTime ? start - end : end - start;
  const overallChangeStr =
    (overallChange >= 0 ? '+' : '') + overallChange.toFixed(2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{pr.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name={pr.icon as never}
              size={30}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.heroValue}>
            {pr.value}
            {pr.unit !== 'time' ? ` ${pr.unit}` : ''}
          </Text>
          <Text style={styles.heroMeta}>
            Last achieved {formatDate(pr.achievedAt)}
          </Text>
          <View style={styles.heroDelta}>
            <Ionicons
              name={pr.trend === 'down' ? 'arrow-down' : 'arrow-up'}
              size={14}
              color={COLORS.success}
            />
            <Text style={styles.heroDeltaText}>{pr.delta} since last record</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>HISTORY</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {pr.history.map((point, idx) => {
              const norm = (point.value - min) / range;
              const heightPct = isTime ? (1 - norm) * 100 : norm * 100;
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
                  <Text style={styles.barValue}>
                    {isTime
                      ? formatTime(point.value)
                      : `${point.value}${pr.unit ? '' : ''}`}
                  </Text>
                  <Text style={styles.barDate}>{shortDate(point.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <Row label="Records logged" value={`${pr.history.length}`} COLORS={COLORS} />
          <View style={styles.divider} />
          <Row
            label="Starting value"
            value={isTime ? formatTime(start) : `${start} ${pr.unit}`}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Latest value"
            value={isTime ? formatTime(end) : `${end} ${pr.unit}`}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Overall change"
            value={overallChangeStr + (isTime ? ' (faster)' : ` ${pr.unit}`)}
            COLORS={COLORS}
          />
        </View>

        {pr.notes && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notes}>{pr.notes}</Text>
            </View>
          </>
        )}
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

function formatTime(value: number): string {
  // value in minutes (e.g., 22.23 = 22m 14s if encoded as fractional minutes)
  const m = Math.floor(value);
  const s = Math.round((value - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
      marginBottom: 22,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    heroValue: { fontSize: 30, fontWeight: '800', color: COLORS.text },
    heroMeta: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
    heroDelta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(46, 192, 126, 0.12)',
    },
    heroDeltaText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
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
    notesCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      ...SHADOWS.card,
    },
    notes: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 15, color: COLORS.muted },
  });
