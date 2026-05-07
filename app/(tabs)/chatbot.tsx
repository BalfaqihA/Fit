import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import {
  type ChatAction,
  type ChatHistoryItem,
  type ChatQuiz,
  sendChat,
} from '@/lib/chatbot';
import { captureException } from '@/lib/observability';

type Message = {
  id: string;
  text: string;
  from: 'bot' | 'user';
  intent?: string;
  action?: ChatAction;
  followUpQuestion?: string;
  quiz?: ChatQuiz;
  quizAnswered?: boolean;
  quizSelected?: number;
  xpAwarded?: number;
};

const initialMessages: Message[] = [
  {
    id: 'greeting',
    from: 'bot',
    text: "Hi! I'm your **FitLife coach**.\n\nAsk me about your plan, nutrition, motivation, or recovery — or type _quiz me_ for a knowledge check.",
  },
];

const SUGGESTIONS = [
  "What's my workout today?",
  'How much protein do I need?',
  'Quiz me',
  'Make it harder',
];

export default function ChatbotTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(COLORS), [COLORS]);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const buildHistory = (): ChatHistoryItem[] =>
    messages.slice(-10).map((m) => ({
      from: m.from,
      text: m.text,
      intent: m.intent,
    }));

  const appendBotMessage = (msg: Omit<Message, 'id' | 'from'>) => {
    setMessages((prev) => [
      ...prev,
      { id: `b-${Date.now()}-${Math.random()}`, from: 'bot', ...msg },
    ]);
  };

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || pending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      from: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!override) setDraft('');
    setPending(true);

    try {
      const res = await sendChat({
        message: text,
        previousIntent: lastIntent ?? undefined,
        history: buildHistory(),
      });
      appendBotMessage({
        text: res.reply,
        intent: res.intent,
        action: res.action,
        followUpQuestion: res.followUpQuestion,
        quiz: res.quiz,
      });
      setLastIntent(res.intent);
    } catch (err) {
      captureException(err, {
        tags: { area: 'chatbot', op: 'sendChat' },
      });
      appendBotMessage({
        text: "Sorry, I couldn't reach the coach service. Try again in a moment.",
      });
    } finally {
      setPending(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  const answerQuiz = async (msg: Message, selectedIndex: number) => {
    if (!msg.quiz || msg.quizAnswered || pending) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? { ...m, quizAnswered: true, quizSelected: selectedIndex }
          : m,
      ),
    );
    setPending(true);

    try {
      const res = await sendChat({
        message: msg.quiz.question,
        previousIntent: 'quiz_request',
        history: buildHistory(),
        quizAnswer: { id: msg.quiz.id, selectedIndex },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, xpAwarded: res.xpAwarded } : m,
        ),
      );
      appendBotMessage({
        text: res.reply,
        intent: res.intent,
        xpAwarded: res.xpAwarded,
      });
      setLastIntent(res.intent);
    } catch (err) {
      captureException(err, {
        tags: { area: 'chatbot', op: 'quizAnswer' },
      });
      appendBotMessage({
        text: "Sorry, I couldn't grade that quiz right now.",
      });
    } finally {
      setPending(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleAction = (action: ChatAction) => {
    if (action.type === 'navigate' && action.route) {
      router.push(action.route as never);
    } else if (action.type === 'external' && action.url) {
      void Linking.openURL(action.url);
    }
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
            <View key={msg.id} style={styles.messageBlock}>
              <View
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
                  {msg.from === 'bot' ? (
                    <Markdown style={markdownStyles}>{msg.text}</Markdown>
                  ) : (
                    <Text style={[styles.bubbleText, { color: '#FFFFFF' }]}>
                      {msg.text}
                    </Text>
                  )}
                </View>
              </View>

              {msg.from === 'bot' && msg.action && (
                <View style={[styles.bubbleRow, styles.rowStart]}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => handleAction(msg.action!)}
                  >
                    <Ionicons
                      name="arrow-forward-circle"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionBtnText}>{msg.action.label}</Text>
                  </Pressable>
                </View>
              )}

              {msg.from === 'bot' && msg.quiz && (
                <View style={[styles.bubbleRow, styles.rowStart]}>
                  <View style={styles.quizCard}>
                    <Text style={styles.quizQuestion}>{msg.quiz.question}</Text>
                    {msg.quiz.options.map((opt, idx) => {
                      const isSelected = msg.quizSelected === idx;
                      const disabled = !!msg.quizAnswered;
                      return (
                        <Pressable
                          key={`${msg.id}-opt-${idx}`}
                          onPress={() => answerQuiz(msg, idx)}
                          disabled={disabled || pending}
                          style={[
                            styles.quizOption,
                            isSelected && styles.quizOptionSelected,
                            disabled && !isSelected && { opacity: 0.55 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.quizOptionText,
                              isSelected && { color: '#FFFFFF' },
                            ]}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Text style={styles.quizFooter}>
                      Worth +{msg.quiz.xpReward} XP
                    </Text>
                  </View>
                </View>
              )}

              {msg.from === 'bot' && msg.followUpQuestion && (
                <View style={[styles.bubbleRow, styles.rowStart]}>
                  <Pressable
                    style={styles.followUpChip}
                    onPress={() => setDraft(msg.followUpQuestion!)}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.followUpText}>
                      {msg.followUpQuestion}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          {pending && (
            <View style={[styles.bubbleRow, styles.rowStart]}>
              <View style={[styles.bubble, styles.botBubble]}>
                <Text style={[styles.bubbleText, { color: COLORS.muted }]}>
                  Coach is typing…
                </Text>
              </View>
            </View>
          )}

          {messages.length <= 1 && !pending && (
            <View style={styles.suggestionWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => void send(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
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
            editable={!pending}
          />
          <Pressable style={styles.iconBtn}>
            <Ionicons name="mic-outline" size={20} color={COLORS.muted} />
          </Pressable>
          <Pressable
            style={[
              styles.sendBtn,
              (!draft.trim() || pending) && { opacity: 0.4 },
            ]}
            onPress={() => void send()}
            disabled={!draft.trim() || pending}
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
    messageBlock: { gap: 6 },
    bubbleRow: { flexDirection: 'row' },
    rowStart: { justifyContent: 'flex-start' },
    rowEnd: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '82%',
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
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.md,
      ...SHADOWS.button,
      shadowColor: COLORS.primary,
    },
    actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    quizCard: {
      maxWidth: '88%',
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      padding: 14,
      gap: 8,
      ...SHADOWS.card,
    },
    quizQuestion: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 4,
    },
    quizOption: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: COLORS.bg,
    },
    quizOptionSelected: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    quizOptionText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
    quizFooter: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: '600',
      marginTop: 4,
    },
    followUpChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.inputBg,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    followUpText: {
      fontSize: 12,
      color: COLORS.primary,
      fontWeight: '700',
    },
    suggestionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    suggestionChip: {
      backgroundColor: COLORS.inputBg,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    suggestionText: {
      fontSize: 12,
      color: COLORS.text,
      fontWeight: '600',
    },
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

const makeMarkdownStyles = (COLORS: Palette) => ({
  body: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  heading1: { color: COLORS.text, fontSize: 18, fontWeight: '800' as const },
  heading2: { color: COLORS.text, fontSize: 16, fontWeight: '800' as const },
  heading3: { color: COLORS.text, fontSize: 15, fontWeight: '700' as const },
  strong: { fontWeight: '800' as const, color: COLORS.text },
  em: { fontStyle: 'italic' as const, color: COLORS.muted },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  link: { color: COLORS.primary, fontWeight: '700' as const },
  code_inline: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
});
