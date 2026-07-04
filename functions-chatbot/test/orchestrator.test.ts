// The orchestrator is pure control-flow over a dozen collaborators. We stub
// every collaborator and assert the branch taken (override / safety-block /
// quota / DeepSeek-fail / happy path) plus that DeepSeek is NOT called on the
// short-circuit paths.

const mockCheckOverrides = jest.fn();
const mockBuildPersonalContext = jest.fn();
const mockCheckAndIncrement = jest.fn();
const mockCallDeepSeek = jest.fn();
const mockGetOrCreateActiveSession = jest.fn();
const mockAppendMessage = jest.fn();
const mockLoadMemory = jest.fn();
const mockUpdateMemory = jest.fn();
const mockMapToBroadIntent = jest.fn();
const mockRetrieveExerciseDocs = jest.fn();
const mockRetrieveKnowledge = jest.fn();
const mockBuildGeminiPrompt = jest.fn();
const mockParseAndValidate = jest.fn();
const mockRenderAnswerMarkdown = jest.fn();
const mockBlockReply = jest.fn();
const mockOffTopicReply = jest.fn();
const mockPreGeminiSafetyCheck = jest.fn();
const mockClassifyMessage = jest.fn();
const mockRunTemplatePipeline = jest.fn();

class MockDeepSeekError extends Error {}

jest.mock('../src/overrides', () => ({ checkOverrides: mockCheckOverrides }));
jest.mock('../src/personalize', () => ({
  buildPersonalContext: mockBuildPersonalContext,
}));
jest.mock('../src/chatbot/dailyQuota', () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));
jest.mock('../src/chatbot/deepseekClient', () => ({
  callDeepSeek: mockCallDeepSeek,
  DeepSeekError: MockDeepSeekError,
}));
jest.mock('../src/chatbot/chatHistoryService', () => ({
  getOrCreateActiveSession: mockGetOrCreateActiveSession,
  appendMessage: mockAppendMessage,
}));
jest.mock('../src/chatbot/chatMemoryService', () => ({
  loadMemory: mockLoadMemory,
  updateMemory: mockUpdateMemory,
}));
jest.mock('../src/chatbot/intentMapper', () => ({
  mapToBroadIntent: mockMapToBroadIntent,
}));
jest.mock('../src/chatbot/exerciseRetriever', () => ({
  retrieveExerciseDocs: mockRetrieveExerciseDocs,
}));
jest.mock('../src/chatbot/knowledgeRetriever', () => ({
  retrieveKnowledge: mockRetrieveKnowledge,
}));
jest.mock('../src/chatbot/promptBuilder', () => ({
  buildGeminiPrompt: mockBuildGeminiPrompt,
}));
jest.mock('../src/chatbot/responseValidator', () => ({
  parseAndValidate: mockParseAndValidate,
  renderAnswerMarkdown: mockRenderAnswerMarkdown,
}));
jest.mock('../src/chatbot/safetyRules', () => ({
  blockReply: mockBlockReply,
  offTopicReply: mockOffTopicReply,
  preGeminiSafetyCheck: mockPreGeminiSafetyCheck,
}));
jest.mock('../src/chatbot/templateFallback', () => ({
  classifyMessage: mockClassifyMessage,
  runTemplatePipeline: mockRunTemplatePipeline,
  SOFT_THRESHOLD: 0.4,
}));

import { handle, type OrchestratorInputs } from '../src/chatbot/orchestrator';

const INPUTS: OrchestratorInputs = {
  uid: 'u1',
  message: 'how do I squat?',
  history: [],
  previousIntent: null,
};

