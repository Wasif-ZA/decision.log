// ===========================================
// Start Sync (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { validateBody } from '@/lib/validation';
import { findRunningJobForRepo, getSyncJob, pruneOldSyncJobs, setSyncJob } from '@/lib/sync/jobs';
import type { SyncStartResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

const SyncStartSchema = z.object({
    repoId: z.string().min(1),
    branchName: z.string().min(1),
});

export const POST = requireAuth(async (request, { user }) => {
    try {
        const { repoId } = await validateBody(request, SyncStartSchema);
        await requireRepoAccessByIdentifier(user.id, repoId);
        pruneOldSyncJobs();

        const existingJobId = findRunningJobForRepo(repoId);
        if (existingJobId) {
            const response: SyncStartResponse = {
                status: 'already_running',
                jobId: existingJobId,
            };
            return NextResponse.json(response);
        }

        const jobId = `sync-${repoId}-${Date.now()}`;
        const startedAt = new Date().toISOString();

        setSyncJob(jobId, {
            status: 'syncing',
            progress: 0,
            startedAt,
        });

        simulateSyncProgress(jobId);

        const response: SyncStartResponse = {
            status: 'started',
            jobId,
        };
        return NextResponse.json(response);
    } catch (error) {
        const formatted = handleError(error);
        return NextResponse.json(
            {
                code: formatted.code,
                message: formatted.message,
                details: formatted.details,
            },
            { status: formatted.statusCode }
        );
    }
});

// Simulate sync progress for demo
function simulateSyncProgress(jobId: string) {
    const currentJob = getSyncJob(jobId);
    if (!currentJob) return;

    const startedAt = currentJob.startedAt;
    let progress = 0;
    const interval = setInterval(() => {
        const job = getSyncJob(jobId);
        if (!job) {
            clearInterval(interval);
            return;
        }

        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            setSyncJob(jobId, {
                status: 'complete',
                progress: 100,
                startedAt,
                completedAt: new Date().toISOString(),
            });
            clearInterval(interval);
        } else {
            setSyncJob(jobId, {
                status: 'syncing',
                progress: Math.floor(progress),
                startedAt,
            });
        }
    }, 1000);
}
