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
import { type Palette } from '@/constants/design';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';
import type { GoalKey } from '@/types/community';

const goalOptions: {
  key: GoalKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}[] = [
  {
    key: 'lose_weight',
    title: 'Lose Weight',
    subtitle: 'Burn fat and reach your ideal body weight',
    icon: <MaterialCommunityIcons name="scale-bathroom" size={24} color="#FF5A64" />,
    iconBg: '#FFE1E1',
  },
  {
    key: 'build_muscle',
    title: 'Build Muscle',
    subtitle: 'Gain strength and increase muscle mass',
    icon: <MaterialCommunityIcons name="dumbbell" size={24} color="#6C56D9" />,
    iconBg: '#EDE8F8',
  },
  {
    key: 'stay_fit',
    title: 'Stay Fit',
    subtitle: 'Maintain your current fitness and health',
    icon: <MaterialCommunityIcons name="meditation" size={24} color="#0C7A8A" />,
    iconBg: '#E8E3E1',
  },
  {
    key: 'increase_endurance',
    title: 'Increase Endurance',
    subtitle: 'Boost stamina and cardiovascular fitness',
    icon: <MaterialCommunityIcons name="run-fast" size={24} color="#E0B400" />,
    iconBg: '#FFF3E0',
  },
  {
    key: 'improve_flexibility',
    title: 'Improve Flexibility',
    subtitle: 'Enhance mobility and reduce injury risk',
    icon: <MaterialCommunityIcons name="human-handsup" size={24} color="#8A43CC" />,
    iconBg: '#F2E9FF',
  },
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 5;

export default function GoalPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<GoalKey>(
    answers.goal ?? 'lose_weight'
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>What is your main fitness goal?</Text>
          <Text style={styles.subtitle}>
            This helps personalize your workout plan
          </Text>

          <View style={styles.optionsWrapper}>
            {goalOptions.map((goal) => {
              const selected = selectedGoal === goal.key;

              return (
                <Pressable
                  key={goal.key}
                  onPress={() => setSelectedGoal(goal.key)}
                  style={[
                    styles.optionCard,
                    selected ? styles.optionCardSelected : styles.optionCardUnselected,
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : goal.iconBg }]}>
                    {goal.icon}
                  </View>

                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                      {goal.title}
                    </Text>
                    <Text style={[styles.optionSubtitle, selected && styles.optionSubtitleSelected]}>
                      {goal.subtitle}
                    </Text>
                  </View>

                  <View style={styles.radioWrap}>
                    {selected ? (
                      <View style={styles.checkedCircle}>
                        <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('goal', selectedGoal);
            router.push('/onboarding/fitness-level' as never);
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
    scrollContent: {
      paddingTop: 28,
      paddingBottom: 24,
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 8,
      maxWidth: 300,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      marginBottom: 24,
    },
    optionsWrapper: {
      gap: 12,
    },
    optionCard: {
      width: '100%',
      minHeight: 96,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 18,
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
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    optionTextWrap: {
      flex: 1,
      paddingRight: 10,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },
    optionTitleSelected: {
      color: '#FFFFFF',
    },
    optionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
    },
    optionSubtitleSelected: {
      color: 'rgba(255,255,255,0.85)',
    },
    radioWrap: {
      width: 24,
      alignItems: 'flex-end',
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
