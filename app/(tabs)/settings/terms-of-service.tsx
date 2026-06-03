import React, { useMemo } from 'react';
import {  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

const sections = [
  {
    title: 'User Agreement',
    body: 'By creating an account or using Fit, you agree to these terms. You must be at least 13 years old, you agree to provide accurate information during sign-up, and you are responsible for keeping your login credentials secure. We may update these terms from time to time — continued use after an update constitutes acceptance of the new terms.',
  },
  {
    title: 'Health Disclaimer & Liability',
    body: 'Fit provides fitness and wellness guidance, an AI coach, and calorie/effort estimates for general information only. It is not medical advice — consult a qualified professional before starting any new exercise program, especially if you have a health condition. You exercise at your own risk, and to the fullest extent permitted by law Fit is not liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: 'Community & Content',
    body: 'Be respectful. Do not harass other members or post unlawful, hateful, explicit, or misleading content, and do not scrape or reverse engineer the service. You keep ownership of the posts, stories, and comments you create but grant Fit a license to store and display them so community features work. You can report any post for review, and accounts that violate these rules may be suspended or removed.',
  },
  {
    title: 'Account & Contact',
    body: 'You may delete your account at any time from Settings → Delete Account. Questions about these terms? Message us from Settings → Contact Support or email ahmed1.balfaqeih55@gmail.com.',
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
        <Text style={styles.updated}>Last updated: May 30, 2026</Text>

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
