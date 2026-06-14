import type { SavedProgress } from './types';

export async function loadProgress(userId: string): Promise<SavedProgress | null> {
  try {
    const res = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveProgress(userId: string, data: SavedProgress): Promise<void> {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data }),
  });
}

