'use client';

// ===========================================
// Toast Notification System
// ===========================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const duration = toast.duration ?? 5000;

        setToasts(prev => [...prev, { ...toast, id }]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message, duration: 8000 }); // Errors stay longer
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message, duration: 6000 });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// ─────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Toast Item
// ─────────────────────────────────────────────

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: {
        bg: 'bg-green-50 border-green-200',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    },
    error: {
        bg: 'bg-red-50 border-red-200',
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
    info: {
        bg: 'bg-blue-50 border-blue-200',
        icon: <Info className="w-5 h-5 text-blue-500" />,
    },
    warning: {
        bg: 'bg-yellow-50 border-yellow-200',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const { bg, icon } = typeStyles[toast.type];

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        animate-in slide-in-from-right-full duration-300
        ${bg}
      `}
            role="alert"
        >
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-base-900">{toast.title}</p>
                {toast.message && (
                    <p className="text-sm text-base-600 mt-1">{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-base-200 transition-colors"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4 text-base-500" />
            </button>
        </div>
    );
}
