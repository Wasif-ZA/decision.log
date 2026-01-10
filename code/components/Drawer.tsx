'use client';

// ===========================================
// Right Drawer Component
// ===========================================

import { useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'full';
}

const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'max-w-full',
};

export function Drawer({
    isOpen,
    onClose,
    title,
    children,
    width = 'md',
}: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Store the previously focused element and restore on close
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            // Focus the drawer
            drawerRef.current?.focus();
        } else {
            // Restore focus when closing
            previousActiveElement.current?.focus();
        }
    }, [isOpen]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle ESC key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    // Focus trap
    const handleFocusTrap = useCallback(
        (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !drawerRef.current) return;

            const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        },
        []
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            onKeyDown={(e) => {
                handleKeyDown(e);
                handleFocusTrap(e);
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                tabIndex={-1}
                className={`
          absolute top-0 right-0 h-full w-full ${widthStyles[width]}
          bg-white shadow-xl
          transform transition-transform duration-300 ease-out
          animate-in slide-in-from-right duration-300
          flex flex-col
        `}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-base-200 flex-shrink-0">
                        <h2 id="drawer-title" className="text-lg font-semibold text-base-900">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-base-100 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5 text-base-500" />
                        </button>
                    </div>
                )}

                {/* Close button if no title */}
                {!title && (
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-base-100 hover:bg-base-200 transition-colors shadow"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5 text-base-500" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
