import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { simpleHash } from '@/lib/utils';
import type { StoredUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Escape regex metacharacters so names like "a.b", "(x)" or "[" can't break
// or hijack the case-insensitive lookup (a raw "[" would throw a 500).
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(req: NextRequest) {
  try {
    const { action, name, passHash } = await req.json() as {
      action: 'login' | 'signup';
      name: string;
      passHash: string;
    };

    if (!name || !passHash) {
      return NextResponse.json({ error: 'Ism va parol kerak' }, { status: 400 });
    }

    const col = (await clientPromise).db('ustoz').collection<StoredUser>('users');
    const nameQuery = { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } };

    if (action === 'signup') {
      const existing = await col.findOne(nameQuery);
      if (existing) {
        return NextResponse.json(
          { error: "Bu ism allaqachon band — boshqasini sinab ko'ring" },
          { status: 409 }
        );
      }

      const count = await col.countDocuments();
      const isAdmin = passHash === simpleHash('sasha01') && name.toLowerCase() === 'sasha';
      const id = isAdmin ? 'ADM001' : 'USR' + String(count + 1).padStart(3, '0');

      const newUser: StoredUser = {
        id, name,
        passHash,
        isAdmin,
        xp: 0,
        streak: 1,
        joined: new Date().toISOString(),
      };
      await col.insertOne(newUser);
      return NextResponse.json({ id, name, isAdmin });
    }

    if (action === 'login') {
      const found = await col.findOne(nameQuery);
      if (!found) {
        return NextResponse.json(
          { error: "Foydalanuvchi topilmadi — ism to'g'rimi?" },
          { status: 404 }
        );
      }
      if (found.passHash !== passHash) {
        return NextResponse.json(
          { error: "Parol noto'g'ri — yana urinib ko'ring 🔐" },
          { status: 401 }
        );
      }
      return NextResponse.json({ id: found.id, name: found.name, isAdmin: found.isAdmin });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('auth error:', err);
    return NextResponse.json(
      { error: "Server bilan bog'lanishda xato — keyinroq urinib ko'ring" },
      { status: 500 }
    );
  }
}
