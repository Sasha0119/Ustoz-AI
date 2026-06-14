'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import LessonSidebar from '@/components/lessons/LessonSidebar';
import ExplainBox from '@/components/lessons/ExplainBox';
import ExerciseBox from '@/components/lessons/ExerciseBox';
import { Spinner } from '@/components/ui/Widgets';

export default function LessonsPage() {
  const router = useRouter();
  const { user, pathData, isLoaded, lessonStates, setCurrentLesson, currentLesson, showNotification } = useAppStore();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/auth'); return; }
    if (!pathData) { router.push('/onboarding'); return; }

    // Open first incomplete lesson
    for (let i = 0; i < pathData.lessons.length; i++) {
      if (lessonStates[String(i)] !== 'done') {
        selectLesson(i);
        return;
      }
    }
    selectLesson(0);
  }, [isLoaded, user, pathData]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLocked = (idx: number) =>
    idx === 1 ? lessonStates['0'] !== 'done'
    : idx >= 2 ? lessonStates[String(idx - 1)] !== 'done'
    : false;

  const selectLesson = (idx: number) => {
    if (isLocked(idx)) { showNotification('Oldingi darsni tugating', 'var(--amber)'); return; }
    setCurrentLesson(idx);
    setActiveLesson(idx);
  };

  const handleComplete = (nextIdx: number | null) => {
    if (nextIdx !== null) setTimeout(() => selectLesson(nextIdx), 800);
  };

  if (!isLoaded || !user || !pathData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  const lesson = activeLesson !== null ? pathData.lessons[activeLesson] : null;
  const total = pathData.lessons.length;

  return (
    <div id="lesson-screen">
      <LessonSidebar onSelect={selectLesson} />

      <div className="ls-main">
        <div className="lesson-content">
          {activeLesson === null || !lesson ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text2)' }}>
              <div style={{ fontSize: 38, marginBottom: 14 }}>📚</div>
              <p>Chap paneldan dars tanlang</p>
            </div>
          ) : (
            <>
              <div className="lesson-hdr">
                <div className="lesson-num">DARS {activeLesson + 1} / {total}</div>
                <div className="lesson-title">{lesson.title}</div>
                <div className="lesson-subtitle">{lesson.subtitle}</div>
              </div>

              {lessonStates[String(activeLesson)] === 'done' ? (
                <>
                  <div className="explain-box" style={{ color: 'var(--text2)', fontSize: 13, fontStyle: 'italic' }}>
                    Bu dars muvaffaqiyatli tugatilgan ✓
                  </div>
                  <ExerciseBox key={activeLesson} lessonIdx={activeLesson} onComplete={handleComplete} />
                  {activeLesson < total - 1 ? (
                    <button
                      className="btn btn-green"
                      style={{ marginTop: 14, width: '100%' }}
                      onClick={() => selectLesson(activeLesson + 1)}
                    >
                      Keyingi darsga o&apos;tish →
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 14, color: 'var(--green)', fontWeight: 600, marginTop: 10 }}>
                      🎉 Barcha darslar tugatildi!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <ExplainBox key={`ex-${activeLesson}`} lessonIdx={activeLesson} />
                  <ExerciseBox key={`exbox-${activeLesson}`} lessonIdx={activeLesson} onComplete={handleComplete} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
