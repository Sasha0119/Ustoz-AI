import { NextRequest, NextResponse } from 'next/server';
import type { ChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(req: NextRequest) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }
  try {
    const { messages, system, maxTokens = 10000 } = await req.json() as {
      messages: ChatMessage[];
      system?: string;
      maxTokens?: number;
    };

    const groqMessages: { role: string; content: string }[] = [];

    if (system) {
      groqMessages.push({ role: 'system', content: system });
    }

    for (const m of messages) {
      groqMessages.push({ role: m.role, content: m.content });
    }

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: { message?: string } }).error?.message || 'Groq API error' },
        { status: res.status }
      );
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    if (!data.choices?.length) throw new Error('Empty response from Groq');
    const text = data.choices[0].message.content;
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
