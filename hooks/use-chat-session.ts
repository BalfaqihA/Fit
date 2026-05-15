import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  sendChat,
  type ChatHistoryItem,
  type ChatRequest,
  type ChatResponse,
} from '@/lib/chatbot';
import { db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';
import { loadJSON, saveJSON } from '@/lib/storage';

/**
 * Local message shape. Mirrors what `chatbot.tsx` already uses, with the new
 * Gemini-pipeline structured fields layered in. Every assistant message that
 * the server returned `messageId` / `sessionId` for can also accept
 * thumbs-up/down feedback.
 */
export type LocalChatMessage = {
  id: string;
  from: 'user' | 'bot';
  text: string;
  intent?: string;
  /** Optional structured fields (Gemini path). */
  personalizedRecommendation?: string;
  reason?: string;
  steps?: string[];
  safetyWarning?: string;
  suggestedActions?: string[];
  followUpQuestion?: string;
  action?: ChatResponse['action'];
  quiz?: ChatResponse['quiz'];
  quizAnswered?: boolean;
  /** Server-generated ids, used for feedback. */
  messageId?: string;
  sessionId?: string;
  /** Lets the UI render a Retry button for the user's last failed turn. */
  errored?: boolean;
  /** Quiz UI state — only the selected index and an idempotency id need to
   *  survive re-renders; the rest comes from `quiz`. */
  quizSelected?: number;
  quizAttemptId?: string;
  xpAwarded?: number;
};

const INITIAL_GREETING: LocalChatMessage = {
  id: 'greeting',
  from: 'bot',
  text:
    "Hey, I'm your coach. Ask me about your plan, food, motivation, or anything fitness — I'll tailor advice to your stats.",
};

const STORAGE_PREFIX = '@fitlife:chat:v2:';

function cacheKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

function buildHistory(messages: LocalChatMessage[]): ChatHistoryItem[] {
  return messages
    .filter((m) => !m.errored)
    .slice(-10)
    .map((m) => ({
      from: m.from,
      text: m.text,
      intent: m.intent,
    }));
}

export function useChatSession() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [messages, setMessages] = useState<LocalChatMessage[]>([INITIAL_GREETING]);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastFailedRef = useRef<string | null>(null);

  // Load cached history on mount / when the user changes.
  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setMessages([INITIAL_GREETING]);
      setHydrated(true);
      return;
    }
    setHydrated(false);
    void (async () => {
      const cached = await loadJSON<LocalChatMessage[] | null>(cacheKey(uid), null);
      if (cancelled) return;
      if (cached && cached.length > 0) {
        setMessages(cached);
      } else {
        setMessages([INITIAL_GREETING]);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Persist on every change, but only after hydration finishes (so we don't
  // overwrite real cached data with the initial greeting placeholder).
  useEffect(() => {
    if (!uid || !hydrated) return;
    void saveJSON(cacheKey(uid), messages.slice(-50));
  }, [uid, messages, hydrated]);

  const send = useCallback(
    async (
      text: string,
      opts: Omit<ChatRequest, 'message' | 'history'> = {},
    ): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const userMsg: LocalChatMessage = {
        id: userId,
        from: 'user',
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setPending(true);
      lastFailedRef.current = null;

      try {
        // Build history from the state at send time (the closure has stale
        // messages otherwise). The setMessages update above is already
        // queued so we recompute from prev.
        let historyForServer: ChatHistoryItem[] = [];
        setMessages((prev) => {
          historyForServer = buildHistory([...prev]);
          return prev;
        });

        const res = await sendChat({ message: trimmed, history: historyForServer, ...opts });

        const botId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const botMsg: LocalChatMessage = {
          id: botId,
          from: 'bot',
          text: res.reply,
          intent: res.intent,
          personalizedRecommendation: res.personalizedRecommendation,
          reason: res.reason,
          steps: res.steps,
          safetyWarning: res.safetyWarning,
          suggestedActions: res.suggestedActions,
          followUpQuestion: res.followUpQuestion,
          action: res.action,
          quiz: res.quiz,
          messageId: res.messageId,
          sessionId: res.sessionId,
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        captureException(err, { tags: { area: 'chatbot', op: 'send' } });
        lastFailedRef.current = trimmed;
        // Mark the user message as errored so the UI can show a Retry chip.
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === userId);
          if (idx < 0) return prev;
          const next = prev.slice();
          next[idx] = { ...next[idx], errored: true };
          next.push({
            id: `err_${Date.now()}`,
            from: 'bot',
            text:
              "Sorry, I couldn't reach the coach service. Tap Retry to try again.",
            errored: true,
          });
          return next;
        });
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const retry = useCallback(async (): Promise<void> => {
    if (!lastFailedRef.current) return;
    const text = lastFailedRef.current;
    // Drop the previous errored pair so the retry doesn't accumulate cruft.
    setMessages((prev) => prev.filter((m) => !m.errored));
    await send(text);
  }, [send]);

  const newSession = useCallback((): void => {
    // Clear local state. The server detects no recent session via the 24h
    // timeout on the next send and rolls a fresh one automatically — there's
    // no client-side session-create call to make.
    setMessages([INITIAL_GREETING]);
    lastFailedRef.current = null;
  }, []);

  const submitFeedback = useCallback(
    async (msg: LocalChatMessage, rating: 'up' | 'down', reason?: string): Promise<void> => {
      if (!uid || !msg.messageId) return;
      try {
        await addDoc(collection(db, 'chatbot_feedback'), {
          userId: uid,
          messageId: msg.messageId,
          sessionId: msg.sessionId ?? null,
          rating,
          reason: reason ?? null,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        captureException(err, { tags: { area: 'chatbot', op: 'feedback' } });
      }
    },
    [uid],
  );

  // Generic per-message patch for things like quizSelected / quizAttemptId.
  const patchMessage = useCallback(
    (messageLocalId: string, patch: Partial<LocalChatMessage>): void => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageLocalId ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  // Append a raw bot message — used by callers that already have a server
  // response (e.g. quiz grading) and want to skip the normal send flow.
  const appendBotMessage = useCallback((msg: Omit<LocalChatMessage, 'id' | 'from'>): void => {
    setMessages((prev) => [
      ...prev,
      {
        id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        from: 'bot',
        ...msg,
      },
    ]);
  }, []);

  return {
    messages,
    pending,
    setPending,
    hydrated,
    canRetry: lastFailedRef.current !== null,
    send,
    retry,
    newSession,
    submitFeedback,
    patchMessage,
    appendBotMessage,
  };
}
