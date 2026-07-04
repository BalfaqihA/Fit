// Controllable stand-ins for global fetch + the secret param. `mockFetch` is
// reconfigured per test; the DeepSeek client reads `fetch` at call time, so
// assigning it here (before import) is sufficient.
const mockFetch = jest.fn();
(global as unknown as { fetch: jest.Mock }).fetch = mockFetch;

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'test-key' }),
}));

import { callDeepSeek, DeepSeekError } from '../src/chatbot/deepseekClient';

const REQ = { systemInstruction: 'sys', userPrompt: 'hi' };

// OpenAI-compatible success body: choices[0].message.content holds the reply.
const ok = (content: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => content,
});

const httpError = (status: number) => ({
  ok: false,
  status,
  statusText: 'Error',
  text: async () => '',
  json: async () => ({}),
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe('callDeepSeek', () => {
  it('returns the raw content on success', async () => {
    mockFetch.mockResolvedValueOnce(ok('{"answer":"hi"}'));
    await expect(callDeepSeek(REQ)).resolves.toBe('{"answer":"hi"}');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws DeepSeekError when the model returns empty content', async () => {
    mockFetch.mockResolvedValueOnce(ok('   '));
    await expect(callDeepSeek(REQ)).rejects.toBeInstanceOf(DeepSeekError);
  });

  it('retries once on a transient 503 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(httpError(503))
      .mockResolvedValueOnce(ok('{"answer":"recovered"}'));
    await expect(callDeepSeek(REQ)).resolves.toBe('{"answer":"recovered"}');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails after retry when a transient network error persists', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(callDeepSeek(REQ)).rejects.toThrow(/after retry/i);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a non-transient 400', async () => {
    mockFetch.mockResolvedValueOnce(httpError(400));
    await expect(callDeepSeek(REQ)).rejects.toBeInstanceOf(DeepSeekError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
