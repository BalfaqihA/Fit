import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { MAX_REPORT_REASON_LEN, reportPost } from '@/lib/community';

type ReportModalProps = {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  /** Called after a successful submit so the caller can hide the post. */
  onReported?: (postId: string) => void;
};

/**
 * Cross-platform "Report post" sheet. Replaces `Alert.prompt`, which is
 * iOS-only and silently does nothing on Android (so reporting was broken
 * for Android users entirely).
 */
export function ReportModal({
  visible,
  postId,
  onClose,
  onReported,
}: ReportModalProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason('');
    setSubmitting(false);
    setDone(false);
    setError(null);
    onClose();
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!postId || !trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportPost(postId, trimmed);
      onReported?.(postId);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not submit your report.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {done ? (
            <View style={styles.doneWrap}>
              <Ionicons
                name="checkmark-circle"
                size={44}
                color={COLORS.primary}
              />
              <Text style={styles.doneTitle}>Report submitted</Text>
              <Text style={styles.doneSub}>
                Thanks — our team will review this post. It's now hidden from
                your feed.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={close}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Report this post</Text>
              <Text style={styles.subtitle}>
                Tell us briefly what is wrong. Your report is anonymous.
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="What's the issue?"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                multiline
                maxLength={MAX_REPORT_REASON_LEN}
                autoFocus
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={close}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.btn,
                    styles.primaryBtn,
                    (!reason.trim() || submitting) && { opacity: 0.5 },
                  ]}
                  onPress={submit}
                  disabled={!reason.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit report</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdropPress: { ...StyleSheet.absoluteFillObject },
    sheet: {
      backgroundColor: COLORS.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 34,
      ...SHADOWS.card,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    subtitle: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 6,
      marginBottom: 14,
    },
    input: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 90,
      fontSize: 14,
      color: COLORS.text,
      textAlignVertical: 'top',
      ...SHADOWS.card,
    },
    error: { color: '#E5484D', fontSize: 13, marginTop: 10 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
    btn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: RADIUS.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: COLORS.border,
    },
    cancelBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    primaryBtn: { backgroundColor: COLORS.primary },
    primaryBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    doneWrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
    doneTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    doneSub: {
      fontSize: 13,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 8,
    },
  });
