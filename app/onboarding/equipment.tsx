import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS } from '@/constants/design';
import { pickPrimaryEquipment } from '@/contexts/onboarding';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';
import type { EquipmentKey } from '@/types/community';

const OPTIONS: { key: EquipmentKey; label: string; icon: string; hint: string }[] = [
  { key: 'body', label: 'Body weight', icon: 'human-handsup', hint: 'Bodyweight only' },
  { key: 'dumbbells', label: 'Dumbbells', icon: 'dumbbell', hint: 'Great for home workouts' },
  { key: 'barbell', label: 'Barbell', icon: 'weight-lifter', hint: 'Strength-focused' },
  { key: 'bands', label: 'Resistance Bands', icon: 'chart-bell-curve', hint: 'Light & portable' },
  { key: 'kettlebell', label: 'Kettlebell', icon: 'kettlebell', hint: 'Power & conditioning' },
  { key: 'full-gym', label: 'Full Gym Access', icon: 'office-building', hint: 'All the machines' },
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 7;

export default function EquipmentPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selected, setSelected] = useState<Set<EquipmentKey>>(
    new Set<EquipmentKey>(answers.equipment ? [answers.equipment] : ['body'])
  );

  const progressItems = useMemo(
    () => new Array(TOTAL_STEPS).fill(null).map((_, i) => i),
    []
  );

  const toggle = (key: EquipmentKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const canContinue = selected.size > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <BackButton />

          <View style={styles.progressRow}>
            {progressItems.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.progressBar,
                  index < CURRENT_STEP && styles.progressBarActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>What equipment{'\n'}do you have?</Text>
          <Text style={styles.subtitle}>
            Select everything available to you — you can change this anytime.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {OPTIONS.map((opt) => {
            const isSelected = selected.has(opt.key);
            return (
              <Pressable
                key={opt.key}
                onPress={() => toggle(opt.key)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    isSelected && styles.iconBoxSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as never}
                    size={22}
                    color={isSelected ? '#FFFFFF' : COLORS.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>

                <View
                  style={[
                    styles.checkBox,
                    isSelected && styles.checkBoxSelected,
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('equipment', pickPrimaryEquipment(selected));
            router.push('/onboarding/workout-duration' as never);
          }}
          disabled={!canContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    container: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 26,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
    },
    progressBar: {
      flex: 1,
      height: 5,
      borderRadius: 100,
      backgroundColor: COLORS.border,
    },
    progressBarActive: {
      backgroundColor: COLORS.primary,
    },
    header: {
      paddingTop: 26,
      paddingBottom: 18,
    },
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.muted,
      maxWidth: 320,
    },
    listContent: {
      paddingBottom: 16,
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      padding: 14,
    },
    optionCardSelected: {
      backgroundColor: COLORS.primary,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    iconBoxSelected: {
      backgroundColor: COLORS.primary,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 2,
    },
    optionHint: {
      fontSize: 12,
      color: COLORS.muted,
    },
    checkBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.card,
    },
    checkBoxSelected: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
    },
  });
