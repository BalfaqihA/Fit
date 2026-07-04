import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette } from '@/constants/design';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';
import { parseIntInRange } from '@/lib/validation';

type Unit = 'cm' | 'ft';

const TOTAL_STEPS = 9;
const CURRENT_STEP = 3;

const HEIGHT_CM_MIN = 90;
const HEIGHT_CM_MAX = 250;

function toCm(num: number, unit: Unit): number {
  return unit === 'ft' ? Math.round(num * 30.48) : num;
}

export default function HeightPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, setAnswer } = useOnboarding();
  const [height, setHeight] = useState(
    answers.heightCm ? String(answers.heightCm) : '170'
  );
  const [unit, setUnit] = useState<Unit>('cm');
  const [error, setError] = useState<string | null>(null);

  const progressItems = useMemo(
    () => new Array(TOTAL_STEPS).fill(null).map((_, i) => i),
    []
  );

  // Persist valid intermediate values so navigating back/forward keeps them.
  useEffect(() => {
    const num = Number(height);
    if (!Number.isFinite(num)) return;
    const cm = toCm(num, unit);
    if (cm >= HEIGHT_CM_MIN && cm <= HEIGHT_CM_MAX) {
      setAnswer('heightCm', cm);
    }
  }, [height, unit, setAnswer]);

  const onChangeHeight = (value: string) => {
    setHeight(value.replace(/[^0-9]/g, ''));
    if (error) setError(null);
  };

  const onNext = () => {
    if (!height) {
      setError('Enter your height.');
      return;
    }
    const cm = toCm(Number(height), unit);
    const parsed = parseIntInRange(String(cm), HEIGHT_CM_MIN, HEIGHT_CM_MAX);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setAnswer('heightCm', parsed.value);
    router.push('/onboarding/weight' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          <Text style={styles.title}>What is your height?</Text>
          <Text style={styles.subtitle}>
            This helps personalize your workout plan
          </Text>

          <View style={styles.card}>
            <View style={styles.valueRow}>
              <View style={styles.inputBox}>
                <TextInput
                  value={height}
                  onChangeText={onChangeHeight}
                  keyboardType="number-pad"
                  style={styles.valueInput}
                  textAlign="center"
                  maxLength={3}
                />
              </View>

              <Text style={styles.unitText}>{unit}</Text>
            </View>

            <View style={styles.unitButtonsRow}>
              <Pressable
                onPress={() => setUnit('cm')}
                style={[
                  styles.unitButton,
                  unit === 'cm' ? styles.unitButtonActive : styles.unitButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    unit === 'cm' ? styles.unitButtonTextActive : styles.unitButtonTextInactive,
                  ]}
                >
                  cm
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setUnit('ft')}
                style={[
                  styles.unitButton,
                  unit === 'ft' ? styles.unitButtonActive : styles.unitButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    unit === 'ft' ? styles.unitButtonTextActive : styles.unitButtonTextInactive,
                  ]}
                >
                  ft
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>

        <PrimaryButton label="Next" onPress={onNext} />
      </View>
      </KeyboardAvoidingView>
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
      paddingTop: 38,
    },
    title: {
      fontSize: 26,
      lineHeight: 34,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.muted,
      textAlign: 'center',
    },
    card: {
      marginTop: 40,
      width: '100%',
      backgroundColor: COLORS.card,
      borderRadius: 20,
      paddingHorizontal: 28,
      paddingVertical: 28,
    },
    valueRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    inputBox: {
      width: 128,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    valueInput: {
      width: '100%',
      fontSize: 46,
      fontWeight: '800',
      color: COLORS.primary,
      paddingVertical: 0,
      textAlign: 'center',
    },
    unitText: {
      marginLeft: 8,
      marginBottom: 14,
      fontSize: 22,
      fontWeight: '600',
      color: COLORS.muted,
    },
    unitButtonsRow: {
      marginTop: 28,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    unitButton: {
      width: 72,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    unitButtonActive: {
      backgroundColor: COLORS.bg,
      borderColor: COLORS.primary,
    },
    unitButtonInactive: {
      backgroundColor: COLORS.card,
      borderColor: COLORS.border,
    },
    unitButtonText: {
      fontSize: 15,
      fontWeight: '700',
    },
    unitButtonTextActive: {
      color: COLORS.primary,
    },
    unitButtonTextInactive: {
      color: COLORS.text,
    },
    errorText: {
      marginTop: 14,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.accent,
    },
  });
