import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { mapAuthError, signOut } from '@/lib/auth';

type SettingsRow = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const accountRows: SettingsRow[] = [
  { label: 'Edit Profile', icon: 'person-outline', route: '/settings/edit-profile' },
  { label: 'Community Profile', icon: 'people-circle-outline', route: '/community/profile-edit' },
  { label: 'Change Password', icon: 'lock-closed-outline', route: '/settings/change-password' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/settings/notifications' },
  { label: 'Fitness Goals', icon: 'trophy-outline', route: '/settings/fitness-goals' },
];

const preferenceRows: SettingsRow[] = [
  { label: 'Units', icon: 'speedometer-outline', route: '/settings/units' },
  { label: 'Language', icon: 'language-outline', route: '/settings/language' },
  { label: 'Dark Mode', icon: 'moon-outline', route: '/settings/dark-mode' },
];

const supportRows: SettingsRow[] = [
  { label: 'Help & FAQ', icon: 'help-circle-outline', route: '/settings/help-faq' },
  { label: 'About', icon: 'information-circle-outline', route: '/settings/about' },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline', route: '/settings/privacy-policy' },
  { label: 'Terms of Service', icon: 'document-text-outline', route: '/settings/terms-of-service' },
];

function Row({
  row,
  styles,
  COLORS,
}: {
  row: SettingsRow;
  styles: ReturnType<typeof makeStyles>;
  COLORS: Palette;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      onPress={() => router.push(row.route as never)}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={row.icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.rowLabel}>{row.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function Section({
  title,
  rows,
  styles,
  COLORS,
}: {
  title: string;
  rows: SettingsRow[];
  styles: ReturnType<typeof makeStyles>;
  COLORS: Palette;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, idx) => (
          <View key={row.label}>
            <Row row={row} styles={styles} COLORS={COLORS} />
            {idx < rows.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SettingsHub() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <Pressable
          style={styles.profileCard}
          onPress={() => router.push('/settings/edit-profile')}
        >
          <View style={styles.avatar}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={26} color={COLORS.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.displayName}</Text>
            <Text style={styles.profileMeta}>View profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </Pressable>

        <Section title="ACCOUNT" rows={accountRows} styles={styles} COLORS={COLORS} />
        <Section title="PREFERENCES" rows={preferenceRows} styles={styles} COLORS={COLORS} />
        <Section title="SUPPORT" rows={supportRows} styles={styles} COLORS={COLORS} />

        <Pressable
          style={styles.logout}
          onPress={() => {
            Alert.alert('Log out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log out',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await signOut();
                    // AuthGate redirects to /auth/login.
                  } catch (e) {
                    Alert.alert('Error', mapAuthError(e));
                  }
                },
              },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.accent} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 22,
      gap: 14,
      ...SHADOWS.card,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    profileName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    profileMeta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginLeft: 60,
    },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.card,
      marginTop: 6,
      ...SHADOWS.card,
    },
    logoutText: { fontSize: 15, fontWeight: '800', color: COLORS.accent },
    version: {
      textAlign: 'center',
      marginTop: 18,
      fontSize: 12,
      color: COLORS.muted,
    },
  });
