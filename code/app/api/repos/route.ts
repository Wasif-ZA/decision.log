// ===========================================
// List User Repositories from GitHub
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { decrypt } from '@/lib/crypto';
import { GitHubError, handleError } from '@/lib/errors';
import type { Repo } from '@/types/app';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req, { user }) => {
    try {
        // Debug: log user object keys
        console.log('[/api/repos] user keys:', Object.keys(user));
        console.log('[/api/repos] user.githubTokenEncrypted:', user.githubTokenEncrypted?.substring(0, 10));
        console.log('[/api/repos] user.githubTokenIv:', user.githubTokenIv);

        // Decrypt GitHub token
        if (!user.githubTokenEncrypted || !user.githubTokenIv) {
            console.log('[/api/repos] MISSING TOKEN - returning 401');
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

        const githubRepos = await response.json();

        // Transform to our Repo format
        const repos: Repo[] = githubRepos.map((repo: any) => ({
            id: String(repo.id),
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch || 'main',
            accessStatus: 'active',
            private: repo.private,
        }));

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
