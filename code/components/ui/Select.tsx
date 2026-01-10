'use client';

// ===========================================
// Select Component
// ===========================================

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
        const selectId = id || props.name || Math.random().toString(36).substring(2, 9);

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-base-700 mb-1"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
              w-full px-3 py-2 pr-10 rounded-md border text-sm appearance-none
              bg-white text-base-900
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-base-50 disabled:text-base-500 disabled:cursor-not-allowed
              ${error
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                : 'border-base-300 focus:border-base-500 focus:ring-base-200'
                            }
              ${className}
            `}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map(option => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-base-400" />
                    </div>
                </div>
                {error && (
                    <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${selectId}-hint`} className="mt-1 text-sm text-base-500">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
