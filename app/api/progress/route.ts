import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { SavedProgress } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json(null);

    const doc = await (await clientPromise)
      .db('ustoz')
      .collection('progress')
      .findOne({ userId }, { projection: { _id: 0, userId: 0 } });

    return NextResponse.json(doc ?? null);
  } catch (err) {
    console.error('progress GET error:', err);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, ...progress }: { userId: string } & SavedProgress = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const db = (await clientPromise).db('ustoz');

    await db.collection('progress').updateOne(
      { userId },
      { $set: { userId, ...progress } },
      { upsert: true }
    );

    // Keep the leaderboard (users collection) in sync, but never overwrite
    // xp/streak with undefined if a partial save ever omits them.
    const userUpdate: Record<string, number> = {};
    if (typeof progress.xp === 'number') userUpdate.xp = progress.xp;
    if (typeof progress.streak === 'number') userUpdate.streak = progress.streak;
    if (Object.keys(userUpdate).length > 0) {
      await db.collection('users').updateOne({ id: userId }, { $set: userUpdate });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('progress POST error:', err);
    return NextResponse.json({ error: 'save failed' }, { status: 500 });
  }
}
