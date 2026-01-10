// ===========================================
// Middleware - Route Guards
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';

// Routes that require authentication
const PROTECTED_ROUTES = ['/app', '/setup'];

// Routes that are public
const PUBLIC_ROUTES = ['/', '/login', '/api/auth'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes (except auth)
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const hasSession = !!sessionCookie?.value;

    // Check if the route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route)
    );
    const isSetupRoute = pathname.startsWith('/setup');
    const isAppRoute = pathname.startsWith('/app');

    // If not authenticated and trying to access protected route
    if (!hasSession && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated, decode JWT to check setupComplete
    if (hasSession && sessionCookie?.value) {
        try {
            // For MVP, we do a simple JWT decode without full verification in middleware
            // (Full verification happens in API routes)
            const payload = decodeJWTPayload(sessionCookie.value);

            if (payload) {
                const setupComplete = payload.setupComplete === true;

                // If setup not complete and trying to access /app, redirect to /setup
                if (!setupComplete && isAppRoute) {
                    return NextResponse.redirect(new URL('/setup', request.url));
                }

                // If setup complete and on /setup, redirect to /app/timeline
                if (setupComplete && isSetupRoute && pathname === '/setup') {
                    return NextResponse.redirect(new URL('/app/timeline', request.url));
                }

                // If authenticated and on /login, redirect to appropriate page
                if (pathname === '/login') {
                    const redirectTo = setupComplete ? '/app/timeline' : '/setup';
                    return NextResponse.redirect(new URL(redirectTo, request.url));
                }
            }
        } catch {
            // If JWT decode fails, clear cookie and redirect to login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete(SESSION_COOKIE_NAME);
            return response;
        }
    }

    return NextResponse.next();
}

/**
 * Simple JWT payload decoder (no signature verification)
 * Used in middleware for quick checks - full verification happens in API routes
 */
function decodeJWTPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

// Configure which routes the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
