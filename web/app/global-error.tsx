'use client';

import { useEffect } from 'react';

// global-error.tsx replaces the root layout on catastrophic render failures.
// It must include <html> and <body> and cannot use providers from layout.tsx.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalError]', error);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body>
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
              <a href="/admin/dashboard" className="button button--secondary">
                Retour tableau de bord
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
