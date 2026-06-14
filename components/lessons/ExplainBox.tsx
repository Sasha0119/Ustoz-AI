'use client';

import { useEffect, useState } from 'react';
import useAppStore from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import { renderCode, escapeHtml } from '@/lib/utils';
import { ThinkingDots } from '@/components/ui/Widgets';

interface Props { lessonIdx: number }

export default function ExplainBox({ lessonIdx }: Props) {
  const { pathData, goal, level, setExplanation } = useAppStore();
  const [text, setText] = useState('');
  const [example, setExample] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setText(''); setExample(''); setError(''); setLoading(true);
    const lesson = pathData?.lessons[lessonIdx];
    if (!lesson) {
      setLoading(false);
      setError('Dars topilmadi');
      return;
    }

    const fetch = async () => {
      try {
        const sys = `Siz o'zbek tilida bevosita TALABAGA dars beradigan tajribali, sabrli AI o'qituvchisiz.
Maqsadingiz — talaba darsdan keyin mavzuni MUSTAQIL bajara olishi. Shunchaki ta'rif berishning o'zi KIFOYA EMAS.

QOIDALAR:
- "Siz" deb to'g'ridan-to'g'ri talabaga, samimiy va tushunarli tilda murojaat qiling
- Har bir tushunchani "bu nima" VA undan ham muhimi "buni QANDAY bajarish kerak" — aniq qadamlar bilan o'rgating
- Agar dars bir nechta tushuncha yoki amalni qamrasa (masalan: qo'shish, ayirish, ko'paytirish, bo'lish), ULARNING HAMMASINI tushuntiring va HAR BIRI uchun alohida misol bering — birortasini ham tashlab ketmang
- Misolda faqat tayyor javobni yozmang — javobga QANDAY kelinganini qadam-baqadam ko'rsating
- So'zlarning talaffuzi yoki transkripsiyasini bermang
- Faqat shu dars mavzusida qoling — keyingi darslar mavzusiga o'tmang
- Dasturlash mavzusi bo'lsa kod misolini \`\`\` belgilar ichida yozing. Matematika, til yoki boshqa fanlarda oddiy matndan foydalaning`;
        const prompt = `"${goal}" kursidan "${lesson.title}" darsini talabaga to'liq o'rgating.
Dars mavzusi: "${lesson.subtitle}". Talaba darajasi: ${level} — tushuntirish chuqurligi va misollar murakkabligini shu darajaga moslang (Boshlang'ich uchun juda sodda va batafsil; Yuqori uchun ixcham, lekin chuqurroq).

ANIQ shu formatda yozing:

TUSHUNTIRISH:
[Darsda o'rgatiladigan HAR BIR tushunchani batafsil yozing. Avval qisqa ta'rif, keyin uni QANDAY bajarishni qadamlar bilan tushuntiring. Bir nechta amal yoki tushuncha bo'lsa, har birini alohida xatboshida bayon qiling. Talaba o'qib bo'lgach mavzuni o'zi mustaqil ishlay olishi kerak.]

MISOL:
[Darsda o'rgatilgan HAR BIR tushuncha yoki amal uchun ALOHIDA ishlangan misol bering. Har bir misolda yechimni qadam-baqadam yozing, faqat oxirgi natijani emas. Masalan dars to'rtta amalni o'rgatsa — to'rtta misol bo'lishi shart, har biri to'liq yechimi bilan. Har bir misolni yangi qatordan boshlang.]`;
        const r = await callGemini([{ role: 'user', content: prompt }], sys, 2500);
        const exMatch = r.match(/MISOL\w*\s*:\s*([\s\S]+)/i);
        const txMatch = r.match(/TUSHUNTIRISH\s*:\s*([\s\S]+?)(?=MISOL\w*\s*:|$)/i);
        const explanationText = txMatch ? txMatch[1].trim() : r.replace(/MISOL:[\s\S]*/i, '').trim();
        setText(explanationText);
        setExample(exMatch ? exMatch[1].trim() : '');
        setExplanation(String(lessonIdx), explanationText);
      } catch (e: unknown) {
        setError('Tushuntirish yuklanmadi — tarmoqni tekshiring 🔄');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [lessonIdx, pathData, goal, level]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="explain-box">
      {loading && (
        <div className="explain-loading">
          <ThinkingDots />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            AI o&apos;qituvchi tayyorlanmoqda...
          </span>
        </div>
      )}
      {error && (
        <div style={{ color: 'var(--coral)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && (
        <>
          <div className="explain-text">{text}</div>
          {example && (
            <div
              style={{ marginTop: 16 }}
              dangerouslySetInnerHTML={{
                __html: example.includes('```')
                  ? renderCode(example)
                  : `<div style="margin-top:14px;padding:14px 16px;background:var(--bg3);border-left:3px solid var(--violet);border-radius:0 10px 10px 0;font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:var(--text2)">${escapeHtml(example)}</div>`,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
