import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette } from '@/constants/design';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';

const presets = [50, 70, 90, 110];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 4;

export default function WeightPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [weight, setWeight] = useState(
    answers.weightKg ? String(answers.weightKg) : '70'
  );

  const progressItems = useMemo(
    () => new Array(TOTAL_STEPS).fill(null).map((_, i) => i),
    []
  );

  const onChangeWeight = (value: string) => {
    setWeight(value.replace(/[^0-9]/g, ''));
  };

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
          <Text style={styles.title}>What is your{'\n'}current weight?</Text>
          <Text style={styles.subtitle}>
            This helps personalize your workout plan
          </Text>

          <View style={styles.valueCard}>
            <View style={styles.valueRow}>
              <TextInput
                value={weight}
                onChangeText={onChangeWeight}
                keyboardType="number-pad"
                style={styles.valueInput}
                textAlign="center"
                maxLength={3}
              />

              <View style={styles.kgBadge}>
                <Text style={styles.kgText}>kg</Text>
              </View>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {presets.map((item) => (
              <Pressable
                key={item}
                onPress={() => setWeight(String(item))}
                style={styles.presetButton}
              >
                <Text style={styles.presetText}>{item} kg</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.infoRow}>
          </View>
        </View>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('weightKg', Number(weight) || 0);
            router.push('/onboarding/goal' as never);
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
      paddingTop: 18,
    },
    title: {
      fontSize: 28,
      lineHeight: 37,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
    },
    valueCard: {
      marginTop: 56,
      width: '100%',
      height: 120,
      backgroundColor: COLORS.card,
      borderRadius: 20,
      justifyContent: 'center',
      paddingHorizontal: 24,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueInput: {
      flex: 1,
      fontSize: 48,
      fontWeight: '800',
      color: COLORS.primary,
      paddingVertical: 0,
      textAlign: 'center',
    },
    kgBadge: {
      width: 44,
      height: 36,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      marginBottom: 6,
    },
    kgText: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.primary,
    },
    presetsRow: {
      marginTop: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    presetButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetText: {
      fontSize: 14,
      fontWeight: '500',
      color: COLORS.muted,
    },
    infoRow: {
      marginTop: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      marginLeft: 6,
      fontSize: 13,
      color: COLORS.muted,
    },
  });
