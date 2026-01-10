'use client';

// ===========================================
// Public Routes Error Boundary
// ===========================================

import { ErrorState } from '@/components/ui/ErrorState';

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <ErrorState
                title="Something went wrong"
                message={error.message || 'An unexpected error occurred'}
                onRetry={reset}
            />
        </div>
    );
}
