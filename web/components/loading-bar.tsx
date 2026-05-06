'use client';

import { useEffect, useState } from 'react';
import { registerLoadingHandler } from '@/lib/api';

export function LoadingBar() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    registerLoadingHandler((active) => {
      if (active) {
        setPhase('loading');
      } else {
        setPhase('done');
        const t = setTimeout(() => setPhase('idle'), 400);
        return () => clearTimeout(t);
      }
    });
  }, []);

  if (phase === 'idle') return null;

  return (
    <div
      className={`loading-bar loading-bar--${phase}`}
      role="progressbar"
      aria-hidden="true"
    />
  );
}
