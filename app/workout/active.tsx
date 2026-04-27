import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  CALORIES_PER_MINUTE,
  EXERCISES,
  getDayByNumber,
  muscleColor,
  type Exercise,
} from '@/constants/workout-data';
import { useTheme } from '@/hooks/use-theme';

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveWorkout() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const { day } = useLocalSearchParams<{ day?: string }>();

  const exercises: Exercise[] = useMemo(() => {
    if (!day) return EXERCISES.slice(0, 5);
    const dayPlan = getDayByNumber(Number(day));
    if (!dayPlan || dayPlan.isRestDay) return EXERCISES.slice(0, 5);
    return dayPlan.exercises
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter((e): e is Exercise => Boolean(e));
  }, [day]);

  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const xp = minutes * 3 + Array.from(completed).reduce((sum, id) => {
    const ex = exercises.find((e) => e.id === id);
    return sum + (ex?.xp ?? 0);
  }, 0);
  const calories = Math.round(minutes * CALORIES_PER_MINUTE);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onClose = () => {
    Alert.alert('Quit workout?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Quit',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const onFinish = () => {
    router.replace({
      pathname: '/workout/summary',
      params: {
        duration: String(Math.max(1, minutes)),
        calories: String(calories),
        done: String(completed.size),
        xp: String(Math.max(50, xp + 50)),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Active Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#8E54E9', '#6C56D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timerCard}
        >
          <Text style={styles.timerLabel}>Elapsed</Text>
          <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
          <View style={styles.timerRow}>
            <View style={styles.timerItem}>
              <Text style={styles.timerItemValue}>{xp}</Text>
              <Text style={styles.timerItemLabel}>XP</Text>
            </View>
            <View style={styles.timerDivider} />
            <View style={styles.timerItem}>
              <Text style={styles.timerItemValue}>{calories}</Text>
              <Text style={styles.timerItemLabel}>kcal</Text>
            </View>
            <View style={styles.timerDivider} />
            <View style={styles.timerItem}>
              <Text style={styles.timerItemValue}>{completed.size}</Text>
              <Text style={styles.timerItemLabel}>done</Text>
            </View>
          </View>
          <Text style={styles.timerFoot}>+3 XP / min · +exercise XP on complete</Text>
        </LinearGradient>

        <Text style={styles.listTitle}>Exercises</Text>

        {exercises.map((ex) => {
          const done = completed.has(ex.id);
          const color = muscleColor(ex.muscle, COLORS);
          return (
            <Pressable
              key={ex.id}
              onPress={() => toggle(ex.id)}
              style={[
                styles.exRow,
                done && { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  done && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                ]}
              >
                {done && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, done && { color: COLORS.primary }]}>
                  {ex.name}
                </Text>
                <Text style={styles.exMeta}>
                  <Text style={{ color }}>{ex.muscle}</Text>
                  {'  ·  '}
                  {ex.sets} × {ex.reps ? `${ex.reps} reps` : `${ex.holdSec}s`}
                </Text>
              </View>
              <View style={styles.exXp}>
                <Ionicons name="flash" size={11} color={COLORS.primary} />
                <Text style={styles.exXpText}>+{ex.xp}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={completed.size === 0 ? 'Complete at least one exercise' : 'Finish Workout'}
          onPress={onFinish}
          disabled={completed.size === 0}
          icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
        />
      </View>
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
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    scroll: { padding: 20, paddingBottom: 24 },
    timerCard: {
      borderRadius: RADIUS.lg,
      padding: 22,
      alignItems: 'center',
      marginBottom: 22,
      ...SHADOWS.button,
    },
    timerLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    timerValue: {
      color: '#FFFFFF',
      fontSize: 56,
      fontWeight: '800',
      marginTop: 6,
      letterSpacing: 2,
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      width: '100%',
    },
    timerItem: { flex: 1, alignItems: 'center' },
    timerItemValue: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },
    timerItemLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    timerDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    timerFoot: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      marginTop: 14,
    },
    listTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    exRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      ...SHADOWS.card,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    exMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '600' },
    exXp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
    },
    exXpText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: COLORS.bg,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
    },
  });
