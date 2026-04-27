import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { PERSONAL_RECORDS } from '@/constants/dashboard-data';
import { useTheme } from '@/hooks/use-theme';

export default function PersonalRecordsList() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Personal Records</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          {PERSONAL_RECORDS.length} records tracked. Tap any one for the full history.
        </Text>

        {PERSONAL_RECORDS.map((pr) => (
          <Pressable
            key={pr.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() =>
              router.push(`/dashboard/personal-record/${pr.id}` as never)
            }
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={pr.icon as never}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{pr.label}</Text>
              <Text style={styles.meta}>
                Latest · {formatDate(pr.achievedAt)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.value}>
                {pr.value}
                {pr.unit !== 'time' ? ` ${pr.unit}` : ''}
              </Text>
              <View style={styles.delta}>
                <Ionicons
                  name={pr.trend === 'down' ? 'arrow-down' : 'arrow-up'}
                  size={11}
                  color={COLORS.success}
                />
                <Text style={styles.deltaText}>{pr.delta}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
    intro: { fontSize: 13, color: COLORS.muted, marginBottom: 14, marginLeft: 4 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      ...SHADOWS.card,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    value: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    delta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: 'rgba(46, 192, 126, 0.12)',
    },
    deltaText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  });
