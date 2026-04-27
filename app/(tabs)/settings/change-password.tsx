import { Ionicons } from '@expo/vector-icons';
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
import { changePassword, mapAuthError } from '@/lib/auth';

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

  const Field = ({
    label,
    value,
    onChange,
    show,
    onToggle,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={COLORS.muted}
        />
        <Pressable onPress={onToggle} hitSlop={8}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.muted}
          />
        </Pressable>
      </View>
    </View>
  );

  const Hint = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.hintRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? COLORS.success : COLORS.muted}
      />
      <Text style={[styles.hintText, met && { color: COLORS.text }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

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
        />
        <Field
          label="New password"
          value={next}
          onChange={setNext}
          show={showNext}
          onToggle={() => setShowNext((s) => !s)}
        />

        {next.length > 0 && (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  { width: `${strength.ratio * 100}%`, backgroundColor: strength.color },
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
        />

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Password must include:</Text>
          <Hint met={next.length >= 8} text="At least 8 characters" />
          <Hint met={/[A-Z]/.test(next)} text="One uppercase letter" />
          <Hint met={/[0-9]/.test(next)} text="One number" />
          <Hint met={/[^A-Za-z0-9]/.test(next)} text="One special character" />
        </View>

        <View style={{ height: 12 }} />
        <PrimaryButton label="Save" onPress={submit} disabled={!canSubmit} />
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
