// ===========================================
// Extraction Cost Governor
// ===========================================

import { prisma } from '@/lib/db';

export const DAILY_EXTRACTION_LIMIT = 20;  // Max LLM calls per repo per day
export const BATCH_SIZE = 5;               // Artifacts per LLM call
export const FIRST_SYNC_PR_CAP = 100;      // Max PRs on initial sync
export const FIRST_SYNC_DAYS = 90;         // Max days back

interface GovernorResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date | null;
    message?: string;
}

/**
 * Check if extraction is allowed for a repo
 */
export async function checkExtractionBudget(repoId: string): Promise<GovernorResult> {
    const repo = await prisma.repo.findUnique({
        where: { id: repoId },
        select: {
            extractionsToday: true,
            extractionResetAt: true,
        },
    });

    if (!repo) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: null,
            message: 'Repo not found',
        };
    }

    const now = new Date();
    const resetAt = repo.extractionResetAt;

    // Check if we need to reset the counter
    if (!resetAt || resetAt < now) {
        // Reset the counter
        const newResetAt = new Date(now);
        newResetAt.setHours(24, 0, 0, 0); // Midnight next day

        await prisma.repo.update({
            where: { id: repoId },
            data: {
                extractionsToday: 0,
                extractionResetAt: newResetAt,
            },
        });

        return {
            allowed: true,
            remaining: DAILY_EXTRACTION_LIMIT,
            resetAt: newResetAt,
        };
    }

    const remaining = DAILY_EXTRACTION_LIMIT - repo.extractionsToday;

    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            message: `Daily extraction limit reached. Resets at ${resetAt.toISOString()}`,
        };
    }

    return {
        allowed: true,
        remaining,
        resetAt,
    };
}

/**
 * Increment the extraction counter
 */
export async function incrementExtractionCount(
    repoId: string,
    count: number = 1
): Promise<void> {
    await prisma.repo.update({
        where: { id: repoId },
        data: {
            extractionsToday: {
                increment: count,
            },
        },
    });
}

/**
 * Get how many artifacts can be extracted this run
 */
export async function getAvailableExtractionSlots(repoId: string): Promise<number> {
    const budget = await checkExtractionBudget(repoId);

    if (!budget.allowed) {
        return 0;
    }

    // Each LLM call processes BATCH_SIZE artifacts
    // Return total artifacts we can process
    return Math.min(budget.remaining * BATCH_SIZE, FIRST_SYNC_PR_CAP);
}
