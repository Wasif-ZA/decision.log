// ===========================================
// Repo Access Middleware
// ===========================================

import { db, type Repo } from '@/lib/db';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

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
