'use client';

import { ReactNode, useEffect, useState } from 'react';
import { DeletePreview } from '@/lib/types';

export type RequestedAction = 'delete' | 'deactivate' | 'cancel';

interface Props {
  preview: DeletePreview | null;
  requestedAction: RequestedAction;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  /** Shown only when requestedAction === 'delete' and preview.allowDelete === false */
  onDeactivate?: () => Promise<void>;
  /** Disable the confirm button (e.g. waiting for required form input) */
  confirmDisabled?: boolean;
  /** Extra form elements rendered between the warning text and the action buttons */
  children?: ReactNode;
}

const EYEBROW: Record<RequestedAction, string> = {
  delete: 'Suppression définitive',
  deactivate: 'Désactivation',
  cancel: 'Annulation du billet',
};

const CONFIRM_LABEL: Record<RequestedAction, string> = {
  delete: 'Supprimer définitivement',
  deactivate: 'Désactiver',
  cancel: 'Confirmer l\'annulation',
};

const BUSY_LABEL: Record<RequestedAction, string> = {
  delete: 'Suppression…',
  deactivate: 'Désactivation…',
  cancel: 'Annulation…',
};

export function SmartConfirmDialog({
  preview,
  requestedAction,
  isOpen,
  onClose,
  onConfirm,
  onDeactivate,
  confirmDisabled = false,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen || !preview) return null;

  const isBlockedDelete = requestedAction === 'delete' && !preview.allowDelete;
  const isDanger = requestedAction === 'delete' || requestedAction === 'cancel';

  const depColor = isBlockedDelete
    ? { bg: '#fffbeb', border: '#fcd34d', pillBg: '#fef3c7', pillText: '#92400e', label: '#92400e' }
    : { bg: '#f0f9ff', border: '#bae6fd', pillBg: '#e0f2fe', pillText: '#0369a1', label: '#64748b' };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(29, 26, 20, 0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(3px)',
      }}
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--panel-strong, #fffaf1)',
          borderRadius: 20,
          padding: '28px 32px',
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 20px 60px rgba(29, 26, 20, 0.24)',
          border: '1px solid var(--line, #ddd0b6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eyebrow + entity name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: isBlockedDelete
              ? '#b45309'
              : isDanger
                ? 'var(--danger, #b42318)'
                : 'var(--brand, #0f766e)',
            marginBottom: 8,
          }}>
            {EYEBROW[requestedAction]}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--text, #1d1a14)',
            lineHeight: 1.3,
          }}>
            {preview.entityName}
          </h3>
        </div>

        {/* Dependencies panel */}
        {preview.dependencies.length > 0 && (
          <div style={{
            background: depColor.bg,
            border: `1.5px solid ${depColor.border}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: depColor.label,
              marginBottom: 10,
            }}>
              Éléments liés
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {preview.dependencies.map((dep) => (
                <span key={dep.label} style={{
                  background: depColor.pillBg,
                  color: depColor.pillText,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '4px 12px',
                  borderRadius: 20,
                }}>
                  {dep.count} {dep.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warning text */}
        <p style={{
          margin: '0 0 20px',
          fontSize: 13,
          color: isBlockedDelete ? '#b45309' : 'var(--muted, #6a6253)',
          lineHeight: 1.65,
        }}>
          {preview.warningMessage}
        </p>

        {/* Extra form content (e.g. cancel reason textarea) */}
        {children && <div style={{ marginBottom: 16 }}>{children}</div>}

        {/* Inline error */}
        {error && (
          <div className="error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="button-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            className="button button--secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Fermer
          </button>

          {isBlockedDelete ? (
            onDeactivate ? (
              <button
                className="button button--primary"
                type="button"
                disabled={busy}
                onClick={() => run(onDeactivate)}
                style={{ background: 'var(--accent, #d97706)', borderColor: 'var(--accent, #d97706)' }}
              >
                {busy ? 'Désactivation…' : 'Désactiver à la place'}
              </button>
            ) : null
          ) : (
            <button
              className="button button--primary"
              type="button"
              disabled={busy || confirmDisabled}
              onClick={() => run(onConfirm)}
              style={isDanger ? { background: 'var(--danger, #b42318)', borderColor: 'var(--danger, #b42318)' } : undefined}
            >
              {busy ? BUSY_LABEL[requestedAction] : CONFIRM_LABEL[requestedAction]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
