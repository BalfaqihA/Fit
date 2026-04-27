import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { GOAL_LIST } from '@/constants/goals';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { GoalKey } from '@/types/community';

export default function FitnessGoals() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile, setGoals } = useUserProfile();
  const [selectedGoal, setSelectedGoal] = useState<GoalKey>(
    profile.goals[0] ?? 'build_muscle'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Fitness Goals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Choose the goal that best describes what you want from your training.
        </Text>

        <View style={styles.optionsWrapper}>
          {GOAL_LIST.map((goal) => {
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
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : goal.iconBg },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={goal.iconName as never}
                    size={24}
                    color={goal.iconColor}
                  />
                </View>

                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{goal.title}</Text>
                  <Text style={styles.optionSubtitle}>{goal.subtitle}</Text>
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

        <View style={{ height: 20 }} />
        <PrimaryButton
          label="Save"
          onPress={() => {
            setGoals([selectedGoal]);
            Alert.alert('Saved', 'Your goal has been updated.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          }}
        />
      </ScrollView>
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
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    scroll: { padding: 20, paddingBottom: 40 },
    intro: {
      fontSize: 14,
      color: COLORS.muted,
      marginBottom: 18,
      lineHeight: 20,
    },
    optionsWrapper: { gap: 12 },
    optionCard: {
      width: '100%',
      minHeight: 96,
      borderRadius: RADIUS.lg,
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
    optionTextWrap: { flex: 1, paddingRight: 10 },
    optionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },
    optionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
    },
    radioWrap: { width: 24, alignItems: 'flex-end' },
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
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
  });
