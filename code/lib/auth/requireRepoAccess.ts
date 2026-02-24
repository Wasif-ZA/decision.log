// ===========================================
// Repo Access Middleware
// ===========================================

import { db, type Repo } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

/**
 * Check if a user has access to a specific repo
 *
 * @throws NotFoundError if repo doesn't exist or doesn't belong to user
 * @throws ForbiddenError if access has been revoked
 */
export async function requireRepoAccess(
    userId: string,
    repoId: string
): Promise<Repo> {
    const repo = await db.repo.findFirst({
        where: {
            id: repoId,
            userId: userId,
        },
    });

    if (!repo) {
        throw new NotFoundError('Repository');
    }

    return repo;
}

/**
 * Check repo access when the identifier may be either an internal CUID
 * or a GitHub numeric repository ID.
 */
export async function requireRepoAccessByIdentifier(
    userId: string,
    repoIdentifier: string
): Promise<Repo> {
    const maybeGitHubId = parseGitHubRepoId(repoIdentifier);

    if (maybeGitHubId !== null) {
        const repo = await db.repo.findFirst({
            where: {
                githubId: maybeGitHubId,
                userId,
            },
        });

        if (!repo) {
            throw new NotFoundError('Repository');
        }

        return repo;
    }

    return requireRepoAccess(userId, repoIdentifier);
}

/**
 * Check if a repo is enabled for tracking
 *
 * @throws NotFoundError if repo not found
 * @throws ForbiddenError if access revoked
 */
export async function requireEnabledRepo(
    userId: string,
    repoId: string
): Promise<Repo> {
    const repo = await requireRepoAccess(userId, repoId);

    if (!repo.enabled) {
        throw new NotFoundError('Enabled repository');
    }

    return repo;
}

function parseGitHubRepoId(value: string): number | null {
    if (!/^\d+$/.test(value)) {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
        return null;
    }

    return parsed;
}
