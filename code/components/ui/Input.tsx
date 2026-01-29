'use client';

// ===========================================
// Input Component
// ===========================================

import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, className = '', id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || props.name || generatedId;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-base-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
                        w-full px-4 py-2.5 rounded-lg border text-sm
                        bg-white text-base-900 placeholder-base-400
                        shadow-sm
                        transition-all duration-200 ease-out
                        hover:border-base-400 hover:shadow-md
                        focus:outline-none focus:ring-2 focus:ring-offset-0 focus:shadow-md
                        disabled:bg-base-50 disabled:text-base-500 disabled:cursor-not-allowed disabled:shadow-none
                        ${error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-base-200 focus:border-accent-400 focus:ring-accent-100'
                        }
                        ${className}
                    `}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-base-500">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

