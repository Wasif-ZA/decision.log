// ===========================================
// List Branches for Repository
// ===========================================
//
// The [id] parameter is the internal repository ID (CUID)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess';
import { decrypt } from '@/lib/crypto';
import { GitHubError, handleError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface GitHubBranch {
    name: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return requireAuth(async (req, { user }) => {
        try {
            const { id: repoId } = await params;
            const repo = await requireRepoAccess(user.id, repoId);

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

            // Fetch branches from GitHub
            const branchesResponse = await fetch(
                `https://api.github.com/repos/${repo.owner}/${repo.name}/branches?per_page=100`,
                {
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!branchesResponse.ok) {
                throw new GitHubError('Failed to fetch branches', branchesResponse.status);
            }

            const branchesData: GitHubBranch[] = await branchesResponse.json();
            const branches = branchesData.map((branch) => branch.name);

            return NextResponse.json({
                repoId: repo.id,
                branches,
            });
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
    })(request);
}
