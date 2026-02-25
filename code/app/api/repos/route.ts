// ===========================================
// List User Repositories from GitHub
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { decrypt } from '@/lib/crypto';
import { GitHubError, handleError } from '@/lib/errors';
import { db } from '@/lib/db';
import type { Repo } from '@/types/app';

export const dynamic = 'force-dynamic';

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    default_branch?: string;
    private: boolean;
}

export const GET = requireAuth(async (req, { user }) => {
    try {
        // Decrypt GitHub token
        if (!user.githubTokenEncrypted || !user.githubTokenIv) {
            return NextResponse.json(
                { code: 'UNAUTHORIZED', message: 'GitHub token not found' },
                { status: 401 }
            );
        }

        const githubToken = await decrypt(
            user.githubTokenEncrypted,
            user.githubTokenIv
        );

        // Fetch repositories from GitHub
        const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json(
                    { code: 'UNAUTHORIZED', message: 'GitHub token invalid or expired' },
                    { status: 401 }
                );
            }
            throw new GitHubError(
                'Failed to fetch repositories from GitHub',
                response.status
            );
        }

        const githubRepos = (await response.json()) as GitHubRepo[];

        // Cross-reference with tracked repos in DB to use internal CUIDs
        const dbRepos = await db.repo.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                githubId: true,
                enabled: true,
                lastSyncAt: true,
            },
        });

        const dbRepoByGithubId = new Map(
            dbRepos.map((r) => [r.githubId, r])
        );

        // Transform to our Repo format
        // Use internal CUID if the repo is tracked in DB, otherwise use GitHub ID
        const repos: Repo[] = githubRepos.map((repo) => {
            const tracked = dbRepoByGithubId.get(repo.id);
            return {
                id: tracked ? tracked.id : String(repo.id),
                githubId: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                defaultBranch: repo.default_branch || 'main',
                accessStatus: 'active' as const,
                enabled: tracked?.enabled ?? false,
                private: repo.private,
            };
        });

        return NextResponse.json({ repos });
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
