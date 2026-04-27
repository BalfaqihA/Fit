import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  EXERCISES,
  type Exercise,
  type MuscleGroup,
  muscleColor,
} from '@/constants/workout-data';
import { useTheme } from '@/hooks/use-theme';

const FILTERS: (MuscleGroup | 'All')[] = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full Body',
];

const MUSCLE_ICON: Record<MuscleGroup, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

export default function WorkoutPlan() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [filter, setFilter] = useState<MuscleGroup | 'All'>('All');

  const list = useMemo(
    () => (filter === 'All' ? EXERCISES : EXERCISES.filter((e) => e.muscle === filter)),
    [filter]
  );

  const totalXp = useMemo(
    () => EXERCISES.reduce((sum, e) => sum + e.xp, 0),
    []
  );

  const renderItem = ({ item }: { item: Exercise }) => {
    const color = muscleColor(item.muscle, COLORS);
    return (
      <Pressable
        onPress={() => router.push(`/workout/exercise/${item.id}` as never)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons
            name={MUSCLE_ICON[item.muscle] as never}
            size={26}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardChipRow}>
            <View style={[styles.chip, { backgroundColor: color + '22' }]}>
              <Text style={[styles.chipText, { color }]}>{item.muscle}</Text>
            </View>
            <View style={styles.chipOutline}>
              <Text style={styles.chipOutlineText}>{item.level}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {item.sets} × {item.reps ? `${item.reps} reps` : `${item.holdSec}s hold`}
          </Text>
        </View>
        <View style={styles.xpBadge}>
          <Ionicons name="flash" size={12} color={COLORS.primary} />
          <Text style={styles.xpBadgeText}>+{item.xp}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={['#8E54E9', '#6C56D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerLabel}>Beginner Plan</Text>
                <Text style={styles.bannerTitle}>
                  {EXERCISES.length} exercises
                </Text>
                <Text style={styles.bannerMeta}>~{totalXp.toLocaleString()} XP total</Text>
              </View>
              <Pressable
                onPress={() => router.push('/workout/week-plan' as never)}
                style={styles.bannerCta}
              >
                <Text style={styles.bannerCtaText}>My Plan</Text>
                <Ionicons name="chevron-forward" size={16} color="#6C56D9" />
              </Pressable>
            </LinearGradient>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((f) => {
                const active = f === filter;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {list.length} {list.length === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 14 }}>
            <PrimaryButton
              label="View My Week Plan"
              onPress={() => router.push('/workout/week-plan' as never)}
              icon={<Ionicons name="calendar-outline" size={18} color="#fff" />}
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    banner: {
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.button,
    },
    bannerLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    bannerTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
      marginTop: 4,
    },
    bannerMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      marginTop: 2,
    },
    bannerCta: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: RADIUS.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bannerCtaText: { color: '#6C56D9', fontSize: 13, fontWeight: '800' },
    filterRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
    },
    filterChipTextActive: { color: '#FFFFFF' },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 14,
      marginBottom: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      gap: 12,
      ...SHADOWS.card,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    cardChipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    chipText: { fontSize: 11, fontWeight: '700' },
    chipOutline: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipOutlineText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    cardMeta: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 4,
      fontWeight: '600',
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    xpBadgeText: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '800',
    },
  });
