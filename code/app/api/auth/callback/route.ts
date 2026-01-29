// ===========================================
// GitHub OAuth Callback
// ===========================================
// Exchanges code for token, creates/updates User and Integration,
// encrypts and stores access token in database

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signJWT, getSessionCookieOptions, SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

// Transaction client type (excludes methods not available in transactions)
type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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

        // Encrypt the access token before storing
        const encryptedToken = await encrypt(accessToken);

        // Parse scopes into array
        const tokenScopes = scope ? scope.split(',').map((s: string) => s.trim()) : [];

        // Upsert User and Integration in a transaction
        const user = await prisma.$transaction(async (tx: TransactionClient) => {
            // Create or update User
            const user = await tx.user.upsert({
                where: { githubId: String(userData.id) },
                update: {
                    login: userData.login,
                    email: userData.email,
                    name: userData.name,
                    avatarUrl: userData.avatar_url,
                },
                create: {
                    githubId: String(userData.id),
                    login: userData.login,
                    email: userData.email,
                    name: userData.name,
                    avatarUrl: userData.avatar_url,
                },
            });

            // Create or update Integration with encrypted token
            await tx.integration.upsert({
                where: { userId: user.id },
                update: {
                    accessTokenEncrypted: encryptedToken,
                    tokenScopes,
                    tokenType: tokenType || 'bearer',
                    isValid: true,
                    lastValidatedAt: new Date(),
                    invalidReason: null,
                },
                create: {
                    userId: user.id,
                    accessTokenEncrypted: encryptedToken,
                    tokenScopes,
                    tokenType: tokenType || 'bearer',
                    isValid: true,
                    lastValidatedAt: new Date(),
                },
            });

            return user;
        });

        // Check if user has any enabled repos (determines setupComplete)
        const enabledRepoCount = await prisma.repo.count({
            where: { userId: user.id, isEnabled: true },
        });

        const isNewUser = enabledRepoCount === 0;

        // Fetch tracked repo IDs if any
        const trackedRepos = await prisma.repo.findMany({
            where: { userId: user.id, isEnabled: true },
            select: { id: true },
        });

        const trackedRepoIds = trackedRepos.map((r: { id: string }) => r.id);

        // Sign JWT
        const jwt = await signJWT({
            sub: String(userData.id),
            login: userData.login,
            setupComplete: !isNewUser,
            trackedRepoIds,
        });

        // Set session cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = getSessionCookieOptions(isProduction);

        cookieStore.set(SESSION_COOKIE_NAME, jwt, cookieOptions);

        // Redirect based on setup status
        const redirectTo = isNewUser ? '/setup' : '/timeline';
        return NextResponse.redirect(new URL(redirectTo, request.url));

    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=callback_error', request.url));
    }
}
