// ===========================================
// Error State Component
// ===========================================

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = 'Something went wrong',
    message,
    onRetry,
    className = '',
}: ErrorStateProps) {
    return (
        <div
            className={`
                flex flex-col items-center justify-center py-16 px-6 text-center
                animate-[fade-in_0.4s_ease-out]
                ${className}
            `}
        >
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-60" />
                <div className="relative p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-full">
                    <AlertCircle
                        className="w-10 h-10 text-red-500"
                        strokeWidth={1.5}
                    />
                </div>
            </div>
            <h3 className="text-lg font-semibold text-base-900 mb-2">
                {title}
            </h3>
            <p className="text-sm text-base-500 max-w-md mb-8 leading-relaxed">
                {message}
            </p>
            {onRetry && (
                <Button onClick={onRetry} variant="secondary" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}

// ===========================================
// Common Error State Presets
// ===========================================

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
    return (
        <ErrorState
            title="Connection Error"
            message="Unable to connect to the server. Please check your internet connection and try again."
            onRetry={onRetry}
        />
    );
}

export function PermissionErrorState() {
    return (
        <ErrorState
            title="Access Denied"
            message="You don't have permission to view this content. Please contact your administrator."
        />
    );
}

export function RepoAccessRevokedState({ onReconnect }: { onReconnect?: () => void }) {
    return (
        <ErrorState
            title="Repository Access Revoked"
            message="Your access to this repository has been revoked. Please re-authorize or select a different repository."
            onRetry={onReconnect}
        />
    );
}

export function RateLimitedState({ retryAfter }: { retryAfter?: number }) {
    const message = retryAfter
        ? `You've been rate limited. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`
        : 'You\'ve been rate limited. Please try again later.';

    return (
        <ErrorState
            title="Rate Limited"
            message={message}
        />
    );
}

