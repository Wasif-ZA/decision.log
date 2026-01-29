'use client';

// ===========================================
// Button Component
// ===========================================

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: `
        bg-gradient-to-r from-base-800 via-base-900 to-base-950 text-white
        hover:from-base-700 hover:via-base-800 hover:to-base-900
        shadow-md hover:shadow-lg hover:shadow-base-900/20
        focus-visible:ring-accent-400
    `,
    secondary: `
        bg-white text-base-900 
        border border-base-200 hover:border-base-300
        shadow-sm hover:shadow-md
        hover:bg-base-50
        focus-visible:ring-base-400
    `,
    ghost: `
        bg-transparent text-base-600 
        hover:bg-base-100 hover:text-base-900
        focus-visible:ring-base-400
    `,
    danger: `
        bg-gradient-to-r from-red-500 to-red-600 text-white
        hover:from-red-600 hover:to-red-700
        shadow-md hover:shadow-lg hover:shadow-red-500/20
        focus-visible:ring-red-400
    `,
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', isLoading, disabled, className = '', children, ...props }, ref) => {
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={`
                    inline-flex items-center justify-center gap-2 
                    rounded-lg font-medium
                    transition-all duration-200 ease-out
                    transform hover:scale-[1.02] active:scale-[0.98]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    ${variantStyles[variant]}
                    ${sizeStyles[size]}
                    ${className}
                `}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

