// ===========================================
// Logout
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';
import { validateCsrf, CSRF_COOKIE_NAME } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // Validate CSRF token
    const csrfError = validateCsrf(req);
    if (csrfError) return csrfError;

    const cookieStore = await cookies();

    // Clear session cookie and CSRF cookie
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(CSRF_COOKIE_NAME);

    return NextResponse.json({ success: true });
}
