import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

const memberAvatars = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&q=80',
];

export default function WelcomePage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const featureItems = [
    {
      label: 'Workouts',
      icon: <MaterialCommunityIcons name="run" size={22} color={COLORS.primary} />,
    },
    {
      label: 'Progress',
      icon: <Ionicons name="trending-up" size={20} color={COLORS.primary} />,
    },
    {
      label: 'Nutrition',
      icon: (
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={20}
          color={COLORS.primary}
        />
      ),
    },
    {
      label: 'Wellness',
      icon: <MaterialCommunityIcons name="meditation" size={20} color={COLORS.primary} />,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
            }}
            style={styles.heroImage}
          />

          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(25,20,50,0.45)', 'rgba(8,6,25,0.96)']}
            style={styles.heroOverlay}
          />

          <View style={styles.heroContent}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="dumbbell" size={28} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>FitLife</Text>
            <Text style={styles.subtitle}>
              Your personalized fitness journey{'\n'}starts here
            </Text>
          </View>
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.featuresRow}>
            {featureItems.map((item) => (
              <View key={item.label} style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <View style={styles.featureIconTint}>{item.icon}</View>
                </View>
                <Text style={styles.featureLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.membersCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.membersTitle}>Join 2M+ Members</Text>
              <Text style={styles.membersSubtitle}>Achieving their fitness goals daily</Text>
            </View>

            <View style={styles.avatarStack}>
              {memberAvatars.map((uri, idx) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={[styles.memberAvatar, idx > 0 && { marginLeft: -14 }]}
                />
              ))}
            </View>
          </View>

          <Pressable style={styles.signUpButton} onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signUpButtonText}>Get Started — Sign Up</Text>
          </Pressable>

          <Pressable style={styles.loginButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginButtonText}>I already have an account</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{'\n'}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
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
      flexGrow: 1,
      backgroundColor: COLORS.bg,
    },
    heroSection: {
      height: 430,
      overflow: 'hidden',
      backgroundColor: '#161327',
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 52,
      paddingHorizontal: 24,
    },
    iconBox: {
      width: 74,
      height: 74,
      borderRadius: 22,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    title: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
    },
    bottomSheet: {
      backgroundColor: COLORS.bg,
      marginTop: -18,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 26,
      paddingHorizontal: 22,
      paddingBottom: 32,
    },
    featuresRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    featureItem: {
      alignItems: 'center',
      width: '23%',
    },
    featureIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      ...SHADOWS.card,
    },
    featureIconTint: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureLabel: {
      fontSize: 12,
      color: COLORS.muted,
      fontWeight: '600',
      textAlign: 'center',
    },
    membersCard: {
      width: '100%',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      paddingHorizontal: 18,
      paddingVertical: 18,
      marginBottom: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...SHADOWS.card,
    },
    membersTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 4,
    },
    membersSubtitle: {
      fontSize: 13,
      color: COLORS.muted,
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: COLORS.card,
      backgroundColor: COLORS.border,
    },
    signUpButton: {
      width: '100%',
      height: 56,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    signUpButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
    },
    loginButton: {
      width: '100%',
      height: 54,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    loginButtonText: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '700',
    },
    termsText: {
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.muted,
      textAlign: 'center',
    },
    linkText: {
      color: COLORS.primary,
      fontWeight: '700',
    },
  });
