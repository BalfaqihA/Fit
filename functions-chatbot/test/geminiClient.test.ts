// Controllable stand-ins for the Gemini SDK + secret param. `mockGenerate` is
// reconfigured per test; the client is module-cached after first use, which is
// fine because we only ever vary generateContent's behaviour.
const mockGenerate = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerate }),
  })),
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'test-key' }),
}));

import { callGemini, GeminiFailureError } from '../src/chatbot/geminiClient';

const REQ = { systemInstruction: 'sys', userPrompt: 'hi' };
const ok = (text: string) => ({ response: { text: () => text } });

beforeEach(() => {
  mockGenerate.mockReset();
});

describe('callGemini', () => {
  it('returns the raw text on success', async () => {
    mockGenerate.mockResolvedValueOnce(ok('{"answer":"hi"}'));
    await expect(callGemini(REQ)).resolves.toBe('{"answer":"hi"}');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('throws GeminiFailureError when the model returns empty text', async () => {
    mockGenerate.mockResolvedValueOnce(ok('   '));
    await expect(callGemini(REQ)).rejects.toBeInstanceOf(GeminiFailureError);
  });

  it('retries once on a transient 503 then succeeds', async () => {
    mockGenerate
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce(ok('{"answer":"recovered"}'));
    await expect(callGemini(REQ)).resolves.toBe('{"answer":"recovered"}');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('fails after retry when the transient error persists', async () => {
    mockGenerate
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(callGemini(REQ)).rejects.toThrow(/after retry/i);
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a non-transient error', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('400 invalid request'));
    await expect(callGemini(REQ)).rejects.toBeInstanceOf(GeminiFailureError);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});
