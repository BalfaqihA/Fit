import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

export type ChatHistoryItem = {
  from: 'user' | 'bot';
  text: string;
  intent?: string;
};

export type QuizAnswerPayload = {
  id: string;
  selectedIndex: number;
  /** Stable per-attempt id; the server uses it as a Firestore doc id to make
   * grading idempotent (retries don't double-grant XP). */
  attemptId: string;
};

export type ChatStyle = 'beginner' | 'advanced' | 'motivational';

export type ChatRequest = {
  message: string;
  previousIntent?: string;
  history?: ChatHistoryItem[];
  styleHint?: ChatStyle;
  quizAnswer?: QuizAnswerPayload;
};

export type ChatAction = {
  label: string;
  type: 'navigate' | 'external';
  route?: string;
  url?: string;
};

export type ChatQuiz = {
  id: string;
  question: string;
  options: string[];
  xpReward: number;
};

export type ChatSegments = {
  shortAnswer: string;
  explanation?: string;
  actionSteps?: string[];
  suggestion?: string;
};

export type ChatResponse = {
  reply: string;
  intent: string;
  confidence: number;
  segments?: ChatSegments;
  action?: ChatAction;
  followUpQuestion?: string;
  quiz?: ChatQuiz;
  xpAwarded?: number;
  capReached?: boolean;
};

const chatFn = httpsCallable<ChatRequest, ChatResponse>(functions, 'chat');

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await chatFn(req);
  return res.data;
}
