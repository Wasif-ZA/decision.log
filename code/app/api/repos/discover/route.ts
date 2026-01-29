// ===========================================
// Discover Repos Endpoint
// ===========================================
// Fetches user's accessible GitHub repos and upserts them to DB

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import type { Repo } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    private: boolean;
    default_branch: string;
    html_url: string;
}

/**
 * POST /api/repos/discover
 * Fetches user's GitHub repos and upserts to database
 */
export async function POST() {
    try {
        const { userId } = await requireAuth();

        // Get integration with encrypted token
        const integration = await prisma.integration.findUnique({
            where: { userId },
        });

        if (!integration) {
            return NextResponse.json({
                error: { code: 'NO_INTEGRATION', message: 'GitHub integration not found' }
            }, { status: 400 });
        }

        // Decrypt token
        const accessToken = await decrypt(integration.accessTokenEncrypted);

        // Fetch repos from GitHub (paginated)
        const allRepos: GitHubRepo[] = [];
        let page = 1;
        const perPage = 100;

        while (true) {
            const response = await fetch(
                `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed&direction=desc`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!response.ok) {
                console.error('GitHub API error:', response.status);
                break;
            }

            const repos: GitHubRepo[] = await response.json();

            if (repos.length === 0) break;

            allRepos.push(...repos);

            // Stop at 200 repos for MVP
            if (allRepos.length >= 200 || repos.length < perPage) break;

            page++;
        }

        // Upsert repos to database
        const upsertedRepos = await Promise.all(
            allRepos.map(async (repo) => {
                return prisma.repo.upsert({
                    where: {
                        userId_githubId: {
                            userId,
                            githubId: String(repo.id),
                        },
                    },
                    update: {
                        owner: repo.owner.login,
                        name: repo.name,
                        fullName: repo.full_name,
                        defaultBranch: repo.default_branch,
                        isPrivate: repo.private,
                        // Re-activate if previously marked as not_found
                        accessStatus: 'active',
                    },
                    create: {
                        userId,
                        integrationId: integration.id,
                        githubId: String(repo.id),
                        owner: repo.owner.login,
                        name: repo.name,
                        fullName: repo.full_name,
                        defaultBranch: repo.default_branch,
                        isPrivate: repo.private,
                    },
                });
            })
        );

        return NextResponse.json({
            discovered: upsertedRepos.length,
            repos: upsertedRepos.map(r => ({
                id: r.id,
                fullName: r.fullName,
                isPrivate: r.isPrivate,
                isEnabled: r.isEnabled,
                defaultBranch: r.defaultBranch,
            })),
        });

    } catch (error) {
        return handleError(error);
    }
}

/**
 * GET /api/repos/discover
 * Returns cached repos from database
 */
export async function GET() {
    try {
        const { userId } = await requireAuth();

        const repos = await prisma.repo.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                owner: true,
                name: true,
                isPrivate: true,
                isEnabled: true,
                defaultBranch: true,
                accessStatus: true,
                lastSyncAt: true,
                artifactCount: true,
                candidateCount: true,
                decisionCount: true,
            },
        });

        return NextResponse.json({ repos });

    } catch (error) {
        return handleError(error);
    }
}
