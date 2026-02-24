// ===========================================
// Middleware - Route Guards
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifyJWT } from '@/lib/jwt';
import { isDemoModeEnabled } from '@/lib/demoMode';

// Routes that require authentication (from (app) route group - no /app prefix)
const PROTECTED_ROUTES = ['/timeline', '/decision', '/decisions', '/exports', '/prompts', '/settings', '/setup'];

// App routes that require setup to be complete
const APP_ROUTES = ['/timeline', '/decision', '/decisions', '/exports', '/prompts', '/settings'];

export async function proxy(request: NextRequest) {
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
    const isSetupRoute = pathname.startsWith('/setup');
    const isAppRoute = APP_ROUTES.some(route => pathname.startsWith(route));

    // Demo mode allows anonymous browsing of protected pages.
    if (isDemoModeEnabled && !hasSession) {
        return NextResponse.next();
    }

    // If not authenticated and trying to access protected route
    if (!hasSession && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated, decode JWT to check setupComplete
    if (hasSession && sessionCookie?.value) {
        try {
            const payload = await verifyJWT(sessionCookie.value);

            if (payload) {
                const setupComplete = payload.setupComplete === true;

                // If setup not complete and trying to access /app, redirect to /setup
                if (!setupComplete && isAppRoute) {
                    return NextResponse.redirect(new URL('/setup', request.url));
                }

                // If setup complete and on /setup, redirect to /timeline
                if (setupComplete && isSetupRoute && pathname === '/setup') {
                    return NextResponse.redirect(new URL('/timeline', request.url));
                }

                // If authenticated and on /login, redirect to appropriate page
                if (pathname === '/login') {
                    const redirectTo = setupComplete ? '/timeline' : '/setup';
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
