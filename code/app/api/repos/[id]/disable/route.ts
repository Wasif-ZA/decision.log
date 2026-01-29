// ===========================================
// Disable Repo Tracking
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/repos/[id]/disable
 * Disables tracking for a repository
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify user has access to this repo
        await requireRepoAccess(userId, repoId);

        // Disable the repo
        const repo = await prisma.repo.update({
            where: { id: repoId },
            data: {
                isEnabled: false,
            },
            select: {
                id: true,
                fullName: true,
                isEnabled: true,
            },
        });

        return NextResponse.json({
            success: true,
            repo,
        });

    } catch (error) {
        return handleError(error);
    }
}
