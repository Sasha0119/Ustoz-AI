'use client';

import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';

interface Props {
  onSelect: (idx: number) => void;
}

export default function LessonSidebar({ onSelect }: Props) {
  const router = useRouter();
  const { pathData, lessonStates, currentLesson, xp, streak } = useAppStore();

  if (!pathData) return null;

  const isLocked = (idx: number) =>
    idx === 1 ? lessonStates['0'] !== 'done'
    : idx >= 2 ? lessonStates[String(idx - 1)] !== 'done'
    : false;

  return (
    <div className="ls-sidebar">
      <div className="ls-hdr">
        <div className="ls-hdr-title">Kursim</div>
        <div className="ls-stats">
          <div className="ls-stat">
            <div className="ls-stat-val">{xp}</div>
            <div className="ls-stat-lbl">XP</div>
          </div>
          <div className="ls-stat">
            <div className="ls-stat-val">{streak}</div>
            <div className="ls-stat-lbl">Streak 🔥</div>
          </div>
        </div>
      </div>

      <div className="lesson-list">
        {pathData.lessons.map((l, i) => {
          const done = lessonStates[String(i)] === 'done';
          const locked = isLocked(i);
          const active = currentLesson === i;
          return (
            <div
              key={i}
              className={`l-item${done ? ' done' : ''}${locked ? ' locked' : ''}${active ? ' active' : ''}`}
              onClick={() => !locked && onSelect(i)}
            >
              <div className="l-icon">{done ? '✓' : i + 1}</div>
              <div className="l-info">
                <div className="l-name">{l.title}</div>
                <div className="l-sub">{l.xp} XP</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-secondary" style={{ width: '100%', fontSize: 11 }} onClick={() => router.push('/dashboard')}>
          ← Dashboard
        </button>
      </div>
    </div>
  );
}
