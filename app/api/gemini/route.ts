import { NextRequest, NextResponse } from 'next/server';
import type { ChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
// Vercel kills functions at 10s by default. Fallback providers (Gemini/OpenRouter)
// can take ~15s for a full lesson, and the chain may try more than one — so raise
// the limit. 60s is the max on Vercel's Hobby (free) plan.
export const maxDuration = 60;

// Per-provider request timeout: if one provider hangs, abort and try the next
// instead of burning the whole function budget on a single slow call.
const PROVIDER_TIMEOUT_MS = 28000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

/* ───────────────────────────────────────────────────────────────
   Multi-provider AI failover.

   All AI features funnel through this route. It tries a chain of
   keys/providers in order and returns the first success:
     1. Groq  (GROQ_API_KEY, GROQ_API_KEY_2 … GROQ_API_KEY_10)
     2. Gemini (GEMINI_API_KEY)
     3. OpenRouter (OPENROUTER_API_KEY)
   A provider with no key configured is simply skipped, so the chain
   works with any subset of keys. Response shape stays { text } so the
   client (lib/gemini.ts) and all callers are unchanged.
   ─────────────────────────────────────────────────────────────── */

// OpenAI-compatible endpoints (Groq + OpenRouter share the same body shape)
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Free model on OpenRouter — swap if their free lineup changes / gets congested.
// (llama-3.3-70b:free and qwen3:free were returning upstream 429s; gemma-4 was free + responsive.)
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
// Gemini uses a different request/response shape (handled separately).
// 2.5-flash is on the free tier; 2.0-flash/1.5-flash returned 429/404 on this key.
const GEMINI_MODEL = 'gemini-2.5-flash';

// Best-effort cooldown: when a key returns 429 (rate-limited), skip it for a
// few minutes on later requests handled by the same warm instance. Resets on
// cold start — purely an optimization to avoid re-hitting a dead key.
const COOLDOWN_MS = 3 * 60 * 1000;
const cooldownUntil = new Map<string, number>();

interface AiParams {
  key: string;
  messages: ChatMessage[];
  system?: string;
  maxTokens: number;
}
interface AiResult {
  ok: boolean;
  text?: string;
  status?: number;
  error?: string;
}

// ── OpenAI-compatible providers: Groq & OpenRouter ──
async function callOpenAICompatible(
  url: string,
  model: string,
  extraHeaders: Record<string, string>,
  { key, messages, system, maxTokens }: AiParams
): Promise<AiResult> {
  const msgs: { role: string; content: string }[] = [];
  if (system) msgs.push({ role: 'system', content: system });
  for (const m of messages) msgs.push({ role: m.role, content: m.content });

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({ model, messages: msgs, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: res.status,
      error: (err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return { ok: false, status: 502, error: 'Empty response' };
  return { ok: true, text };
}

// ── Google Gemini (distinct request/response shape) ──
async function callGeminiProvider({ key, messages, system, maxTokens }: AiParams): Promise<AiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    // thinkingBudget:0 disables 2.5-flash's internal reasoning — otherwise a
    // small maxOutputTokens is fully consumed by thinking and returns no text.
    generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: res.status,
      error: (err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, status: 502, error: 'Empty response' };
  return { ok: true, text };
}

interface Attempt {
  provider: string;
  key: string;
  run: (p: AiParams) => Promise<AiResult>;
}

// Build the ordered failover chain from whatever keys are configured.
function buildChain(): Attempt[] {
  const chain: Attempt[] = [];

  // Groq: GROQ_API_KEY, then GROQ_API_KEY_2 … _10
  for (let i = 1; i <= 10; i++) {
    const key = process.env[i === 1 ? 'GROQ_API_KEY' : `GROQ_API_KEY_${i}`];
    if (key) {
      chain.push({
        provider: `groq#${i}`,
        key,
        run: (p) => callOpenAICompatible(GROQ_URL, GROQ_MODEL, {}, p),
      });
    }
  }

  // Gemini
  if (process.env.GEMINI_API_KEY) {
    chain.push({ provider: 'gemini', key: process.env.GEMINI_API_KEY, run: callGeminiProvider });
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    chain.push({
      provider: 'openrouter',
      key: process.env.OPENROUTER_API_KEY,
      run: (p) =>
        callOpenAICompatible(
          OPENROUTER_URL,
          OPENROUTER_MODEL,
          { 'HTTP-Referer': 'https://ustoz-ai.vercel.app', 'X-Title': 'Ustoz AI' },
          p
        ),
    });
  }

  return chain;
}

export async function POST(req: NextRequest) {
  const chain = buildChain();
  if (chain.length === 0) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  let body: { messages: ChatMessage[]; system?: string; maxTokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { messages, system, maxTokens = 10000 } = body;

  // Prefer keys not on cooldown; if every key is cooling down, try them all anyway.
  const now = Date.now();
  const fresh = chain.filter((a) => (cooldownUntil.get(a.key) ?? 0) <= now);
  const order = fresh.length > 0 ? fresh : chain;

  let lastError = 'All providers failed';
  let lastStatus = 502;

  for (const attempt of order) {
    try {
      const result = await attempt.run({ key: attempt.key, messages, system, maxTokens });
      if (result.ok && result.text) {
        cooldownUntil.delete(attempt.key); // healthy again
        return NextResponse.json({ text: result.text, provider: attempt.provider });
      }
      lastError = result.error || lastError;
      lastStatus = result.status || lastStatus;
      console.warn(`[ai] ${attempt.provider} failed (${result.status}): ${result.error}`);
      // Rate-limited → park this key for a while so we don't keep hammering it.
      if (result.status === 429) cooldownUntil.set(attempt.key, Date.now() + COOLDOWN_MS);
    } catch (err) {
      // Network/parse failure — record and fall through to the next provider.
      lastError = String(err);
      console.warn(`[ai] ${attempt.provider} threw: ${err}`);
    }
  }

  return NextResponse.json({ error: lastError }, { status: lastStatus });
}
