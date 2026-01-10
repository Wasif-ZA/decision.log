'use client';

// ===========================================
// Setup Routes Error Boundary
// ===========================================

import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function SetupError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="max-w-md mx-auto mt-20">
            <ErrorState
                title="Setup Error"
                message={error.message || 'Something went wrong during setup'}
                onRetry={reset}
            />
            <div className="mt-4 text-center">
                <Link href="/setup/diagnostics">
                    <Button variant="ghost" size="sm">
                        View Diagnostics
                    </Button>
                </Link>
            </div>
        </div>
    );
}
