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

const DAYS = [1, 2, 3, 4, 5, 6, 7];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 9;

export default function DaysPerWeekPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selectedDays, setSelectedDays] = useState(answers.daysPerWeek ?? 3);

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

        <View style={styles.content}>
          <Text style={styles.title}>
            How many days per week{'\n'}can you work out?
          </Text>
          <Text style={styles.subtitle}>
            This helps personalize your workout plan
          </Text>

          <View style={styles.grid}>
            <View style={styles.row}>
              {DAYS.slice(0, 3).map((day) => {
                const selected = selectedDays === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDays(day)}
                    style={[
                      styles.dayButton,
                      selected ? styles.dayButtonSelected : styles.dayButtonDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selected && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day} {day === 1 ? 'Day' : 'Days'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row}>
              {DAYS.slice(3, 6).map((day) => {
                const selected = selectedDays === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDays(day)}
                    style={[
                      styles.dayButton,
                      selected ? styles.dayButtonSelected : styles.dayButtonDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selected && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day} Days
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setSelectedDays(7)}
              style={[
                styles.fullWidthButton,
                selectedDays === 7
                  ? styles.dayButtonSelected
                  : styles.dayButtonDefault,
              ]}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selectedDays === 7 && styles.dayButtonTextSelected,
                ]}
              >
                7 Days
              </Text>
            </Pressable>
          </View>
        </View>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('daysPerWeek', selectedDays);
            router.push('/onboarding/profile-complete' as never);
          }}
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
      paddingHorizontal: 20,
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
      backgroundColor: COLORS.divider,
    },
    progressBarActive: {
      backgroundColor: COLORS.primary,
    },
    content: {
      flex: 1,
      paddingTop: 28,
    },
    title: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      marginBottom: 30,
    },
    grid: {
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    dayButton: {
      flex: 1,
      height: 58,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidthButton: {
      width: '100%',
      height: 58,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayButtonSelected: {
      backgroundColor: COLORS.primary,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    dayButtonDefault: {
      backgroundColor: COLORS.inputBg,
    },
    dayButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.text,
    },
    dayButtonTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
