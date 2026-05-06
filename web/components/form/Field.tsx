'use client';

import { forwardRef } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
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

const IconErrInline = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, helper, error, success, id, required, className: _c, ...props }, ref) => {
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
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${fieldId}-err` : helper ? `${fieldId}-help` : undefined
            }
            {...props}
          />
          {error && (
            <span className="field__input-icon">
              <IconError />
            </span>
          )}
          {success && !error && (
            <span className="field__input-icon">
              <IconSuccess />
            </span>
          )}
        </div>

        {helper && !error && (
          <p id={`${fieldId}-help`} className="field__helper">
            {helper}
          </p>
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

Field.displayName = 'Field';
