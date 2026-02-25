/**
 * Authentication Middleware
 *
 * Requires valid JWT cookie for API routes
 * Loads user from database and attaches to request context
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, SESSION_COOKIE_NAME } from '@/lib/jwt'
import { db, type User } from '@/lib/db'
import { UnauthorizedError, handleError } from '@/lib/errors'
import { DEMO_LOGIN, isDemoModeEnabled } from '@/lib/demoMode'
import { validateCsrf } from '@/lib/csrf'

const CSRF_PROTECTED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

export interface AuthContext {
  user: User
  userId: string
}

/**
 * Require authentication for an API route handler
 *
 * Usage:
 * ```ts
 * export const GET = requireAuth(async (req, { user }) => {
 *   return Response.json({ userId: user.id })
 * })
 * ```
 */
export function requireAuth<T extends AuthContext>(
  handler: (
    req: NextRequest,
    context: T
  ) => Promise<Response> | Response
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      // Validate CSRF token for mutation requests
      if (CSRF_PROTECTED_METHODS.has(req.method)) {
        const csrfError = validateCsrf(req)
        if (csrfError) return csrfError
      }

      // Extract JWT from cookie
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value

      if (!token && isDemoModeEnabled) {
        const demoUser = await db.user.findUnique({ where: { login: DEMO_LOGIN } })

        if (!demoUser) {
          throw new UnauthorizedError('Demo user not found. Run prisma db seed.')
        }

        const demoContext: AuthContext = {
          user: demoUser,
          userId: demoUser.id,
        }

        return await handler(req, demoContext as T)
      }

      if (!token) {
        throw new UnauthorizedError('No session token provided')
      }

      // Verify JWT
      const payload = await verifyJWT(token)

      if (!payload?.sub) {
        throw new UnauthorizedError('Invalid session token')
      }

      // Load user from database
      const user = await db.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new UnauthorizedError('User not found')
      }

      // Create auth context
      const context: AuthContext = {
        user,
        userId: user.id,
      }

      // Call handler with authenticated context
      return await handler(req, context as T)
    } catch (error) {
      const formatted = handleError(error)

      return NextResponse.json(
        {
          code: formatted.code,
          message: formatted.message,
          details: formatted.details,
        },
        { status: formatted.statusCode }
      )
    }
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export function optionalAuth<T extends Partial<AuthContext>>(
  handler: (
    req: NextRequest,
    context: T
  ) => Promise<Response> | Response
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value

      if (!token) {
        // No token, proceed without user
        return await handler(req, {} as T)
      }

      const payload = await verifyJWT(token)

      if (!payload?.sub) {
        return await handler(req, {} as T)
      }

      const user = await db.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) {
        return await handler(req, {} as T)
      }

      const context = {
        user,
        userId: user.id,
      } as T

      return await handler(req, context)
    } catch {
      // On error, proceed without user
      return await handler(req, {} as T)
    }
  }
}
