// ===========================================
// Sync Status (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import type { SyncStatusResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

// In-memory store for sync jobs (shared with start route)
// Note: In production, this would be Redis or a database
const syncJobs = new Map<string, { status: string; progress: number; startedAt: string }>();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'jobId is required' },
            { status: 400 }
        );
    }

    const job = syncJobs.get(jobId);

    if (!job) {
        // If job not found, assume it's an old job and return complete
        // This handles server restart scenarios gracefully
        const response: SyncStatusResponse = {
            status: 'complete',
            progress: 100,
        };
        return NextResponse.json(response);
    }

    const response: SyncStatusResponse = {
        status: job.status as SyncStatusResponse['status'],
        progress: job.progress,
        error: job.status === 'error' ? 'Sync failed' : undefined,
    };

    return NextResponse.json(response);
}

// Allow start route to update this map
export { syncJobs };
