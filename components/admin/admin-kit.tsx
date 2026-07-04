import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';

// Shared building blocks so every admin screen gets the same loading / error /
// empty / refresh treatment without copy-pasting layout.

export function AdminScreen({
  title,
  subtitle,
  right,
  refreshing,
  onRefresh,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
  scroll?: boolean;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const header = (
    <View style={styles.header}>
      <BackButton />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function StateBlock({
  loading,
  error,
  empty,
  emptyText = 'Nothing here yet.',
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.state}>
        <Ionicons name="alert-circle-outline" size={28} color={COLORS.accent} />
        <Text style={styles.stateText}>{error}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.state}>
        <Ionicons name="file-tray-outline" size={28} color={COLORS.muted} />
        <Text style={styles.stateText}>{emptyText}</Text>
      </View>
    );
  }
  return null;
}

export function StatCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const bg =
    variant === 'danger'
      ? COLORS.accent
      : variant === 'ghost'
        ? 'transparent'
        : COLORS.primary;
  const fg = variant === 'ghost' ? COLORS.text : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        variant === 'ghost' && {
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    scroll: { padding: 16, paddingBottom: 40, gap: 12 },
    state: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    stateText: {
      color: COLORS.muted,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    retry: {
      marginTop: 6,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    retryText: { color: COLORS.primary, fontWeight: '700' },
    statCard: {
      flexGrow: 1,
      flexBasis: '47%',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      gap: 6,
      ...SHADOWS.card,
    },
    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    statLabel: { fontSize: 13, color: COLORS.muted },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 14,
      ...SHADOWS.card,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 6,
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: COLORS.text,
      fontSize: 15,
    },
    inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
    chipTextActive: { color: '#FFFFFF' },
    btn: {
      paddingHorizontal: 18,
      paddingVertical: 13,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: { fontSize: 15, fontWeight: '800' },
  });
