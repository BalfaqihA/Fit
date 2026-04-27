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

const FEMALE_ICON_BG = '#8C8086';

type Gender = 'male' | 'female';

const TOTAL_STEPS = 9;
const CURRENT_STEP = 2;

export default function GenderPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState<Gender>(
    answers.gender ?? 'male'
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

        <View style={styles.content}>
          <Text style={styles.title}>What is your gender?</Text>
          <Text style={styles.subtitle}>
            This helps personalize your fitness plan
          </Text>

          <View style={styles.optionsWrapper}>
            <Pressable
              onPress={() => setSelectedGender('male')}
              style={[
                styles.optionCard,
                selectedGender === 'male'
                  ? styles.optionCardSelected
                  : styles.optionCardUnselected,
              ]}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconCircle, styles.maleCircle]}>
                  <MaterialCommunityIcons name="human-male" size={28} color="#FFFFFF" />
                </View>

                <Text
                  style={[
                    styles.optionText,
                    selectedGender === 'male' && styles.optionTextSelected,
                  ]}
                >
                  Male
                </Text>
              </View>

              {selectedGender === 'male' ? (
                <View style={styles.checkedCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                </View>
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedGender('female')}
              style={[
                styles.optionCard,
                selectedGender === 'female'
                  ? styles.optionCardSelected
                  : styles.optionCardUnselected,
              ]}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconCircle, styles.femaleCircle]}>
                  <MaterialCommunityIcons name="human-female" size={28} color="#FFFFFF" />
                </View>

                <Text
                  style={[
                    styles.optionText,
                    selectedGender === 'female' && styles.optionTextSelected,
                  ]}
                >
                  Female
                </Text>
              </View>

              {selectedGender === 'female' ? (
                <View style={styles.checkedCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                </View>
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </Pressable>
          </View>
        </View>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('gender', selectedGender);
            router.push('/onboarding/height' as never);
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
      paddingTop: 34,
    },
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      marginBottom: 34,
    },
    optionsWrapper: {
      gap: 16,
    },
    optionCard: {
      width: '100%',
      height: 100,
      borderRadius: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    maleCircle: {
      backgroundColor: COLORS.primary,
    },
    femaleCircle: {
      backgroundColor: FEMALE_ICON_BG,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
    },
    optionTextSelected: {
      color: '#FFFFFF',
    },
    checkedCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.card,
      borderWidth: 2,
      borderColor: COLORS.divider,
    },
  });
