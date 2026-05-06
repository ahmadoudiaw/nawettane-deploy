'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error);
    }
  }, [error]);

  return (
    <div className="error-boundary">
      <div className="error-boundary__card">
        <div className="error-boundary__icon" aria-hidden>⚠</div>
        <h1 className="error-boundary__title">Une erreur est survenue</h1>
        <p className="error-boundary__text">
          Vous pouvez réessayer ou revenir au tableau de bord.
        </p>
        <div className="error-boundary__actions">
          <button className="button button--primary" onClick={reset}>
            Réessayer
          </button>
          <Link href="/admin/dashboard" className="button button--secondary">
            Retour tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
