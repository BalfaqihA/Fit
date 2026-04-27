import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { mapAuthError, signInWithEmail } from '@/lib/auth';

type Styles = ReturnType<typeof makeStyles>;

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
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
  icon: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
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
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={secureTextEntry}
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

export default function LoginPage() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmail({ email, password });
      // The AuthGate in app/_layout.tsx will redirect to /(tabs) once user is set.
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    Alert.alert(
      'Coming soon',
      'Google sign-in will be available in a future update.'
    );
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
          <View style={styles.container}>
            <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </Pressable>

            <View style={styles.header}>
              <View style={styles.logoBox}>
                <MaterialCommunityIcons name="dumbbell" size={34} color="#FFFFFF" />
              </View>

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Log in to continue your fitness journey
              </Text>
            </View>

            <View style={styles.formArea}>
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
                placeholder="Enter your password"
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

              <Pressable
                style={styles.forgotWrapper}
                onPress={() => router.push('/auth/forgot-password' as never)}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonsArea}>
              <Pressable
                style={[styles.loginButton, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable style={styles.googleButton} onPress={handleGoogle}>
                <Ionicons name="logo-google" size={18} color={COLORS.text} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don&apos;t have an account? </Text>
              <Pressable onPress={() => router.push('/auth/signup' as never)} hitSlop={8}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </Pressable>
            </View>
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
    },
    container: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 40,
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
      marginTop: 12,
      marginBottom: 36,
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
    formArea: {
      marginBottom: 28,
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
    forgotWrapper: {
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    forgotText: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.primary,
    },
    buttonsArea: {
      marginBottom: 24,
    },
    loginButton: {
      width: '100%',
      height: 56,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    orRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: COLORS.divider,
    },
    orText: {
      fontSize: 12,
      color: COLORS.muted,
      fontWeight: '600',
    },
    googleButton: {
      width: '100%',
      height: 54,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    googleButtonText: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '700',
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    signupText: {
      fontSize: 14,
      color: COLORS.muted,
    },
    signupLink: {
      fontSize: 14,
      color: COLORS.primary,
      fontWeight: '800',
    },
    errorText: {
      color: COLORS.accent,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 14,
      textAlign: 'center',
    },
  });
