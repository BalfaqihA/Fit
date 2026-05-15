import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';

import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import {
  useChatSession,
  type LocalChatMessage,
} from '@/hooks/use-chat-session';
import { useTheme } from '@/hooks/use-theme';
import { type ChatAction, sendChat } from '@/lib/chatbot';
import { captureException } from '@/lib/observability';
import { randomId } from '@/lib/uuid';

const SUGGESTIONS = [
  'Create workout for today',
  'What should I eat after workout?',
  'Help me lose weight',
  'Give me motivation',
  'Knee-friendly workout',
  'Create weekly plan',
];

/**
 * Wraps Markdown rendering so a single malformed reply degrades to plain text
 * instead of blanking the whole chat.
 */
class SafeMarkdown extends React.Component<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { children: string; style: any; fallbackStyle: object },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    captureException(error, { tags: { area: 'chatbot.markdown' } });
  }
  render() {
    if (this.state.failed) {
      return <Text style={this.props.fallbackStyle}>{this.props.children}</Text>;
    }
    return <Markdown style={this.props.style}>{this.props.children}</Markdown>;
  }
}

export default function ChatbotTab() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(COLORS), [COLORS]);

  const {
    messages,
    pending,
    setPending,
    canRetry,
    send,
    retry,
    newSession,
    submitFeedback,
    patchMessage,
    appendBotMessage,
  } = useChatSession();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // Tracks which assistant messages already received a thumb so we can grey
  // the buttons out — feedback writes are append-only on the server, so this
  // is purely a UI nicety. Keyed by messageId (server id).
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  const handleAction = (action: ChatAction) => {
    if (action.type === 'navigate' && action.route) {
      router.push(action.route as never);
    } else if (action.type === 'external' && action.url) {
      void Linking.openURL(action.url);
    }
  };

  const handleSendDraft = async () => {
    if (!draft.trim() || pending) return;
    const text = draft.trim();
    setDraft('');
    await send(text);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleSuggestionTap = async (text: string) => {
    if (pending) return;
    await send(text);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleFeedback = async (msg: LocalChatMessage, rating: 'up' | 'down') => {
    if (!msg.messageId || feedbackGiven[msg.messageId]) return;
    setFeedbackGiven((prev) => ({ ...prev, [msg.messageId!]: rating }));
    await submitFeedback(msg, rating);
  };

  const handleNewChat = () => {
    if (pending) return;
    newSession();
  };

  const answerQuiz = async (msg: LocalChatMessage, selectedIndex: number) => {
    if (!msg.quiz || msg.quizAnswered || pending) return;
    const attemptId = msg.quizAttemptId ?? randomId();
    patchMessage(msg.id, {
      quizAnswered: true,
      quizSelected: selectedIndex,
      quizAttemptId: attemptId,
    });
    setPending(true);
    try {
      const res = await sendChat({
        message: msg.quiz.question,
        previousIntent: 'quiz_request',
        quizAnswer: { id: msg.quiz.id, selectedIndex, attemptId },
      });
      patchMessage(msg.id, { xpAwarded: res.xpAwarded });
      appendBotMessage({
        text: res.reply,
        intent: res.intent,
        xpAwarded: res.xpAwarded,
        messageId: res.messageId,
        sessionId: res.sessionId,
      });
    } catch (err) {
      captureException(err, { tags: { area: 'chatbot', op: 'quizAnswer' } });
      // Roll back the optimistic answered state so the user can retry.
      patchMessage(msg.id, { quizAnswered: false, quizSelected: undefined });
      appendBotMessage({
        text: "Sorry, I couldn't grade that quiz right now.",
      });
    } finally {
      setPending(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  const showSuggestions = messages.length <= 1 && !pending;

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
        <Pressable
          hitSlop={8}
          onPress={handleNewChat}
          disabled={pending}
          style={({ pressed }) => [
            styles.newChatBtn,
            (pressed || pending) && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.newChatText}>New chat</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <MessageBlock
              key={msg.id}
              msg={msg}
              COLORS={COLORS}
              styles={styles}
              markdownStyles={markdownStyles}
              pending={pending}
              feedbackRating={msg.messageId ? feedbackGiven[msg.messageId] : undefined}
              onAction={handleAction}
              onSuggestedTap={(t) => void handleSuggestionTap(t)}
              onFollowUpTap={(t) => void handleSuggestionTap(t)}
              onFeedback={(rating) => void handleFeedback(msg, rating)}
              onAnswerQuiz={(idx) => void answerQuiz(msg, idx)}
            />
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

          {canRetry && !pending && (
            <View style={[styles.bubbleRow, styles.rowStart]}>
              <Pressable
                style={styles.retryBtn}
                onPress={() => void retry()}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.retryText}>Retry last message</Text>
              </Pressable>
            </View>
          )}

          {showSuggestions && (
            <View style={styles.suggestionWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => void handleSuggestionTap(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about workouts, nutrition…"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            multiline
            editable={!pending}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!draft.trim() || pending) && { opacity: 0.4 },
            ]}
            onPress={() => void handleSendDraft()}
            disabled={!draft.trim() || pending}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- Per-message rendering ----------

type MessageBlockProps = {
  msg: LocalChatMessage;
  COLORS: Palette;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markdownStyles: any;
  pending: boolean;
  feedbackRating?: 'up' | 'down';
  onAction: (a: ChatAction) => void;
  onSuggestedTap: (t: string) => void;
  onFollowUpTap: (t: string) => void;
  onFeedback: (rating: 'up' | 'down') => void;
  onAnswerQuiz: (idx: number) => void;
};

function MessageBlock({
  msg,
  COLORS,
  styles,
  markdownStyles,
  pending,
  feedbackRating,
  onAction,
  onSuggestedTap,
  onFollowUpTap,
  onFeedback,
  onAnswerQuiz,
}: MessageBlockProps) {
  const isUser = msg.from === 'user';

  // Hide the legacy `text` field when we have a structured Gemini response —
  // we render its parts ourselves, and the markdown `text` is just the same
  // content concatenated. Keep it as a fallback when none of the structured
  // fields landed.
  const hasStructured =
    !isUser &&
    (msg.personalizedRecommendation ||
      msg.reason ||
      (msg.steps && msg.steps.length > 0) ||
      msg.safetyWarning ||
      (msg.suggestedActions && msg.suggestedActions.length > 0));

  // Pull just the lead sentence(s) from the legacy `reply` when we're
  // showing structured sections — markdown duplication is noisy.
  const leadText = hasStructured
    ? extractLeadAnswer(msg.text)
    : msg.text;

  return (
    <View style={styles.messageBlock}>
      <View
        style={[styles.bubbleRow, isUser ? styles.rowEnd : styles.rowStart]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            msg.errored && !isUser && styles.botBubbleErrored,
          ]}
        >
          {isUser ? (
            <Text style={[styles.bubbleText, { color: '#FFFFFF' }]}>
              {msg.text}
            </Text>
          ) : (
            <SafeMarkdown style={markdownStyles} fallbackStyle={styles.bubbleText}>
              {leadText}
            </SafeMarkdown>
          )}
        </View>
      </View>

      {/* Structured Gemini sections */}
      {!isUser && msg.personalizedRecommendation ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <View style={styles.recoBlock}>
            <Text style={styles.sectionLabel}>For you</Text>
            <Text style={styles.recoText}>{msg.personalizedRecommendation}</Text>
          </View>
        </View>
      ) : null}

      {!isUser && msg.steps && msg.steps.length > 0 ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <View style={styles.stepsBlock}>
            <Text style={styles.sectionLabel}>Try this</Text>
            {msg.steps.map((s, i) => (
              <View key={`${msg.id}-step-${i}`} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}.</Text>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!isUser && msg.reason ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <Text style={styles.reasonText}>Why: {msg.reason}</Text>
        </View>
      ) : null}

      {!isUser && msg.safetyWarning ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <View style={styles.warningBlock}>
            <Ionicons name="warning-outline" size={14} color={COLORS.accent} />
            <Text style={styles.warningText}>{msg.safetyWarning}</Text>
          </View>
        </View>
      ) : null}

      {/* Action button (deep link) */}
      {!isUser && msg.action ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <Pressable style={styles.actionBtn} onPress={() => onAction(msg.action!)}>
            <Ionicons name="arrow-forward-circle" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{msg.action.label}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Quiz card */}
      {!isUser && msg.quiz ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <View style={styles.quizCard}>
            <Text style={styles.quizQuestion}>{msg.quiz.question}</Text>
            {msg.quiz.options.map((opt, idx) => {
              const isSelected = msg.quizSelected === idx;
              const disabled = !!msg.quizAnswered;
              return (
                <Pressable
                  key={`${msg.id}-opt-${idx}`}
                  onPress={() => onAnswerQuiz(idx)}
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
            <Text style={styles.quizFooter}>Worth +{msg.quiz.xpReward} XP</Text>
          </View>
        </View>
      ) : null}

      {/* Suggested action chips (Gemini path) */}
      {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 ? (
        <View style={[styles.bubbleRow, styles.rowStart, styles.chipRow]}>
          {msg.suggestedActions.map((sa, i) => (
            <Pressable
              key={`${msg.id}-sa-${i}`}
              style={styles.suggestionChip}
              onPress={() => onSuggestedTap(sa)}
            >
              <Text style={styles.suggestionText}>{sa}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Follow-up — tap to auto-send rather than just filling the input. */}
      {!isUser && msg.followUpQuestion ? (
        <View style={[styles.bubbleRow, styles.rowStart]}>
          <Pressable
            style={styles.followUpChip}
            onPress={() => onFollowUpTap(msg.followUpQuestion!)}
          >
            <Ionicons name="help-circle-outline" size={14} color={COLORS.primary} />
            <Text style={styles.followUpText}>{msg.followUpQuestion}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Thumbs feedback — only when the server returned a messageId. */}
      {!isUser && msg.messageId && !msg.errored ? (
        <View style={[styles.bubbleRow, styles.rowStart, styles.feedbackRow]}>
          <Pressable
            hitSlop={6}
            disabled={!!feedbackRating}
            onPress={() => onFeedback('up')}
            style={[
              styles.feedbackBtn,
              feedbackRating === 'up' && styles.feedbackBtnActive,
            ]}
          >
            <Ionicons
              name={feedbackRating === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={13}
              color={feedbackRating === 'up' ? '#FFFFFF' : COLORS.muted}
            />
          </Pressable>
          <Pressable
            hitSlop={6}
            disabled={!!feedbackRating}
            onPress={() => onFeedback('down')}
            style={[
              styles.feedbackBtn,
              feedbackRating === 'down' && styles.feedbackBtnDownActive,
            ]}
          >
            <Ionicons
              name={feedbackRating === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={13}
              color={feedbackRating === 'down' ? '#FFFFFF' : COLORS.muted}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Pulls a 1-2 sentence lead out of the legacy reply markdown for the lead
 * bubble. When we have structured Gemini sections, we don't want to repeat
 * the full content in markdown — just the headline.
 */
function extractLeadAnswer(reply: string): string {
  // The Gemini renderer joins parts with `\n\n`. The first part is the
  // direct answer.
  const firstBlock = reply.split(/\n{2,}/)[0] ?? reply;
  return firstBlock.trim();
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
    newChatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.primary,
    },
    newChatText: {
      fontSize: 12,
      color: COLORS.primary,
      fontWeight: '700',
    },
    chatArea: { padding: 16, gap: 10, paddingBottom: 24 },
    messageBlock: { gap: 6 },
    bubbleRow: { flexDirection: 'row' },
    rowStart: { justifyContent: 'flex-start' },
    rowEnd: { justifyContent: 'flex-end' },
    chipRow: { flexWrap: 'wrap', gap: 6 },
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
    botBubbleErrored: {
      backgroundColor: COLORS.accent + '20',
      borderColor: COLORS.accent,
      borderWidth: StyleSheet.hairlineWidth,
    },
    userBubble: {
      backgroundColor: COLORS.primary,
      borderTopRightRadius: 6,
    },
    bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    sectionLabel: {
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    recoBlock: {
      maxWidth: '85%',
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.primary,
    },
    recoText: {
      fontSize: 13,
      color: COLORS.text,
      lineHeight: 19,
      fontStyle: 'italic',
    },
    stepsBlock: {
      maxWidth: '88%',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: COLORS.border,
    },
    stepRow: { flexDirection: 'row', gap: 8 },
    stepNum: {
      fontSize: 13,
      color: COLORS.primary,
      fontWeight: '800',
      minWidth: 18,
    },
    stepText: {
      flex: 1,
      fontSize: 13,
      color: COLORS.text,
      lineHeight: 19,
    },
    reasonText: {
      fontSize: 11,
      color: COLORS.muted,
      lineHeight: 16,
      paddingHorizontal: 4,
      maxWidth: '85%',
    },
    warningBlock: {
      flexDirection: 'row',
      gap: 6,
      maxWidth: '85%',
      backgroundColor: COLORS.accent + '15',
      borderColor: COLORS.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: COLORS.accent,
      lineHeight: 17,
      fontWeight: '600',
    },
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
    feedbackRow: { gap: 8, marginTop: 2 },
    feedbackBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: COLORS.border,
    },
    feedbackBtnActive: {
      backgroundColor: COLORS.success,
      borderColor: COLORS.success,
    },
    feedbackBtnDownActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
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
