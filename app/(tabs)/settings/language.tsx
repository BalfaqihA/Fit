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

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
];

export default function Language() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [selected, setSelected] = useState('en');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>Select your preferred language</Text>

        <View style={styles.card}>
          {languages.map((lang, idx) => {
            const active = selected === lang.code;
            return (
              <View key={lang.code}>
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => setSelected(lang.code)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{lang.label}</Text>
                    <Text style={styles.rowNative}>{lang.native}</Text>
                  </View>
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={COLORS.primary}
                    />
                  ) : (
                    <View style={styles.radio} />
                  )}
                </Pressable>
                {idx < languages.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={styles.footerNote}>
          Changes apply immediately across the app.
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
    intro: { fontSize: 14, color: COLORS.muted, marginBottom: 16 },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    rowNative: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.border,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.divider,
      marginHorizontal: 16,
    },
    footerNote: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 12,
      color: COLORS.muted,
    },
  });
