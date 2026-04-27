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
    title: 'User Agreement',
    body: 'By creating an account or using FitLife, you agree to these terms. You must be at least 13 years old to use the app, you agree to provide accurate information during signup, and you are responsible for keeping your login credentials secure. We may update these terms from time to time — material changes will be communicated in-app, and continued use after an update constitutes acceptance of the new terms.',
  },
  {
    title: 'Liability',
    body: 'FitLife provides fitness and wellness information for general guidance. It is not medical advice — consult a qualified professional before starting any new exercise program, especially if you have a health condition. To the fullest extent permitted by law, FitLife is not liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: 'Code of Conduct',
    body: 'Use FitLife respectfully. Do not scrape or reverse engineer the service, attempt to gain unauthorized access, harass other members, or post unlawful, hateful, or misleading content in Community spaces. Accounts that violate these rules may be suspended or removed.',
  },
];

export default function TermsOfService() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
