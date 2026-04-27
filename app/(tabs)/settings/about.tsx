import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Linking,
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

const APP_VERSION = '1.0.0';
const BUILD = '54.0.0';

export default function About() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const Row = ({
    icon,
    label,
    value,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.6 } : null]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="open-outline" size={18} color={COLORS.muted} />
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Fit</Text>
          <Text style={styles.heroSub}>Your AI-powered training companion</Text>
        </View>

        <View style={styles.card}>
          <Row icon="information-circle-outline" label="Version" value={APP_VERSION} />
          <View style={styles.divider} />
          <Row icon="hammer-outline" label="Build" value={BUILD} />
          <View style={styles.divider} />
          <Row icon="phone-portrait-outline" label="Platform" value="iOS · Android" />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>RESOURCES</Text>
        <View style={styles.card}>
          <Row
            icon="globe-outline"
            label="Website"
            onPress={() => Linking.openURL('https://example.com')}
          />
          <View style={styles.divider} />
          <Row
            icon="logo-instagram"
            label="Instagram"
            onPress={() => Linking.openURL('https://instagram.com')}
          />
          <View style={styles.divider} />
          <Row
            icon="mail-outline"
            label="Contact"
            onPress={() => Linking.openURL('mailto:hello@example.com')}
          />
        </View>

        <Text style={styles.footer}>
          © 2026 Fit. Made with care for athletes.
        </Text>
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
    hero: { alignItems: 'center', marginBottom: 22 },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    heroSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
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
    rowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
    rowValue: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginLeft: 60,
    },
    footer: {
      textAlign: 'center',
      marginTop: 22,
      fontSize: 12,
      color: COLORS.muted,
    },
  });
