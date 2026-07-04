import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import {
  markSupportThreadRead,
  sendAdminSupportReply,
  subscribeSupportMessages,
  type SupportMessage,
} from '@/lib/support';

export default function AdminSupportThread() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<SupportMessage>>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeSupportMessages(
      uid,
      (list) => {
        setMessages(list);
        setLoading(false);
        markSupportThreadRead(uid, 'admin').catch(() => {});
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !uid) return;
    setSending(true);
    try {
      await sendAdminSupportReply(uid, trimmed);
      setText('');
    } catch {
      // captured upstream; keep text for retry
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Support chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No messages in this thread.</Text>
            }
            renderItem={({ item }) => {
              const mine = item.senderRole === 'admin';
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    {!mine && <Text style={styles.bubbleAuthor}>Member</Text>}
                    <Text style={[styles.bubbleText, mine && { color: '#FFFFFF' }]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Reply to this member…"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={onSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
    empty: {
      textAlign: 'center',
      marginTop: 50,
      color: COLORS.muted,
      fontSize: 13,
    },
    bubbleRow: { flexDirection: 'row', marginBottom: 10 },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubbleRowTheirs: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '80%',
      borderRadius: RADIUS.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...SHADOWS.card,
    },
    bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },
    bubbleAuthor: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.primary,
      marginBottom: 3,
    },
    bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 19 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.divider,
      backgroundColor: COLORS.bg,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      fontSize: 14,
      color: COLORS.text,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
