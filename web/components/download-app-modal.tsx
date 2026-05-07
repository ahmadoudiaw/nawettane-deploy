'use client';

import { useEffect, useState } from 'react';
import { getPublicAppSettings } from '@/lib/api';

interface DownloadLinks {
  androidUrl: string | null;
  iosUrl: string | null;
  helpText: string | null;
}

// Module-level cache — fetch once per page lifetime, shared across all modal instances
let linksCache: DownloadLinks | null = null;
let fetchStarted = false;
const listeners: Array<(links: DownloadLinks) => void> = [];

function loadLinks() {
  if (fetchStarted) return;
  fetchStarted = true;
  getPublicAppSettings()
    .then((data) => {
      linksCache = {
        androidUrl: data.appDownloadAndroidUrl ?? null,
        iosUrl: data.appDownloadIosUrl ?? null,
        helpText: data.appDownloadHelpText ?? null,
      };
      listeners.splice(0).forEach((cb) => cb(linksCache!));
    })
    .catch(() => {
      fetchStarted = false;
    });
}

function useDownloadLinks(): DownloadLinks | null {
  const [links, setLinks] = useState<DownloadLinks | null>(linksCache);

  useEffect(() => {
    if (linksCache) {
      setLinks(linksCache);
      return;
    }
    listeners.push(setLinks);
    loadLinks();
    return () => {
      const idx = listeners.indexOf(setLinks);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return links;
}

function PlayStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M3.18 23.76c.41.23.87.24 1.3.04l13.2-7.62-2.8-2.8-11.7 10.38zM.1 1.2C.04 1.44 0 1.7 0 2v20c0 .3.03.56.1.8l12.1-12.1L.1 1.2zm20.36 9.17l-2.84-1.64-3.14 3.14 3.14 3.13 2.88-1.66c.82-.48.82-1.5-.04-1.97zM4.48.2L17.68 7.8l-2.8 2.8L3.18.24C3.6.04 4.07.05 4.48.2z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-151.5-91.1C79.6 794 27.3 688 27.3 583.2c0-175.6 113.9-268.5 224.4-268.5 57.1 0 104.5 36.5 140.8 36.5 34.4 0 88.3-38.7 152.4-38.7 24.5 0 108.2 1.9 163.8 68.7zM529.5 97.1c-21.4-26.3-55.8-46.7-90.4-46.7-1.3 0-2.6 0-3.9.1.2 30.6 12.3 61.1 33.1 83.5 21.5 24.1 56.2 43.3 87.2 43.3 1.1 0 2.2 0 3.3-.1-.1-29.3-10.5-58.2-29.3-80.1z" />
    </svg>
  );
}

export function DownloadAppModal({
  open,
  onClose,
  onContinueWeb,
}: {
  open: boolean;
  onClose: () => void;
  /** Pass undefined to hide the "Continue on web" option */
  onContinueWeb?: () => void;
}) {
  const links = useDownloadLinks();

  if (!open) return null;

  const androidUrl = links?.androidUrl ?? null;
  const iosUrl = links?.iosUrl ?? null;
  const helpText = links?.helpText ?? null;
  const noLinksYet = links !== null && !androidUrl && !iosUrl;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal>
      <div
        className="modal-box download-app-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>

        {/* Icon */}
        <div className="download-app-modal__icon">📱</div>

        {/* Heading */}
        <h2 className="download-app-modal__title">
          Achetez votre billet depuis l&apos;application NAWETTANE
        </h2>
        <p className="download-app-modal__body">
          Téléchargez l&apos;application pour acheter, conserver et présenter
          vos billets en toute sécurité — même sans connexion lors du match.
        </p>

        {/* Benefits */}
        <ul className="download-app-modal__features">
          <li>🎫 Billets stockés sur votre téléphone</li>
          <li>📶 QR code disponible hors-ligne</li>
          <li>💳 Paiement Wave &amp; Orange Money</li>
          <li>🔄 Synchronisation automatique</li>
        </ul>

        {/* Download buttons */}
        {links === null ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Chargement des liens…
          </div>
        ) : noLinksYet ? (
          <p className="download-app-modal__note" style={{ textAlign: 'center', marginBottom: 8 }}>
            Les liens de téléchargement seront bientôt disponibles.
          </p>
        ) : (
          <div className="download-app-modal__buttons">
            {androidUrl ? (
              <a
                className="dam-btn dam-btn--android"
                href={androidUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <PlayStoreIcon />
                <span>Télécharger l&apos;application Android</span>
              </a>
            ) : (
              <button className="dam-btn dam-btn--android dam-btn--soon" disabled type="button">
                <PlayStoreIcon />
                <span>Android — Bientôt disponible</span>
              </button>
            )}

            {iosUrl ? (
              <a
                className="dam-btn dam-btn--ios"
                href={iosUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <AppleIcon />
                <span>Télécharger l&apos;application iPhone</span>
              </a>
            ) : (
              <button className="dam-btn dam-btn--ios dam-btn--soon" disabled type="button">
                <AppleIcon />
                <span>iPhone — Bientôt disponible</span>
              </button>
            )}
          </div>
        )}

        {helpText && (
          <p className="download-app-modal__note">{helpText}</p>
        )}

        {/* Optional: continue on web */}
        {onContinueWeb ? (
          <button
            className="button button--ghost download-app-modal__web-link"
            onClick={onContinueWeb}
            type="button"
          >
            Continuer sur le Web quand même →
          </button>
        ) : null}
      </div>
    </div>
  );
}
