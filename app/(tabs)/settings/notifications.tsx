import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

type ToggleKey =
  | 'workoutReminders'
  | 'achievements'
  | 'community'
  | 'dailyChallenges'
  | 'streaks';

type ToggleDef = { key: ToggleKey; label: string; desc: string };

const toggles: ToggleDef[] = [
  {
    key: 'workoutReminders',
    label: 'Workout reminders',
    desc: 'Get a nudge at your scheduled training time',
  },
  {
    key: 'achievements',
    label: 'Achievement unlocks',
    desc: 'Celebrate new badges, PRs, and milestones',
  },
  {
    key: 'community',
    label: 'Community notifications',
    desc: 'When friends post updates or reach milestones',
  },
  {
    key: 'dailyChallenges',
    label: 'Daily challenges',
    desc: 'A fresh challenge each day to keep you moving',
  },
  {
    key: 'streaks',
    label: 'Streak notifications',
    desc: "Reminders so you don't break your streak",
  },
];

export default function Notifications() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [state, setState] = useState<Record<ToggleKey, boolean>>({
    workoutReminders: true,
    achievements: true,
    community: false,
    dailyChallenges: true,
    streaks: true,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Choose which notifications you want to receive.
        </Text>

        <View style={styles.card}>
          {toggles.map((t, idx) => (
            <View key={t.key}>
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowDesc}>{t.desc}</Text>
                </View>
                <Switch
                  value={state[t.key]}
                  onValueChange={(v) =>
                    setState((prev) => ({ ...prev, [t.key]: v }))
                  }
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {idx < toggles.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
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
    intro: {
      fontSize: 14,
      color: COLORS.muted,
      marginBottom: 16,
      lineHeight: 20,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    rowDesc: { fontSize: 12, color: COLORS.muted, marginTop: 3, lineHeight: 16 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginHorizontal: 16,
    },
  });
