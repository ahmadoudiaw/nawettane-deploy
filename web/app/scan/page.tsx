'use client';

import { useRef, useState } from 'react';
import { PageShell } from '@/components/page-shell';
import { validateScan, formatApiError, ApiError } from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { ScanResult } from '@/lib/types';

type ScanOverlay = { kind: 'valid' | 'refused'; message: string } | null;

function resultMessage(result: ScanResult): string {
  switch (result) {
    case 'VALID':       return 'Billet valide';
    case 'ALREADY_USED': return 'Billet déjà utilisé';
    case 'INVALID':     return 'Billet invalide';
    case 'OUT_OF_SCOPE': return 'Hors périmètre';
  }
}

function vibrate(kind: 'valid' | 'refused') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (kind === 'valid') {
    navigator.vibrate(50);           // mediumImpact — légère
  } else {
    navigator.vibrate([100, 50, 100]); // heavyImpact ×2 — forte
  }
}

export default function ScanPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [matchId, setMatchId] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Scanner-Web-Demo');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [overlay, setOverlay] = useState<ScanOverlay>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showOverlay(kind: 'valid' | 'refused', message: string) {
    vibrate(kind);
    setOverlay({ kind, message });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setOverlay(null);
      setTicketCode('');
      setError(null);
    }, 2000);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setError("Connectez-vous d'abord avec un compte admin ou guichet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await validateScan(session.token, { ticketCode, matchId, deviceLabel });
      const kind = response.result === 'VALID' ? 'valid' : 'refused';
      showOverlay(kind, resultMessage(response.result));
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      const msg = formatApiError(err);
      showOverlay('refused', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Contrôle d'accès"
      title="App Guichet"
      description="Interface de contrôle pour scanner ou saisir un code manuellement."
    >
      {overlay && (
        <div className={`scan-overlay scan-overlay--${overlay.kind}`} role="status" aria-live="assertive">
          <div className="scan-overlay__icon" aria-hidden>
            {overlay.kind === 'valid' ? (
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                <path d="M22 41l12 13 24-28" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                <path d="M26 26l28 28M54 26L26 54" stroke="white" strokeWidth="5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <p className="scan-overlay__message">{overlay.message}</p>
        </div>
      )}

      <div className="split split--scan">
        <section className="panel scan-app">
          <div className="scan-app__hero">
            <button className="scan-trigger" type="button">
              Scanner un QR
            </button>
            <p className="muted">
              Démo web : utilisez l'entrée manuelle ci-dessous pour tester rapidement.
            </p>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Code billet</label>
              <input
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Scannez ou saisissez le code"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Match ID</label>
              <input value={matchId} onChange={(e) => setMatchId(e.target.value)} />
            </div>
            <div className="field">
              <label>Appareil</label>
              <input value={deviceLabel} onChange={(e) => setDeviceLabel(e.target.value)} />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="button-row">
              <button
                className="button button--primary button--large"
                disabled={loading || !ticketCode}
                type="submit"
              >
                {loading ? 'Vérification…' : 'Valider le billet'}
              </button>
            </div>
          </form>
        </section>

        <aside className="panel stack scan-result-panel">
          <h3>Instructions</h3>
          <div className="scan-instructions">
            <div className="scan-instruction scan-instruction--valid">
              <strong>Billet valide</strong>
              <span>Écran vert — accès autorisé</span>
            </div>
            <div className="scan-instruction scan-instruction--refused">
              <strong>Refus</strong>
              <span>Écran rouge — déjà utilisé ou invalide</span>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
