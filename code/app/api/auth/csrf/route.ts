/**
 * CSRF Token Endpoint
 *
 * GET /api/auth/csrf
 * Returns a CSRF token and sets it in a cookie.
 * The client must send this token as X-CSRF-Token header on mutations.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()

  // Reuse existing token if present, otherwise generate new one
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value
  if (!token) {
    token = generateCsrfToken()
  }

  const isProduction = process.env.NODE_ENV === 'production'

  // Set the CSRF cookie (readable by JS so the client can send it as a header)
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Client needs to read this
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return NextResponse.json({ token })
}
