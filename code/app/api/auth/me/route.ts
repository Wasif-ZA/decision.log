// ===========================================
// Get Current User
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/jwt';
import type { AuthMeResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
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

    // In production, you might fetch fresh user data from DB here
    const response: AuthMeResponse = {
        user: {
            id: payload.sub,
            login: payload.login,
            avatarUrl: `https://avatars.githubusercontent.com/u/${payload.sub}`,
        },
        setupComplete: payload.setupComplete,
        trackedRepoIds: payload.trackedRepoIds,
    };

    return NextResponse.json(response);
}
