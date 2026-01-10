// ===========================================
// Logout
// ===========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST() {
    const cookieStore = await cookies();

    // Clear session cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
}
