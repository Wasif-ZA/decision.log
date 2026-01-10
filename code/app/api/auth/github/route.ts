// ===========================================
// GitHub OAuth Initiation
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAUTH_STATE_COOKIE_NAME } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST() {
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in cookie (short-lived)
    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 minutes
    });

    // Build GitHub OAuth URL
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!clientId) {
        return NextResponse.json(
            { error: 'GitHub OAuth not configured' },
            { status: 500 }
        );
    }

    const scope = 'read:user user:email repo';

    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);

    return NextResponse.json({ url: url.toString() });
}
