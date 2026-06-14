'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import NavBar from '@/components/ui/NavBar';
import { Spinner } from '@/components/ui/Widgets';
import type { StoredUser } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoaded } = useAppStore();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/auth'); return; }
    if (!user.isAdmin) { router.push('/dashboard'); return; }
    fetch('/api/users')
      .then(res => res.json())
      .then((data: StoredUser[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [isLoaded, user, router]);

  return (
    <div className="has-nav">
      <NavBar />
      <div className="page-wrap wide">
        <div className="screen-hdr">
          <div className="back-btn" onClick={() => router.push('/dashboard')}>←</div>
          <div className="screen-title">⚙ Admin Panel</div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th><th>Ism</th><th>Rol</th><th>XP</th><th>Streak</th><th>Qo&apos;shilgan sana</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>
                      {u.isAdmin
                        ? <span className="admin-badge">ADMIN</span>
                        : <span style={{ color: 'var(--text2)', fontSize: 11 }}>Foydalanuvchi</span>}
                    </td>
                    <td style={{ color: 'var(--amber)' }}>⚡ {u.xp || 0}</td>
                    <td>🔥 {u.streak || 1}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 11 }}>
                      {new Date(u.joined).toLocaleDateString('uz-UZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
