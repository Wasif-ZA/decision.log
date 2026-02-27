/**
 * Get Repository Timeline
 *
 * GET /api/repos/[id]/timeline
 * Fetch decision timeline for a repository
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoIdentifier } = await params
      const repo = await requireRepoAccessByIdentifier(user.id, repoIdentifier)

      const { searchParams } = new URL(request.url)
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      // Build where clause with optional date range
      const where: Record<string, unknown> = {
        repoId: repo.id,
        userId: user.id,
        deletedAt: null,
      }

      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
        }
      }

      // Count total matching decisions
      const total = await db.decision.count({ where })

      // Get decisions with candidates and artifacts (paginated)
      const decisions = await db.decision.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      })

      return NextResponse.json({ decisions, meta: { total, limit, offset } })
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
