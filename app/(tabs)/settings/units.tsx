import { Ionicons } from '@expo/vector-icons';
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
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { DistanceUnit, WeightUnit } from '@/types/community';

const WEIGHT_OPTIONS: { value: WeightUnit; label: string; sub: string }[] = [
  { value: 'kg', label: 'Kilograms', sub: 'kg' },
  { value: 'lb', label: 'Pounds', sub: 'lb' },
];

const DISTANCE_OPTIONS: { value: DistanceUnit; label: string; sub: string }[] = [
  { value: 'km', label: 'Kilometers', sub: 'km' },
  { value: 'mi', label: 'Miles', sub: 'mi' },
];

export default function Units() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile, updateProfile } = useUserProfile();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Units</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>WEIGHT</Text>
        <View style={styles.card}>
          {WEIGHT_OPTIONS.map((opt, idx) => {
            const selected = profile.weightUnit === opt.value;
            return (
              <View key={opt.value}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                  onPress={() => updateProfile({ weightUnit: opt.value })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{opt.label}</Text>
                    <Text style={styles.rowSub}>{opt.sub}</Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </Pressable>
                {idx < WEIGHT_OPTIONS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>DISTANCE</Text>
        <View style={styles.card}>
          {DISTANCE_OPTIONS.map((opt, idx) => {
            const selected = profile.distanceUnit === opt.value;
            return (
              <View key={opt.value}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                  onPress={() => updateProfile({ distanceUnit: opt.value })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{opt.label}</Text>
                    <Text style={styles.rowSub}>{opt.sub}</Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </Pressable>
                {idx < DISTANCE_OPTIONS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
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
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
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
    rowSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginLeft: 16,
    },
  });
