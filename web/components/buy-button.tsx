'use client';

import { useState } from 'react';
import { DownloadAppModal } from './download-app-modal';

export function BuyButton({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="button button--secondary"
        onClick={() => setOpen(true)}
        type="button"
      >
        Acheter Billet
      </button>
      <DownloadAppModal
        open={open}
        onClose={() => setOpen(false)}
        /* Remove the prop below to hide "Continuer sur Web" */
        onContinueWeb={() => {
          setOpen(false);
          window.location.href = `/checkout/${matchId}`;
        }}
      />
    </>
  );
}
