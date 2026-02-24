// ===========================================
// Sync Status (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { validateSearchParams } from '@/lib/validation';
import { getSyncJob, pruneOldSyncJobs } from '@/lib/sync/jobs';
import type { SyncStatusResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

const SyncStatusQuerySchema = z.object({
    jobId: z.string().min(1),
});

export const GET = requireAuth(async (request, { user }) => {
    try {
        pruneOldSyncJobs();

        const { searchParams } = new URL(request.url);
        const { jobId } = validateSearchParams(searchParams, SyncStatusQuerySchema);

        const repoId = extractRepoId(jobId);
        if (repoId) {
            await requireRepoAccessByIdentifier(user.id, repoId);
        }

        const job = getSyncJob(jobId);

        if (!job) {
            // If job not found, assume it's an old completed job
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

function extractRepoId(jobId: string): string | null {
    const match = /^sync-(.+)-\d+$/.exec(jobId);
    return match?.[1] ?? null;
}
