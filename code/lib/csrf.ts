/**
 * CSRF Protection
 *
 * Double-submit cookie pattern:
 * 1. Server generates a random token and sets it in a cookie + returns in response body
 * 2. Client reads the token and sends it as X-CSRF-Token header on mutations
 * 3. Server validates that the header matches the cookie
 *
 * This works because a cross-origin attacker cannot read the cookie value
 * (due to SameSite=Lax) or set custom headers on cross-origin requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const CSRF_COOKIE_NAME = 'csrf_token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate CSRF token from request header against the cookie
 * Returns an error response if validation fails, or null if valid
 */
export function validateCsrf(req: NextRequest): NextResponse | null {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = req.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      {
        code: 'CSRF_MISMATCH',
        message: 'Missing CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    )
  }

  if (cookieToken !== headerToken) {
    return NextResponse.json(
      {
        code: 'CSRF_MISMATCH',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    )
  }

  return null
}
