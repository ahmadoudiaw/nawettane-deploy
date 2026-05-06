'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

export function OfflineDetector() {
  const toast = useToast();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      setIsOffline(true);
    }

    function handleOffline() {
      setIsOffline(true);
      toast.error('Connexion perdue', 'Vérifiez votre réseau.', { persistent: true });
    }

    function handleOnline() {
      setIsOffline(false);
      toast.success('Connexion rétablie', 'Vous êtes de nouveau en ligne.');
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <span className="offline-banner__dot" aria-hidden />
      <span>Hors ligne — Vérifiez votre connexion réseau.</span>
    </div>
  );
}
