import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { HoldTracker } from '@/components/hold-tracker';
import { RepTracker } from '@/components/rep-tracker';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  getExerciseById as getLegacyExerciseById,
  muscleColor,
} from '@/constants/workout-data';
import { useTheme } from '@/hooks/use-theme';
import {
  exerciseImageUrls,
  getExerciseById as getDatasetExerciseById,
} from '@/lib/exercises';

const MUSCLE_ICON: Record<string, string> = {
  Chest: 'human-handsup',
  Back: 'human-handsdown',
  Legs: 'run-fast',
  Shoulders: 'weight-lifter',
  Arms: 'arm-flex',
  Core: 'meditation',
  'Full Body': 'dumbbell',
};

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function ExerciseDetail() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const datasetExercise = getDatasetExerciseById(id);
  const legacyExercise = getLegacyExerciseById(id);

  if (!datasetExercise && !legacyExercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyText}>That exercise could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const screenW = Dimensions.get('window').width;
  const imageW = screenW - 40;

  // Prefer the dataset record (driven by the personalized plan).
  if (datasetExercise) {
    const imageUrls = exerciseImageUrls(datasetExercise);
    const muscleColorValue = COLORS.primary;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {datasetExercise.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 6 }}
          >
            {imageUrls.length > 0 ? (
              imageUrls.map((url, idx) => (
                <View
                  key={url}
                  style={[styles.imageBox, { width: imageW, backgroundColor: COLORS.card }]}
                >
                  <Image
                    source={{ uri: url }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    transition={150}
                  />
                  <Text style={styles.imageLabel}>
                    {idx === 0 ? 'Start position' : 'End position'}
                  </Text>
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.imageBox,
                  { width: imageW, backgroundColor: muscleColorValue + '22' },
                ]}
              >
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={84}
                  color={muscleColorValue}
                />
              </View>
            )}
          </ScrollView>
          {imageUrls.length > 1 && (
            <Text style={styles.swipeHint}>Swipe for end position →</Text>
          )}

          <Text style={styles.title}>{datasetExercise.name}</Text>
          <View style={styles.badgeRow}>
            {datasetExercise.primaryMuscles.slice(0, 1).map((m) => (
              <View key={m} style={[styles.badge, { backgroundColor: muscleColorValue + '22' }]}>
                <Text style={[styles.badgeText, { color: muscleColorValue }]}>
                  {titleCase(m)}
                </Text>
              </View>
            ))}
            {datasetExercise.level !== 'unknown' && (
              <View style={styles.badgeOutline}>
                <Text style={styles.badgeOutlineText}>
                  {titleCase(datasetExercise.level)}
                </Text>
              </View>
            )}
            {datasetExercise.equipment ? (
              <View style={styles.badgeOutline}>
                <Text style={styles.badgeOutlineText}>
                  {titleCase(datasetExercise.equipment)}
                </Text>
              </View>
            ) : null}
          </View>

          {datasetExercise.category ? (
            <Text style={styles.subline}>{titleCase(datasetExercise.category)}</Text>
          ) : null}

          {(datasetExercise.primaryMuscles.length > 0 ||
            datasetExercise.secondaryMuscles.length > 0) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Muscles Targeted</Text>
              {datasetExercise.primaryMuscles.length > 0 && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                >
                  <Text style={styles.musclesLabel}>Primary</Text>
                  <Text style={styles.musclesValue}>
                    {datasetExercise.primaryMuscles.map(titleCase).join(', ')}
                  </Text>
                </View>
              )}
              {datasetExercise.secondaryMuscles.length > 0 && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                >
                  <Text style={styles.musclesLabel}>Secondary</Text>
                  <Text style={styles.musclesValue}>
                    {datasetExercise.secondaryMuscles.map(titleCase).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {datasetExercise.instructions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Instructions</Text>
              {datasetExercise.instructions.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Legacy fallback for exercises that exist only in the static EXERCISES array.
  const exercise = legacyExercise!;
  const color = muscleColor(exercise.muscle, COLORS);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
        >
          {[0, 1].map((idx) => (
            <View
              key={idx}
              style={[styles.imageBox, { width: imageW, backgroundColor: color + '22' }]}
            >
              <MaterialCommunityIcons
                name={(MUSCLE_ICON[exercise.muscle] ?? 'dumbbell') as never}
                size={84}
                color={color}
              />
              <Text style={styles.imageLabel}>
                {idx === 0 ? 'Start position' : 'End position'}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.swipeHint}>Swipe for end position →</Text>

        <Text style={styles.title}>{exercise.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{exercise.muscle}</Text>
          </View>
          <View style={styles.badgeOutline}>
            <Text style={styles.badgeOutlineText}>{exercise.level}</Text>
          </View>
          <View style={styles.badgeOutline}>
            <Text style={styles.badgeOutlineText}>{exercise.equipment}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="flash" size={11} color={COLORS.primary} />
            <Text style={styles.xpBadgeText}>+{exercise.xp} XP</Text>
          </View>
        </View>

        {(exercise.category || exercise.mechanic) && (
          <Text style={styles.subline}>
            {exercise.category}
            {exercise.mechanic ? `  ·  ${exercise.mechanic}` : ''}
          </Text>
        )}

        {(exercise.secondaryMuscles?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Muscles Targeted</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={styles.musclesLabel}>Primary</Text>
              <Text style={styles.musclesValue}>{exercise.muscle}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={styles.musclesLabel}>Secondary</Text>
              <Text style={styles.musclesValue}>
                {exercise.secondaryMuscles.join(', ')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Track Your Sets</Text>
          {exercise.holdSec ? (
            <HoldTracker exercise={exercise} COLORS={COLORS} />
          ) : (
            <RepTracker exercise={exercise} COLORS={COLORS} />
          )}
        </View>

        {exercise.instructions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Instructions</Text>
            {exercise.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
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
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
      paddingHorizontal: 8,
    },
    scroll: { padding: 20, paddingBottom: 40 },
    imageBox: {
      height: 220,
      borderRadius: RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    imageLabel: {
      position: 'absolute',
      bottom: 12,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: COLORS.text,
      backgroundColor: COLORS.card,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    swipeHint: {
      textAlign: 'right',
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: '700',
      marginBottom: 14,
    },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeOutline: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    badgeOutlineText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    xpBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
    subline: {
      fontSize: 12,
      color: COLORS.muted,
      fontWeight: '700',
      marginTop: 4,
      marginBottom: 14,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 14,
      ...SHADOWS.card,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    musclesLabel: {
      width: 90,
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
    },
    musclesValue: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
    stepBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
    stepText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600', lineHeight: 19 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: COLORS.muted, fontWeight: '600', marginTop: 8 },
  });
