import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette } from '@/constants/design';

type Props = {
  exercise: { sets: number; reps: number };
  COLORS: Palette;
};

export function RepTracker({ exercise, COLORS }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const total = exercise.sets;

  const toggle = (n: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  return (
    <View>
      <Text style={styles.label}>
        {exercise.reps} reps × {total} sets
      </Text>
      <View style={styles.circleRow}>
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const isDone = done.has(n);
          return (
            <Pressable
              key={n}
              onPress={() => toggle(n)}
              style={[
                styles.circle,
                isDone && {
                  backgroundColor: COLORS.primary,
                  borderColor: COLORS.primary,
                },
              ]}
            >
              {isDone ? (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              ) : (
                <Text style={styles.circleText}>{n}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.progress}>
        {done.size} / {total} sets complete
      </Text>
    </View>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 4,
      marginBottom: 12,
      textAlign: 'center',
    },
    circleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.bg,
    },
    circleText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    progress: {
      textAlign: 'center',
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 12,
      fontWeight: '700',
    },
  });
