// ===========================================
// Get Current User
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/jwt';
import type { AuthMeResponse } from '@/types/app';
import { db } from '@/lib/db';
import { DEMO_LOGIN, isDemoModeEnabled } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        if (isDemoModeEnabled) {
            const demoUser = await db.user.findUnique({ where: { login: DEMO_LOGIN } });

            if (!demoUser) {
                return NextResponse.json(
                    { code: 'UNAUTHORIZED', message: 'Demo user missing. Run prisma db seed.' },
                    { status: 401 }
                );
            }

            // Fetch demo user's enabled repos so pages can load data
            const demoRepos = await db.repo.findMany({
                where: { userId: demoUser.id, enabled: true },
                select: { id: true },
            });

            return NextResponse.json({
                user: {
                    id: demoUser.id,
                    login: demoUser.login,
                    avatarUrl: demoUser.avatarUrl ?? '',
                },
                setupComplete: true,
                trackedRepoIds: demoRepos.map((r) => r.id),
            } satisfies AuthMeResponse);
        }

        return NextResponse.json(
            { code: 'UNAUTHORIZED', message: 'Not authenticated' },
            { status: 401 }
        );
    }

    const payload = await verifyJWT(token);

    if (!payload) {
        // Clear invalid token
        cookieStore.delete(SESSION_COOKIE_NAME);
        return NextResponse.json(
            { code: 'UNAUTHORIZED', message: 'Invalid session' },
            { status: 401 }
        );
    }

    const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { login: true, avatarUrl: true },
    });

    if (!user) {
        cookieStore.delete(SESSION_COOKIE_NAME);
        return NextResponse.json(
            { code: 'UNAUTHORIZED', message: 'User not found' },
            { status: 401 }
        );
    }

    // Fetch tracked repo IDs from DB (live, not from stale JWT)
    const trackedRepos = await db.repo.findMany({
        where: { userId: payload.sub, enabled: true },
        select: { id: true },
    });
    const trackedRepoIds = trackedRepos.map((r) => r.id);

    const response: AuthMeResponse = {
        user: {
            id: payload.sub,
            login: user.login || payload.login,
            avatarUrl: user.avatarUrl || '',
        },
        setupComplete: payload.setupComplete,
        trackedRepoIds,
    };

    return NextResponse.json(response);
}
