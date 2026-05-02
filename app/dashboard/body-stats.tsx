import { Ionicons } from '@expo/vector-icons';
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
import { WeighInModal } from '@/components/weigh-in-modal';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useBodyStats } from '@/hooks/use-body-stats';
import { useTheme } from '@/hooks/use-theme';

export default function BodyStatsList() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { stats, hasMeasurements } = useBodyStats();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Body Stats</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Tracked metrics. Tap any one to see the full history.
        </Text>

        <Pressable
          onPress={() => setLogOpen(true)}
          style={({ pressed }) => [styles.logCard, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.logIcon}>
            <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logTitle}>Log a weigh-in</Text>
            <Text style={styles.logSubtitle}>
              {hasMeasurements
                ? 'Add a new entry to update Weight and BMI.'
                : 'Set your baseline so we can track progress.'}
            </Text>
          </View>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </Pressable>

        {stats.map((stat) => {
          const trendIcon: 'trending-down' | 'trending-up' =
            stat.netChange < 0 ? 'trending-down' : 'trending-up';
          const trendColor = stat.improving ? COLORS.success : COLORS.accent;
          return (
            <Pressable
              key={stat.key}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push(`/dashboard/body-stat/${stat.key}` as never)
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{stat.label}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {stat.description}
                </Text>
                {stat.goal ? (
                  <Text style={styles.goal}>Goal · {stat.goal}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.value}>
                  {stat.value}
                  {stat.unit ? ` ${stat.unit}` : ''}
                </Text>
                <View
                  style={[
                    styles.trend,
                    { backgroundColor: trendColor + '22' },
                  ]}
                >
                  <Ionicons name={trendIcon} size={12} color={trendColor} />
                  <Text style={[styles.trendText, { color: trendColor }]}>
                    {stat.changeLabel}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <WeighInModal visible={logOpen} onClose={() => setLogOpen(false)} />
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
    scroll: { padding: 20, paddingBottom: 40 },
    intro: { fontSize: 13, color: COLORS.muted, marginBottom: 14, marginLeft: 4 },
    logCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 14,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
      ...SHADOWS.card,
    },
    logIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    logSubtitle: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2,
      fontWeight: '600',
    },
    card: {
      flexDirection: 'row',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 16,
      marginBottom: 10,
      gap: 12,
      ...SHADOWS.card,
    },
    label: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    description: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },
    goal: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 6 },
    value: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    trend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    trendText: { fontSize: 11, fontWeight: '700' },
  });
