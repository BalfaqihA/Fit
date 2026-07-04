import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

type Category =
  | 'Getting Started'
  | 'Workouts'
  | 'Gamification'
  | 'Account'
  | 'Technical';

type FaqItem = { category: Category; q: string; a: string };

const categories: Category[] = [
  'Getting Started',
  'Workouts',
  'Gamification',
  'Account',
  'Technical',
];

const faqs: FaqItem[] = [
  {
    category: 'Getting Started',
    q: 'How do I set up my profile?',
    a: 'Go to Settings → Edit Profile to update your name, handle, bio, and photo. Your name and photo are what other members see in the community.',
  },
  {
    category: 'Getting Started',
    q: 'How does Fit build my plan?',
    a: 'During onboarding you set your goal, fitness level, available equipment, session length, and training days. Fit uses these to generate a personalized weekly plan you can follow on the Home tab.',
  },
  {
    category: 'Getting Started',
    q: 'Can the AI coach help me?',
    a: 'Yes — open the Coach tab to ask the in-app assistant about exercises, form, and your plan. It uses your profile to give tailored answers.',
  },
  {
    category: 'Workouts',
    q: 'How do I complete a planned workout?',
    a: "On the Home tab, open today's session and follow the guided flow. When you finish, it's saved to your history and counts toward your workout total, streak, and XP.",
  },
  {
    category: 'Workouts',
    q: 'What is "Log Workout" and how is it different?',
    a: 'Log Workout lets you quickly record a session you did on your own. It adds to your history and counts toward minutes, calories, and XP — but it does not increase your completed-workout count, which is reserved for guided sessions.',
  },
  {
    category: 'Workouts',
    q: 'How do I track my weight and measurements?',
    a: 'Use the weigh-in option on the Dashboard to log your weight over time. Your progress is charted so you can see trends.',
  },
  {
    category: 'Gamification',
    q: 'How do streaks work?',
    a: "Train on consecutive days and your streak grows. Your longest streak is saved and unlocks streak achievements like Week Warrior and Fortnight Fury.",
  },
  {
    category: 'Gamification',
    q: 'How are XP and achievements earned?',
    a: 'You earn XP for every workout and logged session, with bonus XP when you unlock an achievement. Achievements unlock automatically at milestones — workouts completed, total minutes, streaks, XP, and weigh-ins. View them on your profile.',
  },
  {
    category: 'Account',
    q: 'How do I report a post or user?',
    a: "Tap the menu (•••) on any post and choose Report, then tell us what's wrong. The post stays on your feed; our team reviews every report privately.",
  },
  {
    category: 'Account',
    q: 'How do stories work?',
    a: 'Stories are photos or short videos that disappear after 24 hours. Tap your story ring in the Community tab to add one, and tap a friend’s ring to watch theirs.',
  },
  {
    category: 'Account',
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete Account. This permanently removes your profile, workouts, and content. You can also message us from Contact Support if you need help.',
  },
  {
    category: 'Technical',
    q: "My notifications aren't arriving — what should I check?",
    a: 'First, confirm notifications are enabled in Settings → Notifications. Then check your device settings to make sure Fit is allowed to send alerts.',
  },
  {
    category: 'Technical',
    q: 'Is my data private?',
    a: 'Yes. Your profile and workout history stay tied to your account and are never sold to third parties. See the Privacy Policy for full details.',
  },
];

export default function HelpFaq() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState<string | null>(faqs[0]?.q ?? null);

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      items: faqs.filter((f) => f.category === cat),
    }));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {grouped.map((group) => (
          <View key={group.category} style={{ marginBottom: 18 }}>
            <Text style={styles.sectionLabel}>{group.category.toUpperCase()}</Text>
            <View style={styles.card}>
              {group.items.map((item, idx) => {
                const isOpen = open === item.q;
                return (
                  <View key={item.q}>
                    <Pressable
                      style={styles.qRow}
                      onPress={() => setOpen(isOpen ? null : item.q)}
                    >
                      <Text style={styles.qText}>{item.q}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={COLORS.muted}
                      />
                    </Pressable>
                    {isOpen && <Text style={styles.aText}>{item.a}</Text>}
                    {idx < group.items.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactDesc}>
              Reach our support team — we usually reply within 24 hours.
            </Text>
          </View>
          <Pressable
            style={styles.contactBtn}
            onPress={() => router.push('/settings/contact' as never)}
          >
            <Text style={styles.contactBtnText}>Contact</Text>
          </Pressable>
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
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    qRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    qText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
    aText: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      fontSize: 13,
      color: COLORS.muted,
      lineHeight: 20,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginHorizontal: 16,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginTop: 4,
      gap: 14,
      ...SHADOWS.card,
    },
    contactIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    contactDesc: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 2,
      lineHeight: 16,
    },
    contactBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.sm,
    },
    contactBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  });
