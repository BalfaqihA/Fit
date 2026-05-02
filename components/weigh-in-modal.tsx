import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { recordWeight } from '@/lib/measurements';
import {
  requestNotificationPermissionOnce,
  scheduleWeeklyWeighIn,
} from '@/lib/notifications';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function WeighInModal({ visible, onClose }: Props) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const initial = profile.weightKg ? String(profile.weightKg) : '';
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    if (!user) return;
    const parsed = Number(value.replace(',', '.'));
    if (!parsed || parsed < 25 || parsed > 400) {
      setError('Enter a weight between 25 and 400 kg.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordWeight(user.uid, parsed);
      // Re-arm the weekly reminder so it fires 7 days from now.
      const granted = await requestNotificationPermissionOnce();
      if (granted) await scheduleWeeklyWeighIn();
      onClose();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <Text style={styles.title}>Weekly weigh-in</Text>
          <Text style={styles.subtitle}>
            Log your current weight to keep your stats and goals up to date.
          </Text>

          <Text style={styles.fieldLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g. 72.4"
            placeholderTextColor={COLORS.muted}
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ height: 14 }} />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save weight'}
            onPress={onSave}
            disabled={saving}
            icon={
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    backdropPress: { ...StyleSheet.absoluteFillObject },
    sheet: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      padding: 22,
      paddingBottom: 32,
      ...SHADOWS.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    iconBubble: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    subtitle: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 4,
      lineHeight: 19,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 18,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.text,
    },
    error: {
      color: COLORS.accent,
      fontSize: 12,
      marginTop: 8,
      fontWeight: '600',
    },
  });
