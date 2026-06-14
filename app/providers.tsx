'use client';

import { useEffect } from 'react';
import useAppStore from '@/lib/store';
import { loadProgress } from '@/lib/storage';
import type { User } from '@/lib/types';
import { Notification } from '@/components/ui/Widgets';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { setUser, loadProgress: hydrateStore, setIsLoaded } = useAppStore();

  useEffect(() => {
    const init = async () => {
      const sess = localStorage.getItem('ustoz-session');
      if (sess) {
        try {
          const user: User = JSON.parse(sess);
          setUser(user);
          const progress = await loadProgress(user.id);
          if (progress) hydrateStore(progress);
        } catch {
          localStorage.removeItem('ustoz-session');
        }
      }
      setIsLoaded(true);
    };
    init();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Notification />
      {children}
    </>
  );
}
