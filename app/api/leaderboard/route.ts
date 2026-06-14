import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Always query MongoDB at request time — without this Next.js prerenders the
// route at build time and serves a frozen (build-time) leaderboard forever.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await (await clientPromise)
      .db('ustoz')
      .collection('users')
      .find({}, { projection: { _id: 0, passHash: 0 } })
      .sort({ xp: -1, name: 1 })
      .limit(20)
      .toArray();

    return NextResponse.json(users);
  } catch (err) {
    console.error('leaderboard error:', err);
    return NextResponse.json([]);
  }
}
