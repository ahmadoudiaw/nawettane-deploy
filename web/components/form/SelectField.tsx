'use client';

import { forwardRef } from 'react';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helper?: string;
  error?: string;
  success?: boolean;
  children: React.ReactNode;
}

const IconErrInline = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, helper, error, success, id, required, children, className: _c, ...props }, ref) => {
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

        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${fieldId}-err` : helper ? `${fieldId}-help` : undefined
          }
          {...props}
        >
          {children}
        </select>

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

SelectField.displayName = 'SelectField';
