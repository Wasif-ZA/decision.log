// ===========================================
// Auth Middleware - Require Authenticated User
// ===========================================

import { cookies } from 'next/headers';
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import type { Repo } from '@/lib/types';

export interface AuthResult {
    userId: string;
    user: User;
    githubId: string;
    login: string;
}

/**
 * Require authentication for an API route
 * Validates JWT from session cookie and returns user from database
 * 
 * @throws AuthError if not authenticated or user not found
 */
export async function requireAuth(): Promise<AuthResult> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
        throw new AuthError('No session cookie found');
    }

    // Verify JWT
    const payload = await verifyJWT(sessionCookie.value);

    if (!payload) {
        throw new AuthError('Invalid or expired session', 'TOKEN_INVALID');
    }

    const githubId = payload.sub;

    if (!githubId) {
        throw new AuthError('Invalid session: missing user ID');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
        where: { githubId },
    });

    if (!user) {
        throw new AuthError('User not found', 'UNAUTHORIZED');
    }

    return {
        userId: user.id,
        user,
        githubId,
        login: user.login,
    };
}

/**
 * Optional auth - returns null if not authenticated instead of throwing
 */
export async function optionalAuth(): Promise<AuthResult | null> {
    try {
        return await requireAuth();
    } catch (error) {
        if (error instanceof AuthError) {
            return null;
        }
        throw error;
    }
}
