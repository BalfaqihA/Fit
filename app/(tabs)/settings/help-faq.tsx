import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    a: "Go to Settings → Edit Profile to update your name, email, and bio. You can also add a photo by tapping the camera icon on your avatar.",
  },
  {
    category: 'Getting Started',
    q: 'How do I pick my first workout?',
    a: "Open the Home tab — we'll recommend a session based on your fitness goal and training days. Tap the play button to start.",
  },
  {
    category: 'Workouts',
    q: 'How do I log a workout?',
    a: "Open the Home tab, tap the play button on today's session, and follow the guided flow. Your session is saved automatically when you finish.",
  },
  {
    category: 'Workouts',
    q: 'Can I sync with Apple Health or Google Fit?',
    a: 'Integrations are coming soon. For now, your workout history is stored inside FitLife.',
  },
  {
    category: 'Gamification',
    q: 'How do streaks work?',
    a: "Complete at least one workout on a training day and your streak grows by one. Miss a scheduled day and it resets — but rest days don't count against you.",
  },
  {
    category: 'Gamification',
    q: 'How are badges and achievements earned?',
    a: 'Achievements unlock when you hit milestones — first workout, weekly streaks, personal records, and more. Check your Profile to see what you\'ve earned.',
  },
  {
    category: 'Account',
    q: 'How do I change my training days?',
    a: 'Go to Settings → Fitness Goals, adjust your selection, and tap Save.',
  },
  {
    category: 'Account',
    q: 'How do I delete my account?',
    a: "Contact support from this screen and we'll guide you through deletion and data removal.",
  },
  {
    category: 'Technical',
    q: "My notifications aren't arriving — what should I check?",
    a: 'First, confirm notifications are enabled in Settings → Notifications. Then check your device settings to make sure FitLife is allowed to send alerts.',
  },
  {
    category: 'Technical',
    q: 'Is my data private?',
    a: 'Yes. Your profile and workout history stay associated with your account and are never sold to third parties. See the Privacy Policy for details.',
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
          <Pressable style={styles.contactBtn}>
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
