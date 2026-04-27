import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

const highlights = [
  {
    icon: 'clipboard-check-outline',
    title: 'Personalized plan',
    text: 'Workouts shaped around your level and goal.',
  },
  {
    icon: 'chart-line',
    title: 'Progress tracking',
    text: 'Every session, every PR, always visible.',
  },
  {
    icon: 'heart-pulse',
    title: 'Smart adjustments',
    text: 'Your plan evolves as you get stronger.',
  },
];

export default function WelcomeReadyPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#8E54E9', '#6C56D9', '#4C3AB8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.badge}>
          <MaterialCommunityIcons name="dumbbell" size={36} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>Let&apos;s build your plan</Text>
        <Text style={styles.subtitle}>
          A few quick questions so we can tailor{'\n'}every workout to you.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        {highlights.map((item, idx) => (
          <View key={item.title}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons
                  name={item.icon as never}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowText}>{item.text}</Text>
              </View>
            </View>
            {idx !== highlights.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={styles.ctaWrap}>
          <PrimaryButton
            label="Get Started"
            onPress={() => router.push('/onboarding/age' as never)}
            icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
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
    hero: {
      paddingTop: 64,
      paddingBottom: 56,
      paddingHorizontal: 28,
      alignItems: 'center',
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    badge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 22,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
    },
    card: {
      marginTop: -28,
      marginHorizontal: 22,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 20,
      ...SHADOWS.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    rowIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },
    rowText: {
      fontSize: 13,
      lineHeight: 18,
      color: COLORS.muted,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.divider,
    },
    ctaWrap: {
      marginTop: 20,
    },
  });
