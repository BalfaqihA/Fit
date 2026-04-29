import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette, RADIUS } from '@/constants/design';

const REST_SECONDS = 90;

type Props = {
  exercise: { sets: number; reps: number };
  COLORS: Palette;
};

type SetStatus = 'idle' | 'resting' | 'rested' | 'done';

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function RepTracker({ exercise, COLORS }: Props) {
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const total = Math.max(0, exercise.sets);

  const [statuses, setStatuses] = useState<SetStatus[]>(() =>
    Array.from({ length: total }, () => 'idle')
  );
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(REST_SECONDS);
  const [restTotal, setRestTotal] = useState(REST_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-init when the exercise changes (different total).
  useEffect(() => {
    setStatuses(Array.from({ length: total }, () => 'idle'));
    setActiveIdx(null);
    setTimeLeft(REST_SECONDS);
    setRestTotal(REST_SECONDS);
  }, [total]);

  useEffect(() => {
    if (activeIdx === null) return;
    if (statuses[activeIdx] !== 'resting') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Stop at 0; flip to "rested" state and clear interval.
          setStatuses((prev) => {
            const next = [...prev];
            next[activeIdx] = 'rested';
            return next;
          });
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [activeIdx, statuses]);

  const startSet = (i: number) => {
    if (activeIdx !== null) return;
    setActiveIdx(i);
    setStatuses((prev) => {
      const next = [...prev];
      next[i] = 'resting';
      return next;
    });
    setTimeLeft(REST_SECONDS);
    setRestTotal(REST_SECONDS);
  };

  const extend = () => {
    setTimeLeft((t) => t + 15);
    setRestTotal((t) => t + 15);
  };

  const skip = () => {
    if (activeIdx === null) return;
    setStatuses((prev) => {
      const next = [...prev];
      next[activeIdx] = 'rested';
      return next;
    });
    setTimeLeft(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const markDone = () => {
    if (activeIdx === null) return;
    setStatuses((prev) => {
      const next = [...prev];
      next[activeIdx] = 'done';
      return next;
    });
    setActiveIdx(null);
    setTimeLeft(REST_SECONDS);
    setRestTotal(REST_SECONDS);
  };

  const doneCount = statuses.filter((s) => s === 'done').length;
  const ratio = restTotal > 0 ? 1 - timeLeft / restTotal : 0;
  const ringColor =
    ratio < 0.5 ? COLORS.success : ratio < 0.85 ? '#F4A93B' : COLORS.accent;

  return (
    <View>
      <Text style={styles.label}>
        {exercise.reps} reps × {total} sets · 90s rest
      </Text>

      {Array.from({ length: total }).map((_, i) => {
        const status = statuses[i] ?? 'idle';
        const n = i + 1;
        const isActive = activeIdx === i;
        const disabled =
          status === 'idle' && activeIdx !== null && activeIdx !== i;
        return (
          <View key={n} style={styles.row}>
            <View
              style={[
                styles.circle,
                status === 'done' && {
                  backgroundColor: COLORS.primary,
                  borderColor: COLORS.primary,
                },
                isActive && {
                  borderColor: COLORS.primary,
                },
              ]}
            >
              {status === 'done' ? (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              ) : (
                <Text style={styles.circleText}>{n}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.setLabel}>Set {n}</Text>
              <Text style={styles.setMeta}>{exercise.reps} reps</Text>
            </View>

            {status === 'idle' && (
              <Pressable
                onPress={() => startSet(i)}
                disabled={disabled}
                style={[
                  styles.startBtn,
                  disabled && styles.startBtnDisabled,
                ]}
              >
                <Ionicons
                  name="play"
                  size={14}
                  color={disabled ? COLORS.muted : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.startBtnText,
                    disabled && { color: COLORS.muted },
                  ]}
                >
                  Start Set {n}
                </Text>
              </Pressable>
            )}

            {status === 'resting' && (
              <View style={styles.timerWrap}>
                <Text style={[styles.timerText, { color: ringColor }]}>
                  {fmt(timeLeft)}
                </Text>
                <View style={styles.timerActions}>
                  <Pressable onPress={extend} style={styles.timerBtn}>
                    <Text style={styles.timerBtnText}>+15s</Text>
                  </Pressable>
                  <Pressable onPress={skip} style={styles.timerBtn}>
                    <Text style={styles.timerBtnText}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {status === 'rested' && (
              <Pressable onPress={markDone} style={styles.doneBtn}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            )}

            {status === 'done' && (
              <Text style={styles.completeTag}>Complete</Text>
            )}
          </View>
        );
      })}

      <Text style={styles.progress}>
        {doneCount} / {total} sets complete
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
    },
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.bg,
    },
    circleText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    setLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    setMeta: { fontSize: 11, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
    },
    startBtnDisabled: {
      backgroundColor: COLORS.primarySoft,
    },
    startBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    timerWrap: {
      alignItems: 'flex-end',
      gap: 6,
    },
    timerText: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
    timerActions: { flexDirection: 'row', gap: 6 },
    timerBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    timerBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.success,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
    },
    doneBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    completeTag: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '800',
      paddingHorizontal: 10,
    },
    progress: {
      textAlign: 'center',
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 12,
      fontWeight: '700',
    },
  });
