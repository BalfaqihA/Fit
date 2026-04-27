import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { mapAuthError, signUpWithEmail } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GRADIENT_DARK = ['#1A1A2E', '#16213E', '#2D1B5E'] as const;
const GRADIENT_BRAND = ['#8E54E9', '#6C56D9'] as const;

type Styles = ReturnType<typeof makeStyles>;

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  icon,
  showToggle = false,
  isVisible = false,
  onToggle,
  styles,
  mutedColor,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  icon: React.ReactNode;
  showToggle?: boolean;
  isVisible?: boolean;
  onToggle?: () => void;
  styles: Styles;
  mutedColor: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <View style={styles.leftIcon}>{icon}</View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={mutedColor}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          style={styles.input}
        />

        {showToggle ? (
          <Pressable onPress={onToggle} style={styles.rightIcon} hitSlop={8}>
            <Ionicons
              name={isVisible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={mutedColor}
            />
          </Pressable>
        ) : (
          <View style={styles.rightSpacer} />
        )}
      </View>
    </View>
  );
}

export default function SignupPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await signUpWithEmail({ fullName, email, password });
      router.replace('/onboarding' as never);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={GRADIENT_DARK}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.topSection}
          >
            <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>

            <View style={styles.heroIconOuter}>
              <LinearGradient
                colors={GRADIENT_BRAND}
                start={{ x: 1, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.heroIconInner}
              >
                <MaterialCommunityIcons name="dumbbell" size={34} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your fitness journey today</Text>
          </LinearGradient>

          <View style={styles.formSection}>
            <InputField
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              icon={<Ionicons name="person-outline" size={20} color={COLORS.muted} />}
              styles={styles}
              mutedColor={COLORS.muted}
            />

            <InputField
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon={<Ionicons name="mail-outline" size={20} color={COLORS.muted} />}
              styles={styles}
              mutedColor={COLORS.muted}
            />

            <InputField
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showToggle
              isVisible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
              icon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.muted} />}
              styles={styles}
              mutedColor={COLORS.muted}
            />

            <InputField
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              showToggle
              isVisible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
              icon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.muted} />}
              styles={styles}
              mutedColor={COLORS.muted}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.buttonShadow, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              <LinearGradient
                colors={GRADIENT_BRAND}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.gradientButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/auth/login' as never)} hitSlop={8}>
                <Text style={styles.loginLink}>Log In</Text>
              </Pressable>
            </View>

            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
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
    scrollContent: {
      flexGrow: 1,
      backgroundColor: COLORS.bg,
    },
    topSection: {
      height: 280,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    backButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIconOuter: {
      marginBottom: 18,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      borderRadius: 999,
    },
    heroIconInner: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
    },
    formSection: {
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 40,
    },
    fieldWrapper: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 8,
    },
    inputContainer: {
      minHeight: 56,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.inputBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    },
    leftIcon: {
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    rightIcon: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    rightSpacer: {
      width: 24,
      marginLeft: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: COLORS.text,
      paddingVertical: 14,
    },
    buttonShadow: {
      borderRadius: RADIUS.md,
      marginTop: 8,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    gradientButton: {
      borderRadius: RADIUS.md,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradientButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.divider,
      marginTop: 22,
      marginBottom: 20,
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginText: {
      fontSize: 14,
      color: COLORS.muted,
    },
    loginLink: {
      fontSize: 14,
      color: COLORS.primary,
      fontWeight: '800',
    },
    termsText: {
      marginTop: 18,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.muted,
      paddingHorizontal: 10,
    },
    termsLink: {
      color: COLORS.primary,
      fontWeight: '700',
    },
    errorText: {
      color: COLORS.accent,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      textAlign: 'center',
    },
  });
