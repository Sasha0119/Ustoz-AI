'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import { saveProgress } from '@/lib/storage';
import NavBar from '@/components/ui/NavBar';
import { Spinner } from '@/components/ui/Widgets';

function getRank(xp: number) {
  if (xp >= 7000) return { label: '👑 Ustoz', color: '#F59E0B' };
  if (xp >= 3500) return { label: '💎 Mutaxassis', color: '#0EA5E9' };
  if (xp >= 1500) return { label: '🔥 Ilg\'or', color: '#F43F5E' };
  if (xp >= 500)  return { label: '⚡ Izlanuvchi', color: '#8B5CF6' };
  return { label: '🌱 Yangi boshlovchi', color: '#10B981' };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, pathData, isLoaded, xp, streak, lessonStates, certificates, level, goal, exercises } = useAppStore();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.push('/auth');
    else if (!pathData) router.push('/onboarding');
  }, [isLoaded, user, pathData, router]);

  if (!isLoaded || !user || !pathData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <Spinner />
      </div>
    );
  }

  const done  = Object.values(lessonStates).filter(v => v === 'done').length;
  const total = pathData.lessons.length;
  const pct   = Math.round((done / total) * 100);
  const rank  = getRank(xp);

  const nextXpThreshold = xp >= 7000 ? 7000
    : xp >= 3500 ? 7000
    : xp >= 1500 ? 3500
    : xp >= 500  ? 1500
    : 500;
  const prevXpThreshold = xp >= 7000 ? 3500
    : xp >= 3500 ? 3500
    : xp >= 1500 ? 1500
    : xp >= 500  ? 500
    : 0;
  const rankPct = Math.round(((xp - prevXpThreshold) / (nextXpThreshold - prevXpThreshold)) * 100);

  const startNewCourse = async () => {
    if (!confirm("Yangi kurs boshlamoqchimisiz? XP va sertifikatlar saqlanadi, faqat kurs yo'li yangilanadi.")) return;
    const { resetCourse } = useAppStore.getState();
    resetCourse();
    await saveProgress(user.id, {
      pathData: null, goal: '', level: '',
      lessonStates: {}, certificates, xp, streak, exercises: {},
    });
    router.push('/onboarding');
  };

  return (
    <div className="has-nav">
      <NavBar />
      <div className="page-wrap wide">

        {/* Greeting */}
        <div className="dash-hdr slide-up">
          <div>
            <div className="dash-greeting">
              Xush kelibsiz, {user.name}! 👋
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span className="rank-badge" style={{ color: rank.color, borderColor: rank.color + '40' }}>
                {rank.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>ID: {user.id}</span>
            </div>
          </div>
        </div>

        {/* Rank progress bar */}
        {xp < 7000 && (
          <div style={{ marginBottom: 28, animation: 'slideUp .4s .1s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <span>Keyingi daraja: {rankPct}%</span>
              <span>{xp} / {nextXpThreshold} XP</span>
            </div>
            <div className="prog-bar" style={{ height: 5 }}>
              <div className="prog-fill" style={{ width: `${rankPct}%` }} />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card2" style={{ animationDelay: '0ms' }}>
            <span className="stat-icon">⚡</span>
            <div className="stat-val">{xp}</div>
            <div className="stat-lbl">Umumiy XP</div>
          </div>
          <div className="stat-card2" style={{ animationDelay: '60ms' }}>
            <span className="stat-icon">
              <span className={streak > 0 ? 'streak-flame' : ''} style={{ fontSize: streak >= 7 ? 26 : 22 }}>
                🔥
              </span>
            </span>
            <div className="stat-val">{streak}</div>
            <div className="stat-lbl">Streak kunlar</div>
          </div>
          <div className="stat-card2" style={{ animationDelay: '120ms' }}>
            <span className="stat-icon">📚</span>
            <div className="stat-val">{done}/{total}</div>
            <div className="stat-lbl">Tugatilgan darslar</div>
          </div>
          <div className="stat-card2" style={{ animationDelay: '180ms' }}>
            <span className="stat-icon">🎓</span>
            <div className="stat-val">{certificates.length}</div>
            <div className="stat-lbl">Sertifikatlar</div>
          </div>
        </div>

        {/* Course card */}
        <div className="course-card fade-in" style={{ animationDelay: '200ms' }}>
          <div className="prog-lbl">
            <span style={{ fontWeight: 700, fontSize: 15 }}>{pathData.courseName || goal}</span>
            <span style={{
              fontWeight: 800, fontSize: 14,
              color: pct === 100 ? 'var(--emerald)' : 'var(--violet-l)',
            }}>
              {pct === 100 ? '🎉 Tugatildi!' : `${pct}%`}
            </span>
          </div>
          <div className="prog-bar" style={{ marginBottom: 12 }}>
            <div className="prog-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
            <span>Daraja: <strong style={{ color: 'var(--text)' }}>{level}</strong></span>
            <span>{done} / {total} dars bajarildi</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="action-btns fade-in" style={{ animationDelay: '250ms' }}>
          <button className="btn btn-primary" onClick={() => router.push('/lessons')}>
            ▶ Kursni davom ettirish
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/leaderboard')}>
            🏆 Reyting
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/certificates')}>
            🎓 Sertifikatlar
          </button>
          <button className="btn btn-secondary" onClick={startNewCourse}>
            ＋ Yangi kurs
          </button>
          {user.isAdmin && (
            <button className="btn btn-secondary" onClick={() => router.push('/admin')}>
              ⚙ Admin panel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
