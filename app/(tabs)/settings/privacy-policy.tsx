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
    title: 'Information We Collect',
    body: 'We collect the details you provide during sign-up and onboarding — name, email, age, gender, height, weight, fitness level, equipment, and goals — along with the activity you create: completed and logged workouts, weigh-ins and measurements, achievements, XP, posts, comments, stories, and the messages you send to support.',
  },
  {
    title: 'How We Use It',
    body: 'Your information is used to generate your personalized plan, track progress, power the in-app AI coach, show your profile and activity in the community, and improve the app. We do not sell your personal data.',
  },
  {
    title: 'Storage & Security',
    body: 'Fit is built on Google Firebase. Your account, profile, and content are stored in Firebase Authentication, Cloud Firestore, and Cloud Storage, protected by access rules and industry-standard encryption in transit and at rest.',
  },
  {
    title: 'What Other Members See',
    body: 'Your display name, photo, bio, posts, comments, stories, achievements, and follower information are visible to other signed-in members. Your private data — email, body measurements, and support messages — is never shown to other members. When you report content, only our moderation team sees your report.',
  },
  {
    title: 'Your Rights & Data Deletion',
    body: 'You can edit your profile at any time, and permanently delete your account and associated data from Settings → Delete Account. For any privacy request, message us from Settings → Contact Support or email ahmed1.balfaqeih55@gmail.com.',
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
