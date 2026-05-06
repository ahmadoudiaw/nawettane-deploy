'use client';

import Link from 'next/link';

export function Unauthorized() {
  return (
    <div className="error-boundary">
      <div className="error-boundary__card">
        <div className="error-boundary__icon" aria-hidden>&#x2715;</div>
        <h1 className="error-boundary__title">Accès non autorisé</h1>
        <p className="error-boundary__text">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
          Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
        <div className="error-boundary__actions">
          <Link href="/admin/dashboard" className="button button--primary">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
