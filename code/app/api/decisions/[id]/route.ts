/**
 * Get Single Decision
 *
 * GET /api/decisions/[id]
 * Fetch a single decision by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: decisionId } = await params

      // Get decision
      const decision = await db.decision.findUnique({
        where: { id: decisionId },
        include: {
          candidate: {
            include: {
              artifact: true,
            },
          },
          repo: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      })

      if (!decision) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Decision not found' },
          { status: 404 }
        )
      }

      if (decision.userId !== user.id) {
        return NextResponse.json(
          { code: 'FORBIDDEN', message: 'Access denied' },
          { status: 403 }
        )
      }

      return NextResponse.json({ decision })
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
  })(req)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: decisionId } = await params
      const body = await request.json()

      // Validate decision exists and belongs to user
      const existing = await db.decision.findUnique({
        where: { id: decisionId },
      })

      if (!existing) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Decision not found' },
          { status: 404 }
        )
      }

      if (existing.userId !== user.id) {
        return NextResponse.json(
          { code: 'FORBIDDEN', message: 'Access denied' },
          { status: 403 }
        )
      }

      // Update decision
      const decision = await db.decision.update({
        where: { id: decisionId },
        data: {
          title: body.title,
          context: body.context,
          decision: body.decision,
          reasoning: body.reasoning,
          consequences: body.consequences,
          alternatives: body.alternatives,
          tags: body.tags,
        },
      })

      return NextResponse.json({ decision })
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
  })(req)
}
