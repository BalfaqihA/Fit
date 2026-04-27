import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

const sections = [
  {
    title: 'Data Collection',
    body: 'We collect the information you provide during signup and onboarding (name, email, age, height, weight, goals), along with the workout and activity data you log while using the app. We also collect basic device and usage analytics to improve reliability.',
  },
  {
    title: 'Usage',
    body: 'Your data is used to personalize your training plan, calculate progress, deliver notifications you opt into, and improve the product. We do not sell your personal data.',
  },
  {
    title: 'Third Parties',
    body: 'We share limited, de-identified data with trusted service providers who help us run FitLife — for example, analytics and crash reporting tools that help us improve reliability. These providers are bound by contracts that restrict how they can use your data, and we never share your information for advertising outside the app.',
  },
  {
    title: 'Your Rights',
    body: 'You can request access to, correction of, or deletion of your personal data at any time. You may also export your workout history. These controls are available from the Settings screen, or by contacting privacy@fitlife.app — we aim to respond within 7 business days.',
  },
];

export default function PrivacyPolicy() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Last updated: April 22, 2026</Text>

        <View style={styles.card}>
          {sections.map((s, idx) => (
            <View key={s.title} style={idx > 0 && { marginTop: 18 }}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}
        </View>
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
    updated: { fontSize: 12, color: COLORS.muted, marginBottom: 14 },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 18,
      ...SHADOWS.card,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 6,
    },
    sectionBody: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  });
