'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import NavBar from '@/components/ui/NavBar';
import { Spinner } from '@/components/ui/Widgets';
import type { StoredUser } from '@/lib/types';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_CLASS  = ['gold', 'silver', 'bronze'];
const PODIUM_BASE   = ['first', 'second', 'third'];
const PODIUM_H      = [80, 60, 44];

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useAppStore();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/auth'); return; }
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then((data: StoredUser[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [isLoaded, user, router]);

  /* Reorder top 3 for podium: [2nd, 1st, 3rd] */
  const top3 = users.slice(0, 3);
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : top3;
  const podiumIndices = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];

  return (
    <div className="has-nav">
      <NavBar />
      <div className="page-wrap narrow">
        <div className="screen-hdr">
          <button className="back-btn" onClick={() => router.push('/dashboard')} aria-label="Orqaga">←</button>
          <div className="screen-title">🏆 Reyting jadvali</div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>
              Birinchi bo&apos;lish uchun birinchi darsni tugatish kifoya —<br />
              <span className="empty-cta">siz hali yerdasiz?</span> 😄
            </p>
          </div>
        ) : (
          <>
            {/* Podium for top 3 */}
            {top3.length > 0 && (
              <div className="lb-podium">
                {podiumOrder.map((u, podiumIdx) => {
                  const originalIdx = podiumIndices[podiumIdx];
                  return (
                    <div key={u.id} className="podium-item">
                      <div className={`podium-av ${PODIUM_CLASS[originalIdx]}`}>
                        {(u.name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="podium-name">{u.name}</div>
                      <div className="podium-xp">⚡ {u.xp || 0}</div>
                      <div className={`podium-base ${PODIUM_BASE[originalIdx]}`} style={{ height: PODIUM_H[originalIdx] }}>
                        {PODIUM_MEDALS[originalIdx]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest of the table (rank 4+) */}
            <div className="lb-table">
              {users.slice(3).map((u, i) => (
                <div key={u.id} className={`lb-row${u.id === user?.id ? ' me' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="lb-rank">{i + 4}</div>
                  <div className="lb-av">{(u.name?.[0] ?? '?').toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div className="lb-name">
                      {u.name}
                      {u.isAdmin && <span className="admin-badge">ADMIN</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{u.id}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lb-xp">⚡ {u.xp || 0} XP</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>🔥 {u.streak || 1}</div>
                  </div>
                </div>
              ))}

              {/* Highlight current user if not in table */}
              {user && !users.find(u => u.id === user.id) && (
                <div className="lb-row me" style={{ marginTop: 10 }}>
                  <div className="lb-rank">—</div>
                  <div className="lb-av">{(user.name?.[0] ?? '?').toUpperCase()}</div>
                  <div className="lb-name">{user.name} (siz)</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
