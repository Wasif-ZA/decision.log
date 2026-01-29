// ===========================================
// Sync Orchestrator
// ===========================================
// Coordinates the sync pipeline: fetch → sieve → extract

import { prisma } from '@/lib/db';
import { GitHubClient } from '@/lib/github/client';
import { fetchPullRequests, logSyncProgress } from './fetch';
import { parseCursor, getNextCursor } from './cursor';
import { Prisma, type Repo, type SyncRun, type SyncRunLog } from '@prisma/client';

export type SyncStatus = 'pending' | 'fetching' | 'sieving' | 'extracting' | 'complete' | 'failed';

interface SyncResult {
    status: SyncStatus;
    syncRunId: string;
    prsFetched: number;
    artifactsCreated: number;
    artifactsUpdated: number;
    artifactsSievedIn: number;
    artifactsSievedOut: number;
    candidatesCreated: number;
    error?: string;
}

/**
 * Start or continue a sync for a repo
 */
export async function startSync(
    userId: string,
    repoId: string
): Promise<SyncRun> {
    // Check for in-progress sync
    const existingSync = await prisma.syncRun.findFirst({
        where: {
            repoId,
            status: { in: ['pending', 'fetching', 'sieving', 'extracting'] },
        },
    });

    if (existingSync) {
        return existingSync;
    }

    // Get repo
    const repo = await prisma.repo.findUnique({
        where: { id: repoId },
    });

    if (!repo || repo.userId !== userId) {
        throw new Error('Repo not found or access denied');
    }

    // Create new sync run
    const syncRun = await prisma.syncRun.create({
        data: {
            repoId,
            status: 'pending',
            cursorBefore: repo.syncCursor as Prisma.InputJsonValue,
        },
    });

    // Start the sync in the background (non-blocking)
    runSync(repo, syncRun).catch(error => {
        console.error('Sync error:', error);
    });

    return syncRun;
}

/**
 * Run the full sync pipeline
 */
async function runSync(repo: Repo, syncRun: SyncRun): Promise<void> {
    try {
        // Update status to fetching
        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: { status: 'fetching' },
        });

        // Create GitHub client
        const client = await GitHubClient.forUser(repo.userId);

        // Phase 1: Fetch PRs
        await logSyncProgress(syncRun.id, 'info', 'Starting fetch phase');
        const fetchResult = await fetchPullRequests(client, repo, syncRun);

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                fetchDoneAt: new Date(),
                status: 'sieving',
            },
        });

        // Phase 2: Sieve (score and filter artifacts)
        await logSyncProgress(syncRun.id, 'info', 'Starting sieve phase');
        const sieveResult = await runSievePhase(repo.id, syncRun.id);

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                sieveDoneAt: new Date(),
                artifactsSievedIn: sieveResult.sievedIn,
                artifactsSievedOut: sieveResult.sievedOut,
                status: 'extracting',
            },
        });

        // Phase 3: Extract (LLM extraction)
        await logSyncProgress(syncRun.id, 'info', 'Starting extraction phase');
        const extractResult = await runExtractPhase(repo.id, syncRun.id);

        // Update cursor
        const newCursor = fetchResult.latestPrUpdate
            ? {
                ...parseCursor(repo.syncCursor),
                prUpdatedAfter: getNextCursor(fetchResult.latestPrUpdate),
            }
            : repo.syncCursor;

        // Mark complete
        await prisma.$transaction([
            prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: 'complete',
                    extractDoneAt: new Date(),
                    completedAt: new Date(),
                    candidatesCreated: extractResult.candidatesCreated,
                    candidatesSkipped: extractResult.candidatesSkipped,
                    tokensInput: extractResult.tokensInput,
                    tokensOutput: extractResult.tokensOutput,
                    cursorAfter: newCursor as Prisma.InputJsonValue,
                },
            }),
            prisma.repo.update({
                where: { id: repo.id },
                data: {
                    lastSyncAt: new Date(),
                    lastSyncStatus: 'complete',
                    syncCursor: newCursor as Prisma.InputJsonValue,
                    hasCompletedFirstSync: true,
                },
            }),
        ]);

        await logSyncProgress(syncRun.id, 'info', 'Sync completed successfully');

    } catch (error) {
        console.error('Sync failed:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                status: 'failed',
                errorMessage,
                completedAt: new Date(),
            },
        });

        await prisma.repo.update({
            where: { id: repo.id },
            data: {
                lastSyncAt: new Date(),
                lastSyncStatus: 'failed',
            },
        });

        await logSyncProgress(syncRun.id, 'error', `Sync failed: ${errorMessage}`);
    }
}

/**
 * Run the sieve phase - scores artifacts and filters
 */
async function runSievePhase(
    repoId: string,
    syncRunId: string
): Promise<{ sievedIn: number; sievedOut: number }> {
    // Import the real sieve scorer
    const { sieveArtifacts } = await import('@/lib/sieve/scorer');

    const result = await sieveArtifacts(repoId);

    await logSyncProgress(
        syncRunId,
        'info',
        `Sieved ${result.sievedIn + result.sievedOut} artifacts: ${result.sievedIn} passed, ${result.sievedOut} filtered`
    );

    return result;
}

/**
 * Run the extract phase - LLM extraction
 */
async function runExtractPhase(
    repoId: string,
    syncRunId: string
): Promise<{
    candidatesCreated: number;
    candidatesSkipped: number;
    tokensInput: number;
    tokensOutput: number;
}> {
    // Check if LLM is configured
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        await logSyncProgress(
            syncRunId,
            'warn',
            'No LLM API key configured, skipping extraction'
        );

        // Mark sieved artifacts as skipped
        await prisma.artifact.updateMany({
            where: {
                repoId,
                processingStatus: 'sieved_in',
            },
            data: {
                processingStatus: 'skipped',
            },
        });

        return {
            candidatesCreated: 0,
            candidatesSkipped: 0,
            tokensInput: 0,
            tokensOutput: 0,
        };
    }

    // Import and run real extraction
    const { extractDecisions } = await import('@/lib/extract/client');

    const result = await extractDecisions(repoId, syncRunId);

    if (result.errors.length > 0) {
        await logSyncProgress(
            syncRunId,
            'warn',
            `Extraction completed with ${result.errors.length} errors`,
            { errors: result.errors }
        );
    } else {
        await logSyncProgress(
            syncRunId,
            'info',
            `Extraction complete: ${result.candidatesCreated} candidates created, ${result.candidatesSkipped} skipped`
        );
    }

    return {
        candidatesCreated: result.candidatesCreated,
        candidatesSkipped: result.candidatesSkipped,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
    };
}

/**
 * Get sync status
 */
export async function getSyncStatus(repoId: string): Promise<(SyncRun & { logs: SyncRunLog[] }) | null> {
    return prisma.syncRun.findFirst({
        where: { repoId },
        orderBy: { startedAt: 'desc' },
        include: {
            logs: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });
}
