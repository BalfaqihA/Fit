import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette } from '@/constants/design';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS = [
  '15 Minutes',
  '20 Minutes',
  '30 Minutes',
  '45 Minutes',
  '60+ Minutes',
];

function parseMinutes(label: string): number {
  const m = /^(\d+)/.exec(label);
  return m ? Number(m[1]) : 30;
}

const TOTAL_STEPS = 9;
const CURRENT_STEP = 8;

export default function WorkoutDurationPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selected, setSelected] = useState<string>(() => {
    if (!answers.sessionMinutes) return '30 Minutes';
    const match = OPTIONS.find((o) => parseMinutes(o) === answers.sessionMinutes);
    return match ?? '30 Minutes';
  });

  const progressItems = useMemo(
    () => new Array(TOTAL_STEPS).fill(null).map((_, i) => i),
    []
  );

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

        <Text style={styles.title}>How long per session?</Text>
        <Text style={styles.subtitle}>Pick a duration you can stick with</Text>

        <View style={styles.optionsWrapper}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option;
            return (
              <Pressable
                key={option}
                onPress={() => setSelected(option)}
                style={[
                  styles.optionCard,
                  isSelected
                    ? styles.optionCardSelected
                    : styles.optionCardUnselected,
                ]}
              >
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="timer-outline"
                    size={22}
                    color={isSelected ? '#FFFFFF' : COLORS.primary}
                  />
                </View>

                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>

                {isSelected ? (
                  <View style={styles.checkedCircle}>
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={COLORS.primary}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('sessionMinutes', parseMinutes(selected));
            router.push('/onboarding/days-per-week' as never);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24,
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
      backgroundColor: COLORS.divider,
    },
    progressBarActive: {
      backgroundColor: COLORS.primary,
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 28,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      marginBottom: 28,
    },
    optionsWrapper: {
      flex: 1,
      gap: 12,
    },
    optionCard: {
      minHeight: 64,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionCardSelected: {
      backgroundColor: COLORS.primary,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    optionCardUnselected: {
      backgroundColor: COLORS.inputBg,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
    },
    optionTextSelected: {
      color: '#FFFFFF',
    },
    checkedCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.divider,
      backgroundColor: COLORS.card,
    },
  });
