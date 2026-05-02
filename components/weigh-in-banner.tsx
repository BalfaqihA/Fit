import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WeighInModal } from '@/components/weigh-in-modal';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useMeasurements } from '@/hooks/use-measurements';

const REMIND_AFTER_DAYS = 7;

export function WeighInBanner() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { daysSinceLast, latest, loading } = useMeasurements();
  const [open, setOpen] = useState(false);

  // Don't show until we know the user has a baseline weight from onboarding.
  if (loading || !profile.weightKg) return null;

  // Show when: never logged a measurement, OR last log >= 7 days ago.
  const shouldShow =
    latest === null ||
    (typeof daysSinceLast === 'number' && daysSinceLast >= REMIND_AFTER_DAYS);
  if (!shouldShow) return null;

  const subtitle = latest
    ? `It's been ${daysSinceLast} days since your last weigh-in.`
    : 'Set your baseline weight to start tracking progress.';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.iconBubble}>
          <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Weekly weigh-in</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
      </Pressable>
      <WeighInModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 14,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
      ...SHADOWS.card,
    },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    subtitle: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2,
      fontWeight: '600',
    },
  });
