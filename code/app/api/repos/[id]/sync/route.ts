// ===========================================
// Sync API Route
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireEnabledRepo } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { startSync, getSyncStatus } from '@/lib/sync/orchestrator';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/repos/[id]/sync
 * Start a sync for the repo
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify repo is enabled
        await requireEnabledRepo(userId, repoId);

        // Start sync
        const syncRun = await startSync(userId, repoId);

        return NextResponse.json({
            success: true,
            syncRun: {
                id: syncRun.id,
                status: syncRun.status,
                startedAt: syncRun.startedAt,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}

/**
 * GET /api/repos/[id]/sync
 * Get the latest sync status
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify access (doesn't need to be enabled to check status)
        const { requireRepoAccess } = await import('@/lib/auth/requireRepoAccess');
        await requireRepoAccess(userId, repoId);

        const syncRun = await getSyncStatus(repoId);

        if (!syncRun) {
            return NextResponse.json({
                hasSync: false,
            });
        }

        return NextResponse.json({
            hasSync: true,
            syncRun: {
                id: syncRun.id,
                status: syncRun.status,
                startedAt: syncRun.startedAt,
                completedAt: syncRun.completedAt,
                prsFetched: syncRun.prsFetched,
                artifactsCreated: syncRun.artifactsCreated,
                artifactsUpdated: syncRun.artifactsUpdated,
                artifactsSievedIn: syncRun.artifactsSievedIn,
                artifactsSievedOut: syncRun.artifactsSievedOut,
                candidatesCreated: syncRun.candidatesCreated,
                errorMessage: syncRun.errorMessage,
                logs: syncRun.logs,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
