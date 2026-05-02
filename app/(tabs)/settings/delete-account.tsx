import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount, mapAuthError } from '@/lib/auth';

const CONFIRM_PHRASE = 'DELETE';

export default function DeleteAccount() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit =
    !loading && password.length > 0 && confirmText.trim() === CONFIRM_PHRASE;

  const submit = () => {
    Alert.alert(
      'Delete account?',
      'This permanently erases your workouts, measurements, plans, and achievements. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAccount(password);
              router.replace('/auth/login' as never);
              setTimeout(
                () =>
                  Alert.alert(
                    'Account deleted',
                    'Your account and data have been removed.',
                  ),
                300,
              );
            } catch (e) {
              Alert.alert('Error', mapAuthError(e));
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={26} color={COLORS.accent} />
          </View>
          <Text style={styles.warningTitle}>This is permanent</Text>
          <Text style={styles.warningBody}>
            Deleting your account removes everything tied to it: profile,
            workout history, measurements, generated plans, XP, and unlocked
            achievements. We can&apos;t restore any of it later.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm your password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.muted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Type {CONFIRM_PHRASE} to confirm
          </Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              placeholder={CONFIRM_PHRASE}
              placeholderTextColor={COLORS.muted}
            />
          </View>
        </View>

        <View style={{ height: 12 }} />
        <PrimaryButton
          label={loading ? 'Deleting…' : 'Delete my account'}
          onPress={submit}
          disabled={!canSubmit}
        />
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
    warningCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 22,
      gap: 8,
      ...SHADOWS.card,
    },
    warningIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(220, 80, 80, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    warningTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    warningBody: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
    field: { marginBottom: 14 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 6,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      ...SHADOWS.card,
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  });
