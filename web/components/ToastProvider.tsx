'use client';

import { createContext, useCallback, useContext, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  persistent?: boolean;
}

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  exiting?: boolean;
  persistent?: boolean;
}

interface ToastAPI {
  success: (title: string, message?: string, opts?: ToastOptions) => void;
  error:   (title: string, message?: string, opts?: ToastOptions) => void;
  warning: (title: string, message?: string, opts?: ToastOptions) => void;
  info:    (title: string, message?: string, opts?: ToastOptions) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastAPI | null>(null);

let nextId = 0;
const DEFAULT_DURATION_MS = 4500;
const EXIT_MS = 220;

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSuccess() {
  return (
    <div className="toast__icon-wrap toast__icon-wrap--success" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function IconError() {
  return (
    <div className="toast__icon-wrap toast__icon-wrap--error" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path d="M8 4v5M8 11v.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function IconWarning() {
  return (
    <div className="toast__icon-wrap toast__icon-wrap--warning" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path d="M8 4v5M8 11v.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function IconInfo() {
  return (
    <div className="toast__icon-wrap toast__icon-wrap--info" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path d="M8 7.5V12M8 4.5v.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function IconDismiss() {
  return (
    <svg viewBox="0 0 12 12" fill="none" width="12" height="12" aria-hidden>
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <IconSuccess />,
  error:   <IconError />,
  warning: <IconWarning />,
  info:    <IconInfo />,
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const add = useCallback(
    (variant: ToastVariant, title: string, message?: string, opts?: ToastOptions) => {
      const id = ++nextId;
      const persistent = opts?.persistent ?? false;
      setToasts((prev) => [...prev, { id, variant, title, message, persistent }]);
      if (!persistent) {
        const duration = opts?.duration ?? DEFAULT_DURATION_MS;
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api: ToastAPI = {
    success: (title, message, opts) => add('success', title, message, opts),
    error:   (title, message, opts) => add('error',   title, message, opts),
    warning: (title, message, opts) => add('warning', title, message, opts),
    info:    (title, message, opts) => add('info',    title, message, opts),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" role="log" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}${t.exiting ? ' toast--exiting' : ''}`}
            role="status"
          >
            {ICONS[t.variant]}
            <div className="toast__body">
              <div className="toast__title">{t.title}</div>
              {t.message && <div className="toast__msg">{t.message}</div>}
            </div>
            <button
              className="toast__dismiss"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer"
            >
              <IconDismiss />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
