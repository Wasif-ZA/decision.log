// ===========================================
// JWT Utilities (using jose library)
// ===========================================

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import type { JWTPayload } from '@/types/app';

// Get secret from environment
function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
    }
    return new TextEncoder().encode(secret);
}

// Get expiry duration from environment (default: 7 days)
function getExpiryDuration(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Sign a JWT with the given payload
 */
export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const secret = getSecret();

    const token = await new SignJWT(payload as unknown as JoseJWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(getExpiryDuration())
        .sign(secret);

    return token;
}

/**
 * Verify and decode a JWT
 * Returns null if invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
        const secret = getSecret();
        const { payload } = await jwtVerify(token, secret);

        return {
            sub: payload.sub as string,
            login: payload.login as string,
            setupComplete: payload.setupComplete as boolean,
            trackedRepoIds: payload.trackedRepoIds as string[],
            iat: payload.iat as number,
            exp: payload.exp as number,
        };
    } catch {
        return null;
    }
}

/**
 * Check if token should be renewed (within 1 day of expiry)
 */
export function shouldRenewToken(payload: JWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    return payload.exp - now < oneDay;
}

/**
 * Renew a token by signing a new one with the same payload
 */
export async function renewJWT(payload: JWTPayload): Promise<string> {
    return signJWT({
        sub: payload.sub,
        login: payload.login,
        setupComplete: payload.setupComplete,
        trackedRepoIds: payload.trackedRepoIds,
    });
}

/**
 * Cookie options for the session token
 */
export function getSessionCookieOptions(isProduction: boolean): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
} {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    };
}

/**
 * Cookie name for the session token
 */
export const SESSION_COOKIE_NAME = 'decision_log_session';

/**
 * Cookie name for OAuth state (CSRF protection)
 */
export const OAUTH_STATE_COOKIE_NAME = 'oauth_state';
