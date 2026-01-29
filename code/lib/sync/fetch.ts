// ===========================================
// Fetch PRs and Commits from GitHub
// ===========================================

import { prisma } from '@/lib/db';
import { GitHubClient, type GitHubPullRequest } from '@/lib/github/client';
import { parseCursor, isAfterCursor, getInitialCursor } from './cursor';
import type { Repo, SyncRun, Artifact } from '@prisma/client';

const FIRST_SYNC_PR_CAP = 100;
const FIRST_SYNC_DAYS = 90;

interface FetchResult {
    prsFetched: number;
    commitsFetched: number;
    artifactsCreated: number;
    artifactsUpdated: number;
    latestPrUpdate: Date | null;
}

/**
 * Fetch PRs from GitHub and upsert to Artifacts
 */
export async function fetchPullRequests(
    client: GitHubClient,
    repo: Repo,
    syncRun: SyncRun
): Promise<FetchResult> {
    const result: FetchResult = {
        prsFetched: 0,
        commitsFetched: 0,
        artifactsCreated: 0,
        artifactsUpdated: 0,
        latestPrUpdate: null,
    };

    // Get cursor
    const cursor = repo.hasCompletedFirstSync
        ? parseCursor(repo.syncCursor)
        : getInitialCursor(FIRST_SYNC_DAYS);

    let page = 1;
    let hasMore = true;
    const processedPrs: GitHubPullRequest[] = [];

    while (hasMore) {
        const prs = await client.listPullRequests(repo.owner, repo.name, {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            perPage: 100,
            page,
        });

        if (prs.length === 0) break;

        for (const pr of prs) {
            // Filter: only merged PRs for MVP
            if (!pr.merged) continue;

            // Check cursor - stop if we've seen this before
            if (!isAfterCursor(pr.updated_at, cursor.prUpdatedAfter)) {
                hasMore = false;
                break;
            }

            processedPrs.push(pr);

            // Track latest update
            const prUpdatedAt = new Date(pr.updated_at);
            if (!result.latestPrUpdate || prUpdatedAt > result.latestPrUpdate) {
                result.latestPrUpdate = prUpdatedAt;
            }

            // First sync cap
            if (!repo.hasCompletedFirstSync && processedPrs.length >= FIRST_SYNC_PR_CAP) {
                hasMore = false;
                break;
            }
        }

        page++;

        // Safety: max 10 pages
        if (page > 10) break;
    }

    result.prsFetched = processedPrs.length;

    // Log progress
    await logSyncProgress(syncRun.id, 'info', `Fetched ${processedPrs.length} merged PRs`);

    // Upsert PRs as Artifacts
    for (const pr of processedPrs) {
        // Get file paths for the PR
        let filePaths: string[] = [];
        try {
            const files = await client.getPullRequestFiles(repo.owner, repo.name, pr.number);
            filePaths = files.slice(0, 100).map(f => f.filename);
        } catch (error) {
            console.warn(`Failed to fetch files for PR #${pr.number}:`, error);
        }

        const artifactData = {
            repoId: repo.id,
            type: 'pr' as const,
            externalId: String(pr.number),
            title: pr.title,
            body: pr.body,
            url: pr.html_url,
            authorLogin: pr.user?.login ?? null,
            prNumber: pr.number,
            prState: pr.state,
            isMerged: pr.merged,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            labels: pr.labels.map(l => l.name),
            additions: pr.additions ?? null,
            deletions: pr.deletions ?? null,
            changedFiles: pr.changed_files ?? null,
            filePaths,
            createdAtSource: new Date(pr.created_at),
            updatedAtSource: new Date(pr.updated_at),
        };

        const existing = await prisma.artifact.findUnique({
            where: {
                repoId_type_externalId: {
                    repoId: repo.id,
                    type: 'pr',
                    externalId: String(pr.number),
                },
            },
        });

        if (existing) {
            await prisma.artifact.update({
                where: { id: existing.id },
                data: {
                    ...artifactData,
                    // Preserve processing status if already processed
                    processingStatus: existing.processingStatus === 'pending'
                        ? 'pending'
                        : existing.processingStatus,
                },
            });
            result.artifactsUpdated++;
        } else {
            await prisma.artifact.create({
                data: artifactData,
            });
            result.artifactsCreated++;
        }
    }

    // Update sync run metrics
    await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
            prsFetched: result.prsFetched,
            artifactsCreated: result.artifactsCreated,
            artifactsUpdated: result.artifactsUpdated,
        },
    });

    return result;
}

/**
 * Log sync progress
 */
async function logSyncProgress(
    syncRunId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
): Promise<void> {
    await prisma.syncRunLog.create({
        data: {
            syncRunId,
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null,
        },
    });
}

export { logSyncProgress };
