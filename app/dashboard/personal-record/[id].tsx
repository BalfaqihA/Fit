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
import {
  getDerivedRecord,
  useDerivedRecords,
} from '@/hooks/use-derived-records';
import { useTheme } from '@/hooks/use-theme';

export default function PersonalRecordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const records = useDerivedRecords();

  const pr = id ? getDerivedRecord(records, id) : undefined;

  if (!pr) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Record</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Finish a workout to start earning records.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const history = pr.history;
  const max = history.length ? Math.max(...history.map((p) => p.value)) : 0;
  const min = history.length ? Math.min(...history.map((p) => p.value)) : 0;
  const range = Math.max(max - min, 0.0001);
  const start = history.length ? history[0].value : 0;
  const end = history.length ? history[history.length - 1].value : 0;
  const overallChange = end - start;
  const overallChangeStr =
    (overallChange >= 0 ? '+' : '') + overallChange.toFixed(0);

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
            {pr.value} {pr.unit}
          </Text>
          <Text style={styles.heroMeta}>
            Achieved {formatDate(pr.achievedAt)}
          </Text>
          <View style={styles.heroDelta}>
            <Ionicons name="arrow-up" size={14} color={COLORS.success} />
            <Text style={styles.heroDeltaText}>{pr.delta}</Text>
          </View>
        </View>

        <Text style={styles.about}>{pr.description}</Text>

        <Text style={styles.sectionLabel}>HISTORY</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={28} color={COLORS.muted} />
            <Text style={styles.emptyText}>No data yet.</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {history.map((point, idx) => {
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
        )}

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <Row label="Entries" value={`${history.length}`} COLORS={COLORS} />
          <View style={styles.divider} />
          <Row
            label="Starting value"
            value={history.length ? `${start} ${pr.unit}` : '--'}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Latest value"
            value={history.length ? `${end} ${pr.unit}` : '--'}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <Row
            label="Overall change"
            value={history.length ? `${overallChangeStr} ${pr.unit}` : '--'}
            COLORS={COLORS}
          />
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
      marginBottom: 14,
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
    about: {
      fontSize: 13,
      color: COLORS.muted,
      lineHeight: 19,
      marginBottom: 18,
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
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { fontSize: 14, color: COLORS.muted, fontWeight: '600', textAlign: 'center' },
    emptyCard: {
      alignItems: 'center',
      gap: 10,
      padding: 24,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      ...SHADOWS.card,
    },
  });
