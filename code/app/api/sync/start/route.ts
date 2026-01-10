// ===========================================
// Start Sync (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import type { SyncStartResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

// In-memory store for sync jobs (MVP)
const syncJobs = new Map<string, { status: string; progress: number; startedAt: string }>();

export async function POST(request: Request) {
    const body = await request.json();
    const { repoId, branchName } = body;

    if (!repoId || !branchName) {
        return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'repoId and branchName are required' },
            { status: 400 }
        );
    }

    const jobId = `sync-${repoId}-${Date.now()}`;

    // Check if sync already running for this repo (idempotent)
    for (const [existingJobId, job] of syncJobs.entries()) {
        if (existingJobId.startsWith(`sync-${repoId}`) && job.status === 'syncing') {
            const response: SyncStartResponse = {
                status: 'already_running',
                jobId: existingJobId,
            };
            return NextResponse.json(response);
        }
    }

    // Start new sync job
    syncJobs.set(jobId, {
        status: 'syncing',
        progress: 0,
        startedAt: new Date().toISOString(),
    });

    // Simulate progress (in production, this would be a background job)
    simulateSyncProgress(jobId);

    const response: SyncStartResponse = {
        status: 'started',
        jobId,
    };

    return NextResponse.json(response);
}

// Simulate sync progress for demo
function simulateSyncProgress(jobId: string) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            syncJobs.set(jobId, { status: 'complete', progress: 100, startedAt: syncJobs.get(jobId)!.startedAt });
            clearInterval(interval);
        } else {
            syncJobs.set(jobId, { status: 'syncing', progress: Math.floor(progress), startedAt: syncJobs.get(jobId)!.startedAt });
        }
    }, 1000);
}

// Export the syncJobs map for the status endpoint
export { syncJobs };
