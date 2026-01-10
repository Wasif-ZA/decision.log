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
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="mb-4 text-red-500">
                <AlertCircle className="w-12 h-12" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-base-900 mb-2">
                {title}
            </h3>
            <p className="text-sm text-base-500 max-w-md mb-6">
                {message}
            </p>
            {onRetry && (
                <Button onClick={onRetry} variant="secondary">
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
