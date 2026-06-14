'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import { saveProgress } from '@/lib/storage';
import { stripJson } from '@/lib/utils';
import { ThinkingDots } from '@/components/ui/Widgets';
import type { ChatMessage, PathData } from '@/lib/types';

const MAX_Q = 4;
type Step = 1 | 2 | 3 | 4;
interface DisplayMsg { role: 'ai' | 'user'; text: string }

export default function OnboardingPage() {
  const router = useRouter();
  const { user, pathData, isLoaded, xp, streak, certificates, exercises, setGoal, setLevel, setPathData, showNotification } = useAppStore();

  const [step, setStep] = useState<Step>(1);
  const [goalInput, setGoalInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [displayMsgs, setDisplayMsgs] = useState<DisplayMsg[]>([]);
  const [assessInput, setAssessInput] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [detectedLevel, setDetectedLevel] = useState('');
  const [newPathData, setNewPathData] = useState<PathData | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !user) router.push('/auth');
    if (isLoaded && user && pathData) router.push('/dashboard');
  }, [isLoaded, user, pathData, router]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [displayMsgs]);

  const handleGoalNext = async () => {
    if (!goalInput.trim()) {
      showNotification("Nima o'rganmoqchiligingizni kiriting 💬", 'var(--amber)');
      return;
    }
    setGoal(goalInput.trim());
    setStep(2);
    await startAssessment(goalInput.trim());
  };

  const startAssessment = async (goalStr: string) => {
    setIsLoading(true);
    setDisplayMsgs([]);
    setChatHistory([]);
    setQuestionCount(0);
    try {
      const sys = `Siz o'zbek tilida ta'lim beradigan AI o'qituvchisiz. Foydalanuvchi "${goalStr}" o'rganmoqchi.
Bilim darajasini aniqlash uchun BU BIRINCHI savol — eng oddiy, boshlang'ich darajada bo'lsin.
QOIDALAR:
- Savol talabaning "${goalStr}" bo'yicha bilimini HAQIQATAN tekshiradigan, aniq javobi bor savol bo'lsin (shunchaki "nima bilasiz?" emas)
- So'zning talaffuzi, yozilishi yoki ko'chirma haqida SAVOL BERMA
- Matnni ko'chirib yozishni so'rama
- "${goalStr}" mavzusiga oid oddiy tushuncha yoki qisqa amaliy savol ber
- Faqat savolning o'zini yoz, boshqa hech narsa qo'shma
- O'zbek tilida yoz`;
      const first: ChatMessage = { role: 'user', content: `Mavzu: "${goalStr}". 1-baholash savolini ber.` };
      const reply = await callGemini([first], sys, 400);
      setChatHistory([first, { role: 'assistant', content: reply }]);
      setDisplayMsgs([{ role: 'ai', text: reply }]);
    } catch (e: unknown) {
      setDisplayMsgs([{ role: 'ai', text: 'Biror narsa noto\'g\'ri ketdi — qayta urinib ko\'laylik 🔄' }]);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!assessInput.trim() || isLoading || inputDisabled) return;
    const ans = assessInput.trim();
    setAssessInput('');
    setDisplayMsgs(prev => [...prev, { role: 'user', text: ans }]);
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: ans }];
    setChatHistory(newHistory);
    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    setIsLoading(true);

    const qLevels = ['boshlang\'ich', 'o\'rta', 'yuqori', 'mutaxassis'];

    try {
      let reply: string;
      if (newCount >= MAX_Q) {
        setInputDisabled(true);
        const sys = `Siz o'zbek tilida ta'lim beradigan, adolatli va talabchan AI baholovchisiz.`;
        const evalMsg = `Foydalanuvchi "${goalInput}" mavzusi bo'yicha 4 ta savolga javob berdi. Savollar tobora qiyinlashib bordi:
1-savol — boshlang'ich daraja
2-savol — o'rta daraja
3-savol — yuqori daraja
4-savol — mutaxassis daraja

Yuqoridagi suhbatdagi HAQIQIY javoblarni diqqat bilan o'qing va baholang. E'tibor bering:
- Javob to'g'ri va mazmunli bo'ldimi, yoki "bilmayman", bo'sh, mavzudan tashqari yoki noto'g'ri bo'ldimi
- Talaba aynan qaysi qiyinlik darajasigacha ishonchli javob bera oldi

Baholashda QAT'IY bo'ling, ortiqcha saxiy bo'lmang:
- Hech qaysi yoki faqat 1-savolga (eng oson) yaxshi javob → DARAJA: Boshlang'ich
- 1-2 savolga ishonchli javob, lekin qiyinroqlarida qiynalgan → DARAJA: O'rta
- 3-4 savolga, jumladan qiyin savollarga ham to'g'ri javob → DARAJA: Yuqori
Eslatma: bo'sh yoki "bilmayman" javoblar daraja darajasini PASAYTIRADI.

BIRINCHI QATORGA FAQAT shu formatda yozing: "DARAJA: Boshlang'ich" yoki "DARAJA: O'rta" yoki "DARAJA: Yuqori".
Keyin yangi qatordan talabaga 1-2 gap bilan samimiy izoh bering — qaysi tomoni kuchli va nimaga e'tibor berishi kerak.`;
        reply = await callGemini([...newHistory, { role: 'user', content: evalMsg }], sys, 350);
        // Read the verdict from the "DARAJA:" line so prose below it can't skew detection.
        const verdict = (reply.match(/DARAJA\s*:\s*([^\n]+)/i)?.[1] ?? reply).toLowerCase();
        let lv = "O'rta";
        if (/boshlang/.test(verdict)) lv = "Boshlang'ich";
        else if (/yuqori/.test(verdict)) lv = 'Yuqori';
        setDetectedLevel(lv);
        setLevel(lv);
        setDisplayMsgs(prev => [...prev, { role: 'ai', text: reply }]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
        setTimeout(() => generatePath(goalInput, lv), 900);
      } else {
        const sys = `Siz o'zbek tilida ta'lim beradigan AI o'qituvchisiz. Foydalanuvchi "${goalInput}" o'rganmoqchi.
Bu ${newCount + 1}-savol — ${qLevels[newCount]} darajasida bo'lsin.
QOIDALAR:
- Avvalgi savollardan QIYINROQ va ${qLevels[newCount]} darajaga mos bo'lsin
- So'z yozilishi yoki talaffuzi haqida savol BERMA
- "${goalInput}" mavzusiga oid chuqurroq tushuncha yoki amaliy vazifa ber
- Faqat savolni yoz, boshqa hech narsa yozma
- O'zbek tilida yoz`;
        reply = await callGemini(newHistory, sys, 300);
        setDisplayMsgs(prev => [...prev, { role: 'ai', text: reply }]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (e: unknown) {
      setDisplayMsgs(prev => [...prev, { role: 'ai', text: 'Biror narsa noto\'g\'ri ketdi 🔄' }]);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePath = async (goalStr: string, lv: string) => {
    setStep(3);
    const lvNote =
      lv === 'Yuqori'
        ? "Talaba kuchli — asoslarni tez o'tib chuqur amaliy mavzularga o'ting, lekin hech bir pog'onani o'tkazib yubormang"
        : lv === "O'rta"
        ? "Talaba o'rtacha — asoslarni mustahkamlab, keyin murakkabga o'ting"
        : "Talaba yangi boshlovchi — eng oddiy tushunchalardan boshlab asta-sekin rivojlantiring";
    const sys = `Siz o'zbek tilida ta'lim beradigan AI o'qituvchisiz. Faqat sof JSON qaytaring, boshqa hech narsa yozmang.`;
    const prompt = `"${goalStr}" kursidan ${lv} darajadagi o'quvchi uchun 10 darslik progressiv o'quv yo'li tuzing.

MUHIM QOIDALAR:
- ${lvNote}
- Darslar MANTIQIY TARTIBDA bo'lsin: har bir dars oldingisiga tayansin
- Asosni o'rganmasdan murakkab mavzuga o'tma — hatto Yuqori daraja uchun ham progressiv tartib saqlang
- "${goalStr}" mavzusining tabiiy o'quv yo'lini kuzat
- Aniq 10 ta dars bo'lsin — "${goalStr}" ni to'liq va bosqichma-bosqich qamrab olsin

Quyidagi JSON formatida qaytaring:
{"courseName":"...","lessons":[{"title":"...","subtitle":"...","xp":100}]}
XP 50-200 oralig'ida. Faqat o'zbek tilida.`;
    let built: PathData;
    try {
      const r = await callGemini([{ role: 'user', content: prompt }], sys, 2800);
      built = JSON.parse(stripJson(r)) as PathData;
    } catch {
      built = {
        courseName: goalStr + ' asoslari',
        lessons: Array.from({ length: 10 }, (_, i) => ({
          title: `${goalStr} — ${i + 1}-dars`,
          subtitle: `Mavzu ${i + 1}`,
          xp: Math.min((i + 1) * 50, 200),
        })),
      };
    }

    // Guarantee EXACTLY 10 lessons no matter what the model returned — trim if
    // it gave more, pad with deepening/practice lessons if it gave fewer (the
    // model often ignores "10" and returns 8). Per-lesson content is generated
    // on demand later, so a padded title still gets full AI teaching when opened.
    const TARGET = 10;
    const got = Array.isArray(built.lessons) ? built.lessons : [];
    if (got.length > TARGET) {
      built.lessons = got.slice(0, TARGET);
    } else if (got.length < TARGET) {
      const pad = Array.from({ length: TARGET - got.length }, (_, k) => {
        const n = got.length + k + 1;
        return {
          title: `${goalStr} — ${n}-dars`,
          subtitle: 'Chuqurlashtirilgan amaliyot va mustahkamlash',
          xp: Math.min(60 + n * 14, 200),
        };
      });
      built.lessons = [...got, ...pad];
    }

    setPathData(built);
    setNewPathData(built);
    await saveProgress(user!.id, {
      pathData: built, goal: goalStr, level: lv,
      lessonStates: {}, certificates, xp, streak, exercises: {},
    });
    setStep(4);
  };

  const dotClass = (i: number) => {
    if (i < step - 1) return 'sdot done';
    if (i === step - 1) return 'sdot active';
    return 'sdot';
  };

  if (!isLoaded) return null;

  return (
    <div id="onboarding">
      <div className="ob-card">
        {/* Step indicators */}
        <div className="step-dots" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4}>
          {[0, 1, 2, 3].map(i => <div key={i} className={dotClass(i)} />)}
        </div>

        {/* Step 1 — Goal */}
        {step === 1 && (
          <div className="slide-up">
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, letterSpacing: '-.02em' }}>
              Salom, {user?.name}! 👋
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24, lineHeight: 1.65 }}>
              Keling, o&apos;quv yo&apos;lingizni birgalikda tuzaylik.
              Maqsadingizni yozing — qolganini AI hal qiladi.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="goal-input">
                Nima o&apos;rganmoqchisiz?
              </label>
              <textarea
                id="goal-input"
                className="input"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="Masalan: Python dasturlash, ingliz tili, matematika..."
                rows={3}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
              onClick={handleGoalNext}
            >
              Davom etish →
            </button>
          </div>
        )}

        {/* Step 2 — Assessment */}
        {step === 2 && (
          <div className="slide-up">
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, letterSpacing: '-.02em' }}>
              Daraja baholash 📊
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
              AI {MAX_Q} ta savol beradi — javoblaringizga qarab sizga mos o&apos;quv yo&apos;li tuziladi.
            </p>

            {/* Progress bar for question count */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 4, flex: 1, borderRadius: 2,
                  background: i < questionCount ? 'var(--violet)' : 'var(--bg3)',
                  transition: 'background .4s ease',
                }} />
              ))}
            </div>

            <div className="chat-area" ref={chatRef}>
              {displayMsgs.map((m, i) => (
                <div key={i} className={`cmsg ${m.role}`}>
                  {m.role === 'ai' && <div className="ai-av">AI</div>}
                  <div className="cbubble">{m.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="cmsg ai">
                  <div className="ai-av">AI</div>
                  <div className="cbubble">
                    <ThinkingDots />
                  </div>
                </div>
              )}
            </div>

            {!inputDisabled && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" className="input" value={assessInput}
                  onChange={e => setAssessInput(e.target.value)}
                  placeholder="Javobingizni yozing..."
                  onKeyDown={e => e.key === 'Enter' && sendAnswer()}
                  disabled={isLoading}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendAnswer}
                  disabled={isLoading}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isLoading ? '...' : 'Yuborish →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Generating */}
        {step === 3 && (
          <div className="slide-up" style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <ThinkingDots />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: '-.02em' }}>
              O&apos;quv yo&apos;li yaratilmoqda...
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>
              Daraja: <strong style={{ color: 'var(--violet-l)' }}>{detectedLevel}</strong>
            </p>
          </div>
        )}

        {/* Step 4 — Path preview */}
        {step === 4 && newPathData && (
          <div className="slide-up">
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, letterSpacing: '-.02em' }}>
              Sizning o&apos;quv yo&apos;lingiz 🗺️
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 18, lineHeight: 1.6 }}>
              Daraja: <strong style={{ color: 'var(--violet-l)' }}>{detectedLevel}</strong> · {newPathData.lessons.length} ta dars · Hozirdanoq boshlash mumkin!
            </p>
            <div className="path-grid">
              {newPathData.lessons.map((l, i) => (
                <div key={i} className={`path-item${i < 2 ? ' unlocked' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="path-num">{i + 1}</div>
                  <div className="path-info">
                    <div className="path-title">{l.title}</div>
                    <div className="path-sub">{l.subtitle}</div>
                  </div>
                  <div className="path-xp">{l.xp} XP</div>
                  {i >= 2 && <span style={{ opacity: .4, fontSize: 13 }}>🔒</span>}
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
              onClick={() => router.push('/lessons')}
            >
              O&apos;qishni boshlash →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
