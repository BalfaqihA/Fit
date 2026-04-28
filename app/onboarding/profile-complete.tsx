import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette } from '@/constants/design';
import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { auth, db, functions } from '@/lib/firebase';
import type {
  EquipmentKey,
  FitnessLevel,
  GoalKey,
} from '@/types/community';

const GOAL_LABEL: Record<GoalKey, string> = {
  lose_weight: 'Lose Weight',
  build_muscle: 'Build Muscle',
  stay_fit: 'Stay Fit',
  increase_endurance: 'Increase Endurance',
  improve_flexibility: 'Improve Flexibility',
};

const LEVEL_LABEL: Record<FitnessLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const EQUIPMENT_LABEL: Record<EquipmentKey, string> = {
  body: 'Bodyweight',
  dumbbells: 'Dumbbells',
  barbell: 'Barbell',
  bands: 'Resistance Bands',
  kettlebell: 'Kettlebell',
  'full-gym': 'Full Gym',
};

type GeneratePlanResult = { planId: string };

export default function ProfileCompletePage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { answers, mode, setMode } = useOnboarding();
  const { updateProfile } = useUserProfile();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isChangeMode = mode === 'change';

  const summaryItems = useMemo(() => {
    const planItems = [
      {
        label: 'Goal',
        value: answers.goal ? GOAL_LABEL[answers.goal] : '—',
        icon: 'flag',
      },
      {
        label: 'Fitness Level',
        value: answers.level ? LEVEL_LABEL[answers.level] : '—',
        icon: 'dumbbell',
      },
      {
        label: 'Equipment',
        value: answers.equipment ? EQUIPMENT_LABEL[answers.equipment] : '—',
        icon: 'tools',
      },
      {
        label: 'Days Per Week',
        value: answers.daysPerWeek ? `${answers.daysPerWeek} days` : '—',
        icon: 'calendar-month',
      },
      {
        label: 'Workout Duration',
        value: answers.sessionMinutes ? `${answers.sessionMinutes} min` : '—',
        icon: 'timer-outline',
      },
    ];

    if (isChangeMode) return planItems;

    const profileItems = [
      {
        label: 'Age',
        value: answers.age ? `${answers.age} years` : '—',
        icon: 'cake-variant',
      },
      {
        label: 'Gender',
        value: answers.gender
          ? answers.gender[0].toUpperCase() + answers.gender.slice(1)
          : '—',
        icon: 'account',
      },
      {
        label: 'Weight',
        value: answers.weightKg ? `${answers.weightKg} kg` : '—',
        icon: 'scale-bathroom',
      },
      {
        label: 'Height',
        value: answers.heightCm ? `${answers.heightCm} cm` : '—',
        icon: 'human-male-height',
      },
    ];
    return [...profileItems, ...planItems];
  }, [answers, isChangeMode]);

  const ready =
    !!answers.goal &&
    !!answers.level &&
    !!answers.equipment &&
    !!answers.daysPerWeek &&
    !!answers.sessionMinutes;

  const headerTitle = isChangeMode ? 'Review New Plan' : 'Setup Complete';
  const headerSubtitle = isChangeMode
    ? 'Confirm your new plan settings and we will rebuild your workouts.'
    : "We've completed your setup and prepared your personalized experience";
  const ctaLabel = isChangeMode ? 'Update My Plan' : 'Generate My Plan';
  const cardTitle = isChangeMode ? 'Plan Settings' : 'Profile Summary';

  const onGenerate = async () => {
    if (!ready) {
      Alert.alert(
        'Missing info',
        'Please go back and complete every onboarding step first.'
      );
      return;
    }

    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in again to generate your workout plan.'
      );
      router.replace('/auth/login' as never);
      return;
    }

    setLoading(true);
    try {
      // 1) persist the onboarding answers on the user profile.
      // In change mode, only update plan-relevant fields so we don't wipe
      // out age/gender/height/weight that the user already set during full onboarding.
      const profilePatch = isChangeMode
        ? {
            fitnessLevel: answers.level ?? undefined,
            equipment: answers.equipment ?? undefined,
            sessionMinutes: answers.sessionMinutes ?? undefined,
            daysPerWeek: answers.daysPerWeek ?? undefined,
            primaryGoal: answers.goal ?? undefined,
            goals: answers.goal ? [answers.goal] : [],
          }
        : {
            age: answers.age ?? undefined,
            gender: answers.gender ?? undefined,
            heightCm: answers.heightCm ?? undefined,
            weightKg: answers.weightKg ?? undefined,
            fitnessLevel: answers.level ?? undefined,
            equipment: answers.equipment ?? undefined,
            sessionMinutes: answers.sessionMinutes ?? undefined,
            daysPerWeek: answers.daysPerWeek ?? undefined,
            primaryGoal: answers.goal ?? undefined,
            goals: answers.goal ? [answers.goal] : [],
          };
      await updateProfile(profilePatch);

      // 2) make sure we send a fresh ID token with the callable request
      const current = auth.currentUser;
      if (!current) {
        Alert.alert(
          'Sign in required',
          'Please sign in again to generate your workout plan.'
        );
        router.replace('/auth/login' as never);
        return;
      }
      await current.getIdToken(true);

      // 3) ask the Cloud Function to build a plan
      const fn = httpsCallable<
        {
          goal: GoalKey;
          level: FitnessLevel;
          equipment: EquipmentKey;
          daysPerWeek: number;
          sessionMinutes: number;
        },
        GeneratePlanResult
      >(functions, 'generate_plan');

      const result = await fn({
        goal: answers.goal!,
        level: answers.level!,
        equipment: answers.equipment!,
        daysPerWeek: answers.daysPerWeek!,
        sessionMinutes: answers.sessionMinutes!,
      });

      const planId = result.data?.planId;
      if (!planId) {
        throw new Error('Plan generation returned no planId.');
      }

      // 4) verify the plan document was actually written by the function
      const planSnap = await getDoc(
        doc(db, 'users', user.uid, 'plans', planId)
      );
      if (!planSnap.exists()) {
        throw new Error('Plan was not created. Please try again.');
      }

      // 5) verify currentPlanId is now linked on the user profile
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const linkedPlanId = userSnap.exists()
        ? (userSnap.data() as { currentPlanId?: string }).currentPlanId
        : undefined;
      if (linkedPlanId !== planId) {
        throw new Error(
          'Plan was created but not linked to your profile. Please try again.'
        );
      }

      // Reset onboarding mode so the next entry to onboarding starts fresh.
      setMode('full');
      router.replace('/(tabs)' as never);
    } catch (e) {
      console.error('[generate_plan] failed:', e);
      const err = e as
        | { code?: string; message?: string; details?: unknown }
        | null;
      const code = err?.code;
      const message = err?.message ?? 'Could not generate your plan.';
      Alert.alert('Error', code ? `${code}: ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{cardTitle}</Text>

          {summaryItems.map((item, index) => (
            <View key={item.label}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name={item.icon as never}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>

                  <Text style={styles.label}>{item.label}</Text>
                </View>

                <Text style={styles.value}>{item.value}</Text>
              </View>

              {index !== summaryItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}

          <View style={styles.ctaWrap}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Generating your plan…</Text>
              </View>
            ) : (
              <PrimaryButton label={ctaLabel} onPress={onGenerate} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 36,
    },
    header: {
      alignItems: 'center',
      marginBottom: 22,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: COLORS.muted,
      textAlign: 'center',
      maxWidth: 320,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 18,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    cardTitle: {
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 14,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 46,
      paddingVertical: 8,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    label: {
      fontSize: 16,
      color: COLORS.muted,
      flexShrink: 1,
    },
    value: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
      textAlign: 'right',
      flexShrink: 0,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.divider,
    },
    ctaWrap: {
      marginTop: 18,
    },
    loadingBox: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    loadingText: {
      fontSize: 13,
      color: COLORS.muted,
      fontWeight: '600',
    },
  });
