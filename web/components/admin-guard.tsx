'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSession, clearSession, getSession } from '@/lib/auth';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    if (!currentSession) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  if (session === undefined) {
    return <div className="panel">Chargement de l’espace sécurisé...</div>;
  }

  if (!session) {
    return <div className="panel">Redirection vers la connexion…</div>;
  }

  return (
    <div className="stack">
      <div className="toolbar panel">
        <div>
          <strong>{session.user.fullName ?? session.user.email}</strong>
          <div className="muted">{session.user.role}</div>
        </div>
        <button
          className="button button--secondary"
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
          type="button"
        >
          Déconnexion
        </button>
      </div>
      {children}
    </div>
  );
}
