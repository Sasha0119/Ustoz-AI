'use client';

import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';

function getRank(xp: number): string {
  if (xp >= 7000) return '👑 Ustoz';
  if (xp >= 3500) return '💎 Mutaxassis';
  if (xp >= 1500) return '🔥 Ilg\'or';
  if (xp >= 500)  return '⚡ Izlanuvchi';
  return '🌱 Yangi';
}

export default function NavBar() {
  const router = useRouter();
  const { user, xp, streak, setUser, resetProgress } = useAppStore();

  const logout = () => {
    localStorage.removeItem('ustoz-session');
    setUser(null);
    resetProgress();
    router.push('/');
  };

  return (
    <div className="top-nav">
      <div className="nav-logo">✦ Ustoz AI</div>

      <div className="nav-right">
        {/* XP pill */}
        <div className="nav-xp">⚡ {xp} XP</div>

        {/* Streak */}
        {streak > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span className="streak-flame"
              style={{ fontSize: streak >= 7 ? 17 : 14 }}>
              🔥
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{streak}</span>
          </div>
        )}

        {/* Rank badge */}
        <div className="rank-badge">{getRank(xp)}</div>

        {/* Avatar + name */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="nav-avatar">{(user.name?.[0] ?? '?').toUpperCase()}</div>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
              {user.name}
            </span>
          </div>
        )}

        <button
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={logout}
        >
          Ko&apos;rishguncha 👋
        </button>
      </div>
    </div>
  );
}
