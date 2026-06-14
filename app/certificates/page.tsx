'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAppStore from '@/lib/store';
import NavBar from '@/components/ui/NavBar';
import type { Certificate } from '@/lib/types';

function downloadCert(c: Certificate) {
  const html = `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><title>Sertifikat</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
body{font-family:'Plus Jakarta Sans',sans-serif;background:linear-gradient(135deg,#09090B,#18181B);display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{background:#1a1a2e;border:1px solid rgba(124,58,237,.3);border-radius:24px;padding:64px;max-width:680px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.6),0 0 0 1px rgba(124,58,237,.15);position:relative;overflow:hidden}
.c::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#7C3AED,#0EA5E9,#10B981)}
.logo{font-size:38px;font-weight:900;background:linear-gradient(135deg,#8B5CF6,#0EA5E9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
.sub{font-size:11px;color:#71717A;letter-spacing:3px;text-transform:uppercase;margin-bottom:44px}
.given{font-size:14px;color:#A1A1AA;margin-bottom:10px}
.name{font-size:40px;font-weight:900;color:#FAFAFA;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid rgba(124,58,237,.4);letter-spacing:-.02em}
.course{font-size:19px;color:#A1A1AA;margin-bottom:6px}
.level{font-size:13px;color:#8B5CF6;font-weight:700;margin-bottom:36px}
.date{font-size:13px;color:#71717A;margin-bottom:6px}
.id{font-size:11px;color:#3F3F46;font-family:monospace}
</style></head><body><div class="c">
<div class="logo">✦ Ustoz AI</div>
<div class="sub">Muvaffaqiyat sertifikati</div>
<div class="given">Ushbu sertifikat taqdim etiladi</div>
<div class="name">${c.name}</div>
<div class="course">Kurs: ${c.course}</div>
<div class="level">Daraja: ${c.level}</div>
<div class="date">Sana: ${c.date}</div>
<div class="id">${c.id}</div>
</div></body></html>`;

  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([html], { type: 'text/html' })),
    download: 'sertifikat-' + c.id + '.html',
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 100);
}

export default function CertificatesPage() {
  const router = useRouter();
  const { user, isLoaded, certificates } = useAppStore();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.push('/auth');
  }, [isLoaded, user, router]);

  return (
    <div className="has-nav">
      <NavBar />
      <div className="page-wrap narrow">
        <div className="screen-hdr">
          <button className="back-btn" onClick={() => router.push('/dashboard')} aria-label="Orqaga">←</button>
          <div className="screen-title">🎓 Sertifikatlar</div>
        </div>

        {certificates.length === 0 ? (
          <div className="empty-state">
            <div className="spotlight-wrap">
              <div className="empty-icon">🎓</div>
            </div>
            <p style={{ marginTop: 8 }}>
              Hali sertifikat yo&apos;q — lekin birinchisi doim eng yaxshisi bo&apos;ladi!<br />
              <span className="empty-cta">Kursni tugatib birinchisini oling.</span>
            </p>
          </div>
        ) : (
          <div className="cert-grid">
            {certificates.map((c, i) => (
              <div key={i} className="cert-card" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="cert-badge">🎓</span>
                <div className="cert-title">{c.course}</div>
                <div className="cert-course">{c.level} darajasi · {c.name}</div>
                <div className="cert-meta">
                  <span>{c.date}</span>
                  <span className="cert-id">{c.id}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, marginBottom: 14 }}>
                  ⚡ {c.xpEarned} XP
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                  onClick={() => downloadCert(c)}
                >
                  ⬇ Yuklab olish
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
