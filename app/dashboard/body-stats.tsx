import { Ionicons } from '@expo/vector-icons';
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

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { BODY_STATS } from '@/constants/dashboard-data';
import { useTheme } from '@/hooks/use-theme';

export default function BodyStatsList() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

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

        {BODY_STATS.map((stat) => (
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
              {stat.goal && (
                <Text style={styles.goal}>Goal · {stat.goal}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.value}>
                {stat.value}
                {stat.unit && stat.unit !== '%' ? ` ${stat.unit}` : stat.unit}
              </Text>
              <View style={styles.trend}>
                <Ionicons
                  name={stat.trend === 'down' ? 'trending-down' : 'trending-up'}
                  size={12}
                  color={COLORS.success}
                />
                <Text style={styles.trendText}>{stat.change}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
      backgroundColor: 'rgba(46, 192, 126, 0.12)',
    },
    trendText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
  });
