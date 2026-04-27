import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { mapAuthError, sendPasswordReset } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/login' as never);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={goToLogin} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="lock-reset" size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email to receive reset instructions
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputBox}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.muted}
                  style={{ marginRight: 8 }}
                />

                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.muted}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Pressable
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {sent ? 'Resend Link' : 'Send Reset Link'}
                </Text>
              )}
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.divider} />

            {sent ? (
              <View style={styles.successRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.successText}>
                  If that email exists, a reset link is on its way.
                </Text>
              </View>
            ) : (
              <Text style={styles.infoText}>
                We&apos;ll send a link to your registered{'\n'}email address.
              </Text>
            )}
          </View>

          <Pressable style={styles.backRow} onPress={goToLogin} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backText}>Back to Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    scroll: {
      padding: 22,
      paddingTop: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    header: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 28,
    },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '500',
      color: COLORS.muted,
      textAlign: 'center',
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 20,
      ...SHADOWS.card,
    },
    field: {
      marginBottom: 18,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
      color: COLORS.text,
    },
    inputBox: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      backgroundColor: COLORS.inputBg,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: COLORS.text,
      paddingVertical: 14,
    },
    button: {
      backgroundColor: COLORS.primary,
      height: 56,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 16,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.divider,
      marginVertical: 18,
    },
    infoText: {
      textAlign: 'center',
      fontSize: 12,
      color: COLORS.muted,
      lineHeight: 18,
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    successText: {
      flex: 1,
      fontSize: 12,
      color: COLORS.muted,
      lineHeight: 18,
    },
    backRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 28,
      gap: 6,
    },
    backText: {
      color: COLORS.primary,
      fontWeight: '700',
      fontSize: 15,
    },
    errorText: {
      color: COLORS.accent,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 12,
    },
  });