const VALIDATED = {
  answer: 'Squat to depth.',
  personalizedRecommendation: 'Start with bodyweight.',
  reason: 'safer for beginners',
  steps: ['brace', 'descend'],
  safetyWarning: '',
  followUpQuestion: '',
  suggestedActions: ['Open workout'],
  confidence: 0.8,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default happy-path wiring.
  mockCheckOverrides.mockReturnValue(null);
  mockClassifyMessage.mockResolvedValue({
    topTag: 'general_chat',
    topConf: 0.5,
    secondTag: 'general_chat',
    secondConf: 0.1,
  });
  mockMapToBroadIntent.mockReturnValue('general_chat');
  mockBuildPersonalContext.mockResolvedValue({
    todayPlanExercises: '—',
    goal: 'general',
    __fitnessLevel: 'beginner',
    equipment: 'bodyweight',
  });
  mockPreGeminiSafetyCheck.mockReturnValue({ level: 'none' });
  mockBlockReply.mockReturnValue('BLOCKED');
  mockOffTopicReply.mockReturnValue({
    reply: 'OFFTOPIC',
    intent: 'off_topic',
    confidence: 1.0,
    segments: { shortAnswer: 'OFFTOPIC' },
  });
  mockLoadMemory.mockResolvedValue({ userId: 'u1' });
  mockRetrieveKnowledge.mockResolvedValue([]);
  mockRetrieveExerciseDocs.mockResolvedValue([]);
  mockCheckAndIncrement.mockResolvedValue({
    allowed: true,
    countAfter: 1,
    date: '2026-05-19',
  });
  mockBuildGeminiPrompt.mockReturnValue({
    systemInstruction: 's',
    userPrompt: 'u',
  });
  mockCallDeepSeek.mockResolvedValue('{"answer":"ok"}');
  mockParseAndValidate.mockReturnValue(VALIDATED);
  mockRenderAnswerMarkdown.mockReturnValue('RENDERED');
  mockGetOrCreateActiveSession.mockResolvedValue('sess-1');
  mockAppendMessage.mockResolvedValue('msg-1');
  mockUpdateMemory.mockResolvedValue(undefined);
  mockRunTemplatePipeline.mockResolvedValue({
    reply: 'TEMPLATE',
    intent: 'general_chat',
    confidence: 0.3,
    segments: { shortAnswer: 'TEMPLATE' },
  });
});

