// ===========================================
// Middleware - Route Guards
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifyJWT, shouldRenewToken, renewJWT, getSessionCookieOptions } from '@/lib/jwt';
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
        return addSecurityHeaders(NextResponse.next());
    }

    // If not authenticated and trying to access protected route
    if (!hasSession && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // If authenticated, decode JWT to check setupComplete
    if (hasSession && sessionCookie?.value) {
        try {
            const payload = await verifyJWT(sessionCookie.value);

            if (payload) {
                const setupComplete = payload.setupComplete === true;

                // If setup not complete and trying to access /app, redirect to /setup
                if (!setupComplete && isAppRoute) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/setup', request.url)));
                }

                // If setup complete and on /setup, redirect to /timeline
                if (setupComplete && isSetupRoute && pathname === '/setup') {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/timeline', request.url)));
                }

                // If authenticated and on /login, redirect to appropriate page
                if (pathname === '/login') {
                    const redirectTo = setupComplete ? '/timeline' : '/setup';
                    return addSecurityHeaders(NextResponse.redirect(new URL(redirectTo, request.url)));
                }
            }

            // Auto-renew token if near expiry
            if (payload && shouldRenewToken(payload)) {
                try {
                    const newToken = await renewJWT(payload);
                    const response = NextResponse.next();
                    const cookieOptions = getSessionCookieOptions(process.env.NODE_ENV === 'production');
                    response.cookies.set(SESSION_COOKIE_NAME, newToken, cookieOptions);
                    return addSecurityHeaders(response);
                } catch {
                    // Token renewal failed, continue with existing token
                }
            }
        } catch {
            // If JWT decode fails, clear cookie and redirect to login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete(SESSION_COOKIE_NAME);
            return addSecurityHeaders(response);
        }
    }

    return addSecurityHeaders(NextResponse.next());
}

/**
 * Add security headers to all responses
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()'
    );
    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=63072000; includeSubDomains; preload'
        );
    }
    response.headers.delete('X-Powered-By');
    return response;
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
