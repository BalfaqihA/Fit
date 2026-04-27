import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
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
import { useTheme, type ThemeMode } from '@/hooks/use-theme';

const modes: {
  key: ThemeMode;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'light', label: 'Light', desc: 'Classic bright interface', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', desc: 'Easier on the eyes at night', icon: 'moon-outline' },
  { key: 'system', label: 'System', desc: 'Match your device setting', icon: 'phone-portrait-outline' },
];

export default function DarkMode() {
  const { COLORS, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Dark Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>Choose how FitLife looks on your device.</Text>

        <View style={{ gap: 12 }}>
          {modes.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setMode(m.key)}
              >
                <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                  <Ionicons
                    name={m.icon}
                    size={22}
                    color={active ? '#FFFFFF' : COLORS.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>{m.label}</Text>
                  <Text style={styles.cardDesc}>{m.desc}</Text>
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
            );
          })}
        </View>

        <Text style={styles.footerNote}>Theme will apply to the entire app.</Text>
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
    intro: { fontSize: 14, color: COLORS.muted, marginBottom: 18 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 14,
      gap: 14,
      borderWidth: 2,
      borderColor: 'transparent',
      ...SHADOWS.card,
    },
    cardActive: { borderColor: COLORS.primary },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxActive: { backgroundColor: COLORS.primary },
    cardLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    cardDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.border,
    },
    footerNote: {
      textAlign: 'center',
      marginTop: 22,
      fontSize: 12,
      color: COLORS.muted,
    },
  });
