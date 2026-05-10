import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { changePassword, mapAuthError } from '@/lib/auth';

type Styles = ReturnType<typeof makeStyles>;

function scorePassword(
  pw: string,
  COLORS: Palette,
): { label: string; ratio: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const ratio = score / 4;
  if (score <= 1) return { label: 'Weak', ratio, color: COLORS.accent };
  if (score === 2) return { label: 'Fair', ratio, color: '#F2A43A' };
  if (score === 3) return { label: 'Good', ratio, color: COLORS.primary };
  return { label: 'Strong', ratio, color: COLORS.success };
}

// Component lives at module scope (NOT inside ChangePassword) — declaring it
// inside the parent caused React to remount the TextInput on every keystroke,
// which dismissed the keyboard after a single character.
function Field({
  label,
  value,
  onChange,
  show,
  onToggle,
  styles,
  mutedColor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  styles: Styles;
  mutedColor: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholderTextColor={mutedColor}
        />
        <Pressable onPress={onToggle} hitSlop={8}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={mutedColor}
          />
        </Pressable>
      </View>
    </View>
  );
}

function Hint({
  met,
  text,
  styles,
  successColor,
  mutedColor,
  textColor,
}: {
  met: boolean;
  text: string;
  styles: Styles;
  successColor: string;
  mutedColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.hintRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? successColor : mutedColor}
      />
      <Text style={[styles.hintText, met && { color: textColor }]}>{text}</Text>
    </View>
  );
}

export default function ChangePassword() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => scorePassword(next, COLORS), [next, COLORS]);
  const canSubmit =
    !loading && current.length > 0 && next.length >= 8 && next === confirm;

  const submit = async () => {
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    try {
      setLoading(true);
      await changePassword({ currentPassword: current, newPassword: next });
      Alert.alert('Updated', 'Your password has been changed.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      Alert.alert('Error', mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field
            label="Current password"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            styles={styles}
            mutedColor={COLORS.muted}
          />
          <Field
            label="New password"
            value={next}
            onChange={setNext}
            show={showNext}
            onToggle={() => setShowNext((s) => !s)}
            styles={styles}
            mutedColor={COLORS.muted}
          />

          {next.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${strength.ratio * 100}%`,
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
          )}

          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            show={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            styles={styles}
            mutedColor={COLORS.muted}
          />

          <View style={styles.hintCard}>
            <Text style={styles.hintTitle}>Password must include:</Text>
            <Hint
              met={next.length >= 8}
              text="At least 8 characters"
              styles={styles}
              successColor={COLORS.success}
              mutedColor={COLORS.muted}
              textColor={COLORS.text}
            />
            <Hint
              met={/[A-Z]/.test(next)}
              text="One uppercase letter"
              styles={styles}
              successColor={COLORS.success}
              mutedColor={COLORS.muted}
              textColor={COLORS.text}
            />
            <Hint
              met={/[0-9]/.test(next)}
              text="One number"
              styles={styles}
              successColor={COLORS.success}
              mutedColor={COLORS.muted}
              textColor={COLORS.text}
            />
            <Hint
              met={/[^A-Za-z0-9]/.test(next)}
              text="One special character"
              styles={styles}
              successColor={COLORS.success}
              mutedColor={COLORS.muted}
              textColor={COLORS.text}
            />
          </View>

          <View style={{ height: 12 }} />
          <PrimaryButton label="Save" onPress={submit} disabled={!canSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    strengthWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
      marginLeft: 4,
    },
    strengthBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: COLORS.border,
      overflow: 'hidden',
    },
    strengthFill: { height: '100%', borderRadius: 3 },
    strengthText: { fontSize: 12, fontWeight: '700', width: 50 },
    hintCard: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginTop: 6,
      gap: 8,
      ...SHADOWS.card,
    },
    hintTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hintText: { fontSize: 13, color: COLORS.muted },
  });
