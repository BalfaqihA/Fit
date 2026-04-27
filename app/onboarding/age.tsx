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

const TOTAL_STEPS = 9;
const CURRENT_STEP = 1;

export default function AgePage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [age, setAge] = useState(answers.age ?? 25);

  const progressItems = useMemo(
    () => new Array(TOTAL_STEPS).fill(null).map((_, i) => i),
    []
  );

  const decreaseAge = () => {
    setAge((prev) => Math.max(1, prev - 1));
  };

  const increaseAge = () => {
    setAge((prev) => prev + 1);
  };

  const onChangeAge = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setAge(0);
      return;
    }
    setAge(Number(cleaned));
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
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.subtitle}>
            We&apos;ll use this to personalize your fitness plan
          </Text>

          <View style={styles.previewCard}>
            <Text style={styles.agePreview}>{age || 0}</Text>
            <Text style={styles.ageLabel}>years old</Text>
          </View>

          <View style={styles.controlsRow}>
            <Pressable onPress={decreaseAge} style={styles.minusButton}>
              <Ionicons name="remove" size={24} color={COLORS.text} />
            </Pressable>

            <View style={styles.inputWrapper}>
              <TextInput
                value={String(age || '')}
                onChangeText={onChangeAge}
                keyboardType="number-pad"
                style={styles.input}
                textAlign="center"
                maxLength={3}
              />
            </View>

            <Pressable onPress={increaseAge} style={styles.plusButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <PrimaryButton
          label="Next"
          onPress={() => {
            setAnswer('age', age);
            router.push('/onboarding/gender' as never);
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
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 32,
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
      fontSize: 31,
      lineHeight: 40,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 28,
      color: COLORS.muted,
      maxWidth: 250,
    },
    previewCard: {
      marginTop: 54,
      marginHorizontal: 20,
      backgroundColor: COLORS.card,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 26,
    },
    agePreview: {
      fontSize: 33,
      fontWeight: '800',
      color: COLORS.primary,
      marginBottom: 8,
    },
    ageLabel: {
      fontSize: 15,
      color: COLORS.muted,
    },
    controlsRow: {
      marginTop: 52,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
    },
    minusButton: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWrapper: {
      width: 110,
      height: 52,
      borderRadius: 16,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    input: {
      width: '100%',
      fontSize: 22,
      fontWeight: '500',
      color: COLORS.text,
      paddingVertical: 0,
    },
    plusButton: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
