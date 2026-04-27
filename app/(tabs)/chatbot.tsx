import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
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

type Message = {
  id: string;
  text: string;
  from: 'bot' | 'user';
};

const seed: Message[] = [
  { id: 'm1', from: 'bot', text: "Hi! I'm your FitLife coach. How can I help today?" },
  { id: 'm2', from: 'user', text: 'I want to build more upper body strength.' },
  {
    id: 'm3',
    from: 'bot',
    text: 'Great goal! Aim for 3 sessions per week: push, pull, and shoulders. Want me to build a 4-week plan?',
  },
  { id: 'm4', from: 'user', text: "Yes please, I've got dumbbells at home." },
  {
    id: 'm5',
    from: 'bot',
    text: "Got it — dumbbell-only upper body plan coming right up. I'll include sets, reps, and rest times.",
  },
];

export default function ChatbotTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [messages, setMessages] = useState<Message[]>(seed);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${Date.now()}`, from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          from: 'bot',
          text: "Thanks! I'll factor that in and update your plan shortly.",
        },
      ]);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.botName}>FitLife Coach</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online · AI assistant</Text>
          </View>
        </View>
        <Pressable hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubbleRow,
                msg.from === 'user' ? styles.rowEnd : styles.rowStart,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.from === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.from === 'user' && { color: '#FFFFFF' },
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="add" size={22} color={COLORS.muted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about workouts, nutrition…"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.iconBtn}>
            <Ionicons name="mic-outline" size={20} color={COLORS.muted} />
          </Pressable>
          <Pressable
            style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
            onPress={send}
            disabled={!draft.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
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
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    botAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.success,
    },
    statusText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
    chatArea: { padding: 16, gap: 10, paddingBottom: 24 },
    bubbleRow: { flexDirection: 'row' },
    rowStart: { justifyContent: 'flex-start' },
    rowEnd: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    botBubble: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 6,
      ...SHADOWS.card,
    },
    userBubble: {
      backgroundColor: COLORS.primary,
      borderTopRightRadius: 6,
    },
    bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: COLORS.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      minHeight: 36,
      maxHeight: 120,
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: COLORS.text,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
  });
