'use client';

// ===========================================
// App Routes Error Boundary
// ===========================================

import { ErrorState } from '@/components/ui/ErrorState';

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="p-8">
            <ErrorState
                title="Something went wrong"
                message={error.message || 'An unexpected error occurred'}
                onRetry={reset}
            />
        </div>
    );
}
