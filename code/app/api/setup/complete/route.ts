// ===========================================
// Complete Setup
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess';
import { db } from '@/lib/db';
import { handleError } from '@/lib/errors';
import { validateBody } from '@/lib/validation';
import { signJWT, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/jwt';
import { blockDemoWrites } from '@/lib/demoWriteGuard';

export const dynamic = 'force-dynamic';

const CompleteSetupSchema = z.object({
    repoId: z.string().min(1),
    branchName: z.string().min(1).optional(),
});

export const POST = requireAuth(async (request: NextRequest, { user }) => {
    try {
        const demoBlock = blockDemoWrites(user.login);
        if (demoBlock) return demoBlock;

        const cookieStore = await cookies();
        const { repoId, branchName } = await validateBody(request, CompleteSetupSchema);
        const repo = await requireRepoAccessByIdentifier(user.id, repoId);

        const updatedRepo = await db.repo.update({
            where: { id: repo.id },
            data: {
                enabled: true,
                ...(branchName ? { defaultBranch: branchName } : {}),
            },
            select: { id: true },
        });

        const enabledRepos = await db.repo.findMany({
            where: {
                userId: user.id,
                enabled: true,
            },
            select: { id: true },
        });

        const trackedRepoIds = [
            ...new Set([...enabledRepos.map((r) => r.id), updatedRepo.id]),
        ];

        const newToken = await signJWT({
            sub: user.id,
            login: user.login,
            setupComplete: true,
            trackedRepoIds,
        });

        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = getSessionCookieOptions(isProduction);
        cookieStore.set(SESSION_COOKIE_NAME, newToken, cookieOptions);

        return NextResponse.json({
            success: true,
            setupComplete: true,
            trackedRepoIds,
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
});
