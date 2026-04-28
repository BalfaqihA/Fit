import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette } from '@/constants/design';

type Props = {
  exercise: { sets: number; holdSec?: number };
  COLORS: Palette;
};

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function HoldTracker({ exercise, COLORS }: Props) {
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const total = exercise.sets;
  const holdSec = exercise.holdSec ?? 30;

  const [setIdx, setSetIdx] = useState(1);
  const [timeLeft, setTimeLeft] = useState(holdSec);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setTimeLeft(holdSec);
  };

  const next = () => {
    setRunning(false);
    setTimeLeft(holdSec);
    setSetIdx((s) => Math.min(total, s + 1));
  };

  const ratio = 1 - timeLeft / holdSec;
  const ringColor =
    ratio < 0.5 ? COLORS.success : ratio < 0.85 ? '#F4A93B' : COLORS.accent;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 6 }}>
      <Text style={styles.label}>
        Set {setIdx} of {total}
      </Text>
      <View style={[styles.ring, { borderColor: COLORS.primarySoft }]}>
        <View
          style={[
            styles.ringFill,
            {
              borderColor: ringColor,
              transform: [{ rotate: `${ratio * 360}deg` }],
            },
          ]}
        />
        <Text style={[styles.timeText, { color: COLORS.text }]}>{fmt(timeLeft)}</Text>
        <Text style={styles.timeMeta}>hold</Text>
      </View>

      <View style={styles.btnRow}>
        <Pressable onPress={reset} style={styles.btnGhost}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </Pressable>
        <Pressable onPress={() => setRunning((r) => !r)} style={styles.btnPlay}>
          <Ionicons name={running ? 'pause' : 'play'} size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={next} style={styles.btnGhost}>
          <Ionicons name="play-skip-forward" size={18} color={COLORS.primary} />
        </Pressable>
      </View>
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
    ring: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      overflow: 'hidden',
    },
    ringFill: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 8,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    timeText: { fontSize: 28, fontWeight: '800' },
    timeMeta: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 14,
    },
    btnGhost: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPlay: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
