'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerApiErrorHandler } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export function GlobalApiHandler() {
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    registerApiErrorHandler({
      onUnauthorized: () => {
        toast.warning('Session expirée', 'Veuillez vous reconnecter.');
        router.push('/login');
      },
      onForbidden: () => {
        toast.warning('Accès non autorisé', "Vous n'avez pas les droits pour cette action.");
      },
      onServerError: () => {
        toast.error('Erreur serveur', 'Une erreur inattendue s\'est produite. Réessayez plus tard.');
      },
      onNetworkError: () => {
        toast.error('Connexion perdue', 'Vérifiez votre connexion internet.', { persistent: true });
      },
    });
  }, [toast, router]);

  return null;
}
