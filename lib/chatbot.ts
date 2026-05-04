import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

export type ChatRequest = {
  message: string;
  previousIntent?: string;
};

export type ChatResponse = {
  reply: string;
  intent: string;
  confidence: number;
};

const chatFn = httpsCallable<ChatRequest, ChatResponse>(functions, 'chat');

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await chatFn(req);
  return res.data;
}
