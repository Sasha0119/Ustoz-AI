'use client';

import { useEffect, useState, useRef } from 'react';
import useAppStore from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import { saveProgress } from '@/lib/storage';
import { stripJson } from '@/lib/utils';
import { fireConfetti } from '@/lib/confetti';
import { ThinkingDots } from '@/components/ui/Widgets';
import type { Exercise } from '@/lib/types';

interface Props {
  lessonIdx: number;
  onComplete: (nextIdx: number | null) => void;
}

type BtnState = 'idle' | 'checking' | 'correct' | 'wrong';

export default function ExerciseBox({ lessonIdx, onComplete }: Props) {
  const {
    pathData, goal, level, user,
    exercises, setExercise, explanations, lessonStates, markLessonDone,
    addXp, addCertificate, certificates, xp, streak, showNotification,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [btnState, setBtnState] = useState<BtnState>('idle');
  const [feedback, setFeedback] = useState<{ correct: boolean; title: string; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const lessonDone    = lessonStates[String(lessonIdx)] === 'done';
  const exercise: Exercise | undefined = exercises[String(lessonIdx)];
  const explanationText = explanations[String(lessonIdx)] ?? '';

  useEffect(() => {
    setAnswer(''); setHint(''); setHintVisible(false); setFeedback(null); setBtnState('idle');
    setDone(lessonDone);
    if (lessonDone) { setLoading(false); return; }
    if (exercise)   { setHint(exercise.hint); setLoading(false); return; }

    const lesson = pathData?.lessons[lessonIdx];
    if (!lesson) return;

    if (!explanationText) { setLoading(true); return; }

    setLoading(true);
    const fetch = async () => {
      try {
        const sys = `Siz o'zbek tilida ta'lim beradigan AI o'qituvchisiz. Faqat sof JSON qaytaring.`;
        const prompt = `"${goal}" kursidan "${lesson.title}" darsi uchun BITTA amaliy mashq savoli yarat. Daraja: ${level}.

Talabaga ANA SHU tushuntirish o'qitildi:
"""
${explanationText}
"""

MUHIM QOIDALAR:
- Savol FAQAT yuqoridagi tushuntirishda ko'rsatilgan tushunchani tekshirsin
- Tushuntirishda o'tilmagan tushunchalarni SO'RMA — bu Difficulty Spike hisoblanadi
- "Dars qanday o'tdi?", "Tushundingizmi?" kabi savollar BERMA
- Mavzu turiga mos:
  * Dasturlash → tushuntirishdagi misolga o'xshash kod yoz yoki xatoni tuzat
  * Matematika → tushuntirishdagi amalga o'xshash masala yech
  * Til → tushuntirishdagi grammatika yoki so'z misolida mashq qil
  * Boshqa → tushuntirishdagi asosiy tushunchani o'z so'zlaring bilan ifodalang
- sampleAnswer da to'liq to'g'ri javob bo'lsin
- hint javobni bermasdan faqat yo'nalish ko'rsatsin

{"question":"[aniq savol — faqat tushuntirishdagi mavzuda]","hint":"[yo'nalish, javob emas]","sampleAnswer":"[to'liq to'g'ri javob]"} formatida qaytaring. Faqat o'zbek tilida.`;
        const r = await callGemini([{ role: 'user', content: prompt }], sys, 800);
        const parsed = JSON.parse(stripJson(r)) as Exercise;
        setExercise(String(lessonIdx), parsed);
        setHint(parsed.hint);
      } catch {
        const fallback: Exercise = {
          question: `"${lesson.title}" darsida o'rgangan eng muhim tushunchani o'z so'zlaringiz bilan tushuntiring va bitta misol keltiring.`,
          hint: "Darsda ko'rsatilgan asosiy ta'rif va misoldan foydalaning.",
          sampleAnswer: `"${lesson.title}" mavzusining asosiy ta'rifi va kamida bitta aniq misol bilan to'g'ri tushuntirish.`,
        };
        setExercise(String(lessonIdx), fallback);
        setHint(fallback.hint);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [lessonIdx, explanationText]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAnswer = async () => {
    const ex = exercises[String(lessonIdx)];
    if (!ex)           { showNotification('Savol hali yo\'lda... sabr qiling 🚀', 'var(--amber)'); return; }
    if (!answer.trim()) { showNotification('Biror narsa yozing — hatto bir so\'z ham boshlash uchun etarli 💬', 'var(--amber)'); return; }

    setBtnState('checking');
    try {
      const sys = `Siz o'zbek tilida ta'lim beradigan AI o'qituvchisiz. Faqat sof JSON qaytaring.`;
      const prompt = `Talabaning javobini baholang.
Savol: "${ex.question}"
Namuna javob: "${ex.sampleAnswer}"
Talaba javobi: "${answer}"

Baholash qoidalari:
- Kod masalasida mantiq to'g'ri bo'lsa, kichik sintaksis farqlari bo'lsa ham "correct":true ber.
- Noto'g'ri mantiq yoki tushunmagan bo'lsa "correct":false.
- AGAR NOTO'G'RI: to'g'ri javobni HECH QACHON ko'rsatma va yozma. Faqat qaysi qismda xato borligini tushuntir va qanday yo'nalishda o'ylash kerakligini maslahat ber — talaba o'zi topsin.
- AGAR TO'G'RI: nima yaxshi ekanligini qisqacha ayt.

{"correct":true/false,"title":"[qisqa baho]","feedback":"[to'g'ri bo'lsa: maqtov. Noto'g'ri bo'lsa: xatoni tushuntir + yo'naltiruvchi maslahat, lekin javobni berma]"} formatida qaytaring.`;
      const r = await callGemini([{ role: 'user', content: prompt }], sys, 500);
      let res: { correct: boolean; title: string; feedback: string };
      try { res = JSON.parse(stripJson(r)); }
      catch {
        showNotification('Baholashda xato — yana urinib ko\'ring 🔄', 'var(--amber)');
        setBtnState('idle');
        return;
      }

      setBtnState(res.correct ? 'correct' : 'wrong');
      setFeedback({ correct: res.correct, title: res.title, text: res.feedback });

      if (res.correct) {
        /* Confetti burst from the exercise box */
        if (boxRef.current) {
          const rect = boxRef.current.getBoundingClientRect();
          fireConfetti(rect.left + rect.width / 2, rect.top + rect.height * 0.4);
        } else {
          fireConfetti();
        }

        markLessonDone(String(lessonIdx));
        const lesson = pathData!.lessons[lessonIdx];
        addXp(lesson.xp || 100);
        setDone(true);

        const total = pathData!.lessons.length;
        const newDoneCount = Object.values({
          ...lessonStates, [String(lessonIdx)]: 'done' as const,
        }).filter(v => v === 'done').length;

        // Build the certificate list locally so the newly earned cert is
        // included in the DB save. (The destructured `certificates` from the
        // store closure is stale right after addCertificate() runs.)
        let updatedCertificates = certificates;
        if (newDoneCount === total) {
          const earnedCert = {
            id: 'CERT-' + user!.id + '-' + Date.now(),
            name: user!.name,
            course: pathData!.courseName || goal,
            level,
            date: new Date().toLocaleDateString('uz-UZ'),
            xpEarned: xp + (lesson.xp || 100),
          };
          addCertificate(earnedCert);
          updatedCertificates = [...certificates, earnedCert];
          showNotification('🎉 Kurs tugatildi! Sertifikat olindi!');
        } else {
          showNotification(`+${lesson.xp} XP qo'shildi! 🎉`);
        }

        const updatedLessonStates = { ...lessonStates, [String(lessonIdx)]: 'done' as const };
        await saveProgress(user!.id, {
          pathData: pathData!, goal, level,
          lessonStates: updatedLessonStates,
          certificates: updatedCertificates, xp: xp + (lesson.xp || 100), streak,
          exercises,
        });

        const nextIdx = lessonIdx < total - 1 ? lessonIdx + 1 : null;
        onComplete(nextIdx);
      } else {
        /* Reset button after a delay so user can retry */
        setTimeout(() => setBtnState('idle'), 2200);
      }
    } catch (e: unknown) {
      showNotification('Xato: ' + (e instanceof Error ? e.message : String(e)), 'var(--amber)');
      setBtnState('idle');
    }
  };

  /* Button label + style based on state */
  const btnLabel = {
    idle:     'Tekshirish ✓',
    checking: 'AI o\'qimoqda...',
    correct:  'To\'g\'ri! 🎉',
    wrong:    'Yaqin edi! 💪',
  }[btnState];

  const btnClass =
    btnState === 'correct' ? 'btn btn-green' :
    btnState === 'wrong'   ? 'btn btn-secondary' :
    'btn btn-primary';

  return (
    <div className="ex-box" ref={boxRef}>
      <div className="ex-label">📝 Mashq</div>

      {loading ? (
        <div className="explain-loading">
          <ThinkingDots />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>Savol yaratilmoqda...</span>
        </div>
      ) : done ? (
        <>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>Savol muvaffaqiyatli javoblangan.</div>
          <div className="feedback-box ok">
            <div className="fb-title">✅ Dars tugatilgan!</div>
          </div>
        </>
      ) : (
        <>
          <div className="ex-q">{exercise?.question}</div>

          {hintVisible && hint && (
            <div className="hint-box">💡 {hint}</div>
          )}

          <textarea
            className="input"
            rows={3}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Javobingizni bu yerga yozing..."
            disabled={btnState === 'checking' || btnState === 'correct'}
          />

          <div style={{ display: 'flex', gap: 9, marginTop: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setHintVisible(v => !v)}
              disabled={btnState === 'checking'}
            >
              {hintVisible ? 'Maslahatni yashirish' : '💡 Maslahat'}
            </button>
            <button
              className={btnClass}
              onClick={checkAnswer}
              disabled={btnState === 'checking' || btnState === 'correct'}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {btnState === 'checking' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThinkingDots />
                  {btnLabel}
                </span>
              ) : btnLabel}
            </button>
          </div>

          {feedback && (
            <div className={`feedback-box ${feedback.correct ? 'ok' : 'err'}`}>
              <div className="fb-title">
                {feedback.correct ? '✅' : '❌'} {feedback.title}
              </div>
              <div>{feedback.text}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
