'use client';

// ===========================================
// Public Routes Error Boundary
// ===========================================

import { ErrorState } from '@/components/ui/ErrorState';

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string; code?: string; retryAfter?: number };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <ErrorState
                title="Something went wrong"
                message={error.message || 'An unexpected error occurred'}
                errorCode={error.code}
                retryAfter={error.retryAfter}
                onRetry={reset}
            />
        </div>
    );
}
