// ===========================================
// List Branches for Repository
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { decrypt } from '@/lib/crypto';
import { GitHubError, handleError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return requireAuth(async (req, { user }) => {
        try {
            const { id: repoFullName } = await params;

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

            // Parse owner/repo from ID (which is actually the repo ID from GitHub)
            // We need to first get the repo details to get owner/name
            const repoResponse = await fetch(`https://api.github.com/repositories/${repoFullName}`, {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });

            if (!repoResponse.ok) {
                throw new GitHubError('Failed to fetch repository details', repoResponse.status);
            }

            const repoData = await repoResponse.json();
            const owner = repoData.owner.login;
            const repoName = repoData.name;

            // Fetch branches from GitHub
            const branchesResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repoName}/branches?per_page=100`,
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

            const branchesData = await branchesResponse.json();
            const branches = branchesData.map((branch: any) => branch.name);

            return NextResponse.json({
                repoId: repoFullName,
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