describe('handle — short-circuit paths', () => {
  it('returns the vetted override reply and never touches Gemini', async () => {
    mockCheckOverrides.mockReturnValue({
      reply: 'Please contact a crisis line.',
      intent: 'crisis',
    });
    const r = await handle(INPUTS);
    expect(r.reply).toBe('Please contact a crisis line.');
    expect(r.confidence).toBe(1.0);
    expect(mockClassifyMessage).not.toHaveBeenCalled();
    expect(mockCallDeepSeek).not.toHaveBeenCalled();
  });

  it('blocks low-severity unsafe input with a canned reply (no Gemini)', async () => {
    mockPreGeminiSafetyCheck.mockReturnValue({
      level: 'block',
      reason: 'extreme dieting',
    });
    const r = await handle(INPUTS);
    expect(r.reply).toBe('BLOCKED');
    expect(r.intent).toBe('safety_block');
    expect(mockCallDeepSeek).not.toHaveBeenCalled();
  });

  it('redirects off-topic questions without personalizing or calling Gemini', async () => {
    mockClassifyMessage.mockResolvedValue({
      topTag: 'off_topic',
      topConf: 0.9,
      secondTag: 'general_chat',
      secondConf: 0.05,
    });
    mockMapToBroadIntent.mockReturnValue('off_topic');
    const r = await handle({ ...INPUTS, message: 'what is the capital of France' });
    expect(r.reply).toBe('OFFTOPIC');
    expect(r.intent).toBe('off_topic');
    expect(mockOffTopicReply).toHaveBeenCalled();
    expect(mockBuildPersonalContext).not.toHaveBeenCalled();
    expect(mockCallDeepSeek).not.toHaveBeenCalled();
  });

  it('does NOT redirect an in-domain message the classifier mis-tagged off_topic', async () => {
    // Classifier wrongly calls this off_topic with high confidence...
    mockClassifyMessage.mockResolvedValue({
      topTag: 'off_topic',
      topConf: 0.9,
      secondTag: 'general_chat',
      secondConf: 0.05,
    });
    mockMapToBroadIntent.mockReturnValue('off_topic');
    // ...but the message is clearly about exercises, so the domain guard wins.
    const r = await handle({ ...INPUTS, message: 'give me two morning exercises' });
    expect(mockOffTopicReply).not.toHaveBeenCalled();
    expect(mockBuildPersonalContext).toHaveBeenCalled();
    expect(mockCallDeepSeek).toHaveBeenCalled();
    expect(r.reply).toBe('RENDERED');
  });

  it('answers app navigation deterministically from templates, not the LLM', async () => {
    mockMapToBroadIntent.mockReturnValue('app_help');
    const r = await handle({ ...INPUTS, message: 'where do I change my password' });
    expect(mockRunTemplatePipeline).toHaveBeenCalled();
    expect(mockCallDeepSeek).not.toHaveBeenCalled();
    // No LLM quota should be spent on a deterministic nav answer.
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    expect(r.reply).toBe('TEMPLATE');
  });

  it('falls back to templates with a notice when the daily quota is spent', async () => {
    mockCheckAndIncrement.mockResolvedValue({
      allowed: false,
      countAfter: 50,
      date: '2026-05-19',
    });
    const r = await handle(INPUTS);
    expect(r.reply).toContain('TEMPLATE');
    expect(r.reply).toMatch(/coaching limit/i);
    expect(mockCallDeepSeek).not.toHaveBeenCalled();
    expect(mockRunTemplatePipeline).toHaveBeenCalled();
    // Perf: a quota-exceeded turn must NOT pay for memory/knowledge retrieval —
    // the quota gate runs before those reads now.
    expect(mockLoadMemory).not.toHaveBeenCalled();
    expect(mockRetrieveKnowledge).not.toHaveBeenCalled();
    expect(mockRetrieveExerciseDocs).not.toHaveBeenCalled();
  });
});

describe('handle — Gemini paths', () => {
  it('falls back to templates when Gemini fails', async () => {
    mockCallDeepSeek.mockRejectedValue(new MockDeepSeekError('down'));
    const r = await handle(INPUTS);
    expect(r.reply).toBe('TEMPLATE');
    expect(mockRunTemplatePipeline).toHaveBeenCalled();
  });

  it('falls back when the response fails validation', async () => {
    mockParseAndValidate.mockReturnValue(null);
    const r = await handle(INPUTS);
    expect(r.reply).toBe('TEMPLATE');
  });

  it('returns the validated, rendered answer on the happy path', async () => {
    const r = await handle(INPUTS);
    expect(r.reply).toBe('RENDERED');
    expect(r.intent).toBe('general_chat');
    expect(r.confidence).toBe(0.8);
    expect(r.steps).toEqual(['brace', 'descend']);
    expect(r.suggestedActions).toEqual(['Open workout']);
    expect(mockUpdateMemory).toHaveBeenCalled();
    expect(mockAppendMessage).toHaveBeenCalledTimes(2); // user + assistant
  });

  it('retrieves exercise docs for an exercise-shaped message even on a non-exercise intent', async () => {
    mockMapToBroadIntent.mockReturnValue('general_chat'); // not in EXERCISE_INTENTS
    await handle({ ...INPUTS, message: 'give me two morning exercises' });
    expect(mockRetrieveExerciseDocs).toHaveBeenCalled();
  });

  it('skips exercise-doc retrieval for non-exercise messages', async () => {
    mockMapToBroadIntent.mockReturnValue('general_chat');
    await handle({ ...INPUTS, message: 'how much protein should I eat' });
    expect(mockRetrieveExerciseDocs).not.toHaveBeenCalled();
  });
});
