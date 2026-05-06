'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSession, getSession } from '@/lib/auth';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) {
      router.replace('/login');
    }
  }, [router]);

  if (session === undefined) {
    return <div className="panel">Chargement...</div>;
  }

  if (!session) {
    return <div className="panel">Redirection...</div>;
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="panel">
        <div className="error">Accès restreint — réservé au Super Admin.</div>
      </div>
    );
  }

  return <>{children}</>;
}
