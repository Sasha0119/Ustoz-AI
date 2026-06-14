'use client';

import useAppStore from '@/lib/store';

export function Spinner({ size = 36 }: { size?: number }) {
  const bw = size > 24 ? 3 : 2;
  return (
    <div
      className="spinner"
      style={{ width: size, height: size, borderWidth: bw }}
      aria-label="Yuklanmoqda..."
      role="status"
    />
  );
}

export function ThinkingDots() {
  return (
    <div className="thinking-dots" aria-label="AI o'ylayapti..." role="status">
      <div className="thinking-dot" />
      <div className="thinking-dot" />
      <div className="thinking-dot" />
    </div>
  );
}

export function Notification() {
  const notification = useAppStore((s) => s.notification);
  if (!notification) return null;

  const isWarning = notification.color === 'var(--amber)';
  const isError   = notification.color === 'var(--coral)';
  const icon      = isError ? '❌' : isWarning ? '⚠️' : '✅';

  return (
    <div
      id="notif"
      role="alert"
      aria-live="polite"
      style={{ borderColor: notification.color ?? 'var(--emerald)' }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span>{notification.message}</span>
    </div>
  );
}
