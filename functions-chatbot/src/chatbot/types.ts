// Shared types for the Gemini-powered chatbot pipeline. Kept in one place so
// every module (orchestrator, services, validator, prompt builder) speaks the
// same shape.

export const BROAD_INTENTS = [
  'workout_plan',
  'nutrition_advice',
  'weight_loss',
  'muscle_gain',
  'motivation',
  'injury_warning',
  'app_help',
  'general_chat',
] as const;
export type BroadIntent = (typeof BROAD_INTENTS)[number];

export type SafetyLevel = 'none' | 'caution' | 'block';

export type SafetyDecision = {
  level: SafetyLevel;
  /** Human-readable reason — passed into the Gemini prompt when level=caution,
   *  used as the canned reply when level=block. */
  reason?: string;
};

/** What Gemini is contractually required to return. */
export type GeminiAnswer = {
  answer: string;
  personalizedRecommendation: string;
  reason: string;
  steps: string[];
  safetyWarning: string;
  followUpQuestion: string;
  suggestedActions: string[];
  confidence: number;
};

export type KnowledgeDoc = {
  id: string;
  title: string;
  category?: string;
  content: string;
  tags?: string[];
  goal?: string;
  fitnessLevel?: string;
  difficulty?: string;
  safetyNotes?: string;
  keywords?: string[];
};

export type ChatMemoryDoc = {
  userId: string;
  summary?: string;
  lastGoal?: string;
  lastRecommendedWorkout?: string;
  dislikedExercises?: string[];
  preferredTone?: string;
  commonQuestions?: string[];
};

export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessageDoc = {
  role: ChatMessageRole;
  text: string;
  intent?: string;
  safetyLevel?: SafetyLevel;
  sourcesUsed?: string[];
};

export type ChatbotUsageDoc = {
  date: string;
  count: number;
};

export type ChatHistoryEntry = {
  from: 'user' | 'bot';
  text: string;
  intent?: string;
};

/** What the orchestrator returns to `chat()`; matches the client `ChatResponse`. */
export type OrchestratorResult = {
  reply: string;
  intent: string;
  confidence: number;
  /** When Gemini succeeded, these structured fields are populated. The
   *  template fallback path only sets `reply` + legacy `segments`. */
  personalizedRecommendation?: string;
  reason?: string;
  steps?: string[];
  safetyWarning?: string;
  suggestedActions?: string[];
  followUpQuestion?: string;
  segments?: {
    shortAnswer: string;
    explanation?: string;
    actionSteps?: string[];
    suggestion?: string;
  };
  action?: {
    label: string;
    type: 'navigate' | 'external';
    route?: string;
    url?: string;
  };
  quiz?: {
    id: string;
    question: string;
    options: string[];
    xpReward: number;
  };
  /** Server-generated Firestore ids so the client can attach feedback / load
   *  by id. Undefined on the template-fallback path. */
  messageId?: string;
  sessionId?: string;
};
