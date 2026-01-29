// ===========================================
// Repo Access Middleware
// ===========================================

import { prisma } from '@/lib/db';
import { NotFoundError, RepoAccessError } from '@/lib/errors';
import type { Repo } from '@prisma/client';

/**
 * Check if a user has access to a specific repo
 * 
 * @throws NotFoundError if repo doesn't exist or doesn't belong to user
 * @throws RepoAccessError if access has been revoked
 */
export async function requireRepoAccess(
    userId: string,
    repoId: string
): Promise<Repo> {
    const repo = await prisma.repo.findFirst({
        where: {
            id: repoId,
            userId: userId,
        },
    });

    if (!repo) {
        throw new NotFoundError('Repository');
    }

    // Check access status
    if (repo.accessStatus === 'revoked') {
        throw new RepoAccessError('revoked');
    }

    if (repo.accessStatus === 'not_found') {
        throw new RepoAccessError('not_found');
    }

    return repo;
}

/**
 * Check if a repo is enabled for tracking
 * 
 * @throws NotFoundError if repo not found
 * @throws RepoAccessError if access revoked
 */
export async function requireEnabledRepo(
    userId: string,
    repoId: string
): Promise<Repo> {
    const repo = await requireRepoAccess(userId, repoId);

    if (!repo.isEnabled) {
        throw new NotFoundError('Enabled repository');
    }

    return repo;
}
