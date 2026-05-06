'use client';

import { forwardRef, useState } from 'react';

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  helper?: string;
  error?: string;
  success?: boolean;
}

const IconError = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="7" stroke="var(--danger)" strokeWidth="1.4" />
    <path d="M8 4.5v4M8 10.5v1" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSuccess = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="7" stroke="var(--success)" strokeWidth="1.4" />
    <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="var(--success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M2 2l12 12M6.7 6.8A2 2 0 0 0 10 10M4.2 4.3C2.6 5.4 1 8 1 8s2.5 5 7 5c1.4 0 2.7-.4 3.8-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.6 1.1-1.5 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconErrInline = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, helper, error, success, id, required, className: _c, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const fieldId = id ?? `field-${label.toLowerCase().replace(/\W+/g, '-')}`;
    const stateClass = error ? 'field--error' : success ? 'field--success' : '';

    return (
      <div className={`field ${stateClass}`}>
        <label htmlFor={fieldId}>
          {label}
          {required && (
            <span aria-hidden style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>
          )}
        </label>

        <div className="field__input-wrap">
          <input
            ref={ref}
            id={fieldId}
            type={show ? 'text' : 'password'}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${fieldId}-err` : helper ? `${fieldId}-help` : undefined
            }
            style={{ paddingRight: '4rem' }}
            {...props}
          />
          <span className="field__input-icon field__input-icons">
            <button
              type="button"
              className="field__eye-btn"
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              onClick={() => setShow((v) => !v)}
            >
              {show ? <IconEyeOff /> : <IconEye />}
            </button>
            {error && <IconError />}
            {success && !error && <IconSuccess />}
          </span>
        </div>

        {helper && !error && (
          <p id={`${fieldId}-help`} className="field__helper">{helper}</p>
        )}
        {error && (
          <p id={`${fieldId}-err`} role="alert" className="field__error-msg">
            <IconErrInline />
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordField.displayName = 'PasswordField';
