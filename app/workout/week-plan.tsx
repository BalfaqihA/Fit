import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  USER_STATS,
  WEEK_PLAN,
  muscleColor,
  todayDayNumber,
} from '@/constants/workout-data';
import { useTheme } from '@/hooks/use-theme';

export default function WeekPlan() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const today = todayDayNumber();
  const totals = useMemo(() => {
    const active = WEEK_PLAN.filter((d) => !d.isRestDay);
    const exercises = active.reduce((n, d) => n + d.exercises.length, 0);
    const minutes = active.reduce((n, d) => n + d.estimatedMinutes, 0);
    return {
      activeDays: active.length,
      exercises,
      perDay: active.length === 0 ? 0 : Math.round(minutes / active.length),
    };
  }, []);

  const onRefresh = () => {
    Alert.alert('Regenerate plan?', 'Your current plan will be replaced.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Regenerate', onPress: () => Alert.alert('Done', 'A fresh plan was generated.') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>My Week</Text>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} hitSlop={8}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#8E54E9', '#6C56D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Item value={`${totals.activeDays}`} label="Workout Days" />
          <View style={styles.bannerDivider} />
          <Item value={`${totals.exercises}`} label="Total Exercises" />
          <View style={styles.bannerDivider} />
          <Item value={`${totals.perDay}m`} label="Min / Day" />
        </LinearGradient>

        <View style={styles.profileRow}>
          <View style={styles.profileChip}>
            <Ionicons name="trophy" size={14} color={COLORS.primary} />
            <Text style={styles.profileChipText}>{USER_STATS.fitnessLevel}</Text>
          </View>
          <View style={styles.profileChip}>
            <Ionicons name="flag" size={14} color={COLORS.primary} />
            <Text style={styles.profileChipText}>{USER_STATS.goal}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>This Week&apos;s Schedule</Text>

        {WEEK_PLAN.map((d) => {
          if (d.isRestDay) {
            return (
              <View key={d.day} style={[styles.dayCard, styles.restCard]}>
                <View style={styles.restIcon}>
                  <Ionicons name="moon" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayName}>{d.name}</Text>
                  <Text style={styles.dayMeta}>Rest day · Recovery & stretching</Text>
                </View>
                <MaterialCommunityIcons name="bed" size={20} color={COLORS.muted} />
              </View>
            );
          }

          const visibleMuscles = d.focusMuscles.slice(0, 3);
          const overflow = d.focusMuscles.length - visibleMuscles.length;
          const isToday = d.day === today;

          return (
            <Pressable
              key={d.day}
              onPress={() => router.push(`/workout/day/${d.day}` as never)}
              style={[styles.dayCard, isToday && styles.dayCardToday]}
            >
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeShort}>{d.short}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayName}>
                  {d.name}
                  {isToday && <Text style={styles.todayTag}>  · Today</Text>}
                </Text>
                <View style={styles.muscleRow}>
                  {visibleMuscles.map((m) => {
                    const c = muscleColor(m, COLORS);
                    return (
                      <View key={m} style={[styles.muscleChip, { backgroundColor: c + '22' }]}>
                        <Text style={[styles.muscleChipText, { color: c }]}>{m}</Text>
                      </View>
                    );
                  })}
                  {overflow > 0 && (
                    <View style={styles.muscleOverflow}>
                      <Text style={styles.muscleOverflowText}>+{overflow}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dayMeta}>
                  {d.exercises.length} exercises · {d.estimatedMinutes} min
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/workout/plan' as never)}
          style={styles.libraryBtn}
        >
          <Ionicons name="library-outline" size={18} color={COLORS.primary} />
          <Text style={styles.libraryBtnText}>Browse Exercise Library</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{label}</Text>
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
    refreshBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },
    scroll: { padding: 20, paddingBottom: 40 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 14,
      ...SHADOWS.button,
    },
    bannerDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    profileRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    profileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    profileChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    dayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      ...SHADOWS.card,
    },
    dayCardToday: { borderColor: COLORS.primary },
    restCard: { opacity: 0.95 },
    dayBadge: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBadgeShort: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    dayName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    todayTag: { color: COLORS.primary, fontWeight: '700' },
    muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    muscleChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    muscleChipText: { fontSize: 11, fontWeight: '700' },
    muscleOverflow: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    muscleOverflowText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    dayMeta: { fontSize: 12, color: COLORS.muted, marginTop: 6, fontWeight: '600' },
    restIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    libraryBtn: {
      marginTop: 8,
      height: 52,
      borderRadius: RADIUS.md,
      borderWidth: 2,
      borderColor: COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    libraryBtnText: {
      color: COLORS.primary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
