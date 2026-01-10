// ===========================================
// Complete Setup
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, signJWT, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        return NextResponse.json(
            { code: 'UNAUTHORIZED', message: 'Invalid session' },
            { status: 401 }
        );
    }

    const body = await request.json();
    const { repoId, branchName } = body;

    if (!repoId) {
        return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'repoId is required' },
            { status: 400 }
        );
    }

    // Update JWT with setupComplete = true and add tracked repo
    const newPayload = {
        sub: payload.sub,
        login: payload.login,
        setupComplete: true,
        trackedRepoIds: [...new Set([...payload.trackedRepoIds, repoId])],
    };

    const newToken = await signJWT(newPayload);

    // Set updated cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getSessionCookieOptions(isProduction);
    cookieStore.set(SESSION_COOKIE_NAME, newToken, cookieOptions);

    return NextResponse.json({
        success: true,
        setupComplete: true,
        trackedRepoIds: newPayload.trackedRepoIds,
    });
}
