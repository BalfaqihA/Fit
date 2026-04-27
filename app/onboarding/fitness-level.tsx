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
import type { FitnessLevel as Level } from '@/types/community';

const options = [
  {
    key: 'beginner' as Level,
    title: 'Beginner',
    subtitle: 'Just starting out',
    icon: 'dumbbell',
  },
  {
    key: 'intermediate' as Level,
    title: 'Intermediate',
    subtitle: 'Some experience',
    icon: 'trending-up',
  },
  {
    key: 'advanced' as Level,
    title: 'Advanced',
    subtitle: 'Highly experienced',
    icon: 'flash',
  },
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 6;

export default function FitnessLevelPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selectedLevel, setSelectedLevel] = useState<Level>(
    answers.level ?? 'beginner'
  );

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

        <Text style={styles.title}>What is your fitness{'\n'}level?</Text>
        <Text style={styles.subtitle}>
          This helps personalize your workout plan
        </Text>

        <View style={styles.optionsWrapper}>
          {options.map((item) => {
            const selected = selectedLevel === item.key;

            return (
              <View key={item.key}>
                <Pressable
                  onPress={() => setSelectedLevel(item.key)}
                  style={[
                    styles.optionCard,
                    selected ? styles.optionCardSelected : styles.optionCardDefault,
                  ]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      selected ? styles.iconBoxSelected : styles.iconBoxDefault,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as never}
                      size={26}
                      color={selected ? '#FFFFFF' : COLORS.primary}
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <Text
                      style={[
                        styles.optionTitle,
                        selected && styles.optionTitleSelected,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.optionSubtitle,
                        selected && styles.optionSubtitleSelected,
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  {selected ? (
                    <View style={styles.checkedCircle}>
                      <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedCircle} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.ctaWrap}>
          <PrimaryButton
            label="Next"
            onPress={() => {
              setAnswer('level', selectedLevel);
              router.push('/onboarding/equipment' as never);
            }}
          />
        </View>
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
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 32,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 28,
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
      lineHeight: 36,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      textAlign: 'center',
      marginBottom: 40,
    },
    optionsWrapper: {
      flex: 1,
      gap: 14,
    },
    optionCard: {
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
    },
    optionCardSelected: {
      backgroundColor: COLORS.primary,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    optionCardDefault: {
      backgroundColor: COLORS.inputBg,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    iconBoxSelected: {
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    iconBoxDefault: {
      backgroundColor: COLORS.card,
    },
    textWrap: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },
    optionTitleSelected: {
      color: '#FFFFFF',
    },
    optionSubtitle: {
      fontSize: 13,
      color: COLORS.muted,
    },
    optionSubtitleSelected: {
      color: 'rgba(255,255,255,0.85)',
    },
    checkedCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uncheckedCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: COLORS.divider,
      backgroundColor: COLORS.card,
    },
    selectedDescription: {
      marginTop: 10,
      marginHorizontal: 4,
      fontSize: 13,
      lineHeight: 20,
      color: COLORS.muted,
    },
    ctaWrap: {
      marginTop: 16,
    },
  });
