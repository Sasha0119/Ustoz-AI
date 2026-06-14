'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import { Spinner } from '@/components/ui/Widgets';

export default function LandingPage() {
  const router = useRouter();
  const { user, pathData, isLoaded } = useAppStore();

  useEffect(() => {
    if (!isLoaded) return;
    if (user) router.push(pathData ? '/dashboard' : '/onboarding');
  }, [isLoaded, user, pathData, router]);

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 14 }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div id="landing">
      {/* Floating background orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      {/* Hero */}
      <div className="logo" style={{ position: 'relative', zIndex: 1 }}>✦ Ustoz AI</div>

      <h1 className="tagline" style={{ position: 'relative', zIndex: 1 }}>
        O&apos;zbek tilida <span>AI</span> bilan o&apos;qing
      </h1>

      <p className="subtitle" style={{ position: 'relative', zIndex: 1 }}>
        Sun&apos;iy intellekt yordamida shaxsiylashtirilgan o&apos;quv yo&apos;li.
        O&apos;z sur&apos;atingizda, o&apos;z tilingizda. Mutlaqo bepul.
      </p>

      {/* CTA buttons */}
      <div className="land-btns" style={{ position: 'relative', zIndex: 1 }}>
        <button
          className="btn btn-primary"
          style={{ fontSize: 15, padding: '14px 32px' }}
          onClick={() => router.push('/auth?mode=signup')}
        >
          Sayohat boshlaylik ✦
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 15, padding: '14px 32px' }}
          onClick={() => router.push('/auth')}
        >
          Qaytib keldingiz 👋
        </button>
      </div>

      {/* Feature chips */}
      <div className="chip-row" style={{ position: 'relative', zIndex: 1 }}>
        <div className="chip">🎯 AI-powered</div>
        <div className="chip">🏆 Gamified</div>
        <div className="chip">🇺🇿 O&apos;zbek tilida</div>
<div className="chip">
  ⚡ <span style={{ fontSize: '1.4em', verticalAlign: 'middle', lineHeight: '1' }}>∞</span> ta dars
</div>      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ position: 'relative', zIndex: 1 }}>
        <div className="stat-card">
          <div className="stat-val">∞</div>
          <div className="stat-lbl">Mavzular</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">O&apos;zbek</div>
          <div className="stat-lbl">Til</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">Bepul</div>
          <div className="stat-lbl">Narx</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">24/7</div>
          <div className="stat-lbl">Mavjud</div>
        </div>
      </div>
    </div>
  );
}
