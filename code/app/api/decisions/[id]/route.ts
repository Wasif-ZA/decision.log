/**
 * Get Single Decision
 *
 * GET /api/decisions/[id]
 * Fetch a single decision by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'
import { validateBody } from '@/lib/validation'

const UpdateDecisionSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  context: z.string().min(50).max(2000).optional(),
  decision: z.string().min(50).max(2000).optional(),
  reasoning: z.string().min(50).max(2000).optional(),
  consequences: z.string().min(50).max(2000).optional(),
  alternatives: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
}).strict()

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
      const body = await validateBody(request, UpdateDecisionSchema)

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
