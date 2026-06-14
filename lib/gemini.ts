import type { ChatMessage } from './types';

export async function callGemini(
  messages: ChatMessage[],
  system?: string,
  maxTokens = 10000
): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API xatosi: ' + res.status);
  }

  const data = await res.json();
  return data.text as string;
}
