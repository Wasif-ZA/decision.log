// ===========================================
// GitHub OAuth Callback
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signJWT, getSessionCookieOptions, SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { logError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const cookieStore = await cookies();
    const storedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;

    // Clear the state cookie
    cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

    // Handle error from GitHub
    if (error) {
        console.error('GitHub OAuth error:', error, errorDescription);
        return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
    }

    // Validate state (CSRF protection)
    if (!state || state !== storedState) {
        console.error('OAuth state mismatch');
        return NextResponse.redirect(new URL('/login?error=csrf_mismatch', request.url));
    }

    // Validate code
    if (!code) {
        return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('Token exchange error:', tokenData.error);
            return NextResponse.redirect(new URL('/login?error=token_exchange', request.url));
        }

        const accessToken = tokenData.access_token;
        const tokenType = tokenData.token_type;
        const scope = tokenData.scope;

        // Fetch user info from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!userResponse.ok) {
            console.error('Failed to fetch user info');
            return NextResponse.redirect(new URL('/login?error=user_fetch', request.url));
        }

        const userData = await userResponse.json();

        // Encrypt GitHub token
        const { encrypted, iv } = await encrypt(accessToken);

        // Create or update user in database
        const user = await db.user.upsert({
            where: { githubId: userData.id },
            create: {
                githubId: userData.id,
                login: userData.login,
                name: userData.name,
                email: userData.email,
                avatarUrl: userData.avatar_url,
                githubTokenEncrypted: encrypted,
                githubTokenIv: iv,
            },
            update: {
                login: userData.login,
                name: userData.name,
                email: userData.email,
                avatarUrl: userData.avatar_url,
                githubTokenEncrypted: encrypted,
                githubTokenIv: iv,
            },
            include: {
                repos: {
                    where: { enabled: true },
                    select: { id: true },
                },
            },
        });

        // Check if this is a new user (no enabled repos)
        const isNewUser = user.repos.length === 0;
        const trackedRepoIds = user.repos.map((r) => r.id);

        // Sign JWT
        const jwt = await signJWT({
            sub: user.id,
            login: user.login,
            setupComplete: !isNewUser,
            trackedRepoIds,
        });

        // Set session cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = getSessionCookieOptions(isProduction);

        cookieStore.set(SESSION_COOKIE_NAME, jwt, cookieOptions);

        // Redirect based on setup status
        const redirectTo = isNewUser ? '/setup' : '/app/timeline';
        return NextResponse.redirect(new URL(redirectTo, request.url));

    } catch (error) {
        logError(error, 'OAuth callback');
        return NextResponse.redirect(new URL('/login?error=callback_error', request.url));
    }
}
