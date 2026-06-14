'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useAppStore from '@/lib/store';
import { loadProgress } from '@/lib/storage';
import { simpleHash } from '@/lib/utils';

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<'login' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { setUser, loadProgress: hydrateStore, isLoaded, user } = useAppStore();

  useEffect(() => {
    if (isLoaded && user) router.push('/dashboard');
  }, [isLoaded, user, router]);

  const doSignup = async () => {
    setError('');
    if (!name.trim() || !pass.trim()) { setError('Ism va parol kiriting'); return; }
    if (name.trim().length < 2) { setError("Ism kamida 2 ta belgi bo'lishi kerak"); return; }
    if (pass.trim().length < 4) { setError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', name: name.trim(), passHash: simpleHash(pass.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      const sessionUser = { id: data.id, name: data.name, isAdmin: data.isAdmin };
      localStorage.setItem('ustoz-session', JSON.stringify(sessionUser));
      setUser(sessionUser);
      router.push('/onboarding');
    } finally {
      setBusy(false);
    }
  };

  const doLogin = async () => {
    setError('');
    if (!name.trim() || !pass.trim()) { setError('Ism va parol kiriting'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', name: name.trim(), passHash: simpleHash(pass.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      const sessionUser = { id: data.id, name: data.name, isAdmin: data.isAdmin };
      localStorage.setItem('ustoz-session', JSON.stringify(sessionUser));
      setUser(sessionUser);

      const progress = await loadProgress(data.id);
      if (progress) hydrateStore(progress);

      router.push(progress?.pathData ? '/dashboard' : '/onboarding');
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (t: 'login' | 'signup') => { setTab(t); setError(''); };

  return (
    <div id="auth">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div className="logo" style={{ fontSize: 24 }}>✦ Ustoz AI</div>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 6 }}>
            {tab === 'login' ? 'Qaytib keldingiz 👋' : 'Sayohat boshlaylik ✦'}
          </p>
        </div>

        {/* Tabs with sliding indicator */}
        <div className="auth-tabs" role="tablist">
          <div className={`auth-tab-indicator${tab === 'signup' ? ' right' : ''}`} aria-hidden="true" />
          <div
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => switchTab('login')}
          >
            Kirish
          </div>
          <div
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => switchTab('signup')}
          >
            Ro&apos;yxatdan o&apos;tish
          </div>
        </div>

        {/* Form */}
        <div className="form-group">
          <label className="form-label" htmlFor="auth-name">Ism</label>
          <input
            id="auth-name"
            type="text"
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ismingizni kiriting"
            autoComplete="username"
            disabled={busy}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="auth-pass">Parol</label>
          <input
            id="auth-pass"
            type="password"
            className="input"
            value={pass}
            onChange={e => setPass(e.target.value)}
            placeholder={tab === 'signup' ? 'Parol yarating (min 4 belgi)' : 'Parolingizni kiriting'}
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            onKeyDown={e => e.key === 'Enter' && !busy && (tab === 'login' ? doLogin() : doSignup())}
            disabled={busy}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
          onClick={tab === 'login' ? doLogin : doSignup}
          disabled={busy}
        >
          {busy
            ? 'Tekshirilmoqda...'
            : tab === 'login'
            ? 'Kirish →'
            : 'Ro\'yxatdan o\'tish →'}
        </button>

        {error && (
          <div className="auth-err" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            className="btn"
            style={{ background: 'none', color: 'var(--text3)', fontSize: 12, padding: '6px 12px' }}
            onClick={() => router.push('/')}
          >
            ← Bosh sahifa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
